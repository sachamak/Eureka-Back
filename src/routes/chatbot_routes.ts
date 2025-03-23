import { Router } from "express";
import ChatBotHandler from "../controllers/chatbot_controller";
import { authMiddleware } from "../controllers/auth_controller";

/**
 * @swagger
 * tags:
 *   name: ChatBot
 *   description: AI ChatBot API for travel assistance
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     ChatRequest:
 *       type: object
 *       required:
 *         - message
 *       properties:
 *         message:
 *           type: string
 *           description: The user's message to the chatbot
 *       example:
 *         message: "What are the best places to visit in Rome?"
 *     ChatResponse:
 *       type: object
 *       properties:
 *         reply:
 *           type: string
 *           description: The chatbot's response to the user's message
 *       example:
 *         reply: "Rome offers many remarkable attractions such as the Colosseum, Vatican City with St. Peter's Basilica and the Sistine Chapel, the Roman Forum, Trevi Fountain, and the Pantheon. For a more local experience, I recommend visiting Trastevere neighborhood for authentic cuisine and atmosphere."
 */

const router = Router();

/**
 * @swagger
 * /chatbot:
 *   post:
 *     summary: Get a response from the AI chatbot
 *     description: Send a message to the travel assistant AI chatbot and receive a helpful response
 *     tags: [ChatBot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: Successful response from the chatbot
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Bad request, invalid message format or missing message
 *       500:
 *         description: Internal server error or AI service unavailable
 */
router.post("/",authMiddleware, ChatBotHandler.handleChat);

export default router;