import { Component, effect, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth.service';
import { ProfileService } from './core/profile.service';
import { Avatar } from './shared/avatar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, Avatar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly auth = inject(AuthService);
  protected readonly profiles = inject(ProfileService);
  private readonly router = inject(Router);

  constructor() {
    // Keep the header's profile picture in step with who is signed in.
    effect(() => {
      void this.profiles.loadAvatar(this.auth.user()?.$id ?? null);
    });
  }

  async logout() {
    await this.auth.logout();
    await this.router.navigateByUrl('/');
  }
}
