/* eslint-disable import/extensions */
const request = require("./request.js")

async function getCodingLeaderboard() {
    const { data } = await request("GET", "https://api.testaustime.fi/leaderboards/balls", {
        Authorization: `Bearer ${process.env.TESTAUSTIME_TOKEN}`
    })
    const { members } = JSON.parse(data)
    const leaderboard = members
        .map((member) => ({
            name: member.username,
            value: member.time_coded
        }))
        .sort((a, b) => (b.value - a.value))
        .slice(0, 5)

    return leaderboard
}

module.exports = getCodingLeaderboard
