import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";
import { buildCrmSnapshot } from "@/lib/ai/context";

async function buildSystemPrompt(): Promise<string> {
  const snapshot = await buildCrmSnapshot();
  return `You are an AI CRM assistant for KVl CRM — a sales intelligence platform.

${snapshot}

Rules:
- Be concise and direct. Use bullet points and bold for key numbers.
- Always give a specific next action recommendation.
- Ground every answer in the live snapshot above — never invent numbers not present there.
- If asked something outside CRM scope, gently redirect.`;
}

type ChatMessage = { role: "user" | "assistant"; content: string };

async function streamAnthropic(messages: ChatMessage[], system: string): Promise<ReadableStream> {
  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system,
    messages,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

async function streamOpenAI(messages: ChatMessage[], system: string): Promise<ReadableStream> {
  const openai = new OpenAI();
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    stream: true,
    messages: [
      { role: "system", content: system },
      ...messages,
    ],
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) controller.enqueue(encoder.encode(text));
        }
      } finally {
        controller.close();
      }
    },
  });
}

export async function POST(req: NextRequest) {
  const { message, history = [] } = await req.json();

  const messages: ChatMessage[] = [
    ...history.map((m: ChatMessage) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  const system = await buildSystemPrompt();
  const provider = process.env.AI_PROVIDER ?? "anthropic";
  const readable = provider === "openai"
    ? await streamOpenAI(messages, system)
    : await streamAnthropic(messages, system);

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
