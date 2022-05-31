// to-do: fix file save path

import https from "https"
import fs from "fs"
import path from "path"
import { fileURLToPath } from 'url'

const currentPath = path.dirname(fileURLToPath(import.meta.url))
await fs.promises.mkdir(path.join(currentPath, "../../media/avatars"), {recursive: true})

export function cacheAvatar(id, member) {
    return new Promise((resolve, reject) => {
        try {
            const url = member.displayAvatarURL()
            const filename = `${id}`

            const file = fs.createWriteStream(path.join(currentPath, `../../media/avatars/${filename}`));
            https.get(url, function(response) {
                response.pipe(file)
                
                file.on("finish", () => {
                    file.close()
                    resolve(filename)
                })
            })
        } catch (e) {
            reject(e)
        }
    })
}
