import request from "./request.js"

async function getContributors(urls) {
    const contributors = []

    for (const url of urls) {
        const target = url.match(/github.com\/([^\/]+)\/([^\/]+)/).slice(1, 3).join("/")
        // eslint-disable-next-line no-await-in-loop
        const { data } = await request("GET", `https://api.github.com/repos/${target}/contributors`)

        const items = JSON.parse(data).map((item) => ({
            id: item.id,
            name: item.login,
            avatar: item.avatar_url
        }))

        contributors.push(...items)
    }

    return contributors
}

const github = {
    getContributors
}

export default github
