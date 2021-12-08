require("dotenv").config()

// Config
const mainServer = "697710787636101202"
const rolesWhitelistedForDataExport = ["743950610080071801"]
const discordRoleCacheTimeout = 5 * 60 * 1000 // 5 minutes

const { Client, Intents, Role, MessageActionRow, MessageButton } = require("discord.js")
const express = require("express")
const mongoose = require("mongoose")

const v1 = require("./v1.js")
const utils = {}
const ready = []
const discordRoleCache = {}
global.discordRedirectURI = "http://localhost:8080/v1/consent_discord_data"
const discordAuthorizeURI = "http://localhost:8080/v1/authorize_discord_data"

const app = express()
const intents = new Intents()
intents.add(Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MEMBERS, Intents.FLAGS.GUILD_PRESENCES, Intents.FLAGS.GUILD_INTEGRATIONS)
const client = new Client({ intents: intents })

/* Database */
const MessageCount = mongoose.model("MessageCount", new mongoose.Schema({
    count: Number,
    id: String,
    date: String
}))
const DataCollectionConfiguration = mongoose.model("DataCollectionConfiguration", new mongoose.Schema({
    allowed: Array,
    id: String
}))
const UserInfo = mongoose.model("UserInfo", new mongoose.Schema({
    id: String,
    bio: String,
    connectedAccounts: Array
}))
global.temporaryDiscordAccessTokens = {}

/**
 * Update message count
 */
async function updateMessageCount(){
    const update = { count: 0, id: mainServer, date: new Date().toDateString() }
    const mainServerStats = await MessageCount.findOne({ id: mainServer }).exec()
    if(mainServerStats !== null) {
        if(mainServerStats.date !== new Date().toDateString()) update.count = 0
        else update.count = (typeof mainServerStats.count === "number" ? mainServerStats.count : 0) + 1
    }
    await MessageCount.findOneAndUpdate({ id: mainServer }, update, { upsert: true }).exec()
}

/**
 * Update data collection config
 * @param {"add"/"remove"} mode 
 * @param {String} data 
 */
async function updateDataCollectionConfig(mode, data){
    const mainServerConfig = await DataCollectionConfiguration.findOne({ id: mainServer }).exec()
    if(mainServerConfig !== null) {
        if(mode === "remove") mainServerConfig.allowed.splice(mainServerConfig.allowed.indexOf(data), 1)
        else if (mode === "add") mainServerConfig.allowed.push(data)
    }
    await DataCollectionConfiguration.findOneAndUpdate({ id: mainServer }, { id: mainServer, allowed: mainServerConfig?.allowed ?? [] }, { upsert: true }).exec()
}

/**
 * Get data collection config
 */
utils.getDataCollectionConfig = async () => {
    return await DataCollectionConfiguration.findOne({ id: mainServer }).exec()
}

/**
 * Get message count
 * @returns {Role}
 */
utils.getMessageCount = async () => {
    return await MessageCount.findOne({ id: mainServer }).exec()
}

utils.setUserInfo = async (id, bio, connectedAccounts) => {
    if(bio) return await UserInfo.findOneAndUpdate({ id }, { $set: { connectedAccounts, bio, id } }, { upsert: true }).exec()
    else return await UserInfo.findOneAndUpdate({ id }, { $set: { connectedAccounts, id } }, { upsert: true }).exec()
}
utils.removeUserInfo = async id => {
    return await UserInfo.findOneAndDelete({ id }).exec()
}
utils.getUserInfo = async id => {
    return await UserInfo.findOne({ id }).exec()
}

mongoose.connect(process.env.TEST_CLUSTER ?? "mongodb://mongo:27018/main").then(async () => {
    console.log("Connected to the database!")
    await updateMessageCount() // Make sure the record exists
    await updateDataCollectionConfig()
    ready.push("database")
}).catch(e => {
    console.error("Failed to connect to database", e)
})

/* Discord */
client.on("ready", async () => {
    client.api.applications(client.user.id).guilds(mainServer).commands.post({
        data: {
            name: "api",
            description: "Manage the collection of your \"Discord Data\" by Testausserveri ry.",
            options: [{
                name: "consent",
                description: "Allow/Disallow data collection with your consent.",
                type: 3,
                required: true,
                choices: [
                    {
                        name: "I allow data collection (make my profile public).",
                        value: "allow"
                    }, {
                        name: "I disallow data collection (make my profile private).",
                        value: "deny"
                    },
                    {
                        name: "I want to include my bio & connected accounts in my public profile.",
                        value: "extra-public"
                    },
                    {
                        name: "I do not want to include my bio or connected accounts in my public profile.",
                        value: "extra-private"
                    }
                ]
            }],
        }
    })
    client.api.applications(client.user.id).guilds(mainServer).commands.post({
        data: {
            name: "bio",
            description: "Edit your public profile",
            options: [
                {
                    name: "text",
                    description: "My public bio.",
                    type: 3,
                    required: true
                }
            ],
        }
    })
    client.api.applications(client.user.id).guilds(mainServer).commands.post({
        data: {
            name: "connections",
            description: "Update connections"
        }
    })
    console.log(`Logged in as ${client.user.tag}!`)
    ready.push("discord")
})

