import { Suspense } from "react";
import FinancesClient from "./finances-client";

export default function FinancesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-slate-500">Loading finances…</p>}>
      <FinancesClient />
    </Suspense>
  );
}
