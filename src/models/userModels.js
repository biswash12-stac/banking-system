import mongoose, { Schema } from "mongoose";
import bcrypt from "bcryptjs";

export const userSchema = new Schema(
  {
    email: {
      type: String,
      required: [true, "email is required"],
      trim: true,
      lowercase: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "invalid email format"]
    },
    userName: {
      type: String,
      required: [true, "userName is required"]
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

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

    try {
      this.password = bcrypt.hashSync(this.password, 12);
      next();
    } catch (err) {
      next(err);
    }
});

userSchema.methods.comparePasswords = async function (inputPassword) {
  if (!inputPassword || typeof inputPassword !== "string") return false;
  if (!this.password) return false;

  try {
    return bcrypt.compareSync(inputPassword, this.password);
  } catch (err) {
    console.error(`Password comparison failed for user ${this._id}:`, err.message);
    return false;
  }
};

export const User = mongoose.model("User", userSchema);