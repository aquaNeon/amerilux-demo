// Accordion tabs. Webflow markup:
//   [data-amx-item="<slug>"]  item wrapper, gets .is-active
//     [data-amx-trigger]      collapsed header (click -> select)
//     [data-amx-close]        optional, collapses the open item
//     img[data-amx-thumb]     optional, left empty -> filled from the 3D render
// Click handler for anything Webflow builds a button from: <button>, Link Block (<a href="#">, no jump)
// or a plain div (made focusable, Enter / Space press it)
export function onPress(el, fn) {
  if (!el) return;
  if (!/^(A|BUTTON)$/.test(el.tagName)) {
    if (!el.hasAttribute('role')) el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
    });
  }
  el.addEventListener('click', (e) => { e.preventDefault(); fn(); });
}

export class Tabs {
  constructor(items, { onSelect }) {
    this.items = items;
    this.onSelect = onSelect;
    this.items.forEach((el, i) => {
      onPress(el.querySelector('[data-amx-trigger]'), () => onSelect(i));
      onPress(el.querySelector('[data-amx-close]'), () => this.set(-1));
    });
  }

  get slugs() { return this.items.map((el) => el.dataset.amxItem); }

  set(index) {
    this.items.forEach((el, i) => {
      const on = i === index;
      el.classList.toggle('is-active', on);
      el.querySelector('[data-amx-trigger]')?.setAttribute('aria-expanded', on);
    });
  }

  // fill an empty thumb; re-render ones we filled before (data-amx-gen) on style change
  fillThumb(i, render) {
    const img = this.items[i]?.querySelector('img[data-amx-thumb]');
    if (img && (!img.getAttribute('src') || 'amxGen' in img.dataset)) {
      Promise.resolve(render(i)).then((url) => { if (url) { img.src = url; img.dataset.amxGen = ''; } });
    }
  }
}
