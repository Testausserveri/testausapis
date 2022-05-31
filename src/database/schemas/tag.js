import mongoose from "mongoose"
const { Schema } = mongoose

const SchemaTag = new Schema({
    name: String,
})

export default SchemaTag
