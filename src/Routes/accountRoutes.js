import express from "express";
import { authMiddlewareFunction } from "../middleware/authMiddleware.js";
import { createNewAccount } from "../controller/accountController.js";

const accountRouter = express.Router(); // Use this, not 'router'

// Post route to create a new account
accountRouter.post("/", authMiddlewareFunction, createNewAccount); // Use accountRouter

export default accountRouter;