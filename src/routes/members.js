/* eslint-disable import/first */
// This is Eemil's membersArea backend, which is not yet in use.
process.exit(1)
//
/*
also the packages:
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
*/

import { randomBytes } from "crypto"
import { Router, json } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
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

router.get("/", cookieParser(), async (req, res) => {
    // Check authentication
    const session = await database.UserInfo.getWithSessionCode(req.cookies?.code)
    if (!session || !session.membersPageSession || !session.membersPageSession.timestamp) return res.status(400).send("Permission denied.")
    if (session.membersPageSession.timestamp + sessionExpiry < new Date().getTime()) {
        return res.status(307).setHeader("Location", "https://testausserveri.fi?relog=1").end()
    }

    // Session is valid
    return res.status(200).send(`Wow! You found the members page :O You seem to be logged in as ${session.associationMembership.googleWorkspaceName}`)
})

router.options("/login", cors({
    allowedHeaders: ["Content-Type"]
}))

router.post(
    "/login", cors({
        allowedHeaders: ["Content-Type"]
    }), json(), async (req, res) => {
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

            if (accountDetails.platform.id === "2db260c7-8ca9-42a3-8de8-a6a3c37be89e") {
                // Logged in with Discord. Resolve Discord userID to email
                username = await database.UserInfo.resolveDiscordId(accountDetails.id)
            } else if (accountDetails.platform.id === "fffe466b-f00a-4928-85e0-6b229bc368fe") {
                // Logged in with Members login
                if (!accountDetails?.contact?.email) return res.status(400).send("Unable to access account email address.")
                if (!accountDetails.contact.email.endsWith("@testausserveri.fi")) return res.status(401).send("Permission denied.");
                [username] = accountDetails.contact.email.split("@")
            }

            if (!username) return res.status(401).send("No such user")

            // Do we have ongoing sessions
            const membersPageSession = await database.UserInfo.getMembersPageSession(username)
            let code = membersPageSession?.code
            if (!code || (membersPageSession?.timestamp ?? 0) + sessionExpiry < new Date().getTime()) {
                // We have a expired token, create a new one
                code = generateRandomString(32)
                await database.UserInfo.setMembersPageSession(username, code, new Date().getTime() + sessionExpiry)
            }

            // Return session token
            res.setHeader("Content-Type", "text/plain")
            return res.status(200).send(code)
        } catch (e) {
            console.error("Failed to authenticate member", e)
            return res.status(500).send("Internal server error.")
        }
    }
)

export default router
