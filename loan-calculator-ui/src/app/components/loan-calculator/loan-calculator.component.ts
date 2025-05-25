import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { LoanService } from '../../services/loan.service';
import { InterestRateService } from '../../services/interest-rate.service';
import { LoanCalculationRequest } from '../../models/loan-models';

@Component({
  selector: 'app-loan-calculator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSliderModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './loan-calculator.component.html',
  styleUrl: './loan-calculator.component.scss'
})
export class LoanCalculatorComponent implements OnInit {
  loanForm: FormGroup;
  loading = false;
  error = '';
  loadingRate = false;
  defaultRate = 3.5; // Fallback default rate
  calculationMethods = [
    { value: 'shpitzer', label: 'שפיצר (תשלום קבוע)' },
    { value: 'fixedprincipal', label: 'קרן קבועה (תשלום יורד)' }
  ];

  constructor(
    private fb: FormBuilder,
    private loanService: LoanService,
    private interestRateService: InterestRateService
  ) {
    this.loanForm = this.fb.group({
      loanAmount: [100000, [Validators.required, Validators.min(1000)]],
      interestRate: [this.defaultRate, [Validators.required, Validators.min(0.1)]],
      termInYears: [30, [Validators.required, Validators.min(1), Validators.max(40)]],
      calculationMethod: ['shpitzer', Validators.required]
    });
  }
  
  ngOnInit(): void {
    this.loadCurrentInterestRate();
  }
  
  loadCurrentInterestRate(): void {
    this.loadingRate = true;
    this.interestRateService.getAverageInterestRate().subscribe({
      next: (rate) => {
        this.defaultRate = rate;
        this.loanForm.get('interestRate')?.setValue(rate);
        this.loadingRate = false;
      },
      error: () => {
        this.loadingRate = false;
      }
    });
  }
  
  loadMortgageRate(): void {
    this.loadingRate = true;
    this.interestRateService.getAverageMortgageRate().subscribe({
      next: (rate) => {
        this.defaultRate = rate;
        this.loanForm.get('interestRate')?.setValue(rate);
        this.loadingRate = false;
      },
      error: () => {
        this.loadingRate = false;
      }
    });
  }
  
  loadLoanRate(): void {
    this.loadingRate = true;
    this.interestRateService.getAverageLoanRate().subscribe({
      next: (rate) => {
        this.defaultRate = rate;
        this.loanForm.get('interestRate')?.setValue(rate);
        this.loadingRate = false;
      },
      error: () => {
        this.loadingRate = false;
      }
    });
  }

  onSubmit(): void {
    if (this.loanForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = '';

    // Convert form values to properly cased request object to match C# model
    const formValues = this.loanForm.value;
    const request: LoanCalculationRequest = {
      LoanAmount: formValues.loanAmount,
      InterestRate: formValues.interestRate,
      TermInYears: formValues.termInYears,
      CalculationMethod: formValues.calculationMethod
    };

    // First try to get existing payments using the GET endpoint
    this.loanService.getPayments(request).subscribe({
      next: (result) => {
        this.loanService.setCalculationResult(result);
        this.loading = false;
      },
      error: (err) => {
        console.warn('Could not retrieve existing payments, calculating new loan:', err);
        
        // Fall back to POST calculate if the GET fails
        this.loanService.calculateLoan(request).subscribe({
          next: (result) => {
            this.loanService.setCalculationResult(result);
            this.loading = false;
          },
          error: (err) => {
            this.error = 'Failed to calculate loan. Please try again.';
            console.error('Error calculating loan:', err);
            this.loading = false;
          }
        });
      }
    });
  }

  resetForm(): void {
    this.loanForm.reset({
      loanAmount: 100000,
      interestRate: this.defaultRate,
      termInYears: 30,
      calculationMethod: 'shpitzer'
    });
    this.loanService.clearCalculationResult();
    this.error = '';
  }
}
