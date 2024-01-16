const express = require('express');
const http = require('http');

const cors = require('cors');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser')

const app = express();
const server = http.createServer(app);

const nxtMiddleware = require('./middleware');

const nxtSecureEndpoints = [
    "/exampleApi"
]
const nxtConfig = {
    recordLogs: true,
    obscureResponses: false,
    minimumPassScore: 0.5,
}

app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

nxtMiddleware(app, nxtSecureEndpoints, nxtConfig);

app.get('/exampleApi', (req, res) => {
    res.send('Hello from the example API!');
});

server.listen(5123, () => {
    console.log('Server listening on port 5123');
});