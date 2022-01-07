/**
 * Get a query parameter from a URL by it's key
 * @param {string} key The query key
 * @param {url} url The URL string
 * @returns {string}
 */
module.exports = function getQuery(key, url){
    if(!url) throw "Missing URL from getQuery"
    if(url.includes(key + "=")){
        try {
            let value = url.split(key + "=")[1]
            if(value.includes("&")) value = value.split("&")[0]
            return decodeURIComponent(value)
        }
        catch(e){
            return false
        }
    }
    return false
}