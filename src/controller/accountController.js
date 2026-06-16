import { userAccount } from "../models/accountModel.js";
import { User } from "../models/userModels.js";
/**
 * Create a new account for the authenticated user
 */
export const createNewAccount = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Check if user already has an account
        const existingAccount = await userAccount.findOne({ user: userId });
        if (existingAccount) {
            return res.status(400).json({
                success: false,
                message: 'User already has an account',
                account: existingAccount
            });
        }

        // Create new account with required fields
        const newAccount = await userAccount.create({
              user: userId,
            status: 'active',  // Optional - defaults to 'active'
          
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: {
                account: newAccount
            }
        });

    } catch (error) {
        console.error('Account creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create account',
            error: error.message
        });
    }
};

// /**
//  * Get account details
//  */
// export const getAccountDetails = async (req, res) => {
//     try {
//         const account = await Account.findOne({ user: req.user._id })
//             .populate('user', 'name email phone');
        
//         if (!account) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Account not found'
//             });
//         }

//         res.status(200).json({
//             success: true,
//             data: account
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to get account',
//             error: error.message
//         });
//     }
// };

// /**
//  * Update account
//  */
// export const updateAccount = async (req, res) => {
//     try {
//         const { accountType, dailyLimit, currency } = req.body;
//         const account = await Account.findOne({ user: req.user._id });

//         if (!account) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Account not found'
//             });
//         }

//         // Update only allowed fields
//         if (accountType) account.accountType = accountType;
//         if (dailyLimit) account.dailyLimit = dailyLimit;
//         if (currency) account.currency = currency;

//         await account.save();

//         res.status(200).json({
//             success: true,
//             message: 'Account updated successfully',
//             data: account
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to update account',
//             error: error.message
//         });
//     }
// };

// /**
//  * Delete/Close account
//  */
// export const closeAccount = async (req, res) => {
//     try {
//         const account = await Account.findOne({ user: req.user._id });

//         if (!account) {
//             return res.status(404).json({
//                 success: false,
//                 message: 'Account not found'
//             });
//         }

//         // Check if balance is zero before closing
//         if (account.balance > 0) {
//             return res.status(400).json({
//                 success: false,
//                 message: 'Cannot close account with balance. Please withdraw all funds first.'
//             });
//         }

//         account.status = 'closed';
//         await account.save();

//         res.status(200).json({
//             success: true,
//             message: 'Account closed successfully'
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Failed to close account',
//             error: error.message
//         });
//     }
// };