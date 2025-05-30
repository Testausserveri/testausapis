/* eslint-disable no-unused-vars */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-shadow */
/* eslint-disable consistent-return */
import express, { Router } from "express"
import axios from "axios"
import session from "express-session"
import MongoStore from "connect-mongo"
import database from "../database/database.js"

// eslint-disable-next-line new-cap
const router = Router()

router.use(express.json())

const expiryDate = new Date(Date.now() + 60 * 60 * 1000 * 48) // 48 h

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
        expires: expiryDate,
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

router.get("/me", async (req, res, next) => {
    try {
        if (!req.session.memberId) return next(new Error("unauthenticated"))

        const member = await database.UserInfo.findOne({
            _id: req.session.memberId
        })

        if (!member) return next(new Error("user not found from db"))

        console.log(member)

        // maybe refactor this lol
        const { associationMembership } = member

        /*
        res.json({
            username: member.username,
            _id: member._id,
            associationMembership: {
                firstName: associationMembership.firstName,
                lastName: associationMembership.lastName,
                city: associationMembership.city,
                googleWorkspaceName: associationMembership.googleWorkspaceName,
                email: associationMembership.email,
                handledIn: associationMembership.handledIn,
                status: associationMembership.status
            }
        })
        */
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
        })
    } catch (e) {
        next(e)
    }
})

router.get("/logout", async (req, res, next) => {
    try {
        req.session.destroy()
        console.log("User logged out")
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
