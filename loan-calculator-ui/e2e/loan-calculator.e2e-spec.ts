import { Builder, By, WebDriver, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

interface APIResponse {
  data: {
    PaymentSchedule: Array<{
      PaymentNumber: number;
      Payment: number;
      Principal: number;
      Interest: number;
      RemainingBalance: number;
    }>;
  };
  contentType: string;
  status: number;
}

describe('Loan Calculator E2E Tests', () => {
  let driver: WebDriver;

  beforeAll(async () => {
    const options = new chrome.Options();
    options.addArguments('--headless=new');  // Use new headless mode
    options.addArguments('--no-sandbox');
    options.addArguments('--disable-dev-shm-usage');
    
    driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();
  });

  afterAll(async () => {
    await driver.quit();
  });

  beforeEach(async () => {
    await driver.get('http://localhost:4200');
  });

  it('should calculate loan payments correctly', async () => {
    // Input test values
    await driver.findElement(By.css('input[formControlName="loanAmount"]')).clear();
    await driver.findElement(By.css('input[formControlName="loanAmount"]')).sendKeys('100000');
    
    await driver.findElement(By.css('input[formControlName="interestRate"]')).clear();
    await driver.findElement(By.css('input[formControlName="interestRate"]')).sendKeys('5.5');
    
    await driver.findElement(By.css('input[formControlName="termInYears"]')).clear();
    await driver.findElement(By.css('input[formControlName="termInYears"]')).sendKeys('30');

    // Click calculate button
    const calculateButton = await driver.findElement(By.css('button[type="submit"]'));
    await calculateButton.click();

    // Wait for results to load
    await driver.wait(until.elementLocated(By.css('.payment-schedule-container')), 5000);

    // Verify loan summary is displayed
    const loanAmount = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(1) .value')).getText();
    const interestRate = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(2) .value')).getText();
    const termInYears = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(3) .value')).getText();
    const monthlyPayment = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(4) .value')).getText();

    console.log('Loan Summary Values:');
    console.log(`- Loan Amount: ${loanAmount}`);
    console.log(`- Interest Rate: ${interestRate}`);
    console.log(`- Term in Years: ${termInYears}`);
    console.log(`- Monthly Payment: ${monthlyPayment}`);

    // Verify the results are formatted correctly (not showing as "etail, demo.Models.MonthlyPaymentDetail")
    expect(loanAmount).toContain('$');
    expect(interestRate).toContain('%');
    expect(termInYears).toContain('years');
    expect(monthlyPayment).toContain('$');

    // Verify payment schedule table is displayed
    const paymentTable = await driver.findElement(By.css('table.payment-table'));
    expect(await paymentTable.isDisplayed()).toBe(true);

    // Verify first payment row has proper values
    const firstPaymentCells = await driver.findElements(By.css('table.payment-table tr:nth-child(2) td'));
    expect(firstPaymentCells.length).toBe(5); // PaymentNumber, Payment, Principal, Interest, RemainingBalance
    
    // Check the content of cells to ensure they're properly formatted numbers
    const paymentNumber = await firstPaymentCells[0].getText();
    const payment = await firstPaymentCells[1].getText();
    const principal = await firstPaymentCells[2].getText();
    const interest = await firstPaymentCells[3].getText();
    const remainingBalance = await firstPaymentCells[4].getText();
    
    console.log('First Payment Row:');
    console.log(`- Payment #: ${paymentNumber}`);
    console.log(`- Payment: ${payment}`);
    console.log(`- Principal: ${principal}`);
    console.log(`- Interest: ${interest}`);
    console.log(`- Remaining Balance: ${remainingBalance}`);
    
    expect(payment).toContain('$'); // Should be a currency value
    expect(principal).toContain('$');
    expect(interest).toContain('$');
    expect(remainingBalance).toContain('$');
    expect(payment).not.toContain('etail');
    expect(principal).not.toContain('etail');
    expect(interest).not.toContain('etail');
    expect(remainingBalance).not.toContain('etail');
    expect(payment).not.toContain('demo.Models.MonthlyPaymentDetail');
    expect(principal).not.toContain('demo.Models.MonthlyPaymentDetail');
  }, 30000);

  it('should show properly formatted data after direct API access', async () => {
    // Navigate to the page
    await driver.get('http://localhost:4200');

    // Fill out the form
    await driver.findElement(By.css('input[formControlName="loanAmount"]')).clear();
    await driver.findElement(By.css('input[formControlName="loanAmount"]')).sendKeys('100000');
    
    await driver.findElement(By.css('input[formControlName="interestRate"]')).clear();
    await driver.findElement(By.css('input[formControlName="interestRate"]')).sendKeys('5.5');
    
    await driver.findElement(By.css('input[formControlName="termInYears"]')).clear();
    await driver.findElement(By.css('input[formControlName="termInYears"]')).sendKeys('30');

    // Click calculate button
    const calculateButton = await driver.findElement(By.css('button[type="submit"]'));
    await calculateButton.click();

    // Wait for the payment schedule table to be displayed
    await driver.wait(until.elementLocated(By.css('.payment-schedule-container')), 5000);

    // Test that the API response headers are properly set
    const testApiResponse = async () => {
      // Execute JavaScript in the browser to make a fetch request
      const response = await driver.executeScript<APIResponse>(`
        return fetch('/api/loancalculator/payments?loanAmount=100000&interestRate=5.5&termInYears=30', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        })
        .then(response => {
          // Return both headers and body
          return response.json().then(data => {
            return {
              contentType: response.headers.get('Content-Type'),
              status: response.status,
              data: data
            };
          });
        })
        .catch(error => {
          return { error: error.message };
        });
      `) as APIResponse;

      // Log the response details for debugging
      console.log('API Response:', response);
      
      // Now verify the response
      expect(response.status).toBe(200);
      expect(response.contentType).toContain('application/json');
      expect(response.data).toBeDefined();
      expect(response.data.PaymentSchedule).toBeDefined();
      expect(response.data.PaymentSchedule.length).toBeGreaterThan(0);
      
      // Check that the first payment has proper structure
      const firstPayment = response.data.PaymentSchedule[0];
      expect(typeof firstPayment.Payment).toBe('number');
      expect(typeof firstPayment.Principal).toBe('number');
      expect(typeof firstPayment.Interest).toBe('number');
      expect(typeof firstPayment.RemainingBalance).toBe('number');
      
      // Verify no string representation issues
      expect(JSON.stringify(firstPayment)).not.toContain('etail');
      expect(JSON.stringify(firstPayment)).not.toContain('demo.Models.MonthlyPaymentDetail');
    };

    await testApiResponse();
  }, 30000);

  it('should handle different loan values correctly', async () => {
    await driver.get('http://localhost:4200');
    
    // Input different test values
    await driver.findElement(By.css('input[formControlName="loanAmount"]')).clear();
    await driver.findElement(By.css('input[formControlName="loanAmount"]')).sendKeys('250000');
    
    await driver.findElement(By.css('input[formControlName="interestRate"]')).clear();
    await driver.findElement(By.css('input[formControlName="interestRate"]')).sendKeys('3.75');
    
    await driver.findElement(By.css('input[formControlName="termInYears"]')).clear();
    await driver.findElement(By.css('input[formControlName="termInYears"]')).sendKeys('15');

    // Click calculate button
    const calculateButton = await driver.findElement(By.css('button[type="submit"]'));
    await calculateButton.click();

    // Wait for results to load
    await driver.wait(until.elementLocated(By.css('.payment-schedule-container')), 5000);

    // Verify loan summary is displayed with correct values
    const loanAmount = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(1) .value')).getText();
    const interestRate = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(2) .value')).getText();
    const termInYears = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(3) .value')).getText();
    const monthlyPayment = await driver.findElement(By.css('.loan-summary .summary-item:nth-child(4) .value')).getText();

    // Log the values for debugging
    console.log('New Loan Summary Values:');
    console.log(`- Loan Amount: ${loanAmount}`);
    console.log(`- Interest Rate: ${interestRate}`);
    console.log(`- Term in Years: ${termInYears}`);
    console.log(`- Monthly Payment: ${monthlyPayment}`);

    // Verify the values match our inputs
    expect(loanAmount).toContain('250,000');
    expect(interestRate).toContain('3.75');
    expect(termInYears).toContain('15');
    
    // Also check that we get a valid payment schedule
    const tableRows = await driver.findElements(By.css('table.payment-table tr'));
    expect(tableRows.length).toBeGreaterThan(1); // Header + at least one payment row
  }, 30000);
});
