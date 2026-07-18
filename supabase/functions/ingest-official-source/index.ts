import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const plainText = (html: string) => html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const safe = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80);

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) return Response.json({ error: "Sign in as an administrator first." }, { status: 401, headers: cors });
    const authClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authorization } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return Response.json({ error: "Invalid session." }, { status: 401, headers: cors });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "administrator").maybeSingle();
    if (!role) return Response.json({ error: "Administrator access is required." }, { status: 403, headers: cors });

    const { url, title, category = "Administration", notifyOnReady = false } = await request.json();
    if (typeof url !== "string") return Response.json({ error: "An official DeKUT URL is required." }, { status: 400, headers: cors });
    const source = new URL(url);
    const host = source.hostname.toLowerCase();
    const { data: trustedDomains, error: trustedError } = await admin.from("trusted_source_domains").select("domain,organisation").eq("approved", true);
    if (trustedError) throw trustedError;
    const trusted = (trustedDomains ?? []).find((entry) => host === entry.domain || host.endsWith(`.${entry.domain}`));
    if (!trusted) return Response.json({ error: "This domain is not in the Trusted Source Registry. Ask an administrator to approve it before import." }, { status: 400, headers: cors });
    const result = await fetch(source, { headers: { "User-Agent": "KiliGuide official knowledge indexer/1.0" } });
    if (!result.ok) return Response.json({ error: `Source could not be fetched (${result.status}).` }, { status: 422, headers: cors });
    const contentType = result.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return Response.json({ error: "Use an HTML or text page. Upload PDF and DOCX sources through Document Center." }, { status: 400, headers: cors });
    const text = plainText(await result.text());
    if (text.length < 240) return Response.json({ error: "The official page did not contain enough readable text to index." }, { status: 422, headers: cors });
    const documentTitle = typeof title === "string" && title.trim() ? title.trim() : source.pathname.split("/").filter(Boolean).pop()?.replace(/[-_]/g, " ") || "DeKUT official source";
    const path = `official/${new Date().toISOString().slice(0, 10)}/${safe(documentTitle)}.txt`;
    const documentText = `Official source: ${source.href}\nRetrieved: ${new Date().toISOString()}\n\n${text}`;
    const { error: uploadError } = await admin.storage.from("documents").upload(path, new Blob([documentText], { type: "text/plain" }), { contentType: "text/plain", upsert: false });
    if (uploadError) throw uploadError;
    const { data: document, error: documentError } = await admin.from("documents").insert({ title: documentTitle, category, storage_path: path, file_type: "txt", uploaded_by: user.id, source_url: source.href, processing_status: "extracting", notify_on_ready: Boolean(notifyOnReady), metadata: { source_url: source.href, retrieved_at: new Date().toISOString(), source_type: "official_web", source_organisation: trusted.organisation } }).select("id").single();
    if (documentError) throw documentError;
    const ingestion = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/ingest-document`, { method: "POST", headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify({ documentId: document.id, text: documentText }) });
    const body = await ingestion.json();
    if (!ingestion.ok) throw new Error(body.error ?? "Embedding failed");
    return Response.json({ documentId: document.id, title: documentTitle, sourceUrl: source.href, chunks: body.chunks, status: "ready" }, { headers: cors });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Official-source ingestion failed.";
    console.error("ingest-official-source failed:", message);
    return Response.json({ error: message }, { status: 500, headers: cors });
  }
});
