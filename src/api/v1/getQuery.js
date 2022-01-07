/**
 * Get a query parameter from a URL by it's key
 * @param {string} key The query key
 * @param {string} url The URL string
 * @returns {string}
 */
module.exports = function getQuery(key, url) {
    try {
        // eslint-disable-next-line no-param-reassign
        if (url.startsWith("/")) url = `http://local${url}`
        const urlConstruct = new URL(url)
        return urlConstruct.searchParams.get(key)
    } catch (e) {
        return false
    }
}
