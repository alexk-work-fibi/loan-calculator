import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { LoanService } from '../../services/loan.service';
import { LoanCalculationResult, MonthlyPaymentDetail } from '../../models/loan-models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-payment-schedule',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatCardModule,
    MatTabsModule,
    NgxChartsModule
  ],
  templateUrl: './payment-schedule.component.html',
  styleUrl: './payment-schedule.component.scss'
})
export class PaymentScheduleComponent implements OnInit, OnDestroy {
  calculationResult: LoanCalculationResult | null = null;
  displayedColumns: string[] = ['PaymentNumber', 'Payment', 'Principal', 'Interest', 'RemainingBalance'];
  sortedData: MonthlyPaymentDetail[] = [];
  paginatedData: MonthlyPaymentDetail[] = [];
  sortColumn: string = 'PaymentNumber';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageSize = 12;
  pageSizeOptions = [12, 24, 36, 60];
  pageIndex = 0;
  private subscription!: Subscription;

  // Chart data
  chartData: any[] = [];
  pieChartData: any[] = [];
  selectedTabIndex = 0;
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  legendPosition: any = 'below';
  showXAxisLabel = true;
  xAxisLabel = 'Payment Number';
  showYAxisLabel = true;
  yAxisLabel = 'Amount ($)';
  colorScheme: any = {
    domain: ['#5AA454', '#E44D25', '#7aa3e5']
  };

  constructor(private loanService: LoanService) {}

  ngOnInit(): void {
    this.subscription = this.loanService.calculationResult$.subscribe(result => {
      if (result && result.PaymentSchedule && result.PaymentSchedule.length > 0) {
        this.calculationResult = result;
        this.sortedData = [...result.PaymentSchedule];
        this.sortData(this.sortColumn); // Initial sort
        this.updateChartData();
      } else {
        this.calculationResult = null;
        this.sortedData = [];
        this.paginatedData = [];
        this.chartData = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  handlePageEvent(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.updatePaginatedData();
  }

  sortData(column: string): void {
    if (this.sortColumn === column) {
      // Toggle direction if same column
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Default to ascending for new column
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    // Sort the data
    this.sortedData = [...this.calculationResult?.PaymentSchedule || []].sort((a, b) => {
      const isAsc = this.sortDirection === 'asc';
      switch (column) {
        case 'PaymentNumber': return this.compare(a.PaymentNumber, b.PaymentNumber, isAsc);
        case 'Payment': return this.compare(a.Payment, b.Payment, isAsc);
        case 'Principal': return this.compare(a.Principal, b.Principal, isAsc);
        case 'Interest': return this.compare(a.Interest, b.Interest, isAsc);
        case 'RemainingBalance': return this.compare(a.RemainingBalance, b.RemainingBalance, isAsc);
        default: return 0;
      }
    });
    
    // Reset to first page when sorting
    this.pageIndex = 0;
    this.updatePaginatedData();
  }
  
  private updatePaginatedData(): void {
    const start = this.pageIndex * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedData = this.sortedData.slice(start, end);
  }

  private compare(a: number, b: number, isAsc: boolean): number {
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }
  
  getCalculationMethodLabel(): string {
    if (!this.calculationResult || !this.calculationResult.CalculationMethod) {
      return 'Shpitzer (Fixed Payment)';
    }
    
    switch (this.calculationResult.CalculationMethod.toLowerCase()) {
      case 'fixedprincipal':
        return 'Fixed Principal (קרן קבועה)';
      case 'shpitzer':
      default:
        return 'Shpitzer (שפיצר)';
    }
  }

  private updateChartData(): void {
    if (!this.calculationResult) return;

    // Create chart data based on calculation method
    if (this.calculationResult.CalculationMethod === 'fixedprincipal') {
      this.createFixedPrincipalChartData();
    } else {
      this.createShpitzerChartData();
    }
    
    // Create pie chart data
    // Calculate total principal and interest
    const totalPrincipal = this.calculationResult.LoanAmount;
    const totalInterest = this.calculationResult.PaymentSchedule.reduce(
      (sum, payment) => sum + payment.Interest, 0
    );
    
    this.pieChartData = [
      {
        name: 'Principal',
        value: totalPrincipal
      },
      {
        name: 'Total Interest',
        value: totalInterest
      }
    ];
  }
  
  private createShpitzerChartData(): void {
    if (!this.calculationResult) return;
    
    // For Shpitzer, show principal, interest, and remaining balance
    const principal = {
      name: 'Principal',
      series: this.calculationResult.PaymentSchedule
        .filter((_, index) => index % 12 === 0) // Show yearly data points to avoid overcrowding
        .map(payment => ({
          name: payment.PaymentNumber,
          value: payment.Principal
        }))
    };

    const interest = {
      name: 'Interest',
      series: this.calculationResult.PaymentSchedule
        .filter((_, index) => index % 12 === 0)
        .map(payment => ({
          name: payment.PaymentNumber,
          value: payment.Interest
        }))
    };

    const remainingBalance = {
      name: 'Remaining Balance',
      series: this.calculationResult.PaymentSchedule
        .filter((_, index) => index % 12 === 0)
        .map(payment => ({
          name: payment.PaymentNumber,
          value: payment.RemainingBalance
        }))
    };

    this.chartData = [principal, interest, remainingBalance];
  }
  
  private createFixedPrincipalChartData(): void {
    if (!this.calculationResult) return;
    
    // For Fixed Principal, show total payment, principal, and interest
    const totalPayment = {
      name: 'Total Payment',
      series: this.calculationResult.PaymentSchedule
        .filter((_, index) => index % 12 === 0) // Show yearly data points to avoid overcrowding
        .map(payment => ({
          name: payment.PaymentNumber,
          value: payment.Payment
        }))
    };
    
    const principal = {
      name: 'Principal (Fixed)',
      series: this.calculationResult.PaymentSchedule
        .filter((_, index) => index % 12 === 0)
        .map(payment => ({
          name: payment.PaymentNumber,
          value: payment.Principal
        }))
    };

    const interest = {
      name: 'Interest (Decreasing)',
      series: this.calculationResult.PaymentSchedule
        .filter((_, index) => index % 12 === 0)
        .map(payment => ({
          name: payment.PaymentNumber,
          value: payment.Interest
        }))
    };

    this.chartData = [totalPayment, principal, interest];
  }
}