import { getLeaderboard } from '../api/minigames-api';

import unableLoadPlayersImage from '../assets/images/unable_load_players.png';

import { HomeResource, hasNoItems } from '../features/home/home-resource';

import { escapeHtml } from '../utils/html';

import type { LeaderboardData, LeaderboardPlayer } from '../types/leaderboard-player';

export class Leaderboard {
  private resource: HomeResource<LeaderboardData> | undefined;

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
  #${escapeHtml(String(player.rank))}
</td>

        <td class="leaderboard__player">
          <span
  class="leaderboard__avatar leaderboard__avatar--rank-${escapeHtml(String(player.rank))}"
  aria-hidden="true"
>
  ${escapeHtml(this.getInitials(player.playerName))}
</span>

          <span class="leaderboard__player-name">
            ${escapeHtml(player.playerName)}
          </span>
        </td>

        <td class="leaderboard__cell">
          ${escapeHtml(String(player.gamesPlayed))}
        </td>

        <td class="leaderboard__cell">
          ${escapeHtml(this.formatScore(player.totalScore))}
        </td>

        <td class="leaderboard__streak">
          <span
            class="leaderboard__fire"
            aria-hidden="true"
          >
            🔥
          </span>

          <span>
            ${escapeHtml(String(player.streakDays))} days
          </span>
        </td>

        <td class="leaderboard__favorite">
  <span class="leaderboard__favorite-badge">
    ${escapeHtml(player.favoriteGameName)}
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

  public bindEvents(): void {
    this.resource?.destroy();
    const root = document.querySelector<HTMLElement>('.leaderboard-section__content');
    if (!root) return;
    this.resource = new HomeResource(root, {
      request: getLeaderboard,
      isEmpty: hasNoItems,
      layout: 'leaderboard',
      label: 'Top players',
      emptyMessage: 'No players have reached the leaderboard yet. Check back later.',
      errorImageSrc: unableLoadPlayersImage,

      render: (response) => {
        const title = document.querySelector('.leaderboard-section__title-desktop');
        if (title) title.textContent = response.meta.description || 'Top Players This Week';
        return `<table class="leaderboard" aria-labelledby="leaderboard-title">
          ${this.renderTableHeader()}
          <tbody class="leaderboard__body">
            ${response.data.map((player) => this.renderPlayer(player)).join('')}
          </tbody>
        </table>`;
      },
    });
    void this.resource.load();
  }

  public destroy(): void {
    this.resource?.destroy();
    this.resource = undefined;
  }

  public render(): string {
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
    Top Players This Week
  </span>

  <span class="leaderboard-section__title-mobile">
    Top Players
  </span>
</h2>
        </div>

        <div class="leaderboard-section__content" aria-busy="true"></div>
        </div>
      </section>
    `;
  }
}
