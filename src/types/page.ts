import type { RouteState } from '../router/route';

export interface Page {
  render(): string;
  bindEvents(): void;
  destroy?(): void;
  setDialogOpen?(isOpen: boolean): void;
  updateRoute?(route: RouteState): void;
}
