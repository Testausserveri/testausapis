// to-do: fix file save path

import https from "https"
import fs from "fs"
import path from "path"

await fs.promises.mkdir(path.join(path.resolve(), "../../media/avatars"), {recursive: true})

export function cacheAvatar(id, member) {
    return new Promise((resolve, reject) => {
        try {
            const url = member.displayAvatarURL()
            const filename = `${id}`

            const file = fs.createWriteStream(path.join(path.resolve(), `../../media/avatars/${filename}`));
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
