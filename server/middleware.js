const fs = require('fs');
const path = require('path');

const { v4: uuidv4 } = require('uuid');
const { getScript } = require('../obfuscation/obfuscate');
const { Client } = require("../client/client")

const ws = require('ws');
const clients = new Map();

function getClient(uuid, socket){
    if(clients.has(uuid)){
        return clients.get(uuid);
    };

    let client = new Client(uuid, socket);

    clients.set(uuid, client);
    return client;
}

function nxtMiddleware(app, secureEndpoints, config = {
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

    wss.on('error', (error) => {
        console.error('WebSocket error:', error);
    });

    wss.on('connection', (socket, req) => {
        // get ws headers
        const headers = req.headers;
        const nxtCookie = headers.cookie.split(";").find(c => c.trim().startsWith("nxt=")).split("=")[1];
    
        if(!nxtCookie){
            log("No nxt cookie found");
            socket.close();
            return;
        }
    
        let client = getClient(nxtCookie, socket);
    
        log(`Client ${client.uuid} connected!`)
        
        // let's send our first challenge
        let challenge = client.getChallenge();
        console.log(`Sending challenge ${challenge.id} to client ${client.uuid}`);
        client.performChallenge(challenge);
    
    
        socket.on('close', () => {
            log(`WebSocket connection closed ${nxtCookie}`);
        });
    });

    app.get("/main.js", async (req, res) => {
        try {
    
            let clientIdentifier = uuidv4();
    
            // check if user has a cookie
            if (req.cookies.nxt) {
                clientIdentifier = req.cookies.nxt;
            }
    
            res.setHeader('Content-Type', 'application/javascript');
            res.cookie('nxt', clientIdentifier, { maxAge: 900000, signed: false, sameSite: 'None', secure: true });
    
            const obfuscatedCode = await getScript(clientIdentifier);
    
    
            res.send(obfuscatedCode);
        } catch (err) {
            log(err);
            res.status(500).send('Sorry, something went wrong!');
        }
    });

    app.get("/", (req, res) => {
        res.sendFile(path.join(__dirname, "../tests/index.html"));
    });

    app.use(function (req, res, next) {
        if(secureEndpoints.includes(req.url)){
            log("Secure endpoint called");
            // check if user has a cookie
            if (!req.cookies.nxt) {
                log("No nxt cookie found");
                invalidResponse("No nxt cookie found", res);
                return;
            }
    
            let client = getClient(req.cookies.nxt);
    
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