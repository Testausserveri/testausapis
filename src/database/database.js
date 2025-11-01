/* eslint-disable function-paren-newline */
import mongoose from "mongoose"
import SchemaDataCollectionConfiguration from "./schemas/dataCollectionConfiguration.js"
import SchemaMessageCount from "./schemas/messageCount.js"
import SchemaProjects from "./schemas/projects.js"
import SchemaUserInfo from "./schemas/userInfo.js"
import SchemaTag from "./schemas/tag.js"
import SchemaBankTransaction from "./schemas/bankTransaction.js"
import SchemaBankBalance from "./schemas/bankBalance.js"
import SchemaBankPublicWhitelist from "./schemas/bankPublicWhitelist.js"

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
    ),
    SchemaTag: model(
        "Tag",
        SchemaTag
    )
    ,
    BankTransaction: model(
        "BankTransaction",
        SchemaBankTransaction
    ),
    BankBalance: model(
        "BankBalance",
        SchemaBankBalance
    ),
    BankPublicWhitelist: model(
        "BankPublicWhitelist",
        SchemaBankPublicWhitelist
    )
}

export default { ...models, init, connection }
