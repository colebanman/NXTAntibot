const ws = new WebSocket('ws://localhost:8080');
const uuid = `{{UUID}}`;
const st = `{{ST}}`;
const publicKey = "{{PUBLIC_KEY}}";

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

    

}

ws.addEventListener('open', () => {
});

ws.addEventListener('message', (event) => {
    let message = decryptMessage(event.data);
    const [challengeId, challenge] = message.split(' | ');
    const answer = eval(challenge);
    ws.send(challengeId + ' | ' + answer);

    
});

ws.addEventListener('close', () => {
});
