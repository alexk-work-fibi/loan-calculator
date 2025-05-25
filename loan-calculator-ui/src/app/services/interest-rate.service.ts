import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, catchError, tap, shareReplay, map } from 'rxjs';

export interface InterestRateDetail {
  bankName: string;
  rate: number;
}

export interface InterestRateResponse {
  averageRate: number;
  period: string;
  lastUpdated: string;
  source: string;
  details: InterestRateDetail[];
}

@Injectable({
  providedIn: 'root'
})
export class InterestRateService {
  private readonly CACHE_KEY_MORTGAGE = 'boi_mortgage_rate';
  private readonly CACHE_KEY_LOAN = 'boi_loan_rate';
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
  
  private mortgageRateCache$: Observable<number> | null = null;
  private loanRateCache$: Observable<number> | null = null;

  constructor(private http: HttpClient) {}

  getAverageInterestRate(): Observable<number> {
    // For loan calculator, we use mortgage rates by default
    return this.getAverageMortgageRate();
  }
  
  getAverageMortgageRate(): Observable<number> {
    // Skip API call during server-side rendering
    if (typeof window === 'undefined') {
      return of(3.5); // Default rate for SSR
    }
    
    // Return cached value if available and not expired
    const cachedData = this.getCachedRate(this.CACHE_KEY_MORTGAGE);
    if (cachedData) {
      return of(cachedData);
    }

    // Use shareReplay to cache the result for multiple subscribers
    if (!this.mortgageRateCache$) {
      this.mortgageRateCache$ = this.http.get<number>('/api/InterestRate/average/mortgage').pipe(
        tap(rate => this.cacheRate(this.CACHE_KEY_MORTGAGE, rate)),
        catchError(() => of(3.5)), // Default fallback rate if API fails
        shareReplay(1)
      );
    }

    return this.mortgageRateCache$;
  }
  
  getAverageLoanRate(): Observable<number> {
    // Skip API call during server-side rendering
    if (typeof window === 'undefined') {
      return of(5.0); // Default rate for SSR
    }
    
    // Return cached value if available and not expired
    const cachedData = this.getCachedRate(this.CACHE_KEY_LOAN);
    if (cachedData) {
      return of(cachedData);
    }

    // Use shareReplay to cache the result for multiple subscribers
    if (!this.loanRateCache$) {
      this.loanRateCache$ = this.http.get<number>('/api/InterestRate/average/loan').pipe(
        tap(rate => this.cacheRate(this.CACHE_KEY_LOAN, rate)),
        catchError(() => of(5.0)), // Default fallback rate if API fails
        shareReplay(1)
      );
    }

    return this.loanRateCache$;
  }
  
  getMortgageRateDetails(): Observable<InterestRateResponse> {
    return this.http.get<InterestRateResponse>('/api/InterestRate/mortgage').pipe(
      catchError(() => of({
        averageRate: 3.5,
        period: new Date().toLocaleDateString(),
        lastUpdated: new Date().toISOString(),
        source: 'Default values (API failed)',
        details: [{ bankName: 'Default', rate: 3.5 }]
      }))
    );
  }
  
  getLoanRateDetails(): Observable<InterestRateResponse> {
    return this.http.get<InterestRateResponse>('/api/InterestRate/loan').pipe(
      catchError(() => of({
        averageRate: 5.0,
        period: new Date().toLocaleDateString(),
        lastUpdated: new Date().toISOString(),
        source: 'Default values (API failed)',
        details: [{ bankName: 'Default', rate: 5.0 }]
      }))
    );
  }

  private cacheRate(key: string, rate: number): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const cacheItem = {
      rate,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheItem));
  }

  private getCachedRate(key: string): number | null {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }
    
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;

    try {
      const { rate, timestamp } = JSON.parse(cachedItem);
      const isExpired = Date.now() - timestamp > this.CACHE_EXPIRY_MS;
      
      return isExpired ? null : rate;
    } catch {
      return null;
    }
  }
}