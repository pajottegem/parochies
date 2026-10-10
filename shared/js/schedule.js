// Pure functions to turn a schedule (weekly rules + exceptions) into concrete
// celebrations. No DOM access here, so this module is easy to test.
//
// Dates are handled as plain "YYYY-MM-DD" strings in the church's own time
// zone (Europe/Brussels). That avoids time-zone bugs: 10:45 in Herfelingen
// stays 10:45, no matter where the visitor's computer is.

/** Current date and time in the given IANA time zone, e.g. { date: "2026-10-10", time: "09:30" }. */
export function nowInZone(timeZone, now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    })
      .formatToParts(now)
      .map(({ type, value }) => [type, value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** "2026-10-10" + 3 → "2026-10-13" */
export function addDays(isoDate, days) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday … 6 = Saturday, same convention as Date#getDay(). */
export function weekdayOf(isoDate) {
  return new Date(`${isoDate}T12:00:00Z`).getUTCDay();
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
}

/** "10:45" + 60 → "11:45" */
export function addMinutes(time, minutes) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * List the celebrations from `today` onwards, for the given number of days.
 *
 * Exceptions in the schedule can:
 *   - cancel a regular celebration: { "date": "2026-11-01", "cancel": true, "note": {...} }
 *     (add "time" to cancel only the celebration at that time)
 *   - add an extra celebration:      { "date": "2026-12-24", "time": "23:00", "type": "eucharist" }
 */
export function upcoming(schedule, { now = nowInZone(schedule.timezone), days = 42 } = {}) {
  const items = [];
  const lastDate = addDays(now.date, days - 1);

  for (let i = 0; i < days; i++) {
    const date = addDays(now.date, i);
    for (const rule of schedule.weekly) {
      if (rule.weekday === weekdayOf(date)) items.push({ ...rule, date });
    }
  }

  for (const ex of schedule.exceptions ?? []) {
    if (ex.date < now.date || ex.date > lastDate) continue;
    if (ex.cancel) {
      for (const item of items) {
        if (item.date === ex.date && (!ex.time || item.time === ex.time)) {
          item.cancelled = true;
          item.note = ex.note;
        }
      }
    } else {
      items.push({ durationMinutes: 60, type: 'eucharist', ...ex });
    }
  }

  return items
    .filter((item) => item.date > now.date || addMinutes(item.time, item.durationMinutes) > now.time)
    .map((item) => ({ ...item, isToday: item.date === now.date }))
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

/** The first celebration that is not cancelled, or undefined. */
export function nextCelebration(schedule, options) {
  return upcoming(schedule, options).find((item) => !item.cancelled);
}
