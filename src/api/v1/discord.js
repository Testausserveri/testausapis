/* eslint-disable consistent-return */
/* eslint-disable import/extensions */
/* eslint-disable new-cap */

const express = require("express")
const database = require("./database/database.js")
const discord = require("./discord/discord.js")
const request = require("./utils/request.js")
const getQuery = require("./utils/getQuery.js")

const address = process.env.HTTP_URL
const rolesWhitelistedForDataExport = ["743950610080071801"]
const rolesWhitelistedForConsensualDataExport = ["839072621060423771", "755327895106486324"]
const discordCallback = `${address}/v1/discord/connections/authorized`
const mainServer = "697710787636101202"

const router = express.Router()

let guildInfoCache = null
let discordUtility // The Discord utility class

database.connection.once("open", () => {
    discordUtility = discord.default(database)

    // Cache all role data on startup
    discordUtility.on("ready", async () => {
        console.log("Caching role data...")

        const config = await database.getDataCollectionConfig(mainServer)
        if (!config) return console.warn("Data collection configuration for the main server does not exist. Unable to create caches.")

        const roles = [rolesWhitelistedForDataExport, rolesWhitelistedForConsensualDataExport].flat(1)
        // eslint-disable-next-line no-restricted-syntax
        for (const id of roles) {
            discordUtility.getRoleData(mainServer, id, rolesWhitelistedForConsensualDataExport.includes(id) ? config.allowed : undefined)
        }
    })
})
// Middleware to check ready-state for Discord-related routes
router.use((req, res, next) => {
    if (discordUtility === undefined) return res.status(503).send("Service is getting ready...")
    next()
})

router.get("/guildInfo", async (req, res) => {
    if (guildInfoCache && guildInfoCache.timestamp + 5000 > new Date().getTime()) return res.json({ cache: "valid", ...guildInfoCache })
    if (guildInfoCache) res.json({ cache: "expired-updating", ...guildInfoCache })
    const messagesToday = await database.getMessageCount(mainServer)
    const config = await database.getDataCollectionConfig(mainServer)
    const memberCount = await discordUtility.getMemberCount(mainServer)
    const membersOnline = await discordUtility.getOnlineCount(mainServer)
    const boostStatus = await discordUtility.getBoostStatus(mainServer, config?.allowed ?? [])
    guildInfoCache = {
        memberCount: memberCount ?? "N/A",
        membersOnline: membersOnline ?? "N/A",
        messagesToday: messagesToday ?? "N/A",
        premium: boostStatus ?? { subscriptions: "N/A", trier: "N/A", subscribers: [] },
        timestamp: new Date().getTime()
    }
    return !res.headersSent ? res.json({ cache: "valid", ...guildInfoCache }) : null
})

router.get("/roleInfo", async (req, res) => {
    if (![rolesWhitelistedForConsensualDataExport, rolesWhitelistedForDataExport].flat(1).includes(req.query.id)) return res.status(401).send("Private role data.")
    if (!req.query.id) return res.status(400).send("Please specify a role id in the query.")
    const role = await discordUtility.getRoleData(mainServer, req.query.id, [])
    delete role.members
    if (role === null) return res.status(404).send("No such role or cache miss.")
    return res.json(role)
})

router.get("/memberInfo", async (req, res) => {
    if (!req.query.role) return res.status(400).send("Please specify a role id (as role) in the query.")
    let role
    if (rolesWhitelistedForDataExport.includes(req.query.role)) {
        // Public data
        role = await discordUtility.getRoleData(mainServer, req.query.role)
        if (role === null) return res.status(404).send("No such role or cache miss.")
    } else {
        // Requires consent
        if (!rolesWhitelistedForConsensualDataExport.includes(req.query.role)) return res.status(400).send("Private role data.")
        const config = await database.getDataCollectionConfig(mainServer)
        if (config === null) return res.status(401).send("No public role data available.")
        role = await discordUtility.getRoleData(mainServer, req.query.role, config.allowed)
        if (role === null) return res.status(404).send("No such role or cache miss.")
        role.members = role.members.filter((member) => config.allowed.includes(member.id)) // TODO: Is this needed?
    }
    return res.json(role)
})

router.get("/connections/authorize", async (req, res) => {
    res.redirect(`https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&response_type=code&scope=identify%20connections&redirect_uri=${discordCallback}`)
})

router.get("/connections/authorized", async (req, res) => {
    // Authorization consent screen & auth code
    const code = getQuery("code", req.url)
    if (!code) return res.status(400).send("Missing code from request query.")
    // Get token
    const params = new URLSearchParams()
    params.append("client_id", process.env.DISCORD_CLIENT_ID)
    params.append("client_secret", process.env.DISCORD_SECRET)
    params.append("grant_type", "authorization_code")
    params.append("code", code)
    params.append("redirect_uri", discordCallback)
    const tokenExchange = await request(
        "POST", "https://discord.com/api/v8/oauth2/token", {
            "Content-Type": "application/x-www-form-urlencoded"
        }, params.toString()
    )
    if (tokenExchange.status !== 200) return res.status(500).send("Failed to access Discord API.")
    const token = JSON.parse(tokenExchange.data).access_token
    const info = await request("GET", "https://discord.com/api/v9/oauth2/@me", {
        Authorization: `Bearer ${token}`
    })
    if (info.status !== 200) return res.status(401).send("Failed to get user data.")
    const { user } = JSON.parse(info.data)
    const connections = await request("GET", "https://discord.com/api/v8/users/@me/connections", {
        Authorization: `Bearer ${token}`
    })
    if (connections.status !== 200) return res.status(401).send("Failed to get profile data.")
    // Got the profile data!
    const connectedAccounts = JSON.parse(connections.data).filter((account) => account.visibility === 1)
    await database.setUserInfo(user.id, undefined, connectedAccounts)
    return res.status(200).send("Success! Profile updated.")
})

module.exports = router
