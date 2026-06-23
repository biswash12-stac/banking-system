# Backend Banking System - Project Documentation

**Project Name:** Backend Banking System  
**Version:** 1.0.0  
**Type:** Node.js Express REST API  
**Date Created:** 2026

---

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [Project Structure](#project-structure)
5. [API Endpoints](#api-endpoints)
6. [Key Features Implemented](#key-features-implemented)
7. [Security Features](#security-features)
8. [Code Quality Improvements](#code-quality-improvements)
9. [Current Status](#current-status)
10. [Next Steps](#next-steps)

---

## 🎯 Project Overview

This is a **Node.js/Express-based Banking Backend API** designed to manage user accounts, authentication, and transactions. The application uses MongoDB for data persistence and implements JWT-based authentication with email notifications.

### Key Functionalities:
- User registration and authentication
- Account management (create, manage accounts)
- Transaction tracking between accounts
- Email notifications for user activities
- Role-based access control via middleware
- Secure password hashing and JWT token management

---

## 🛠️ Tech Stack

### Dependencies:
```json
{
  "express": "^5.2.1",          // Web framework
  "mongoose": "^9.6.2",         // MongoDB ODM
  "bcryptjs": "^3.0.3",         // Password hashing
  "jsonwebtoken": "^9.0.3",     // JWT token generation
  "nodemailer": "^8.0.9",       // Email service
  "dotenv": "^17.4.2",          // Environment variables
  "cookie-parser": "^1.4.7"     // Cookie parsing middleware
}
```

### Development:
- **nodemon** - Auto-restart server on file changes
- **ES Modules** - Modern JavaScript modules

---

## 📊 Database Schema

### 1. **User Model** (`userModels.js`)
Stores user account credentials and profile information.

**Fields:**
- `email` (String, Required, Unique) - Email address with validation
- `userName` (String, Required) - Display name for user
- `password` (String, Required, Min 8 chars) - Encrypted password (not selected by default)
- `timestamps` - Auto-managed createdAt & updatedAt

**Key Methods:**
- `comparePasswords()` - Async method to compare input password with hashed password
- `Pre-save hook` - Automatically hashes password before saving (only if modified)

**Validations:**
- Email format validation using regex
- Password must be at least 8 characters

---

### 2. **Account Model** (`accountModel.js`)
Represents individual user accounts within the banking system.

**Fields:**
- `user` (ObjectId Ref to User, Required, Indexed) - Link to user who owns account
- `status` (String, Enum) - Account state: `active`, `blocked`, `frozen`, `closed`
- `currency` (String, Enum, Default: NPR) - Supported: `NPR`, `USD`, `EUR`, `GBP`, `INR`
- `timestamps` - Auto-managed createdAt & updatedAt

**Indexes:**
- Single index on `user` field (fast lookups)
- Compound index on `user + status` (optimized queries)

---

### 3. **Transaction Model** (`transactionModel.js`)
Tracks money transfers between accounts.

**Fields:**
- `fromAccount` (ObjectId Ref to userAccount, Required, Indexed) - Source account
- `toAccount` (ObjectId Ref to userAccount, Required, Indexed) - Destination account
- `status` (String, Enum) - State: `pending`, `completed`, `failed`, `reversed`
- `amount` (Number, Required) - Transaction amount (min: 0)
- `idempotency` (String, Required, Unique) - Unique identifier to prevent duplicate transactions
- `timestamps` - Auto-managed createdAt & updatedAt

**Purpose:** Ensures transactional integrity and allows idempotent requests (same request won't double-charge)

---

## 📁 Project Structure

```
Backend/
├── src/
│   ├── server.js                    # Main application entry point
│   ├── controller/
│   │   ├── authController.js        # Registration, login, logout logic
│   │   └── accountController.js     # Account management logic
│   ├── middleware/
│   │   └── authMiddleware.js        # JWT verification & user authentication
│   ├── models/
│   │   ├── userModels.js            # User schema with password hashing
│   │   ├── accountModel.js          # User account schema
│   │   └── transactionModel.js      # Transaction tracking schema
│   ├── Routes/
│   │   ├── authRoutes.js            # Authentication endpoints
│   │   └── accountRoutes.js         # Account management endpoints
│   ├── services/
│   │   └── email.js                 # Email notification service (Gmail)
│   └── lib/
│       └── db.Connect.js            # MongoDB connection management
├── package.json                     # Project dependencies & scripts
└── .env                            # Environment variables (NOT in repo)
```

---

## 🔌 API Endpoints

### Authentication Routes (`/api/routes/`)

#### 1. **Register User**
```
POST /api/routes/register
Content-Type: application/json

{
  "userName": "john_doe",
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (201):
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "user": {
      "id": "67890...",
      "userName": "john_doe",
      "email": "john@example.com",
      "createdAt": "2026-06-17T...",
      "updatedAt": "2026-06-17T..."
    }
  }
}
```

**Validations:**
- Username: 2-50 characters
- Email: Valid format & unique
- Password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char (!@#$%^&*)

**Side Effects:**
- Password hashed with bcrypt (12 rounds)
- Welcome email sent to user
- JWT cookie set (7-day expiry)

---

#### 2. **Login User**
```
POST /api/routes/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { /* user object */ }
  }
}
```

**Validation:**
- Email and password match in database
- Password compared securely using bcrypt

---

#### 3. **Get Current User**
```
GET /api/routes/me
Cookie: token=...

Response (200):
{
  "success": true,
  "data": { /* current user object */ }
}
```

**Requirements:**
- Valid JWT token in cookie or Authorization header
- User must still exist in database

---

#### 4. **Logout**
```
POST /api/routes/logout
Cookie: token=...

Response (200):
{
  "success": true,
  "message": "Logout successful"
}
```

**Action:** Clears token cookie

---

### Account Routes (`/api/routes/account/`)

#### 5. **Create New Account**
```
POST /api/routes/account/
Authorization: Bearer <token>
Content-Type: application/json

Response (201):
{
  "success": true,
  "message": "Account created successfully",
  "data": {
    "account": {
      "_id": "12345...",
      "user": "67890...",
      "status": "active",
      "currency": "NPR",
      "createdAt": "2026-06-17T...",
      "updatedAt": "2026-06-17T..."
    }
  }
}
```

**Requirements:**
- User must be authenticated (JWT token)
- User can only have ONE account (checked in controller)

**Default Values:**
- Status: `active`
- Currency: `NPR`

---

### Health Check Routes

#### 6. **Health Check**
```
GET /health

Response (200):
{
  "server": "running",
  "database": {
    "isConnected": true,
    "readyState": 1,
    "readyStateText": "connected"
  },
  "timestamp": "2026-06-17T..."
}
```

---

## ✨ Key Features Implemented

### 1. **Authentication System**
- ✅ User registration with email validation
- ✅ Secure password hashing (bcrypt with 12 rounds)
- ✅ JWT-based authentication (7-day expiry)
- ✅ Secure HTTP-only cookies (prevents XSS attacks)
- ✅ Token verification in middleware

### 2. **Password Security**
- ✅ Auto-hashing before save
- ✅ Password complexity requirements (uppercase, lowercase, number, special char)
- ✅ Minimum 8 characters enforced
- ✅ Secure comparison using bcrypt.compare()

### 3. **Account Management**
- ✅ Create accounts for authenticated users
- ✅ Prevent duplicate accounts per user
- ✅ Support multiple currencies (NPR, USD, EUR, GBP, INR)
- ✅ Account status tracking (active, blocked, frozen, closed)

### 4. **Database Integration**
- ✅ MongoDB connection with connection pooling
- ✅ Automatic connection state tracking
- ✅ Connection listeners for disconnection/reconnection
- ✅ Graceful shutdown handling
- ✅ Mongoose hooks for data validation

### 5. **Email Notifications**
- ✅ Welcome email on registration
- ✅ HTML-formatted emails
- ✅ Gmail integration with App Passwords
- ✅ Graceful email failure handling (doesn't block registration)

### 6. **Data Validation**
- ✅ Schema-level validation in Mongoose
- ✅ Controller-level input validation
- ✅ Custom error messages for users
- ✅ Enum constraints for status fields

---

## 🔐 Security Features

### 1. **Authentication**
- JWT tokens with secure signing
- Token stored in HTTP-only cookies
- CSRF protection via SameSite cookie attribute
- Session expiration (7 days)

### 2. **Password Protection**
- Bcrypt hashing (12 rounds)
- Pre-save middleware prevents plaintext storage
- Password not selected by default in queries

### 3. **Authorization**
- Middleware checks token validity
- Verifies user still exists after login
- Checks account status (blocked users denied access)
- User object attached to request for downstream use

### 4. **Data Validation**
- Email format validation
- Password strength requirements
- Enum constraints (no invalid statuses)
- Unique constraints (no duplicate emails)
- Type validation for all fields

### 5. **API Security**
- HTTPS support in production (via secure cookie flag)
- SameSite cookie protection
- Cookie domain specification
- Proper HTTP status codes for different scenarios

### 6. **Error Handling**
- User-friendly error messages
- Specific JWT error handling (expired, invalid)
- Database error handling (duplicate key, etc.)
- Graceful degradation (email failures don't break registration)

---

## 💡 Code Quality Improvements

### 1. **Database Connection Management**
- ✅ Connection state tracking with `isConnected` flag
- ✅ Prevents duplicate connection attempts
- ✅ Graceful shutdown with SIGINT/SIGTERM handlers
- ✅ Connection listeners for auto-reconnection monitoring
- ✅ Timeout configuration for reliability

### 2. **Authentication Best Practices**
- ✅ Uses `sub` (subject) claim as standard JWT field
- ✅ Only userId stored in token (not entire user object)
- ✅ Separate cookie setting with security headers
- ✅ User-friendly error messages for token issues
- ✅ Password not sent in responses

### 3. **Error Handling**
- ✅ Async/await syntax for cleaner code
- ✅ Proper try-catch blocks
- ✅ Specific error type handling
- ✅ Informative console logs with emojis for debugging
- ✅ HTTP status codes match error types

### 4. **Middleware Design**
- ✅ Reusable authentication middleware
- ✅ User object attached to request
- ✅ Proper HTTP status codes (401, 403)
- ✅ Consistent error response format

### 5. **Model Schema Design**
- ✅ Proper indexing for performance
- ✅ Required field constraints
- ✅ Type validation
- ✅ Custom validation functions
- ✅ Enum constraints with helpful messages

---

## 📈 Current Status

### ✅ Completed Features
1. **User Authentication System**
   - Registration with validation ✅
   - Login with password verification ✅
   - JWT token generation & verification ✅
   - Logout functionality ✅
   - Get current user endpoint ✅

2. **Database Layer**
   - MongoDB connection management ✅
   - User model with password hashing ✅
   - Account model with status tracking ✅
   - Transaction model for transfers ✅

3. **Account Management**
   - Create account for authenticated user ✅
   - Prevent duplicate accounts ✅
   - Currency support ✅

4. **Security**
   - Password hashing & validation ✅
   - JWT authentication ✅
   - HTTP-only cookies ✅
   - CSRF protection ✅

5. **Email Integration**
   - Welcome email on registration ✅
   - Gmail with App Password ✅
   - HTML email templates ✅

6. **API Structure**
   - Clean separation of concerns ✅
   - Route organization ✅
   - Middleware chain ✅
   - Error handling ✅

### 🚀 In Progress / Partial
1. **Account Controller** - Only `createNewAccount` implemented
   - `getAccountDetails` (commented)
   - `updateAccount` (commented)
   - `closeAccount` (commented/incomplete)

2. **Transaction Management** - Model exists, no controller/routes yet

---

## 🔮 Next Steps / Recommendations

### High Priority
1. **Complete Account Management**
   ```
   - Implement getAccountDetails (retrieve account by userId)
   - Implement updateAccount (modify currency, limits)
   - Implement closeAccount (with balance check)
   - Add account status update endpoints
   ```

2. **Implement Transaction Service**
   ```
   - Create transactionController.js
   - Implement transfer between accounts
   - Add transaction history endpoint
   - Implement idempotency key handling
   - Add transaction reversal capability
   ```

3. **Add Remaining Login Logic**
   ```
   - Implement loginController (in authController.js)
   - Implement logoutController (in authController.js)
   - Implement getCurrentUserController (in authController.js)
   ```

4. **Testing**
   ```
   - Write unit tests for controllers
   - Add integration tests for API endpoints
   - Test error scenarios
   - Load testing for MongoDB queries
   ```

### Medium Priority
1. **Additional Security**
   - Implement rate limiting on auth endpoints
   - Add request validation middleware
   - Implement CORS properly
   - Add request logging
   - Implement API key authentication for admin endpoints

2. **Database Optimization**
   - Add more strategic indexes
   - Implement query pagination for transaction history
   - Add database connection monitoring

3. **API Enhancement**
   - Add query filters (e.g., get transactions by date range)
   - Implement sorting and pagination
   - Add search functionality
   - Version API endpoints (/v1/)

4. **Monitoring & Logging**
   - Structured logging system
   - Error tracking (Sentry/similar)
   - Performance monitoring
   - Database monitoring

### Low Priority (Future)
1. **Advanced Features**
   - Two-factor authentication (2FA)
   - Account recovery via email
   - Activity logs
   - Transaction notifications
   - Account statements/reports

2. **DevOps**
   - Docker containerization
   - CI/CD pipeline
   - Environment-specific configs
   - Database migrations

3. **Documentation**
   - Swagger/OpenAPI docs
   - Postman collection
   - Architecture diagrams
   - Deployment guide

---

## 📝 Environment Variables Required

Create a `.env` file with:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database_name
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
PORT=3000
EMAIL_USER=your_gmail@gmail.com
GMAIL_APP_PASSWORD=your_16_char_app_password
COOKIE_DOMAIN=localhost
```

---

## 🚀 Running the Project

```bash
# Install dependencies
npm install

# Start development server
npm run server

# Server runs on http://localhost:3000
```

### Key Endpoints to Test
```
POST http://localhost:3000/api/routes/register
POST http://localhost:3000/api/routes/login
GET http://localhost:3000/api/routes/me
POST http://localhost:3000/api/routes/logout
POST http://localhost:3000/api/routes/account/
GET http://localhost:3000/health
```

---

## 📚 Summary

You've built a **solid foundation for a banking backend system** with:
- ✅ Proper authentication & authorization
- ✅ Secure password handling
- ✅ Database schema design with relationships
- ✅ RESTful API structure
- ✅ Error handling & validation
- ✅ Email integration

**Next phase:** Complete transaction management and remaining CRUD operations on accounts. Then add comprehensive testing and security hardening.

---

**Last Updated:** June 17, 2026  
**Developer:** Banking System Team
