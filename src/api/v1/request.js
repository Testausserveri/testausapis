// Supported protocols
const protocols = {
    http: require("http"),
    https: require("https")
}

// Typings
//require("../../typings/request")

/**
 * Make a simple HTTPS request
 * @param {string} method The request method
 * @param {string} url The request url
 * @param {string} body The request body
 * @returns {RequestResponse}
 */
module.exports = async function request(method, url, headers, body){
    return new Promise((resolve, reject) => {
        const URLConstruct = new URL(url)
        const requestProtocol = URLConstruct.protocol.replace(":", "")
        if(protocols[requestProtocol]){
            const req = protocols[requestProtocol].request({
                path: URLConstruct.pathname + (url.includes("?") ? "?" + url.split("?")[1]: ""),
                method: method,
                host: URLConstruct.hostname,
                port: URLConstruct.port
            }, res => {
                let d = []
                res.on("data", buffer => {
                    d.push(buffer)
                })
                res.on("end", async () => {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: Buffer.concat(d).toString()
                    })
                })
            })
            if(headers){
                for(const header in headers){
                    req.setHeader(header, headers[header])
                }
            }
            if(req.method !== "GET" && body){
                req.setHeader("Content-Length", Buffer.byteLength(body))
                req.write(body)
                req.end()
            }else {
                req.end()
            }
        }else {
            reject("Unknown protocol")
        }
    })
}