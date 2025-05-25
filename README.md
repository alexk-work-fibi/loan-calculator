# Loan Calculator: Full-Stack Financial Calculation System

The Loan Calculator is a comprehensive full-stack application that provides precise loan payment calculations with persistent caching using MongoDB. It consists of a .NET Core backend API and an Angular frontend UI, offering a complete solution for loan amortization schedules, detailed payment breakdowns, and visualization of loan data.

## Key Features

- **Accurate Financial Calculations**: Precise calculation of monthly payments, total interest, and complete amortization schedules
- **MongoDB Caching**: Persistent storage of calculation results for improved performance and data retrieval
- **Interactive UI**: Modern Angular-based interface with form validation and responsive design
- **Data Visualization**: Visual representation of payment schedules and loan amortization using charts
- **Containerized Deployment**: Docker-based deployment for both API and UI components
- **Comprehensive Testing**: End-to-end testing with Selenium WebDriver and API validation scripts

## System Architecture

The Loan Calculator system follows a modern microservices architecture with the following components:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Angular UI     │────▶│  .NET Core API  │────▶│  MongoDB        │
│  (Frontend)     │◀────│  (Backend)      │◀────│  (Database)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Backend (.NET Core API)

The backend API is built with ASP.NET Core 8.0 and provides RESTful endpoints for loan calculations:

- **Calculation Engine**: Implements financial algorithms for loan amortization
- **MongoDB Integration**: Stores and retrieves calculation results
- **API Controllers**: Exposes endpoints for loan calculations and data retrieval
- **Input Validation**: Ensures data integrity and handles edge cases
- **Error Handling**: Comprehensive error management and logging

### Frontend (Angular UI)

The frontend is built with Angular 19 and provides an intuitive user interface:

- **Reactive Forms**: User-friendly input forms with validation
- **Material Design**: Modern UI components following Material Design principles
- **Data Visualization**: Interactive charts showing payment breakdowns
- **Responsive Layout**: Adapts to different screen sizes and devices
- **Error Handling**: User-friendly error messages and feedback

### Database (MongoDB)

MongoDB serves as the persistence layer:

- **Calculation Storage**: Stores loan calculation results
- **Query Optimization**: Efficient retrieval of historical calculations
- **Data Integrity**: Ensures consistency of financial data

## Repository Structure

```
/
├── docs/                           # Documentation assets
│   ├── infra.dot                   # Infrastructure diagram source
│   └── infra.svg                   # Infrastructure diagram
│
├── loan-calculator-ui/             # Angular frontend application
│   ├── e2e/                        # End-to-end tests
│   ├── src/                        # Source code
│   │   ├── app/                    # Angular application code
│   │   │   ├── components/         # UI components
│   │   │   │   ├── loan-calculator/  # Loan input form component
│   │   │   │   └── payment-schedule/ # Payment schedule display
│   │   │   ├── models/             # Data models
│   │   │   ├── pages/              # Page components
│   │   │   └── services/           # API services
│   │   └── environments/           # Environment configurations
│   ├── Dockerfile                  # Frontend container configuration
│   └── nginx.conf                  # Nginx web server configuration
│
├── src/                            # Backend source code
│   └── demo/                       # .NET Core API project
│       ├── Controllers/            # API controllers
│       │   └── LoanCalculatorController.cs  # Loan calculation endpoints
│       ├── Models/                 # Data models
│       │   └── LoanModels.cs       # Loan calculation models
│       ├── Properties/             # Project properties
│       ├── docker-compose.yml      # API container orchestration
│       ├── Dockerfile              # API container configuration
│       ├── Program.cs              # Application entry point
│       ├── test-loans.js           # JavaScript test script
│       └── test-loans.ps1          # PowerShell test script
│
├── docker-compose.yml              # Full-stack container orchestration
└── README.md                       # Project documentation
```

## Technical Details

### Backend API

The backend API is built with the following technologies:

