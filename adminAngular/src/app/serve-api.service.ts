//this service use <API>
import {inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class ServeAPIService {
  //basic url to enter Node backend
  private baseUrl = 'http://localhost:3000';
  //get verify list (all and simple)
  private adminVerifyUrl = `${this.baseUrl}/adminVerify`;

  private http = inject(HttpClient);

  // get all providers with verification status (admin)
  getAdminVerifyList(): Observable<any> {
    return this.http.get<any>(this.adminVerifyUrl);
  }
}
