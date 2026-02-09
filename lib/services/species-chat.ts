/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

const OPENAI_RESPONSES_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

// System guardrails keep the assistant focused on species/biodiversity topics.
const SPECIES_SYSTEM_PROMPT = `You are a species-focused assistant.
Only answer questions related to animals, species, habitat, diet, behavior, ecology, taxonomy, conservation status, biodiversity, or similar biology topics.

If a question is unrelated, politely refuse and ask the user to ask an animal/species-related question.
Keep answers concise, clear, and factual.
When uncertain, say so and avoid fabricating details.`;

interface OpenAIOutputItem {
  content?: {
    type?: string;
    text?: string;
  }[];
}

interface OpenAIResponsesPayload {
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
  };
}

// Domain-specific error type used to separate provider failures from unexpected exceptions.
export class ProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderError";
  }
}

export const isProviderError = (error: unknown): error is ProviderError => error instanceof ProviderError;

const extractTextFromResponse = (payload: OpenAIResponsesPayload): string | null => {
  if (!payload.output) {
    return null;
  }

  // Collect all text fragments emitted by the Responses API.
  const textParts = payload.output.flatMap((item) => {
    if (!item.content) {
      return [];
    }

    return item.content
      .filter((contentPart) => contentPart.type === "output_text" && typeof contentPart.text === "string")
      .map((contentPart) => contentPart.text ?? "");
  });

  const responseText = textParts.join("\n").trim();
  // Empty string is treated as a provider failure.
  return responseText.length > 0 ? responseText : null;
};

export async function generateResponse(message: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new ProviderError(
      "Species assistant is not configured. Add OPENAI_API_KEY to .env, then restart the server.",
    );
  }

  try {
    // Call OpenAI Responses API directly so this service remains framework-agnostic.
    const response = await fetch(OPENAI_RESPONSES_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.3,
        max_output_tokens: 350,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: SPECIES_SYSTEM_PROMPT }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: message }],
          },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      // Try to surface upstream provider message when available.
      let upstreamMessage = "The model provider returned an error.";
      try {
        const errorPayload = (await response.json()) as OpenAIResponsesPayload;
        if (errorPayload.error?.message) {
          upstreamMessage = errorPayload.error.message;
        }
      } catch {
        // Ignore parsing failures and keep generic upstream message.
      }

      throw new ProviderError(upstreamMessage);
    }

    const payload = (await response.json()) as OpenAIResponsesPayload;
    const text = extractTextFromResponse(payload);

    if (!text) {
      throw new ProviderError("The model provider returned an empty response.");
    }

    return text;
  } catch (error) {
    if (isProviderError(error)) {
      throw error;
    }

    console.error("Unexpected species assistant provider error:", error);
    throw new ProviderError(
      "Unable to reach the species assistant provider. Check network access and try again.",
    );
  }
}
