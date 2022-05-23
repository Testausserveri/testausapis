import mongoose from "mongoose"
const { Schema } = mongoose

const SchemaProjects = new Schema({
    name: String,
    slug: String,
    members: [{ type: Schema.Types.ObjectId, ref: "UserInfo" }]
})

SchemaProjects.statics.new = function (name, members) {

}

export default SchemaProjects
