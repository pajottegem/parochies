// Turns the data into HTML. Each theme decides WHERE things go (data-slot
// attributes in its index.html) and HOW they look (its styles.css);
// this module only decides WHAT is shown.

import { h, icon, fill } from './dom.js';
import { t, pick, locale } from './i18n.js';
import { upcoming, nowInZone, daysBetween } from './schedule.js';
import { singleEventIcs, seriesIcs, download } from './ics.js';
import { openLightbox } from './gallery.js';

const imageUrl = (file) => new URL(`../img/${file}`, import.meta.url).href;

// ---------- Date formatting with the built-in Intl API ----------

const asDate = (isoDate) => new Date(`${isoDate}T12:00:00Z`);
const format = (isoDate, options) =>
  new Intl.DateTimeFormat(locale(), { timeZone: 'UTC', ...options }).format(asDate(isoDate));

const longDate = (iso) => format(iso, { weekday: 'long', day: 'numeric', month: 'long' });
const weekdayName = (weekday) => format(`2026-01-0${4 + weekday}`, { weekday: 'long' }); // 4 Jan 2026 is a Sunday

/** "vandaag", "morgen", "over 3 dagen" — in the right language, thanks to Intl.RelativeTimeFormat. */
function relativeDay(iso, today) {
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const days = daysBetween(today, iso);
  return days < 14 ? rtf.format(days, 'day') : rtf.format(Math.round(days / 7), 'week');
}

const capitalize = (s) => s.charAt(0).toLocaleUpperCase(locale()) + s.slice(1);
const titleFor = (church, item) => `${t(`type.${item.type}`)} – ${pick(church.name)} ${church.place}`;

// ---------- Celebrations ----------

function renderNextMass(church, items, today) {
  const next = items.find((item) => !item.cancelled);
  if (!next) return h('p', { class: 'next-mass' }, t('masses.empty'));
  return h('p', { class: `next-mass${next.isToday ? ' next-mass--today' : ''}` },
    h('span', { class: 'next-mass__label' }, t('hero.next')),
    h('time', { class: 'next-mass__when', datetime: `${next.date}T${next.time}` },
      `${capitalize(longDate(next.date))} · ${next.time}`),
    h('span', { class: 'next-mass__rel' }, capitalize(relativeDay(next.date, today))),
  );
}

function renderWeekly(church) {
  return h('ul', { class: 'weekly' },
    church.schedule.weekly.map((rule) =>
      h('li', { class: 'weekly__item' },
        h('span', { class: 'weekly__day' }, t('masses.every', { weekday: weekdayName(rule.weekday) })),
        h('span', { class: 'weekly__time' }, rule.time),
        h('span', { class: 'weekly__type' }, t(`type.${rule.type}`)),
      ),
    ),
  );
}

function renderUpcoming(church, items, today) {
  if (!items.length) return h('p', { class: 'empty' }, t('masses.empty'));
  return h('ol', { class: 'masses' },
    items.slice(0, 6).map((item) => {
      const classes = ['mass', item.isToday && 'mass--today', item.cancelled && 'mass--cancelled'];
      return h('li', { class: classes.filter(Boolean).join(' ') },
        h('time', { class: 'mass__date', datetime: `${item.date}T${item.time}` },
          h('span', { class: 'mass__weekday' }, format(item.date, { weekday: 'short' })),
          h('span', { class: 'mass__day' }, format(item.date, { day: 'numeric' })),
          h('span', { class: 'mass__month' }, format(item.date, { month: 'short' })),
        ),
        h('div', { class: 'mass__body' },
          h('p', { class: 'mass__title' },
            item.cancelled ? t('masses.cancelled') : t(`type.${item.type}`),
            item.isToday && h('span', { class: 'badge' }, t('masses.today')),
          ),
          h('p', { class: 'mass__meta' },
            icon('clock'), ` ${item.time} · ${capitalize(relativeDay(item.date, today))}`),
          item.note && h('p', { class: 'mass__note' }, pick(item.note)),
        ),
        !item.cancelled && h('button', {
          class: 'mass__add',
          type: 'button',
          'aria-label': t('masses.addOneLabel', { date: longDate(item.date) }),
          onclick: () => download(
            `${church.id}-${item.date}.ics`,
            singleEventIcs(church, item, titleFor(church, item)),
          ),
        }, icon('calendar'), h('span', {}, t('masses.addOne'))),
      );
    }),
  );
}

function subscribe(church, items) {
  const firstDates = church.schedule.weekly.map(
    (rule) => items.find((item) => item.weekday === rule.weekday && item.time === rule.time)?.date
      ?? nowInZone(church.schedule.timezone).date,
  );
  download(`${church.id}-vieringen.ics`, seriesIcs(church, {
    firstDates,
    titleFor: (item) => titleFor(church, item),
    calendarName: `${pick(church.name)} ${church.place}`,
  }));
}

// ---------- History ----------

