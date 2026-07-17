import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
type Audience = { roles?: string[]; department_ids?: string[]; programmes?: string[]; study_years?: number[] };

function matches(profile: any, roles: Set<string>, audience: Audience) {
  const roleMatch = !audience.roles?.length || [...roles].some((role) => audience.roles!.includes(role));
  const departmentMatch = !audience.department_ids?.length || audience.department_ids.includes(profile.department_id);
  const programmeMatch = !audience.programmes?.length || audience.programmes.includes(profile.programme);
  const yearMatch = !audience.study_years?.length || audience.study_years.includes(profile.study_year);
  return roleMatch && departmentMatch && programmeMatch && yearMatch;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const { documentId, noticeId } = await req.json();
    if (!documentId && !noticeId) return Response.json({ error: "A document or notice ID is required." }, { status: 400, headers: CORS });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const isDocument = Boolean(documentId);
    const { data: source, error } = await supabase.from(isDocument ? "documents" : "notices").select("id,title,category,audience,metadata,summary,body,created_at").eq("id", documentId ?? noticeId).single();
    if (error || !source) throw new Error("Source record not found");
    const audience: Audience = source.audience ?? {};
    const [{ data: profiles }, { data: roleRows }] = await Promise.all([supabase.from("profiles").select("id,department_id,programme,study_year"), supabase.from("user_roles").select("user_id,role")]);
    const rolesByUser = new Map<string, Set<string>>();
    for (const row of roleRows ?? []) rolesByUser.set(row.user_id, new Set([...(rolesByUser.get(row.user_id) ?? []), row.role]));
    const recipients = (profiles ?? []).filter((profile) => matches(profile, rolesByUser.get(profile.id) ?? new Set(), audience));
    const summary = source.summary || source.metadata?.notification_summary || source.body || `A new ${isDocument ? "document" : "notice"} is available.`;
    const eventKey = `${isDocument ? "document" : "notice"}:${source.id}:${source.created_at}`;
    const rows = recipients.map((profile) => ({ recipient_id: profile.id, kind: isDocument ? "document" : "notice", title: source.title, body: String(summary).slice(0, 700), source_document_id: documentId ?? null, source_notice_id: noticeId ?? null, event_key: eventKey, data: { category: source.category, audience } }));
    if (rows.length) { const { error: insertError } = await supabase.from("notifications").upsert(rows, { onConflict: "recipient_id,event_key", ignoreDuplicates: true }); if (insertError) throw insertError; }
    if (documentId) await supabase.from("documents").update({ published_at: new Date().toISOString() }).eq("id", documentId);
    return Response.json({ delivered: rows.length, channel: "in_app", eventKey }, { headers: CORS });
  } catch { return Response.json({ error: "Unable to publish the update." }, { status: 500, headers: CORS }); }
});
