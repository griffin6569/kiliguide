import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { geminiFetch } from "../_shared/gemini.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const unavailable = "Sorry, I could not find this information in the university knowledge base.";
const gemini = "https://generativelanguage.googleapis.com/v1beta/models";

async function geminiJson(path: string, body: unknown) {
  const response = await geminiFetch(`${gemini}/${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error("Gemini request failed");
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { question, conversationId } = await req.json();
    if (typeof question !== "string" || !question.trim() || question.length > 2000) return Response.json({ error: "Invalid question" }, { status: 400, headers: CORS });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const embedding = await geminiJson("gemini-embedding-2:embedContent", { content: { parts: [{ text: question }] }, output_dimensionality: 768 });
    const vector = embedding.embeddings?.[0]?.values;
    if (!vector) throw new Error("No embedding generated");
    const { data: chunks, error } = await supabase.rpc("match_document_chunks", { query_embedding: vector, match_count: 6 });
    if (error) throw error;
    if (!chunks?.length || chunks[0].similarity < 0.68) return Response.json({ answer: unavailable, sources: [], confidence: 0 }, { headers: CORS });
    const context = chunks.map((chunk: any, index: number) => `[${index + 1}] ${chunk.content}`).join("\n\n");
    const instruction = `You are KiliGuide, a safe university information assistant. Answer only from the supplied CONTEXT. Never invent, infer, or use outside knowledge. Cite claims using [n]. If the context is insufficient, respond exactly: ${unavailable}\n\nCONTEXT:\n${context}`;
    const completion = await geminiJson("gemini-2.5-flash:generateContent", { system_instruction: { parts: [{ text: instruction }] }, contents: [{ role: "user", parts: [{ text: question }] }], generationConfig: { temperature: 0, maxOutputTokens: 700 } });
    const answer = completion.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || unavailable;
    const sources = chunks.map((chunk: any) => ({ title: chunk.title, page: chunk.page_number }));
    if (conversationId) await supabase.from("messages").insert([{ conversation_id: conversationId, role: "user", content: question }, { conversation_id: conversationId, role: "assistant", content: answer, sources, confidence: chunks[0].similarity }]);
    return Response.json({ answer, sources, confidence: chunks[0].similarity }, { headers: CORS });
  } catch {
    return Response.json({ error: "Unable to process request" }, { status: 500, headers: CORS });
  }
});
