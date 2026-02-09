"use client";

/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */
import { TypographyH2, TypographyP } from "@/components/ui/typography";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface ChatMessage {
  role: "user" | "bot";
  content: string;
}

export default function SpeciesChatbot() {
  // Ref used to auto-resize textarea height as user types.
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Input text currently in composer.
  const [message, setMessage] = useState("");
  // Chronological conversation history.
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  // Loading flag to disable input while waiting for API response.
  const [isLoading, setIsLoading] = useState(false);

  const handleInput = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset and then grow to content height for smooth autoresize.
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  const handleSubmit = async () => {
    // Prevent duplicate requests from repeated clicks/keypresses.
    if (isLoading) {
      return;
    }

    // Ignore empty/whitespace-only messages.
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return;
    }

    // Optimistically append user message immediately.
    setChatLog((prev) => [...prev, { role: "user", content: trimmedMessage }]);
    setMessage("");
    setIsLoading(true);

    if (textareaRef.current) {
      // Reset composer height after send.
      textareaRef.current.style.height = "auto";
    }

    try {
      // Backend route handles provider call + topic restrictions.
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedMessage }),
      });

      const payload = (await response.json()) as { response?: string; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to get a response from the chatbot.");
      }

      // Append assistant response to chat transcript.
      const botMessage = payload.response?.trim() ?? "I couldn't generate a response right now.";
      setChatLog((prev) => [...prev, { role: "bot", content: botMessage }]);
    } catch (error) {
      // Show user-visible fallback message in transcript on failures.
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong while contacting the chatbot.";
      setChatLog((prev) => [
        ...prev,
        {
          role: "bot",
          content: `I ran into an issue processing that request: ${errorMessage}`,
        },
      ]);
    } finally {
      // Re-enable input controls regardless of success/failure.
      setIsLoading(false);
    }
  };

  return (
    <>
      <TypographyH2>Species Chatbot</TypographyH2>
      <div className="mt-4 flex gap-4">
        <div className="mt-4 rounded-lg bg-foreground p-4 text-background">
          <TypographyP>
            The Species Chatbot is a feature to be implemented that is specialized to answer questions about animals.
            Ideally, it will be able to provide information on various species, including their habitat, diet,
            conservation status, and other relevant details. Any unrelated prompts will return a message to the user
            indicating that the chatbot is specialized for species-related queries only.
          </TypographyP>
          <TypographyP>
            To use the Species Chatbot, simply type your question in the input field below and hit enter. The chatbot
            will respond with the best available information.
          </TypographyP>
        </div>
      </div>
      {/* Chat UI, ChatBot to be implemented */}
      <div className="mx-auto mt-6">
        {/* Chat history */}
        <div className="h-[400px] space-y-3 overflow-y-auto rounded-lg border border-border bg-muted p-4">
          {chatLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">Start chatting about a species!</p>
          ) : (
            chatLog.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${
                    msg.role === "user"
                      ? "rounded-br-none bg-primary text-primary-foreground"
                      : "rounded-bl-none border border-border bg-foreground text-primary-foreground"
                  }`}
                >
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))
          )}
        </div>
        {/* Textarea and submission */}
        <div className="mt-4 flex flex-col items-end">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onInput={handleInput}
            onKeyDown={(event) => {
              // Enter submits, Shift+Enter inserts newline.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleSubmit();
              }
            }}
            disabled={isLoading}
            rows={1}
            placeholder="Ask about a species..."
            className="w-full resize-none overflow-hidden rounded border border-border bg-background p-2 text-sm text-foreground focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isLoading}
            className="mt-2 rounded bg-primary px-4 py-2 text-background transition hover:opacity-90"
          >
            {isLoading ? "Thinking..." : "Enter"}
          </button>
        </div>
      </div>
    </>
  );
}
