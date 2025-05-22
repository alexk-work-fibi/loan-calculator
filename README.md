# Loan Calculator API: Fast and Accurate Loan Payment Calculations with MongoDB Caching

The Loan Calculator API is a robust .NET-based web service that provides precise loan payment calculations with persistent caching using MongoDB. It offers comprehensive loan amortization schedules, detailed payment breakdowns, and supports various loan types from personal loans to mortgages.

The API calculates monthly payments, total interest, and generates complete amortization schedules while caching results for improved performance. It includes built-in validation, precise rounding logic, and handles edge cases to ensure accurate financial calculations. The service is containerized using Docker and includes comprehensive testing scripts in both PowerShell and JavaScript for validation across multiple loan scenarios.

## Repository Structure
```
src/demo/
├── Controllers/
│   └── LoanCalculatorController.cs   # Core API endpoints and calculation logic
├── Models/
│   └── LoanModels.cs                 # Data models for loan calculations and responses
├── Properties/
│   └── launchSettings.json           # Development environment configuration
├── docker-compose.yml                # Container orchestration for API and MongoDB
├── Dockerfile                        # Container build instructions
├── Program.cs                        # Application entry point and service configuration
├── test-loans.js                    # JavaScript-based API testing suite
└── test-loans.ps1                   # PowerShell-based API testing suite
```

## Usage Instructions
### Prerequisites
- .NET 8.0 SDK or Runtime
- Docker and Docker Compose
- MongoDB (if running without Docker)
- Node.js (for JavaScript test script)
- PowerShell 7+ (for PowerShell test script)

### Installation

#### Using Docker (Recommended)
```bash
# Clone the repository
git clone <repository-url>
cd src/demo

# Build and run with Docker Compose
docker-compose up --build
```

#### Manual Installation
```bash
# Clone the repository
git clone <repository-url>
cd src/demo

# Restore dependencies
dotnet restore

# Build the application
dotnet build

# Run the application
dotnet run
```

### Quick Start
1. Start the API:
```bash
docker-compose up
```

2. Calculate a loan:
```bash
curl -X POST http://localhost:8080/api/LoanCalculator/calculate \
-H "Content-Type: application/json" \
-d '{
  "loanAmount": 250000,
  "interestRate": 3.5,
  "termInYears": 30
}'
```

### More Detailed Examples
1. Calculate a car loan:
```bash
curl -X POST http://localhost:8080/api/LoanCalculator/calculate \
-H "Content-Type: application/json" \
-d '{
  "loanAmount": 25000,
  "interestRate": 4.25,
  "termInYears": 5
}'
```

2. Retrieve cached calculations:
```bash
curl "http://localhost:8080/api/LoanCalculator/payments?loanAmount=25000&interestRate=4.25&termInYears=5"
```

### Troubleshooting

#### Common Issues
1. MongoDB Connection Issues
```
Error: Cannot connect to MongoDB
Solution: 
- Check if MongoDB container is running: docker ps
- Verify connection string in appsettings.json
- Ensure MongoDB port 27017 is not in use
```

2. API Port Conflicts
```
Error: Port 8080 already in use
Solution:
- Stop any running services on port 8080
- Modify docker-compose.yml to use a different port
```

#### Debug Mode
1. Enable debug logging:
- Modify appsettings.Development.json:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Debug"
    }
  }
}
```

## Data Flow
The Loan Calculator API processes loan calculations through a series of steps, from request validation to MongoDB caching, ensuring accurate and efficient results.

```ascii
[Client] -> [API Controller] -> [Validation] -> [Calculation Engine]
                                                      |
[Response] <- [MongoDB Cache] <- [Result Storage] <----+
```

Key component interactions:
1. Client sends loan calculation request with amount, rate, and term
2. Controller validates input parameters
3. Calculation engine computes monthly payments and amortization schedule
4. Results are stored in MongoDB cache
5. Cached results are checked for subsequent identical requests
6. Response includes full payment schedule and loan summary
7. Monitoring and logging track all API operations

## Infrastructure

![Infrastructure diagram](./docs/infra.svg)

### MongoDB
- Type: Database
- Image: mongo:6.0
- Port: 27017
- Volume: mongo-data for persistence

### API Service
- Type: Web API
- Runtime: ASP.NET Core 8.0
- Port: 8080:80
- Environment: Development
- Dependencies: MongoDB

## Deployment
### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 1GB storage for MongoDB

### Deployment Steps
1. Configure environment:
```bash
cp appsettings.Example.json appsettings.json
# Edit MongoDB connection string if needed
```

2. Deploy services:
```bash
docker-compose up -d
```

3. Verify deployment:
```bash
curl http://localhost:8080/health
```

4. Monitor logs:
```bash
docker-compose logs -f
```