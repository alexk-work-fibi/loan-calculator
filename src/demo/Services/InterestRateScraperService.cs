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
            const string url = "https://www.boi.org.il/en/information-and-service-to-the-public/interest-rates-and-early-repayment-fees/interest-rate-comparisons-housing-loans/";
            return await ScrapeRatesAsync(url, "mortgage");
        }

        public async Task<InterestRateResponse> GetLoanRatesAsync()
        {
            const string url = "https://www.boi.org.il/en/information-and-service-to-the-public/interest-rates-and-early-repayment-fees/effective-cost-of-unindexed-shekel-loans/";
            return await ScrapeRatesAsync(url, "loan");
        }

        private async Task<InterestRateResponse> ScrapeRatesAsync(string url, string rateType)
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
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

                // Extract period (month/year) information
                var periodNode = htmlDoc.DocumentNode.SelectSingleNode("//div[contains(@class, 'date-display-single')]");
                string period = periodNode?.InnerText.Trim() ?? DateTime.Now.ToString("MMMM yyyy");

                // Find the table with interest rates
                var table = htmlDoc.DocumentNode.SelectSingleNode("//table[contains(@class, 'views-table')]");
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
                    Details = new List<RateDetail>()
                };

                // Extract rates from table
                var rows = table.SelectNodes(".//tbody/tr");
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
                        }
                    }

                    // Calculate average rate
                    if (count > 0)
                    {
                        result.AverageRate = Math.Round(sum / count, 2);
                    }
                    else
                    {
                        result.AverageRate = rateType == "mortgage" ? 3.5 : 5.0;
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
            double defaultRate = rateType == "mortgage" ? 3.5 : 5.0;
            
            return new InterestRateResponse
            {
                AverageRate = defaultRate,
                Period = DateTime.Now.ToString("MMMM yyyy"),
                LastUpdated = DateTime.Now,
                Source = "Default values (BOI website scraping failed)",
                Details = new List<RateDetail>
                {
                    new RateDetail { BankName = "Default", Rate = defaultRate }
                }
            };
        }
    }
}