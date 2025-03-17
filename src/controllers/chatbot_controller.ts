import { Request, Response } from "express";
import { generateContent } from "../services/gemini-service";

const handleChat = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).send({ error: "Message is required" });
    }

    const reply = await generateContent(message);
    res.send(reply);
  } catch (error) {
    console.error("Chatbot Error:", error);
    res.status(500).send({ error: "Failed to process message" });
  }
};

export default { handleChat };
