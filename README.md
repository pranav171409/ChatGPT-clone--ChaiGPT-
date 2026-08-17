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
```

The web search tool:

- Uses Tavily API
- Searches the web for relevant information
- Returns search results to the AI model
- Allows the model to continue generating the final response
- Supports streamed AI responses

---

### 2. Conversation Branching

Users can create a new conversation branch from a previous message.

A branch preserves the conversation history up to the selected message and allows the user to continue the conversation independently.

Example:

```text
Main Branch

User: Explain React
AI: React is...

User: What are hooks?
AI: Hooks are...
       ↓
   Branch from here
       ↓

New Branch

User: Explain hooks with examples
AI: ...
```

Each branch has its own message history.

Users can:

- Create a branch from a message
- Switch between branches
- Rename branches
- Preserve branch history
- Continue conversations independently

The default `Main` branch cannot be renamed.

---

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

### AI

- AI SDK
- OpenRouter / OpenAI-compatible model
- Tavily Web Search

### Backend

- Next.js API Routes
- Server Actions
- Prisma ORM

### Database

- PostgreSQL

### Authentication

- Clerk

### Deployment

- Vercel

---

## Project Structure

```text
chatgpt-clone/
│
├── app/
│   ├── (root)/
│   │   ├── c/
│   │   └── ...
│   │
│   └── api/
│       └── chat/
│
├── components/
│   └── ai-elements/
│
├── features/
│   ├── ai/
│   │   ├── actions/
│   │   ├── tools/
│   │   └── utils/
│   │
│   ├── conversations/
│   │   ├── actions/
│   │   ├── components/
│   │   └── hooks/
│   │
│   └── messages/
│
├── lib/
│   └── db.ts
│
├── prisma/
│   ├── migrations/
│   └── schema.prisma
│
├── public/
│
├── package.json
├── next.config.ts
└── README.md
```

---

## Web Search Tool

The web search tool is implemented using Tavily.

The AI model receives the tool definition and can decide when the tool should be called.

The tool accepts a search query and returns relevant search results containing:

- Title
- URL
- Content

The AI model then uses those results to generate the final answer.

---

## Conversation Branching Architecture

Branches are stored in the database and belong to a conversation.

Each message can optionally belong to a branch.

The main relationships are:

```text
User
 │
 └── Conversation
       │
       ├── Main Branch
       │      └── Messages
       │
       ├── Branch 1
       │      └── Messages
       │
       └── Branch 2
              └── Messages
```

When a branch is created from a message:

1. The selected message is identified.
2. The source branch is determined.
3. Messages up to that point are copied.
4. A new branch is created.
5. The user is redirected to the new branch.
6. Further messages are stored independently in that branch.

---

## Environment Variables

Create a `.env` file locally.

```env
DATABASE_URL=

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_SIGN_IN_FALLBACK_REDIRECT_URL=/sign-in
NEXT_PUBLIC_SIGN_UP_FALLBACK_REDIRECT_URL=/sign-in

OPENROUTER_API_KEY=

TAVILY_API_KEY=
```

Do not commit your `.env` file or expose API keys publicly.

---

## Getting Started

### 1. Clone the repository

```bash
git clone <your-github-repository-url>
```

### 2. Enter the project directory

```bash
cd chatgpt-clone
```

### 3. Install dependencies

```bash
bun install
```

### 4. Configure environment variables

Create a `.env` file and add the required environment variables.

### 5. Generate Prisma Client

```bash
bunx prisma generate
```

### 6. Run the development server

```bash
bun run dev
```

Open:

```text
http://localhost:3000
```

---

## Database

The application uses PostgreSQL with Prisma.

The database contains models for:

- Users
- Conversations
- Branches
- Messages

Branches are connected to conversations, while messages can belong to individual branches.

---

## Streaming

AI responses are streamed to the client using the AI SDK.

The application supports:

- Streaming assistant responses
- Tool execution during generation
- Tool results
- Final AI responses

---

## Deployment

The application is deployed using Vercel.

**Live Demo:**

<PASTE-YOUR-VERCEL-LINK-HERE>

---

## Assignment Requirements

### Phase 1 — AI Tools

| Requirement | Status |
|---|---|
| Integrate Web Search tool | ✅ |
| Allow LLM to decide when to call the tool | ✅ |
| Stream tool execution and final response | ✅ |
| Store tool calls/responses | ✅ |
| Handle loading/error states | ✅ |

### Phase 2 — Chat Branching

| Requirement | Status |
|---|---|
| Create branch from any message | ✅ |
| View and switch between branches | ✅ |
| Persist branch history | ✅ |
| Rename branches | ✅ |
| Clean branch navigation UI | ✅ |

---

## Evaluation Areas

The project implements the required areas of the assignment:

- Tool Integration
- Tool Invocation
- Streaming
- Error Handling
- Database Persistence
- Branch Creation
- Branch Navigation
- Branch Management
- Branch Persistence
- User Interface
- Deployment

---

## Author

**Pranav Kore**

B.Tech — Information Technology

GenAI with JS 2026
