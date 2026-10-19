import { Component, input } from '@angular/core';

/** Square profile picture, or the user's first letter when there is none. */
@Component({
  selector: 'app-avatar',
  host: { '[class]': "'avatar ' + size()" },
  template: `
    @if (url(); as src) {
      <img [src]="src" alt="" />
    } @else {
      {{ (name() || '?')[0].toUpperCase() }}
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      width: 28px;
      height: 28px;
      background: var(--accent);
      color: #fff;
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 0.875rem;
    }
    :host(.medium) { width: 56px; height: 56px; font-size: 1.5rem; }
    :host(.large) { width: 96px; height: 96px; font-size: 2.5rem; }
    img { width: 100%; height: 100%; object-fit: cover; }
  `,
})
export class Avatar {
  readonly name = input('');
  readonly url = input<string | null>(null);
  readonly size = input<'small' | 'medium' | 'large'>('small');
}
