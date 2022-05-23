import "dotenv/config"
import database from "../../src/database/database.js"

import inquirer from "inquirer";
import inquirerPrompt from "inquirer-autocomplete-prompt";

console.log("Connecting to database...")
await database.init()
    .then(() => {
        console.log("Database connected")
    })
    .catch((e) => {
        console.error("Failed to connect to the database", e)
        process.exit(1)
    })

let lastResults = []
async function search(q) {
    lastResults = await database.UserInfo.autoComplete(q)

    return lastResults.map(user => (user._id.toString() + " | " + (user.nickname || user.username)))
}

inquirer.registerPrompt('autocomplete', inquirerPrompt);

const { member: memberString } = await inquirer
    .prompt([
    {
        type: 'autocomplete',
        name: 'member',
        message: 'Select member',
        source: (answersSoFar, input) => search(input),
    }])

const [ memberId ] = memberString.split("|").map(i => i.trim())

const member = lastResults.find(result => result._id.toString() == memberId)
console.log(member)