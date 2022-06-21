// to-do: implement cache

import express from "express"
import database from "../database/database.js"
import github from "../utils/github.js"

const router = express.Router()

router.get("/", async (req, res) => {
    let task = database.Projects.find()
        .populate("members", "nickname username associationMembership.firstName associationMembership.lastName")
        .populate("tags", "name")

    // Technically, S and P in "Suggested Projects" stand for:
    // S - Summanmutikka = Random
    // P - Projects
    if (req.query.suggested) task = task.skip(Math.random() * database.Projects.estimatedDocumentCount()).limit(3)

    const results = await task

    if (req.query.suggested) results.sort(() => 0.5 - Math.random())

    // Rearrange data to make it the most effective for a HTTP response
    const data = results.map((result) => ({
        _id: result._id,
        description: result.description.short,
        members: result.members.map(({
            _id, associationMembership, nickname, username
        }) => ({
            _id,
            name: associationMembership?.lastName ?
                `${associationMembership.firstName} ${associationMembership.lastName[0]}.` :
                (nickname || username)
        })),
        tags: result.tags.map((tag) => tag.name),
        media: (() => {
            const { type, filename } = result.media.find((item) => item.cover)
            return { type, filename }
        })(),
        name: result.name,
        slug: result.slug
    }))

    res.json(data)
})

router.get("/:slug", async (req, res) => {
    const { slug } = req.params
    const result = await database.Projects
        .findOne({ slug }, "-_id -links._id -media._id")
        .populate("members", "nickname username associationMembership.firstName associationMembership.lastName")
        .populate("tags", "name")

    const githubLinks = result.links.filter((item) => item.type === "github").map((item) => item.url)
    let githubData = {}

    if (githubLinks.length > 0) {
        const contributors = await github.getContributors(githubLinks)
        const repositories = await github.getRepositories(githubLinks)
        const readmes = await github.getReadmes(repositories)

        githubData = {
            contributors,
            readmes
        }
    }

    const data = {
        _id: result._id,
        description: result.description,
        members: result.members.map(({
            _id, associationMembership, nickname, username
        }) => ({
            _id,
            name: associationMembership?.lastName ?
                `${associationMembership.firstName} ${associationMembership.lastName[0]}.` :
                (nickname || username)
        })),
        tags: result.tags.map((tag) => tag.name),
        media: result.media,
        links: result.links,
        name: result.name,
        slug: result.slug,
        ...(githubLinks.length > 0 ? githubData : null)
    }

    res.json(data)
})

export default router
