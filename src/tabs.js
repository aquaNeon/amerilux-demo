// Accordion tabs. Webflow markup:
//   [data-amx-item="<slug>"]  item wrapper, gets .is-active
//     [data-amx-trigger]      collapsed header (click -> select)
//     [data-amx-close]        optional, collapses the open item
//     img[data-amx-thumb]     optional, left empty -> filled from the 3D render
export class Tabs {
  constructor(root, { onSelect }) {
    this.items = [...root.querySelectorAll('[data-amx-item]')];
    this.onSelect = onSelect;
    this.items.forEach((el, i) => {
      el.querySelector('[data-amx-trigger]')?.addEventListener('click', () => onSelect(i));
      el.querySelector('[data-amx-close]')?.addEventListener('click', () => this.set(-1));
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

  fillThumbs(render) {
    this.items.forEach((el, i) => {
      const img = el.querySelector('img[data-amx-thumb]');
      if (img && !img.getAttribute('src')) {
        const url = render(i);
        if (url) img.src = url;
      }
    });
  }
}
