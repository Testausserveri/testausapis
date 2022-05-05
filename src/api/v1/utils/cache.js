const mcache = require("memory-cache")

/**
 * In-memory cache middleware for Express
 * @param {Integer} duration Cache duration in seconds
 */
const cache = (duration) => (req, res, next) => {
    const key = `__express__${req.originalUrl}` || req.url
    const cachedBody = mcache.get(key)
    if (cachedBody) {
        res.end(cachedBody)
    } else {
        res.sendResponse = res.send
        res.send = (body) => {
            mcache.put(key, body, duration * 1000)
            res.sendResponse(body)
        }
        next()
    }
}

module.exports = cache
