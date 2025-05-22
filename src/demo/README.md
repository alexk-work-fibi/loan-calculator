# Loan Calculator API

## Overview
The Loan Calculator API is a web service that calculates loan payments and stores the results in a MongoDB database. It also provides an endpoint to retrieve a list of all loan payment calculations.

## Features
- **Calculate Loan Payments**: Calculate monthly payments based on loan amount, interest rate, and term.
- **Store Results**: Save the calculation results in a MongoDB database.
- **Retrieve Payments**: Fetch a list of all stored loan payment calculations.

## Prerequisites
- .NET 8.0 SDK
- Docker and Docker Compose
- MongoDB (running locally or in Docker)

## Getting Started

### Running Locally
1. Clone the repository.
2. Navigate to the project directory.
3. Update the `appsettings.Development.json` file with your MongoDB connection string.
4. Run the application:
   ```bash
   dotnet run --project src/demo/demo.csproj
   ```
5. Access the API at `http://localhost:5000`.

### Running with Docker
1. Build and run the application using Docker Compose:
   ```bash
   docker-compose -f src/demo/docker-compose.yml up --build
   ```
2. Access the API at `http://localhost:8080`.

## API Endpoints

### Calculate Loan Payments
**POST** `/api/LoanCalculator/calculate`

#### Request Body
```json
{
  "LoanAmount": 10000,
  "InterestRate": 5.5,
  "TermInYears": 5
}
```

#### Response
```json
{
  "id": "unique-id",
  "loanAmount": 10000,
  "interestRate": 5.5,
  "termInYears": 5,
  "monthlyPayment": 190.96,
  "calculationDate": "2025-05-22T00:00:00Z"
}
```

### Retrieve Loan Payments
**GET** `/api/LoanCalculator/payments`

#### Response
```json
[
  {
    "id": "unique-id",
    "loanAmount": 10000,
    "interestRate": 5.5,
    "termInYears": 5,
    "monthlyPayment": 190.96,
    "calculationDate": "2025-05-22T00:00:00Z"
  }
]
```

## Project Structure
- `Controllers/LoanCalculatorController.cs`: Contains the API logic.
- `Program.cs`: Configures services and middleware.
- `Dockerfile`: Docker configuration for the API.
- `docker-compose.yml`: Docker Compose configuration for the API and MongoDB.

## License
This project is licensed under the MIT License.
