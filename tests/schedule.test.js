// Run with:  node --test tests/
// Uses Node's built-in test runner, no packages needed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcoming, nextCelebration, nowInZone, addDays, addMinutes } from '../shared/js/schedule.js';

const schedule = {
  timezone: 'Europe/Brussels',
  weekly: [{ weekday: 0, time: '10:45', durationMinutes: 60, type: 'eucharist' }],
  exceptions: [],
};

// Saturday 10 October 2026
const saturday = { date: '2026-10-10', time: '09:00' };

test('date helpers', () => {
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(addMinutes('10:45', 60), '11:45');
  assert.equal(addMinutes('23:30', 45), '00:15');
});

test('nowInZone uses Belgian time, not the computer clock', () => {
  // 23:30 UTC on 31 Oct is already 00:30 on 1 Nov in Brussels (winter time, UTC+1).
  assert.deepEqual(nowInZone('Europe/Brussels', new Date('2026-10-31T23:30:00Z')), { date: '2026-11-01', time: '00:30' });
});

test('lists every Sunday from today', () => {
  const items = upcoming(schedule, { now: saturday, days: 14 });
  assert.deepEqual(items.map((i) => i.date), ['2026-10-11', '2026-10-18']);
  assert.equal(items[0].time, '10:45');
});

test('a celebration in progress is still shown, a finished one is not', () => {
  const sunday = '2026-10-11';
  assert.equal(upcoming(schedule, { now: { date: sunday, time: '11:00' }, days: 7 })[0].isToday, true);
  assert.notEqual(upcoming(schedule, { now: { date: sunday, time: '12:00' }, days: 7 })[0]?.date, sunday);
});

test('exceptions can cancel or add celebrations', () => {
  const withExceptions = {
    ...schedule,
    exceptions: [
      { date: '2026-10-18', cancel: true, note: { nl: 'Geen viering', fr: 'Pas de messe' } },
      { date: '2026-10-14', time: '19:00', type: 'eucharist' },
    ],
  };
  const items = upcoming(withExceptions, { now: saturday, days: 14 });
  assert.deepEqual(items.map((i) => `${i.date} ${i.time}${i.cancelled ? ' x' : ''}`), [
    '2026-10-11 10:45',
    '2026-10-14 19:00',
    '2026-10-18 10:45 x',
  ]);
  assert.equal(nextCelebration(withExceptions, { now: { date: '2026-10-15', time: '08:00' }, days: 14 }).date, '2026-10-25');
});
