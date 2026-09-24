import { Footer } from '../components/footer';
import { DeveloperSection } from '../components/developer-section';
import { Header } from '../components/header';
import { Hero } from '../components/hero';
import { Leaderboard } from '../components/leaderboard';
import { Slider } from '../features/slider/slider';

export class HomePage {
  private readonly header = new Header();
  private readonly hero = new Hero();
  private readonly slider = new Slider();
  private readonly leaderboard = new Leaderboard();
  private readonly developerSection = new DeveloperSection();
  private readonly footer = new Footer();

  public render(): string {
    return `
      ${this.header.render()}

      <main>
        ${this.hero.render()}
        ${this.slider.render()}
        ${this.leaderboard.render()}
        ${this.developerSection.render()}
      </main>
      ${this.footer.render()}
    `;
  }

  public bindEvents(): void {
    this.header.bindEvents();
  }
}
