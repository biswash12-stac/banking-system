import { User } from "../models/userModels.js";
import jwt from "jsonwebtoken";
import { sendEmail,sendRegisteredEmail } from "../services/email.js";
// ✅ OPTIMIZED: Only store userId in token (best practice)
const generateToken = (userId) => {
  return jwt.sign(
    { 
      // this is subject user id or users userid
      sub: userId,  // 'sub' is standard JWT claim for subject (user ID)
    }, 
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || "7d" 
    }
  );
};

// ✅ IMPROVED: Better cookie settings for security
const setTokenCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.cookie('token', token, {
    httpOnly: true,           // Prevents XSS attacks
    secure: isProduction,     // HTTPS only in production
    sameSite: 'strict',       // Prevents CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
    domain: process.env.COOKIE_DOMAIN || undefined
  });
};

const clearTokenCookie = (res) => {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie("token", "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict",
    expires: new Date(0),
    path: "/",
    domain: process.env.COOKIE_DOMAIN || undefined,
  });
};

// ✅ IMPROVED: Better validation with detailed messages
const validateInput = (userName, email, password) => {
  const error = {};

  if (!userName || userName.trim().length < 2) {
    error.userName = "userName must be at least two characters";
  } else if (userName.trim().length > 50) {
    error.userName = "userName cannot exceed 50 characters";
  }

  if (!email) {
    error.email = "Email is required";
  } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    error.email = "Please provide a valid email address";
  }

  if (!password) {
    error.password = "Password is required";
  } else if (password.length < 8) {
    error.password = "Password must be at least 8 characters long";
  } else if (!/[A-Z]/.test(password)) {
    error.password = "Password must contain at least one uppercase letter";
  } else if (!/[a-z]/.test(password)) {
    error.password = "Password must contain at least one lowercase letter";
  } else if (!/[0-9]/.test(password)) {
    error.password = "Password must contain at least one number";
  } else if (!/[!@#$%^&*]/.test(password)) {
    error.password = "Password must contain at least one special character (!@#$%^&*)";
  }

  return {
    isValid: Object.keys(error).length === 0,
    errors: error,
  };
};

export const registerController = async (req, res) => {
  try {
    const { email, userName, password } = req.body;

    // Validate input
    const { isValid, errors } = validateInput(userName, email, password);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists! Please login instead",
      });
    }

    // Create user
    const newUser = await User.create({
      userName: userName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
    });

        // ✅ SEND EMAIL HERE - BEFORE returning the response
    try {
      await sendRegisteredEmail(email, userName);
      console.log(`✅ Welcome email sent to ${email}`);
    } catch (emailError) {
      console.error(`❌ Failed to send welcome email to ${email}:`, emailError);
      // Don't fail the registration if email fails
      // Just log the error and continue
    }

    // Generate token (only userId)
    const token = generateToken(newUser._id);
    
    // Set cookie
    setTokenCookie(res, token);

    // Prepare response (no token in body for web security)
    const userResponse = {
      id: newUser._id,
      userName: newUser.userName,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user: userResponse },
    });

  } catch (err) {
    // Handle duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Handle validation errors
    if (err.name === "ValidationError") {
      const validationErrors = {};
      Object.keys(err.errors).forEach((key) => {
        validationErrors[key] = err.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }
    
    console.error("Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const registeredUser = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!registeredUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Verify password
    const isPasswordValid = await registeredUser.comparePasswords(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token (only userId)
    const token = generateToken(registeredUser._id);
    
    // Set cookie
    setTokenCookie(res, token);

    const userData = {
      id: registeredUser._id,
      userName: registeredUser.userName,
      email: registeredUser.email,
      createdAt: registeredUser.createdAt,
      updatedAt: registeredUser.updatedAt,
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user: userData },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const logoutController = async (req, res) => {
  try {
    clearTokenCookie(res);
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({
      success: false,
      message: "Error during logout",
    });
  }
};

export const getCurrentUserController = async (req, res) => {
  try {
    const token = req.cookies.token;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.sub || decoded.userId; // Support both formats
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          userName: user.userName,
          email: user.email,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      }
    });
  } catch (error) {
    console.error("Get user error:", error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    
    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};