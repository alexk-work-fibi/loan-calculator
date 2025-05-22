import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { LoanCalculationRequest, LoanCalculationResult } from '../models/loan-models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  // When using the proxy configuration, we can use a relative URL
  private apiUrl = `/api/loancalculator`;
  private calculationResultSubject = new BehaviorSubject<LoanCalculationResult | null>(null);
  calculationResult$ = this.calculationResultSubject.asObservable();

  constructor(private http: HttpClient) { }

  calculateLoan(request: LoanCalculationRequest): Observable<LoanCalculationResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    // Ensure numbers are properly formatted
    const formattedRequest = {
      LoanAmount: Number(request.LoanAmount),
      InterestRate: Number(request.InterestRate),
      TermInYears: Number(request.TermInYears)
    };

    return this.http.post<LoanCalculationResult>(`${this.apiUrl}/calculate`, formattedRequest, { headers })
      .pipe(
        // Add error handling for malformed responses
        catchError(error => {
          console.error('Error while calculating loan:', error);
          if (error.toString().includes('etail, demo.Models')) {
            return throwError(() => new Error('Content negotiation error: API returned incorrectly formatted data. Please check Accept headers.'));
          }
          return throwError(() => error);
        })
      );
  }
  
  getPayments(request: LoanCalculationRequest): Observable<LoanCalculationResult> {
    // Build query parameters for the GET request using the same casing as C# model properties
    const params = {
      loanAmount: Number(request.LoanAmount).toString(),
      interestRate: Number(request.InterestRate).toString(),
      termInYears: Number(request.TermInYears).toString()
    };
    
    // Add Accept and Content-Type headers to ensure JSON response
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });
    
    return this.http.get<any>(`${this.apiUrl}/payments`, { params, headers })
      .pipe(
        map((response: {
          loanAmount: number;
          interestRate: number;
          termInYears: number;
          monthlyPayment: number;
          paymentSchedule: Array<{
            paymentNumber: number;
            payment: number;
            principal: number;
            interest: number;
            remainingBalance: number;
          }>;
        }) => {
          // Map the camelCase response to PascalCase LoanCalculationResult
          const result: LoanCalculationResult = {
            LoanAmount: response.loanAmount,
            InterestRate: response.interestRate,
            TermInYears: response.termInYears,
            MonthlyPayment: response.monthlyPayment,
            PaymentSchedule: response.paymentSchedule.map((p: any) => ({
              PaymentNumber: p.paymentNumber,
              Payment: p.payment,
              Principal: p.principal,
              Interest: p.interest,
              RemainingBalance: p.remainingBalance
            }))
          };
          return result;
        }),
        catchError(error => {
          console.error('Error while fetching payments:', error);
          if (error.toString().includes('etail, demo.Models')) {
            return throwError(() => new Error('Content negotiation error: API returned incorrectly formatted data. Please check Accept headers.'));
          }
          return throwError(() => error);
        })
      );
  }

  setCalculationResult(result: LoanCalculationResult): void {
    this.calculationResultSubject.next(result);
  }

  clearCalculationResult(): void {
    this.calculationResultSubject.next(null);
  }
}
