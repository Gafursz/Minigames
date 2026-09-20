# 🎮 MiniGames — Story 1

A responsive single-page application developed as part of the **RS School Qualifying Stage**.

MiniGames is a browser-based gaming platform interface featuring a responsive home page, game carousel, leaderboard, developer section, and adaptive navigation.

The project is built with **TypeScript, Vite, and Sass** without JavaScript or CSS UI frameworks.

## 🔗 Links

- [GitHub Repository](https://github.com/Gafursz/Minigames)
- [RS School Story 1 Assignment](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/story-1.md)
- [Figma Design](https://www.figma.com/design/4MnLizE59gZI2DDxaSgZqi/MiniGames)
- [Figma Prototype](https://www.figma.com/proto/4MnLizE59gZI2DDxaSgZqi/MiniGames)

## ✨ Implemented Features

### Home Page

- Responsive header and navigation
- Mobile burger menu
- Hero section
- Game carousel
- Reusable game cards
- Weekly player leaderboard
- Game developer CTA section
- Footer navigation
- Responsive layouts for different screen sizes

### Development

- Component-based TypeScript architecture
- Sass design tokens
- Responsive breakpoints
- Local Inter font integration
- JSON-based game and leaderboard data
- Semantic HTML structure
- ESLint code quality checks
- Prettier code formatting
- Husky pre-commit validation
- Production build with Vite

## 🛠️ Tech Stack

- **HTML5**
- **TypeScript**
- **Sass / SCSS**
- **Vite**
- **npm**
- **ESLint**
- **Prettier**
- **Husky**
- **Git & GitHub**

No JavaScript or CSS UI frameworks are used.

## 📁 Project Structure

```text
Minigames/
├── .github/
│   └── pull_request_template.md
│
├── public/
│
├── src/
│   ├── app/
│   │   └── App.ts
│   │
│   ├── assets/
│   │   ├── icons/
│   │   └── images/
│   │
│   ├── components/
│   │   ├── DeveloperSection.ts
│   │   ├── Footer.ts
│   │   ├── GameCard.ts
│   │   ├── Header.ts
│   │   ├── Hero.ts
│   │   └── Leaderboard.ts
│   │
│   ├── data/
│   │   ├── all-games-seed.json
│   │   └── leaderboard.json
│   │
│   ├── features/
│   │   └── slider/
│   │       ├── slider.scss
│   │       └── slider.ts
│   │
│   ├── pages/
│   │   └── HomePage.ts
│   │
│   ├── styles/
│   │   ├── components/
│   │   ├── _breakpoints.scss
│   │   ├── _tokens.scss
│   │   ├── _utilities.scss
│   │   └── main.scss
│   │
│   ├── types/
│   │   ├── Game.ts
│   │   └── LeaderboardPlayer.ts
│   │
│   ├── main.ts
│   └── vite-env.d.ts
│
├── eslint.config.js
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Make sure **Node.js** and **npm** are installed.

The project is currently developed with:

```text
Node.js v24
npm
```

### Clone the repository

```bash
git clone https://github.com/Gafursz/Minigames.git
```

Move into the project:

```bash
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

Vite will provide a local development URL, typically:

```text
http://localhost:5173/
```

## 📜 Available Scripts

### Development

```bash
npm run dev
```

Starts the Vite development server.

### Production Build

```bash
npm run build
```

Runs TypeScript compilation and creates the production build.

### Preview Production Build

```bash
npm run preview
```

Locally previews the production build.

### ESLint

```bash
npm run lint
```

Checks the project for linting problems.

### Format Code

```bash
npm run format
```

Formats the project using Prettier.

### Check Formatting

```bash
npm run format:check
```

Checks whether files follow the configured Prettier formatting rules without modifying them.

## 🧩 Architecture

The application follows a lightweight component-based architecture.

Individual UI sections are implemented as TypeScript components:

```text
App
└── HomePage
    ├── Header
    ├── Hero
    ├── Slider
    │   └── GameCard
    ├── Leaderboard
    ├── DeveloperSection
    └── Footer
```

Each component is responsible for rendering a specific part of the interface.

Shared design values such as colors, typography, spacing, sizes, and border radii are stored as Sass design tokens.

## 🎨 Styling

The project uses **Sass/SCSS** for styling.

Shared design tokens are defined in:

```text
src/styles/_tokens.scss
```

These include:

- colors
- typography
- spacing
- component sizes
- button spacing
- border radii

Responsive breakpoints are maintained separately in:

```text
src/styles/_breakpoints.scss
```

This approach reduces duplicated values and helps keep the implementation consistent with the Figma design.

## 📊 Data

Game and leaderboard information is stored separately from UI components.

```text
src/data/all-games-seed.json
src/data/leaderboard.json
```

TypeScript interfaces provide typed representations of this data:

```text
src/types/Game.ts
src/types/LeaderboardPlayer.ts
```

This keeps data, presentation, and types separated.

## ✅ Code Quality

The project uses several development tools to maintain consistent code quality.

**ESLint** checks TypeScript and JavaScript code.

**Prettier** maintains consistent formatting.

**Husky** runs checks before commits are accepted.

For example, the pre-commit workflow verifies:

```text
ESLint
   ↓
Prettier format check
   ↓
Git commit
```

A commit is prevented if the configured checks fail.

## 🌿 Git Workflow

Development follows the RS School Story workflow.

```text
main
└── story-1
    └── feature branches
```

Development work is performed in feature branches and integrated into the Story branch through pull requests.

The final:

```text
story-1 → main
```

pull request should remain **unmerged** for RS School Cross-Check according to the task requirements.

## 📱 Responsive Design

The interface is being implemented according to the provided Figma layouts and adapts across desktop, tablet, and mobile viewport sizes.

The layout uses flexible containers, Sass breakpoints, reusable spacing tokens, and responsive component behavior instead of relying on a single fixed screen size.

## 🎯 Story 1

Story 1 focuses on establishing the frontend foundation of MiniGames, including:

- project configuration
- development tooling
- TypeScript architecture
- Sass design system
- responsive Home page
- reusable UI components
- development quality checks

Additional functionality will be implemented as the project progresses through the RS School stories.

## 👨‍💻 Author

**Gafur Sharipov**

- GitHub: [@Gafursz](https://github.com/Gafursz)

## 📄 Assignment

This project is developed for the **RS School Qualifying Stage — MiniGames** assignment.

[View Story 1 requirements](https://github.com/rolling-scopes-school/qualifying-stage/blob/main/tasks/minigames/story-1.md)
