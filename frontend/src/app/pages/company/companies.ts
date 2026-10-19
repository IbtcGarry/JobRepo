import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CompanyService } from '../../core/company.service';
import { Avatar } from '../../shared/avatar';

@Component({
  selector: 'app-companies',
  imports: [RouterLink, Avatar],
  template: `
    <section class="page">
      <h1>Companies</h1>
      @if (companies.isLoading()) {
        <p class="muted">Loading…</p>
      } @else if (companies.error()) {
        <p class="error">Couldn't load companies.</p>
      } @else {
        <ul class="company-list">
          @for (c of companies.value(); track c.id) {
            <li>
              <a [routerLink]="['/company', c.id]">
                <app-avatar [name]="c.name" [url]="service.logoUrl(c.logoFileId)" />
                <span>
                  <strong>{{ c.name }}</strong>
                  @if (c.locations.length) { <span class="muted small"> · {{ c.locations[0] }}</span> }
                </span>
              </a>
            </li>
          } @empty {
            <li class="muted">No companies yet.</li>
          }
        </ul>
      }
    </section>
  `,
})
export class Companies {
  protected readonly service = inject(CompanyService);
  protected readonly companies = resource({ loader: () => this.service.list() });
}
