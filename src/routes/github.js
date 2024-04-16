import { Router } from "express"
import request from "../utils/request.js"
import getQuery from "../utils/getQuery.js"

const address = process.env.HTTP_URL
const githubCallback = `${address}/v1/github/authorized`

// eslint-disable-next-line new-cap
const router = Router()

router.get("/authorize", (req, res) => {
    res.redirect(`https://github.com/login/oauth/authorize?client_id=${process.env.GH_CLIENT_ID}&redirect_uri=${githubCallback}&scope=write:org`)
})

router.get("/authorized", async (req, res) => {
    // Fetch the access token
    const code = await getQuery("code", req.url)
    if (!code) return res.status(500).send("GitHub authorization failed, please contact administrator.")
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
    const info = await request("GET", "https://api.github.com/user", {
        Authorization: `token ${userAccessToken}`,
        "User-Agent": "request"
    })
    if (info.status !== 200) return res.status(401).send("Failed to get user data")
    const user = JSON.parse(info.data)

    // Invite user to the organization using PAT
    const invite = await request(
        "POST", `https://api.github.com/orgs/${process.env.GH_NAME}/invitations`, {
            Authorization: `token ${process.env.GH_PAT}`,
            "User-Agent": "request"
        }, JSON.stringify({ invitee_id: user.id })
    )
    if (invite.status > 299) {
        if (JSON.parse(invite.data)?.errors[0]?.message === "Invitee is already a part of this org") return res.redirect(`https://github.com/${process.env.GH_NAME}`)
        return res.status(500).send("Failed to create invite.")
    }

    const acceptBody = JSON.stringify({
        accept: "application/vnd.github.v3+json",
        state: "active"
    })
    // Accept invitation on behalf of user
    const accept = await request(
        "PATCH",
        `https://api.github.com/user/memberships/orgs/${process.env.GH_NAME}`,
        {
            Authorization: `token ${userAccessToken}`,
            "User-Agent": "request"
        },
        acceptBody
    )

    if (accept.status > 299) return res.status(500).send("Failed to process invite.")

    // Publicize membership
    const publicize = await request("PUT",
        `https://api.github.com/orgs/${process.env.GH_NAME}/public_members/${user.login}`,
        {
            Authorization: `token ${new URLSearchParams(tokenExchange.data).get("access_token")}`,
            "User-Agent": "request"
        })

    if (publicize.status > 299) return res.status(500).send("Failed to make membership public. (Though your invitation was processed)")

    request(
        "POST",
        process.env.DISCORD_WEBHOOK,
        {
            "Content-Type": "application/json"
        },
        JSON.stringify({
            content: `${user.login} liittyi Testausserverin GitHub organisaatioon! 🎉 Liity sinäkin: <${process.env.GH_JOIN_URL}>`
        })
    )

    return res.redirect("https://github.com/testausserveri")
})

export default router
