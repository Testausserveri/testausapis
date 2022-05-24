/* eslint-disable max-len */
/* eslint-disable import/extensions */
import mariadb from "mariadb"

let connection

async function getMessagesLeaderboard() {
    try {
        const data = await connection.query("SELECT `userid`, SUM(`message_count`) as 'message_count' FROM `messages_day_stat` WHERE (`date` between date_sub(now(),INTERVAL 1 WEEK) and now()) GROUP BY `userid` ORDER BY `message_count` DESC LIMIT 5")
        return [...data]
    } catch {
        return []
    }
}
async function connect() {
    try {
        connection = await mariadb.createConnection(process.env.TESTAUSKOIRA_MARIADB)
        console.log("Connected to Testauskoira database")

        getMessagesLeaderboard()
    } catch {
        console.warn("Testauskoira database connection failed")
    }
}

export default {
    connect,
    getMessagesLeaderboard
}
