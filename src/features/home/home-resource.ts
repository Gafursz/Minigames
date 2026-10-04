import { ApiError } from '../../api/http-client';
import { ContentFeedback } from '../../components/content-feedback';
import type { SkeletonLayout } from '../../components/content-feedback';
import { snackbar } from '../../components/snackbar';

interface HomeResourceOptions<T> {
  request: (signal: AbortSignal) => Promise<T>;
  isEmpty: (data: T) => boolean;
  render: (data: T) => string;
  layout: SkeletonLayout;
  label: string;
  emptyMessage: string;
  onReady?: () => void;
  onClear?: () => void;
}

// A page owns each instance. Requests and content bindings end with that page.
export class HomeResource<T> {
  private readonly feedback: ContentFeedback;
  private requestController: AbortController | undefined;
  private destroyed = false;

  public constructor(
    root: HTMLElement,
    private readonly options: HomeResourceOptions<T>,
  ) {
    this.feedback = new ContentFeedback(root);
  }

  public async load(isRetry = false): Promise<void> {
    if (this.destroyed) return;
    this.requestController?.abort();
    const controller = new AbortController();
    this.requestController = controller;
    const isCurrent = (): boolean =>
      !this.destroyed && !controller.signal.aborted && this.requestController === controller;
    const { label } = this.options;
    this.options.onClear?.();
    this.feedback.showLoading(this.options.layout, `Loading ${label.toLowerCase()}…`);

    try {
      const data = await this.options.request(controller.signal);
      // Some transports can still resolve after abort: never update a replaced page.
      if (!isCurrent()) return;
      if (this.options.isEmpty(data)) {
        this.feedback.showEmpty({
          title: `No ${label.toLowerCase()} yet`,
          message: this.options.emptyMessage,
        });
      } else {
        this.feedback.showContent(this.options.render(data));
        this.options.onReady?.();
      }
      if (isRetry) snackbar.show(`${label} loaded successfully.`, 'success');
    } catch (error) {
      if (!isCurrent()) return;
      this.options.onClear?.();
      const message =
        error instanceof ApiError
          ? error.message
          : 'The server returned unexpected data. Please try again.';
      this.feedback.showError({
        title: `Unable to load ${label.toLowerCase()}`,
        message,
        onRetry: () => this.load(true),
      });
      snackbar.show(`${label} could not be loaded. Use Retry to try again.`, 'error');
    }
  }

  public destroy(): void {
    this.destroyed = true;
    this.requestController?.abort();
    this.options.onClear?.();
    this.feedback.destroy();
  }
}

export function hasNoItems<T>(response: { data: T[] }): boolean {
  if (!Array.isArray(response.data)) throw new TypeError('Expected a list of API items.');
  return response.data.length === 0;
}
