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
      <tr class="leaderboard__row">

        <td
  class="leaderboard__rank ${player.rank === 1 ? 'leaderboard__rank--first' : ''}"
>
  #${player.rank}
</td>

        <td class="leaderboard__player">
          <span
  class="leaderboard__avatar leaderboard__avatar--rank-${player.rank}"
  aria-hidden="true"
>
  ${this.getInitials(player.playerName)}
</span>

          <span class="leaderboard__player-name">
            ${player.playerName}
          </span>
        </td>

        <td class="leaderboard__cell">
          ${player.gamesPlayed}
        </td>

        <td class="leaderboard__cell">
          ${this.formatScore(player.totalScore)}
        </td>

        <td class="leaderboard__streak">
          <span
            class="leaderboard__fire"
            aria-hidden="true"
          >
            🔥
          </span>

          <span>
            ${player.streakDays} days
          </span>
        </td>

        <td class="leaderboard__favorite">
  <span class="leaderboard__favorite-badge">
    ${player.favoriteGameName}
  </span>
</td>
      </tr>
    `;
  }

  private renderTableHeader(): string {
    return `
      <thead>
        <tr class="leaderboard__header">
          <th scope="col">
            Rank
          </th>

          <th scope="col">
            Player
          </th>

          <th scope="col">
            Games Played
          </th>

          <th scope="col">
            Total Score
          </th>

          <th scope="col">
            Streak
          </th>

          <th scope="col">
            Favorite Game
          </th>
        </tr>
      </thead>
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
        <div class="leaderboard-section__container">
        <div class="leaderboard-section__header">
          <span
            class="leaderboard-section__accent"
            aria-hidden="true"
          ></span>

          <h2 class="leaderboard-section__title" id="leaderboard-title">
  <span class="leaderboard-section__title-desktop">
    ${this.leaderboard.meta.description}
  </span>

  <span class="leaderboard-section__title-mobile">
    Top Players
  </span>
</h2>
        </div>

        <table class="leaderboard">
          ${this.renderTableHeader()}

          <tbody class="leaderboard__body">
            ${rows}
          </tbody>
        </table>
        </div>
      </section>
    `;
  }
}
