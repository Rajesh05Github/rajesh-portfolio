"use client";

import { useEffect, useRef, useState } from "react";
import { X, Send, Loader2, RotateCcw } from "lucide-react";
import {
  getChatHistory,
  startChatSession,
} from "@/features/chatbot/public-actions";
import { VisitorGate, type VisitorGateInfo } from "./visitor-gate";
import { ChatBotIcon } from "./chat-bot-icon";

const SUGGESTED_QUESTIONS = [
  "What are your strongest skills?",
  "Tell me about a recent project.",
  "What's your professional experience?",
  "How can I download your resume?",
];

type Role = "VISITOR" | "ASSISTANT";

type ChatMessageItem = {
  id: string;
  role: Role;
  content: string;
  status?: "streaming" | "error";
};

type Phase = "loading" | "gate" | "chat";

type DoneEvent = {
  type: "done";
  requestId?: string;
  intent?: string;
  grounded?: boolean;
  rejectionReason?: string;
  sources?: { sourceType: string; title: string }[];
  answer?: string;
};

function localId(): string {
  return Math.random().toString(36).slice(2);
}

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [gatePending, setGatePending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!isOpen || initialized.current) return;
    initialized.current = true;

    getChatHistory()
      .then((history) => {
        if (history.length > 0) {
          setMessages(
            history.map((m) => ({
              id: m.id,
              role: m.role as Role,
              content: m.content,
            })),
          );
          setPhase("chat");
        } else {
          setPhase("gate");
        }
      })
      .catch(() => setPhase("gate"));
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  async function handleGateSubmit(info: VisitorGateInfo) {
    setGatePending(true);
    try {
      await startChatSession(info);
    } finally {
      setGatePending(false);
      setPhase("chat");
    }
  }

  async function handleGateSkip() {
    setGatePending(true);
    try {
      await startChatSession();
    } finally {
      setGatePending(false);
      setPhase("chat");
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessageItem = {
      id: localId(),
      role: "VISITOR",
      content: trimmed,
    };
    const assistantMessage: ChatMessageItem = {
      id: localId(),
      role: "ASSISTANT",
      content: "",
      status: "streaming",
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsStreaming(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "The chat request failed.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            { type: string; text?: string } | DoneEvent;

          if (
            event.type === "token" &&
            "text" in event &&
            typeof event.text === "string"
          ) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: m.content + event.text }
                  : m,
              ),
            );
          } else if (event.type === "error") {
            throw new Error(
              "message" in event
                ? String(event.message)
                : "The assistant hit an error.",
            );
          } else if (event.type === "done") {
            const done = event as DoneEvent;
            // Reject/general-response paths never call an LLM, so no tokens
            // streamed for them — backfill the canned answer now.
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id &&
                m.content.length === 0 &&
                done.answer
                  ? { ...m, content: done.answer }
                  : m,
              ),
            );
          }
        }
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id ? { ...m, status: undefined } : m,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessage.id
            ? {
                ...m,
                content:
                  error instanceof Error
                    ? error.message
                    : "Something went wrong.",
                status: "error",
              }
            : m,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  function handleRetry(failedMessageId: string) {
    const index = messages.findIndex((m) => m.id === failedMessageId);
    const priorUserMessage = messages
      .slice(0, index)
      .reverse()
      .find((m) => m.role === "VISITOR");
    if (!priorUserMessage) return;
    setMessages((prev) => prev.filter((m) => m.id !== failedMessageId));
    void sendMessage(priorUserMessage.content);
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 sm:right-6 sm:bottom-6">
      {isOpen && (
        <div className="glass-strong mb-3 flex h-[32rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl shadow-2xl">
          <div className="border-border flex items-center justify-between border-b p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <ChatBotIcon size={18} className="text-primary" />
              Ask the AI assistant
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>

          {phase === "loading" && (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="animate-spin" size={20} />
            </div>
          )}

          {phase === "gate" && (
            <VisitorGate
              onSubmit={handleGateSubmit}
              onSkip={handleGateSkip}
              pending={gatePending}
            />
          )}

          {phase === "chat" && (
            <>
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto p-4"
              >
                {messages.length === 0 && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-sm">Try asking:</p>
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => void sendMessage(q)}
                        className="border-border bg-surface hover:border-primary block w-full rounded-xl border px-3 py-2 text-left text-sm"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={
                      m.role === "VISITOR"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        m.role === "VISITOR"
                          ? "bg-primary text-primary-foreground max-w-[85%] rounded-2xl px-4 py-2 text-sm"
                          : m.status === "error"
                            ? "max-w-[85%] rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400"
                            : "bg-surface max-w-[85%] rounded-2xl px-4 py-2 text-sm whitespace-pre-wrap"
                      }
                    >
                      {m.content ||
                        (m.status === "streaming" ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          ""
                        ))}
                      {m.status === "error" && (
                        <button
                          onClick={() => handleRetry(m.id)}
                          className="mt-2 flex items-center gap-1 text-xs font-medium text-red-300 hover:text-red-200"
                        >
                          <RotateCcw size={12} /> Retry
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMessage(input);
                }}
                className="border-border flex gap-2 border-t p-3"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={isStreaming}
                  className="border-border bg-surface focus:border-primary focus:ring-primary flex-1 rounded-full border px-4 py-2 text-sm outline-none focus:ring-1 disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isStreaming || input.trim().length === 0}
                  aria-label="Send"
                  className="bg-primary text-primary-foreground rounded-full p-2.5 disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        aria-label={isOpen ? "Close chat" : "Open chat"}
        className="bg-primary text-primary-foreground glow-border flex h-14 w-14 items-center justify-center rounded-full shadow-xl transition-transform hover:scale-105"
      >
        {isOpen ? <X size={22} /> : <ChatBotIcon size={24} />}
      </button>
    </div>
  );
}
