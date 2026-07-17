import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    const token = req.headers.get("Authorization") ?? "";
    const auth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: token } } });
    const { data: { user } } = await auth.auth.getUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers: CORS });
    const { subscription } = await req.json();
    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) return Response.json({ error: "Invalid push subscription." }, { status: 400, headers: CORS });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error } = await admin.from("push_subscriptions").upsert({ user_id: user.id, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth, user_agent: req.headers.get("user-agent") }, { onConflict: "endpoint" });
    if (error) throw error;
    return Response.json({ saved: true }, { headers: CORS });
  } catch { return Response.json({ error: "Unable to save push subscription." }, { status: 500, headers: CORS }); }
});
