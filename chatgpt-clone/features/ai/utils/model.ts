import { createOpenAI } from "@ai-sdk/openai";

const openrouter = createOpenAI({
    apiKey: process.env.OPENROUTER_API_KEY,
    baseURL: "https://openrouter.ai/api/v1",
});

export const DEFAULT_CHAT_MODEL = "gpt-4o-mini";

export function getChatModel(modelId?: string | null) {
    return openrouter(modelId || DEFAULT_CHAT_MODEL);
}