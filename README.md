# 🎮 MiniGames — Story 2

MiniGames is a responsive single-page gaming application developed as part of the **RS School Qualifying Stage**.

The application is built with **TypeScript, Sass, and Vite** without JavaScript or CSS frameworks.

## 🔗 Links

- [GitHub Repository](https://github.com/Gafursz/Minigames)
- [RS School MiniGames Assignment](https://github.com/rolling-scopes-school/qualifying-stage/tree/main/tasks/minigames)
- [Figma Design](https://www.figma.com/design/4MnLizE59gZI2DDxaSgZqi/MiniGames)

## ✨ Features

### Home

- Responsive navigation and mobile menu
- Hero section
- Interactive game carousel with autoplay and swipe support
- Weekly leaderboard
- Developer section
- Responsive footer

### Games Library

- SPA navigation
- Responsive game cards
- Game filtering and sorting
- Pagination
- Game Details dialog
- Game statistics, records, and comments

### Authentication

- Login and registration dialogs
- Login/Register switching
- Password visibility controls
- Backdrop and Escape-key dismissal
- Responsive desktop and mobile layouts

## 🛠️ Tech Stack

- TypeScript
- Sass / SCSS
- Vite
- HTML5
- JSON
- ESLint
- Prettier
- Husky
- Commitlint
- Git & GitHub

No JavaScript or CSS frameworks, or pre-built slider libraries are used.

## 📁 Project Structure

```text
src/
├── app/
├── assets/
├── components/
├── data/
├── features/
│   ├── auth-dialog/
│   ├── game-details/
│   └── slider/
├── pages/
│   ├── home-page.ts
│   └── library-page.ts
├── styles/
├── types/
├── utils/
└── main.ts
```

## 🚀 Getting Started

Clone the repository:

```bash
git clone https://github.com/Gafursz/Minigames.git
cd Minigames
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

## 📜 Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
npm run format
npm run format:check
```

## 📱 Responsive Design

The application follows the provided Figma design and supports the required responsive layouts at:

- **375px** — mobile
- **768px** — tablet
- **1920px** — desktop

The interface also adapts fluidly between these breakpoints.

## 🌿 Git Workflow

Development follows the RS School story-based workflow:

```text
main
└── story-1
    └── story-2
        └── feature branches
```

Story 2 functionality was developed through separate feature branches and integrated into `story-2`.

The final Cross-Check pull request follows:

```text
story-2 → story-1
```

and remains unmerged for review.

## 👨‍💻 Author

**Gafur Sharipov**

GitHub: [@Gafursz](https://github.com/Gafursz)

## 📄 Assignment

Developed for the **RS School Qualifying Stage — MiniGames Story 2**.
