// Duka · Error alerts: when the app breaks on someone's phone, a short report goes to the admin's
// Errors list. Only signed-in users report, at most 10 different errors per page load, and the
// database drops anything beyond 30 reports per person per 10 minutes. No shop data is included.
const APP_VERSION = 'v16';
(function () {
  let sent = 0;
  const seen = new Set();
  const NOISE = /ResizeObserver|^Script error\.?$|Failed to fetch|NetworkError|Load failed|offline|AbortError/i;
  function report(message, source, stack) {
    try {
      message = String(message || 'Unknown error').slice(0, 500);
      if (NOISE.test(message) || seen.has(message) || sent >= 10) return;
      if (!S.uid || S.demo || !navigator.onLine) return;
      seen.add(message); sent++;
      sb.from('client_errors').insert({
        shop_id: (S.shop && S.shop.id) || null, message,
        source: String(source || '').slice(0, 300), stack: String(stack || '').slice(0, 2000),
        url: location.pathname.slice(0, 300), user_agent: navigator.userAgent.slice(0, 300), app_version: APP_VERSION,
      }).then(() => {}, () => {});
    } catch (e) { /* never let error reporting break the app */ }
  }
  addEventListener('error', (e) => report(e.message, `${(e.filename || '').replace(location.origin, '')}:${e.lineno}:${e.colno}`, e.error && e.error.stack));
  addEventListener('unhandledrejection', (e) => { const r = e.reason; report((r && r.message) || String(r), 'promise', r && r.stack); });
  window.reportAppError = report;
})();
