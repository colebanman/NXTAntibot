const ws = new WebSocket('ws://localhost:8080');
window.ws = {};
const uuid = `{{UUID}}`
const st = `{{ST}}`
const publicKey = "MIICIjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAjoNVncIVsUAuW4RH75cYe6I3T7sHC54OmIU+eTYc/F1SDSCGtirBym4rgtGwwHLFhGaq6sLoI9BxbAwmoVMliWiBrRmatXhmPbqX7juRvLHPJ+9LHJp/eEQgSz7aef/zVrjzCpz0xD0Nh2o4Lg+ckXXgMBWID8btmwJwjLVHNj9J1hsEs0fk/iGmK1hCEYqX3Vosxue0sxLKzvyNDsNKdEL5NXpLSlHB2RWVa0+EFcieuLfVmMThe9NqUY5w9Zf3AYHvVpQuam2TJd0ht6jx MozpWrVwHVlHna+goRDBBV9mxzRBTxlwDgtgbZCO4YBmF2AbxSBnhnhtFboniHHtih19DeXQKsS5ZiOZr9/bcVNgvIfzvNuw/lrMTZCgz3i5XNQKBtQKPceohBxCA4Hg UEE6J5hgxjneJMlZRCc9XKFeTgFxmfuN1B+vSx9s+f7F4Wl9ri+8GawApznyJn8XzVHMrMZbTHcS1FVe//nU/n0/nY1Qfs3XnQN4xhScHjnuvh8/fOvbNEWXplZOrj+JYTsjDb9Vs9basXTqYz284GNRrAwBIEOnXyu4fGOxiKv0ipCPs/RRxVVadA8tB0ReyZysEQ5PQ0Jhsf0jRZk/rrctMq/YqzyxG9aOGeM7vB/Pbgo88c/OUiZfaFP7T/vqdINs82/wC2/To4Y/ZFQ5BwsCAwEAAQ=="; // Replace with your public key


var pbKey = "";

function calculateShiftAmount(){
    // checksum of uuid
    let checksum = 0;
    for(let i = 0; i < uuid.length; i++){
        checksum += uuid.charCodeAt(i);
    }
    return checksum - 2000;
}
const shiftAmount = calculateShiftAmount();
  
 
async function encryptData(data) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(data);

    const publicKeyObj = await crypto.subtle.importKey(
      "spki",
      str2ab(atob(publicKey)),
      {
        name: "RSA-OAEP",
        hash: "SHA-256",
      },
      true,
      ["encrypt"]
    ).catch(e => {
        console.log(e);
    });


  
      const encrypted = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKeyObj,
        encodedData
      ).catch(e => {
          console.log(e);
      });

    return arrayBufferToBase64(encrypted);
  }
  
  function str2ab(str) {
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }
  
  function arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    return btoa(binary);
  }

  

function decryptMessage(encodedMessage) {
    // Split encoded message into individual characters
    const encodedChars = encodedMessage.split('');
    // Decode the characters back to their original binary values
    const binaryMessage = encodedChars.map(char => char.charCodeAt(0) - shiftAmount);
    // Convert binary values to a base64 string
    const decodedMessageBase64 = String.fromCharCode(...binaryMessage);
    // Decode base64 to the original message
    const decodedMessage = atob(decodedMessageBase64);
    return decodedMessage;
}
function encodeMessage(message){
    // turn message into a buffer
    const base64Message = btoa(message);

    // turn message into binary, and encrypt it
    const binaryMessage = new Uint8Array(base64Message.length);

    for (let i = 0; i < base64Message.length; i++) {
        binaryMessage[i] = base64Message.charCodeAt(i);
    }

    //  turn into random looking unicode characters

    let encodedMsg = []
    for (let i = 0; i < binaryMessage.length; i++) {
        encodedMsg.push(String.fromCharCode(binaryMessage[i] + shiftAmount));
    }

    let toSend = encodedMsg.join('');
    return toSend;
}

        

ws.send = async(message) => {
      const encrypedMessage = await encryptData(message);

      const encodedMessage = encodeMessage(encrypedMessage);

      WebSocket.prototype.send.call(ws, encodedMessage);

    

    // call other encryption functions here
}

ws.addEventListener('open', () => {
    // console.log('WebSocket connection opened');  
});

ws.addEventListener('message', (event) => {
    let message = decryptMessage(event.data);

    // message will be in the format "challengeId | challenge"
    const [challengeId, challenge] = message.split(' | ');
    // console.log(`Answering challenge ${challengeId} - ${challenge}`);

    // challenge will be just a function like "window.navigator.userAgent" -- we need to execute it
    const answer = eval(challenge);
    
    // console.log(`Answer is ${answer}`);

    // send answer back to server
    // calculate time taken

    ws.send(`${challengeId} | ${answer}`);

    
});

ws.addEventListener('close', () => {
    // console.log('WebSocket connection closed');
});
