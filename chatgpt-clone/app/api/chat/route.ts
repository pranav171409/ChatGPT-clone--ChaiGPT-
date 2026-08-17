import {
    loadChatMessages,
    saveChatMessages,
  } from "@/features/ai/actions/chat-store";
  import { getChatModel } from "@/features/ai/utils/model";
  import { requireUser } from "@/features/auth/action/require-user";
  import { prisma } from "@/lib/db";
  import { auth } from "@clerk/nextjs/server";
  import { webSearch } from "@/features/ai/tools/web-search";
  import {
    convertToModelMessages,
    createIdGenerator,
    createUIMessageStreamResponse,
    streamText,
    stepCountIs,
    toUIMessageStream,
    type UIMessage,
  } from "ai";
  
  export async function POST(req: Request) {
    await auth.protect();
  
    const {
      message,
      id,
      branchId,
      editMessageId,
    }: {
      message: UIMessage;
      id: string;
      branchId: string;
      editMessageId?: string;
    } = await req.json();
  
    if (!message || !id || !branchId) {
      return new Response(
        "Missing message, conversation id, or branch id",
        { status: 400 }
      );
    }
  
    const user = await requireUser();
  
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });
  
    if (!conversation) {
      return new Response("Conversation not found", {
        status: 404,
      });
    }
  
    const branch = await prisma.branch.findFirst({
      where: {
        id: branchId,
        conversationId: id,
      },
    });
  
    if (!branch) {
      return new Response("Branch not found", {
        status: 404,
      });
    }
  
    /*
     * EDIT MESSAGE
     *
     * Delete the edited message and everything after it.
     * The edited message is then saved again and used to
     * generate a completely new response.
     */
    if (editMessageId) {
      const branchMessages = await loadChatMessages(
        id,
        branchId
      );
  
      const editIndex = branchMessages.findIndex(
        (storedMessage) => storedMessage.id === editMessageId
      );
  
      if (editIndex === -1) {
        return new Response("Message to edit not found", {
          status: 404,
        });
      }
  
      const messagesToDelete = branchMessages.slice(editIndex);
  
      const idsToDelete = messagesToDelete.map(
        (storedMessage) => storedMessage.id
      );
  
      if (idsToDelete.length > 0) {
        await prisma.message.deleteMany({
          where: {
            id: {
              in: idsToDelete,
            },
            conversationId: id,
            branchId,
          },
        });
      }
  
      await saveChatMessages(
        id,
        [message],
        { updateTitle: false },
        branchId
      );
    }
  
    /*
     * Load the messages belonging ONLY to the active branch.
     */
    const previousMessages = await loadChatMessages(
      id,
      branchId
    );
  
    const alreadySaved = previousMessages.some(
      (storedMessage) => storedMessage.id === message.id
    );
  
    const messages = alreadySaved
      ? previousMessages
      : [...previousMessages, message];
  
    /*
     * Save a normal new user message.
     *
     * During an edit, the message has already been saved above.
     */
    if (!alreadySaved && !editMessageId) {
      await saveChatMessages(
        id,
        [message],
        {},
        branchId
      );
    }
  
    const result = streamText({
      model: getChatModel(conversation.model),
  
      system:
        conversation.systemPrompt ??
        "You are ChaiGpt, a helpful assistant.",
  
      messages: await convertToModelMessages(messages),
  
      tools: {
        webSearch,
      },
  
      /*
       * Allow one tool step and then stop.
       */
      stopWhen: stepCountIs(2),
    });
  
    result.consumeStream();
  
    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
  
        originalMessages: messages,
  
        generateMessageId: createIdGenerator({
          prefix: "msg",
          size: 16,
        }),
  
        onEnd: async ({ messages: finalMessages }) => {
          try {
            await saveChatMessages(
              id,
              finalMessages,
              { updateTitle: false },
              branchId
            );
          } catch (error) {
            console.error(error);
          }
        },
      }),
    });
  }