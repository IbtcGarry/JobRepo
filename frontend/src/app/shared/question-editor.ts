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
  template: `
    @for (q of questions(); track q.id; let i = $index) {
      <fieldset class="question">
        <div class="question-head">
          <strong>Question {{ i + 1 }}</strong>
          <span class="question-tools">
            <button type="button" class="link small" [disabled]="i === 0" (click)="move(i, -1)" aria-label="Move up">↑</button>
            <button type="button" class="link small" [disabled]="i === questions().length - 1" (click)="move(i, 1)" aria-label="Move down">↓</button>
            <button type="button" class="link small" (click)="remove(i)">Remove</button>
          </span>
        </div>

        <input
          type="text"
          maxlength="300"
          placeholder="e.g. How many years of experience do you have with Python?"
          [value]="q.text"
          (input)="patch(i, { text: $any($event.target).value })"
          aria-label="Question text"
        />

        <div class="question-row">
          <label>
            Answer type
            <select (change)="setType(i, $any($event.target).value)">
              @for (t of types; track t.value) { <option [value]="t.value" [selected]="t.value === q.type">{{ t.label }}</option> }
            </select>
          </label>
          <label class="check"><input type="checkbox" [checked]="q.required" (change)="patch(i, { required: $any($event.target).checked })" /> Required</label>
          @if (q.type !== 'text') {
            <label class="check">
              <input type="checkbox" [checked]="q.mustHave" (change)="patch(i, { mustHave: $any($event.target).checked })" /> Must-have qualification
            </label>
          }
        </div>

        @if (q.type === 'choice') {
          <label>
            Choices (one per line)
            <textarea rows="3" [value]="q.options.join('\\n')" (input)="patch(i, { options: $any($event.target).value.split('\\n') })"></textarea>
          </label>
        }

        @if (q.mustHave) {
          @switch (q.type) {
            @case ('yesno') {
              <label>
                Ideal answer
                <select (change)="patch(i, { idealAnswer: $any($event.target).value || null })">
                  <option value="" [selected]="!q.idealAnswer">Choose…</option>
                  <option value="Yes" [selected]="q.idealAnswer === 'Yes'">Yes</option>
                  <option value="No" [selected]="q.idealAnswer === 'No'">No</option>
                </select>
              </label>
            }
            @case ('choice') {
              <label>
                Ideal answer
                <select (change)="patch(i, { idealAnswer: $any($event.target).value || null })">
                  <option value="" [selected]="!q.idealAnswer">Choose…</option>
                  @for (o of nonBlank(q.options); track o) { <option [value]="o" [selected]="o === q.idealAnswer">{{ o }}</option> }
                </select>
              </label>
            }
            @case ('number') {
              <label>
                Minimum to qualify
                <input
                  type="number"
                  min="0"
                  [value]="q.minNumber ?? ''"
                  (input)="patch(i, { minNumber: $any($event.target).value === '' ? null : +$any($event.target).value })"
                />
              </label>
            }
          }
        }
      </fieldset>
    } @empty {
      <p class="small muted">No screening questions. Applicants will just send their profile and resume.</p>
    }

    @if (questions().length < max) {
      <div class="question-add">
        <button type="button" class="btn btn-outline btn-sm" (click)="add()">+ Add question</button>
        <select #preset (change)="addPreset(+preset.value); preset.value = ''" aria-label="Add a common question">
          <option value="">+ Add a common question…</option>
          @for (p of presets; track p.text; let k = $index) { <option [value]="k">{{ p.text }}</option> }
        </select>
      </div>
    } @else {
      <p class="small muted">You can add up to {{ max }} questions.</p>
    }
  `,
})
export class QuestionEditor {
  readonly questions = model.required<ScreeningQuestion[]>();

  protected readonly types = QUESTION_TYPES;
  protected readonly presets = PRESET_QUESTIONS;
  protected readonly max = MAX_QUESTIONS;

  protected add() {
    this.questions.update((qs) => [...qs, newQuestion()]);
  }

  protected addPreset(index: number) {
    const preset = PRESET_QUESTIONS[index];
    if (preset) this.questions.update((qs) => [...qs, newQuestion({ ...preset, options: [...preset.options] })]);
  }

  protected remove(index: number) {
    this.questions.update((qs) => qs.filter((_, i) => i !== index));
  }

  protected move(index: number, by: -1 | 1) {
    this.questions.update((qs) => {
      const next = [...qs];
      [next[index], next[index + by]] = [next[index + by], next[index]];
      return next;
    });
  }

  protected setType(index: number, type: QuestionType) {
    this.patch(index, { type, idealAnswer: null, minNumber: null, mustHave: type === 'text' ? false : this.questions()[index].mustHave });
  }

  protected patch(index: number, change: Partial<ScreeningQuestion>) {
    this.questions.update((qs) => qs.map((q, i) => (i === index ? { ...q, ...change } : q)));
  }

  protected nonBlank(options: string[]): string[] {
    return options.map((o) => o.trim()).filter(Boolean);
  }
}
