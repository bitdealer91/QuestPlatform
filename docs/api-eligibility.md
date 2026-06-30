# Eligibility percent API

Odyssey uses **4 program weeks** (`PROGRAM_WEEKS` / `weeks` in `data/tasks.json`). Each week unlocks up to **`capPerWeek`%** (~20%) when mandatory tasks are completed; program total from this API tops out at **`maxProgramUnlock`** (4 × 20% = **80%**).

Shared constant: [`lib/eligibilityPercent.ts`](/lib/eligibilityPercent.ts).

---

## Production — `GET /api/eligibility/percent`

**Base:** `https://<host>/api/eligibility/percent`

| Query | Meaning |
|--------|---------|
| `describe=1` | No `address` required. Returns `programWeeks`, `capPerWeek`, `maxProgramUnlock` from `tasks.json`. |
| `address=0x…` | Required unless `describe=1`. Lowercase 0x + 40 hex. |
| `walletAddress=0x…` | Alias for `address`. |
| `debug=1` | Adds `debug.mandatoryByWeek`, `debug.verifiedIds`. |
| `unlock_test=1` | Experimental: resolves week‑3 mandatory via external verify APIs where configured. |

### Describe (catalog)

```http
GET /api/eligibility/percent?describe=1
```

Example JSON:

```json
{
  "describe": true,
  "programWeeks": 4,
  "capPerWeek": 20,
  "maxProgramUnlock": 80,
  "hint": "GET with ?address=0x… for live progress from Redis; optional debug=1."
}
```

### Live wallet

```http
GET /api/eligibility/percent?address=0x…
```

Response includes:

- `totalUnlockedPercentage` — sum of `weeks[].unlockedPercentage`
- `currentWeek` — 1-based quest calendar week from `programStart` (same for all wallets)
- `endAt` — Unix seconds
- `weeks` — `[{ unlockedPercentage }, …]`
- `programWeeks`, `capPerWeek`, `maxProgramUnlock`

### Week drop unlock schedule

Quest tasks are available during each calendar week, but **`weeks[n].unlockedPercentage` stays `0` until that quest week ends**. Verified tasks still count — the % appears on the unlock date/time.

Default unlock day for week *N* (1-based): `programStart + N × 7 days` at **00:00 UTC**.

With `programStart: 2026-06-30T00:00:00Z` and no extra config:

| Week slot | Unlock (UTC) |
|-----------|----------------|
| `weeks[0]` | 2026-07-07T00:00:00.000Z |
| `weeks[1]` | 2026-07-14T00:00:00.000Z |
| `weeks[2]` | 2026-07-21T00:00:00.000Z |
| `weeks[3]` | 2026-07-28T00:00:00.000Z |

Inspect computed times: `GET /api/eligibility/percent?describe=1` → `weekDropUnlockAt[]`.

#### Option A — time of day (all weeks, same clock)

In `data/tasks.json`:

```json
{
  "programStart": "2026-06-30T00:00:00Z",
  "weekDropUnlockTime": "12:00:00",
  "weekDropUnlockTimezone": "UTC",
  "weeks": 4,
  "tasks": []
}
```

Week 1 unlock becomes **2026-07-07T12:00:00Z**, week 2 **2026-07-14T12:00:00Z**, etc.

Or via Vercel env (overrides JSON, no redeploy of tasks file):

| Env | Example |
|-----|---------|
| `ELIGIBILITY_DROP_UNLOCK_TIME` | `12:00` or `12:00:00` |
| `ELIGIBILITY_DROP_UNLOCK_TZ` | `UTC`, `Europe/Berlin`, … |

#### Option B — exact timestamp per week (full manual control)

In `data/tasks.json`:

```json
"weekDropUnlocks": [
  "2026-07-07T12:00:00Z",
  "2026-07-14T12:00:00+02:00",
  "2026-07-21T12:00:00Z",
  "2026-07-28T12:00:00Z"
]
```

Or env `ELIGIBILITY_DROP_UNLOCKS` — JSON array or comma-separated ISO strings (overrides JSON).

