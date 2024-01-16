const crypto = require('crypto');
const { v4: uuidv4, v4 } = require('uuid');
const { validateUserAgent, validatePlatform } = require('./challengeFunctions');
const privateKey = `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`;

function decryptData(encryptedData) {
    return crypto.privateDecrypt(
        {
            key: privateKey,
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: "sha256",
        },
        Buffer.from(encryptedData, 'base64')
    );
}


const toCheck = [
    {
        "data":"window.navigator.userAgent",
        "validateAnswer": validateUserAgent,
        "trustScore": 0,
        "id": 0,
        "weight": 5 // accounts for 5% of the total score
    },
    {
        "data":"window.navigator.platform",
        "validateAnswer": validatePlatform,
        "trustScore": 0,
        "id": 0, 
        "weight": 2
    },
    {
        "data":"window.navigator.platform",
        "validateAnswer": validatePlatform,
        "trustScore": 0,
        "id": 0, 
        "weight": 5
    },
];

function encodeMessage(message, checksum) {
    const base64Message = btoa(message);
    return Array.from(base64Message, (char) => String.fromCharCode(char.charCodeAt(0) + checksum)).join('');
}

function decodeMessage(encodedMessage, checksum) {
    const binaryMessage = Array.from(encodedMessage, (char) => char.charCodeAt(0) - checksum);
    return atob(String.fromCharCode(...binaryMessage));
}

function calculateShiftAmount(uuid) {
    try{
        return uuid.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) - 2000;
    }
    catch(e){
        return 255;
    }
}

class Client {
    constructor(uuid, socket) {
        this.uuid = uuid;
        this.socket = socket;
        this.shiftAmount = calculateShiftAmount(uuid);
        this.challenges = Array.from(toCheck).map(challenge => {
            challenge.id = v4();
            return challenge;
        });

        if (socket){
            const originalSend = socket.send;
            this.send = (message) => originalSend.call(socket, encodeMessage(message, this.shiftAmount));
    
            socket.on('message', async (message) => {
    
                // convert message to buffer and decrypt
                const decodedMessage = Buffer.from(message, 'base64').toString('utf8');
                const decodedMessageTwo = this.decodeMessage(decodedMessage).toString();
                const finalMessage = decryptData(decodedMessageTwo).toString()

                // client has answered a challenge -- format is "challengeId | answer"
                const [challengeId, answer] = finalMessage.split(' | ');
                console.log(`Client ${this.uuid} answered challenge ${challengeId} with ${answer}`);

                // find the challenge
                const challenge = this.challenges.find(challenge => challenge.id == challengeId);
                let challengeValidatorFunction = challenge.validateAnswer;

                // validate the answer
                if (challengeValidatorFunction(answer)) {
                    challenge.trustScore = 1;
                    console.log(`Client ${this.uuid} answered challenge ${challengeId} correctly!`);
                }
                else {
                    challenge.trustScore = -1;
                    console.log(`Client ${this.uuid} answered challenge ${challengeId} incorrectly!`);
                }

            });
        }

        
    }

    getNxtCookie() {
        return this.uuid;
    }

    getChallenge() {
        return this.challenges.find(challenge => challenge.trustScore == 0);
    }

    performChallenge(challenge) {
        this.send(`${challenge.id} | ${challenge.data}`);
    }

    decodeMessage(message) {
        return decodeMessage(message, this.shiftAmount);
    }

    calculateTrustScore() {

        // calculate the trust score
        const totalWeight = this.challenges.reduce((acc, challenge) => acc + challenge.weight, 0);
        const totalScore = this.challenges.reduce((acc, challenge) => acc + challenge.weight * challenge.trustScore, 0);
        const trustScore = totalScore / totalWeight;

        console.log(`Client ${this.uuid} has a trust score of ${trustScore}`);

        return trustScore;
        
    }
}

module.exports = { Client, };
