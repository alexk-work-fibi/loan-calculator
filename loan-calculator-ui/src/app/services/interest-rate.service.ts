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
  isDefault?: boolean;
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
      console.log('SSR mode: Using default mortgage rate 4.2%');
      return of(4.2); // Updated default rate for SSR
    }
    
    // Force refresh from API by resetting cache
    this.mortgageRateCache$ = null;
    
    // Return cached value if available and not expired
    const cachedData = this.getCachedRate(this.CACHE_KEY_MORTGAGE);
    if (cachedData) {
      console.log(`Using cached mortgage rate: ${cachedData}%`);
      return of(cachedData);
    }

    // Use shareReplay to cache the result for multiple subscribers
    if (!this.mortgageRateCache$) {
      this.mortgageRateCache$ = this.http.get<number>('/api/InterestRate/average/mortgage').pipe(
        tap(rate => {
          console.log(`Received mortgage rate from API: ${rate}%`);
          this.cacheRate(this.CACHE_KEY_MORTGAGE, rate);
        }),
        catchError((error) => {
          console.warn('Error fetching mortgage rate, using default 4.2%', error);
          return of(4.2); // Updated default rate if API fails
        }),
        shareReplay(1)
      );
    }

    return this.mortgageRateCache$;
  }
  
  getAverageLoanRate(): Observable<number> {
    // Skip API call during server-side rendering
    if (typeof window === 'undefined') {
      console.log('SSR mode: Using default loan rate 6.5%');
      return of(6.5); // Updated default rate for SSR
    }
    
    // Force refresh from API by resetting cache
    this.loanRateCache$ = null;
    
    // Return cached value if available and not expired
    const cachedData = this.getCachedRate(this.CACHE_KEY_LOAN);
    if (cachedData) {
      console.log(`Using cached loan rate: ${cachedData}%`);
      return of(cachedData);
    }

    // Use shareReplay to cache the result for multiple subscribers
    if (!this.loanRateCache$) {
      this.loanRateCache$ = this.http.get<number>('/api/InterestRate/average/loan').pipe(
        tap(rate => {
          console.log(`Received loan rate from API: ${rate}%`);
          this.cacheRate(this.CACHE_KEY_LOAN, rate);
        }),
        catchError((error) => {
          console.warn('Error fetching loan rate, using default 6.5%', error);
          return of(6.5); // Updated default rate if API fails
        }),
        shareReplay(1)
      );
    }

    return this.loanRateCache$;
  }
  
  getMortgageRateDetails(): Observable<InterestRateResponse> {
    return this.http.get<InterestRateResponse>('/api/InterestRate/mortgage').pipe(
      catchError(() => of({
        averageRate: 4.2,
        period: new Date().toLocaleDateString(),
        lastUpdated: new Date().toISOString(),
        source: 'Default values (API failed)',
        isDefault: false, // Set to false as requested
        details: [
          { bankName: 'Bank Hapoalim', rate: 4.1 },
          { bankName: 'Bank Leumi', rate: 4.2 },
          { bankName: 'Discount Bank', rate: 4.3 },
          { bankName: 'Mizrahi-Tefahot Bank', rate: 4.0 },
          { bankName: 'First International Bank', rate: 4.4 }
        ]
      }))
    );
  }
  
  getLoanRateDetails(): Observable<InterestRateResponse> {
    return this.http.get<InterestRateResponse>('/api/InterestRate/loan').pipe(
      catchError(() => of({
        averageRate: 6.5,
        period: new Date().toLocaleDateString(),
        lastUpdated: new Date().toISOString(),
        source: 'Default values (API failed)',
        isDefault: false, // Set to false as requested
        details: [
          { bankName: 'Bank Hapoalim', rate: 6.3 },
          { bankName: 'Bank Leumi', rate: 6.5 },
          { bankName: 'Discount Bank', rate: 6.7 },
          { bankName: 'Mizrahi-Tefahot Bank', rate: 6.2 },
          { bankName: 'First International Bank', rate: 6.8 }
        ]
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
    
    // Clear existing cache to force refresh from API
    localStorage.removeItem(key);
    return null;
    
    /* Original cache logic disabled to force refresh
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;

    try {
      const { rate, timestamp } = JSON.parse(cachedItem);
      const isExpired = Date.now() - timestamp > this.CACHE_EXPIRY_MS;
      
      return isExpired ? null : rate;
    } catch {
      return null;
    }
    */
  }
}