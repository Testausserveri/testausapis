const mariadb = require("mariadb")

let connection

async function getMessagesLeaderboard() {
    try {
        const data = await connection.query("SELECT `userid`, `message_count` FROM `messages_day_stat` WHERE `date` = subdate(current_date, 1) ORDER BY `message_count` DESC LIMIT 5")
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

module.exports = {
    connect,
    getMessagesLeaderboard
}
