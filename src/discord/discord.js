/**
 * This file needs some serious refactoring 😵‍💫
 */

import {
    Intents, Client, MessageActionRow, MessageButton
} from "discord.js"
import { inspect } from "util"
import request from "../utils/request.js"
import DiscordUtility from "./util.js"

// Constants
const address = process.env.DEBUGGING ? "http://localhost:8080" : "https://api.testausserveri.fi"
const discordConnectionsURL = `${address}/v1/discord/connections/authorize`

// Client configuration
const intents = new Intents()
intents.add(
    Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_INTEGRATIONS
)
const client = new Client({ intents })

// Globals
global.discordDetectable = {}

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

        if (JSON.stringify(global.discordDetectable) !== JSON.stringify(data)) {
            global.discordDetectable = data
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
 * Initialize the Discord client
 * @param {Database} database
 * @returns {DiscordUtility}
 */
async function init(database) {
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
                        await database.DataCollectionConfiguration.updateDataCollectionPolicy(interaction.options.getSubcommand() === "allow" ? "add" : "remove", interaction.guild.id, interaction.member.id)
                        await interaction.followUp({
                            content: `Your data collection policy was set to \`${interaction.options.getSubcommand() === "allow" ? "Allowed" : "Denied"}\``,
                            ephemeral: true
                        })
                    } else if (interaction.options.getSubcommand() === "state") {
                        await interaction.deferReply({ ephemeral: true })
                        const state = await database.DataCollectionConfiguration.getDataCollectionConfig(interaction.guild.id)
                        await interaction.followUp({
                            content: `Your data collection setting is set to: \`${state.allowed.includes(interaction.user.id) ? "Allowed" : "Denied"}\``,
                            ephemeral: true
                        })
                    }
                } else if (interaction.commandName === "manage") {
                    // Handle profile management commands
                    if (interaction.options.getSubcommand() === "bio") {
                        await interaction.deferReply({ ephemeral: true })
                        await database.UserInfo.setUserInfo(interaction.user.id, interaction.options.get("text").value, undefined)
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
                } else if (interaction.commandName === "whois") {
                    const discordUserId = interaction.options.get("user").value
                    console.log(interaction.user.id, " whoised user ", discordUserId)
                    const member = await database.UserInfo.findOne({ id: discordUserId }, "id")
                    if (!member) {
                        await interaction.reply({ content: "Jäsentä ei ole vielä rekisterissä. Yritä huomenna uudelleen.", ephemeral: true })
                        return 
                    }
                    await interaction.reply({ content: member._id.toString(), ephemeral: true })
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
        if (!message.author.bot) database.MessageCount.incrementMessageCount(message.guild.id)
    })

    const utilities = new DiscordUtility(database, client)
    client.once("ready", async () => {
        // for await (const guild of client.guilds.cache) {
        // await guild[1].commands.set(slashCommands)
        // }
        utilities.emit("ready")
        utilities.ready = true
        console.log("Connected to Discord as", client.user.tag)
    })
    client.login(process.env.DISCORD_TOKEN)
    return utilities
}

export default {
    init,
    DiscordUtility
}
