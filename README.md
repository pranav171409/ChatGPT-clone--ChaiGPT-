# ChaiGPT — AI Chat with Web Search & Conversation Branching

ChaiGPT is a ChatGPT-style AI application built with Next.js. It extends a basic AI chat application with two production-oriented features:

- AI-powered web search using tool calling
- Conversation branching

The project was developed as part of the **GenAI with JS 2026** assignment.

---

## Features

### 1. AI Web Search

ChaiGPT allows the AI model to automatically use a web search tool when it needs current or up-to-date information.

The application uses **Tavily** for web search.

The flow is:

```text
User Question
      ↓
AI Model
      ↓
Does the question require current information?
      ↓
   Yes
      ↓
Web Search Tool
      ↓
Tavily Search
      ↓
Search Results
      ↓
AI Model
      ↓
Final Response
