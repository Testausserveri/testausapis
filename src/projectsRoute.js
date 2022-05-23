// to-do: implement cache

import express from "express"
import database from "./database/database.js"

const router = express.Router()

router.get("/", async (req, res) => {
    const results = await database.Projects
        .find()
        .populate("members", "nickname username")
        .populate("tags", "name")

    // Rearrange data to make it the most effective for a HTTP response
    const data = results.map(result => ({
        _id: result._id,
        description: result.description.short,
        members: result.members.map(({_id, nickname, username}) => ({
            _id,
            name: nickname || username
        })),
        tags: result.tags.map(tag => tag.name),
        media: (() => {
            const {type, filename} = result.media.find(item => item.cover)
            return {type, filename}
        })(),
        name: result.name,
        slug: result.slug
    }))

    res.json(data)
})

export default router
