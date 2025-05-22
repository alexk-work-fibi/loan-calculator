import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatCardModule } from '@angular/material/card';
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
    NgxChartsModule
  ],
  templateUrl: './payment-schedule.component.html',
  styleUrl: './payment-schedule.component.scss'
})
export class PaymentScheduleComponent implements OnInit, OnDestroy {
  calculationResult: LoanCalculationResult | null = null;
  displayedColumns: string[] = ['PaymentNumber', 'Payment', 'Principal', 'Interest', 'RemainingBalance'];
  dataSource: MonthlyPaymentDetail[] = [];
  pageSize = 12;
  pageSizeOptions = [12, 24, 36, 60];
  pageEvent?: PageEvent;
  private subscription!: Subscription;

  // Chart data
  chartData: any[] = [];
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  legendPosition = 'below';
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
        this.dataSource = result.PaymentSchedule;
        this.updateChartData();
      } else {
        this.calculationResult = null;
        this.dataSource = [];
        this.chartData = [];
      }
    });
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
  }

  handlePageEvent(event: PageEvent): void {
    this.pageEvent = event;
  }

  private updateChartData(): void {
    if (!this.calculationResult) return;

    // Create principal vs interest chart data
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
}
