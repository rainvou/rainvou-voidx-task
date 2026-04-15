import { NextRequest, NextResponse } from "next/server";
import { verifyGitHubSignature } from "@/server/services/webhookService";
import { addGitWebhookJob } from "@/server/queue/gitWebhookQueue";

export async function POST(request: NextRequest) {
  const eventType = request.headers.get("x-github-event") ?? "unknown";
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  // Read raw body for signature verification
  const rawBody = await request.text();

  // Verify webhook signature when a secret is configured
  const webhookSecret = process.env.GIT_WEBHOOK_SECRET;
  if (webhookSecret) {
    const isValid = verifyGitHubSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Enqueue immediately and return 200
  await addGitWebhookJob({ eventType, payload });

  return NextResponse.json({ ok: true, event: eventType });
}
