import express from 'express'
import  {registerController , loginController}  from '../controller/authController.js'
const router = express.Router()


// creation of register routes
router.post('/register', registerController)
//creation of login routes
router.post('/login', loginController)



export default router