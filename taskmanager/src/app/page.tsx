import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function Home() {
  let projects: { id: string; name: string; key: string; description: string | null; _count: { tasks: number; members: number } }[] = [];

  try {
    projects = await prisma.project.findMany({
      include: {
        _count: { select: { tasks: true, members: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    // DB not ready yet
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
            TaskManager
          </h1>
          <Link
            href="/new-project"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            + 새 프로젝트
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-semibold text-zinc-900 dark:text-white">
          프로젝트
        </h2>

        {projects.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-zinc-300 bg-white p-16 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
              <svg className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
              프로젝트가 없습니다
            </h3>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              첫 번째 프로젝트를 생성하여 태스크 관리를 시작하세요.
            </p>
            <Link
              href="/new-project"
              className="mt-6 inline-block rounded-lg bg-zinc-900 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              프로젝트 생성
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/${project.key}/board`}
                className="group rounded-xl border border-zinc-200 bg-white p-6 transition hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-100 text-sm font-bold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                    {project.key.slice(0, 2)}
                  </span>
                  <div>
                    <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-600 dark:text-white dark:group-hover:text-zinc-300">
                      {project.name}
                    </h3>
                    <p className="text-xs text-zinc-400">{project.key}</p>
                  </div>
                </div>
                {project.description && (
                  <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex gap-4 text-xs text-zinc-400">
                  <span>{project._count.tasks} 태스크</span>
                  <span>{project._count.members} 멤버</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
