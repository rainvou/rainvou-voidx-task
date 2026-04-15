import { router } from "./init";
import { workflowRouter } from "./workflow";
import { projectRouter } from "./project";
import { taskRouter } from "./task";

export const appRouter = router({
  project: projectRouter,
  workflow: workflowRouter,
  task: taskRouter,
});

export type AppRouter = typeof appRouter;
