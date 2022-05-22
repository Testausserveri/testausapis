import "./console.js"
import Package from "../package.json"

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)
console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)

if (process.env.DEBUGGING) console.warn("DEBUGGING MODE IS ACTIVE! DISCORD INTERACTIONS WILL BE IGNORED!")
