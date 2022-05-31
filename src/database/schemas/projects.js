import mongoose from "mongoose"

const { Schema } = mongoose

const SchemaProjects = new Schema({
    name: String,
    slug: String,
    members: [{ type: Schema.Types.ObjectId, ref: "UserInfo" }],
    description: {
        short: String
    },
    tags: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
    media: [
        {
            type: {
                type: String,
                enum : ['IMAGE', 'YOUTUBE'],
                default: 'IMAGE'
            },
            filename: String,
            externalUrl: String,
            cover: Boolean
        }
    ],
    links: [
        {
            type: {
                type: String,
                enum : ['GITHUB', 'HOMEPAGE', 'LINK'],
                default: 'GITHUB'
            },
            url: String
        }
    ]
})

SchemaProjects.statics.new = function (name, members) {

}

export default SchemaProjects
