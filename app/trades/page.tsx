import { getTradesWithPL } from "@/lib/trades";
import { isAuthed } from "@/lib/auth";
import { TradesClient } from "@/components/TradesClient";

export const dynamic = "force-dynamic";

export default async function TradesPage() {
  const [trades, authed] = await Promise.all([getTradesWithPL(), isAuthed()]);
  return <TradesClient initial={trades} authed={authed} />;
}
