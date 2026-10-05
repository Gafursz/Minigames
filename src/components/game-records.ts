import type { GameRecord } from '../types/api';
import { formatRelativeTime } from '../utils/relative-time';
import { escapeHtml } from '../utils/game';

const medals = ['🥇', '🥈', '🥉'];

export class GameRecords {
  public render(records: GameRecord[]): string {
    return `
      <section class="game-records" aria-labelledby="game-records-title">
        <h3 class="game-records__title" id="game-records-title"><span aria-hidden="true">🏆</span> Top Records</h3>
        ${records.length === 0 ? '<p class="content-feedback content-feedback--empty" role="status">No records yet.</p>' : ''}
        <ol class="game-records__list">
          ${records
            .map(
              (record) => `
            <li class="game-records__row">
              <span class="game-records__player">
                <span aria-hidden="true">${medals[record.position - 1] ?? `#${record.position}`}</span>
                <strong>${escapeHtml(record.playerName)}</strong>
              </span>
              <span class="game-records__result">
                <strong>${record.score.toLocaleString('en-US')} pts</strong>
                <span class="game-records__date">${formatRelativeTime(record.achievedAt)}</span>
              </span>
            </li>
          `,
            )
            .join('')}
        </ol>
      </section>
    `;
  }
}
