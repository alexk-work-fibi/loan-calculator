#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting E2E test process...${NC}"

# Check if API is running
echo -e "${YELLOW}Checking if API is running...${NC}"
if ! curl -s -f -H "Accept: application/json" -o /dev/null "http://localhost:5062/api/LoanCalculator/payments?loanAmount=1000&interestRate=1&termInYears=1"; then
    echo -e "${RED}Error: API is not running at http://localhost:5062${NC}"
    echo -e "${YELLOW}Please start the API server before running tests.${NC}"
    echo -e "  Run: cd /Users/alexk/Projects/demo/src/demo && dotnet run"
    exit 1
fi

# Check if Angular app is running
echo -e "${YELLOW}Checking if Angular app is running...${NC}"
if ! curl -s -f -o /dev/null "http://localhost:4200"; then
    echo -e "${RED}Error: Angular app is not running at http://localhost:4200${NC}"
    echo -e "${YELLOW}Please start the Angular app before running tests.${NC}"
    echo -e "  Run: cd /Users/alexk/Projects/demo/loan-calculator-ui && npm start"
    exit 1
fi

echo -e "${YELLOW}Running API health check...${NC}"
RESPONSE=$(curl -s -H "Accept: application/json" "http://localhost:5062/api/LoanCalculator/payments?loanAmount=100000&interestRate=5.5&termInYears=30")

# Verify if the API response contains MonthlyPaymentDetail strings (indicating improper serialization)
if echo "$RESPONSE" | grep -q "etail, demo.Models.MonthlyPaymentDetail"; then
    echo -e "${RED}API response contains improper serialization format!${NC}"
    echo "$RESPONSE" | jq .
    exit 1
else
    echo -e "${GREEN}API response format looks good!${NC}"
    echo "$RESPONSE" | jq .
fi

echo -e "\n${YELLOW}Running Angular E2E tests...${NC}"
cd /Users/alexk/Projects/demo/loan-calculator-ui
npm run e2e

if [ $? -eq 0 ]; then
    echo -e "${GREEN}All tests passed successfully!${NC}"
else
    echo -e "${RED}Some tests failed. Check the output above for details.${NC}"
    exit 1
fi
