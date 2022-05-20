/* eslint-disable func-names */
import { Schema } from "mongoose"

const cache = {
    messageCounts: {},
    dataCollectionPolicies: {}
}

const SchemaDataCollectionConfiguration = new Schema({
    allowed: Array,
    id: String
})

/**
 * Update data collection policy allowed list
 * @param {"add" | "remove"} mode Add or remove from allowed list
 * @param {string} serverId Server id
 * @param {string} userId user id
 */
SchemaDataCollectionConfiguration.statics.updateDataCollectionPolicy = async function (mode, serverId, userId) {
    const config = await this.findOne({ id: serverId })
    const template = {
        id: serverId,
        allowed: config?.allowed ?? []
    }
    if (mode === "remove") template.allowed.splice(template.allowed.indexOf(userId), 1)
    else if (mode === "add") template.allowed.push(userId)
    cache.dataCollectionPolicies[serverId] = template
    return this.findOneAndUpdate({ id: serverId }, template, { upsert: true })
}

/**
 * Get server's data collection config
 * @param {string} id The server Id
 */
SchemaDataCollectionConfiguration.statics.getDataCollectionConfig = async function (id) {
    return cache.dataCollectionPolicies[id] ?? this.findOne({ id }).exec()
}

export default SchemaDataCollectionConfiguration
