// to-do: fix file save path

import https from "https"
import fs from "fs"

export function cacheAvatar(id, member) {
    return new Promise((resolve, reject) => {
        try {
            const url = member.displayAvatarURL()
            const filename = `${id}`

            const file = fs.createWriteStream(`./media/avatars/${filename}`);
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
