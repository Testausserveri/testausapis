/* eslint-disable func-names */
import mongoose from "mongoose"
const { Schema } = mongoose

const SchemaUserInfo = new Schema({
    id: {
        unique: true,
        sparse: true,
        type: String
    },
    bio: String, // self-written bio
    connectedAccounts: Array,
    username: String, // discord username
    nickname: String, // discord member nickname
    associationMembership: {
        firstName: String, 
        lastName: String,
        city: String,
        googleWorkspaceName: String,
        email: {
            unique: true,
            sparse: true,
            type: String
        },
        handledIn: String,
        status: {
            type: String,
            enum : [null, 'RECEIVED','MEMBER','PAST','REJECTED'],
            default: null
        },
    },
    internalNotices: String,
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

SchemaUserInfo.statics.autoComplete = async function (search) {
    return this.find({$or: [
        {username: new RegExp(`${search}`, "i")},
        {nickname: new RegExp(`${search}`, "i")}
    ]}).limit(10)
}
export default SchemaUserInfo
