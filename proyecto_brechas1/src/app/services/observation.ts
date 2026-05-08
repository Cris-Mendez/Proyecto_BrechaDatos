import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Observation {
  id: number;
  countryCode: string;
  countryName: string;
  indicatorName: string;
  timePeriod: number;
  obsValue: number;
  unitMeasure: string;
  sexLabel: string;
  ageLabel: string;
  urbanisationLabel: string;
}

@Injectable({
  providedIn: 'root'
})
export class ObservationService {
  private apiUrl = 'http://localhost:8080/api/observations';

  constructor(private http: HttpClient) { }

  getAll(): Observable<Observation[]> {
    return this.http.get<Observation[]>(this.apiUrl);
  }

  getByCountry(countryCode: string): Observable<Observation[]> {
    return this.http.get<Observation[]>(`${this.apiUrl}/country/${countryCode}`);
  }
}
