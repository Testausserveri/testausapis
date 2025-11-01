import mongoose from "mongoose"

const { Schema } = mongoose

const SchemaBankBalance = new Schema({
    date: Date,
    amount: String,
    created_at: Date
}, { collection: "bank_balance" })

export default SchemaBankBalance


