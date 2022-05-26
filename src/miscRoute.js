import express, { Router } from "express"

// eslint-disable-next-line new-cap
const router = Router()

router.use("/media", (req, res, next) => {
    res.setHeader("Content-Type", "image/webp")
    res.setHeader("Cache-Control", "public, max-age=86400")
    next()
}, express.static("media"))

export default router
