const transactionSchema = new mongoose.Schema({
    fromAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userAccount",
        required: [true, "transaction must be associated with bank account"],
        index: true
    },
    toAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "userAccount",
        required: [true, "transaction must be associated with bank accounts"],
        index: true
    },
    status: {
        type: String,
        enum: {
            values: ["pending", "completed", "failed", "reversed"],
            message: "status can be pending, completed, failed or reversed"
        },
        default: "pending",
    },
    amount: {
        type: Number,
        required: [true, "amount is required for transaction"],
        min: [0, "amount cannot be less than 0 or negative"]
    },
    idempotencyKey: {  // ✅ CHANGE: Make it clearer this is the key
        type: String,
        required: [true, "idempotency key is required"],
        unique: true,
        index: true
    }
}, { timestamps: true });

export const transactionModel = mongoose.model("transactionModel", transactionSchema);