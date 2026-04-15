import { router } from "./init";
import { workflowRouter } from "./workflow";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { aiRouter } from "./ai";
import { commentRouter } from "./comment";
import { apikeyRouter } from "./apikey";

export const appRouter = router({
  project: projectRouter,
  workflow: workflowRouter,
  task: taskRouter,
  ai: aiRouter,
  comment: commentRouter,
  apikey: apikeyRouter,
});

export type AppRouter = typeof appRouter;
