import commentsData from '../data/game-comments.json';
import sendIcon from '../assets/icons/send-comment.svg';
import activeHeartIcon from '../assets/icons/comment-heart-active.svg';
import heartIcon from '../assets/icons/comment-heart.svg';
import { escapeHtml } from '../utils/game';

const commentDates = ['3 hours ago', '1 day ago', '3 days ago'];

export class GameComments {
  public render(): string {
    return `
      <section class="game-comments" aria-labelledby="game-comments-title">
        <h3 class="game-comments__title" id="game-comments-title">Comments (${commentsData.data.length})</h3>
        <form class="game-comments__form">
          <span class="game-comments__avatar" aria-hidden="true">U</span>
          <label class="visually-hidden" for="game-comment">Write a comment</label>
          <textarea class="game-comments__input" id="game-comment" name="comment" rows="1" placeholder="Write a comment..."></textarea>
          <button class="game-comments__submit" type="submit" aria-label="Submit comment"><img src="${sendIcon}" alt="" /></button>
        </form>
        <ol class="game-comments__list">
          ${commentsData.data
            .map(
              (comment, index) => `
            <li>
              <article class="game-comment">
                <header class="game-comment__header">
                  <div class="game-comment__author">
                    <span class="game-comment__avatar game-comment__avatar--${index + 1}" aria-hidden="true">${escapeHtml(comment.authorName[0])}</span>
                    <h4 class="game-comment__name">${escapeHtml(comment.authorName)}</h4>
                  </div>
                  <time class="game-comment__date" datetime="${comment.createdAt}">${commentDates[index]}</time>
                </header>
                <p class="game-comment__text${index === 1 ? ' game-comment__text--desktop' : ''}">${escapeHtml(comment.text)}</p>
                ${index === 1 ? '<p class="game-comment__text game-comment__text--mobile">Great for relaxing after work. Would love to see more tile themes added!</p>' : ''}
                <button class="game-comment__like" type="button" aria-pressed="false" aria-label="Like comment by ${escapeHtml(comment.authorName)}">
                  <img src="${heartIcon}" alt="" /><span>${comment.likesCount}</span>
                </button>
              </article>
            </li>
          `,
            )
            .join('')}
        </ol>
      </section>
    `;
  }

  public bindEvents(dialog: HTMLDialogElement): void {
    for (const button of dialog.querySelectorAll<HTMLButtonElement>('.game-comment__like')) {
      button.addEventListener('click', () => {
        const isLiked = button.getAttribute('aria-pressed') !== 'true';
        button.setAttribute('aria-pressed', String(isLiked));
        const icon = button.querySelector('img');
        if (icon) icon.src = isLiked ? activeHeartIcon : heartIcon;
      });
    }
    dialog
      .querySelector<HTMLFormElement>('.game-comments__form')
      ?.addEventListener('submit', (event) => event.preventDefault());
  }
}
