import { describe, expect, it } from 'vitest';

import { cleanQuestions, meetsMustHave, missingAnswers, mustHaveScore, newQuestion, parseJson, questionProblems } from './screening';

const yes = newQuestion({ id: 'auth', text: 'Authorized?', type: 'yesno', mustHave: true, idealAnswer: 'Yes' });
const years = newQuestion({ id: 'yrs', text: 'Years?', type: 'number', mustHave: true, minNumber: 3 });
const edu = newQuestion({ id: 'edu', text: 'Education?', type: 'choice', options: ['BA', 'MA'], required: false });
const note = newQuestion({ id: 'start', text: 'Start date?', type: 'text', required: true });

describe('questionProblems', () => {
  it('accepts valid questions', () => {
    expect(questionProblems([yes, years, edu, note])).toEqual([]);
  });

  it('flags blank text, too few choices and incomplete must-haves', () => {
    expect(
      questionProblems([
        newQuestion({ text: ' ' }),
        newQuestion({ text: 'Pick', type: 'choice', options: ['Only one', ''] }),
        newQuestion({ text: 'Auth', type: 'yesno', mustHave: true }),
        newQuestion({ text: 'Years', type: 'number', mustHave: true }),
      ]),
    ).toEqual([
      'Question 1 needs text.',
      'Question 2 needs at least two choices.',
      'Question 3 needs an ideal answer to be a must-have.',
      'Question 4 needs a minimum to be a must-have.',
    ]);
  });
});

describe('cleanQuestions', () => {
  it('trims and drops settings that do not apply to the type', () => {
    const [q] = cleanQuestions([newQuestion({ text: ' Hi ', type: 'text', options: ['x'], mustHave: true, idealAnswer: 'Yes', minNumber: 2 })]);
    expect(q).toMatchObject({ text: 'Hi', options: [], mustHave: false, idealAnswer: null, minNumber: null });
  });
});

describe('answers', () => {
  const qs = [yes, years, edu, note];

  it('finds unanswered required questions', () => {
    expect(missingAnswers(qs, { auth: 'Yes', start: '  ' })).toEqual(['yrs', 'start']);
  });

  it('checks must-haves', () => {
    expect(meetsMustHave(yes, 'Yes')).toBe(true);
    expect(meetsMustHave(yes, 'No')).toBe(false);
    expect(meetsMustHave(years, '5')).toBe(true);
    expect(meetsMustHave(years, '2')).toBe(false);
    expect(meetsMustHave(edu, 'BA')).toBeNull();
    expect(mustHaveScore(qs, { auth: 'Yes', yrs: '1' })).toEqual({ met: 1, total: 2 });
  });
});

describe('parseJson', () => {
  it('falls back on bad or empty input', () => {
    expect(parseJson('[1]', [])).toEqual([1]);
    expect(parseJson('not json', [])).toEqual([]);
    expect(parseJson(null, {})).toEqual({});
  });
});
