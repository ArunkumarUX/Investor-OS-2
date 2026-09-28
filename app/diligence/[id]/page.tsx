import { companies } from "@/lib/mock-data";
import { notFound } from "next/navigation";
import DiligenceRun from "@/components/DiligenceRun";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const company = companies.find((c) => c.id === id);
  if (!company) notFound();
  return (
    <div className="page" style={{ maxWidth: "none", padding: 0 }}>
      <DiligenceRun companyId={id} name={company.name} />
    </div>
  );
}
