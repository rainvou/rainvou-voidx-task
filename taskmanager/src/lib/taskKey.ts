import { prisma } from "./prisma";
export { parseTaskKey } from "./taskKeyParser";

export async function generateTaskKey(projectId: string): Promise<string> {
  const project = await prisma.project.update({
    where: { id: projectId },
    data: { taskCounter: { increment: 1 } },
    select: { key: true, taskCounter: true },
  });
  return `${project.key}-${project.taskCounter}`;
}
