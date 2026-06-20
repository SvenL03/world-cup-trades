import { NextResponse } from "next/server";
import { getStandings } from "@/lib/standings";

export const revalidate = 600; // 10 min ISR cache

export async function GET() {
  try {
    const data = await getStandings();
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "s-maxage=600, stale-while-revalidate=1200",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 },
    );
  }
}
