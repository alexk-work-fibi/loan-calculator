using System;
using System.Collections.Generic;

namespace demo.Models
{
    public class LoanCalculationResult
    {
        public string Id { get; set; } = Guid.NewGuid().ToString();
        public decimal LoanAmount { get; set; }
        public decimal InterestRate { get; set; }
        public int TermInYears { get; set; }
        public decimal MonthlyPayment { get; set; }
        public List<MonthlyPaymentDetail> PaymentSchedule { get; set; } = new List<MonthlyPaymentDetail>();
        public DateTime CalculationDate { get; set; } = DateTime.UtcNow;
        public string CalculationMethod { get; set; } = "Shpitzer"; // Default to Shpitzer
    }

    public class MonthlyPaymentDetail
    {
        public int PaymentNumber { get; set; }
        public decimal Payment { get; set; }
        public decimal Principal { get; set; }
        public decimal Interest { get; set; }
        public decimal RemainingBalance { get; set; }
    }

    public class LoanCalculationRequest
    {
        public double LoanAmount { get; set; }
        public double InterestRate { get; set; }
        public int TermInYears { get; set; }
        public string CalculationMethod { get; set; } = "Shpitzer"; // Default to Shpitzer
    }
}