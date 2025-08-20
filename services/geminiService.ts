import { Type, GenerateContentResponse } from "@google/genai";
import { UserStory, VisionItem, Priority } from '../types';
import { ai } from './ai';

const userStorySchema = {
  type: Type.OBJECT,
  properties: {
    asA: { type: Type.STRING, description: "The user persona or role. Example: 'a project manager'" },
    iWantTo: { type: Type.STRING, description: "The action the user wants to perform. Example: 'track task progress visually'" },
    soThat: { type: Type.STRING, description: "The benefit or goal the user achieves. Example: 'I can understand the project status at a glance'" }
  },
  required: ['asA', 'iWantTo', 'soThat']
};

export const generateIdeas = async (topic: string): Promise<string[]> => {
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Brainstorm 5 concise, actionable ideas related to the following topic: "${topic}". Present them as a simple list.`,
       config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ideas: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ['ideas']
          }
       }
    });
    
    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.ideas || [];

  } catch (error) {
    console.error("Gemini 'generateIdeas' failed:", error);
    return [];
  }
};

export const generateUserStory = async (idea: string): Promise<UserStory | null> => {
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on this idea: "${idea}", create a user story with the format: 'As a [user type], I want to [action], so that [benefit].'`,
            config: {
                responseMimeType: "application/json",
                responseSchema: userStorySchema,
            },
        });
        return JSON.parse(response.text) as UserStory;
    } catch (error) {
        console.error("Gemini 'generateUserStory' failed:", error);
        return null;
    }
};

export const generateAcceptanceCriteria = async (story: UserStory): Promise<string[]> => {
    const storyText = `As a ${story.asA}, I want to ${story.iWantTo} so that ${story.soThat}.`;
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a list of 3-5 acceptance criteria for the following user story: "${storyText}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        criteria: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING }
                        }
                    },
                    required: ['criteria']
                },
            },
        });
        const jsonResponse = JSON.parse(response.text);
        return jsonResponse.criteria || [];
    } catch (error) {
        console.error("Gemini 'generateAcceptanceCriteria' failed:", error);
        return [];
    }
};

export const summarizeVision = async (items: VisionItem[]): Promise<string> => {
    const itemsJson = JSON.stringify(items.map(item => ({ type: item.type, content: item.content, priority: item.priority })));
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The following is a list of items from a vision board: ${itemsJson}. Synthesize these points into a short, actionable project vision summary, in the style of a seasoned lead architect. Focus on the MVP items first, and outline the core tech stack implications.`,
        });
        return response.text;
    } catch (error) {
        console.error("Gemini 'summarizeVision' failed:", error);
        return "Could not generate summary due to an error.";
    }
};

export const generateStyleSuggestions = async (content: string, priority: Priority): Promise<Array<{ styleName: string; promptHint: string }>> => {
  const priorityContext = {
    [Priority.MVP]: "This is a critical, core feature for the Minimum Viable Product.",
    [Priority.FUTURE]: "This is a feature planned for a future release, good for aspirational visuals.",
    [Priority.PARKING_LOT]: "This is an idea that is currently on hold, but worth exploring visually.",
    [Priority.NONE]: "This item has no specific priority."
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `For the project idea: "${content}", which has a priority context of "${priorityContext[priority]}", suggest 3 distinct photorealistic art styles for a promotional or conceptual image. For each style, provide a name and a detailed prompt hint.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              description: "An array of 3 style suggestions.",
              items: {
                type: Type.OBJECT,
                properties: {
                  styleName: { type: Type.STRING, description: "A catchy name for the art style, e.g., 'Cinematic Noir'." },
                  promptHint: { type: Type.STRING, description: "A detailed hint to be appended to a prompt for image generation, e.g., 'ultra-realistic, dramatic shadows, film grain, 8k'." }
                },
                required: ["styleName", "promptHint"]
              }
            }
          },
          required: ["suggestions"]
        }
      }
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.suggestions || [];

  } catch (error) {
    console.error("Gemini 'generateStyleSuggestions' failed:", error);
    return [];
  }
};

export const generateImageAndSummary = async (prompt: string): Promise<{ imageUrl: string, summary: string } | null> => {
    try {
        const [imageResponse, summaryResponse] = await Promise.all([
            ai.models.generateImages({
                model: 'imagen-3.0-generate-002',
                prompt: `Photorealistic, cinematic, high-detail, epic lighting: ${prompt}`,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '16:9',
                },
            }),
            ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: `Analyze this prompt and provide a one-sentence, poetic summary of the visual it describes: "${prompt}"`,
            })
        ]);
        
        const base64ImageBytes = imageResponse.generatedImages[0]?.image.imageBytes;
        if (!base64ImageBytes) {
            throw new Error("Image generation failed to return data.");
        }
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        const summary = summaryResponse.text;

        return { imageUrl, summary };

    } catch (error) {
        console.error("Gemini 'generateImageAndSummary' failed:", error);
        return null;
    }
};

export const generateHaiku = async (summary: string): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the following theme, write a haiku (5-7-5 syllables): "${summary}"`
        });
        return response.text;
    } catch (error) {
        console.error("Gemini 'generateHaiku' failed:", error);
        return "Could not generate haiku.";
    }
};

export const generateStoryFromInference = async (summary: string, genre: string): Promise<UserStory | null> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Based on the visual concept of "${summary}" and the genre "${genre}", create a compelling user story. The story must be in the format: 'As a [character], I want to [action/plot point], so that [goal/outcome]'. Be creative and ensure the character, action, and goal are fitting for the specified genre.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: userStorySchema,
            },
        });
        return JSON.parse(response.text) as UserStory;
    } catch (error) {
        console.error("Gemini 'generateStoryFromInference' failed:", error);
        return null;
    }
};