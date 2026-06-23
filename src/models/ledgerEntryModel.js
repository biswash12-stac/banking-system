import mongoose from "mongoose";

const ledgerSchema = new mongoose.Schema({
  entryId: {
    type: String,
    required: [true, "entery id is required for easy read of id"],
    unique: true,
  },

  transactionId: {
    type: String,
    required: [
      true,
      "transaction id is required to connect to its multiple transaction",
    ],
    index: true,
  },
  transactionType: {
    type: String,
    enum: [
      "Transfer",
      "Deposits",
      "withdrawn",
      "fee",
      "Reversal",
      "Adjustment",
    ],

    required: true,
  },
  accountID: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userAccount",
    required: true,
    index: true,
  },
  counterPartyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "userAccount",
    index: true,
  },
  entryType: {
    type: String,
    enum: ["debit", "credit"],
    required: true,
  },
  amount: {
    type: Number,
    required: [true, "amount is required for transaction"],
    min: [0, "amouunt cannot be negative"],
  },

  currency: {
    type: String,
    enum: ["NPR", "USD", "EUR", "GBP", "INR"],
    default: "NPR",
  },

  runningBalance: {
    type: Number,
    required: true,
    
  },

  pairedEntryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ledgerModel",  // ✅ Fixed: matches your model name
  },
  status: {
    type: String,
    enum: ["PENDING", "COMPLETED", "FAILED", "REVERSED"],
    default: "PENDING",
    index: true,
  },

  idempotencyKey: {
    type: String,
    unique: true,
    required: true,
   
  },
  initiatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
     ipAddress: {
        type: String,
        required: true,
    },

    sessionId: {
        type: String,
        index: true,
    },

       description: {
        type: String,
        required: true,
        maxlength: 500,
       
    },
 reference: {
        type: String,
        index: true,
    },
    feeAmount: {
        type: Number,
        default: 0,
        min: 0,
    },

    feeCurrency: {
        type: String,
        enum: ['NPR', 'USD', 'EUR', 'GBP', 'INR'],
        default: 'NPR',
    },

    netAmount: {
        type: Number,
        required: true,
    },
    originalEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ledgerModel',  // ✅ Fixed: matches your model name
        index: true,
    },

    reversalReason: {
        type: String,
        enum: ['USER_REQUEST', 'SYSTEM_ERROR', 'FRAUD', 'ADMIN_ACTION'],
    },

     settlementStatus: {
        type: String,
        enum: ['UNSETTLED', 'SETTLED', 'FAILED'],
        default: 'UNSETTLED',
        index: true,
    },

    settlementDate: {
        type: Date,
    },

      batchId: {
        type: String,
        index: true,
    },

     metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed,
        default: new Map(),
    }

},
 {
    timestamps : true,
      toJSON: { virtuals: true },
    toObject: { virtuals: true }
 }


);

// ✅ FIXED: Changed accountId → accountID
ledgerSchema.index({ accountID: 1, createdAt: -1 });
ledgerSchema.index({ transactionId: 1 });
ledgerSchema.index({ status: 1, createdAt: -1 });
ledgerSchema.index({ accountID: 1, status: 1, createdAt: -1 });
ledgerSchema.index({ settlementStatus: 1, createdAt: 1 });
ledgerSchema.index({ idempotencyKey: 1 });
ledgerSchema.index({ accountID: 1, entryType: 1, createdAt: -1 });
ledgerSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 365 * 7 });

// ✅ FIXED: Changed ledgerEntrySchema → ledgerSchema
ledgerSchema.pre('save', function(next) {
    // Generate entry ID
    if (!this.entryId) {
        const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.entryId = `LED-${date}-${random}`;
    }
    
    // Set net amount if not provided
    if (!this.netAmount) {
        this.netAmount = this.amount - (this.feeAmount || 0);
    }
    
    // ✅ FIXED: Proper validation for debit/credit
    // For DEBIT: amount should be positive, and runningBalance should decrease
    if (this.entryType === 'debit') {
        if (this.amount <= 0) {
            return next(new Error('Debit amount must be greater than 0'));
        }
        // runningBalance will be checked below (can't be negative)
    }
    
    // For CREDIT: amount should be positive
    if (this.entryType === 'credit') {
        if (this.amount <= 0) {
            return next(new Error('Credit amount must be greater than 0'));
        }
    }
    
    // ✅ CRITICAL: Running balance can't be negative
    if (this.runningBalance < 0) {
        return next(new Error('Insufficient balance. Cannot go negative.'));
    }
    
    next();
});

// METHODS (Helper functions)

ledgerSchema.methods = {
    isDebit() {
        return this.entryType === 'debit';  // ✅ FIXED: lowercase to match enum
    },
    
    isCredit() {
        return this.entryType === 'credit'; // ✅ FIXED: lowercase to match enum
    },
    
    isPending() {
        return this.status === 'PENDING';
    },
    
    isCompleted() {
        return this.status === 'COMPLETED';
    },
    
    canReverse() {
        return this.isCompleted() && !this.originalEntryId;
    }
};

// STATIC METHODS (Query helpers)
ledgerSchema.statics = {
    // Get account balance
    async getBalance(accountId) {
        const result = await this.aggregate([
            { 
                $match: { 
                    accountID: accountId,  // ✅ FIXED: accountId → accountID
                    status: 'COMPLETED' 
                } 
            },
            {
                $group: {
                    _id: null,
                    totalDebit: {
                        $sum: {
                            $cond: [{ $eq: ['$entryType', 'debit'] }, '$netAmount', 0]  // ✅ FIXED: DEBIT → debit
                        }
                    },
                    totalCredit: {
                        $sum: {
                            $cond: [{ $eq: ['$entryType', 'credit'] }, '$netAmount', 0]  // ✅ FIXED: CREDIT → credit
                        }
                    },
                    count: { $sum: 1 }
                }
            }
        ]);
        
        if (result.length === 0) {
            return { balance: 0, totalDebit: 0, totalCredit: 0, count: 0 };
        }
        
        return {
            balance: result[0].totalCredit - result[0].totalDebit,
            totalDebit: result[0].totalDebit,
            totalCredit: result[0].totalCredit,
            count: result[0].count
        };
    },
    
    // Get account history with pagination
    async getAccountHistory(accountId, limit = 50, skip = 0) {
        return this.find({ accountID: accountId })  // ✅ FIXED: accountId → accountID
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate('accountID', 'accountNumber')  // ✅ FIXED: accountId → accountID
            .populate('counterPartyId', 'accountNumber')
            .populate('initiatedBy', 'userName email');
    },
    
    // Get transaction details (both sides)
    async getTransaction(transactionId) {
        return this.find({ transactionId })
            .sort({ entryType: 1 })
            .populate('accountID', 'accountNumber currency')  // ✅ FIXED: accountId → accountID
            .populate('counterPartyId', 'accountNumber');
    }
};

export const ledegerModel = mongoose.model("ledgerModel", ledgerSchema);