import { t, formatNumber, getLocale } from '../utils/text';
import { getLeaderboard } from '../api/minigames-api';

import unableLoadPlayersImage from '../assets/images/unable_load_players.png';

import { HomeResource, hasNoItems } from '../features/home/home-resource';

import { escapeHtml } from '../utils/html';

import type { LeaderboardData, LeaderboardPlayer } from '../types/leaderboard-player';

export class Leaderboard {
  private resource: HomeResource<LeaderboardData> | undefined;

  private formatScore(score: number): string {
    return formatNumber(score);
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
            ${t('{count} days', { count: formatNumber(player.streakDays) })}
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
            ${t('Rank')}
          </th>

          <th scope="col">
            ${t('Player')}
          </th>

          <th scope="col">
            ${t('Games Played')}
          </th>

          <th scope="col">
            ${t('Total Score')}
          </th>

          <th scope="col">
            ${t('Streak')}
          </th>

          <th scope="col">
            ${t('Favorite Game')}
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
      emptyMessage: t('No players have reached the leaderboard yet. Check back later.'),
      errorImageSrc: unableLoadPlayersImage,

      render: (response) => {
        const title = document.querySelector('.leaderboard-section__title-desktop');
        if (title)
          title.textContent =
            getLocale() === 'en'
              ? response.meta.description || t('Top Players This Week')
              : t('Top Players This Week');
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
    ${t('Top Players This Week')}
  </span>

  <span class="leaderboard-section__title-mobile">
    ${t('Top Players')}
  </span>
</h2>
        </div>

        <div class="leaderboard-section__content" aria-busy="true"></div>
        </div>
      </section>
    `;
  }
}
