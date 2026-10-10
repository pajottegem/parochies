import { test } from 'node:test';
import assert from 'node:assert/strict';
import { singleEventIcs, seriesIcs } from '../shared/js/ics.js';

const church = {
  id: 'herfelingen',
  address: 'Sint-Niklaasstraat, 1540 Herfelingen (Pajottegem)',
  coords: { lat: 50.74806, lng: 4.09667 },
  schedule: {
    weekly: [{ weekday: 0, time: '10:45', durationMinutes: 60, type: 'eucharist' }],
    exceptions: [
      { date: '2026-11-01', cancel: true },
      { date: '2026-12-24', time: '23:00', type: 'eucharist' },
    ],
  },
};

test('single event has Belgian local times and escaped text', () => {
  const ics = singleEventIcs(church, { date: '2026-10-11', time: '10:45', durationMinutes: 60 }, 'Eucharistie');
  assert.match(ics, /DTSTART;TZID=Europe\/Brussels:20261011T104500\r\n/);
  assert.match(ics, /DTEND;TZID=Europe\/Brussels:20261011T114500\r\n/);
  assert.match(ics, /LOCATION:Sint-Niklaasstraat\\, 1540 Herfelingen \(Pajottegem\)/);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
});

test('series repeats weekly, skips cancelled dates and adds extras', () => {
  const ics = seriesIcs(church, { firstDates: ['2026-10-11'], titleFor: () => 'Eucharistie', calendarName: 'Herfelingen' });
  assert.match(ics, /RRULE:FREQ=WEEKLY;BYDAY=SU/);
  assert.match(ics, /EXDATE;TZID=Europe\/Brussels:20261101T104500/);
  assert.match(ics, /DTSTART;TZID=Europe\/Brussels:20261224T230000/);
  assert.equal(ics.match(/BEGIN:VEVENT/g).length, 2);
});

test('no line is longer than 75 bytes', () => {
  const ics = singleEventIcs(church, { date: '2026-10-11', time: '10:45', durationMinutes: 60 },
    'Eucharistieviering – Sint-Niklaaskerk Herfelingen met een héél lange titel die zeker gevouwen moet worden');
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, line);
});
