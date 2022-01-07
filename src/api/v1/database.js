const { connect } = require("mongoose")

const schemas = require("./schemas")

// Database functions

/**
 * Update a server message count
 * Does upsert if required
 * @param {String} id The server id
 */
async function incrementMessageCount(id) {
    const template = {
        count: 0,
        id,
        date: new Date().toDateString()
    }
    const server = await schemas.MessageCountModel.findOne({ id }).exec()
    if (server !== null) {
        // The count exists
        if (server.date !== new Date().toDateString()) {
            template.count = 0
        } else template.count = (typeof server.count === "number" ? server.count : 0) + 1
    }
    await schemas.MessageCountModel.findOneAndUpdate({ id }, template, { upsert: true })
    return
}

/**
 * Get server's daily message count
 * @param {String} id
 * @returns {Promise<null|Number>}
 */
async function getMessageCount(id) {
    const template = {
        count: 0,
        id,
        date: new Date().toDateString()
    }
    const server = await schemas.MessageCountModel.findOne({ id }).exec()
    if (server !== null) {
        // The count exists
        if (server.date !== new Date().toDateString()) {
            template.count = 0
            await schemas.MessageCountModel.findOneAndUpdate({ id }, template, { upsert: true })
        }
    }
    return server?.count
}

/**
 * Update data collection policy allowed list
 * @param {"add"|"remove"} mode Add or remove from allowed list
 * @param {String} serverId Server id
 * @param {String} userId user id
 */
async function updateDataCollectionPolicy(mode, serverId, userId) {
    const config = await schemas.DataCollectionConfigurationModel.findOne({ id: serverId })
    if (config !== null) {
        if (mode === "remove") config.allowed.splice(config.allowed.indexOf(userId), 1)
        else if (mode === "add") config.allowed.push(userId)
    }
}

/**
 * Get server's data collection config
 * @param {String} id The server Id
 */
async function getDataCollectionConfig(id) {
    return schemas.DataCollectionConfigurationModel.findOne({ id }).exec()
}

/**
 * Update user's info in the database
 * @param {String} id User id
 * @param {String} bio The user bio
 * @param {String} connectedAccounts Connected accounts
 */
async function setUserInfo(id, bio, connectedAccounts) {
    const template = {
        id,
        bio,
        connectedAccounts
    }
    const initial = await schemas.UserInfoModel.findOne({ id }).exec()
    if (template.bio === undefined) template.bio = initial?.bio
    if (template.connectedAccounts === undefined) template.connectedAccounts = initial?.connectedAccounts
    return schemas.UserInfoModel.findOneAndUpdate({ id }, template, { upsert: true }).exec()
}

/**
 * Remove user's info from the database
 * @param {String} id User id
 */
async function removeUserInfo(id) {
    return schemas.UserInfoModel.findOneAndDelete({ id }).exec()
}

/**
 * Get user's info from the database
 * @param {String} id User id
 */
async function getUserInfo(id) {
    return schemas.UserInfoModel.findOne({ id }).exec()
}

/**
 * Initialize the database
 */
async function init() {
    return connect(process.env.TEST_CLUSTER ?? "mongodb://testausapis_mongo:27017/main")
}

module.exports = {
    incrementMessageCount,
    updateDataCollectionPolicy,
    getDataCollectionConfig,
    setUserInfo,
    removeUserInfo,
    getUserInfo,
    init,
    getMessageCount
}
