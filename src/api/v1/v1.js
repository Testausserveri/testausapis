// Packages
// eslint-disable-next-line no-unused-vars
const { Request, Response, NextFunction } = require("express")

// Configuration
const mainServer = "697710787636101202"
const address = process.env.DEBUGGING ? "http://localhost:8080" : "https://api.testausserveri.fi"
const discordCallback = `${address}/v1/discord/connections/authorized`
const githubCallback = `${address}/v1/github/authorized`
const rolesWhitelistedForDataExport = ["743950610080071801"]
const rolesWhitelistedForConsensualDataExport = ["839072621060423771"]

// Internal dependencies
const database = require("./database")
const discord = require("./discord")
const request = require("./request")
const getQuery = require("./getQuery")

let discordUtility // The Discord utility class

// Initialize the Discord client & Database
database.init().then(() => {
    discordUtility = discord(database)
    console.log("Connected to the database!")
    // TODO: Wait for ready, discord
    // Cache all role data on startup
    discordUtility.on("ready", () => {
        console.log("Caching role data...")
        database.getDataCollectionConfig(mainServer).then(async (config) => {
            if (config === null) {
                console.warn("Data collection configuration for the main server does not exist. Unable to create caches.")
                return
            }
            // eslint-disable-next-line no-restricted-syntax
            for await (const id of [rolesWhitelistedForDataExport, rolesWhitelistedForConsensualDataExport].flat(1)) {
                await discordUtility.getRoleData(
                    mainServer, id, rolesWhitelistedForConsensualDataExport.includes(id) ? config.allowed : undefined
                )
            }
        })
    })
}).catch((e) => {
    console.error("Failed to connect to the database", e)
})

/**
 * V1 API Handler
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
module.exports = async (
    req, res, next
) => {
    // Verify that we are ready to serve data
    if (discordUtility === undefined) return res.status(503).send("Service is getting ready...")

    // GuildInfo
    if (req.method === "GET" && req.path === "/v1/discord/guildInfo") {
        const messagesToday = await database.getMessageCount(mainServer)
        const memberCount = await discordUtility.getMemberCount(mainServer)
        return res.json({
            memberCount: memberCount ?? "N/A",
            messagesToday: messagesToday ?? "N/A"
        })
    }

    // MemberInfo
    if (req.method === "GET" && req.path === "/v1/discord/roleInfo") {
        if (!rolesWhitelistedForDataExport.includes(req.query.id)) return res.status(401).send("Private role data.")
        if (!req.query.id) return res.status(400).send("Please specify a role id in the query.")
        const role = await discordUtility.getRoleData(mainServer, req.query.id)
        if (role === null) return res.status(404).send("No such role or cache miss.")
        return res.json(role)
    }

    if (req.method === "GET" && req.path === "/v1/discord/memberInfo") {
        if (!req.query.role) return res.status(400).send("Please specify a role id (as role) in the query.")
        if (!rolesWhitelistedForConsensualDataExport.includes(req.query.role)) return res.status(400).send("Private role data.")
        const config = await database.getDataCollectionConfig(mainServer)
        if (config === null) return res.status(401).send("No public role data available.")
        const role = await discordUtility.getRoleData(
            mainServer, req.query.role, config.allowed
        )
        if (role === null) return res.status(404).send("No such role or cache miss.")
        role.members = role.members.filter((member) => config.allowed.includes(member.id))
        return res.json(role)
    }

    // Discord authorization
    if (req.method === "GET" && req.path === "/v1/discord/connections/authorize") {
        return res.redirect(`https://discord.com/api/oauth2/authorize?client_id=917512133535748126&response_type=code&scope=identify%20connections&redirect_uri=${discordCallback}`)
    }

    if (req.method === "GET" && req.path === "/v1/discord/connections/authorized") {
        // Authorization consent screen & auth code
        const code = getQuery("code", req.url)
        if (!code) return res.status(400).send("Missing code from request query.")
        // Get token
        const params = new URLSearchParams()
        params.append("client_id", "917512133535748126")
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
        const info = await request(
            "GET", "https://discord.com/api/v9/oauth2/@me", {
                Authorization: `Bearer ${token}`
            }
        )
        if (info.status !== 200) return res.status(401).send("Failed to get user data.")
        const { user } = JSON.parse(info.data)
        const connections = await request(
            "GET", "https://discord.com/api/v8/users/@me/connections", {
                Authorization: `Bearer ${token}`
            }
        )
        if (connections.status !== 200) return res.status(401).send("Failed to get profile data.")
        // Got the profile data!
        const connectedAccounts = JSON.parse(connections.data).filter((account) => account.visibility === 1)
        await database.setUserInfo(
            user.id, undefined, connectedAccounts
        )
        res.status(200).send("Success! Profile updated.")
    }

    // Github authorization
    if (req.method === "GET" && req.path === "/v1/github/authorize") {
        return res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.GH_CLIENT_ID}&redirect_uri=${githubCallback}&scope=write:org`)
    }

    // Github join callback
    if (req.method === "GET" && req.path === "/v1/github/authorized") {
        // Fetch the access token
        const code = await getQuery("code", req.url)
        if (!code) return res.status(400).send("Missing code from request query.")
        const tokenParams = new URLSearchParams()
        tokenParams.append("client_id", process.env.GH_CLIENT_ID)
        tokenParams.append("client_secret", process.env.GH_CLIENT_SECRET)
        tokenParams.append("code", code)
        tokenParams.append("redirect_url", githubCallback)
        const tokenExchange = await request(
            "POST", "https://github.com/login/oauth/access_token", {}, tokenParams.toString()
        )
        if (tokenExchange.status !== 200) return res.status(500).send("Failed to access Github API.")
        const userAccessToken = new URLSearchParams(tokenExchange.data).get("access_token")

        // Get user account information
        const info = await request(
            "GET", "https://api.github.com/user", {
                Authorization: `token ${userAccessToken}`,
                "User-Agent": "request"
            }
        )
        if (info.status !== 200) return res.status(401).send("Failed to get user data")
        const user = JSON.parse(info.data)

        // Invite user to the organization using PAT
        const invite = await request(
            "POST", "https://api.github.com/orgs/Testausserveri/invitations", {
                Authorization: `token ${process.env.GH_PAT}`,
                "User-Agent": "request"
            }, JSON.stringify({ invitee_id: user.id })
        )
        console.debug("CREATING INVITE", invite)
        if (invite.status !== 200) {
            if (JSON.parse(invite.data)?.errors[0]?.message === "Invitee is already a part of this org") return res.status(400).send("You are already part of the org :)")
            return res.status(500).send("Failed to create invite.")
        }

        // Accept invitation on behalf of user
        const acceptParams = new URLSearchParams()
        acceptParams.append("accept", "application/vnd.github.v3+json")
        acceptParams.append("state", "active")
        const accept = await request(
            "PATCH", "https://api.github.com/user/memberships/orgs/Testausserveri", {
                Authorization: `token ${userAccessToken}`,
                "User-Agent": "request"
            }, acceptParams.toString()
        )
        if (accept.status !== 200) return res.status(500).send("Failed to process invite.")

        // Publicize membership
        const publicize = await request(
            "PUT", `https://api.github.com/orgs/Testausserveri/public_members/${user.login}`, {
                Authorization: `token ${new URLSearchParams(tokenExchange.data).get("access_token")}`,
                "User-Agent": "request"
            }, acceptParams.toString()
        )
        if (publicize.status !== 200) return res.status(500).send("Failed to make membership public. (Though your invitation was processed)")
        return res.redirect("https://testausserveri.fi?joinedGithub")
    }

    return next()
}
