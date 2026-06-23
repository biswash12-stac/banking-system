import { userAccount } from "../models/accountModel.js";
import { transactionModel } from "../models/transactionModel.js";
import { ledegerModel } from "../models/ledgerEntryModel.js";

/**
 * Process a money transfer between two accounts
 * @param {string} fromAccountId - Sender's account ID (MongoDB _id)
 * @param {string} toAccountId - Receiver's account ID (MongoDB _id)
 * @param {number} amount - Amount to transfer
 * @param {string} userId - ID of user initiating transfer
 * @param {string} description - Description of the transfer
 * @param {string} ipAddress - IP address of the request (default: '0.0.0.0')
 * @returns {Object} Transaction result with status and details
 */
export const transactionProcessAction = async (
    fromAccountId,
    toAccountId,
    amount,
    userId,
    description,
    ipAddress = "0.0.0.0"
) => {
    let transaction = null;
    let debitEntry = null;
    let creditEntry = null;

    try {
        // STEP 1: Validate Inputs
        if (!fromAccountId || !toAccountId || !amount || !userId) {
            throw new Error("Missing required fields");
        }

        if (amount <= 0) {
            throw new Error("Amount must be greater than zero");
        }

        if (fromAccountId === toAccountId) {
            throw new Error("Cannot transfer to the same account");
        }

        // STEP 2: Get Accounts from Database
        const fromAccount = await userAccount.findById(fromAccountId);
        const toAccount = await userAccount.findById(toAccountId);

        if (!fromAccount) {
            throw new Error("Source account not found");
        }

        if (!toAccount) {
            throw new Error("Destination account not found");
        }

        // STEP 3: Check Account Status
        if (fromAccount.status !== "active") {
            throw new Error("Source account is not active");
        }

        if (toAccount.status !== "active") {
            throw new Error("Destination account is not active");
        }

        // STEP 4: Verify Account Ownership
        if (fromAccount.user.toString() !== userId.toString()) {
            throw new Error("You do not own this account");
        }

        // STEP 5: Check Balance
        const availableBalance = await ledegerModel.getBalance(fromAccountId);

        if (availableBalance.balance < amount) {
            throw new Error(
                `Insufficient balance. Available: ${availableBalance.balance}`
            );
        }

        // STEP 6: Create Transaction Record (PENDING)
        const transactionData = {
            fromAccount: fromAccountId,
            toAccount: toAccountId,
            amount: amount,
            status: "pending",
            idempotencyKey: `TXN-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)}`,
        };
        transaction = await transactionModel.create(transactionData);
        console.log(`📝 Transaction created: ${transaction._id}`);

        // STEP 7: Calculate New Balances
        const senderBalance = availableBalance.balance;
        const receiverBalanceResult = await ledegerModel.getBalance(
            toAccountId
        );
        const receiverBalance = receiverBalanceResult.balance;

        const senderNewBalance = senderBalance - amount;
        const receiverNewBalance = receiverBalance + amount;

        console.log(
            `💰 Balance: From ${senderBalance} → ${senderNewBalance}, To ${receiverBalance} → ${receiverNewBalance}`
        );

        // STEP 8: Create Debit Ledger Entry
        const debitData = {
            entryId: `DEBIT-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 6)}`,
            transactionId: transaction._id.toString(),
            transactionType: "Transfer",
            accountID: fromAccountId, // ✅ FIXED: Use accountID (uppercase)
            counterPartyId: toAccountId,
            entryType: "debit",
            amount: amount,
            currency: fromAccount.currency || "NPR",
            runningBalance: senderNewBalance, // ✅ FIXED: Use correct variable
            status: "COMPLETED",
            idempotencyKey: transaction.idempotencyKey,
            initiatedBy: userId,
            ipAddress: ipAddress,
            description: description || "Transfer",
            feeAmount: 0,
            netAmount: amount,
            settlementStatus: "UNSETTLED",
        };
        debitEntry = await ledegerModel.create(debitData);
        console.log(`📊 Debit entry created: ${debitEntry.entryId}`);

        // STEP 9: Create Credit Ledger Entry
        const creditData = {
            entryId: `CREDIT-${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 6)}`,
            transactionId: transaction._id.toString(),
            transactionType: "Transfer",
            accountID: toAccountId, // ✅ FIXED: Use accountID (uppercase)
            counterPartyId: fromAccountId,
            entryType: "credit",
            amount: amount,
            currency: toAccount.currency || "NPR",
            runningBalance: receiverNewBalance, // ✅ FIXED: Use correct variable
            status: "COMPLETED",
            idempotencyKey: transaction.idempotencyKey,
            initiatedBy: userId,
            ipAddress: ipAddress,
            description: description || "Transfer",
            feeAmount: 0,
            netAmount: amount,
            settlementStatus: "UNSETTLED",
            pairedEntryId: debitEntry._id,
        };
        creditEntry = await ledegerModel.create(creditData);
        console.log(`📊 Credit entry created: ${creditEntry.entryId}`);

        // STEP 10: Link Entries Together
        await ledegerModel.findByIdAndUpdate(debitEntry._id, {
            pairedEntryId: creditEntry._id,
        });
        console.log(
            `🔗 Entries linked: ${debitEntry.entryId} ↔ ${creditEntry.entryId}`
        );

        // STEP 11: Mark Transaction as COMPLETED
        await transactionModel.findByIdAndUpdate(transaction._id, {
            status: "completed",
        });
        console.log(` Transaction completed: ${transaction._id}`);

        // STEP 12: Return Success Response
        return {
            success: true,
            transactionId: transaction._id,
            fromAccount: fromAccountId,
            toAccount: toAccountId,
            amount: amount,
            status: "completed",
            debitEntryId: debitEntry.entryId,
            creditEntryId: creditEntry.entryId,
            message: "Transfer completed successfully",
        };
    } catch (error) {
        // ========================================
        // ERROR HANDLING: Clean up on failure
        // ========================================
        console.error(` Transaction failed: ${error.message}`);

        // If debit entry was created but credit entry wasn't, delete the debit entry
        if (debitEntry && !creditEntry) {
            await ledegerModel.findByIdAndDelete(debitEntry._id);
            console.log(
                ` Deleted orphaned debit entry: ${debitEntry.entryId}`
            );
        }

        // If transaction was created, mark it as failed
        if (transaction && transaction._id) {
            await transactionModel.findByIdAndUpdate(transaction._id, {
                status: "failed",
            });
            console.log(`⚠️ Transaction marked as failed: ${transaction._id}`);
        }

        // ✅ FIXED: Throw error AFTER cleanup
        throw new Error(`Transaction failed: ${error.message}`);
    }
};