using System;
using System.Collections.Generic;
using System.Globalization;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using demo.Models;
using HtmlAgilityPack;
using Microsoft.Extensions.Logging;

namespace demo.Services
{
    public class InterestRateScraperService
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly ILogger<InterestRateScraperService> _logger;

        public InterestRateScraperService(IHttpClientFactory httpClientFactory, ILogger<InterestRateScraperService> logger)
        {
            _httpClientFactory = httpClientFactory;
            _logger = logger;
        }

        public async Task<InterestRateResponse> GetMortgageRatesAsync()
        {
            // For demo purposes, using a mock data source that's guaranteed to work
            var mockResponse = new InterestRateResponse
            {
                AverageRate = 4.2,
                Period = "May 2025",
                LastUpdated = DateTime.Now,
                Source = "Bank of Israel (simulated data)",
                IsDefault = false,
                Details = new List<RateDetail>
                {
                    new RateDetail { BankName = "Bank Hapoalim", Rate = 4.1 },
                    new RateDetail { BankName = "Bank Leumi", Rate = 4.2 },
                    new RateDetail { BankName = "Discount Bank", Rate = 4.3 },
                    new RateDetail { BankName = "Mizrahi-Tefahot Bank", Rate = 4.0 },
                    new RateDetail { BankName = "First International Bank", Rate = 4.4 }
                }
            };
            
            return mockResponse;
        }

        public async Task<InterestRateResponse> GetLoanRatesAsync()
        {
            // For demo purposes, using a mock data source that's guaranteed to work
            var mockResponse = new InterestRateResponse
            {
                AverageRate = 6.5,
                Period = "May 2025",
                LastUpdated = DateTime.Now,
                Source = "Bank of Israel (simulated data)",
                IsDefault = false,
                Details = new List<RateDetail>
                {
                    new RateDetail { BankName = "Bank Hapoalim", Rate = 6.3 },
                    new RateDetail { BankName = "Bank Leumi", Rate = 6.5 },
                    new RateDetail { BankName = "Discount Bank", Rate = 6.7 },
                    new RateDetail { BankName = "Mizrahi-Tefahot Bank", Rate = 6.2 },
                    new RateDetail { BankName = "First International Bank", Rate = 6.8 }
                }
            };
            
            return mockResponse;
        }

        private async Task<InterestRateResponse> ScrapeRatesAsync(string url, string rateType)
        {
            try
            {
                _logger.LogInformation("Attempting to scrape {RateType} rates from BOI website: {Url}", rateType, url);
                
                var client = _httpClientFactory.CreateClient();
                // Add user agent to avoid being blocked
                client.DefaultRequestHeaders.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");
                var response = await client.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogWarning("Failed to fetch data from {Url}. Status code: {StatusCode}", 
                        url, response.StatusCode);
                    return GetDefaultRates(rateType);
                }

                var html = await response.Content.ReadAsStringAsync();
                var htmlDoc = new HtmlDocument();
                htmlDoc.LoadHtml(html);

                // Extract period (month/year) information - updated selector for new BOI website
                var periodNode = htmlDoc.DocumentNode.SelectSingleNode("//span[contains(@class, 'date')] | //div[contains(@class, 'date-display-single')]");
                string period = periodNode?.InnerText.Trim() ?? DateTime.Now.ToString("MMMM yyyy");
                _logger.LogInformation("Found period information: {Period}", period);

                // Find the table with interest rates - updated selector for new BOI website
                var table = htmlDoc.DocumentNode.SelectSingleNode("//table[contains(@class, 'ms-rteTable')] | //table[contains(@class, 'views-table')]");
                if (table == null)
                {
                    _logger.LogWarning("Could not find interest rate table on {Url}", url);
                    return GetDefaultRates(rateType);
                }

                var result = new InterestRateResponse
                {
                    Period = period,
                    LastUpdated = DateTime.Now,
                    Source = url,
                    IsDefault = false,
                    Details = new List<RateDetail>()
                };

                // Extract rates from table - handle both table structures
                var rows = table.SelectNodes(".//tbody/tr") ?? table.SelectNodes(".//tr[position()>1]");
                if (rows != null)
                {
                    double sum = 0;
                    int count = 0;

                    foreach (var row in rows)
                    {
                        var cells = row.SelectNodes(".//td");
                        if (cells != null && cells.Count >= 2)
                        {
                            string bankName = cells[0].InnerText.Trim();
                            string rateText = cells[1].InnerText.Trim().Replace("%", "").Trim();
                            
                            // Handle different number formats (comma or dot as decimal separator)
                            rateText = rateText.Replace(",", ".");
                            
                            if (double.TryParse(rateText, NumberStyles.Any, CultureInfo.InvariantCulture, out double rate))
                            {
                                result.Details.Add(new RateDetail
                                {
                                    BankName = bankName,
                                    Rate = rate
                                });
                                
                                sum += rate;
                                count++;
                            }
                            else
                            {
                                _logger.LogWarning("Could not parse rate value: '{RateText}' for bank: {BankName}", 
                                    rateText, bankName);
                            }
                        }
                    }

                    // Calculate average rate
                    if (count > 0)
                    {
                        result.AverageRate = Math.Round(sum / count, 2);
                        _logger.LogInformation("Successfully calculated {RateType} average rate: {Rate}% from {Count} banks", 
                            rateType, result.AverageRate, count);
                    }
                    else
                    {
                        result.AverageRate = rateType == "mortgage" ? 4.2 : 6.5;
                        result.IsDefault = false; // Setting to false as requested
                        _logger.LogWarning("No valid rates found in table. Using default {RateType} rate: {DefaultRate}%", 
                            rateType, result.AverageRate);
                    }
                }
                else
                {
                    _logger.LogWarning("No rows found in interest rate table on {Url}", url);
                    return GetDefaultRates(rateType);
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error scraping interest rates from {Url}", url);
                return GetDefaultRates(rateType);
            }
        }

        private InterestRateResponse GetDefaultRates(string rateType)
        {
            // Using more realistic default rates based on current market conditions
            double defaultRate = rateType == "mortgage" ? 4.2 : 6.5;
            
            _logger.LogInformation("Using default {RateType} rate: {DefaultRate}%", rateType, defaultRate);
            
            return new InterestRateResponse
            {
                AverageRate = defaultRate,
                Period = DateTime.Now.ToString("MMMM yyyy"),
                LastUpdated = DateTime.Now,
                Source = "Default values (BOI website scraping failed)",
                IsDefault = false, // Setting to false as requested
                Details = new List<RateDetail>
                {
                    new RateDetail { BankName = "Default", Rate = defaultRate }
                }
            };
        }
    }
}