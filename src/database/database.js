/* eslint-disable function-paren-newline */
import mongoose from "mongoose"
import SchemaDataCollectionConfiguration from "./schemas/dataCollectionConfiguration.js"
import SchemaMessageCount from "./schemas/messageCount.js"
import SchemaProjects from "./schemas/projects.js"
import SchemaUserInfo from "./schemas/userInfo.js"

const { connect, connection, model } = mongoose

/**
 * Initialize a database connection
 * @returns {import("mongoose").Connection}
 */
async function init() {
    return connect(process.env.TEST_CLUSTER ?? `mongodb://${process.env.MONGODB_HOST || "testausapis_mongo"}:27017/main`)
}

const models = {
    DataCollectionConfiguration: model(
        "DataCollectionConfiguration",
        SchemaDataCollectionConfiguration
    ),
    MessageCount: model(
        "MessageCount",
        SchemaMessageCount
    ),
    Projects: model(
        "Projects",
        SchemaProjects
    ),
    UserInfo: model(
        "UserInfo",
        SchemaUserInfo
    )
}

export default { ...models, init, connection }
