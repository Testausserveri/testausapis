import { Router, json } from "express"
import request from "../utils/request.js"

// eslint-disable-next-line new-cap
const router = Router()

router.post("/login", json(), async (req, res) => {
    // Verify access token exists and is valid
    console.log(req.body)
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
        if (
            accountDetails?.platform?.id === "fffe466b-f00a-4928-85e0-6b229bc368fe" && // Platform id for "members" method
            accountDetails?.contact?.email.endsWith("@testausserveri.fi") // Only for root domain accounts
        ) {
            // TODO: Member site response
            // TODO: Create member specific session id
            return res.status(200).send("Wow cool! You are a member! Enjoy your time in this extremely exclusive website made just for you :p")
        }

        // Missing permissions to access the member pages
        return res.status(401).send("Permission denied.")
    } catch (e) {
        console.error("Failed to authenticate member", e)
        return res.status(500).send("Internal server error.")
    }
})

export default router
