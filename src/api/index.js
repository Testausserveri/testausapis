/* 

import database from "./database/database"

import discordRoute from "./discord"
import githubRoute from "./github"
import miscRoute from "./misc" */

import express from "express"
import database from "./database/database.js"

database.init()
    .catch((e) => {
        console.error("Failed to connect to the database", e)
    })

const router = express.Router()

/*
router.use("/discord", discordRoute)
router.use("/github", githubRoute)
router.use("/misc", miscRoute)
*/

export default router