import { router } from "./init";
import { workflowRouter } from "./workflow";
import { projectRouter } from "./project";

export const appRouter = router({
  project: projectRouter,
  workflow: workflowRouter,
});

export type AppRouter = typeof appRouter;
