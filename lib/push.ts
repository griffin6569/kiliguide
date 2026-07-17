import { supabase } from "./supabase";

function toBytes(base64: string) { const padded = `${base64}${"=".repeat((4 - base64.length % 4) % 4)}`.replace(/-/g, "+").replace(/_/g, "/"); const raw = atob(padded); return Uint8Array.from(raw, (char) => char.charCodeAt(0)); }

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) throw new Error("Push notifications are not supported by this browser.");
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) throw new Error("Push notifications are not configured yet.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Notification permission was not granted.");
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toBytes(publicKey) });
  if (!supabase) throw new Error("Supabase has not been configured.");
  const { error } = await supabase.functions.invoke("save-push-subscription", { body: { subscription: subscription.toJSON() } });
  if (error) throw error;
  return subscription;
}
