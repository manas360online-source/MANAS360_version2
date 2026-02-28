import { refreshAnalyticsMaterializedViews } from './analyticsRollup.job';

let timer: NodeJS.Timeout | null = null;
let pending = false;

const DEBOUNCE_SECONDS = Number(process.env.ANALYTICS_ROLLUP_DEBOUNCE_SECONDS || 60);

/**
 * Schedule a debounced refresh of analytics materialized views.
 * Multiple calls within the debounce window will result in a single refresh.
 * If `immediate` is true, the refresh runs right away.
 */
export function scheduleAnalyticsRefresh(immediate = false) {
  pending = true;
  if (immediate) {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void runRefresh();
    return;
  }

  if (timer) return; // already scheduled

  timer = setTimeout(() => {
    timer = null;
    void runRefresh();
  }, DEBOUNCE_SECONDS * 1000);
}

async function runRefresh() {
  if (!pending) return;
  pending = false;
  try {
    await refreshAnalyticsMaterializedViews();
  } catch (e) {
    console.error('analytics: queued refresh failed', e);
  }
}

export function stopAnalyticsSchedule() {
  if (timer) clearTimeout(timer);
  timer = null;
  pending = false;
}
