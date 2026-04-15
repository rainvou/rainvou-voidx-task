import { Queue } from "bullmq";
import Redis from "ioredis";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// ---------------------------------------------------------------------------
// AI task queue — processes async AI generation jobs
// ---------------------------------------------------------------------------

export interface AiJobData {
  type: "generate-task" | "check-duplicates";
  projectId: string;
  input: string;
  userId: string;
}

export const aiQueue = new Queue<AiJobData>("ai-tasks", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

/**
 * Add an AI processing job to the queue.
 */
export async function addAiJob(data: AiJobData) {
  return aiQueue.add(`ai-${data.type}`, data, {
    priority: data.type === "check-duplicates" ? 1 : 2,
  });
}
