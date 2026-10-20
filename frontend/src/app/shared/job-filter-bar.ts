// <app-job-filter-bar>: the row of filter dropdowns (Role, Workplace, … Perks, Clear all),
// shared by the job board and the map search. The filter logic itself is in data/job-filters.ts.

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
  templateUrl: './job-filter-bar.html',
  host: {
    '(document:click)': 'closeOnOutsideClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class JobFilterBar {
  /** The current filters; changes flow back to the page using the bar (two-way binding). */
  readonly filters = model.required<JobFilters>();

  /** The checkbox dropdowns, in the order they appear. */
  protected readonly groups: { key: ListKey; label: string; options: readonly string[] }[] = [
    { key: 'roles', label: 'Role', options: ROLES },
    { key: 'workplaces', label: 'Workplace', options: WORKPLACES },
    { key: 'types', label: 'Job type', options: JOB_TYPES },
    { key: 'levels', label: 'Experience', options: LEVELS },
    { key: 'sizes', label: 'Company size', options: COMPANY_SIZES },
  ];
  // Choices for the Salary and Date posted dropdowns.
  protected readonly salaryOptions = SALARY_OPTIONS;
  protected readonly postedOptions = POSTED_OPTIONS;

  /** Which filter dropdown is open, if any. */
  protected readonly openMenu = signal<string | null>(null);
  /** How many filters are on, for the "Clear all (n)" button. */
  protected readonly activeCount = computed(() => activeFilterCount(this.filters()));

  /** Open a dropdown, or close it if it's already open. */
  protected toggleMenu(name: string) {
    this.openMenu.update((open) => (open === name ? null : name));
  }

  /** Close whichever dropdown is open. */
  protected closeMenu() {
    this.openMenu.set(null);
  }

  /** Close the open dropdown when the user clicks anywhere outside it. */
  protected closeOnOutsideClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.openMenu() && !target.closest('.dropdown')) this.closeMenu();
  }

  /** Button text for the Date posted dropdown, e.g. "Past week". */
  protected postedLabel(): string {
    return POSTED_OPTIONS.find((p) => p.days === this.filters().postedWithinDays)?.label ?? 'Date posted';
  }

  /** Change one filter and pass the new filters back to the page. */
  protected set<K extends keyof JobFilters>(key: K, value: JobFilters[K]) {
    this.filters.update((f) => ({ ...f, [key]: value }));
  }

  /** True when an option is ticked in a checkbox dropdown. */
  protected isOn(key: ListKey, option: string): boolean {
    return (this.filters()[key] as string[]).includes(option);
  }

  /** Tick or untick an option in a checkbox dropdown. */
  protected toggle(key: ListKey, option: string) {
    const current = this.filters()[key] as string[];
    const next = current.includes(option) ? current.filter((o) => o !== option) : [...current, option];
    this.set(key, next as JobFilters[ListKey]);
  }

  /** Skills box: on Enter, add the typed skill (ignoring duplicates) and clear the box. */
  protected addSkill(input: HTMLInputElement, event: Event) {
    event.preventDefault(); // Enter would otherwise submit a surrounding form.
    const skill = input.value.trim();
    input.value = '';
    const skills = this.filters().skills;
    if (skill && !skills.some((s) => s.toLowerCase() === skill.toLowerCase())) this.set('skills', [...skills, skill]);
  }

  /** Salary dropdown: choose a minimum and close the menu. */
  protected pickSalary(amount: number) {
    this.set('minSalary', amount);
    this.closeMenu();
  }

  /** Date posted dropdown: choose a time range and close the menu. */
  protected pickPostedWithin(days: number) {
    this.set('postedWithinDays', days);
    this.closeMenu();
  }

  /** Perks: only jobs that offer equity. */
  protected setEquityOnly(on: boolean) {
    this.set('equityOnly', on);
  }

  /** Perks: only jobs that sponsor visas. */
  protected setVisaOnly(on: boolean) {
    this.set('visaOnly', on);
  }

  /** Remove a skill tag. */
  protected removeSkill(skill: string) {
    this.set('skills', this.filters().skills.filter((s) => s !== skill));
  }

  /** Reset the dropdown filters, keeping the search text, location and sort. */
  protected clear() {
    this.filters.update((f) => ({ ...EMPTY_FILTERS, query: f.query, location: f.location, sort: f.sort }));
  }

  /** Salary option text: "$100K+" or "Any salary". */
  protected salaryLabel(amount: number): string {
    return amount ? `$${amount / 1000}K+` : 'Any salary';
  }
}
