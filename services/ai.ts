import { GoogleGenAI } from "@google/genai";

// Assuming `process.env.API_KEY` is provided by the execution environment as per instructions.
// The SDK itself will handle the validation of the API key.
export const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
