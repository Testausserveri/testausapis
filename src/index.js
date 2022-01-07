require("dotenv").config()

// Imports
const express = require("express")
const Package = require("../package.json")
const v1 = require("./api/v1/v1")

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)

require("./console")

// Initialization
const app = express()

// Webserver
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

app.use((req, res, next) => { // Allow testausserveri.fi for CORS
    res.header("Access-Control-Allow-Origin", "*")
    next()
})

// API
app.use(async (req, res, next) => v1(req, res, next))

app.use((_, res) => {
    if (!res.headersSent) res.status(404).send("Not found.")
})

app.listen(8080, () => {
    console.log("Webserver listening port", 8080)
})
