"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  createBranch,
  createConversation,
  deleteBranch,
  deleteConversation,
  listConversations,
  listBranches,
  renameBranch,
  updateConversation,
} from "@/features/conversations/actions/conversation-actions";
import { queryKeys } from "../utils/query-keys";

/**
 * Fetches all conversations for the sidebar via React Query.
 */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations.all,
    queryFn: () => listConversations(),
  });
}

/**
 * Mutation hook to create a new conversation and navigate to it.
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (title?: string) => createConversation(title),

    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      router.push(`/c/${conversation.id}`);
    },

    onError: (error: Error) => {
      toast.error(error.message || "Could not create chat");
    },
  });
}

/** Rename / pin / archive a conversation. */
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string;
      title?: string;
      isPinned?: boolean;
      isArchived?: boolean;
    }) => updateConversation(id, data),

    onSuccess: (conversation) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.detail(conversation.id),
      });
    },

    onError: (error: Error) => {
      toast.error(error.message || "Could not update chat");
    },
  });
}

/** Delete a conversation and leave the page if you were viewing it. */
export function useDeleteConversation(activeId?: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),

    onSuccess: ({ id }) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });

      queryClient.removeQueries({
        queryKey: queryKeys.messages.byConversation(id),
      });

      if (activeId === id) {
        router.push("/");
      }

      toast.success("Chat deleted");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Could not delete chat");
    },
  });
}

/** Creates a branch from a message and switches to it. */
export function useCreateBranch(conversationId: string) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({
      parentMessageId,
      name,
    }: {
      parentMessageId: string;
      name?: string;
    }) => createBranch(conversationId, parentMessageId, name),

    onSuccess: (branch) => {
      void queryClient.invalidateQueries({
        queryKey: ["branches", conversationId],
      });

      router.push(
        `/c/${conversationId}?branch=${branch.id}`
      );
    },

    onError: (error: Error) => {
      toast.error(
        error.message || "Could not create branch"
      );
    },
  });
}

/** Fetches all branches for a conversation. */
export function useBranches(
  conversationId: string | undefined
) {
  return useQuery({
    queryKey: ["branches", conversationId ?? "none"],
    queryFn: () => listBranches(conversationId!),
    enabled: Boolean(conversationId),
  });
}

/** Renames a branch. */
export function useRenameBranch(
  conversationId: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      branchId,
      name,
    }: {
      branchId: string;
      name: string;
    }) => renameBranch(branchId, name),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["branches", conversationId],
      });

      toast.success("Branch renamed");
    },

    onError: (error: Error) => {
      toast.error(
        error.message || "Could not rename branch"
      );
    },
  });
}

/** Deletes a branch. */
export function useDeleteBranch(
  conversationId: string
) {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (branchId: string) =>
      deleteBranch(branchId),

    onSuccess: ({ conversationId: deletedConversationId }) => {
      void queryClient.invalidateQueries({
        queryKey: ["branches", conversationId],
      });

      router.push(`/c/${deletedConversationId}`);

      toast.success("Branch deleted");
    },

    onError: (error: Error) => {
      toast.error(
        error.message || "Could not delete branch"
      );
    },
  });
}