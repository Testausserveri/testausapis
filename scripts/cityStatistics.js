import "dotenv/config"
import database from "../src/database/database.js"

console.log("Connecting to database...")
await database.init()
    .then(() => {
        console.log("Database connected")
    })
    .catch((e) => {
        console.error("Failed to connect to the database", e)
        process.exit(1)
    })

const data = await database.UserInfo.find(
    { "associationMembership.status": "MEMBER"},
    { "associationMembership.city": 1, _id: 0 }
);

const cities = data.map(item => item.associationMembership.city)

const cityCount = Object.fromEntries(
    Object.entries(
      cities.reduce((acc, city) => {
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])
  );
  
const resultString = Object.entries(cityCount)
.map(([city, count]) => `${count}\t${city}`)
.join('\n');

console.log(resultString)