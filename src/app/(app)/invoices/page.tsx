import { redirect } from "next/navigation";

export default function InvoicesRedirect() {
  redirect("/finances?tab=invoices");
}
