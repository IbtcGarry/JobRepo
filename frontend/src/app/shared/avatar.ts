// <app-avatar>: a square profile picture or company logo; shows the first letter when there
// is no image. Used in the header, account, companies, admin and applicants pages.

import { Component, input } from '@angular/core';

/** Square profile picture, or the user's first letter when there is none. */
@Component({
  selector: 'app-avatar',
  host: { '[class]': "'avatar ' + size()" },
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
})
export class Avatar {
  /** Person or company name; its first letter shows when there is no picture. */
  readonly name = input('');
  /** Image address, or null to show the letter instead. */
  readonly url = input<string | null>(null);
  /** small (header), medium (lists) or large (page headers). */
  readonly size = input<'small' | 'medium' | 'large'>('small');
}
