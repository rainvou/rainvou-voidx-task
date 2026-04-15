import { Worker, Job } from "bullmq";
import Redis from "ioredis";
import { parseTaskKey } from "@/lib/taskKeyParser";
import { prisma } from "@/lib/prisma";
import type { GitWebhookJobData } from "./gitWebhookQueue";

const connection = new Redis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

/**
 * Find tasks by their key and return them with projectId.
 */
async function findTasksByKeys(keys: string[]) {
  if (keys.length === 0) return [];
  return prisma.task.findMany({
    where: { taskKey: { in: keys } },
    select: { id: true, taskKey: true, projectId: true, statusId: true },
  });
}

/**
 * Find the "Review" workflow status for a project (case-insensitive match on name containing "review").
 */
async function findReviewStatus(projectId: string) {
  return prisma.workflowStatus.findFirst({
    where: {
      projectId,
      name: { contains: "review", mode: "insensitive" },
    },
  });
}

/**
 * Find the "Done" workflow status for a project (isDone = true).
 */
async function findDoneStatus(projectId: string) {
  return prisma.workflowStatus.findFirst({
    where: {
      projectId,
      isDone: true,
    },
  });
}

/**
 * Process push events: parse commit messages for task keys, create TaskEvent records.
 */
async function handlePushEvent(payload: Record<string, unknown>) {
  const commits = (payload.commits as Array<{ message: string; id: string }>) ?? [];

  for (const commit of commits) {
    const keys = parseTaskKey(commit.message);
    const tasks = await findTasksByKeys(keys);

    for (const task of tasks) {
      await prisma.taskEvent.create({
        data: {
          taskId: task.id,
          type: "GIT_COMMIT",
          data: {
            commitId: commit.id,
            message: commit.message,
            taskKey: task.taskKey,
          },
        },
      });
    }
  }
}

/**
 * Process pull_request events:
 * - opened: find task keys in branch name or PR title, change status to "Review"
 * - closed+merged: change status to "Done"
 */
async function handlePullRequestEvent(payload: Record<string, unknown>) {
  const action = payload.action as string;
  const pr = payload.pull_request as {
    title?: string;
    merged?: boolean;
    number?: number;
    html_url?: string;
    head?: { ref?: string };
  } | undefined;

  if (!pr) return;

  const branchName = pr.head?.ref ?? "";
  const prTitle = pr.title ?? "";

  // Extract task keys from both branch name and PR title
  const branchKeys = parseTaskKey(branchName);
  const titleKeys = parseTaskKey(prTitle);
  const uniqueKeys = [...new Set([...branchKeys, ...titleKeys])];

  const tasks = await findTasksByKeys(uniqueKeys);

  if (action === "opened" || action === "reopened") {
    for (const task of tasks) {
      const reviewStatus = await findReviewStatus(task.projectId);
      if (reviewStatus && reviewStatus.id !== task.statusId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { statusId: reviewStatus.id },
        });

        await prisma.taskEvent.create({
          data: {
            taskId: task.id,
            type: "GIT_PR_OPENED",
            data: {
              prNumber: pr.number,
              prTitle: pr.title,
              prUrl: pr.html_url,
              branch: branchName,
              taskKey: task.taskKey,
              newStatusId: reviewStatus.id,
              newStatusName: reviewStatus.name,
            },
          },
        });
      }
    }
  } else if (action === "closed" && pr.merged) {
    for (const task of tasks) {
      const doneStatus = await findDoneStatus(task.projectId);
      if (doneStatus && doneStatus.id !== task.statusId) {
        await prisma.task.update({
          where: { id: task.id },
          data: { statusId: doneStatus.id },
        });

        await prisma.taskEvent.create({
          data: {
            taskId: task.id,
            type: "GIT_PR_MERGED",
            data: {
              prNumber: pr.number,
              prTitle: pr.title,
              prUrl: pr.html_url,
              branch: branchName,
              taskKey: task.taskKey,
              newStatusId: doneStatus.id,
              newStatusName: doneStatus.name,
            },
          },
        });
      }
    }
  }
}

async function processJob(job: Job<GitWebhookJobData>) {
  const { eventType, payload } = job.data;

  switch (eventType) {
    case "push":
      await handlePushEvent(payload);
      break;
    case "pull_request":
      await handlePullRequestEvent(payload);
      break;
    default:
      // Unsupported event type — silently ignore
      break;
  }
}

export const gitWebhookWorker = new Worker<GitWebhookJobData>(
  "git-webhook",
  processJob,
  {
    connection,
    concurrency: 5,
  },
);

gitWebhookWorker.on("failed", (job, err) => {
  console.error(`[git-webhook] Job ${job?.id} failed:`, err.message);
});

gitWebhookWorker.on("completed", (job) => {
  console.log(`[git-webhook] Job ${job.id} completed`);
});
