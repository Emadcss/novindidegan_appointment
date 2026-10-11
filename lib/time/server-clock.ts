"use client";

let serverOffsetMs = 0;
let synced = false;

export async function syncServerTime(): Promise<void> {
    const started = Date.now();

    const res = await fetch("/api/kiosk/server-time", {
        cache: "no-store",
    });

    if (!res.ok) {
        throw new Error("Failed to sync server time");
    }

    const json = await res.json();

    if (!json?.success || !json?.data?.serverTime) {
        throw new Error("Invalid server time response");
    }

    const serverMs = new Date(json.data.serverTime).getTime();
    const ended = Date.now();
    const localMid = started + (ended - started) / 2;

    serverOffsetMs = serverMs - localMid;
    synced = true;
}

/** زمان فعلی بر اساس سرور — فقط برای UI */
export function getServerNow(): Date {
    return new Date(Date.now() + serverOffsetMs);
}

export function isServerTimeSynced(): boolean {
    return synced;
}