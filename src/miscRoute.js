import express from "express"

const router = express.Router()

router.use("/media", (req, res, next) => {
    res.setHeader("Content-Type", "image/*")
    res.setHeader("Cache-Control", "public, max-age=86400")
    next()
}, express.static('media'))

export default router
