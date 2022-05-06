const {
    Intents, Client, MessageActionRow, MessageButton
} = require("discord.js")
const { EventEmitter } = require("events")
const { inspect } = require("util")
const request = require("../utils/request")

const address = process.env.DEBUGGING ? "http://localhost:8080" : "https://api.testausserveri.fi"
const discordConnectionsURL = `${address}/v1/discord/connections/authorize`

const intents = new Intents()
intents.add(
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_INTEGRATIONS
)
const client = new Client({ intents })

const slashCommands = require("./slashCommands")

const roleCache = {}

let discordDetectable = {}

/**
 * Get list of Discord's detectable games (and apps) and cache them
 * @returns {Promise<null|object>}
 */
async function updateDiscordApplicationsCache() {
    const res = await request("GET", "https://discord.com/api/v9/applications/detectable")
    if (res.status === 200) {
        const data = Object.fromEntries(JSON.parse(res.data)
            .map((application) => [
                application.id, {
                    iconUrl: application.icon ? `https://cdn.discordapp.com/app-icons/${application.id}/${application.icon}.webp` : null,
                    authors:
                    [application.developers ? application.developers.map((developer) => developer.name) : []]
                        .concat(application.publishers ? application.publishers.map((publisher) => publisher.name) : [])
                        .flat(2).filter((val, index, ar) => ar.map((name) => name.toLowerCase()).indexOf(val.toLowerCase()) === index)
                }
            ]))
        if (JSON.stringify(discordDetectable) !== JSON.stringify(data)) {
            discordDetectable = data
            console.log("Discord application cache updated.")
            return data
        }
    } else console.error("Failed to update Discord application cache", res.status)
    return null
}

updateDiscordApplicationsCache()
setInterval(() => {
    updateDiscordApplicationsCache()
}, 5 * 60000) // Update cache every 5 minutes

/**
 * @typedef {import("./database")} Database
 */

class DiscordUtility extends EventEmitter {
    constructor(database) {
        super()
        this.database = database
        this.ready = false // Is the Discord client ready?
    }

    /**
     * Get the member count of a Discord server
     * @param {string} id The server id
     * @returns {Promise<string | null>}
     */
    async getMemberCount(id) {
        return (await client.guilds.fetch(id))?.memberCount
    }

    /**
     * Get the number of members online in a Discord server
     * @param {string} id
     * @returns {Promise<string | null>}
     */
    async getOnlineCount(id) {
        return (await client.guilds.fetch(id)).approximatePresenceCount ??
                // Legacy way of getting the data, if the above fails
                (await (await client.guilds.fetch(id)).members.fetch({ withPresences: true }))
                    .filter((member) => member.user.bot === false && typeof member?.presence?.status === "string" && member?.presence?.status !== "offline").size
    }

