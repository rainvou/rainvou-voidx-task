import { router } from "./init";
import { workflowRouter } from "./workflow";
import { projectRouter } from "./project";
import { taskRouter } from "./task";
import { aiRouter } from "./ai";

export const appRouter = router({
  project: projectRouter,
  workflow: workflowRouter,
  task: taskRouter,
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
