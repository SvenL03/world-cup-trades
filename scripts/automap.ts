import "dotenv/config";
import { autoMapTrades } from "../lib/automap";

/**
 *   npm run automap            # fill unmapped trades
 *   npm run automap -- --force # re-map everything
 */
async function main() {
  const force = process.argv.includes("--force");
  const { mapped, total, details } = await autoMapTrades(force);
  for (const d of details) {
    console.log(
      d.ticker
        ? `  ✓ ${d.label.padEnd(34)} -> ${d.ticker}`
        : `  · ${d.label.padEnd(34)} (no live market yet)`,
    );
  }
  console.log(`\nMapped ${mapped} of ${total} trades.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
