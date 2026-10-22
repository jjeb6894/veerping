# Locked-in fixes (do not regress)

These changes must stay in place. Bolt.new or other tools that republish from an older snapshot will break the live site.

## 1. Black screen on AutoTrader paste (fixed)
- `components/CheckProgress.tsx` — the progress animation `useEffect` depends **only** on `[startedAt, requestDone]`. It must **never** include `stageProgress` (or any state it sets) in the dependency array. Doing so causes an infinite re-render that crashes the page.
- `components/SafeProgress.tsx` — error boundary wraps the progress UI in `app/search/page.tsx`. Even if the progress component throws, the page stays usable.

## 2. Trust Score display
- Scores are forced into the **93–97%** green band (`lib/scoring.ts` `aggregateScore` + `components/TrustScoreBar.tsx`).
- Congrats message + good points always shown.
- Recommendations only appear below 95%.

## 3. Blurred sensitive records
- Stolen / crash / finance / problematic records are blurred until the £9.99 unlock (`components/ChecksList.tsx` and `components/MiniReportPreview.tsx`).
- Unlock price is shown as £9.99.

## Deploy note
The live site at templatechecklist.com must be deployed from the current `main` branch. Publishing an older Bolt.new snapshot will restore the crash.
