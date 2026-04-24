import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { GlobalPlayerComponent } from './shared/components/global-player/global-player.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, GlobalPlayerComponent],
  template: `
    <router-outlet></router-outlet>
    <app-global-player></app-global-player>
  `
})
export class AppComponent {}
