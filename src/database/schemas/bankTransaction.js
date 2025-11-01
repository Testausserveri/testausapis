import mongoose from "mongoose"

const { Schema } = mongoose

const SchemaBankTransaction = new Schema({
    entry_reference: String,
    amount: String,
    booking_date: Date,
    credit_debit_indicator: {
        type: String,
        enum: ["DBIT", "CRDT"]
    },
    currency: String,
    name: String,
    remittance_information: String,
    status: String,
    updated_at: Date
}, { collection: "bank_transactions" })

export default SchemaBankTransaction


