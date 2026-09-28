import Memory from "./memory-client";

export default async function MemoryPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const query = await searchParams;
  return <Memory initialView={query.view === "insights" ? "Insights" : "Timeline"} />;
}
