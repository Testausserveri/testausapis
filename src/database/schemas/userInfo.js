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
            enum: [null, "RECEIVED", "MEMBER", "PAST", "REJECTED"],
            default: null
        }
    },
    membersPageSession: {
        code: {
            unique: true,
            sparse: true,
            type: String
        },
        timestamp: Number
    },
    internalNotices: String
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
    return this.find({
        $or: [
            { username: new RegExp(`${search}`, "i") },
            { nickname: new RegExp(`${search}`, "i") }
        ]
    }).limit(10)
}

SchemaUserInfo.membersPageSession.resolveDiscordId = async function (id) {
    return (await this.findOne({ id }).exec())?.associationMembership?.googleWorkspaceName
}

SchemaUserInfo.membersPageSession.getWithCode = async function (code) {
    return (await this.findOne({ membersPageSession: { code } }).exec())?.membersPageSession
}

SchemaUserInfo.membersPageSession.get = async function (googleWorkspaceName) {
    return (await this.findOne({ associationMembership: { googleWorkspaceName } }).exec())?.membersPageSession
}

SchemaUserInfo.membersPageSession.set = async function (googleWorkspaceName, code, timestamp) {
    return this.findOneAndUpdate({ associationMembership: { googleWorkspaceName } }, {
        membersPageSession: {
            code,
            timestamp
        }
    }, { upsert: true }).exec()
}

export default SchemaUserInfo
