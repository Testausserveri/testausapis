import "./header.js"
import "dotenv/config"
import express from "express"
import Package from "../package.json" assert { type: "json" }
import database from "./database/database.js"

import discordRoute from "./routes/discord.js"
import githubRoute from "./routes/github.js"
import projectsRoute from "./routes/projects.js"
import applyRoute from "./routes/apply.js"
import miscRoute from "./routes/misc.js"

// Eemil's membersArea backend, which is not yet in use.
// import membersRoute from "./routes/members.js"

import membersAreaRoute from "./routes/membersArea.js"

/**
 * Database connection
 */
console.log("Connecting to database...")
database.init()
    .then(() => {
        console.log("Database connected")
    })
    .catch((e) => {
        console.error("Failed to connect to the database", e)
        process.exit(1)
    })

/**
 * HTTP server
 */
const app = express()

app.set("json spaces", 2)

app.use((_, res, next) => { // Allow everyone for CORS
    res.setHeader("Access-Control-Allow-Origin", process.env.CORS_DOMAIN)
    res.setHeader("Access-Control-Allow-Credentials", "true")
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

// eslint-disable-next-line new-cap
const router = express.Router()

router.use("/discord", discordRoute) // Eemilin legacy Discord-integraatiot
router.use("/github", githubRoute)
router.use("/projects", projectsRoute)
router.use("/apply", applyRoute)
// router.use("/members", membersRoute) Eemilin WIP membersArea
router.use("/", miscRoute)
router.use("/", membersAreaRoute) // production membersArea

app.use("/v1", router)

app.use((_, res) => {
    if (!res.headersSent) res.status(404).json({ error: "What?" })
})

const port = process.env.HTTP_PORT || 8080

app.listen(port, () => {
    console.log(`HTTP server listening on port ${port}`)
})
