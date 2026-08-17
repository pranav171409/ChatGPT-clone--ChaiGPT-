"use server";

import { requireUser } from "@/features/auth/action/require-user";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

/** Shape of a conversation row returned in the sidebar list. */
export type ConversationListItem = {
  id: string;
  title: string;
  isPinned: boolean;
  isArchived: boolean;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Verifies that a conversation exists and belongs to the given user.
 */
async function assertOwnsConversation(
  conversationId: string,
  userId: string
) {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
  });

  if (!conversation) {
    throw new Error("Conversation not found");
  }

  return conversation;
}

/**
 * Fetches a single conversation owned by the current user.
 */
export async function getConversation(conversationId: string) {
  const user = await requireUser();
  return assertOwnsConversation(conversationId, user.id);
}

/**
 * Lists non-archived conversations for the current user.
 */
export async function listConversations(): Promise<
  ConversationListItem[]
> {
  const user = await requireUser();

  return prisma.conversation.findMany({
    where: {
      userId: user.id,
      isArchived: false,
    },
    orderBy: [
      { isPinned: "desc" },
      { lastMessageAt: "desc" },
    ],
    select: {
      id: true,
      title: true,
      isPinned: true,
      isArchived: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Creates a new conversation for the current user.
 */
export async function createConversation(
  title = "New Chat"
) {
  const user = await requireUser();

  return prisma.conversation.create({
    data: {
      userId: user.id,
      title: title.trim() || "New Chat",

      branches: {
        create: {
          name: "Main",
        },
      },
    },

    include: {
      branches: true,
    },
  });
}

/**
 * Updates conversation metadata.
 */
export async function updateConversation(
  conversationId: string,
  data: {
    title?: string;
    isPinned?: boolean;
    isArchived?: boolean;
  }
) {
  const user = await requireUser();

  await assertOwnsConversation(
    conversationId,
    user.id
  );

  const conversation = await prisma.conversation.update({
    where: {
      id: conversationId,
    },

    data: {
      ...(data.title !== undefined
        ? {
            title:
              data.title.trim() || "New Chat",
          }
        : {}),

      ...(data.isPinned !== undefined
        ? {
            isPinned: data.isPinned,
          }
        : {}),

      ...(data.isArchived !== undefined
        ? {
            isArchived: data.isArchived,
          }
        : {}),
    },
  });

  revalidatePath("/");
  revalidatePath(`/c/${conversationId}`);

  return conversation;
}

/**
 * Permanently deletes a conversation owned by the current user.
 */
export async function deleteConversation(
  conversationId: string
) {
  const user = await requireUser();

  await assertOwnsConversation(
    conversationId,
    user.id
  );

  await prisma.conversation.delete({
    where: {
      id: conversationId,
    },
  });

  revalidatePath("/");

  return {
    id: conversationId,
  };
}

/**
 * Creates a new branch from a message.
 *
 * The new branch receives a copy of all messages
 * up to and including the selected parent message.
 */
export async function createBranch(
  conversationId: string,
  parentMessageId: string,
  name = "New Branch"
) {
  const user = await requireUser();

  await assertOwnsConversation(
    conversationId,
    user.id
  );

  const parentMessage = await prisma.message.findFirst({
    where: {
      id: parentMessageId,
      conversationId,
    },
  });

  if (!parentMessage) {
    throw new Error("Parent message not found");
  }

  if (!parentMessage.branchId) {
    throw new Error(
      "Parent message is not attached to a branch"
    );
  }

  const sourceBranch = await prisma.branch.findUnique({
    where: {
      id: parentMessage.branchId,
    },
  });

  if (!sourceBranch) {
    throw new Error("Source branch not found");
  }

  const messagesToCopy =
    await prisma.message.findMany({
      where: {
        conversationId,
        branchId: sourceBranch.id,
        createdAt: {
          lte: parentMessage.createdAt,
        },
      },

      orderBy: {
        createdAt: "asc",
      },
    });

  const newBranch = await prisma.branch.create({
    data: {
      conversationId,
      parentMessageId,
      name: name.trim() || "New Branch",
    },
  });

  for (const message of messagesToCopy) {
    await prisma.message.create({
      data: {
        conversationId,
        branchId: newBranch.id,
        role: message.role,
        status: message.status,
        content: message.content,
        parts: message.parts ?? [],
        metadata: message.metadata ?? undefined,
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
    });
  }

  revalidatePath(`/c/${conversationId}`);

  return newBranch;
}

/**
 * Lists all branches belonging to a conversation.
 */
export async function listBranches(
  conversationId: string
) {
  const user = await requireUser();

  await assertOwnsConversation(
    conversationId,
    user.id
  );

  return prisma.branch.findMany({
    where: {
      conversationId,
    },

    orderBy: {
      createdAt: "asc",
    },

    select: {
      id: true,
      name: true,
      parentMessageId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Renames a branch owned by the current user.
 *
 * The Main branch cannot be renamed because it is the
 * default branch for the conversation.
 */
export async function renameBranch(
  branchId: string,
  name: string
) {
  const user = await requireUser();

  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      conversation: {
        userId: user.id,
      },
    },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (branch.name === "Main") {
    throw new Error(
      "The Main branch cannot be renamed"
    );
  }

  const trimmedName = name.trim();

  if (!trimmedName) {
    throw new Error(
      "Branch name cannot be empty"
    );
  }

  const updatedBranch = await prisma.branch.update({
    where: {
      id: branchId,
    },

    data: {
      name: trimmedName,
    },
  });

  revalidatePath(
    `/c/${branch.conversationId}`
  );

  return updatedBranch;
}

/**
 * Deletes a branch owned by the current user.
 *
 * The Main branch cannot be deleted because every
 * conversation must have a default branch.
 */
export async function deleteBranch(
  branchId: string
) {
  const user = await requireUser();

  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      conversation: {
        userId: user.id,
      },
    },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (branch.name === "Main") {
    throw new Error(
      "The Main branch cannot be deleted"
    );
  }

  // Delete messages belonging to this branch first.
  await prisma.message.deleteMany({
    where: {
      branchId,
    },
  });

  await prisma.branch.delete({
    where: {
      id: branchId,
    },
  });

  revalidatePath(
    `/c/${branch.conversationId}`
  );

  return {
    id: branchId,
    conversationId: branch.conversationId,
  };
}