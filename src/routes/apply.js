import express from "express"
import axios from "axios"
import database from "../database/database.js"

const router = express.Router()

router.get("/authorized", async (req, res) => {
    res.setHeader("Content-Type", "text/html")
    try {
        function answerToOpener(data) {
            res.end("<script>parent.opener.postMessage('" + JSON.stringify(data) + "', '" + process.env.COAL_APPLY_ORIGIN + "');window.close();</script>");
        }
        const code = req.query.code
        if (!code) return res.status(400).send("Missing code from request query.")
    
        // Code to token
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_SECRET,
            grant_type: "authorization_code",
            code: req.query.code,
            redirect_uri: process.env.COAL_APPLY_REDIRECT_URI,
            scope: "identify"
        })
        const response = await axios.post("https://discord.com/api/oauth2/token", params);
        const token = response.data.access_token
    
        // Get basic info
        const { data } = await axios.get("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${token}`
            }
        })
        const { id, username, avatar } = data;
    
        const out = {
            id, username, avatar, token
        }
        
        // Check if Discord member is already a member of the association
        const result = await database.UserInfo.getUserInfo(id)
        if (result?.associationMembership.status == 'MEMBER') {
            return answerToOpener({
                status: "already-member",
                since: result?.associationMembership?.acceptedAt || result?.associationMembership?.handledIn,
                ...out
            })
        }
    
        answerToOpener({
            status: "ok",
            ...out
        })
    } catch (e) {
        res.end("Tapahtui virhe. Yritä myöhemmin uudestaan.");
    }
})

router.use(express.json())

router.post("/submit", async (req, res) => {
    try {
        console.log("New assoc application ", req.body.email)

        if (!/^[A-Za-z0-9]{20,300}$/.test(req.body.discordToken)) throw "invalid token"

        // discord token -> id and username
        const { data } = await axios.get("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${req.body.discordToken}`
            }
        })
        const { id, username } = data;
        console.log("Resolved Discord username ", username)

        // extract the rest data from request
        let { firstName, lastName, city, email } = req.body;
        const fieldsMissing = firstName.trim().length == 0 || 
            lastName.trim().length == 0 || 
            city.trim().length == 0 || 
            email.trim().length == 0 ||
            !/^\S+@\S+$/.test(email);
        if (fieldsMissing) throw "fields missing"

        // check if email address already belongs to an assoc member
        // if so, swap it to a random one (so that we don't give out info whether someone is a member or not)
        const resultEmail = await database.UserInfo.findOne({ "associationMembership.email": email })
        if (resultEmail) {
            email = new Date().getTime() + '@testausapis-duplikaatti-email'
        }

        // check if Discord member is already a member of the association
        const resultDiscord = await database.UserInfo.getUserInfo(id)
        if (resultDiscord?.associationMembership.status == 'MEMBER') throw "dc already assoc member"

        // upsert application
        const doc = await database.UserInfo.findOneAndUpdate({ id }, {
            associationMembership: {
                firstName,
                lastName,
                city,
                email,
                appliedAt: new Date(),
                status: "RECEIVED"
            }
        }, { upsert: true, new: true })
        console.log(doc);

        // give http response
        res.json({status: "ok"})

        // invoke webhook
        const webhookData = {
            firstName,
            lastName,
            city,
            email,
            username,
        }
        await axios.post(process.env.APPLY_WEBHOOK, webhookData)
    } catch (e) {
        console.log(e)
        res.status(500).json({status: "error"})
    }
})

export default router
