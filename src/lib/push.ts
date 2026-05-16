import webpush from "web-push";

// Generate VAPID keys once with: npx web-push generate-vapid-keys
// Then add to .env.local:
//   VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  (same public key, for the client)

const publicKey  = process.env.VAPID_PUBLIC_KEY  ?? "";
const privateKey = process.env.VAPID_PRIVATE_KEY ?? "";

if (publicKey && privateKey) {
  webpush.setVapidDetails(
    "mailto:support@fundsflee.app",
    publicKey,
    privateKey
  );
}

export async function sendPushNotification(
  subscriptionJson: string,
  payload: { title: string; body: string; tag?: string; url?: string }
): Promise<void> {
  if (!publicKey || !privateKey) return; // VAPID not configured — skip silently

  const subscription = JSON.parse(subscriptionJson) as webpush.PushSubscription;
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
