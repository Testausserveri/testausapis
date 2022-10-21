import request from "./request.js"

function getTarget(url) {
    return url.match(/github.com\/([^\/]+)\/([^\/]+)/).slice(1, 3).join("/")
}

async function getReadmes(repositories) {
    try {
        const all = {}

        for (const repository of repositories) {
            const readmeURL = `https://raw.githubusercontent.com/${repository.full_name}/${repository.default_branch}/README.md`
            // eslint-disable-next-line no-await-in-loop
            const { data } = await request("GET", readmeURL)

            all[repository.full_name.toLowerCase()] = data
        }

        return all
    } catch (e) {
        console.error(`Couldn't load READMEs for ${repositories.map((rep) => rep.full_name).join()}, because ${e.message}`)
        return {}
    }
}

async function getRepositories(urls) {
    const all = []

    for (const url of urls) {
        const target = getTarget(url)
        // eslint-disable-next-line no-await-in-loop
        const { data } = await request("GET", `https://api.github.com/repos/${target}`, {
            Authorization: `token ${process.env.GH_PAT}`
        })

        all.push(JSON.parse(data))
    }

    return all
}

async function getContributors(urls) {
    try {
        const contributors = []

        for (const url of urls) {
            const target = getTarget(url)
            // eslint-disable-next-line no-await-in-loop
            const { data } = await request("GET", `https://api.github.com/repos/${target}/contributors`, {
                Authorization: `token ${process.env.GH_PAT}`
            })
            const items = JSON.parse(data).map((item) => ({
                id: item.id,
                name: item.login,
                avatar: item.avatar_url
            }))

            for (const item of items) {
                // add & skip duplicates
                if (!contributors.find((contributor) => contributor.id === item.id)) contributors.push(item)
            }
        }
        return contributors
    } catch (e) {
        console.error(`Couldn't load contributors for ${urls.join()}, because ${e.message}`)
        return []
    }
}

const github = {
    getContributors,
    getRepositories,
    getReadmes
}

export default github