    /**
     * Get server boost status information in a Discord server
     * @param {string} id
     * @param {string[]} fetchOnlyThese Only fetch these members
     * @returns {Promise<{ subscriptions: number, tier: number } | null>}
     */
    async getBoostStatus(id, fetchOnlyThese) {
        const guild = await client.guilds.fetch(id)
        return guild !== null ? {
            subscriptions: guild.premiumSubscriptionCount,
            tier: guild.premiumTier.includes("_") ? parseInt(guild.premiumTier.split("_")[1], 10) : 0,
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
        // eslint-disable-next-line no-restricted-syntax
        for await (const member of roleMembersToProcess) await member[1].user.fetch() // Fetch all members
        const extraMemberData = {}
        // eslint-disable-next-line no-restricted-syntax
        for await (const member of roleMembersToProcess) extraMemberData[member[0]] = (await this.database.getUserInfo(member[0]))
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
                    discordDetectable[activity.applicationId] ? {
                        type: "PLAYING",
                        id: activity.applicationId,
                        emoji: null,
                        name: activity.name,
                        details: discordDetectable[activity.applicationId].authors[0],
                        state: discordDetectable[activity.applicationId].authors.length > 2 ? `${discordDetectable[activity.applicationId].authors[1]}...` : (discordDetectable[activity.applicationId].authors[1] ?? null),
                        assets: {
                            largeImage: discordDetectable[activity.applicationId].iconUrl,
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
                            url: activity.emoji.url
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

    getUserById(userId) {
        return client.users.fetch(userId)
    }

    /**
     * Get relevant analytics data for a specific role
     * @param {string} serverId The server id
     * @param {string} roleId The role id
     * @param {string[]} fetchOnlyThese Fetch only these members
     * @returns {import("./discord").RoleData}
     */
    async getRoleData(serverId, roleId, fetchOnlyThese) {
        const role = await (await client.guilds.fetch(serverId)).roles.fetch(roleId)
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

/**
 * Initialize the Discord client
 * @param {Database} database
 * @returns {DiscordUtility}
 */
module.exports.default = (database) => {
    client.on("interactionCreate", async (interaction) => {
        if (process.env.DEBUGGING) {
            interaction.deferReply = () => {} // Do nothing
            // eslint-disable-next-line no-multi-assign
            interaction.reply = interaction.followUp = (...data) => {
                // eslint-disable-next-line no-param-reassign
                data = data.map((arg) => (typeof arg === "object" ? inspect(
                    arg, true, 99, true
                ) : arg))
                console.debug("Discord interaction response:", ...data)
            }
        }
        if (interaction.isCommand()) {
            // Handle commands
            try {
                if (interaction.commandName === "analytics") {
                    // Handle analytics commands
                    if (["allow", "deny"].includes(interaction.options.getSubcommand())) {
                        await interaction.deferReply({ ephemeral: true })
                        await database.updateDataCollectionPolicy(interaction.options.getSubcommand() === "allow" ? "add" : "remove", interaction.guild.id, interaction.member.id)
                        await interaction.followUp({
                            content: `Your data collection policy was set to \`${interaction.options.getSubcommand() === "allow" ? "Allowed" : "Denied"}\``,
                            ephemeral: true
                        })
                    } else if (interaction.options.getSubcommand() === "state") {
                        await interaction.deferReply({ ephemeral: true })
                        const state = await database.getDataCollectionConfig(interaction.guild.id)
                        await interaction.followUp({
                            content: `Your data collection setting is set to: \`${state.allowed.includes(interaction.user.id) ? "Allowed" : "Denied"}\``,
                            ephemeral: true
                        })
                    }
                } else if (interaction.commandName === "manage") {
                    // Handle profile management commands
                    if (interaction.options.getSubcommand() === "bio") {
                        await interaction.deferReply({ ephemeral: true })
                        await database.setUserInfo(interaction.user.id, interaction.options.get("text").value, undefined)
                        await interaction.followUp({
                            content: "Profile bio set!",
                            ephemeral: true
                        })
                    } else if (interaction.options.getSubcommand() === "connections") {
                        const row = new MessageActionRow()
                            .addComponents(new MessageButton()
                                .setStyle("LINK")
                                .setLabel("Login with Discord")
                                .setURL(discordConnectionsURL))
                        await interaction.reply({ content: "Authorize access to your account by logging in with your Discord account.", components: [row], ephemeral: true })
                    }
                }
            } catch (e) {
                console.error("Failed to process application command", e)
                if (interaction.replied) {
                    interaction.followUp({
                        content: "An error occurred :(",
                        ephemeral: true
                    })
                } else {
                    interaction.reply({
                        content: "An error occurred :(",
                        ephemeral: true
                    })
                }
            }
        }
    })

    client.on("messageCreate", (message) => {
        if (!message.author.bot) database.incrementMessageCount(message.guild.id)
    })

    const utilities = new DiscordUtility(database)
    client.once("ready", async () => {
        // eslint-disable-next-line no-restricted-syntax
        for await (const guild of client.guilds.cache) {
            await guild[1].commands.set(slashCommands)
        }
        utilities.emit("ready")
        utilities.ready = true
        console.log("Connected to Discord as", client.user.tag)
    })
    client.login()
    return utilities
}
module.exports.DiscordUtility = DiscordUtility
