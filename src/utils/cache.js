import mCache from "memory-cache";

/**
 * In-memory cache middleware for Express
 * @param {Integer} duration Cache duration in seconds
 */
export default (duration) => (req, res, next) => {
    const key = `__express__${req.originalUrl}` || req.url
    const cachedBody = mCache.get(key)
    if (cachedBody) {
        res.end(cachedBody)
    } else {
        res.sendResponse = res.send
        res.send = (body) => {
            mCache.put(key, body, duration * 1000)
            res.sendResponse(body)
        }
        next()
    }
}
