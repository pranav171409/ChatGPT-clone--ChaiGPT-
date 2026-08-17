"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { useQueryClient } from "@tanstack/react-query";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useChat } from "@ai-sdk/react";
import React, { useMemo, useState } from "react";

import {
  useBranches,
  useConversations,
  useRenameBranch,
  useDeleteBranch,
} from "../hooks/use-conversation";

import { queryKeys } from "../utils/query-keys";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ChatEmpty } from "./chat-empty";
import { ChatMessages } from "./chat-messages";
import { ChatComposer } from "./chat-composer";

type ConversationViewProps = {
  conversationId: string;
  branchId: string;
  initialMessages: UIMessage[];
};

/**
 * Main chat view — header, message list, composer, and branch navigation.
 */
export const ConversationView = ({
  conversationId,
  branchId,
  initialMessages,
}: ConversationViewProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: conversations } = useConversations();
  const { data: branches } = useBranches(conversationId);

  const renameBranch = useRenameBranch(conversationId);
  const deleteBranch = useDeleteBranch(conversationId);

  // Rename dialog state
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [branchName, setBranchName] = useState("");

  // Delete dialog state
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",

        prepareSendMessagesRequest: ({
          id,
          messages,
          body,
        }) => ({
          body: {
            id,
            branchId,
            message: messages.at(-1),
            ...body,
          },
        }),
      }),
    [branchId]
  );

  const {
    messages,
    sendMessage,
    status,
    setMessages,
  } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport,

    onFinish: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations.all,
      });
    },

    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleMessagesChange = (
    updatedMessages: UIMessage[]
  ) => {
    if (updatedMessages.length === messages.length) {
      const changedIndex = updatedMessages.findIndex(
        (updatedMessage, index) => {
          const currentMessage = messages[index];

          if (!currentMessage) {
            return false;
          }

          const currentText = currentMessage.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("");

          const updatedText = updatedMessage.parts
            .filter((part) => part.type === "text")
            .map((part) => part.text)
            .join("");

          return (
            updatedMessage.id === currentMessage.id &&
            updatedText !== currentText
          );
        }
      );

      if (changedIndex !== -1) {
        const editedMessage =
          updatedMessages[changedIndex];

        const editedText = editedMessage.parts
          .filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("")
          .trim();

        if (!editedText) {
          return;
        }

        setMessages(
          updatedMessages.slice(0, changedIndex)
        );

        void sendMessage(
          {
            text: editedText,
          },
          {
            body: {
              editMessageId: editedMessage.id,
            },
          }
        );

        return;
      }
    }

    setMessages(updatedMessages);
  };

  const handleRegenerateMessage = (
    assistantMessageId: string
  ) => {
    const assistantIndex = messages.findIndex(
      (message) => message.id === assistantMessageId
    );

    if (assistantIndex === -1) {
      toast.error("Message not found");
      return;
    }

    if (messages[assistantIndex]?.role !== "assistant") {
      toast.error(
        "Only assistant messages can be regenerated"
      );
      return;
    }

    const userMessage = messages
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === "user");

    if (!userMessage) {
      toast.error(
        "Could not find the question for this response"
      );
      return;
    }

    const userText = userMessage.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();

    if (!userText) {
      toast.error("The original question is empty");
      return;
    }

    const userIndex = messages.findIndex(
      (message) => message.id === userMessage.id
    );

    setMessages(messages.slice(0, userIndex));

    void sendMessage(
      {
        text: userText,
      },
      {
        body: {
          editMessageId: userMessage.id,
        },
      }
    );
  };

  /**
   * Opens the branch rename dialog.
   */
  const handleRenameBranch = () => {
    const branch = branches?.find(
      (item) => item.id === branchId
    );

    if (!branch) {
      toast.error("Branch not found");
      return;
    }

    if (branch.name === "Main") {
      toast.error("The Main branch cannot be renamed");
      return;
    }

    setBranchName(branch.name);
    setIsRenameOpen(true);
  };

  /**
   * Saves the new branch name.
   */
  const handleSaveBranchName = () => {
    const trimmedName = branchName.trim();

    if (!trimmedName) {
      toast.error("Branch name cannot be empty");
      return;
    }

    const branch = branches?.find(
      (item) => item.id === branchId
    );

    if (!branch) {
      toast.error("Branch not found");
      return;
    }

    if (trimmedName === branch.name) {
      setIsRenameOpen(false);
      return;
    }

    renameBranch.mutate(
      {
        branchId,
        name: trimmedName,
      },
      {
        onSuccess: () => {
          setIsRenameOpen(false);
          toast.success("Branch renamed");
        },
      }
    );
  };

  /**
   * Opens the branch delete confirmation dialog.
   */
  const handleDeleteBranch = () => {
    const branch = branches?.find(
      (item) => item.id === branchId
    );

    if (!branch) {
      toast.error("Branch not found");
      return;
    }

    if (branch.name === "Main") {
      toast.error("The Main branch cannot be deleted");
      return;
    }

    setIsDeleteOpen(true);
  };

  /**
   * Deletes the currently selected branch.
   */
  const handleConfirmDeleteBranch = () => {
    deleteBranch.mutate(branchId, {
      onSuccess: () => {
        setIsDeleteOpen(false);
      },
    });
  };

  const title =
    conversations?.find(
      (item) => item.id === conversationId
    )?.title ?? "Chat";

  const activeBranch = branches?.find(
    (branch) => branch.id === branchId
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
        <SidebarTrigger />

        <Separator
          orientation="vertical"
          className="mx-1 h-4"
        />

        <h1 className="truncate text-sm font-medium">
          {title}
        </h1>

        <div className="ml-auto flex items-center gap-2">
          <select
            value={branchId}
            onChange={(event) => {
              router.push(
                `/c/${conversationId}?branch=${event.target.value}`
              );
            }}
            className="rounded-md border bg-background px-2 py-1 text-xs"
          >
            {branches?.map((branch) => (
              <option
                key={branch.id}
                value={branch.id}
              >
                {branch.name}
              </option>
            ))}
          </select>

          {activeBranch?.name !== "Main" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRenameBranch}
                disabled={
                  renameBranch.isPending ||
                  deleteBranch.isPending
                }
              >
                {renameBranch.isPending
                  ? "Renaming..."
                  : "Rename"}
              </Button>

              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleDeleteBranch}
                disabled={
                  renameBranch.isPending ||
                  deleteBranch.isPending
                }
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </header>

      {messages.length === 0 ? (
        <ChatEmpty />
      ) : (
        <ChatMessages
          messages={messages}
          status={status}
          onMessagesChange={handleMessagesChange}
          onRegenerateMessage={handleRegenerateMessage}
        />
      )}

      <ChatComposer
        onSend={(text) => {
          void sendMessage({ text });
        }}
        isSending={status !== "ready"}
        autoFocus
      />

      {/* Rename Branch Dialog */}
      <Dialog
        open={isRenameOpen}
        onOpenChange={setIsRenameOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename branch</DialogTitle>

            <DialogDescription>
              Enter a new name for this branch.
            </DialogDescription>
          </DialogHeader>

          <Input
            value={branchName}
            onChange={(event) =>
              setBranchName(event.target.value)
            }
            placeholder="Branch name"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                handleSaveBranchName();
              }
            }}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRenameOpen(false)}
              disabled={renameBranch.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              onClick={handleSaveBranchName}
              disabled={renameBranch.isPending}
            >
              {renameBranch.isPending
                ? "Saving..."
                : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Branch Confirmation Dialog */}
      <Dialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete branch?</DialogTitle>

            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">
                {activeBranch?.name}
              </span>{" "}
              and all messages inside this branch. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleteBranch.isPending}
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDeleteBranch}
              disabled={deleteBranch.isPending}
            >
              {deleteBranch.isPending
                ? "Deleting..."
                : "Delete branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};