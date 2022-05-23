import express from "express"

const router = express.Router()

router.use("/avatars", (req, res, next) => {
    res.setHeader("Content-Type", "image/*")
    res.setHeader("Cache-Control", "public, max-age=86400")
    next()
}, express.static('avatars'))

export default router
