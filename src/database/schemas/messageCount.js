import mongoose from "mongoose"

const { Schema } = mongoose

const cache = {
    messageCounts: {},
    dataCollectionPolicies: {}
}

const SchemaMessageCount = new Schema({
    count: Number,
    id: String,
    date: String
})

/**
 * Update a server message count
 * Does upsert if required
 * @param {string} id The server id
 */
SchemaMessageCount.statics.incrementMessageCount = async function (id) {
    const template = {
        count: 0,
        id,
        date: new Date().toDateString()
    }
    const server = await this.findOne({ id }).exec()
    if (server !== null) {
        // The count exists
        if (server.date !== new Date().toDateString()) {
            template.count = 0
        } else template.count = (typeof server.count === "number" ? server.count : 0) + 1
    }
    cache.messageCounts[id] = { timestamp: new Date().getTime(), count: template.count }
    await this.findOneAndUpdate({ id }, template, { upsert: true })
}

/**
 * Get server's daily message count, cache of 3 seconds
 * @param {string} id
 * @returns {Promise<null|Number>}
 */
SchemaMessageCount.statics.getMessageCount = async function (id) {
    if (cache.messageCounts[id] && cache.messageCounts[id].timestamp + 3000 > new Date().getTime()) return cache.messageCounts[id].count
    const template = {
        count: 0,
        id,
        date: new Date().toDateString()
    }
    const server = await this.findOne({ id }).exec()
    if (server !== null) {
        // The count exists
        if (server.date !== new Date().toDateString()) {
            template.count = 0
            await this.findOneAndUpdate({ id }, template, { upsert: true })
        }
    }
    cache.messageCounts[id] = { timestamp: new Date().getTime(), count: server?.count }
    return server?.count
}

export default SchemaMessageCount
