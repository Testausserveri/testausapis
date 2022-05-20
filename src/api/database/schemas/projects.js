import mongoose from "mongoose"
const { Schema } = mongoose

const SchemaProjects = new Schema({
    id: String,
    name: String,
    slug: String,
    members: [{ type: Schema.Types.ObjectId, ref: "UserInfo" }]
})

export default SchemaProjects