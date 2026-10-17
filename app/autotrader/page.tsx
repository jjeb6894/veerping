import { redirect } from "next/navigation";

export default function AutotraderPage() {
  redirect("/search?platform=autotrader");
}
