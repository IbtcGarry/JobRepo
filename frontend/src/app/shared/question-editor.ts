// <app-question-editor>: the employer's screening-question editor on the job form —
// add, pick a preset, reorder, remove, mark required / must-have with an ideal answer.

import { Component, model } from '@angular/core';

import {
  MAX_QUESTIONS,
  PRESET_QUESTIONS,
  QUESTION_TYPES,
  QuestionType,
  ScreeningQuestion,
  newQuestion,
} from '../data/screening';

/** Employer-side editor for a job's screening questions. */
@Component({
  selector: 'app-question-editor',
  templateUrl: './question-editor.html',
})
export class QuestionEditor {
  /** The job's questions; changes flow back to the job form (two-way binding). */
  readonly questions = model.required<ScreeningQuestion[]>();

  // Option lists shown in the template.
  protected readonly types = QUESTION_TYPES;
  protected readonly presets = PRESET_QUESTIONS;
  protected readonly max = MAX_QUESTIONS;

  /** + Add question: append a blank Yes / No question. */
  protected add() {
    this.questions.update((qs) => [...qs, newQuestion()]);
  }

  /** "Add a common question" menu: append the chosen preset. */
  protected addPresetFrom(select: HTMLSelectElement) {
    if (select.value === '') return; // The "+ Add a common question…" heading itself.
    const preset = PRESET_QUESTIONS.at(Number(select.value));
    select.value = ''; // Reset the menu so the same preset can be picked again.
    if (preset) this.questions.update((qs) => [...qs, newQuestion({ ...preset, options: [...preset.options] })]);
  }

  /** Remove a question. */
  protected remove(index: number) {
    this.questions.update((qs) => qs.filter((_, i) => i !== index));
  }

  /** Move a question up (-1) or down (+1). */
  protected move(index: number, by: -1 | 1) {
    this.questions.update((qs) => {
      const next = [...qs];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  /** Change the answer type; clears settings that only fit the old type. */
  protected setType(index: number, type: QuestionType) {
    this.patch(index, { type, idealAnswer: null, minNumber: null, mustHave: type === 'text' ? false : this.questions()[index].mustHave });
  }

  /** Question text box. */
  protected setText(index: number, text: string) {
    this.patch(index, { text });
  }

  /** Required checkbox. */
  protected setRequired(index: number, required: boolean) {
    this.patch(index, { required });
  }

  /** Must-have qualification checkbox. */
  protected setMustHave(index: number, mustHave: boolean) {
    this.patch(index, { mustHave });
  }

  /** Multiple-choice options box: one choice per line. */
  protected setChoices(index: number, text: string) {
    this.patch(index, { options: text.split('\n') });
  }

  /** The answer that meets a Yes / No or multiple-choice must-have. */
  protected setIdealAnswer(index: number, value: string) {
    this.patch(index, { idealAnswer: value || null });
  }

  /** The lowest number that meets a Number must-have (blank = none yet). */
  protected setMinimum(index: number, value: string) {
    this.patch(index, { minNumber: value === '' ? null : Number(value) });
  }

  /** Change some fields of one question. */
  protected patch(index: number, change: Partial<ScreeningQuestion>) {
    this.questions.update((qs) => qs.map((q, i) => (i === index ? { ...q, ...change } : q)));
  }

  /** Choices with blank lines removed, for the ideal-answer menu. */
  protected nonBlank(options: string[]): string[] {
    return options.map((o) => o.trim()).filter(Boolean);
  }
}
