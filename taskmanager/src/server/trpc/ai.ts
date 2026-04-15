import { z } from "zod";
import { router, protectedProcedure } from "./init";
import {
  generateStructuredTask,
  findSimilarTasks,
  structuredTaskSchema,
} from "../services/aiService";

// ---------------------------------------------------------------------------
// AI Router — natural language task generation & duplicate detection
// ---------------------------------------------------------------------------

export const aiRouter = router({
  /**
   * Generate a structured task preview from natural language input.
   * Returns a validated StructuredTask that the user can review before creating.
   */
  generateTask: protectedProcedure
    .input(
      z.object({
        naturalLanguageInput: z.string().min(1, "입력이 비어 있습니다").max(2000),
        projectId: z.string().min(1),
      }),
    )
    .mutation(async ({ input }) => {
      const structuredTask = await generateStructuredTask(
        input.naturalLanguageInput,
        input.projectId,
      );

      // Re-validate to ensure contract
      const validated = structuredTaskSchema.parse(structuredTask);

      return {
        preview: validated,
        source: process.env.ANTHROPIC_API_KEY ? ("ai" as const) : ("mock" as const),
      };
    }),

  /**
   * Check for potentially duplicate tasks based on title/description similarity.
   */
  checkDuplicates: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().default(""),
        projectId: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      const similarTasks = await findSimilarTasks(
        input.title,
        input.description,
        input.projectId,
      );

      return {
        hasDuplicates: similarTasks.length > 0,
        similarTasks,
      };
    }),
});
