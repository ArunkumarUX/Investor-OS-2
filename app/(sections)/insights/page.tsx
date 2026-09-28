import { redirect } from "next/navigation";

export default function InsightsPage() {
  redirect("/memory?view=insights");
}
