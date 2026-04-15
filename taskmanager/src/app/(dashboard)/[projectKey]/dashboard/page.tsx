import { DashboardPageClient } from "./DashboardPageClient";

interface DashboardPageProps {
  params: Promise<{ projectKey: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { projectKey } = await params;

  return (
    <main className="flex-1 p-6">
      <DashboardPageClient projectKey={projectKey} />
    </main>
  );
}
