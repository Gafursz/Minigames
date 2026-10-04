import checkIcon from '../assets/icons/sort-check.svg';
import dividerIcon from '../assets/icons/sort-divider.svg';
import type { GameSort } from '../types/api';

const options: { value: GameSort; label: string }[] = [
  { value: 'rating-asc', label: 'Rating ↑' },
  { value: 'rating-desc', label: 'Rating ↓' },
  { value: 'name-asc', label: 'Name A→Z' },
  { value: 'name-desc', label: 'Name Z→A' },
];

export class LibrarySort {
  private selectedIndex = 1;
  private root: HTMLElement | undefined;

  public render(): string {
    return `
      <div class="library-sort">
        <button class="library-sort__trigger" type="button" aria-haspopup="listbox"
          aria-controls="library-sort-options" aria-expanded="false">
          Sort by: <span class="library-sort__label">${options[this.selectedIndex].label}</span>
        </button>
        <ul class="library-sort__options" id="library-sort-options" role="listbox" aria-label="Sort games" hidden>
          ${options
            .map(
              (option, index) => `
            <li class="library-sort__option" role="option" tabindex="-1"
              data-sort-index="${index}" aria-selected="${index === this.selectedIndex}">
              <img class="library-sort__check" src="${checkIcon}" alt="" />
              <span>${option.label}</span>
              ${index < options.length - 1 ? `<img class="library-sort__divider" src="${dividerIcon}" alt="" />` : ''}
            </li>
          `,
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  public setValue(value: GameSort): void {
    const index = options.findIndex((option) => option.value === value);
    if (index === -1) return;
    this.selectedIndex = index;
    const label = this.root?.querySelector('.library-sort__label');
    if (label) label.textContent = options[index].label;
    const items = this.root?.querySelectorAll<HTMLElement>('[data-sort-index]') ?? [];
    for (const item of items) {
      item.setAttribute('aria-selected', String(Number(item.dataset.sortIndex) === index));
    }
  }

  public bindEvents(signal: AbortSignal, onChange: (value: GameSort) => void): void {
    const root = document.querySelector<HTMLElement>('.library-sort');
    const trigger = root?.querySelector<HTMLButtonElement>('.library-sort__trigger');
    const list = root?.querySelector<HTMLElement>('.library-sort__options');
    const label = root?.querySelector<HTMLElement>('.library-sort__label');
    if (!(root && trigger && list && label)) return;
    this.root = root;
    signal.addEventListener(
      'abort',
      () => {
        this.root = undefined;
      },
      { once: true },
    );
    const items = [...list.querySelectorAll<HTMLElement>('[role="option"]')];

    const close = (shouldFocus = false): void => {
      list.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (shouldFocus) trigger.focus();
    };

    const open = (): void => {
      list.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      items[this.selectedIndex].focus();
    };

    const select = (index: number): void => {
      const selected = options[index];
      if (selected && index !== this.selectedIndex) onChange(selected.value);
      close(true);
    };

    trigger.addEventListener(
      'click',
      () => {
        if (list.hidden) open();
        else close();
      },
      { signal },
    );

    trigger.addEventListener(
      'keydown',
      (event) => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        open();
      },
      { signal },
    );

    list.addEventListener(
      'click',
      (event) => {
        const option =
          event.target instanceof Element
            ? event.target.closest<HTMLElement>('[data-sort-index]')
            : undefined;
        if (option) select(Number(option.dataset.sortIndex));
      },
      { signal },
    );

    root.addEventListener(
      'keydown',
      (event) => {
        if (event.key === 'Escape') {
          close(true);
          return;
        }
        if (event.key === 'Tab') {
          close();
          return;
        }
        if (list.hidden || !(event.target instanceof HTMLElement)) return;
        const index = items.indexOf(event.target);
        if (index === -1) return;
        let next: number;
        switch (event.key) {
          case 'Enter':
          case ' ': {
            event.preventDefault();
            select(index);
            return;
          }
          case 'ArrowDown': {
            next = (index + 1) % items.length;
            break;
          }
          case 'ArrowUp': {
            next = (index - 1 + items.length) % items.length;
            break;
          }
          case 'Home': {
            next = 0;
            break;
          }
          case 'End': {
            next = items.length - 1;
            break;
          }
          default: {
            return;
          }
        }
        event.preventDefault();
        items[next].focus();
      },
      { signal },
    );

    document.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target instanceof Node && !root.contains(event.target)) close();
      },
      { signal },
    );
  }
}
