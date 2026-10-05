import gameData from '../data/game-details.json';
import { escapeHtml } from '../utils/game';

const medals = ['🥇', '🥈', '🥉'];
const recordDates = ['2 days ago', '5 days ago', '1 week ago'];

export class GameRecords {
  public render(): string {
    return `
      <section class="game-records" aria-labelledby="game-records-title">
        <h3 class="game-records__title" id="game-records-title"><span aria-hidden="true">🏆</span> Top Records</h3>
        <ol class="game-records__list">
          ${gameData.data.topRecords
            .map(
              (record, index) => `
            <li class="game-records__row">
              <span class="game-records__player">
                <span aria-hidden="true">${medals[index]}</span>
                <strong>${escapeHtml(record.playerName)}</strong>
              </span>
              <span class="game-records__result">
                <strong>${record.score.toLocaleString('en-US')} pts</strong>
                <span class="game-records__date">${recordDates[index]}</span>
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
