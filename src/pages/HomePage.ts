import { Header } from '../components/Header';

export class HomePage {
  private readonly header = new Header();

  public render(): string {
    return `
      ${this.header.render()}

      <main>
        <h1>MiniGames</h1>
      </main>
    `;
  }
  public bindEvents(): void {
    this.header.bindEvents();
  }
}
