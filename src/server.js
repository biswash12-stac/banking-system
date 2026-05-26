import dotenv from "dotenv"
dotenv.config()
import express from "express"
import { connectdb, getConnectionStatus } from "./lib/db.Connect.js"
import router from "./Routes/authRoutes.js"
const app = express()


// middleware
app.use(express.json())

app.use('/api/routes', router )





// Test route
app.get("/", (req, res) => {
  res.json({ 
    message: 'Hello World',
    dbStatus: getConnectionStatus()
  })
})


// Health check route (useful for monitoring)
app.get("/health", (req, res) => {
  const status = getConnectionStatus()
  res.json({
    server: 'running',
    database: status,
    timestamp: new Date().toISOString()
  })
})

// ✅ CORRECT: Start server only after DB connects
const startServer = async () => {
  try {
    // First connect to database
    await connectdb()
    
    // Then start server
    app.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3000}`)
      console.log(`📊 DB Status:`, getConnectionStatus())
    })
  } catch (error) {
    console.error("❌ Failed to start server:", error.message)
    process.exit(1)
  }
}

// Start your application
startServer()

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT. Closing server...')
  await disconnectDb()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM. Closing server...')
  await disconnectDb()
  process.exit(0)
})