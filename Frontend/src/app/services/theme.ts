import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly darkModeKey = 'dark-mode';
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    if (this.isBrowser) {
      // 👉 Revisa si el usuario ya guardó una preferencia
      const savedTheme = localStorage.getItem(this.darkModeKey);

      if (savedTheme !== null) {
        this.applyTheme(savedTheme === 'dark');
      } else {
        // 👉 Si no hay preferencia, se asume claro por defecto
        //    pero revisamos si el sistema tiene preferencia oscura
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.applyTheme(prefersDark);
      }
    }
  }

  /** Aplica un tema */
  private applyTheme(isDark: boolean) {
    if (!this.isBrowser) return;

    if (isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem(this.darkModeKey, 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem(this.darkModeKey, 'light');
    }
  }

  /** Alternar entre claro y oscuro */
  toggleTheme() {
    if (!this.isBrowser) return;

    const isDark = document.body.classList.contains('dark-theme');
    this.applyTheme(!isDark);
  }
}
