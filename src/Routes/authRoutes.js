import express from 'express'
import  {registerController , loginController , logoutController , getCurrentUserController}  from '../controller/authController.js'
const router = express.Router()


// creation of register routes
router.post('/register', registerController)
//creation of login routes
router.post('/login', loginController)
// this controller route , logout garaxa user lai
router.post('/logout', logoutController);
// yo controller route le basically current user lai user yaad garerakhxa ani user obj return garxa
router.get('/me', getCurrentUserController);


export default router