export type ConnectivityEvent = { type: string; at: number };

export type UptimeResult = {
    windowMs: number;
    offlineMs: number;
    outages: number;
    longestOutageMs: number;
    uptimePercent: number;
};

/**
 * آپ‌تایم از روی رویدادهای قطع/وصل (خالص).
 * @param initiallyOffline وضعیت در ابتدای بازه (آخرین رویداد قبل از آن)
 * قطعیِ هنوز ادامه‌دار تا پایان بازه (to) حساب می‌شود.
 */
export function computeUptime(
    events: ConnectivityEvent[],
    from: number,
    to: number,
    initiallyOffline: boolean,
): UptimeResult {
    const windowMs = Math.max(to - from, 0);
    let offlineSince: number | null = initiallyOffline ? from : null;
    let offlineMs = 0;
    let outages = initiallyOffline ? 1 : 0;
    let longest = 0;

    const closeOutage = (end: number) => {
        if (offlineSince === null) return;
        const length = Math.max(end - offlineSince, 0);
        offlineMs += length;
        longest = Math.max(longest, length);
        offlineSince = null;
    };

    for (const event of [...events].sort((a, b) => a.at - b.at)) {
        if (event.at < from || event.at > to) continue;

        if (event.type === "went_offline" && offlineSince === null) {
            offlineSince = event.at;
            outages += 1;
        } else if (event.type === "came_online") {
            closeOutage(event.at);
        }
    }
    closeOutage(to);

    return {
        windowMs,
        offlineMs,
        outages,
        longestOutageMs: longest,
        uptimePercent:
            windowMs === 0 ? 100 : Math.round(((windowMs - offlineMs) / windowMs) * 10000) / 100,
    };
}