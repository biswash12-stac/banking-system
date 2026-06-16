import { User } from "../models/userModels.js"
import jwt from "jsonwebtoken"


// middleware for authentication
export const authMiddlewareFunction = async (req,res,next)=>{
const token = req.cookies.token || req.headers.authorization?.split(" ")[1]

    if(!token) {
        console.log("user is not logged in")
        return res.status(401).json({
            success : false ,
            message : "user is not authorized , token is missing"
        })
    }

    try{
        const verifyToken = jwt.verify(token , process.env.JWT_SECRET)
             const user = await User.findById(verifyToken.sub);
         // ✅ CRITICAL: Check if user still exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User account no longer exists. Please login again."
            })
        }

// ✅ Optional: Check if account is active (if you have this field)
        if (user.status === 'blocked') {
            return res.status(403).json({
                success: false,
                message: "Your account has been blocked. Contact support."
            })
        }
        


       req.user= user

      return next()

    }catch(err) {
          // ✅ User-friendly error messages
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: "Session expired. Please login again."
            })
        }
        
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: "Invalid token. Please login again."
            })
        }
        
        // Fallback for any other errors
        return res.status(401).json({
            success: false,
            message: "Authentication failed. Please login again."
        })
    
    }
}