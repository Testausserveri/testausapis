import mongoose from "mongoose"

const { Schema } = mongoose

const SchemaBankPublicWhitelist = new Schema({
    name: { type: String, index: true },
    rules: {
        name: { type: Boolean, default: false },
        remittance_information: { type: Boolean, default: false },
        hidden: { type: Boolean, default: false }
    }
}, { collection: "bank_public_whitelist" })

export default SchemaBankPublicWhitelist


