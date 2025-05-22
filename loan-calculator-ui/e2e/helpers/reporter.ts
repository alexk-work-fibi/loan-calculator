import { DisplayProcessor, SpecReporter, StacktraceOption } from "jasmine-spec-reporter";

class CustomProcessor extends DisplayProcessor {
  public override displayJasmineStarted(info: jasmine.JasmineStartedInfo, log: string): string {
    return `TypeScript ${log}`;
  }

  public override displaySpecErrorMessages(spec: jasmine.SpecResult, log: string): string {
    return this.formatError(log);
  }

  private formatError(error: string): string {
    // Handle Selenium timeout errors
    if (error.includes('TimeoutError')) {
      return `\n⚠️  Selenium Timeout Error - Check if:\n` +
        `   1. The application is running at http://localhost:4200\n` +
        `   2. The API is running at http://localhost:5062\n` +
        `   3. The element you're waiting for exists in the page\n` +
        `Original error: ${error}`;
    }
    
    // Handle API format errors
    if (error.includes('demo.Models.MonthlyPaymentDetail')) {
      return `\n⚠️  API Format Error - Check if:\n` +
        `   1. The API controller has [Produces("application/json")] attribute\n` +
        `   2. The request includes 'Accept: application/json' header\n` +
        `   3. Parameter names match the C# model (camelCase)\n` +
        `Original error: ${error}`;
    }

    return error;
  }
}

// Configure Jasmine reporter
jasmine.getEnv().clearReporters();
jasmine.getEnv().addReporter(
  new SpecReporter({
    spec: {
      displayStacktrace: StacktraceOption.NONE,
      displaySuccessful: true,
      displayFailed: true,
      displayPending: true,
      displayDuration: true
    },
    customProcessors: [CustomProcessor]
  })
);