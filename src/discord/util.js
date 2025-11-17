import { EventEmitter } from "events"

const roleCache = {}

/**
 * Discord utility class
 */

class DiscordUtility extends EventEmitter {
    /**
     * @param {import("../database/database")} database
     * @param {import("discord.js").Client} client
     */
    constructor(database, client) {
        super()
        this.client = client
        this.database = database
        this.ready = false // Is the Discord client ready?
    }

    /**
     * Get the member count of a Discord server
     * @param {string} id The server id
     * @returns {Promise<string | null>}
     */
    async getMemberCount(id) {
        return (await this.client.guilds.fetch(id))?.memberCount
    }

    /**
     * Get the number of members online in a Discord server
     * @param {string} id
     * @returns {Promise<string | null>}
     */
    async getOnlineCount(id) {
        const guild = await this.client.guilds.fetch(id)
        const presences = guild.members.cache.filter((member) => member.presence?.status !== undefined).size;
        return presences;
    }

    /**
     * Get server boost status information in a Discord server
     * @param {string} id
     * @param {string[]} fetchOnlyThese Only fetch these members
     * @returns {Promise<{ subscriptions: number, tier: number } | null>}
     */
    async getBoostStatus(id, fetchOnlyThese) {
        const guild = await this.client.guilds.fetch(id)
        return guild !== null ? {
            subscriptions: guild.premiumSubscriptionCount ?? 0,
            tier: (() => {
                const rawTier = guild.premiumTier
                if (typeof rawTier === "number") return rawTier
                if (typeof rawTier === "string") {
                    const match = rawTier.match(/TIER_(\d+)/)
                    return match ? parseInt(match[1], 10) : 0
                }
                return 0
            })(),
            subscribers: (await guild.members.fetch())
                .filter((member) => member.premiumSince !== null)
                .map((member) => (!fetchOnlyThese.includes(member.id) ?
                    ({
                        id: null, name: null, avatar: null, isHidden: true
                    }) :
                    ({
                        id: member.id, name: member.nickname ?? member.displayName, avatar: member.user.displayAvatarURL({ dynamic: true }), isHidden: false
                    })))
        } : null
    }

    /**
     * Update the cache for a specific role
     * @param {import("discord.js").Role} role
     * @param {string[]} fetchOnlyThese
     * @returns {import("./discord").RoleData}
     */
    async updateRoleCache(role, fetchOnlyThese) {
        // Fetch members and build cache
        let roleMembersToProcess = role.members
        if (fetchOnlyThese) roleMembersToProcess = roleMembersToProcess.filter((member) => fetchOnlyThese.includes(member.id))
        for await (const member of roleMembersToProcess) await member[1].user.fetch() // Fetch all members
        const extraMemberData = {}
        for await (const member of roleMembersToProcess) extraMemberData[member[0]] = (await this.database.UserInfo.getUserInfo(member[0]))
        if (global.discordDetectable === undefined) throw new Error("Discord detectable list is still empty.")
        return {
            name: role.name,
            id: role.id,
            color: role.hexColor,
            members: roleMembersToProcess.map((member) => ({
                name: member.user.username,
                displayName: member.displayName,
                discriminator: member.user.discriminator,
                id: member.user.id,
                presence: member.presence ? member.presence.activities.map((activity) => (
                    global.discordDetectable[activity.applicationId] ? {
                        type: "PLAYING",
                        id: activity.applicationId,
                        emoji: null,
                        name: activity.name,
                        details: global.discordDetectable[activity.applicationId].authors[0],
                        state: global.discordDetectable[activity.applicationId].authors.length > 2 ?
                            // If
                            `${global.discordDetectable[activity.applicationId].authors[1]}...` :
                            // Else
                            (global.discordDetectable[activity.applicationId].authors[1] ?? null),
                        assets: {
                            largeImage: global.discordDetectable[activity.applicationId].iconUrl,
                            largeImageText: activity.name,
                            smallImage: null,
                            smallImageText: null
                        }
                    } : {
                        type: activity.type,
                        id: activity.applicationId,
                        emoji: activity.emoji ? ({
                            animated: activity.emoji.animated,
                            name: activity.emoji.name,
                            url: activity.emoji.imageURL()
                        }) : null,
                        name: activity.name,
                        details: activity.details,
                        state: activity.state,
                        assets: activity.assets ? ({
                            largeImage: activity.assets.largeImageURL(),
                            largeImageText: activity.assets.largeText,
                            smallImage: activity.assets.smallImageURL(),
                            smallImageText: activity.assets.smallText
                        }) : {}
                    }
                )) : [],
                avatar: member.user.displayAvatarURL({ dynamic: true }),
                banner: member.user.bannerURL({ dynamic: true }),
                color: member.user.hexAccentColor,
                flags: member.user.flags.toArray(),
                connectedAccounts: extraMemberData[member.user.id]?.connectedAccounts ? extraMemberData[member.user.id]?.connectedAccounts.map((account) => ({
                    type: account.type,
                    name: account.name,
                    id: account.id,
                    visible: account.visibility === 1
                })) : [],
                bio: extraMemberData[member.user.id]?.bio
            })),
            count: role.members.size,
            timestamp: new Date().getTime()
        }
    }

    /**
     * Get user info by id
     * @param {string} userId
     * @returns {Promise<import("discord.js").User>}
     */
    getUserById(userId) {
        return this.client.users.fetch(userId, { cache: true })
    }

    /**
     * Get relevant analytics data for a specific role
     * @param {string} serverId The server id
     * @param {string} roleId The role id
     * @param {string[]} fetchOnlyThese Fetch only these members
     * @returns {import("./discord").RoleData}
     */
    async getRoleData(serverId, roleId, fetchOnlyThese) {
        const role = await (await this.client.guilds.fetch(serverId)).roles.fetch(roleId)
        if (role === null) return null
        let response
        if (roleCache[role.id] === undefined) {
            // Create the cache
            this.updateRoleCache(role, fetchOnlyThese).then((data) => {
                roleCache[role.id] = {
                    expiry: new Date().getTime() + 5000,
                    data,
                    updating: false
                }
            })
            await new Promise((resolve) => {
                setTimeout(() => {
                    resolve()
                }, 5000) // The maximum time we will wait for the cache to be created
            })
            response = roleCache[role.id]?.data ?? null
        } else if (roleCache[role.id].expiry < new Date().getTime()) {
            // Expired cache, update the cache
            response = roleCache[role.id].data
            response.cache = "expired"
            if (!roleCache[role.id].updating) {
                roleCache[role.id].updating = true
                this.updateRoleCache(role, fetchOnlyThese).then((data) => {
                    roleCache[role.id] = {
                        expiry: new Date().getTime() + 5000,
                        data,
                        updating: false
                    }
                })
            } else {
                response.cache = "expired-updating"
            }
        } else {
            // Valid cache
            response = roleCache[role.id].data
            response.cache = "valid"
        }
        return response
    }
}

export default DiscordUtility
