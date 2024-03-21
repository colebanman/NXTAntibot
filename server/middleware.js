const fs = require('fs');
const path = require('path');

const { v4: uuidv4 } = require('uuid');
const { getScript } = require('../obfuscation/obfuscate');
const { Client } = require("../client/client")

const ws = require('ws');
const clients = new Map();

async function getClient(uuid, socket){
    if(clients.has(uuid)){
        return clients.get(uuid);
    };

    let client = new Client(uuid, socket);
    

    clients.set(uuid, client);
    return client;
}

async function nxtMiddleware(app, secureEndpoints, config = {
    recordLogs: true,
    obscureResponses: false,
    minimumPassScore: 0.5,
}){
    function log(message){
        if(config.recordLogs){
            let date = new Date();
            let dateString = date.toISOString();
            let logMessage = `[${dateString}] ${message}`;
            console.log(logMessage);
        }
    }

    function invalidResponse(reasoning, res){
        if(config.obscureResponses){
            res.status(428).send('');
        } else {
            res.status(428).send(reasoning);
        }
    }
    
    log("NXT Middleware loaded");

    const wss = new ws.Server({ port: 8080 });
    log("WebSocket server listening on port 8080");

    wss.on('error', async(error) => {
        console.error('WebSocket error:', error);
    });

    wss.on('connection', async(socket, req) => {
        // get ws headers
        const headers = req.headers;
        const nxtCookie = headers.cookie.split(";").find(c => c.trim().startsWith("nxt=")).split("=")[1];
    
        if(!nxtCookie){
            log("No nxt cookie found");
            socket.close();
            return;
        }
    
        let client = await getClient(nxtCookie, socket);
    
        log(`Client ${client.uuid} connected!`)
        
        // send challenge, up to 10, until client.trustScore > config.minimumPassScore
        for(let i = 0; i < 10; i++){
            let challenge = client.getChallenge();
            if(!challenge){
                break;
            }
            // console.log(`Sending challenge ${challenge.id} to client ${client.uuid}`);
            client.performChallenge(challenge);

            if(client.calculateTrustScore() > config.minimumPassScore){
                log(`Client ${client.uuid} has passed the challenge!`);
                break;
            }
            else{
                log(`Client ${client.uuid} has failed the challenge!`);
            }
        }
    
    
        socket.on('close', () => {
            log(`WebSocket connection closed ${nxtCookie}`);
        });
    });

    app.get("/main.js", async (req, res) => {
        try {
            console.log(`[1] finding client requested - ${new Date().toISOString()}`)
    
            let clientIdentifier = uuidv4();
    
            // check if user has a cookie
            if (req.cookies.nxt) {
                clientIdentifier = req.cookies.nxt;
            }
    
            res.setHeader('Content-Type', 'application/javascript');
            res.cookie('nxt', clientIdentifier, { maxAge: 900000, signed: false, sameSite: 'None', secure: true });
    
            var obfuscatedCode = await getScript(clientIdentifier);
    
            console.log(`[2] finding client requested - ${new Date().toISOString()}`)

    
            res.send(obfuscatedCode);
        } catch (err) {
            if("Unexpected token" in err){
                let charPos = err.message.split("(1:")[1].split(")")[0];
                let charPosInt = parseInt(charPos);
                let sentence = obfuscatedCode.toString()[charPosInt - 10] + obfuscatedCode.toString()[charPosInt - 9] + obfuscatedCode.toString()[charPosInt - 8] + obfuscatedCode.toString()[charPosInt - 7] + obfuscatedCode.toString()[charPosInt - 6] + obfuscatedCode.toString()[charPosInt - 5] + obfuscatedCode.toString()[charPosInt - 4] + obfuscatedCode.toString()[charPosInt - 3] + obfuscatedCode.toString()[charPosInt - 2] + obfuscatedCode.toString()[charPosInt - 1] + obfuscatedCode.toString()[charPosInt] + obfuscatedCode.toString()[charPosInt + 1] + obfuscatedCode.toString()[charPosInt + 2] + obfuscatedCode.toString()[charPosInt + 3] + obfuscatedCode.toString()[charPosInt + 4] + obfuscatedCode.toString()[charPosInt + 5] + obfuscatedCode.toString()[charPosInt + 6] + obfuscatedCode.toString()[charPosInt + 7] + obfuscatedCode.toString()[charPosInt + 8] + obfuscatedCode.toString()[charPosInt + 9] + obfuscatedCode.toString()[charPosInt + 10];
                console.log(`Error at character ${charPos} - ${sentence}`);
            }
            else{
                console.log(err);
            }
            res.status(500).send('Sorry, something went wrong!');
        }
    });

    app.get("/", async(req, res) => {
        res.sendFile(path.join(__dirname, "../tests/index.html"));
    });

    app.use(async function (req, res, next) {
        if(secureEndpoints.includes(req.url)){
            log("Secure endpoint called");
            // check if user has a cookie
            if (!req.cookies.nxt) {
                log("No nxt cookie found");
                invalidResponse("No nxt cookie found", res);
                return;
            }
    
            let client = await getClient(req.cookies.nxt)
    
            if(!client){
                log("No client found");
                res.status(401).send("No client found");
            }

            let clientScore = client.calculateTrustScore(); // this will be a number between 0 and 1

            if(clientScore < config.minimumPassScore){
                log("Client score too low");
                invalidResponse("Client score too low", res);
                return;
            }
            next();
    
        } else {
            next();
        }
        
    });

}

module.exports = nxtMiddleware;