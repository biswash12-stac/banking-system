import mongoose from "mongoose";

const accountSchem = new mongoose.Schema({

// taking refrence for userid from userModel
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required:[true, "account must be associated with userID"],
        index : true // this index help u to search user faster in data base
    } ,
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



},{timestamps:true})


accountSchem.index({user:1 , status:1})
export const userAccount = mongoose.model("userAccount" , accountSchem)