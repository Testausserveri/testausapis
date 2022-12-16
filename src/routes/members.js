import { randomBytes } from "crypto"
import { Router, json } from "express"
import database from "../database/database.js"
import request from "../utils/request.js"

const sessionExpiry = 5 * 60 * 1000

/**
 * Generate a random hex string
 * @param {number} size
 * @returns {string}
 */
function generateRandomString(size) {
    return randomBytes(size).toString("hex")
}

// eslint-disable-next-line new-cap
const router = Router()

router.get("/", async (req, res) => {
    // Check authentication
    const session = await database.membersPageSession.getWithCode(req.cookies.code)
    // TODO: Redirect to login
    if (!session || !session.timestamp || !session.timestamp + sessionExpiry < new Date().getTime()) return res.status(400).send("Permission denied.")

    // Session is valid
    return res.status(200).send("Wow! You found the members page :O I am as surprised as you are, because I thought these didn't exist yet :p")
})

router.post("/login", json(), async (req, res) => {
    // Verify access token exists and is valid
    if (typeof req.body.token !== "string" || req.body.length < 1) return res.status(400).send("Missing or invalid token.")

    // Attempt to request the account info
    const token = req.body.token.toString()
    const accountDetailsRequest = await request(
        // TODO: Make url configurable
        "GET", "https://id.testausserveri.fi/api/v1/me", {
            Authorization: `Bearer ${token}`
        })
    if (accountDetailsRequest.status !== 200) return res.status(401).send("Expired or invalid token.")

    // Make sure the correct method of login was used
    try {
        const accountDetails = JSON.parse(accountDetailsRequest.data)

        let username = ""

        if (accountDetails?.platform.id === "2db260c7-8ca9-42a3-8de8-a6a3c37be89e") {
            // Logged in with Discord. Resolve Discord userID to email
            username = await database.membersPageSession.resolveDiscordId()
        } else if (accountDetails?.platform?.id === "fffe466b-f00a-4928-85e0-6b229bc368fe") {
            // Logged in with Members login
            if (accountDetails?.contact?.email === null) return res.status(400).send("Unable to access account email address.")
            if (!accountDetails.contact.email.endsWith("@testausserveri.fi")) return res.status(401).send("Permission denied.");
            [username] = accountDetails.contact.email.split("@")
        }

        // Do we have ongoing sessions
        const membersPageSession = await database.membersPageSession.get(username)
        let { code } = membersPageSession
        if (membersPageSession.timestamp + sessionExpiry < new Date().getTime()) {
            // We have a valid token, create a new one
            code = generateRandomString(32)
            await database.membersPageSession.set(username, code, new Date().getTime() + sessionExpiry)
        }

        // Return session token
        res.setHeader("Set-Cookie", `code=${code}`)
        res.setHeader("Content-Type", "text/html")
        res.setHeader("Location", "/v1/members/")
        return res.status(200).send(`
            <header>
                <title>Redirecting...</title>
            </header>
            <body>
                If you are not redirected, click <a href="/v1/members/">here</a>.
                <br>
                <i>(/v1/members/)</i>
            </body>
        `)
    } catch (e) {
        console.error("Failed to authenticate member", e)
        return res.status(500).send("Internal server error.")
    }
})

export default router
