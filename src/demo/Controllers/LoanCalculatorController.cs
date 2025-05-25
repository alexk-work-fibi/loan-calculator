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
    [Produces("application/json")]
    public class LoanCalculatorController : ControllerBase
    {
        private readonly IMongoCollection<LoanCalculationResult> _loanCalculations;
        private readonly ILogger<LoanCalculatorController> _logger;

        public LoanCalculatorController(IMongoCollection<LoanCalculationResult> loanCalculations, ILogger<LoanCalculatorController> logger)
        {
            _logger = logger;
            
            try
            {
                _loanCalculations = loanCalculations;
                _logger.LogInformation("MongoDB collection injected successfully");
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Error with MongoDB collection: {Message}. Will operate without persistence.", ex.Message);
                // We'll handle null _loanCalculations in the methods
            }
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

            // Validate calculation method
            string calculationMethod = request.CalculationMethod?.ToLower() ?? "shpitzer";
            if (calculationMethod != "shpitzer" && calculationMethod != "fixedprincipal")
            {
                calculationMethod = "shpitzer"; // Default to Shpitzer if invalid
            }

            var result = new LoanCalculationResult
            {
                LoanAmount = (decimal)request.LoanAmount,
                InterestRate = (decimal)request.InterestRate,
                TermInYears = request.TermInYears,
                CalculationMethod = calculationMethod
            };

            // Calculate based on method
            if (calculationMethod == "shpitzer")
            {
                CalculateShpitzer(result);
            }
            else
            {
                CalculateFixedPrincipal(result);
            }

            try
            {
                if (_loanCalculations != null)
                {
                    _loanCalculations.InsertOne(result);
                    _logger.LogInformation("Loan calculation result saved: {@Result}", result);
                }
                else
                {
                    _logger.LogWarning("MongoDB not available, calculation result not persisted");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to save loan calculation result");
                // Continue without failing the request
            }

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

            // Validate calculation method
            string calculationMethod = request.CalculationMethod?.ToLower() ?? "shpitzer";
            if (calculationMethod != "shpitzer" && calculationMethod != "fixedprincipal")
            {
                calculationMethod = "shpitzer"; // Default to Shpitzer if invalid
            }

            LoanCalculationResult result = null;
            
            try
            {
                if (_loanCalculations != null)
                {
                    var calculations = _loanCalculations.Find(r =>
                        r.LoanAmount == (decimal)request.LoanAmount &&
                        r.InterestRate == (decimal)request.InterestRate &&
                        r.TermInYears == request.TermInYears &&
                        r.CalculationMethod == calculationMethod)
                        .ToList();
                        
                    if (calculations.Count > 0)
                    {
                        result = calculations.First();
                        _logger.LogInformation("Found existing calculation in MongoDB");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error querying MongoDB");
                // Continue without failing the request
            }
            
            if (result == null)
            {
                // If no matching calculation exists or MongoDB is not available, create one on the fly
                _logger.LogInformation("No existing calculation found, calculating on the fly");
                
                // Create a new calculation result
                result = new LoanCalculationResult
                {
                    LoanAmount = (decimal)request.LoanAmount,
                    InterestRate = (decimal)request.InterestRate,
                    TermInYears = request.TermInYears,
                    CalculationMethod = calculationMethod
                };
                
                // Calculate based on method
                if (calculationMethod == "shpitzer")
                {
                    CalculateShpitzer(result);
                }
                else
                {
                    CalculateFixedPrincipal(result);
                }
                
                // Try to save to MongoDB if available
                try
                {
                    if (_loanCalculations != null)
                    {
                        _loanCalculations.InsertOne(result);
                        _logger.LogInformation("New calculation saved to MongoDB");
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to save new calculation to MongoDB");
                    // Continue without failing the request
                }
            }
            
            _logger.LogInformation("Returning payment schedule with {Count} payments", result.PaymentSchedule.Count);

            return Ok(result);
        }

        /// <summary>
        /// Shpitzer (שפיצר) method - Fixed payment throughout the loan term
        /// Also known as the French method or standard amortization
        /// </summary>
        private void CalculateShpitzer(LoanCalculationResult result)
        {
            // Convert annual interest rate to monthly
            decimal monthlyInterestRate = result.InterestRate / 100 / 12;
            int numberOfPayments = result.TermInYears * 12;
            
            // Calculate fixed monthly payment using the formula:
            // PMT = P * r * (1+r)^n / ((1+r)^n - 1)
            // Where:
            // PMT = monthly payment
            // P = principal (loan amount)
            // r = monthly interest rate (annual rate / 12 / 100)
            // n = total number of payments (years * 12)
            
            double monthlyRate = (double)monthlyInterestRate;
            double loanAmount = (double)result.LoanAmount;
            
            // Using the formula for fixed payment calculation
            double numerator = monthlyRate * Math.Pow(1 + monthlyRate, numberOfPayments);
            double denominator = Math.Pow(1 + monthlyRate, numberOfPayments) - 1;
            double monthlyPayment = loanAmount * (numerator / denominator);
            
            result.MonthlyPayment = Math.Round((decimal)monthlyPayment, 2);

            // Generate payment schedule
            decimal remainingBalance = result.LoanAmount;
            
            for (int month = 1; month <= numberOfPayments; month++)
            {
                // Calculate interest for this period
                decimal interestPayment = Math.Round(remainingBalance * monthlyInterestRate, 2);
                
                // Calculate principal for this period (payment - interest)
                decimal principalPayment = Math.Round(result.MonthlyPayment - interestPayment, 2);
                
                // Adjust the final payment to ensure the balance reaches exactly zero
                if (month == numberOfPayments)
                {
                    principalPayment = remainingBalance;
                    result.MonthlyPayment = principalPayment + interestPayment;
                }

                // Update remaining balance
                remainingBalance -= principalPayment;
                
                // Ensure we don't get a negative balance due to rounding
                if (remainingBalance < 0) remainingBalance = 0;

                // Add this payment to the schedule
                result.PaymentSchedule.Add(new MonthlyPaymentDetail
                {
                    PaymentNumber = month,
                    Payment = Math.Round(principalPayment + interestPayment, 2),
                    Principal = principalPayment,
                    Interest = interestPayment,
                    RemainingBalance = remainingBalance
                });
            }
        }

        /// <summary>
        /// Fixed Principal (קרן קבועה) method - Equal principal payments with decreasing interest
        /// Also known as the straight-line method or constant amortization
        /// </summary>
        private void CalculateFixedPrincipal(LoanCalculationResult result)
        {
            // Convert annual interest rate to monthly
            decimal monthlyInterestRate = result.InterestRate / 100 / 12;
            int numberOfPayments = result.TermInYears * 12;
            
            // In fixed principal, the principal payment is the same each month
            decimal fixedPrincipal = Math.Round(result.LoanAmount / numberOfPayments, 2);
            decimal remainingBalance = result.LoanAmount;

            // First payment will be the highest (used as the "monthly payment" reference)
            decimal firstInterest = Math.Round(remainingBalance * monthlyInterestRate, 2);
            result.MonthlyPayment = fixedPrincipal + firstInterest; // Initial payment amount
            
            // Generate payment schedule
            for (int month = 1; month <= numberOfPayments; month++)
            {
                // Calculate interest for this period
                decimal interestPayment = Math.Round(remainingBalance * monthlyInterestRate, 2);
                
                // Principal is fixed for each payment
                decimal principalPayment = fixedPrincipal;
                
                // Adjust the final payment to ensure the balance reaches exactly zero
                if (month == numberOfPayments)
                {
                    principalPayment = remainingBalance;
                }

                // Calculate total payment for this period
                decimal totalPayment = principalPayment + interestPayment;
                
                // Update remaining balance
                remainingBalance -= principalPayment;
                
                // Ensure we don't get a negative balance due to rounding
                if (remainingBalance < 0) remainingBalance = 0;

                // Add this payment to the schedule
                result.PaymentSchedule.Add(new MonthlyPaymentDetail
                {
                    PaymentNumber = month,
                    Payment = Math.Round(totalPayment, 2),
                    Principal = principalPayment,
                    Interest = interestPayment,
                    RemainingBalance = remainingBalance
                });
            }
        }
    }
}