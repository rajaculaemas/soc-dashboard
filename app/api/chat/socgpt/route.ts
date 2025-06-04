// app/api/chat/socgpt/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { messages } = await req.json();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL, // model bisa diganti
      messages: [
        {
          role: "system",
          content: `Kamu adalah SOCGPT, asisten SOC analyst. Gunakan bahasa Indonesia jika mungkin. Kamu dapat mengakses log, alert, dan konteks keamanan siber. Jawaban harus padat, membantu dan logis.`,
        },
        ...messages,
      ],
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
