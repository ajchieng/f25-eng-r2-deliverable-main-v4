/**
 * File overview:
 * Contains UI or data logic for a specific feature in Biodiversity Hub.
 * Main exports here are consumed by Next.js routes or shared components.
 */

import { generateResponse, isProviderError } from "@/lib/services/species-chat";
import { NextResponse } from "next/server";

interface ChatRequestBody {
  message: string;
}

// Shared 400 response for invalid/missing `message`.
const invalidBodyResponse = () =>
  NextResponse.json(
    { error: "Invalid request body. Expected JSON with a non-empty `message` string." },
    { status: 400 },
  );

const isValidChatRequestBody = (value: unknown): value is ChatRequestBody => {
  // Validate shape defensively because request bodies are untrusted input.
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("message" in value)) {
    return false;
  }

  const candidate = (value as { message?: unknown }).message;
  return typeof candidate === "string";
};

export async function POST(request: Request) {
  // Parse JSON safely and return a consistent 400 response on malformed input.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidBodyResponse();
  }

  if (!isValidChatRequestBody(body)) {
    return invalidBodyResponse();
  }

  const message = body.message.trim();
  if (!message) {
    return invalidBodyResponse();
  }

  try {
    // Delegate model-provider work to service layer and return a stable API shape.
    const response = await generateResponse(message);
    return NextResponse.json({ response });
  } catch (error) {
    // Map provider failures vs unexpected failures to separate status codes.
    if (isProviderError(error)) {
      return NextResponse.json(
        { error: error.message || "The model provider failed to generate a response." },
        { status: 502 },
      );
    }

    return NextResponse.json({ error: "Unexpected server error." }, { status: 500 });
  }
}
