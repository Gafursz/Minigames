import leaderboardData from '../data/leaderboard.json';
import type { LeaderboardData, LeaderboardPlayer } from '../types/leaderboard-player';

export class Leaderboard {
  private readonly leaderboard: LeaderboardData = leaderboardData as LeaderboardData;

  private formatScore(score: number): string {
    return score.toLocaleString('en-US');
  }

  private getInitials(playerName: string): string {
    const words = playerName
      .replaceAll(/([a-z])([A-Z])/g, '$1 $2')
      .split(/[_\s]+/)
      .filter(Boolean);

    return words
      .slice(0, 2)
      .map((word: string) => word.charAt(0))
      .join('')
      .toUpperCase();
  }

  private renderPlayer(player: LeaderboardPlayer): string {
    return `
      <div class="leaderboard__row">
        <div class="leaderboard__rank">
          #${player.rank}
        </div>

        <div class="leaderboard__player">
          <span
            class="leaderboard__avatar"
            aria-hidden="true"
          >
            ${this.getInitials(player.playerName)}
          </span>

          <span class="leaderboard__player-name">
            ${player.playerName}
          </span>
        </div>

        <div class="leaderboard__cell">
          ${player.gamesPlayed}
        </div>

        <div class="leaderboard__cell">
          ${this.formatScore(player.totalScore)}
        </div>

        <div class="leaderboard__streak">
          <span
            class="leaderboard__fire"
            aria-hidden="true"
          >
            🔥
          </span>

          <span>
            ${player.streakDays} days
          </span>
        </div>

        <div class="leaderboard__favorite">
          ${player.favoriteGameName}
        </div>
      </div>
    `;
  }

  public render(): string {
    const rows: string = this.leaderboard.data
      .map((player: LeaderboardPlayer) => this.renderPlayer(player))
      .join('');

    return `
      <section
        class="leaderboard-section"
        aria-labelledby="leaderboard-title"
      >
        <div class="leaderboard-section__header">
          <span
            class="leaderboard-section__accent"
            aria-hidden="true"
          ></span>

          <h2
            class="leaderboard-section__title"
            id="leaderboard-title"
          >
            ${this.leaderboard.meta.description}
          </h2>
        </div>

        <div class="leaderboard">
          <div
            class="leaderboard__header"
            role="row"
          >
            <div>Rank</div>
            <div>Player</div>
            <div>Games Played</div>
            <div>Total Score</div>
            <div>Streak</div>
            <div>Favorite Game</div>
          </div>

          <div class="leaderboard__body">
            ${rows}
          </div>
        </div>
      </section>
    `;
  }
}
