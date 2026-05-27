import { NextResponse } from "next/server";
import {
  ELIGIBILITY_UNLOCK_CAP_PER_WEEK,
  DEFAULT_MAX_PROGRAM_UNLOCK,
} from "@/lib/eligibilityPercent";
import { PROGRAM_WEEKS } from "@/lib/weeks";

export const runtime = "nodejs";

const MOCK_CAP_PER_WEEK = ELIGIBILITY_UNLOCK_CAP_PER_WEEK;
const MAX_PROGRAM_UNLOCK = DEFAULT_MAX_PROGRAM_UNLOCK;

/** Mock defaults to full program timeline so all week slots can show progress. */
const MOCK_DEFAULT_CURRENT_WEEK = PROGRAM_WEEKS;

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

function resolveMockCurrentWeek(url: URL, profileWeek?: number): number {
  const raw = url.searchParams.get("currentWeek");
  if (raw != null && raw !== "") {
    const n = Number(raw);
    if (Number.isFinite(n)) {
      return Math.max(1, Math.min(PROGRAM_WEEKS, Math.floor(n)));
    }
  }
  if (profileWeek != null) {
    return Math.max(1, Math.min(PROGRAM_WEEKS, Math.floor(profileWeek)));
  }
  return MOCK_DEFAULT_CURRENT_WEEK;
}

/**
 * When currentWeek < programWeeks, zero out weeks not yet reached on the timeline
 * (same idea as production). At currentWeek === 4 all slots may show progress.
 */
function applyTimelineToProfile(p: MockProfile): MockProfile {
  const cw = Math.max(1, Math.min(PROGRAM_WEEKS, Math.floor(p.currentWeek)));
  const weeks = p.weeks.map((w, idx) => {
    if (idx >= cw) return { unlockedPercentage: 0 };
    return { unlockedPercentage: Math.max(0, Math.min(MOCK_CAP_PER_WEEK, w.unlockedPercentage || 0)) };
  });
  const total = Math.min(sumWeeks(weeks), MAX_PROGRAM_UNLOCK);
  return { ...p, currentWeek: cw, weeks, totalUnlockedPercentage: total };
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
  currentWeek: number = MOCK_DEFAULT_CURRENT_WEEK,
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
    note: "0% — no unlock across 4 weeks (currentWeek 4)",
    profile: profile(splitByWeeks(0), MOCK_DEFAULT_CURRENT_WEEK),
  },
  {
    address: "0x7d3a9e2f1b4c8a5061728394fedcba9876543210",
    note: "45% — weeks 5 / 15 / 20 / 5",
    profile: profile(makeWeeksFromExplicit([5, 15, 20, 5]), MOCK_DEFAULT_CURRENT_WEEK),
  },
  {
    address: "0x8b3c2d1e4f5a678901234567890abcdef1234567",
    note: "35% — weeks 20 + 15 + 0 + 0",
    profile: profile(splitByWeeks(35), MOCK_DEFAULT_CURRENT_WEEK),
  },
  {
    address: "0x6e1c4a2d9b705f831e2c5d8a7f903b4e1c6d2a8f",
    note: "50% — weeks 20 + 20 + 10 + 0",
    profile: profile(splitByWeeks(50), MOCK_DEFAULT_CURRENT_WEEK),
  },
  {
    address: "0xc9e1f2a3b4d5061728394a5b6c7d8e9f0a1b2c3d",
    note: "80% — all 4 weeks at 20% cap",
    profile: profile(makeWeeksFromExplicit([20, 20, 20, 20]), MOCK_DEFAULT_CURRENT_WEEK),
  },
  {
    address: "0x51f0e9d8c7b6a594837261504132231415161718",
    note: "80% — program max (4 × 20%)",
    profile: profile(splitByWeeks(MAX_PROGRAM_UNLOCK), MOCK_DEFAULT_CURRENT_WEEK),
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
        defaultCurrentWeek: MOCK_DEFAULT_CURRENT_WEEK,
        capPerWeek: MOCK_CAP_PER_WEEK,
        maxProgramUnlock: MAX_PROGRAM_UNLOCK,
        hint: "GET with ?address=0x…; default currentWeek is 4 (full program). Optional ?currentWeek=1..4 to simulate calendar gating.",
        wallets: MOCK_PARTNER_WALLETS.map((w) => {
          const sanitized = applyTimelineToProfile(w.profile);
          return {
            address: w.address,
            note: w.note,
            totalUnlockedPercentage: sanitized.totalUnlockedPercentage,
            currentWeek: sanitized.currentWeek,
            weeks: sanitized.weeks,
          };
        }),
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
    const start = new Date("2026-04-07T00:00:00Z");
    const endAt = Math.floor(
      (start.getTime() + PROGRAM_WEEKS * 7 * 24 * 60 * 60 * 1000) / 1000,
    );

    let payload: MockProfile;
    if (preset === "clique-225" || preset === "sample-225") {
      payload = profile(makeWeeksFromExplicit([5, 15, 20, 5]), MOCK_DEFAULT_CURRENT_WEEK);
    } else if (preset === "clique-0") {
      payload = profile(splitByWeeks(0), MOCK_DEFAULT_CURRENT_WEEK);
    } else if (preset === "clique-50") {
      payload = profile(splitByWeeks(50), MOCK_DEFAULT_CURRENT_WEEK);
    } else if (preset === "clique-80" || preset === "full") {
      payload = profile(makeWeeksFromExplicit([20, 20, 20, 20]), MOCK_DEFAULT_CURRENT_WEEK);
    } else {
      const fixed = MOCK_FIXTURES[address];
      const computedTotal = fixed ? fixed.totalUnlockedPercentage : stablePseudoPercent(address);
      payload = fixed || profile(splitByWeeks(computedTotal), MOCK_DEFAULT_CURRENT_WEEK);
    }

    payload = applyTimelineToProfile({
      ...payload,
      currentWeek: resolveMockCurrentWeek(url, payload.currentWeek),
    });

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
