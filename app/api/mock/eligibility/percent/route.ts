import { NextResponse } from "next/server";
import {
  ELIGIBILITY_UNLOCK_CAP_PER_WEEK,
  DEFAULT_MAX_PROGRAM_UNLOCK,
} from "@/lib/eligibilityPercent";
import { PROGRAM_WEEKS } from "@/lib/weeks";

export const runtime = "nodejs";

const MOCK_CAP_PER_WEEK = ELIGIBILITY_UNLOCK_CAP_PER_WEEK;
const MAX_PROGRAM_UNLOCK = DEFAULT_MAX_PROGRAM_UNLOCK;

type WeekItem = { unlockedPercentage: number };
type MockProfile = {
  totalUnlockedPercentage: number;
  currentWeek: number;
  weeks: WeekItem[];
};

function isHexAddress(a: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(a);
}

function clampPct(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v * 10) / 10));
}

function sumWeeks(weeks: WeekItem[]): number {
  return clampPct(weeks.reduce((s, w) => s + (w.unlockedPercentage || 0), 0));
}

function splitByWeeks(total: number, weeksCount = PROGRAM_WEEKS): WeekItem[] {
  const out: WeekItem[] = [];
  let remain = clampPct(Math.min(total, MAX_PROGRAM_UNLOCK));
  for (let i = 0; i < weeksCount; i++) {
    const take = Math.max(0, Math.min(MOCK_CAP_PER_WEEK, remain));
    out.push({ unlockedPercentage: take });
    remain -= take;
  }
  return out;
}

function makeWeeksFromExplicit(values: number[], weeksCount = PROGRAM_WEEKS): WeekItem[] {
  const out: WeekItem[] = [];
  for (let i = 0; i < weeksCount; i++) {
    const v = i < values.length ? Number(values[i]) : 0;
    const pct = Number.isFinite(v) ? v : 0;
    out.push({
      unlockedPercentage: Math.max(0, Math.min(MOCK_CAP_PER_WEEK, pct)),
    });
  }
  return out;
}

function profile(
  weeks: WeekItem[],
  currentWeek: number,
  totalOverride?: number,
): MockProfile {
  const cappedWeek = Math.max(1, Math.min(PROGRAM_WEEKS, Math.floor(currentWeek)));
  const total = totalOverride != null ? clampPct(totalOverride) : sumWeeks(weeks);
  return {
    totalUnlockedPercentage: Math.min(total, MAX_PROGRAM_UNLOCK),
    currentWeek: cappedWeek,
    weeks,
  };
}

/** One URL for everyone; swap `address` to get different curated responses. */
const MOCK_PARTNER_WALLETS: Array<{ address: string; note: string; profile: MockProfile }> = [
  {
    address: "0x4a7f2e9b1c8d3f6a5e0b4c9d2e7f1a8b3c6d5e0",
    note: "0% — week 1, nothing unlocked",
    profile: profile(splitByWeeks(0), 1),
  },
  {
    address: "0x7d3a9e2f1b4c8a5061728394fedcba9876543210",
    note: "45% — weeks 5 / 15 / 20 / 5 (partial program)",
    profile: profile(makeWeeksFromExplicit([5, 15, 20, 5]), 3),
  },
  {
    address: "0x8b3c2d1e4f5a678901234567890abcdef12345678",
    note: "35% — filling weeks 1–2 (20% + 15%)",
    profile: profile(splitByWeeks(35), 4),
  },
  {
    address: "0x6e1c4a2d9b705f831e2c5d8a7f903b4e1c6d2a8f",
    note: "50% — through week 3 (20% + 20% + 10%)",
    profile: profile(splitByWeeks(50), 3),
  },
  {
    address: "0xc9e1f2a3b4d5061728394a5b6c7d8e9f0a1b2c3d",
    note: "80% — all 4 weeks at 20% cap",
    profile: profile(makeWeeksFromExplicit([20, 20, 20, 20]), 4),
  },
  {
    address: "0x51f0e9d8c7b6a594837261504132231415161718",
    note: "80% — program max (4 × 20%)",
    profile: profile(splitByWeeks(MAX_PROGRAM_UNLOCK), 4),
  },
];

const MOCK_FIXTURES: Record<string, MockProfile> = Object.fromEntries(
  MOCK_PARTNER_WALLETS.map((w) => [w.address.toLowerCase(), w.profile])
);

function stablePseudoPercent(addrLower: string): number {
  let h = 0;
  for (let i = 2; i < addrLower.length; i++) {
    h = (h * 31 + addrLower.charCodeAt(i)) % 1000003;
  }
  return Math.min(MAX_PROGRAM_UNLOCK, (h % 17) * 5);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const describe = /^(1|true)$/i.test(String(url.searchParams.get("describe") || ""));
    if (describe) {
      return NextResponse.json({
        mock: true,
        describe: true,
        programWeeks: PROGRAM_WEEKS,
        capPerWeek: MOCK_CAP_PER_WEEK,
        maxProgramUnlock: MAX_PROGRAM_UNLOCK,
        hint: "GET same path with ?address=0x… to receive that wallet’s payload; each address below is a fixed scenario.",
        wallets: MOCK_PARTNER_WALLETS.map((w) => ({
          address: w.address,
          note: w.note,
          totalUnlockedPercentage: w.profile.totalUnlockedPercentage,
          currentWeek: w.profile.currentWeek,
          weeks: w.profile.weeks,
        })),
      });
    }

    const addressRaw = String(
      url.searchParams.get("address") || url.searchParams.get("walletAddress") || ""
    ).trim();

    if (!isHexAddress(addressRaw)) {
      return NextResponse.json(
        { error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" } },
        { status: 400 }
      );
    }

    const address = addressRaw.toLowerCase();
    const preset = String(url.searchParams.get("preset") || "").trim().toLowerCase();
    const now = new Date();
    const start = new Date("2026-04-07T00:00:00Z");
    const weeks = PROGRAM_WEEKS;
    const currentWeek = Math.min(
      weeks,
      Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
    );
    const endAt = Math.floor((start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000) / 1000);

    let payload: MockProfile;
    if (preset === "clique-225" || preset === "sample-225") {
      payload = profile(makeWeeksFromExplicit([5, 15, 20, 5]), 3);
    } else if (preset === "clique-0") {
      payload = profile(splitByWeeks(0), 1);
    } else if (preset === "clique-50") {
      payload = profile(splitByWeeks(50), 3);
    } else if (preset === "clique-80" || preset === "full") {
      payload = profile(makeWeeksFromExplicit([20, 20, 20, 20]), 4);
    } else {
      const fixed = MOCK_FIXTURES[address];
      const computedTotal = fixed ? fixed.totalUnlockedPercentage : stablePseudoPercent(address);
      payload = fixed || profile(splitByWeeks(computedTotal), currentWeek);
    }

    return NextResponse.json({
      totalUnlockedPercentage: payload.totalUnlockedPercentage,
      currentWeek: payload.currentWeek,
      endAt,
      weeks: payload.weeks,
      mock: true,
      programWeeks: PROGRAM_WEEKS,
      capPerWeek: MOCK_CAP_PER_WEEK,
      maxProgramUnlock: MAX_PROGRAM_UNLOCK,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
