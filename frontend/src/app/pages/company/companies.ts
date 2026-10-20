// Companies list (/companies): every company with its logo and first location.

import { Component, inject, resource } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CompanyService } from '../../core/company.service';
import { Avatar } from '../../shared/avatar';

/** Companies list (/companies): every company with its logo and first location. */
@Component({
  selector: 'app-companies',
  imports: [RouterLink, Avatar],
  templateUrl: './companies.html',
})
export class Companies {
  /** Company loading and logo addresses. */
  protected readonly service = inject(CompanyService);
  /** Every company, loaded when the page opens. */
  protected readonly companies = resource({ loader: () => this.service.list() });
}
