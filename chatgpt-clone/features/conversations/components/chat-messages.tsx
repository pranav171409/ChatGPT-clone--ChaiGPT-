"use client";

import { isTextUIPart, type UIMessage, type ChatStatus } from "ai";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Search,
  CheckCircle2,
  AlertCircle,
  GitBranch,
  Pencil,
  X,
  Check,
  Trash2,
  RefreshCw,
} from "lucide-react";

import {
  Conversation,
  ConversationContent,
} from "@/components/ai-elements/conversation";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";

import { Loader } from "@/components/ai-elements/loader";

import {
  useCreateBranch,
} from "@/features/conversations/hooks/use-conversation";

import {
  useUpdateMessage,
  useDeleteMessage,
} from "@/features/messages/hooks/use-messages";

/** Extracts plain text from a UIMessage. */
function getMessageText(message: UIMessage) {
  return message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join("");
}

/** Displays web-search activity for assistant messages. */
function ToolActivity({ message }: { message: UIMessage }) {
  const toolParts = message.parts.filter(
    (part) => part.type === "tool-webSearch"
  );

  if (toolParts.length === 0) return null;

  return (
    <div className="mb-3 space-y-2">
      {toolParts.map((part, index) => {
        if (part.type !== "tool-webSearch") return null;

        if (
          part.state === "input-streaming" ||
          part.state === "input-available"
        ) {
          return (
            <div
              key={`${message.id}-tool-${index}`}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Search className="size-4 animate-pulse" />
              <span>Searching the web...</span>
            </div>
          );
        }

        if (part.state === "output-available") {
          return (
            <div
              key={`${message.id}-tool-${index}`}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="size-4" />
              <span>Web search completed</span>
            </div>
          );
        }

        if (part.state === "output-error") {
          return (
            <div
              key={`${message.id}-tool-${index}`}
              className="flex items-center gap-2 text-sm text-destructive"
            >
              <AlertCircle className="size-4" />
              <span>Web search failed</span>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}

type ChatMessagesProps = {
  messages: UIMessage[];
  status: ChatStatus;
  onMessagesChange?: (messages: UIMessage[]) => void;

  /**
   * Called when the user wants to regenerate an assistant response.
   */
  onRegenerateMessage?: (messageId: string) => void;
};

export function ChatMessages({
  messages,
  status,
  onMessagesChange,
  onRegenerateMessage,
}: ChatMessagesProps) {
  const pathname = usePathname();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const conversationId = pathname.startsWith("/c/")
    ? pathname.split("/")[2]
    : undefined;

  const createBranch = useCreateBranch(conversationId ?? "");
  const updateMessage = useUpdateMessage(conversationId ?? "");
  const deleteMessage = useDeleteMessage(conversationId ?? "");

  const handleCreateBranch = (messageId: string) => {
    if (!conversationId) {
      toast.error("Conversation not found");
      return;
    }

    createBranch.mutate(
      {
        parentMessageId: messageId,
      },
      {
        onSuccess: () => {
          toast.success("Branch created");
        },
      }
    );
  };

  const startEditing = (message: UIMessage) => {
    setEditingId(message.id);
    setEditText(getMessageText(message));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = (message: UIMessage) => {
    const trimmed = editText.trim();

    if (!trimmed) {
      toast.error("Message cannot be empty");
      return;
    }

    updateMessage.mutate(
      {
        id: message.id,
        content: trimmed,
      },
      {
        onSuccess: () => {
          const updatedMessages = messages.map((item) => {
            if (item.id !== message.id) {
              return item;
            }

            return {
              ...item,
              parts: [
                {
                  type: "text" as const,
                  text: trimmed,
                },
              ],
            };
          });

          onMessagesChange?.(updatedMessages);

          setEditingId(null);
          setEditText("");

          toast.success("Message updated");
        },
      }
    );
  };

  const handleDelete = (messageId: string) => {
    deleteMessage.mutate(messageId, {
      onSuccess: () => {
        const updatedMessages = messages.filter(
          (message) => message.id !== messageId
        );

        onMessagesChange?.(updatedMessages);

        toast.success("Message deleted");
      },
    });
  };

  const handleRegenerate = (messageId: string) => {
    if (!onRegenerateMessage) {
      toast.error("Regenerate is not available");
      return;
    }

    onRegenerateMessage(messageId);
  };

  const isWaiting =
    status === "submitted" && messages.at(-1)?.role === "user";

  return (
    <Conversation>
      <ConversationContent className="py-8">
        {messages.map((message) => {
          const text = getMessageText(message);
          const isEditing = editingId === message.id;

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.role === "assistant" && (
                  <ToolActivity message={message} />
                )}

                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(event) =>
                        setEditText(event.target.value)
                      }
                      className="min-h-24 w-full resize-y rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                      autoFocus
                    />

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={updateMessage.isPending}
                        onClick={() => saveEdit(message)}
                        className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground disabled:opacity-50"
                      >
                        <Check className="size-3.5" />

                        {updateMessage.isPending
                          ? "Saving..."
                          : "Save"}
                      </button>

                      <button
                        type="button"
                        disabled={updateMessage.isPending}
                        onClick={cancelEditing}
                        className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                      >
                        <X className="size-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {text && (
                      <MessageResponse>
                        {text}
                      </MessageResponse>
                    )}

                    <div className="mt-2 flex items-center gap-3">
                      {/* Edit */}
                      {message.role === "user" && (
                        <button
                          type="button"
                          onClick={() => startEditing(message)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        type="button"
                        disabled={deleteMessage.isPending}
                        onClick={() => handleDelete(message.id)}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" />

                        {deleteMessage.isPending
                          ? "Deleting..."
                          : "Delete"}
                      </button>

                      {/* Regenerate */}
                      {message.role === "assistant" && (
                        <button
                          type="button"
                          disabled={
                            status !== "ready" ||
                            !onRegenerateMessage
                          }
                          onClick={() =>
                            handleRegenerate(message.id)
                          }
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <RefreshCw className="size-3.5" />
                          Regenerate
                        </button>
                      )}

                      {/* Branch */}
                      {conversationId && (
                        <button
                          type="button"
                          disabled={createBranch.isPending}
                          onClick={() =>
                            handleCreateBranch(message.id)
                          }
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <GitBranch className="size-3.5" />

                          {createBranch.isPending
                            ? "Creating branch..."
                            : "Branch from here"}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </MessageContent>
            </Message>
          );
        })}

        {isWaiting ? (
          <Message from="assistant">
            <MessageContent>
              <Loader />
            </MessageContent>
          </Message>
        ) : null}
      </ConversationContent>
    </Conversation>
  );
}