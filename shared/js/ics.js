// Builds iCalendar (.ics) files, the open standard (RFC 5545) that every
// calendar app understands: iPhone, Android, Outlook, Google Calendar…

import { addMinutes, weekdayOf } from './schedule.js';

const CRLF = '\r\n';

// Time-zone definition so calendar apps know 10:45 means 10:45 in Belgium,
// in summer and in winter.
const VTIMEZONE_BRUSSELS = [
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Brussels',
  'BEGIN:DAYLIGHT',
  'TZOFFSETFROM:+0100',
  'TZOFFSETTO:+0200',
  'TZNAME:CEST',
  'DTSTART:19700329T020000',
  'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
  'END:DAYLIGHT',
  'BEGIN:STANDARD',
  'TZOFFSETFROM:+0200',
  'TZOFFSETTO:+0100',
  'TZNAME:CET',
  'DTSTART:19701025T030000',
  'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
  'END:STANDARD',
  'END:VTIMEZONE',
];

const BYDAY = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

/** Escape text values: backslash, semicolon, comma and newlines are special in iCalendar. */
const escapeText = (text) =>
  String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** "2026-10-11" + "10:45" → "20261011T104500" */
const localStamp = (date, time) => `${date.replaceAll('-', '')}T${time.replace(':', '')}00`;

const utcStamp = (d = new Date()) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

/** Lines may be at most 75 bytes; longer lines continue on the next line, starting with a space. */
function fold(line) {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const decoder = new TextDecoder();
  const chunks = [];
  let start = 0;
  while (start < bytes.length) {
    let end = Math.min(start + (start === 0 ? 75 : 74), bytes.length);
    // Never cut a multi-byte character (é, ë…) in half.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(decoder.decode(bytes.slice(start, end)));
    start = end;
  }
  return chunks.join(`${CRLF} `);
}

function vevent({ uid, date, time, durationMinutes, summary, location, geo, rrule, exdates = [] }) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${utcStamp()}`,
    `DTSTART;TZID=Europe/Brussels:${localStamp(date, time)}`,
    `DTEND;TZID=Europe/Brussels:${localStamp(date, addMinutes(time, durationMinutes))}`,
    ...(rrule ? [`RRULE:${rrule}`] : []),
    ...exdates.map((d) => `EXDATE;TZID=Europe/Brussels:${localStamp(d, time)}`),
    `SUMMARY:${escapeText(summary)}`,
    `LOCATION:${escapeText(location)}`,
    ...(geo ? [`GEO:${geo.lat};${geo.lng}`] : []),
    'END:VEVENT',
  ];
}

function calendar(events, name) {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Parochie Sint-Niklaas Herfelingen//Website//NL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    ...VTIMEZONE_BRUSSELS,
    ...events.flat(),
    'END:VCALENDAR',
  ]
    .map(fold)
    .join(CRLF) + CRLF;
}

/** One single celebration. */
export function singleEventIcs(church, item, summary) {
  const event = vevent({
    uid: `${church.id}-${localStamp(item.date, item.time)}@parochie-herfelingen`,
    ...item,
    summary,
    location: church.address,
    geo: church.coords,
  });
  return calendar([event], summary);
}

/** The whole schedule: one repeating event per weekly rule + the extra celebrations. */
export function seriesIcs(church, { firstDates, titleFor, calendarName }) {
  const { weekly, exceptions = [] } = church.schedule;
  const events = weekly.map((rule, i) =>
    vevent({
      uid: `${church.id}-weekly-${i}@parochie-herfelingen`,
      ...rule,
      date: firstDates[i],
      rrule: `FREQ=WEEKLY;BYDAY=${BYDAY[rule.weekday]}`,
      exdates: exceptions
        .filter((ex) => ex.cancel && (!ex.time || ex.time === rule.time) && weekdayOf(ex.date) === rule.weekday)
        .map((ex) => ex.date),
      summary: titleFor(rule),
      location: church.address,
      geo: church.coords,
    }),
  );
  const extras = exceptions
    .filter((ex) => !ex.cancel)
    .map((ex) =>
      vevent({
        uid: `${church.id}-${localStamp(ex.date, ex.time)}@parochie-herfelingen`,
        durationMinutes: 60,
        type: 'eucharist',
        ...ex,
        summary: titleFor({ type: 'eucharist', ...ex }),
        location: church.address,
        geo: church.coords,
      }),
    );
  return calendar([...events, ...extras], calendarName);
}

/** Let the browser download a text file. */
export function download(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
