const { v4: uuidv4 } = require('uuid');
const toCheck = [
    // existing checks
    {
        "data": "window.navigator.userAgent",
        "validateAnswer": validateUserAgent,
        "trustScore": 0,
        "id": 0,
        "weight": 5
    },
    {
        "data": "window.navigator.platform",
        "validateAnswer": validatePlatform,
        "trustScore": 0,
        "id": 0, 
        "weight": 2
    },
    {
        "data": "window.navigator.language",
        "validateAnswer": validateLanguage,
        "trustScore": 0,
        "id": 0,
        "weight": 2
    },
    {
        "data": "window.navigator.hardwareConcurrency",
        "validateAnswer": validateConcurrency,
        "trustScore": 0,
        "id": 0,
        "weight": 3
    },
    {
        "data": "window.navigator.cookieEnabled",
        "validateAnswer": validateCookies,
        "trustScore": 0,
        "id": 0,
        "weight": 1
    },
    {
        "data": "window.screen.colorDepth",
        "validateAnswer": validateColorDepth,
        "trustScore": 0,
        "id": 0,
        "weight": 2
    },
    {
        "data": "window.history.length",
        "validateAnswer": validateHistoryLength,
        "trustScore": 0,
        "id": 0,
        "weight": 1
    },
];

// Additional validation functions
function validateLanguage(language) {
    const validLanguages = ["en-US", "fr-FR", "es-ES", "de-DE", "it-IT"];
    return validLanguages.includes(language);
}

function validateConcurrency(concurrency) {
    return concurrency > 0;
}

function validateCookies(cookiesEnabled) {
    return cookiesEnabled == "true";
}

function validateColorDepth(colorDepth) {
    return colorDepth >= 24;
}

function validateHistoryLength(length) {
    return length > 2;
}

const validUserAgentIncludes = ["Chrome", "Firefox", "Safari", "Edge", "Opera"]
const validSystems = ["Win32", "MacIntel", "Linux x86_64", "Linux i686"]

function validateUserAgent(userAgent) {
    return validUserAgentIncludes.some((ua) => userAgent.includes(ua))
}
function validatePlatform(platform) {
    return validSystems.some((sys) => platform.includes(sys))
}

function getChallengeFunctions() {
    return Array.from(toCheck).map(challenge => {
        challenge.id = uuidv4();
        challenge.started = false;
        return challenge;
    });
}

module.exports = {
    getChallengeFunctions
}