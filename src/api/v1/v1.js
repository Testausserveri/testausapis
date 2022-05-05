/* eslint-disable import/extensions */
/* eslint-disable new-cap */

const express = require("express")
const discordRoute = require("./discord.js")
const githubRoute = require("./github.js")
const miscRoute = require("./misc.js")

const database = require("./database/database.js")

database.init()
    .catch((e) => {
        console.error("Failed to connect to the database", e)
    })

const router = express.Router()

router.use("/discord", discordRoute)
router.use("/github", githubRoute)
router.use("/misc", miscRoute)

module.exports = router
