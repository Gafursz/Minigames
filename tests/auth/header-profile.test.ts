import { expect, test } from 'vitest';
import { getProfileName, getProfileInitials } from '../../src/components/header-profile';

test('profile names use displayName, email local part, then a generic fallback', () => {
  expect(getProfileName({ displayName: ' Alex Smith ', email: 'alex@example.com' })).toBe(
    'Alex Smith',
  );
  expect(getProfileName({ displayName: '', email: 'alex@example.com' })).toBe('alex');
  expect(getProfileName({ displayName: '', email: '' })).toBe('Player');
});

test.each([
  ['Alex', 'A'],
  ['Gafurjon Sharipov', 'GS'],
  [' Alex   Smith Jones ', 'AS'],
  ['!alex 9lives', 'A9'],
  ['Мария Иванова', 'МИ'],
  ['张 伟', '张伟'],
  ['!!!', '?'],
])('initials for %s are %s', (name, initials) => {
  expect(getProfileInitials(name)).toBe(initials);
});
