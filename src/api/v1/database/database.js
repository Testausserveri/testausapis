/* eslint-disable function-paren-newline */

import { connect, connection, model } from "mongoose"

import SchemaDataCollectionConfiguration from "./schemas/dataCollectionConfiguration"
import SchemaMessageCount from "./schemas/messageCount"
import SchemaProjects from "./schemas/projects"
import SchemaUserInfo from "./schemas/userInfo"

/**
 * Initialize a database connection
 * @returns {mongoose.Connection}
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
