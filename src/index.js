require("dotenv").config()

const { Client, Intents } = require("discord.js")
const express = require("express")

const app = express()
const client = new Client({ intents: [Intents.FLAGS.GUILDS] })

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

app.get("/", (req, res) => {
    res.end(`pong ${client.user.tag}`)
})

client.login(process.env.DISCORD_TOKEN)
app.listen(8080)