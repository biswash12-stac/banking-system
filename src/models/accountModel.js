import mongoose from "mongoose";

const accountSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "account must be associated with userID"],
        index: true
    },
    
    // ✅ ADD THIS: Account number for users to see
    accountNumber: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    
    status: {
        type: String,
        enum: {
            values: ["active", "blocked", "frozen", "closed"],
            message: "Status must be either: active, blocked, frozen, or closed"
        },
        default: "active",
        required: true
    },

    currency: {
        type: String,
        required: [true, "Currency is required"],
        default: "NPR",
        uppercase: true,
        validate: {
            validator: function(value) {
                const validCurrencies = ["NPR", "USD", "EUR", "GBP", "INR"];
                return validCurrencies.includes(value.toUpperCase());
            },
            message: "Currency must be one of: NPR, USD, EUR, GBP, INR"
        }
    },

}, { timestamps: true });

// ✅ ADD: Pre-save hook to auto-generate account number
accountSchema.pre('save', function(next) {
    if (!this.accountNumber) {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        this.accountNumber = `ACC-${timestamp}-${random}`;
    }
    next();
});

export const userAccount = mongoose.model("userAccount", accountSchema);