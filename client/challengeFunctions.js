
const validUserAgentIncludes = ["Chrome", "Firefox", "Safari", "Edge", "Opera"]
const validSystems = ["Win32", "MacIntel", "Linux x86_64", "Linux i686"]


function validateUserAgent(userAgent) {
    return validUserAgentIncludes.some((ua) => userAgent.includes(ua))
}
function validatePlatform(platform) {
    return validSystems.some((sys) => platform.includes(sys))
}

module.exports = {
    validateUserAgent,
    validatePlatform
}