function sourceLinks(data, ids) {
  if (!ids) return null;
  return h('p', { class: 'timeline__source' },
    `${t('history.sources')}: `,
    ids.split(',').map((id, i) => [
      i > 0 && ', ',
      h('a', { href: data.sources[id].url, target: '_blank', rel: 'noopener' }, data.sources[id].title.split(' – ')[0]),
    ]),
  );
}

function renderTimeline(church, data) {
  return h('ol', { class: 'timeline' },
    church.history.map((entry) =>
      h('li', { class: 'timeline__item' },
        h('p', { class: 'timeline__year' }, pick(entry.year)),
        h('h3', { class: 'timeline__title' }, pick(entry.title)),
        h('p', { class: 'timeline__text' }, pick(entry.text)),
        sourceLinks(data, entry.source),
      ),
    ),
  );
}

function renderFacts(church) {
  return h('dl', { class: 'facts' },
    church.facts.map((fact) =>
      h('div', { class: 'facts__item' },
        h('dt', {}, pick(fact.label)),
        h('dd', {}, pick(fact.value)),
      ),
    ),
  );
}

function renderSources(data) {
  return h('ul', { class: 'sources' },
    Object.values(data.sources).map((source) =>
      h('li', {}, h('a', { href: source.url, target: '_blank', rel: 'noopener' }, source.title)),
    ),
  );
}

// ---------- Gallery ----------

function renderGallery(church) {
  const photos = church.gallery.map((photo) => ({ ...photo, url: imageUrl(photo.src) }));
  return h('ul', { class: 'gallery' },
    photos.map((photo, index) =>
      h('li', { class: 'gallery__item' },
        h('figure', {},
          h('button', {
            class: 'gallery__open',
            type: 'button',
            'aria-label': t('gallery.open', { caption: pick(photo.caption) }),
            onclick: () => openLightbox(photos, index),
          },
            h('img', {
              src: photo.srcSmall ? imageUrl(photo.srcSmall) : photo.url,
              alt: pick(photo.alt),
              width: photo.width,
              height: photo.height,
              loading: 'lazy',
              decoding: 'async',
            }),
          ),
          h('figcaption', {}, pick(photo.caption)),
        ),
      ),
    ),
  );
}

// ---------- Visit ----------

function renderDirections(church) {
  const { lat, lng } = church.coords;
  const links = [
    ['visit.google', `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`],
    ['visit.apple', `https://maps.apple.com/?daddr=${lat},${lng}`],
    ['visit.osm', `https://www.openstreetmap.org/directions?to=${lat},${lng}`],
  ];
  return h('ul', { class: 'directions' },
    links.map(([key, href]) =>
      h('li', {}, h('a', { class: 'directions__link', href, target: '_blank', rel: 'noopener' }, icon('pin'), ` ${t(key)}`)),
    ),
  );
}

function renderMap(church) {
  const { lat, lng } = church.coords;
  const bbox = [lng - 0.006, lat - 0.003, lng + 0.006, lat + 0.003].map((n) => n.toFixed(5)).join(',');
  return h('iframe', {
    class: 'map__frame',
    title: t('visit.mapTitle'),
    src: `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`,
    loading: 'lazy',
    referrerpolicy: 'no-referrer',
  });
}

function renderContact(data) {
  return h('p', { class: 'contact' },
    pick(data.parish.name), h('br'),
    data.parish.address, h('br'),
    h('a', { href: data.parish.contactUrl, target: '_blank', rel: 'noopener' }, t('visit.contactLink'), ' ', icon('external')),
  );
}

function renderArea(data, currentId) {
  return h('ul', { class: 'area' },
    data.churches
      .filter((church) => church.id !== currentId)
      .map((church) =>
        h('li', {},
          h('a', { class: 'area__link', href: church.kerknet, target: '_blank', rel: 'noopener' },
            h('span', { class: 'area__place' }, church.place),
            h('span', { class: 'area__name' }, pick(church.name)),
            h('span', { class: 'area__more' }, t('area.more'), ' ', icon('arrow')),
          ),
        ),
      ),
  );
}

// ---------- Everything together ----------

export function renderPage(data, church) {
  const now = nowInZone(church.schedule.timezone);
  const items = upcoming(church.schedule, { now });

  fill('next-mass', () => renderNextMass(church, items, now.date));
  fill('weekly', () => renderWeekly(church));
  fill('upcoming', () => renderUpcoming(church, items, now.date));
  fill('facts', () => renderFacts(church));
  fill('timeline', () => renderTimeline(church, data));
  fill('village', () => document.createTextNode(pick(church.village)));
  fill('sources', () => renderSources(data));
  fill('gallery', () => renderGallery(church));
  fill('address', () => document.createTextNode(church.address));
  fill('directions', () => renderDirections(church));
  fill('map', () => renderMap(church));
  fill('contact', () => renderContact(data));
  fill('area', () => renderArea(data, church.id));

  for (const button of document.querySelectorAll('[data-action="subscribe"]')) {
    button.onclick = () => subscribe(church, items);
  }
}
