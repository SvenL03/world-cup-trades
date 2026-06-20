import { getTradesWithPL } from "@/lib/trades";
import { getRole } from "@/lib/auth";
import { TradesClient } from "@/components/TradesClient";
import { TradesLogin } from "@/components/TradesLogin";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const role = await getRole();
  if (!role) return <TradesLogin />;

  const trades = await getTradesWithPL();
  return <TradesClient initial={trades} canEdit={role === "editor"} />;
}
