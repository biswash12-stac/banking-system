import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "invalid email format"]
    },
    userName: {
      type: String,
      required: [true, "userName is required"],
      trim: true
    },
    password: {
      type: String,
      required: [true, "password is required"],
      minlength: [8, "password must be at least 8 characters"],
      select: false
    }
  },
  { timestamps: true }
);

// ✅ FIXED: Using async/await style (NO 'next' parameter)
userSchema.pre("save", async function() {
  console.log("🔐 Pre-save hook running");
  
  if (!this.isModified("password")) {
    console.log("Password not modified, skipping hash");
    return; // Just return, no next()
  }

  try {
    console.log("Hashing password...");
    this.password = await bcrypt.hash(this.password, 12);
    console.log("✅ Password hashed successfully");
    // No next() needed - just return
  } catch (err) {
    console.error("❌ Hashing error:", err);
    throw err; // Throw error instead of calling next(err)
  }
});

userSchema.methods.comparePasswords = async function(inputPassword) {
  if (!inputPassword || typeof inputPassword !== "string") return false;
  if (!this.password) return false;

  try {
    return await bcrypt.compare(inputPassword, this.password);
  } catch (err) {
    console.error(`Password comparison failed:`, err.message);
    return false;
  }
};

export const User = mongoose.model("User", userSchema);