import closeIcon from '../../assets/icons/close.svg';
import heroImage from '../../assets/images/games/tukoni-forest-keepers-hero.jpg';
import { GameInfo } from '../../components/game-info';
import { GameRecords } from '../../components/game-records';
import { GameComments } from '../../components/game-comments';

export class GameDetails {
  private readonly info = new GameInfo();
  private readonly records = new GameRecords();
  private readonly comments = new GameComments();
  private element: HTMLDialogElement | undefined;
  private returnFocus: HTMLElement | undefined;
  private closeTimer: ReturnType<typeof globalThis.setTimeout> | undefined;
  private isClosing = false;

  private finishClose(): void {
    globalThis.clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    this.element?.close();
    this.element?.classList.remove('is-closing');
    this.isClosing = false;
    document.body.classList.remove('has-open-dialog');
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = undefined;
  }

  public render(): string {
    return `
      <dialog class="game-details" id="game-details" aria-labelledby="game-details-title">
        <div class="game-details__hero">
          <img class="game-details__cover" src="${heroImage}" alt="The woodland world of Tukoni: Forest Keepers" />
          <button class="game-details__close" type="button" aria-label="Close game details">
            <img src="${closeIcon}" alt="" />
          </button>
        </div>
        <div class="game-details__body">
          ${this.info.render()}
          ${this.records.render()}
          ${this.comments.render()}
        </div>
      </dialog>
    `;
  }

  public bindEvents(): void {
    const dialog = document.querySelector<HTMLDialogElement>('#game-details');
    if (!dialog) return;
    this.element = dialog;
    this.info.bindEvents(dialog);
    this.comments.bindEvents(dialog);
    dialog.addEventListener('animationend', (event) => {
      if (event.animationName === 'game-details-exit' && this.isClosing) this.finishClose();
    });

    dialog
      .querySelector<HTMLButtonElement>('.game-details__close')
      ?.addEventListener('click', () => this.close());
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      this.close();
    });
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      const isOutside =
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom;
      if (isOutside) this.close();
    });
  }

  public open(trigger: HTMLElement): void {
    if (!this.element || this.element.open) return;
    this.info.reset(this.element);
    this.comments.reset(this.element);
    this.returnFocus = trigger;
    this.element.classList.remove('is-closing');
    this.element.showModal();
    this.element.scrollTop = 0;
    document.body.classList.add('has-open-dialog');
  }

  public close(): void {
    if (!this.element?.open || this.isClosing) return;
    this.isClosing = true;
    this.element.classList.add('is-closing');
    const duration =
      Number(getComputedStyle(this.element).animationDuration.replace('s', '')) * 1000;
    this.closeTimer = globalThis.setTimeout(
      () => this.finishClose(),
      Number.isFinite(duration) ? duration : 0,
    );
  }

  public destroy(): void {
    globalThis.clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    this.isClosing = false;
    this.element?.close();
    document.body.classList.remove('has-open-dialog');
    this.element = undefined;
    this.returnFocus = undefined;
  }
}