Priority: **explicit per-week ISO** → else **time + timezone on unlock day** → else midnight UTC.

Logic: [`lib/eligibilityPercent.ts`](/lib/eligibilityPercent.ts) (`isWeekDropUnlocked`, `resolveWeekDropSchedule`).

---

## Mock — `GET /api/mock/eligibility/percent`

**Base:** `https://<host>/api/mock/eligibility/percent`

Use for partner demos / local QA without Redis. Always returns `"mock": true`.

**Default `currentWeek` is `4`** so all four week slots can show progress over the full program. Optional **`?currentWeek=1..4`** simulates an earlier timeline (later slots zeroed, like production). The live percent API still uses `programStart` from `tasks.json`.

| Query | Meaning |
|--------|---------|
| `describe=1` | Lists demo wallets + `defaultCurrentWeek`, `capPerWeek`, `maxProgramUnlock`. |
| `address=0x…` | Valid 0x address; fixture or pseudo-random total. |
| `currentWeek=1..4` | Timeline override (default **4**). |
| `preset=<name>` | Fixed scenario (see presets). |

### Describe

```http
GET /api/mock/eligibility/percent?describe=1
```

Returns `mock: true`, `wallets[]` with `address`, `note`, totals, `weeks[]`.

---

### Presets (`preset`)

All presets use four weeks `[w1,w2,w3,w4]` with each slot ≤ **20%**.

Replace `<BASE>` with your origin (e.g. `http://localhost:3000`).

| Preset | `weeks` array | Total | Example |
|--------|----------------|-------|---------|
| `clique-225` **or** `sample-225` | `[5,15,20,5]`, `currentWeek` **4** | **45%** | `<BASE>/api/mock/eligibility/percent?address=0x0000000000000000000000000000000000000001&preset=clique-225` |
| `clique-0` | all `0`, `currentWeek` **4** | **0%** | `…&preset=clique-0` |
| `clique-50` | split fill, `currentWeek` **4** | **50%** | `…&preset=clique-50` |
| `clique-80` **or** `full` | `[20,20,20,20]` | **80%** | `…&preset=full` |

`address` can be any valid hex when using `preset` (required by the route).

---

### Curated demo addresses (no `preset`)

| Address | Note (approx.) |
|---------|----------------|
| `0x4a7f2e9b1c8d3f6a5e0b4c9d2e7f1a8b3c6d5e0` | 0% |
| `0x7d3a9e2f1b4c8a5061728394fedcba9876543210` | 45% — `5/15/20/5` |
| `0x8b3c2d1e4f5a678901234567890abcdef1234567` | 35% |
| `0x6e1c4a2d9b705f831e2c5d8a7f903b4e1c6d2a8f` | 50% |
| `0xc9e1f2a3b4d5061728394a5b6c7d8e9f0a1b2c3d` | 80% |
| `0x51f0e9d8c7b6a594837261504132231415161718` | 80% (program max) |

Example:

```http
GET /api/mock/eligibility/percent?address=0x7d3a9e2f1b4c8a5061728394fedcba9876543210
```

---

### Pseudo-random (unknown address)

Any other valid `0x` + 40 hex → deterministic total in **0…80%**, step **5%** (hash of address).

```http
GET /api/mock/eligibility/percent?address=0x1234567890123456789012345678901234567890
```

---

## Mint eligibility (reference)

- `GET /api/mint/eligibility?address=0x…&week=1..4` — when reading partner `AIRDROP_PERCENT_URL`, week is **eligible** if that week’s `unlockedPercentage` ≥ **`capPerWeek` (20)** (all mandatory done for that week).
- Same threshold in `POST /api/mint/intent` for prod percent path.

---

## `AIRDROP_PERCENT_URL`

Point production mint flow at either:

- real partner URL returning the same JSON shape as production percent, **or**
- mock: `https://<host>/api/mock/eligibility/percent?address=:address` (if your template supports `?address=` substitution).
