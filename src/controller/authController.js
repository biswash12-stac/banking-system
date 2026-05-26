import { User } from "../models/userModels.js";
import jwt from "jsonwebtoken";

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

// function to validate input in register controller
const validateInput = (userName, email, password) => {
  const error = {};

  if (!userName || userName.trim().length < 2) {
    error.userName = "userName must be at least two characters";
  }

  if (!email) {
    error.email = "Email is required";
  } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
    error.email = "Please provide a valid email address";
  }

  if (!password || password.length < 8) {
    error.password = "password must be at least 8 characters long";
  }

  return {
    isValidInput: Object.keys(error).length === 0,
    error,
  };
};

const registerController = async (req, res) => {
  try {
    const { email, userName, password } = req.body;

    // check for valid input
    const { isValidInput, error } = validateInput(userName, email, password);

    if (!isValidInput) {
      return res.status(400).json({
        success: false,
        message: "Invalid input",
        error,
      });
    }

    // now check if user already exists before registering user
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists! Please login instead",
      });
    }

    // create new user to register in the db
    const newUser = await User.create({
      userName: userName.trim(),
      email: email.toLowerCase().trim(),
      password: password,
    });

    // Generate JWT token
    const token = generateToken(newUser._id);

    // Remove password from response
    const userResponse = {
      id: newUser._id,
      userName: newUser.userName,
      email: newUser.email,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    // send success message
    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (err) {
    // Handle duplicate key error (MongoDB)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already registered",
      });
    }

    // Handle mongoose validation errors
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
    
    // Generic server error
    console.error("Registration error:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

// Login controller
const loginController = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate email and password presence
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Additional email format validation
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Check if user is registered or not (with password field)
    const registeredUser = await User.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!registeredUser) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Compare password
    const isPasswordValid = await registeredUser.comparePasswords(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: registeredUser._id,
        email: registeredUser.email,
        userName: registeredUser.userName,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Remove sensitive data
    const userData = {
      id: registeredUser._id,
      userName: registeredUser.userName,
      email: registeredUser.email,
      createdAt: registeredUser.createdAt,
      updatedAt: registeredUser.updatedAt,
    };

    // Send success response
    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: userData,
        token: token,
      },
    });
  } catch (error) {
    // Handle errors
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export default {
  registerController,
  loginController,
};