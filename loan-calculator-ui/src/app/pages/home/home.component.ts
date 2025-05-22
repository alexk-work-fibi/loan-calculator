import { Component } from '@angular/core';
import { LoanCalculatorComponent } from '../../components/loan-calculator/loan-calculator.component';
import { PaymentScheduleComponent } from '../../components/payment-schedule/payment-schedule.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [LoanCalculatorComponent, PaymentScheduleComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
