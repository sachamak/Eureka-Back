import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateContent = async (userMessage: string): Promise<string> => {
  try {
    const genAI = new GoogleGenerativeAI("AIzaSyBuhqOtRNZq2954QjKMsI66vbbwCNIjsfU"); 
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
    You are an expert travel guide with extensive knowledge of attractions, restaurants, entertainment spots, and hidden gems worldwide.
    Your task is to provide users with personalized recommendations based on their requests. 
  
    - If a user asks for general recommendations, suggest the best options based on location and popularity.
    - If a user asks about a specific place, provide details including highlights, best times to visit, pricing, and insider tips.
    - If a user wants food recommendations, include cuisine type, must-try dishes, and restaurant ambiance.
    - If a user needs an itinerary, suggest a well-balanced plan with attractions, dining, and relaxation.
  
    Be engaging, informative, and provide additional tips when necessary.
  
    User's question: "${userMessage}"
  
    Your response:
  `;

    const result = await model.generateContent(prompt);
    console.log("Gemini AI response:", result.response.text());
    return result.response.text();
  } catch (error) {
    console.error("Error fetching response from Gemini:", error);
    throw new Error("Failed to fetch AI response");
  }
};
