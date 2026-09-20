import { Footer } from '../components/Footer';
import { DeveloperSection } from '../components/DeveloperSection';
import { Header } from '../components/Header';
import { Hero } from '../components/Hero';
import { Leaderboard } from '../components/Leaderboard';
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
