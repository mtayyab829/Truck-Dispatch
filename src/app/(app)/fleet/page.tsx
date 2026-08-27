import { Suspense } from "react";
import FleetPage from "./fleet-client";

export default function Page() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading fleet…</p>}>
      <FleetPage />
    </Suspense>
  );
}
