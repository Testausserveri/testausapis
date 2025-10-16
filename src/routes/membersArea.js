/* eslint-disable */

import express, { Router } from "express"
import axios from "axios"
import session from "express-session"
import MongoStore from "connect-mongo"
import database from "../database/database.js"

// eslint-disable-next-line new-cap
const router = Router()

router.use(express.json())

const maxAge = 60 * 60 * 1000 * 48 // 48 h

const requireAuth = (req, res, next) => {
    if (!req.session.memberId) {
        return res.status(403).json({ status: "error", message: "unauthenticated" })
    }
    next()
}

router.use(session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false, // don't create session until something stored
    resave: false, // don't save session if unmodified
    unset: "destroy",
    store: MongoStore.create({
        mongoUrl: process.env.TEST_CLUSTER ?? `mongodb://${process.env.MONGODB_HOST || "testausapis_mongo"}:27017/main`
    }),
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: maxAge,
        ...(process.env.NODE_ENV !== "development" ? { domain: ".testausserveri.fi" } : {})
    }
}))

router.post("/authenticate", async (req, res, next) => {
    try {
        console.log("debug: /authenticate")
        // get oauth token
        const params = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_SECRET,
            grant_type: "authorization_code",
            code: req.body.code,
            redirect_uri: process.env.COAL_REDIRECT_URI,
            scope: "identify email"
        })
        console.log("debug: ", params)
        const response = await axios.post("https://discord.com/api/oauth2/token", params).catch((res) => {
            console.log(res, res.response, res.message)
        })

        console.log("debug: getting @me")
        // get discord user info
        const { data } = await axios.get("https://discord.com/api/users/@me", {
            headers: {
                Authorization: `Bearer ${response.data.access_token}`
            }
        })

        // find member in db or create new
        let member = await database.UserInfo.findOne({
            id: data.id // discord user id
        })
        if (!member) {
            member = await database.UserInfo.create({
                id: data.id,
                username: data.username,
                associationMembership: {
                    email: data.email
                }
            })
            console.log("Created new UserInfo record, because member was not found by Discord user id")
        }

        // save session
        // it will contain member._id (mongo object id)
        req.session.regenerate((err) => {
            if (err) return next(err)
            req.session.memberId = member._id
            req.session.discordId = data.id
            req.session.username = data.username
            req.session.discordAvatar = data.avatar
            req.session.save((err) => {
                if (err) return next(err)
                console.log("Authenticated successfully")
                res.json({ status: "ok", sid: req.sessionID })
            })
        })
    } catch (e) {
        next(e)
    }
})

router.get("/me", requireAuth, async (req, res, next) => {
    try {
        const member = await database.UserInfo.findOne({
            _id: req.session.memberId
        })

        if (!member) return next(new Error("user not found from db"))

        // Convert to plain object to ensure property access works properly
        const associationMembership = member.associationMembership.toObject ? 
            member.associationMembership.toObject() : 
            member.associationMembership
        
        // Format acceptedAt date as dd.mm.yyyy
        const formatDate = (date) => {
            if (!date) return null
            const d = new Date(date)
            const day = d.getDate().toString()
            const month = (d.getMonth() + 1).toString()
            const year = d.getFullYear()
            return `${day}.${month}.${year}`
        }
        
        res.json({  
            username: member.username,
            _id: member._id,
            discord: {
                avatar: req.session.discordAvatar,
                id: req.session.discordId
            },
            associationMembership: {
                firstName: associationMembership.firstName,
                lastName: associationMembership.lastName,
                city: associationMembership.city,
                googleWorkspaceName: associationMembership.googleWorkspaceName,
                email: associationMembership.email,
                acceptedAt: formatDate(associationMembership.acceptedAt),
                handledIn: associationMembership.handledIn,
                status: associationMembership.status
            }
        })

        /*
        res.json({
            username: member.username,
            _id: member._id,
            associationMembership: {
                firstName: `${member.username}'s firstName`,
                lastName: `${member.username}'s lastName`,
                city: `${member.username}'s city`,
                googleWorkspaceName: `${member.username}'s googleWorkspaceName`,
                email: `${member.username}'s email`,
                handledIn: associationMembership.handledIn,
                status: associationMembership.status
            }
        }) */
    } catch (e) {
        next(e)
    }
})

router.post("/apply", requireAuth, async (req, res) => {
    try {
        const id = req.session.discordId;
        const username = req.session.username;

        console.log("New assoc application ", username, req.body.email)

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
        const resultEmail = await database.UserInfo.findOne({
            "associationMembership.email": email,
            "id": { $ne: id }
        })
        if (resultEmail) {
            email = new Date().getTime() + '@testausapis-duplikaatti-email'
        }

        // check if Discord member is already a member of the association
        const resultDiscord = await database.UserInfo.getUserInfo(id)
        if (resultDiscord?.associationMembership.status == 'MEMBER') throw "dc already assoc member"

        // upsert application
        const appliedAt = new Date();
        const doc = await database.UserInfo.findOneAndUpdate({ id }, {
            associationMembership: {
                firstName,
                lastName,
                city,
                email,
                appliedAt,
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
            appliedAt
        }
        await axios.post(process.env.APPLY_WEBHOOK, webhookData)
    } catch (e) {
        console.log(e)
        res.status(500).json({status: "error"})
    }
})

router.patch("/me", requireAuth, async (req, res, next) => {
    try {
        const { city, email } = req.body;
        
        console.log("Updating member", req.session.memberId, req.body)
        
        // Validate lengths
        if (city && city.length > 50) {
            return res.status(400).json({ status: "error", message: "city too long" });
        }
        if (email && email.length > 50) {
            return res.status(400).json({ status: "error", message: "email too long" });
        }
        
        // Validate email format if provided
        if (email && !/^\S+@\S+$/.test(email)) {
            return res.status(400).json({ status: "error", message: "invalid email format" });
        }

        // Check if email is already taken by another member
        if (email) {
            const existingMember = await database.UserInfo.findOne({
                "associationMembership.email": email,
                _id: { $ne: req.session.memberId }
            });
            if (existingMember) {
                return res.status(400).json({ status: "error", message: "email already in use" });
            }
        }

        // Update the member's information
        const updateData = {};
        if (city) updateData["associationMembership.city"] = city;
        if (email) updateData["associationMembership.email"] = email;

        const member = await database.UserInfo.findOneAndUpdate(
            { _id: req.session.memberId },
            { $set: updateData },
            { new: true }
        );

        if (!member) {
            return res.status(404).json({ status: "error", message: "member not found" });
        }

        res.json({ status: "ok" });
    } catch (e) {
        next(e);
    }
});

router.get("/logout", async (req, res, next) => {
    try {
        req.session.destroy()
        console.log("User logged out")
        if (req.query.state === "opener") {
            res.setHeader("Content-Type", "text/html")
            res.end("<script>parent.opener.postMessage('logout');window.close();</script>")
            return
        }
        res.redirect("/")
    } catch (e) {
        next(e)
    }
})

router.use((
    err, req, res, next
) => {
    console.error(err.stack)
    res.status(500).send({ status: "error" })
})

export default router
