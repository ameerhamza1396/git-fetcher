

# Fix Build Errors + Implement Dashboard Performance Plan

## Build Fixes

**`src/pages/Team.tsx`** — Add two missing imports:
- `import { useAuth } from '@/hooks/useAuth'`
- `import { ProfileDropdown } from '@/components/ProfileDropdown'`

## Dashboard Performance (from approved plan)

**`src/pages/Dashboard.tsx`**:
1. Remove `userStatsLoading`, `termLoading`, `caseLoading` from the main loading gate (line ~270) — only block on `authLoading || profileLoading`
2. Add inline skeleton placeholders for the stats grid, term/case cards, and announcements so they render independently
3. Optimize `userStats` query to `.select('id, is_correct, time_taken, created_at')` — reduces payload, same results
4. Keep `termOfDay`/`caseOfDay` queries as `enabled: !!userYear` but let them load progressively with their own skeletons