- **Framework**: ASP.NET Core 8.0
- **Language**: C#
- **Database**: MongoDB 6.0
- **Container**: Docker
- **API Documentation**: Swagger/OpenAPI

#### API Endpoints

| Endpoint | Method | Description | Request Body | Response |
|----------|--------|-------------|-------------|----------|
| `/api/LoanCalculator/calculate` | POST | Calculate loan payments | Loan parameters | Calculation result with schedule |
| `/api/LoanCalculator/payments` | GET | Retrieve cached calculations | Query parameters | Calculation result with schedule |
| `/health` | GET | API health check | None | Health status |

#### Calculation Algorithm

The loan calculation uses the standard amortization formula:

```
M = P * [r(1+r)^n] / [(1+r)^n - 1]
```

Where:
- M = Monthly payment
- P = Principal (loan amount)
- r = Monthly interest rate (annual rate / 12 / 100)
- n = Total number of payments (years * 12)

### Frontend UI

The frontend UI is built with:

- **Framework**: Angular 19
- **UI Library**: Angular Material
- **Charts**: NGX-Charts
- **Styling**: SCSS
- **HTTP Client**: Angular HttpClient
- **State Management**: RxJS BehaviorSubject

#### Key Components

1. **LoanCalculatorComponent**: Handles user input and form submission
2. **PaymentScheduleComponent**: Displays payment schedule and charts
3. **LoanService**: Manages API communication and state
4. **HeaderComponent/FooterComponent**: UI structure components

### Data Flow

1. User enters loan parameters (amount, interest rate, term)
2. Angular UI validates input and sends request to API
3. API checks cache for existing calculation
4. If not found, API calculates loan details and stores in MongoDB
5. API returns calculation result to UI
6. UI displays payment schedule and visualizations

## Deployment

### Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB RAM minimum
- 1GB storage for MongoDB

### Deployment Options

#### Full Stack Deployment

```bash
# Clone the repository
git clone <repository-url>
cd loan-calculator

# Deploy the full stack
docker-compose up -d
```

#### Backend Only

```bash
# Deploy only the backend API and MongoDB
cd src/demo
docker-compose up -d
```

#### Frontend Only

```bash
# Deploy only the frontend UI
cd loan-calculator-ui
docker build -t loan-calculator-ui .
docker run -p 4200:80 loan-calculator-ui
```

### Environment Configuration

The application can be configured through environment variables:

- `ASPNETCORE_ENVIRONMENT`: Set to `Development` or `Production`
- `ConnectionStrings__MongoDb`: MongoDB connection string
- `API_URL`: Backend API URL for frontend configuration

## Testing

### API Testing

The API includes test scripts in both PowerShell and JavaScript:

```bash
# Run PowerShell tests
cd src/demo
./test-loans.ps1

# Run JavaScript tests
cd src/demo
node test-loans.js
```

### UI Testing

The UI includes end-to-end tests using Selenium WebDriver:

```bash
# Run E2E tests
cd loan-calculator-ui
npm run test:e2e
```

## Troubleshooting

### Common Issues

1. **MongoDB Connection Issues**
   - Check if MongoDB container is running: `docker ps`
   - Verify connection string in appsettings.json
   - Ensure MongoDB port 27017 is not in use

2. **API Port Conflicts**
   - Check if port 8080 is already in use
   - Modify docker-compose.yml to use a different port

3. **UI-API Communication Issues**
   - Ensure API URL is correctly configured in environment.ts
   - Check browser console for CORS errors
   - Verify that the API is returning proper JSON responses

### Debug Mode

1. Enable debug logging in the API:
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

2. Enable Angular debug mode:
   ```bash
   ng serve --configuration=development
   ```

## Future Enhancements

1. **Additional Loan Types**: Support for different loan types (balloon payments, adjustable rates)
2. **User Authentication**: Secure access with user accounts
3. **Payment Comparison**: Compare different loan scenarios side by side
4. **PDF Export**: Generate downloadable amortization schedules
5. **Mobile App**: Native mobile applications using the same API

## License

This project is licensed under the MIT License.