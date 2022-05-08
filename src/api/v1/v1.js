const express = require("express")
const discordRoute = require("./discord")
const githubRoute = require("./github")
const miscRoute = require("./misc")

const database = require("./database/database")

database.init()
    .catch((e) => {
        console.error("Failed to connect to the database", e)
    })

const router = express.Router()

router.use("/discord", discordRoute)
router.use("/github", githubRoute)
router.use("/misc", miscRoute)

module.exports = router
