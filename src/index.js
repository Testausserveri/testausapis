import "./console.js"
import dotenv from "dotenv"
dotenv.config()

import express from "express"
import * as Package from "../package.json"

import apiV1Route from "./api/v1/index.js"

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)
console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)

if (process.env.DEBUGGING) console.warn("DEBUGGING MODE IS ACTIVE! DISCORD INTERACTIONS WILL BE IGNORED!")

const app = express()
app.use((_, res, next) => { // Allow everyone for CORS
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

app.use("/v1", apiV1Route)

app.use((_, res) => {
    if (!res.headersSent) res.status(404).json({error: "What?"})
})

const port = process.env.HTTP_PORT || 8080
app.listen(port, () => {
    console.log("Webserver listening port", port)
})
