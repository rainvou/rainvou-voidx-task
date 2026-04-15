import { BoardPageClient } from "./BoardPageClient";

interface BoardPageProps {
  params: Promise<{ projectKey: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { projectKey } = await params;

  return (
    <main className="flex-1 p-6">
      <BoardPageClient projectKey={projectKey} />
    </main>
  );
}
