using Microsoft.AspNetCore.Mvc;
using MongoDB.Driver;
using Microsoft.Extensions.Logging;
using demo.Models;
using System;
using System.Collections.Generic;
using System.Linq;

namespace demo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class LoanCalculatorController : ControllerBase
    {
        private readonly IMongoCollection<LoanCalculationResult> _loanCalculations;
        private readonly ILogger<LoanCalculatorController> _logger;

        public LoanCalculatorController(IMongoCollection<LoanCalculationResult> loanCalculations, ILogger<LoanCalculatorController> logger)
        {
            _loanCalculations = loanCalculations;
            _logger = logger;
        }

        [HttpPost("calculate")]
        public IActionResult CalculateLoan([FromBody] LoanCalculationRequest request)
        {
            _logger.LogInformation("Received loan calculation request: {@Request}", request);

            if (request.LoanAmount <= 0 || request.InterestRate <= 0 || request.TermInYears <= 0)
            {
                _logger.LogWarning("Invalid loan calculation parameters: {@Request}", request);
                return BadRequest("Invalid loan calculation parameters.");
            }

            var monthlyRate = (double)(request.InterestRate / 100 / 12);
            var numberOfPayments = request.TermInYears * 12;
            var monthlyPayment = (double)request.LoanAmount * monthlyRate / (1 - Math.Pow(1 + monthlyRate, -numberOfPayments));

            var result = new LoanCalculationResult
            {
                LoanAmount = (decimal)request.LoanAmount,
                InterestRate = (decimal)request.InterestRate,
                TermInYears = request.TermInYears,
                MonthlyPayment = Math.Round((decimal)monthlyPayment, 2)
            };

            // Generate payment schedule
            decimal remainingBalance = result.LoanAmount;
            decimal monthlyInterestRate = result.InterestRate / 100 / 12;
            
            for (int month = 1; month <= numberOfPayments; month++)
            {
                var interestPayment = Math.Round(remainingBalance * monthlyInterestRate, 2);
                var principalPayment = Math.Round(result.MonthlyPayment - interestPayment, 2);
                
                // Adjust the final payment to ensure the balance reaches exactly zero
                if (month == numberOfPayments)
                {
                    principalPayment = remainingBalance;
                    result.MonthlyPayment = principalPayment + interestPayment;
                }

                remainingBalance -= principalPayment;
                
                // Ensure we don't get a negative balance due to rounding
                if (remainingBalance < 0) remainingBalance = 0;

                result.PaymentSchedule.Add(new MonthlyPaymentDetail
                {
                    PaymentNumber = month,
                    Payment = Math.Round(principalPayment + interestPayment, 2),
                    Principal = principalPayment,
                    Interest = interestPayment,
                    RemainingBalance = remainingBalance
                });
            }

            _loanCalculations.InsertOne(result);
            _logger.LogInformation("Loan calculation result saved: {@Result}", result);

            return Ok(result);
        }

        [HttpGet("payments")]
        public IActionResult GetPayments([FromQuery] LoanCalculationRequest request)
        {
            _logger.LogInformation("Received request to fetch payments: {@Request}", request);

            if (request.LoanAmount <= 0 || request.InterestRate <= 0 || request.TermInYears <= 0)
            {
                _logger.LogWarning("Invalid payment fetch parameters: {@Request}", request);
                return BadRequest("Invalid loan calculation parameters.");
            }

            var calculations = _loanCalculations.Find(result =>
                result.LoanAmount == (decimal)request.LoanAmount &&
                result.InterestRate == (decimal)request.InterestRate &&
                result.TermInYears == request.TermInYears)
                .ToList();

            if (calculations.Count == 0)
            {
                // If no matching calculation exists, create one on the fly
                return CalculateLoan(request);
            }
            
            var result = calculations.First();
            
            _logger.LogInformation("Fetched payments: {@PaymentSchedule}", result.PaymentSchedule);

            return Ok(new
            {
                LoanAmount = result.LoanAmount,
                InterestRate = result.InterestRate,
                TermInYears = result.TermInYears,
                MonthlyPayment = result.MonthlyPayment,
                PaymentSchedule = result.PaymentSchedule
            });
        }
    }
}
