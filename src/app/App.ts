import { HomePage } from '../pages/HomePage';

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
