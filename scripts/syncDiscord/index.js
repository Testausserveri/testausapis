/**
 * Synchronize Discord users to our database
 */

import "dotenv/config"

import { Client, Intents } from "discord.js";
import database from "../../src/database/database.js"
import { cacheAvatar } from "./cacheAvatar.js";

console.log("Connecting to database...")
await database.init()
    .then(() => {
        console.log("Database connected")
    })
    .catch((e) => {
        console.error("Failed to connect to the database", e)
        process.exit(1)
    })

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MEMBERS] })
const mainServer = "697710787636101202"

function upsertDatabase(member) {
  return database.UserInfo.findOneAndUpdate({
    id: member.id
  }, 
  {
    username: member.user.username,
    nickname: member.nickname,
    id: member.id
  }
  , { upsert: true, new: true })
}

client.on("ready", async () => {
  console.log(`Logged in as ${client.user.tag}!`)
  const guild = await client.guilds.fetch(mainServer)
  console.log(`Selected Discord server ${guild.name}`)

  const members = [...await guild.members.fetch()]
    .map(([userid, member]) => member)
  //  .splice(0,2)

  const promises = []

  for (const member of members) {
    promises.push(upsertDatabase(member)
      .then(user => cacheAvatar(user._id.toString(), member))
      .catch(e => {
          console.error(`\x1b[41m${member.user.username} failed\x1b[0m`, e)
      }))
  }

  const fulfilled = (await Promise.allSettled(promises)).reduce((acc, cur) => (acc + (cur.status == "fulfilled" ? 1 : 0)), 0)

  console.log(`Fulfilled ${fulfilled} / ${members.length}`)
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
