import { ChatMessage, UserStory } from '../types';

// The OpenAI service must use its specific API key.
// We will only use OPENAI_API_KEY for this service.
const FALLBACK_API_KEY = process.env.OPENAI_API_KEY;

const callOpenAIWithPrompts = async (
    systemPrompt: string,
    userPrompt: string,
    options: { jsonOutput?: boolean } = {}
): Promise<any> => {
    if (!FALLBACK_API_KEY) {
        throw new Error("OpenAI API key not configured. Fallback is disabled.");
    }

    const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
    ];

    const body: any = {
        model: "gpt-4o",
        messages,
    };

    if (options.jsonOutput) {
        body.response_format = { type: "json_object" };
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FALLBACK_API_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API request failed: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
        throw new Error("Invalid response from OpenAI");
    }

    return options.jsonOutput ? JSON.parse(content) : content;
};

export const fallbackGenerateIdeas = (topic: string): Promise<{ ideas: string[] }> => {
    const systemPrompt = `You are a helpful assistant that only responds with valid JSON. Do not add any explanatory text. The JSON object you return must have a single key "ideas" which is an array of strings.`;
    const userPrompt = `Brainstorm 5 concise, actionable ideas related to the following topic: "${topic}".`;
    return callOpenAIWithPrompts(systemPrompt, userPrompt, { jsonOutput: true });
};

export const fallbackGenerateUserStory = (idea: string): Promise<UserStory> => {
    const systemPrompt = `You are a helpful assistant that only responds with valid JSON. Do not add any explanatory text. The JSON object you return must conform to the UserStory format with three keys: "asA", "iWantTo", and "soThat".`;
    const userPrompt = `Generate a user story for the idea: "${idea}"`;
    return callOpenAIWithPrompts(systemPrompt, userPrompt, { jsonOutput: true });
};

export const fallbackGenerateAcceptanceCriteria = (storyText: string): Promise<{ criteria: string[] }> => {
    const systemPrompt = `You are a helpful assistant that only responds with valid JSON. Do not add any explanatory text. The JSON object you return must have a single key "criteria" which is an array of strings.`;
    const userPrompt = `Generate a list of 3-5 acceptance criteria for the following user story: "${storyText}".`;
    return callOpenAIWithPrompts(systemPrompt, userPrompt, { jsonOutput: true });
};

export const fallbackSummarizeVision = (itemsJson: string): Promise<string> => {
    const systemPrompt = `You are a seasoned lead architect. You synthesize vision board items into actionable project vision summaries.`;
    const userPrompt = `The following is a list of items from a vision board: ${itemsJson}. Synthesize these points into a short, actionable project vision summary. Focus on the MVP items first, and outline the core tech stack implications.`;
    return callOpenAIWithPrompts(systemPrompt, userPrompt);
};

export const fallbackGenerateText = (systemPrompt: string, userPrompt: string): Promise<string> => {
    return callOpenAIWithPrompts(systemPrompt, userPrompt);
};

export const fallbackFamilyChat = async (systemPrompt: string, history: ChatMessage[], newMessage: string): Promise<string> => {
    if (!FALLBACK_API_KEY) {
        throw new Error("OpenAI API key not configured. Fallback is disabled.");
    }

    const conversationHistory = history.filter(msg => !msg.text.startsWith('You are now chatting with'));

    const messages = [
        { role: 'system' as const, content: systemPrompt },
        ...conversationHistory.map(msg => ({ role: (msg.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant', content: msg.text })),
        { role: 'user' as const, content: newMessage }
    ];

    const body = {
        model: "gpt-4o",
        messages,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${FALLBACK_API_KEY}`
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error("OpenAI API error:", errorData);
        throw new Error(`OpenAI API request failed: ${errorData?.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "I seem to be at a loss for words.";
};
