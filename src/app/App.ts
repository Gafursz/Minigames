export class App {
  private readonly root: HTMLElement;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  public render(): void {
    this.root.innerHTML = `
      <main>
        <h1>MiniGames</h1>
      </main>
    `;
  }
}
