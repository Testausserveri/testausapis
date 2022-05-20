const { connect, connection } = require("mongoose")

/**
 * Initialize the database
 */
async function init() {
    return connect(process.env.TEST_CLUSTER ?? `mongodb://${process.env.MONGODB_HOST || "testausapis_mongo"}:27017/main`)
}

module.exports = {
    incrementMessageCount,
    updateDataCollectionPolicy,
    getDataCollectionConfig,
    setUserInfo,
    removeUserInfo,
    getUserInfo,
    init,
    getMessageCount,
    connection
}
