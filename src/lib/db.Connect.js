import mongoose from "mongoose";

// flag to track mongoose connection 
let isConnected = false

export const connectdb = async () => {
  // check for already existing connection
  if (isConnected) {
    console.log("📌 Using existing connection")
    return
  }
  
  // check if the db is already connected or not
  if (mongoose.connection.readyState === 1) {
    isConnected = true
    console.log("📌 DB is already connected")
    return
  }

  // actual error handling during connection
  try {
    const connect = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 3,
      retryReads: true,
      retryWrites: true
    })
    
    isConnected = true
    console.log("✅ DB connection is successful")
    console.log(`📊 Host: ${connect.connection.host}`)
    console.log(`📁 Database: ${connect.connection.name}`)

    // setup connection listeners
    setupConnectionListeners()

  } catch (error) {
    console.log('❌ DB connection failed:', error.message)
    throw error
  }
}

// setup connection listeners
export const setupConnectionListeners = () => {
  // FIXED: Correct event names (all lowercase)
  mongoose.connection.on('disconnected', () => {
    console.log("⚠️ DB is disconnected")
    isConnected = false
  })

  mongoose.connection.on('reconnected', () => {
    console.log("✅ DB is reconnected")
    isConnected = true
  })
  
  mongoose.connection.on('error', (err) => {
    console.error("❌ Mongoose connection error:", err.message)
    isConnected = false
  })
}

// function to disconnect db gracefully
export const disconnectDb = async () => {
  if (!isConnected && mongoose.connection.readyState === 0) return;

  try {
    await mongoose.disconnect()
    isConnected = false
    console.log("✅ DB disconnected successfully")
  } catch(error) {
    console.error("❌ Error in DB disconnection:", error.message)
  }
}

// handles the connection status of db
export const getConnectionStatus = () => {
  // FIXED: Proper return syntax
  return {
    isConnected: isConnected,
    readyState: mongoose.connection.readyState,
    readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
  }
}