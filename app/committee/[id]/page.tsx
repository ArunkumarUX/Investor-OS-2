"use client";

import { useParams, notFound } from "next/navigation";
import DecisionScreen from "@/components/DecisionScreen";
import { companies } from "@/lib/mock-data";

export default function CommitteePage() {
  const params = useParams<{ id: string }>();
  const company = companies.find((item) => item.id === params.id);
  if (!company) notFound();
  return (
    <div className="page" style={{ maxWidth: "none", padding: 0 }}>
      <DecisionScreen companyId={company.id} />
    </div>
  );
}
