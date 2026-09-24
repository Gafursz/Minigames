import { HomePage } from '../pages/home-page';

export class App {
  private readonly root: HTMLElement;

  public constructor(root: HTMLElement) {
    this.root = root;
  }

  public render(): void {
    const homePage = new HomePage();
    this.root.innerHTML = homePage.render();
    homePage.bindEvents();
  }
}
