import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8080/api/proxy/worldbank';
  private connectionStatus = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = this.connectionStatus.asObservable();

  constructor(private http: HttpClient) { }

  // ================== CONEXIÓN ==================
  testConnection(): Observable<any> {
    // Cambiado a responseType: 'text' para evitar fallo de parseo
    return this.http.get(`${this.apiUrl}/test`, { responseType: 'text' }).pipe(
      tap((res: string) => {
        this.connectionStatus.next(true);
        console.log('✅ Conexión a API establecida correctamente (vía backend)');
        console.log('Respuesta recibida:', res); // ver qué devuelve realmente
      }),
      catchError((error: HttpErrorResponse) => {
        this.connectionStatus.next(false);
        console.error('❌ Error conectando a la API (vía backend):', error.message);
        return throwError(() => new Error('Error de conexión con la API'));
      })
    );
  }

  // ================== SEARCH ==================
  searchIndicators(query: string): Observable<any> {
    const body = {
      count: true,
      select: "series_description/idno, series_description/name, series_description/database_id",
      search: query,
      top: 10
    };

    return this.http.post(`${this.apiUrl}/search`, body).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error en búsqueda:', error.message);
        return throwError(() => new Error('Error al buscar en la API'));
      })
    );
  }

  // ================== EJEMPLO: Población Colombia ==================
  getColombiaPopulation(): Observable<any> {
    return this.http.get(`${this.apiUrl}/population/colombia`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('❌ Error obteniendo población de Colombia:', error.message);
        return throwError(() => new Error('Error obteniendo datos de población'));
      })
    );
  }
}
