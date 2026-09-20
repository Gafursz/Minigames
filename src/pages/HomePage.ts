import { Header } from '../components/Header';
import { Hero } from '../components/Hero';

export class HomePage {
  private readonly header = new Header();
  private readonly hero = new Hero();

  public render(): string {
    return `
      ${this.header.render()}

      <main>
        ${this.hero.render()}
      </main>
    `;
  }

  public bindEvents(): void {
    this.header.bindEvents();
  }
}
