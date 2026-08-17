import { tavily } from "@tavily/core";
import { tool } from "ai";
import { z } from "zod";

const client = tavily({
  apiKey: process.env.TAVILY_API_KEY!,
});

export const webSearch = tool({
  description:
    "Search the web for current or up-to-date information that may not be available in the model's knowledge.",

  inputSchema: z.object({
    query: z.string().describe("The search query to look up on the web"),
  }),

  execute: async ({ query }) => {
    const response = await client.search(query, {
      searchDepth: "basic",
      maxResults: 5,
    });

    return response.results.map((result) => ({
      title: result.title,
      url: result.url,
      content: result.content,
    }));
  },
});