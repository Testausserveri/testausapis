import express, { Router } from "express"
import database from "../database/database.js"
import internalApiMiddleware from "../middleware/internalApi.js"

// eslint-disable-next-line new-cap
const router = Router()

// temporary fix until image/webp content-type force is fixed
router.use("/media/projects", express.static("media/projects"))

router.use("/media", (req, res, next) => {
    res.setHeader("Content-Type", "image/webp")
    res.setHeader("Cache-Control", "public, max-age=86400")
    next()
}, express.static("media"))

router.get("/displayName", internalApiMiddleware, async (req, res) => {
    const id = req.query.id;
    if (!id) return res.status(400).json({error: "Missing id query parameter"})
    if (!/^[a-f\d]{24}$/i.test(id)) return res.status(400).json({error: "Invalid id"})

    const member = await database.UserInfo.findOne({ _id: req.query.id }, "associationMembership.firstName associationMembership.lastName username nickname optoutPublicName")
    
    /*
    Display name is sourced from in the following order:
    1. first name & last name initial
    2. nickname
    3. username
    4. id
    */

    let displayName = id;
    let kind = 4;

    if (member?.associationMembership?.firstName && member?.associationMembership?.lastName && member?.optoutPublicName != true) {
        displayName = `${member.associationMembership.firstName} ${member.associationMembership.lastName[0]}.`
        kind = 1;
    } else if (member?.nickname) {
        displayName = member.nickname;
        kind = 2;
    } else if (member?.username) {
        displayName = member.username;
        kind = 3;
    }

    return res.json({ displayName, kind })
})

export default router
