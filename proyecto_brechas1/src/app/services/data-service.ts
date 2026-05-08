import { HttpClient, HttpEvent, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class DataService {
  private baseUrl = 'http://localhost:8080/api/import';
  constructor(private http: HttpClient) { }

  uploadCsv(file: File): Observable<HttpEvent<any>> {
    const formData = new FormData();
    formData.append("file", file); // 👈 clave igual que @RequestParam("file")

    const req = new HttpRequest('POST', `${this.baseUrl}/upload`, formData, {
      reportProgress: true,
      responseType: 'json'
    });

    return this.http.request(req);
  }
  // ✅ Nuevo método para obtener los datos para la gráfica
  getObservations(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8080/api/observations/all');
  }


}
