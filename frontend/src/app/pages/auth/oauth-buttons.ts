import { Component, inject } from '@angular/core';
import { OAuthProvider } from 'appwrite';

import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-oauth-buttons',
  template: `
    <div class="divider"><span>or</span></div>
    <div class="oauth">
      <button type="button" class="btn btn-outline" (click)="auth.loginWithOAuth(Provider.Google)">Continue with Google</button>
      <button type="button" class="btn btn-outline" (click)="auth.loginWithOAuth(Provider.Github)">Continue with GitHub</button>
      <button type="button" class="btn btn-outline" (click)="auth.loginWithOAuth(Provider.Linkedin)">Continue with LinkedIn</button>
    </div>
  `,
})
export class OAuthButtons {
  protected readonly auth = inject(AuthService);
  protected readonly Provider = OAuthProvider;
}
