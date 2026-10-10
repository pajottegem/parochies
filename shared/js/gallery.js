// Photo lightbox built on the native <dialog> element: focus handling,
// the Escape key and the dimmed backdrop come for free from the browser.

import { h, icon } from './dom.js';
import { t, pick } from './i18n.js';

export function photoCredit(photo) {
  return h('small', { class: 'credit' },
    `${pick(photo.caption)} — `,
    h('a', { href: photo.sourceUrl, target: '_blank', rel: 'noopener' }, photo.author),
    ', ',
    h('a', { href: photo.licenseUrl, target: '_blank', rel: 'noopener' }, photo.license),
  );
}

let dialog;
let photos = [];
let index = 0;

function show(i) {
  index = (i + photos.length) % photos.length;
  const photo = photos[index];
  const img = dialog.querySelector('.lightbox__img');
  img.src = photo.url;
  img.alt = pick(photo.alt);
  img.width = photo.width;
  img.height = photo.height;
  dialog.querySelector('.lightbox__caption').replaceChildren(photoCredit(photo));
}

function create() {
  dialog = h('dialog', { class: 'lightbox', 'aria-label': t('gallery.title') },
    h('figure', { class: 'lightbox__figure' },
      h('img', { class: 'lightbox__img', alt: '' }),
      h('figcaption', { class: 'lightbox__caption' }),
    ),
    h('button', { class: 'lightbox__btn lightbox__btn--prev', type: 'button', 'data-i18n-attr': 'aria-label:gallery.prev', 'aria-label': t('gallery.prev'), onclick: () => show(index - 1) }, icon('prev')),
    h('button', { class: 'lightbox__btn lightbox__btn--next', type: 'button', 'data-i18n-attr': 'aria-label:gallery.next', 'aria-label': t('gallery.next'), onclick: () => show(index + 1) }, icon('next')),
    h('button', { class: 'lightbox__btn lightbox__btn--close', type: 'button', 'data-i18n-attr': 'aria-label:gallery.close', 'aria-label': t('gallery.close'), onclick: () => dialog.close() }, icon('close')),
  );
  // Clicking the dark backdrop (the dialog itself, not its content) closes it.
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') show(index - 1);
    if (event.key === 'ArrowRight') show(index + 1);
  });
  document.body.append(dialog);
}

export function openLightbox(list, start) {
  if (!dialog) create();
  photos = list;
  show(start);
  dialog.showModal();
}
