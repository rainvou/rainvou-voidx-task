import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export interface GitWebhookJobData {
  eventType: string; // e.g. "push", "pull_request"
  payload: Record<string, unknown>;
}

export const gitWebhookQueue = new Queue<GitWebhookJobData>("git-webhook", {
  connection,
});

export async function addGitWebhookJob(data: GitWebhookJobData) {
  return gitWebhookQueue.add("git-webhook-event", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  });
}
