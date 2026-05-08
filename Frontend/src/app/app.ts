import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UploadCsvComponent } from './upload-csv/upload-csv-component/upload-csv-component';
import { PriorityTabComponent } from './components/priority-table/priority-tab/priority-tab';
import { MapaComponent } from './components/mapa/mapa';
import { ThemeService } from './services/theme';  // ✅ tu servicio, no ng2-charts

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class AppComponent {
  constructor(private themeService: ThemeService) { }

  toggleTheme() {
    this.themeService.toggleTheme();
  }
}
