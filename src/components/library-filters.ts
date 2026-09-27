const categories = ['All Games', 'Puzzle', 'Card', 'Match', 'Farm', 'Strategy', 'Arcade'];

export class LibraryFilters {
  public render(): string {
    return `
      <div class="library-filters">
        <div class="library-filters__categories" role="group" aria-label="Game categories">
          ${categories
            .map(
              (category, index) => `
            <button class="library-filters__chip${index === 0 ? ' library-filters__chip--active' : ''}"
              type="button" aria-pressed="${index === 0}">${category}</button>
          `,
            )
            .join('')}
        </div>
      </div>
    `;
  }

  public bindEvents(signal: AbortSignal): void {
    const group = document.querySelector<HTMLElement>('.library-filters__categories');
    if (!group) return;

    group.addEventListener(
      'click',
      (event) => {
        const selected =
          event.target instanceof Element ? event.target.closest('button') : undefined;
        if (!selected) return;

        for (const chip of group.querySelectorAll('button')) {
          const isActive = chip === selected;
          chip.classList.toggle('library-filters__chip--active', isActive);
          chip.setAttribute('aria-pressed', String(isActive));
        }
      },
      { signal },
    );
  }
}
