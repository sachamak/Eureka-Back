import { Router } from "express";
import ChatBotHandler from "../controllers/chatbot_controller";

const router = Router();

router.post("/", ChatBotHandler.handleChat);

export default router;
