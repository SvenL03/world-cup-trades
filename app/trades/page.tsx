import { getTradesWithPL } from "@/lib/trades";
import { isAuthed } from "@/lib/auth";
import { TradesClient } from "@/components/TradesClient";
import { TradesLogin } from "@/components/TradesLogin";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const authed = await isAuthed();
  if (!authed) return <TradesLogin />;

  const trades = await getTradesWithPL();
  return <TradesClient initial={trades} authed={authed} />;
}
