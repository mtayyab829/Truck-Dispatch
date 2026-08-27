import { redirect } from "next/navigation";

export default function CommissionsRedirect() {
  redirect("/finances?tab=payments");
}
