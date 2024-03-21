# NXTAntibot
 POC Antibot -- not meant for real world use (yet)

# How it works
 1) Extremely obfuscated code is sent to the client, also creating a cookie to ID the client
 2) Client makes a websocket connection to antibot server, where all data being sent and recieved are encrypted with SHA256.
 3) Antibot server sends a variety of unique challenges (always different) to the client, ones that a bot (such as Puppeteer or Selenium) would fail
 4) A score from 0 to 1 is given to a client throughout the challenge requests.
 5) Endpoints marked as high security are blocked from a certain score threshold (ex: 0.5)

# Why it works
 1) Most actually harmful bots aren't headless or headed browsers. They're extremely bare request clients in languages like Python and Go that send requests like a browser.
 2) Since the connection is thru a websocket, many traditional request clients would not work. Attackers would need to switch libraries/clients and adapt.
 3) Attackers **cannot** decode any of the messages being sent from their browser to the antibot. This means reverse-engineering is much harder.
 4) The raw code is extremely obfuscated. Almost no programmers have the skillset to deobfuscate it into a readable script.
