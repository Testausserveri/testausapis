/* eslint-disable import/extensions */
/* eslint-disable new-cap */

const express = require("express")
const request = require("./utils/request.js")
const cache = require("./utils/cache.js")

const router = express.Router()

router.get("/codingLeaderboard", cache(7), async (req, res) => {
    const { data } = await request("GET", "https://api.testaustime.fi/leaderboards/balls", {
        Authorization: `Bearer ${process.env.TESTAUSTIME_TOKEN}`
    })
    const { members } = JSON.parse(data)
    const leaderboard = members
        .map((member) => ({
            name: member.username,
            value: member.time_coded
        }))
        .sort((a, b) => (b.time - a.time))
        .slice(0, 5)

    res.json(leaderboard)
})

module.exports = router
