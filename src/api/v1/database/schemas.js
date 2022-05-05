/* eslint-disable no-unused-vars */
const { model, Schema } = require("mongoose")

const MessageCountModel = model("MessageCount", new Schema({
    count: Number,
    id: String,
    date: String
}))

const DataCollectionConfigurationModel = model("DataCollectionConfiguration", new Schema({
    allowed: Array,
    id: String
}))

const UserInfoModel = model("UserInfo", new Schema({
    id: String,
    bio: String,
    connectedAccounts: Array
}))

module.exports = {
    MessageCountModel,
    DataCollectionConfigurationModel,
    UserInfoModel
}
