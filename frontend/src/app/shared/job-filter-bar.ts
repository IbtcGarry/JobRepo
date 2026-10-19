import { Component, computed, model, signal } from '@angular/core';

import {
  EMPTY_FILTERS,
  JobFilters,
  POSTED_OPTIONS,
  SALARY_OPTIONS,
  activeFilterCount,
} from '../data/job-filters';
import { COMPANY_SIZES, JOB_TYPES, LEVELS, ROLES, WORKPLACES } from '../data/jobs';

type ListKey = 'roles' | 'workplaces' | 'types' | 'levels' | 'sizes';

/** Row of filter dropdowns shared by the job board and the map. */
@Component({
  selector: 'app-job-filter-bar',
  template: `
    <div class="filterbar">
      @for (group of groups; track group.key) {
        <div class="dropdown">
          <button
            type="button"
            class="trigger"
            [class.on]="filters()[group.key].length"
            [attr.aria-expanded]="openMenu() === group.key"
            (click)="toggleMenu(group.key)"
          >
            {{ group.label }}
            @if (filters()[group.key].length) { <span class="badge">{{ filters()[group.key].length }}</span> }
            <span class="caret">▾</span>
          </button>
          @if (openMenu() === group.key) {
            <div class="menu">
              @for (option of group.options; track option) {
                <label class="option">
                  <input type="checkbox" [checked]="isOn(group.key, option)" (change)="toggle(group.key, option)" />
                  {{ option }}
                </label>
              }
            </div>
          }
        </div>
      }

      <div class="dropdown">
        <button type="button" class="trigger" [class.on]="filters().minSalary" [attr.aria-expanded]="openMenu() === 'salary'" (click)="toggleMenu('salary')">
          {{ filters().minSalary ? salaryLabel(filters().minSalary) : 'Salary' }} <span class="caret">▾</span>
        </button>
        @if (openMenu() === 'salary') {
          <div class="menu">
            @for (amount of salaryOptions; track amount) {
              <label class="option">
                <input type="radio" name="salary" [checked]="filters().minSalary === amount" (change)="set('minSalary', amount); closeMenu()" />
                {{ amount ? salaryLabel(amount) : 'Any salary' }}
              </label>
            }
          </div>
        }
      </div>

      <div class="dropdown">
        <button type="button" class="trigger" [class.on]="filters().skills.length" [attr.aria-expanded]="openMenu() === 'skills'" (click)="toggleMenu('skills')">
          Skills
          @if (filters().skills.length) { <span class="badge">{{ filters().skills.length }}</span> }
          <span class="caret">▾</span>
        </button>
        @if (openMenu() === 'skills') {
          <div class="menu wide">
            <input
              #skill
              type="text"
              placeholder="Type a skill, press Enter"
              (keydown.enter)="$event.preventDefault(); addSkill(skill)"
            />
            @if (filters().skills.length) {
              <div class="chips">
                @for (s of filters().skills; track s) {
                  <button type="button" class="active" (click)="removeSkill(s)" [attr.aria-label]="'Remove ' + s">{{ s }} ×</button>
                }
              </div>
            } @else {
              <p class="muted small">Jobs must list every skill you add.</p>
            }
          </div>
        }
      </div>

      <div class="dropdown">
        <button type="button" class="trigger" [class.on]="filters().postedWithinDays" [attr.aria-expanded]="openMenu() === 'posted'" (click)="toggleMenu('posted')">
          {{ filters().postedWithinDays ? postedLabel() : 'Date posted' }} <span class="caret">▾</span>
        </button>
        @if (openMenu() === 'posted') {
          <div class="menu">
            @for (p of postedOptions; track p.days) {
              <label class="option">
                <input type="radio" name="posted" [checked]="filters().postedWithinDays === p.days" (change)="set('postedWithinDays', p.days); closeMenu()" />
                {{ p.label }}
              </label>
            }
          </div>
        }
      </div>

      <div class="dropdown">
        <button
          type="button"
          class="trigger"
          [class.on]="filters().equityOnly || filters().visaOnly"
          [attr.aria-expanded]="openMenu() === 'perks'"
          (click)="toggleMenu('perks')"
        >
          Perks
          @if (+filters().equityOnly + +filters().visaOnly; as n) { <span class="badge">{{ n }}</span> }
          <span class="caret">▾</span>
        </button>
        @if (openMenu() === 'perks') {
          <div class="menu">
            <label class="option"><input type="checkbox" [checked]="filters().equityOnly" (change)="set('equityOnly', $any($event.target).checked)" /> Offers equity</label>
            <label class="option"><input type="checkbox" [checked]="filters().visaOnly" (change)="set('visaOnly', $any($event.target).checked)" /> Sponsors visas</label>
          </div>
        }
      </div>

      @if (activeCount()) {
        <button type="button" class="link clear" (click)="clear()">Clear all ({{ activeCount() }})</button>
      }
    </div>
  `,
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class JobFilterBar {
  readonly filters = model.required<JobFilters>();

  protected readonly groups: { key: ListKey; label: string; options: readonly string[] }[] = [
    { key: 'roles', label: 'Role', options: ROLES },
    { key: 'workplaces', label: 'Workplace', options: WORKPLACES },
    { key: 'types', label: 'Job type', options: JOB_TYPES },
    { key: 'levels', label: 'Experience', options: LEVELS },
    { key: 'sizes', label: 'Company size', options: COMPANY_SIZES },
  ];
  protected readonly salaryOptions = SALARY_OPTIONS;
  protected readonly postedOptions = POSTED_OPTIONS;

  /** Which filter dropdown is open, if any. */
  protected readonly openMenu = signal<string | null>(null);
  protected readonly activeCount = computed(() => activeFilterCount(this.filters()));

  protected toggleMenu(name: string) {
    this.openMenu.update((open) => (open === name ? null : name));
  }

  protected closeMenu() {
    this.openMenu.set(null);
  }

  protected closeOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.openMenu() && !target.closest('.dropdown')) this.closeMenu();
  }

  protected postedLabel(): string {
    return POSTED_OPTIONS.find((p) => p.days === this.filters().postedWithinDays)?.label ?? 'Date posted';
  }

  protected set<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  protected isOn(key: ListKey, option: string): boolean {
    return (this.filters()[key] as string[]).includes(option);
  }

  protected toggle(key: ListKey, option: string) {
    const current = this.filters()[key] as string[];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    this.set(key, next as JobFilters[ListKey]);
  }

  protected addSkill(input: HTMLInputElement) {
    const skill = input.value.trim();
    input.value = '';
    const skills = this.filters().skills;
    if (skill && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) this.set('skills', [...skills, skill]);
  }

  protected removeSkill(skill: string) {
    this.set('skills', this.filters().skills.filter((s) => s !== skill));
  }

  /** Reset the dropdown filters, keeping the search text, location and sort. */
  protected clear() {
    this.filters.update((f) => ({ ...EMPTY_FILTERS, query: f.query, location: f.location, sort: f.sort }));
  }

  protected salaryLabel(amount: number): string {
    return amount ? `$${amount / 1000}K+` : 'Any salary';
  }
}