client.on('interactionCreate', async interaction => {
	if(!interaction.user.bot){
        if(interaction.commandName === "api"){
            if(interaction.options._hoistedOptions[0].value === "allow"){
                // Allow
                await updateDataCollectionConfig("add", interaction.user.id)
                await interaction.reply({
                    content: "Your data collection setting was saved (Allowed).",
                    ephemeral: true
                })
            }else if(interaction.options._hoistedOptions[0].value === "deny"){
                // Disallow
                await updateDataCollectionConfig("remove", interaction.user.id)
                await interaction.reply({
                    content: "Your data collection setting was saved (Denied).",
                    ephemeral: true
                })
            }else if(interaction.options._hoistedOptions[0].value === "state"){
                const allowed = (await utils.getDataCollectionConfig()).allowed.includes(interaction.user.id) ? "Allowed" : "Denied"
                await interaction.reply({
                    content: "Your data collection setting is set to: " + allowed,
                    ephemeral: true
                })
            }else if(interaction.options._hoistedOptions[0].value === "extra-public"){
                const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setStyle("LINK")
                            .setLabel("Login with Discord")
                            .setURL(discordAuthorizeURI)
                    )

                await interaction.reply({ content: "Authorize access to your account by logging in with your Discord account.", components: [ row ], ephemeral: true })
            }else if(interaction.options._hoistedOptions[0].value === "extra-update"){
                // Do we have a token?
                if(global.temporaryDiscordAccessTokens[interaction.user.id]){
                    // We do, just fetch the stuff and update
                }else {
                    const row = new MessageActionRow()
                    .addComponents(
                        new MessageButton()
                            .setStyle("LINK")
                            .setLabel("Login with Discord")
                            .setURL(discordAuthorizeURI)
                    )

                    await interaction.reply({ content: "Authorize access to your account by logging in with your Discord account.", components: [ row ], ephemeral: true })
                }
            }else if(interaction.options._hoistedOptions[0].value === "extra-private"){
                const done = await utils.removeUserInfo(interaction.user.id)
                if(done !== null) await interaction.reply({ content: "Your bio & connected account details were removed." })
                else await interaction.reply({ content: "There is not data to remove." })
            }
        }else if(interaction.commandName === "bio"){
            console.log(require("util").inspect(interaction, true, 99))
        }else if(interaction.commandName === "connections"){
            console.log(require("util").inspect(interaction, true, 99))
        }
    }
})

client.on("messageCreate", async message => {
    if(!message.author.bot) updateMessageCount()
    if(message.content.startsWith("!bio ")){
        let bio = message.content.replace("!bio ", "")
        if(bio.length > 190) bio = bio.split("").splice(0, 190)
        await utils.setUserInfo(message.author.id, bio)
        message.reply("Bio set!")
    }
})

utils.getMemberCount = async () => {
    return (await client.guilds.fetch(mainServer)).memberCount
}

utils.getRoleData = async id => {
    if(!rolesWhitelistedForDataExport.includes(id)) return false
    const role = await (await client.guilds.fetch(mainServer)).roles.fetch(id)
    // Serve from cache
    if(discordRoleCache[id] !== undefined && (discordRoleCache[id].timestamp + discordRoleCacheTimeout) > new Date().getTime()){
        console.log("Serving from role cache")
        return discordRoleCache[id]
    }
    // Fetch members and build response
    for(const member of role.members) await member[1].user.fetch(true) // Fetch all members
    const extra = {}
    for(const member of role.members) extra[member[0]] = (await utils.getUserInfo(member[0]))
    const response = {
        name: role.name,
        id: role.id,
        color: role.color,
        members: role.members.map(member => ({
            name: member.user.username,
            displayName: member.displayName,
            id: member.user.id,
            presence: member.presence ? member.presence.activities.map(activity => ({
                type: activity.type,
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
            banner: member.user.banner,
            color: member.user.accentColor,
            flags: member.user.flags.toArray(),
            connectedAccounts: extra[member.user.id]?.connectedAccounts,
            bio: extra[member.user.id]?.bio
        })),
        count: role.members.size,
        timestamp: new Date().getTime()
    }
    discordRoleCache[id] = response
    return response
}

/* Webserver */
app.get("/", (req, res) => {
    res.status(200).send(`Testausserveri APIs logged in as ${client.user.tag}`)
})

app.use((req, res, next) => { // Allow testausserveri.fi for CORS
    res.header('Access-Control-Allow-Origin', 'testausserveri.fi');
    next()
})

// API v1
app.use((req, res, next) => {
    if(ready.includes("discord") && ready.includes("database")) next()
    else res.status(503).send("Server is starting...")
})
app.use(async (req, res, next) => await v1(req, res, next, utils))

app.use((req, res) => {
    res.status(404).send("Not found.")
})

client.login(process.env.DISCORD_TOKEN)
app.listen(8080)