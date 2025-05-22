export interface LoanCalculationRequest {
  LoanAmount: number;
  InterestRate: number;
  TermInYears: number;
}

export interface MonthlyPaymentDetail {
  PaymentNumber: number;
  Payment: number;
  Principal: number;
  Interest: number;
  RemainingBalance: number;
}

export interface LoanCalculationResult {
  Id?: string;  // Optional since it might not be included in the /payments response
  LoanAmount: number;
  InterestRate: number;
  TermInYears: number;
  MonthlyPayment: number;
  PaymentSchedule: MonthlyPaymentDetail[];
  CalculationDate?: Date;  // Optional since it might not be included in the /payments response
}