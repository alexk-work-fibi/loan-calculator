using System;
using System.Collections.Generic;

namespace demo.Models
{
    public class InterestRateResponse
    {
        public double AverageRate { get; set; }
        public string Period { get; set; }
        public DateTime LastUpdated { get; set; }
        public string Source { get; set; }
        public bool IsDefault { get; set; } = false;
        public List<RateDetail> Details { get; set; } = new List<RateDetail>();
    }

    public class RateDetail
    {
        public string BankName { get; set; }
        public double Rate { get; set; }
    }
}