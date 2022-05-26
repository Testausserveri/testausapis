import "./console.js"
import Package from "../package.json" assert { type: "json" }

console.log(`Package: ${Package.name}@${Package.version}`)
console.log(`Runtime: ${process.version}`)
// eslint-disable-next-line new-cap
console.log(`Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`)

if (process.env.DEBUGGING) console.warn("DEBUGGING MODE IS ACTIVE! DISCORD INTERACTIONS WILL BE IGNORED!")
