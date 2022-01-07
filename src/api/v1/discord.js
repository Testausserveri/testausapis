const {
    Intents, Client, MessageActionRow, MessageButton
} = require("discord.js")

const discordConnectionsURL = "http://api.testausserveri.fi/v1/discord/connections/authorize"

const intents = new Intents()
intents.add(
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_INTEGRATIONS
)
const client = new Client({ intents })

const slashCommands = require("./slashCommands")

const roleCache = {}

/**
 * @typedef {import("./database")} Database
 */

class DiscordUtility {
    constructor(database) {
        this.database = database
        this.ready = false // Is the Discord client ready?
    }

    /**
     * Get the member count of a Discord server
     * @param {string} id The server id
     * @returns {Promise<string | null>}
     */
    // eslint-disable-next-line class-methods-use-this
    async getMemberCount(id) {
        return (await client.guilds.fetch(id))?.memberCount
    }

    /**
     * Get relevant analytics data for a specific role
     * @param {string} serverId The server id
     * @param {string} roleId The role id
     */
    async getRoleData(serverId, roleId) {
        const role = await (await client.guilds.fetch(serverId)).roles.fetch(roleId)
        if (role === null) return null
        let response
        if (!roleCache[role.id] || roleCache[role.id].expiry < new Date().getTime()) {
            // Fetch members and build response
            // eslint-disable-next-line no-restricted-syntax
            for await (const member of role.members) await member[1].user.fetch() // Fetch all members
            const extraMemberData = {}
            // eslint-disable-next-line no-restricted-syntax
            for await (const member of role.members) extraMemberData[member[0]] = (await this.database.getUserInfo(member[0]))
            response = {
                name: role.name,
                id: role.id,
                color: role.hexColor,
                members: role.members.map((member) => ({
                    name: member.user.username,
                    displayName: member.displayName,
                    discriminator: member.user.discriminator,
                    id: member.user.id,
                    presence: member.presence ? member.presence.activities.map((activity) => ({
                        type: activity.type,
                        id: activity.id,
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
                        }) : []
                    })) : [],
                    avatar: member.user.displayAvatarURL(),
                    banner: member.user.bannerURL(),
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
            roleCache[role.id] = {
                expiry: new Date().getTime() + 5000,
                data: response
            }
        } else {
            response = roleCache[role.id].data
        }
        return response
    }
}

/**
 * Initialize the Discord client
 * @param {Database} database
 */
module.exports = (database) => {
    client.on("interactionCreate", async (interaction) => {
        if (interaction.isCommand()) {
            // Handle commands
            try {
                if (interaction.commandName === "analytics") {
                    // Handle analytics commands
                    if (["allow", "deny"].includes(interaction.options.getSubcommand())) {
                        await interaction.deferReply({ ephemeral: true })
                        await database.updateDataCollectionPolicy(
                            interaction.options.getSubcommand() === "allow" ? "add" : "remove", interaction.guild.id, interaction.member.id
                        )
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
                        await database.setUserInfo(
                            interaction.user.id, interaction.options.get("text").value, undefined
                        )
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
        utilities.ready = true
        console.log("Connected to Discord as", client.user.tag)
    })
    client.login()
    return utilities
}
