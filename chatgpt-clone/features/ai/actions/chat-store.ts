"use server";

import { isTextUIPart, type UIMessage } from "ai";
import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";

/** Extracts plain text from an AI SDK UIMessage. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

/**
 * Normalizes stored message parts from the database into AI SDK UIMessage parts.
 */
function toUIMessageParts(
  parts: Prisma.JsonValue | null,
  content: string
): UIMessage["parts"] {
  const stored = parts as UIMessage["parts"] | null;

  if (Array.isArray(stored) && stored.length > 0) {
    return stored;
  }

  return [{ type: "text", text: content }];
}

/**
 * Loads all messages for a specific branch.
 */
export async function loadChatMessages(
  conversationId: string,
  branchId: string
): Promise<UIMessage[]> {
  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      branchId,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return rows.map((row) => ({
    id: row.id,
    role: row.role === "ASSISTANT" ? "assistant" : "user",
    parts: toUIMessageParts(row.parts, row.content),
  }));
}

type SaveChatMessagesOptions = {
  updateTitle?: boolean;
};

/**
 * Saves AI SDK UI messages into a specific branch.
 *
 * If no branchId is supplied, the Main branch is used.
 */
export async function saveChatMessages(
  conversationId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {},
  branchId?: string
) {
  const { updateTitle = true } = options;

  // Find the requested branch, or fall back to Main.
  const branch = branchId
    ? await prisma.branch.findFirst({
        where: {
          id: branchId,
          conversationId,
        },
      })
    : await prisma.branch.findFirst({
        where: {
          conversationId,
          name: "Main",
        },
        orderBy: {
          createdAt: "asc",
        },
      });

  if (!branch) {
    throw new Error("Branch not found");
  }

  for (const message of messages) {
    if (message.role === "system") {
      continue;
    }

    const content = getMessageText(message);

    const role =
      message.role === "assistant"
        ? "ASSISTANT"
        : "USER";

    await prisma.message.upsert({
      where: {
        id: message.id,
      },

      create: {
        id: message.id,
        conversationId,
        branchId: branch.id,
        role,
        status: "COMPLETE",
        content,
        parts: message.parts as Prisma.InputJsonValue,
      },

      update: {
        content,
        parts: message.parts as Prisma.InputJsonValue,
        status: "COMPLETE",
        branchId: branch.id,
      },
    });
  }

  // Update conversation activity/title.
  const conversation =
    await prisma.conversation.findUniqueOrThrow({
      where: {
        id: conversationId,
      },
      select: {
        title: true,
      },
    });

  const firstUser = messages.find(
    (message) => message.role === "user"
  );

  const firstUserText = firstUser
    ? getMessageText(firstUser).trim()
    : "";

  await prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data: {
      lastMessageAt: new Date(),

      title:
        updateTitle &&
        conversation.title === "New Chat" &&
        firstUserText
          ? firstUserText.slice(0, 48)
          : conversation.title,
    },
  });
}