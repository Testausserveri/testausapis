/**
 * Migrate association member registry to the database
 * Quick and messy script to do this one-time task
 * 
 * 1. Export registry to CSV (with header row)
 * 2. Save it in the root directory as `assoc.csv`
 * 3. Run `node scripts/migrateAssociation.js`
 * 
 * I don't know what happens if you run this script more than once
 * => Try first on a test database
 * 
 * to-do: save timestamp from row
 */

import "dotenv/config"
import database from "../src/database/database.js"
import csv from "csv-parser"
import fs from "fs"

console.log("Connecting to database...")
await database.init()
    .then(() => {
        console.log("Database connected")
    })
    .catch((e) => {
        console.error("Failed to connect to the database", e)
        process.exit(1)
    })
 
let i = 0

fs.createReadStream("assoc.csv")
    .pipe(csv())
    .on("data", async (row) => {
        i++
        try {
            const associationMembership = {
                associationMembership: {
                    firstName: row['Etunimi'],
                    lastName: row['Sukunimi'],
                    city: row['Asuinkunta'],
                    googleWorkspaceName: row['Google-postilaatikko. Violetti = muun tk käyttäjän omistama, punainen = duplikaatti'],
                    email: row['Email Address'],
                    handledIn: row['Käsitelty kokouksessa'],
                    status: row['Tila']
                }
            }
            
            const eiId = (row['user ID (lisää manuaalisesti)'].length <= 0)

            console.log({ associationMembership : { email: row['Email Address'] }})
            const doc = await database.UserInfo.findOneAndUpdate(
                (eiId ?
                { associationMembership : { email: row['Email Address'] }}
                : { id: row['user ID (lisää manuaalisesti)'] })
                , 
            {
                ...associationMembership,
                internalNotices: row['Huomautuket']
            }
            , { upsert: true, new: true })

            console.log(`OK! ${row["Etunimi"]} ${row["Sukunimi"]} ${!eiId ? ` -> ${doc.username}` : ` EI ID`}`)
        } catch (e)  {
            console.log(`${row["Email Address"]} fail`, e.message)
        }
    })
    .on("end", (a) => {
        console.log('CSV file successfully processed', i);
    })