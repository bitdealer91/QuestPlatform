import { NextResponse } from "next/server";

export const runtime = "nodejs";

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
  return Math.max(0, Math.min(100, Math.round(v)));
}

function splitByWeeks(total: number, weeksCount = 8): WeekItem[] {
  const out: WeekItem[] = [];
  let remain = clampPct(total);
  for (let i = 0; i < weeksCount; i++) {
    const take = Math.max(0, Math.min(10, remain));
    out.push({ unlockedPercentage: take });
    remain -= take;
  }
  return out;
}

function makeWeeksFromExplicit(values: number[], weeksCount = 8): WeekItem[] {
  const out: WeekItem[] = [];
  for (let i = 0; i < weeksCount; i++) {
    const v = i < values.length ? Number(values[i]) : 0;
    out.push({ unlockedPercentage: Math.max(0, Math.min(10, Number.isFinite(v) ? v : 0)) });
  }
  return out;
}

/** One URL for everyone; swap `address` to get different curated responses. */
const MOCK_PARTNER_WALLETS: Array<{ address: string; note: string; profile: MockProfile }> = [
  {
    address: "0x4a7f2e9b1c8d3f6a5e0b4c9d2e7f1a8b3c6d5e0",
    note: "0% total — week 1",
    profile: {
      totalUnlockedPercentage: 0,
      currentWeek: 1,
      weeks: splitByWeeks(0),
    },
  },
  {
    address: "0x7d3a9e2f1b4c8a5061728394fedcba9876543210",
    note: "22.5% — weeks 5 / 7.5 / 10 (Clique sample shape)",
    profile: {
      totalUnlockedPercentage: 22.5,
      currentWeek: 3,
      weeks: makeWeeksFromExplicit([5, 7.5, 10]),
    },
  },
  {
    address: "0x8b3c2d1e4f5a678901234567890abcdef12345678",
    note: "35% — mid program (week 4)",
    profile: {
      totalUnlockedPercentage: 35,
      currentWeek: 4,
      weeks: splitByWeeks(35),
    },
  },
  {
    address: "0x6e1c4a2d9b705f831e2c5d8a7f903b4e1c6d2a8f",
    note: "50% — week 5",
    profile: {
      totalUnlockedPercentage: 50,
      currentWeek: 5,
      weeks: splitByWeeks(50),
    },
  },
  {
    address: "0xc9e1f2a3b4d5061728394a5b6c7d8e9f0a1b2c3d",
    note: "80% — week 8",
    profile: {
      totalUnlockedPercentage: 80,
      currentWeek: 8,
      weeks: splitByWeeks(80),
    },
  },
  {
    address: "0x51f0e9d8c7b6a594837261504132231415161718",
    note: "100% — all weeks capped",
    profile: {
      totalUnlockedPercentage: 100,
      currentWeek: 8,
      weeks: splitByWeeks(100),
    },
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
  return Math.min(95, (h % 20) * 5);
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const describe = /^(1|true)$/i.test(String(url.searchParams.get("describe") || ""));
    if (describe) {
      return NextResponse.json({
        mock: true,
        describe: true,
        hint: "GET same path with ?address=0x… to receive that wallet’s payload; each address below is a fixed scenario.",
        wallets: MOCK_PARTNER_WALLETS.map((w) => ({
          address: w.address,
          note: w.note,
          totalUnlockedPercentage: w.profile.totalUnlockedPercentage,
          currentWeek: w.profile.currentWeek,
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
    const weeks = 8;
    const currentWeek = Math.min(
      weeks,
      Math.max(1, Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1)
    );
    const endAt = Math.floor((start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000) / 1000);

    let payload: MockProfile;
    if (preset === "clique-225" || preset === "sample-225") {
      const weeksExplicit = makeWeeksFromExplicit([5, 7.5, 10]);
      payload = {
        totalUnlockedPercentage: 22.5,
        currentWeek: 3,
        weeks: weeksExplicit,
      };
    } else if (preset === "clique-0") {
      payload = {
        totalUnlockedPercentage: 0,
        currentWeek: 1,
        weeks: splitByWeeks(0),
      };
    } else if (preset === "clique-50") {
      payload = {
        totalUnlockedPercentage: 50,
        currentWeek: 5,
        weeks: splitByWeeks(50),
      };
    } else {
      const fixed = MOCK_FIXTURES[address];
      const computedTotal = fixed ? fixed.totalUnlockedPercentage : stablePseudoPercent(address);
      payload = fixed || {
        totalUnlockedPercentage: computedTotal,
        currentWeek,
        weeks: splitByWeeks(computedTotal),
      };
    }

    return NextResponse.json({
      totalUnlockedPercentage: payload.totalUnlockedPercentage,
      currentWeek: payload.currentWeek,
      endAt,
      weeks: payload.weeks,
      mock: true,
    });
  } catch {
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } },
      { status: 500 }
    );
  }
}
