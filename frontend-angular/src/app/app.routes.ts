import { Routes } from '@angular/router';

import { UploadCsvComponent } from './upload-csv/upload-csv-component/upload-csv-component';
import { PriorityTabComponent } from './components/priority-table/priority-tab/priority-tab';

export const routes: Routes = [
  { path: '', redirectTo: 'upload', pathMatch: 'full' },
  { path: 'upload', component: UploadCsvComponent },
  { path: 'priorizacion', component: PriorityTabComponent } // 👈 nueva ruta
];
