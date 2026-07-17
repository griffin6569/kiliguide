import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT")!, Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);

Deno.serve(async () => {
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date(); const windowEnd = new Date(now.getTime() + 2 * 60 * 1000);
  const { data: reminders } = await supabase.from("event_reminders").select("id,minutes_before,event_id,calendar_events!inner(id,user_id,title,starts_at,location)").eq("enabled", true).is("delivered_at", null);
  const due = (reminders ?? []).filter((reminder: any) => { const event = reminder.calendar_events; const trigger = new Date(event.starts_at).getTime() - reminder.minutes_before * 60000; return trigger >= now.getTime() && trigger < windowEnd.getTime(); });
  for (const reminder of due as any[]) {
    const event = reminder.calendar_events;
    await supabase.from("notifications").upsert({ recipient_id: event.user_id, kind: "reminder", title: `Class in ${reminder.minutes_before} minutes`, body: `${event.title}${event.location ? ` · ${event.location}` : ""}`, event_key: `event-reminder:${reminder.id}`, data: { event_id: event.id, starts_at: event.starts_at } }, { onConflict: "recipient_id,event_key", ignoreDuplicates: true });
    const { data: subscriptions } = await supabase.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", event.user_id);
    await Promise.all((subscriptions ?? []).map(async (subscription) => { try { await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: `Class in ${reminder.minutes_before} minutes`, body: `${event.title}${event.location ? ` · ${event.location}` : ""}`, url: "/notifications", tag: `event-${event.id}` }), { TTL: 300, urgency: "high" }); } catch (error: any) { if (error?.statusCode === 404 || error?.statusCode === 410) await supabase.from("push_subscriptions").delete().eq("id", subscription.id); } }));
    await supabase.from("event_reminders").update({ delivered_at: new Date().toISOString() }).eq("id", reminder.id);
  }
  return Response.json({ delivered: due.length });
});
