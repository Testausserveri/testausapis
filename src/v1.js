const { Request, Response, NextFunction } = require("express")
const getQuery = require("./getQuery")
const request = require("./request")

/**
 * Express method
 * @param {Request} req 
 * @param {Response} res 
 * @param {NextFunction} next 
 */
module.exports = async (req, res, next, utils) => {
    // GuildInfo
    if(req.method === "GET" && req.path === "/v1/guildInfo"){
        const messagesToday = await utils.getMessageCount()
        const memberCount = await utils.getMemberCount()
        return res.json({
            memberCount: memberCount ?? "N/A",
            messagesToday: messagesToday?.count ?? "N/A"
        })
    }

    // MemberInfo
    if(req.method === "GET" && req.path === "/v1/roleInfo"){
        if(!req.query.id) return res.status(400).send("Please specify a role id in the query.")
        const role = await utils.getRoleData(req.query.id)
        if(role === false) return res.status(401).send("Private role data.")
        return res.json(role)
    }

    // TODO: Move stuff to env

    // Authorize Discord link
    if(req.method === "GET" && req.path === "/v1/authorize_discord_data"){
        return res.redirect("https://discord.com/api/oauth2/authorize?client_id=917512133535748126&response_type=code&scope=identify%20connections&redirect_uri=" + global.discordRedirectURI)
    }

    // Consent to Discord data publishing
    if(req.method === "GET" && req.path === "/v1/consent_discord_data"){
        // Authorization consent screen & auth code
        const code = getQuery("code", req.url)
        if(!code) return res.status(400).send("Missing code from request query.")
        // Get token
        const params = new URLSearchParams()
        params.append("client_id", "917512133535748126")
        params.append("client_secret", process.env.DISCORD_SECRET),
        params.append("grant_type", "authorization_code")
        params.append("code", code)
        params.append("redirect_uri", global.discordRedirectURI)
        const token_exchange = await request("POST", "https://discord.com/api/v8/oauth2/token", { 
            "Content-Type": "application/x-www-form-urlencoded" 
        }, params.toString())
        if(token_exchange.status === 200){
            const token = JSON.parse(token_exchange.data).access_token
            const info = await request("GET", "https://discord.com/api/v9/oauth2/@me", {
                "Authorization": "Bearer " + token
            })
            if(info.status === 200){
                const user = JSON.parse(info.data).user
                const connections = await request("GET", "https://discord.com/api/v8/users/@me/connections", {
                    "Authorization": "Bearer " + token
                })
                if(connections.status === 200){
                    // Got the profile data!
                    global.temporaryDiscordAccessTokens[user.id] = token
                    const connected_accounts = JSON.parse(connections.data).filter(account => account.visibility === 1)
                    await utils.setUserInfo(user.id, null, connected_accounts)
                    res.status(200).send("Profile updated.")
                }else {
                    res.status(401).send("Failed to get profile data.")
                }
            }else {
                res.status(401).send("Failed to get user data.")
            }
        }else {
            res.status(500).send("Failed to access Discord API.")
        }
        return
    }

    // Join Github
    if(req.method === "GET" && req.path === "/v1/authorize_github"){
        return res.redirect("https://github.com/login/oauth/authorize?client_id=" + process.env.GH_CLIENT_ID + "&redirect_uri=" + process.env.GH + "&scope=write:org")
    }

    // Github join callback
    if(req.method === "GET" && req.path === "/v1/join_github"){
        // TODO
    }
    next()
}