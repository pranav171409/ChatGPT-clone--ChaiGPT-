import { loadChatMessages } from "@/features/ai/actions/chat-store";
import {
  getConversation,
  listBranches,
} from "@/features/conversations/actions/conversation-actions";
import { ConversationView } from "@/features/conversations/components/conversation-view";
import { notFound } from "next/navigation";
import React from "react";

type ConversationPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ branch?: string }>;
};

const page = async ({
  params,
  searchParams,
}: ConversationPageProps) => {
  const { id } = await params;
  const { branch: requestedBranchId } = await searchParams;

  try {
    await getConversation(id);
  } catch {
    notFound();
  }

  const branches = await listBranches(id);

  const mainBranch = branches.find(
    (branch) => branch.name === "Main"
  );

  if (!mainBranch) {
    notFound();
  }

  const activeBranch =
    branches.find((branch) => branch.id === requestedBranchId) ??
    mainBranch;

  const initialMessages = await loadChatMessages(
    id,
    activeBranch.id
  );

  return (
    <ConversationView
      key={`${id}-${activeBranch.id}`}
      conversationId={id}
      branchId={activeBranch.id}
      initialMessages={initialMessages}
    />
  );
};

export default page;