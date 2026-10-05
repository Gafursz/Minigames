export interface Page {
  render(): string;
  bindEvents(): void;
  destroy?(): void;
  setDialogOpen?(isOpen: boolean): void;
}
