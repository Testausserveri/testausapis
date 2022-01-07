/**
 * Get a query parameter from a URL by it's key
 * @param {string} key The query key
 * @param {string} url The URL string
 * @returns {string}
 */
module.exports = function getQuery(key, url) {
    if (url.includes(`${key}=`)) {
        try {
            const urlConstruct = new URL(url)
            return urlConstruct.searchParams.get(key)
        } catch (e) {
            return false
        }
    }
    return false
}
