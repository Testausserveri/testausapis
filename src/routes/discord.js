import { Router } from "express"
import database from "../database/database.js"
import discord from "../discord/discord.js"
import request from "../utils/request.js"
import getQuery from "../utils/getQuery.js"
import testauskoiraDatabase from "../testauskoira/database.js"
import getCodingLeaderboard from "../utils/getCodingLeaderboard.js"

const address = process.env.HTTP_URL
const rolesWhitelistedForDataExport = ["743950610080071801"]
const rolesWhitelistedForConsensualDataExport = ["839072621060423771", "755327895106486324"]
const discordCallback = `${address}/v1/discord/connections/authorized`
const mainServer = "697710787636101202"

// eslint-disable-next-line new-cap
const router = Router()
testauskoiraDatabase.connect()

let discordUtility // The Discord utility class

const liveCacheTTL = 5000
let guildInfoCache = null

/**
 * Get messages leaderboard and match userids' with their usernames
 * @returns {Promise<Array>} Returns reformatted leaderboard-object
 */
async function getMessagesLeaderboard() {
    return [...await (Promise.allSettled((await testauskoiraDatabase.getMessagesLeaderboard()).map(async (item) => ({
        name: (await discordUtility.getUserById(item.userid)).username,
        value: item.message_count
    }))))].map((item) => item.value)
}

/**
 * Update the guildInfo cache
 */
async function updateGuildInfoCache() {
    try {
        const config = await database.DataCollectionConfiguration.getDataCollectionConfig(mainServer) // We'll keep this here
        const data = await Promise.all([
            database.MessageCount.getMessageCount(mainServer),
            discordUtility.getMemberCount(mainServer),
            discordUtility.getOnlineCount(mainServer),
            database.DataCollectionConfiguration.getDataCollectionConfig(mainServer),
            discordUtility.getBoostStatus(mainServer, config?.allowed ?? []),
            getCodingLeaderboard(),
            getMessagesLeaderboard()
        ])

        guildInfoCache = {
            memberCount: data[1] ?? "N/A",
            membersOnline: data[2] ?? "N/A",
            messagesToday: data[0] ?? "N/A",
            premium: data[4] ?? { subscriptions: "N/A", trier: "N/A", subscribers: [] },
            codingLeaderboard: data[5],
            messagesLeaderboard: data[6],
            timestamp: new Date().getTime()
        }
    } catch (e) {
        console.error("Failed to update guildInfo cache.", e)
    }
}
database.connection.once("open", async () => {
    discordUtility = await discord.init(database)

    // Cache all role data on startup
    // eslint-disable-next-line consistent-return
    discordUtility.on("ready", async () => {
        setInterval(updateGuildInfoCache, liveCacheTTL)
        updateGuildInfoCache()

        console.log("Caching role data...")

        const config = await database.DataCollectionConfiguration.getDataCollectionConfig(mainServer)
        if (!config) return console.warn("Data collection configuration for the main server does not exist. Unable to create caches.")

        const roles = [rolesWhitelistedForDataExport, rolesWhitelistedForConsensualDataExport].flat(1)
        for (const id of roles) {
            discordUtility.getRoleData(mainServer, id, rolesWhitelistedForConsensualDataExport.includes(id) ? config.allowed : undefined)
        }
    })
})

// Middleware to check ready-state for Discord-related routes
router.use((_, res, next) => {
    if (discordUtility === undefined) return res.status(503).json({ error: "Service is getting ready" })
    return next()
})

router.get("/guildInfo", async (req, res) => {
    if (!guildInfoCache) return res.status(503).json({ error: "Service Unavailable" })

    const guildInfo = req.query.r ? Object.keys(guildInfoCache)
        .filter((key) => req.query.r.split(",").includes(key))
        .reduce((obj, key) => (Object.assign(obj, { [key]: guildInfoCache[key] })), {}) : guildInfoCache

    return res.json(guildInfo)
})

router.get("/roleInfo", async (req, res) => {
    if (![rolesWhitelistedForConsensualDataExport, rolesWhitelistedForDataExport].flat(1).includes(req.query.id)) return res.status(401).json({ error: "Private role data." })
    if (!req.query.id) return res.status(400).json({ error: "Please specify a role id in the query." })
    const role = await discordUtility.getRoleData(mainServer, req.query.id, [])
    delete role.members
    if (role === null) return res.status(404).json({ error: "No such role or cache miss." })
    return res.json(role)
})

router.get("/memberInfo", async (req, res) => {
    if (!req.query.role) return res.status(400).json({ error: "Please specify a role id (as role) in the query." })
    let role
    if (rolesWhitelistedForDataExport.includes(req.query.role)) {
        // Public data
        role = await discordUtility.getRoleData(mainServer, req.query.role)
        if (role === null) return res.status(404).json({ error: "No such role or cache miss." })
    } else {
        // Requires consent
        if (!rolesWhitelistedForConsensualDataExport.includes(req.query.role)) return res.json({ error: "Private role data." })
        const config = await database.DataCollectionConfiguration.getDataCollectionConfig(mainServer)
        if (config === null) return res.status(401).json({ error: "No private role data available." })
        role = await discordUtility.getRoleData(mainServer, req.query.role, config.allowed)
        if (role === null) return res.status(404).json({ error: "No such role or cache miss." })
        role.members = role.members.filter((member) => config.allowed.includes(member.id)) // TODO: Is this needed?
    }
    return res.json(role)
})

router.get("/connections/authorize", async (_, res) => {
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
    await database.UserInfo.setUserInfo(user.id, undefined, connectedAccounts)
    return res.status(200).send("Success! Profile updated.")
})

export default router
