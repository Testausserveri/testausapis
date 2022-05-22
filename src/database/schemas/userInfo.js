/* eslint-disable func-names */
import mongoose from "mongoose"
const { Schema } = mongoose

const SchemaUserInfo = new Schema({
    id: String,
    bio: String,
    connectedAccounts: Array
})

/**
 * Update user's info in the database
 * @param {string} id User id
 * @param {string} bio The user bio
 * @param {string} connectedAccounts Connected accounts
 */
SchemaUserInfo.statics.setUserInfo = async function (id, bio, connectedAccounts) {
    const template = {
        id,
        bio,
        connectedAccounts
    }
    const initial = await this.findOne({ id }).exec()
    if (template.bio === undefined) template.bio = initial?.bio
    if (template.connectedAccounts === undefined) template.connectedAccounts = initial?.connectedAccounts
    return this.findOneAndUpdate({ id }, template, { upsert: true }).exec()
}

/**
 * Remove user's info from the database
 * @param {string} id User id
 */
SchemaUserInfo.statics.removeUserInfo = async function (id) {
    return this.findOneAndDelete({ id }).exec()
}

/**
 * Get user's info from the database
 * @param {string} id User id
 */
SchemaUserInfo.statics.getUserInfo = async function (id) {
    return this.findOne({ id }).exec()
}

export default SchemaUserInfo
