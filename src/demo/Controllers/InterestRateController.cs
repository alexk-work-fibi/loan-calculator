using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Threading.Tasks;
using demo.Services;
using demo.Models;

namespace demo.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class InterestRateController : ControllerBase
    {
        private readonly ILogger<InterestRateController> _logger;
        private readonly InterestRateScraperService _scraperService;
        private readonly IMemoryCache _memoryCache;
        
        private const string MORTGAGE_CACHE_KEY = "BOI_MORTGAGE_RATES";
        private const string LOAN_CACHE_KEY = "BOI_LOAN_RATES";
        private const int CACHE_MINUTES = 1440; // 24 hours

        public InterestRateController(
            ILogger<InterestRateController> logger,
            InterestRateScraperService scraperService,
            IMemoryCache memoryCache)
        {
            _logger = logger;
            _scraperService = scraperService;
            _memoryCache = memoryCache;
        }

        [HttpGet("mortgage")]
        public async Task<IActionResult> GetMortgageRates()
        {
            try
            {
                // Try to get from cache first
                if (_memoryCache.TryGetValue(MORTGAGE_CACHE_KEY, out InterestRateResponse cachedRates))
                {
                    _logger.LogInformation("Returning cached mortgage rates from {Period}", cachedRates.Period);
                    return Ok(cachedRates);
                }

                // If not in cache, fetch from BOI website
                var rates = await _scraperService.GetMortgageRatesAsync();
                
                // Cache the result
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_MINUTES));
                
                _memoryCache.Set(MORTGAGE_CACHE_KEY, rates, cacheOptions);
                
                return Ok(rates);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching mortgage rates");
                return StatusCode(500, "Failed to retrieve current mortgage rates");
            }
        }

        [HttpGet("loan")]
        public async Task<IActionResult> GetLoanRates()
        {
            try
            {
                // Try to get from cache first
                if (_memoryCache.TryGetValue(LOAN_CACHE_KEY, out InterestRateResponse cachedRates))
                {
                    _logger.LogInformation("Returning cached loan rates from {Period}", cachedRates.Period);
                    return Ok(cachedRates);
                }

                // If not in cache, fetch from BOI website
                var rates = await _scraperService.GetLoanRatesAsync();
                
                // Cache the result
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_MINUTES));
                
                _memoryCache.Set(LOAN_CACHE_KEY, rates, cacheOptions);
                
                return Ok(rates);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching loan rates");
                return StatusCode(500, "Failed to retrieve current loan rates");
            }
        }
        
        [HttpGet("average/mortgage")]
        public async Task<IActionResult> GetAverageMortgageRate()
        {
            try
            {
                var rates = await GetCachedMortgageRates();
                _logger.LogInformation("Returning average mortgage rate: {Rate}% (IsDefault: {IsDefault})", 
                    rates.AverageRate, rates.IsDefault);
                return Ok(rates.AverageRate);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching average mortgage rate");
                return StatusCode(500, "Failed to retrieve current average mortgage rate");
            }
        }
        
        [HttpGet("average/loan")]
        public async Task<IActionResult> GetAverageLoanRate()
        {
            try
            {
                var rates = await GetCachedLoanRates();
                _logger.LogInformation("Returning average loan rate: {Rate}% (IsDefault: {IsDefault})", 
                    rates.AverageRate, rates.IsDefault);
                return Ok(rates.AverageRate);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching average loan rate");
                return StatusCode(500, "Failed to retrieve current average loan rate");
            }
        }
        
        private async Task<InterestRateResponse> GetCachedMortgageRates()
        {
            if (_memoryCache.TryGetValue(MORTGAGE_CACHE_KEY, out InterestRateResponse cachedRates))
            {
                return cachedRates;
            }
            
            var rates = await _scraperService.GetMortgageRatesAsync();
            
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_MINUTES));
            
            _memoryCache.Set(MORTGAGE_CACHE_KEY, rates, cacheOptions);
            
            return rates;
        }
        
        private async Task<InterestRateResponse> GetCachedLoanRates()
        {
            if (_memoryCache.TryGetValue(LOAN_CACHE_KEY, out InterestRateResponse cachedRates))
            {
                return cachedRates;
            }
            
            var rates = await _scraperService.GetLoanRatesAsync();
            
            var cacheOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_MINUTES));
            
            _memoryCache.Set(LOAN_CACHE_KEY, rates, cacheOptions);
            
            return rates;
        }
    }
}