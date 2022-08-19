import request from "./request.js"

/**
 * Get the coding leaderboard
 * @returns {{ name: string, value: string }[]}
 */
export default async () => {
    try {
        const { data, status } = await request("GET", "https://api.testaustime.fi/leaderboards/balls", {
            Authorization: `Bearer ${process.env.TESTAUSTIME_TOKEN}`
        })
        if (status !== 200) throw new Error(`Failed to fetch leaderboard from Testaustime: ${JSON.stringify(data)}`)
        const { members } = JSON.parse(data)
        const leaderboard = members
            .map((member) => ({
                name: member.username,
                value: member.time_coded
            }))
            .sort((a, b) => (b.value - a.value))
            .slice(0, 5)

        return leaderboard
    } catch (error) {
        console.error(error)
        return []
    }
}
