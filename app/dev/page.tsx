import { notFound } from "next/navigation";
import { DevDashboard } from "./dev-dashboard";

export default function DevPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DevDashboard />;
}
