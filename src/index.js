require("dotenv").config()

// Imports
const express = require("express")
const Package = require("../package.json")
const v1 = require("./api/v1/v1")

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)
// eslint-disable-next-line new-cap
console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)

require("./console")()

if (process.env.DEBUGGING) console.warn("DEBUGGING MODE IS ACTIVE! DISCORD INTERACTIONS WILL BE IGNORED!")

// Initialization
const app = express()

// Webserver
app.use((
    _, res, next
) => { // Allow everyone for CORS
    res.setHeader("Access-Control-Allow-Origin", "*")
    next()
})

app.get("/", (_, res) => {
    res.status(200).json({
        name: Package.name,
        author: Package.author,
        version: Package.version,
        repository: Package.repository,
        bugs: Package.bugs.url,
        homepage: Package.homepage
    })
})

// API
app.use("/v1", v1)

app.use((_, res) => {
    if (!res.headersSent) res.status(404).send("Not found.")
})

const port = process.env.HTTP_PORT || 8080
app.listen(port, () => {
    console.log("Webserver listening port", port)
})
