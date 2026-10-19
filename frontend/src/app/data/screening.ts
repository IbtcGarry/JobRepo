// Screening questions employers attach to a job (like Indeed / LinkedIn), and applicants' answers.

export type QuestionType = 'yesno' | 'number' | 'text' | 'choice';

export interface ScreeningQuestion {
  id: string;
  text: string;
  type: QuestionType;
  /** Choices for 'choice' questions. */
  options: string[];
  required: boolean;
  /** A must-have qualification: the applicant's answer is checked against the ideal answer. */
  mustHave: boolean;
  /** For yes/no and choice: the answer that qualifies. */
  idealAnswer: string | null;
  /** For number: the minimum that qualifies (e.g. years of experience). */
  minNumber: number | null;
}

/** Answers keyed by question ID. Numbers and yes/no are stored as strings ("3", "Yes"). */
export type Answers = Partial<Record<string, string>>;

export const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'yesno', label: 'Yes / No' },
  { value: 'number', label: 'Number' },
  { value: 'text', label: 'Short answer' },
  { value: 'choice', label: 'Multiple choice' },
];

export const MAX_QUESTIONS = 10;

/** Common questions from job sites, ready to add with one click. */
export const PRESET_QUESTIONS: Omit<ScreeningQuestion, 'id'>[] = [
  { text: 'Are you legally authorized to work in this country?', type: 'yesno', options: [], required: true, mustHave: true, idealAnswer: 'Yes', minNumber: null },
  { text: 'Will you now or in the future require visa sponsorship?', type: 'yesno', options: [], required: true, mustHave: false, idealAnswer: null, minNumber: null },
  { text: 'How many years of relevant work experience do you have?', type: 'number', options: [], required: true, mustHave: false, idealAnswer: null, minNumber: null },
  { text: 'Are you comfortable commuting to this job’s location?', type: 'yesno', options: [], required: true, mustHave: false, idealAnswer: null, minNumber: null },
  { text: 'What is the highest level of education you have completed?', type: 'choice', options: ['High school', 'Associate', 'Bachelor’s', 'Master’s', 'Doctorate'], required: true, mustHave: false, idealAnswer: null, minNumber: null },
  { text: 'What are your salary expectations?', type: 'text', options: [], required: false, mustHave: false, idealAnswer: null, minNumber: null },
  { text: 'When can you start?', type: 'text', options: [], required: false, mustHave: false, idealAnswer: null, minNumber: null },
  { text: 'Do you have a valid driver’s license?', type: 'yesno', options: [], required: true, mustHave: false, idealAnswer: null, minNumber: null },
];

export function newQuestion(base: Partial<ScreeningQuestion> = {}): ScreeningQuestion {
  return {
    id: Math.random().toString(36).slice(2, 10),
    text: '',
    type: 'yesno',
    options: [],
    required: true,
    mustHave: false,
    idealAnswer: null,
    minNumber: null,
    ...base,
  };
}

/** Problems with an employer's questions, as messages; empty when they're fine to save. */
export function questionProblems(questions: ScreeningQuestion[]): string[] {
  const problems: string[] = [];
  if (questions.length > MAX_QUESTIONS) problems.push(`Use at most ${MAX_QUESTIONS} questions.`);
  questions.forEach((q, i) => {
    const n = `Question ${i + 1}`;
    if (!q.text.trim()) problems.push(`${n} needs text.`);
    if (q.type === 'choice' && q.options.filter((o) => o.trim()).length < 2) problems.push(`${n} needs at least two choices.`);
    if (q.mustHave) {
      if ((q.type === 'yesno' || q.type === 'choice') && !q.idealAnswer) problems.push(`${n} needs an ideal answer to be a must-have.`);
      if (q.type === 'number' && q.minNumber === null) problems.push(`${n} needs a minimum to be a must-have.`);
    }
  });
  return problems;
}

/** Drop blank choices and settings that don't apply to the question's type. */
export function cleanQuestions(questions: ScreeningQuestion[]): ScreeningQuestion[] {
  return questions.map((q) => {
    const options = q.type === 'choice' ? q.options.map((o) => o.trim()).filter(Boolean) : [];
    const canMustHave = q.type !== 'text';
    const mustHave = canMustHave && q.mustHave;
    return {
      ...q,
      text: q.text.trim(),
      options,
      mustHave,
      idealAnswer: mustHave && (q.type === 'yesno' || q.type === 'choice') ? q.idealAnswer : null,
      minNumber: mustHave && q.type === 'number' ? q.minNumber : null,
    };
  });
}

/** IDs of required questions left unanswered. */
export function missingAnswers(questions: ScreeningQuestion[], answers: Answers): string[] {
  return questions.filter((q) => q.required && !(answers[q.id] ?? '').trim()).map((q) => q.id);
}

/** Whether one answer meets its question's must-have; null when the question isn't a must-have. */
export function meetsMustHave(q: ScreeningQuestion, answer: string | undefined): boolean | null {
  if (!q.mustHave) return null;
  const a = (answer ?? '').trim();
  if (q.type === 'number') return a !== '' && q.minNumber !== null && Number(a) >= q.minNumber;
  return a !== '' && a === q.idealAnswer;
}

/** How many must-haves the applicant met, out of how many. */
export function mustHaveScore(questions: ScreeningQuestion[], answers: Answers): { met: number; total: number } {
  const results = questions.map((q) => meetsMustHave(q, answers[q.id])).filter((r) => r !== null);
  return { met: results.filter(Boolean).length, total: results.length };
}

/** Parse a JSON column safely; bad or missing data becomes the fallback. */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
