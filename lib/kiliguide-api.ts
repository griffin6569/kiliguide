import { supabase } from "./supabase";

export type GroundedAnswer = { answer: string; sources: { title: string; page: number | null }[]; confidence: number };
export async function askKiliGuide(question: string, conversationId?: string): Promise<GroundedAnswer> {
  if (!supabase) throw new Error("Supabase has not been configured.");
  const { data, error } = await supabase.functions.invoke("chat", { body: { question, conversationId } });
  if (error) throw error;
  return data as GroundedAnswer;
}
export async function summarizeNotice(noticeId: string, body: string) {
  if (!supabase) throw new Error("Supabase has not been configured.");
  const { data, error } = await supabase.functions.invoke("summarize-notice", { body: { noticeId, body } });
  if (error) throw error;
  return data as { summary: string; dates: string[] };
}
