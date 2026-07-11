import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { NextRequest } from "next/server";

const SYSTEM_PROMPT = `You are an AI CRM assistant for KVl CRM — a sales intelligence platform.

Current CRM snapshot (Dec 2025):
- Pipeline: 9 active deals worth $975K total
  • Discovery: TechNova ($45K), StartupHub ($12K)
  • Qualified: CloudScale ($128K), EduSpark ($34K)
  • Proposal: FinEdge ($95K), HealthTech AI ($128K), LogiFlow ($56K)
  • Negotiation: RetailPro ($67K), Nexus Systems ($245K) — 9 days, closing call needed
- Hot leads: Lisa Zhang/HealthTech AI ($128K, score 95), Alex Morgan/TechNova ($45K, score 92), Ryan O'Brien/RetailPro ($67K, score 88)
- Customers: SkyNet Robotics ($520K champion), Apex Analytics ($312K), Nexus Systems ($245K)
- At-risk: GreenLeaf Corp (health 61%), FoodTech Labs (health 55%) — combined $186K ARR
- Overdue invoices: BrightPath Co $87K (10d), GreenLeaf Corp $54K (5d) — total $141K
- Team: Priya Nair 101%, Mike Ross 98%, James Wu 97%, Aisha Patel 96%, Sarah Chen 95%
- Revenue: $167K Dec, +28.5% YoY, Q4 total $467K vs $420K target

Rules:
- Be concise and direct. Use bullet points and bold for key numbers.
- Always give a specific next action recommendation.
- If asked something outside CRM scope, gently redirect.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

async function streamAnthropic(messages: ChatMessage[]): Promise<ReadableStream> {
  const anthropic = new Anthropic();
  const stream = anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 800,
    system: SYSTEM_PROMPT,
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

async function streamOpenAI(messages: ChatMessage[]): Promise<ReadableStream> {
  const openai = new OpenAI();
  const stream = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 800,
    stream: true,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
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

  const provider = process.env.AI_PROVIDER ?? "anthropic";
  const readable = provider === "openai"
    ? await streamOpenAI(messages)
    : await streamAnthropic(messages);

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
