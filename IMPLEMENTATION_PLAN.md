# Polish B2B Tax Tracking & Management System - Implementation Plan

## Executive Summary

This document outlines a comprehensive plan for building a tax tracking and management system tailored for B2B operations in Poland. The system will handle VAT compliance, CIT reporting, multi-currency transactions with real-time PLN conversion, and provide a standalone API for currency operations.

**Key Capabilities:**
- Full Polish VAT & CIT compliance for B2B operations
- Multi-currency support with NBP exchange rate integration
- Automated tax calculations and reporting (JPK_VAT, JPK_CIT, SAF-T)
- KSeF e-invoicing system integration (ready for 2026 mandate)
- Standalone currency conversion API
- Real-time exchange rate tracking and historical data
- Audit trails and compliance reporting

---

## 1. Polish Tax Requirements Analysis

### 1.1 VAT (Value Added Tax) Requirements

**Rates & Registration:**
- Standard rate: 23%
- Reduced rates: 8% (hotels, restaurants, food, newspapers), 5% (books, basic foodstuffs)
- Registration threshold: PLN 200,000 annual turnover (for Polish businesses)
- Non-resident businesses: No threshold, immediate registration required

**B2B-Specific Mechanisms:**

1. **Reverse Charge Mechanism**
   - Buyer accounts for VAT in B2B transactions
   - System must identify and flag reverse charge scenarios

2. **Split Payment Mechanism (Mechanizm Podzielonej Płatności - MPP)**
   - Mandatory for B2B transactions > PLN 15,000
   - Covers selected goods and services
   - VAT amount paid to separate tax account

3. **White List Verification**
   - Verify supplier bank accounts against government white list
   - Transactions > PLN 15,000 to non-listed accounts:
     - Not tax-deductible
     - Joint liability for supplier's VAT obligations

**Filing Requirements:**
- Monthly VAT returns via JPK_VAT (SAF-T format)
- Due: 25th of following month
- Quarterly option for small taxpayers (< EUR 2M revenue)
- XML format submission to tax authorities

### 1.2 KSeF E-Invoicing System

**Mandatory Timeline:**
- **1 February 2026**: Large taxpayers must use KSeF for B2B
- **1 April 2026**: Medium and small taxpayers follow

**Technical Requirements:**
- Structured invoice format (XML)
- Real-time invoice validation and registration
- System integration with KSeF API
- Invoice numbering managed by KSeF
- Support for foreign currency invoices with PLN VAT amounts

### 1.3 CIT (Corporate Income Tax) Requirements

**Rates:**
- Standard: 19%
- Small taxpayers: 9% (revenue < EUR 2M equivalent in PLN)

**Reporting (JPK_CIT):**
- **From 1 January 2025**: Large companies (> EUR 50M revenue) must:
  - Maintain digital accounting books
  - Submit structured XML format (JPK_CIT/JPK_KR_PD)
  - First submission: March 2026 for 2025 tax year
- **From 2026**: Additional fields required (contractor IDs, KSeF invoice numbers)

**Tax-Deductible Costs:**
- B2B contractor benefits can be tax-deductible
- Must meet Article 15 CIT Act criteria
- Proper documentation required

**Minimum Income Tax:**
- Applies to entities with losses or income ≤ 2% of revenue
- First payment in 2025 (for 2024 tax year)

### 1.4 Currency Conversion Requirements

**Critical Rules for Foreign Currency Transactions:**

1. **Invoice Requirements:**
   - Invoices can be in any currency
   - **VAT MUST be shown in PLN** (mandatory)
   - Failure to show PLN VAT invalidates invoice

2. **Exchange Rate Sources:**
   - **Primary**: NBP (National Bank of Poland) average rate
   - **Alternative**: ECB (European Central Bank) rate
   - Rate date: Last working day before invoice date

3. **Conversion Timing:**
   - Standard: Last working day before invoice issuance
   - Early invoices: Use rate from last working day before issuance

4. **Accounting Treatment:**
   - Use actual exchange rate when available
   - Fallback: NBP rate from last business day before transaction
   - Valuation methods: FIFO or LIFO (fixed for tax year)

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Web UI      │  │  Mobile App  │  │  External Integrations│  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Authentication & Authorization (JWT/OAuth2)               │ │
│  │  Rate Limiting & Throttling                                │ │
│  │  Request Validation & Logging                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌──────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   Tax Core   │   │  Currency API    │   │  Reporting API   │
│   Service    │   │    Service       │   │    Service       │
│              │   │                  │   │                  │
│ • VAT Calc   │   │ • Rate Fetching  │   │ • JPK_VAT Gen   │
│ • CIT Calc   │   │ • Conversion     │   │ • JPK_CIT Gen   │
│ • Invoice    │   │ • Historical     │   │ • KSeF Export   │
│   Processing │   │   Rates          │   │ • Analytics     │
│ • Compliance │   │ • Multi-currency │   │                  │
│   Rules      │   │   Support        │   │                  │
└──────────────┘   └──────────────────┘   └──────────────────┘
        │                   │                      │
        └───────────────────┼──────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                             │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────┐    │
│  │ NBP API     │  │ KSeF API     │  │ White List API      │    │
│  │ Integration │  │ Integration  │  │ (Bank Verification) │    │
│  └─────────────┘  └──────────────┘  └─────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Transactions │  │  Exchange    │  │   Tax Reports        │  │
│  │   Database   │  │  Rates Cache │  │   & Archives         │  │
│  │ (PostgreSQL) │  │   (Redis)    │  │  (Object Storage)    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Core Principles

1. **Microservices Architecture**: Loosely coupled services for scalability
2. **API-First Design**: All functionality exposed via REST/GraphQL APIs
3. **Event-Driven**: Asynchronous processing for tax calculations and reporting
4. **Immutable Audit Trail**: All transactions and tax calculations permanently recorded
5. **Compliance by Design**: Built-in validation for Polish tax regulations
6. **High Availability**: 99.9% uptime SLA with redundancy and failover

---

## 3. Core Features & Modules

### 3.1 Transaction Management Module

**Capabilities:**
- Record all taxable operations (sales, purchases, expenses)
- Multi-currency transaction support
- Automatic PLN conversion using NBP rates
- Transaction categorization (goods, services, imports, exports)
- Reverse charge detection and flagging
- Split payment mechanism tracking

**Data Captured per Transaction:**
- Transaction ID (UUID)
- Date & time (with timezone)
- Type (sale, purchase, expense, etc.)
- Original currency & amount
- PLN equivalent (with exchange rate used)
- VAT rate & amount (in PLN)
- Counterparty details (NIP, name, address)
- Invoice reference
- Payment method & status
- Bank account verification status (white list check)
- Tags & categories
- Notes & attachments

### 3.2 VAT Calculation Engine

**Features:**
- Automatic rate determination (23%, 8%, 5%, 0%, exempt)
- Reverse charge mechanism application
- EU intra-community transactions handling
- VAT on imports/exports
- Partial VAT deduction calculations
- MPP (Split Payment) flagging for transactions > PLN 15,000

**Validation Rules:**
- Verify VAT amounts are in PLN
- Validate NIP numbers
- Check white list for large transactions
- Ensure proper documentation for exemptions

### 3.3 CIT Calculation Module

**Capabilities:**
- Tax-deductible cost identification
- Revenue recognition
- Profit/loss calculation
- Minimum income tax calculation
- Small taxpayer eligibility (9% vs 19% rate)
- Quarterly advance payment calculations

**Integrations:**
- Links to transaction records
- Asset depreciation tracking
- B2B contractor benefit cost tracking

### 3.4 Currency Management System

**Core Functions:**
- **NBP Rate Fetching**: Daily automatic retrieval from NBP API
- **Historical Rate Storage**: Complete history for audit purposes
- **Multi-Currency Support**: All major currencies (USD, EUR, GBP, etc.)
- **Real-Time Conversion**: On-demand conversion with date-specific rates
- **Rate Source Flexibility**: NBP (primary) or ECB (alternative)

**Exchange Rate Data Model:**
```javascript
{
  "rate_id": "uuid",
  "currency_code": "USD",
  "base_currency": "PLN",
  "rate_date": "2025-01-15",
  "rate_source": "NBP", // or "ECB"
  "table_type": "A", // NBP table A/B/C
  "mid_rate": 4.0234,
  "bid_rate": 4.0100, // for table C
  "ask_rate": 4.0368, // for table C
  "effective_from": "2025-01-15T00:00:00Z",
  "effective_to": "2025-01-16T00:00:00Z",
  "fetched_at": "2025-01-15T08:30:00Z"
}
```

### 3.5 Invoice Management

**Features:**
- Multi-currency invoice creation
- Automatic PLN VAT calculation
- KSeF-compatible format generation
- Invoice numbering (pre-KSeF and KSeF)
- Early invoice handling (special exchange rate rules)
- Credit/debit note support
- Invoice status tracking

**Validation:**
- Mandatory PLN VAT amount
- Correct exchange rate application
- Required fields per Polish regulations
- Counterparty data completeness

### 3.6 Reporting & Compliance

**Polish Tax Reports:**

1. **JPK_VAT (SAF-T VAT)**
   - Monthly/quarterly generation
   - XML format (JPK schema)
   - Sales and purchase registers
   - VAT summary
   - Ready for upload to tax authority portal

2. **JPK_CIT (SAF-T CIT)**
   - Annual generation (large companies from 2025)
   - JPK_KR_PD structure
   - Digital accounting books
   - Contractor ID and KSeF references (from 2026)

3. **KSeF Export**
   - E-invoice generation
   - XML structured format
   - Real-time validation
   - Submission tracking

4. **Analytics & Dashboards**
   - Tax liability overview
   - VAT collections vs. payments
   - Currency exposure analysis
   - Compliance status monitoring
   - Audit-ready reports

### 3.7 White List Integration

**Bank Account Verification:**
- Integration with Polish tax authority white list API
- Real-time account verification before payment
- Transaction flagging for non-white-list accounts
- Risk warnings and alerts
- Historical verification logs

---

## 4. Currency Conversion API - Standalone Service

### 4.1 API Overview

A separate, independently deployable microservice providing currency conversion capabilities with NBP integration.

**Use Cases:**
- Internal use by tax system
- External integrations (e-commerce, invoicing systems)
- Third-party applications
- Accounting software plugins

### 4.2 API Endpoints

#### 4.2.1 Get Current Exchange Rate

```
GET /api/v1/rates/current/{currency}
```

**Parameters:**
- `currency` (required): ISO 4217 code (e.g., USD, EUR, GBP)
- `base` (optional): Base currency (default: PLN)
- `table` (optional): NBP table type (A, B, C) - default: A
- `source` (optional): NBP or ECB - default: NBP

**Response:**
```json
{
  "currency": "USD",
  "base": "PLN",
  "rate": 4.0234,
  "rate_date": "2025-01-15",
  "source": "NBP",
  "table": "A",
  "effective_from": "2025-01-15T00:00:00Z",
  "effective_to": "2025-01-16T00:00:00Z"
}
```

#### 4.2.2 Get Historical Exchange Rate

```
GET /api/v1/rates/historical/{currency}
```

**Parameters:**
- `currency` (required): ISO 4217 code
- `date` (required): YYYY-MM-DD format
- `base` (optional): Base currency (default: PLN)
- `table` (optional): NBP table type
- `source` (optional): NBP or ECB

**Response:**
```json
{
  "currency": "EUR",
  "base": "PLN",
  "rate": 4.3215,
  "rate_date": "2024-12-15",
  "source": "NBP",
  "table": "A"
}
```

#### 4.2.3 Convert Amount

```
POST /api/v1/convert
```

**Request Body:**
```json
{
  "amount": 1000.00,
  "from_currency": "EUR",
  "to_currency": "PLN",
  "transaction_date": "2025-01-15",
  "use_rate_before_date": true,
  "source": "NBP"
}
```

**Response:**
```json
{
  "original_amount": 1000.00,
  "original_currency": "EUR",
  "converted_amount": 4321.50,
  "converted_currency": "PLN",
  "exchange_rate": 4.3215,
  "rate_date": "2025-01-14",
  "rate_source": "NBP",
  "transaction_date": "2025-01-15",
  "conversion_timestamp": "2025-01-15T10:30:00Z"
}
```

#### 4.2.4 Batch Conversion

```
POST /api/v1/convert/batch
```

**Request Body:**
```json
{
  "conversions": [
    {
      "id": "tx-001",
      "amount": 500.00,
      "from_currency": "USD",
      "to_currency": "PLN",
      "transaction_date": "2025-01-15"
    },
    {
      "id": "tx-002",
      "amount": 750.00,
      "from_currency": "GBP",
      "to_currency": "PLN",
      "transaction_date": "2025-01-14"
    }
  ],
  "source": "NBP"
}
```

#### 4.2.5 Get Multiple Rates (Time Series)

```
GET /api/v1/rates/series/{currency}
```

**Parameters:**
- `currency` (required): ISO 4217 code
- `start_date` (required): YYYY-MM-DD
- `end_date` (required): YYYY-MM-DD
- `base` (optional): Base currency (default: PLN)

**Response:**
```json
{
  "currency": "USD",
  "base": "PLN",
  "rates": [
    {
      "date": "2025-01-10",
      "rate": 4.0156
    },
    {
      "date": "2025-01-11",
      "rate": 4.0189
    }
  ],
  "count": 2
}
```

#### 4.2.6 Get Supported Currencies

```
GET /api/v1/currencies
```

**Response:**
```json
{
  "currencies": [
    {
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "available_in_tables": ["A", "C"]
    },
    {
      "code": "EUR",
      "name": "Euro",
      "symbol": "€",
      "available_in_tables": ["A", "C"]
    }
  ]
}
```

#### 4.2.7 Health & Status

```
GET /api/v1/health
```

**Response:**
```json
{
  "status": "healthy",
  "nbp_api_status": "available",
  "last_rate_update": "2025-01-15T08:30:00Z",
  "cache_status": "healthy",
  "database_status": "healthy"
}
```

### 4.3 API Features

**Authentication:**
- API Key authentication
- JWT token support
- Rate limiting per client
- Usage tracking and quotas

**Caching Strategy:**
- Redis cache for current day rates (TTL: 24 hours)
- Historical rates cached indefinitely
- Cache warming for common currencies
- Fallback to database on cache miss

**Error Handling:**
```json
{
  "error": {
    "code": "RATE_NOT_FOUND",
    "message": "Exchange rate not available for the specified date",
    "details": {
      "currency": "USD",
      "date": "2024-12-25",
      "reason": "NBP does not publish rates on holidays"
    }
  }
}
```

**Performance:**
- Response time: < 100ms (cached)
- Response time: < 500ms (database)
- Throughput: 1000 requests/second
- 99.9% availability SLA

---

## 5. Technology Stack Recommendations

### 5.1 Backend

**Primary Language: Node.js (TypeScript)**
- Rationale: Excellent async I/O, rich ecosystem, strong typing with TypeScript
- Alternative: Python (FastAPI) for data-heavy processing

**Framework:**
- **Express.js** or **NestJS** (recommended for microservices)
- NestJS provides built-in DI, decorators, better structure for large apps

**Database:**
- **PostgreSQL 15+** (primary data store)
  - ACID compliance for financial data
  - JSON support for flexible documents
  - Strong audit log capabilities
  - Excellent performance for complex queries

**Caching:**
- **Redis 7+**
  - Exchange rate caching
  - Session management
  - Rate limiting counters

**Message Queue:**
- **RabbitMQ** or **Apache Kafka**
  - Asynchronous tax calculations
  - Report generation
  - Event sourcing for audit trails

### 5.2 Frontend

**Web Application:**
- **React 18+** with **TypeScript**
- **Next.js 14+** for SSR and SEO
- **TailwindCSS** for styling
- **Shadcn/ui** or **Ant Design** for component library

**State Management:**
- **React Query (TanStack Query)** for server state
- **Zustand** or **Redux Toolkit** for client state

### 5.3 DevOps & Infrastructure

**Containerization:**
- **Docker** for all services
- **Docker Compose** for local development

**Orchestration:**
- **Kubernetes** (production)
- **Helm** charts for deployment

**CI/CD:**
- **GitHub Actions** or **GitLab CI**
- Automated testing pipeline
- Automated deployment to staging/production

**Monitoring:**
- **Prometheus** + **Grafana** for metrics
- **ELK Stack** (Elasticsearch, Logstash, Kibana) for logs
- **Sentry** for error tracking

**Cloud Provider:**
- **AWS**, **Google Cloud**, or **Azure**
- Managed PostgreSQL (RDS, Cloud SQL, Azure Database)
- Object storage for reports (S3, GCS, Blob Storage)

### 5.4 Additional Tools

**API Documentation:**
- **Swagger/OpenAPI** for REST APIs
- **GraphQL Playground** if using GraphQL

**Testing:**
- **Jest** for unit tests
- **Supertest** for API integration tests
- **Playwright** or **Cypress** for E2E tests

**Code Quality:**
- **ESLint** + **Prettier**
- **Husky** for pre-commit hooks
- **SonarQube** for code analysis

---

## 6. Database Schema Design

### 6.1 Core Tables

#### Transactions Table
```sql
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'sale', 'purchase', 'expense', etc.

    -- Currency & Amounts
    original_currency CHAR(3) NOT NULL,
    original_amount DECIMAL(19, 4) NOT NULL,
    pln_amount DECIMAL(19, 4) NOT NULL,
    exchange_rate_id UUID REFERENCES exchange_rates(id),

    -- VAT
    vat_rate DECIMAL(5, 2) NOT NULL, -- 23.00, 8.00, 5.00, 0.00
    vat_amount_pln DECIMAL(19, 4) NOT NULL,
    is_reverse_charge BOOLEAN DEFAULT FALSE,
    requires_split_payment BOOLEAN DEFAULT FALSE,

    -- Invoice
    invoice_number VARCHAR(100),
    invoice_date DATE,
    ksef_reference VARCHAR(255), -- KSeF invoice reference

    -- Counterparty
    counterparty_id UUID REFERENCES counterparties(id),
    counterparty_nip VARCHAR(10),
    counterparty_name VARCHAR(255),

    -- Bank & Payment
    payment_method VARCHAR(50),
    payment_status VARCHAR(50),
    bank_account VARCHAR(50),
    bank_account_verified BOOLEAN DEFAULT FALSE,
    white_list_check_id UUID REFERENCES white_list_checks(id),

    -- Tax Classification
    tax_category VARCHAR(100),
    is_tax_deductible BOOLEAN DEFAULT TRUE,
    deduction_percentage DECIMAL(5, 2) DEFAULT 100.00,

    -- Metadata
    description TEXT,
    notes TEXT,
    tags TEXT[],
    attachments JSONB,

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,

    -- Indexing
    CONSTRAINT valid_vat_rate CHECK (vat_rate IN (0, 5, 8, 23)),
    INDEX idx_transaction_date ON transactions(transaction_date),
    INDEX idx_transaction_type ON transactions(transaction_type),
    INDEX idx_counterparty ON transactions(counterparty_id),
    INDEX idx_invoice_number ON transactions(invoice_number)
);
```

#### Exchange Rates Table
```sql
CREATE TABLE exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency_code CHAR(3) NOT NULL,
    base_currency CHAR(3) NOT NULL DEFAULT 'PLN',
    rate_date DATE NOT NULL,

    -- Rate Data
    rate_source VARCHAR(10) NOT NULL, -- 'NBP' or 'ECB'
    table_type CHAR(1), -- 'A', 'B', 'C' for NBP
    mid_rate DECIMAL(12, 6) NOT NULL,
    bid_rate DECIMAL(12, 6), -- for table C
    ask_rate DECIMAL(12, 6), -- for table C

    -- Validity
    effective_from TIMESTAMP WITH TIME ZONE NOT NULL,
    effective_to TIMESTAMP WITH TIME ZONE,

    -- Metadata
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    raw_response JSONB, -- Original API response for audit

    -- Constraints
    UNIQUE (currency_code, base_currency, rate_date, rate_source, table_type),
    INDEX idx_currency_date ON exchange_rates(currency_code, rate_date),
    INDEX idx_rate_date ON exchange_rates(rate_date DESC)
);
```

#### Counterparties Table
```sql
CREATE TABLE counterparties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Identification
    nip VARCHAR(10) UNIQUE, -- Polish Tax ID
    name VARCHAR(255) NOT NULL,
    legal_form VARCHAR(100),

    -- Address
    street VARCHAR(255),
    city VARCHAR(100),
    postal_code VARCHAR(10),
    country CHAR(2), -- ISO 3166-1 alpha-2

    -- Contact
    email VARCHAR(255),
    phone VARCHAR(50),

    -- Classification
    counterparty_type VARCHAR(50), -- 'customer', 'supplier', 'both'
    is_eu_entity BOOLEAN DEFAULT FALSE,
    is_vat_registered BOOLEAN DEFAULT TRUE,

    -- Bank Accounts
    bank_accounts JSONB, -- Array of bank account objects

    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### VAT Reports Table
```sql
CREATE TABLE vat_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Period
    reporting_period DATE NOT NULL, -- First day of month/quarter
    period_type VARCHAR(20) NOT NULL, -- 'monthly' or 'quarterly'

    -- Report Data
    total_sales_net DECIMAL(19, 4) NOT NULL,
    total_sales_vat DECIMAL(19, 4) NOT NULL,
    total_purchases_net DECIMAL(19, 4) NOT NULL,
    total_purchases_vat DECIMAL(19, 4) NOT NULL,
    vat_payable DECIMAL(19, 4) NOT NULL,
    vat_refund DECIMAL(19, 4) NOT NULL,

    -- JPK Files
    jpk_vat_xml TEXT, -- Generated JPK_VAT XML
    jpk_vat_filename VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL, -- 'draft', 'finalized', 'submitted'
    submitted_at TIMESTAMP WITH TIME ZONE,
    submission_reference VARCHAR(255),

    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID,

    UNIQUE (reporting_period, period_type)
);
```

#### CIT Reports Table
```sql
CREATE TABLE cit_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reporting Year
    tax_year INTEGER NOT NULL,

    -- Financial Data
    total_revenue DECIMAL(19, 4) NOT NULL,
    tax_deductible_costs DECIMAL(19, 4) NOT NULL,
    taxable_income DECIMAL(19, 4) NOT NULL,
    tax_rate DECIMAL(5, 2) NOT NULL, -- 9.00 or 19.00
    cit_amount DECIMAL(19, 4) NOT NULL,
    advance_payments_made DECIMAL(19, 4) DEFAULT 0,

    -- Minimum Tax
    minimum_tax_applicable BOOLEAN DEFAULT FALSE,
    minimum_tax_amount DECIMAL(19, 4),

    -- JPK_CIT
    jpk_cit_xml TEXT,
    jpk_cit_filename VARCHAR(255),

    -- Status
    status VARCHAR(50) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (tax_year)
);
```

#### White List Checks Table
```sql
CREATE TABLE white_list_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Account Details
    nip VARCHAR(10) NOT NULL,
    bank_account VARCHAR(50) NOT NULL,

    -- Check Result
    check_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_verified BOOLEAN NOT NULL,
    verification_status VARCHAR(50), -- 'verified', 'not_found', 'error'

    -- API Response
    api_response JSONB,

    -- Metadata
    checked_for_transaction_id UUID,

    INDEX idx_nip_account ON white_list_checks(nip, bank_account),
    INDEX idx_check_date ON white_list_checks(check_date DESC)
);
```

#### Audit Log Table
```sql
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- What
    entity_type VARCHAR(100) NOT NULL, -- 'transaction', 'report', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'create', 'update', 'delete'

    -- Changes
    old_values JSONB,
    new_values JSONB,

    -- Who & When
    user_id UUID,
    user_email VARCHAR(255),
    performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Context
    ip_address INET,
    user_agent TEXT,

    INDEX idx_entity ON audit_log(entity_type, entity_id),
    INDEX idx_performed_at ON audit_log(performed_at DESC)
);
```

### 6.2 Indexes Strategy

**Performance Indexes:**
- Transaction date range queries
- Currency code lookups
- Counterparty searches
- Report period queries

**Audit Indexes:**
- Timestamp-based queries
- User activity tracking
- Entity change history

---

## 7. Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

**Objectives:**
- Set up development environment
- Establish core architecture
- Implement currency conversion API

**Deliverables:**
1. **Project Setup**
   - Repository structure
   - Docker development environment
   - CI/CD pipeline
   - Code quality tools

2. **Database**
   - PostgreSQL schema implementation
   - Migration scripts
   - Seed data for testing

3. **Currency API (MVP)**
   - NBP API integration
   - Exchange rate fetching service
   - Rate storage and caching
   - Basic REST API endpoints:
     - GET current rate
     - GET historical rate
     - POST convert amount
   - API documentation (Swagger)

4. **Testing Infrastructure**
   - Unit test framework
   - Integration test setup
   - Mock NBP API for testing

**Success Criteria:**
- Currency API functional and tested
- 90%+ test coverage
- Documentation complete
- Docker containers running locally

### Phase 2: Core Tax Functionality (Weeks 5-10)

**Objectives:**
- Implement transaction management
- Build VAT calculation engine
- Create invoice management system

**Deliverables:**
1. **Transaction Service**
   - CRUD operations for transactions
   - Multi-currency support
   - Automatic PLN conversion using Currency API
   - Transaction validation rules

2. **VAT Engine**
   - Rate determination logic
   - Reverse charge detection
   - Split payment flagging
   - VAT calculation and validation

3. **Counterparty Management**
   - Counterparty CRUD
   - NIP validation
   - Bank account management

4. **Invoice System**
   - Invoice creation (multi-currency)
   - PLN VAT calculation
   - Early invoice exchange rate handling
   - Invoice validation

5. **White List Integration**
   - API integration with Polish tax authority
   - Account verification service
   - Risk flagging system

**Success Criteria:**
- All core entities functional
- Business rules implemented
- API endpoints tested
- Integration with Currency API working

### Phase 3: Reporting & Compliance (Weeks 11-15)

**Objectives:**
- Implement JPK_VAT generation
- Build JPK_CIT reporting
- Create KSeF integration foundation

**Deliverables:**
1. **JPK_VAT Generator**
   - Monthly/quarterly report generation
   - XML schema compliance
   - Sales and purchase registers
   - Validation against official schemas

2. **JPK_CIT Generator**
   - Annual report generation
   - JPK_KR_PD structure
   - Large company requirements (2025+)

3. **KSeF Preparation**
   - XML invoice format generation
   - Schema validation
   - API stub for future integration

4. **Report Management**
   - Report status tracking
   - Submission logging
   - Archive storage

**Success Criteria:**
- Valid JPK_VAT XML generation
- Valid JPK_CIT XML generation
- Reports pass official validation tools
- Audit trail complete

### Phase 4: User Interface (Weeks 16-20)

**Objectives:**
- Build web application
- Create dashboards and analytics
- Implement user management

**Deliverables:**
1. **Web Application**
   - Authentication & authorization
   - Transaction management UI
   - Invoice creation forms
   - Counterparty management

2. **Dashboards**
   - Tax liability overview
   - VAT summary dashboard
   - Currency exposure analysis
   - Upcoming payment reminders

3. **Reporting UI**
   - Report generation interface
   - JPK download functionality
   - Report preview and validation

4. **Admin Panel**
   - User management
   - System configuration
   - Audit log viewer

**Success Criteria:**
- Responsive, accessible UI
- All core workflows functional
- Performance < 2s page load
- Mobile-friendly design

### Phase 5: Advanced Features (Weeks 21-24)

**Objectives:**
- Enhance Currency API
- Add analytics and insights
- Implement automation features

**Deliverables:**
1. **Currency API Enhancements**
   - Batch conversion endpoint
   - Time series data
   - Rate alerts and notifications
   - ECB rate source support

2. **Analytics Engine**
   - Tax forecasting
   - Currency risk analysis
   - Expense categorization insights
   - Compliance scoring

3. **Automation**
   - Scheduled report generation
   - Automatic rate updates
   - Email notifications
   - API webhooks

4. **Integrations**
   - Export to accounting software
   - Import from e-commerce platforms
   - Bank statement parsing

**Success Criteria:**
- Advanced API features tested
- Analytics accurate and useful
- Automation reliable
- Integration points documented

### Phase 6: Production Readiness (Weeks 25-28)

**Objectives:**
- Security hardening
- Performance optimization
- Production deployment
- User acceptance testing

**Deliverables:**
1. **Security**
   - Penetration testing
   - Security audit
   - GDPR compliance review
   - Data encryption at rest

2. **Performance**
   - Load testing (1000+ concurrent users)
   - Database optimization
   - Caching strategy refinement
   - CDN setup for static assets

3. **Documentation**
   - API documentation complete
   - User manual
   - Admin guide
   - Runbooks for operations

4. **Deployment**
   - Production infrastructure setup
   - Monitoring and alerting
   - Backup and disaster recovery
   - Zero-downtime deployment strategy

5. **Training & Support**
   - User training materials
   - Support ticket system
   - Knowledge base

**Success Criteria:**
- Security audit passed
- Performance benchmarks met
- 99.9% uptime in staging
- UAT sign-off received
- Production launch successful

---

## 8. Compliance & Security Considerations

### 8.1 Data Protection (GDPR)

**Requirements:**
- User consent management
- Right to access data
- Right to erasure
- Data portability
- Privacy policy

**Implementation:**
- Personal data encryption
- Access logging
- Data retention policies
- Regular compliance audits

### 8.2 Financial Data Security

**Measures:**
- End-to-end encryption (TLS 1.3)
- Data at rest encryption (AES-256)
- Secure key management (HashiCorp Vault)
- Regular security assessments
- Intrusion detection systems

**Access Control:**
- Role-based access control (RBAC)
- Multi-factor authentication (MFA)
- Session management
- IP whitelisting for API access

### 8.3 Audit & Compliance

**Audit Trail:**
- Immutable transaction records
- Complete change history
- User action logging
- API request logging

**Compliance Monitoring:**
- Automated compliance checks
- Regulatory update tracking
- Annual compliance reports
- Third-party audits

### 8.4 Backup & Disaster Recovery

**Backup Strategy:**
- Daily automated backups
- Point-in-time recovery
- Off-site backup storage
- Backup encryption

**Disaster Recovery:**
- RTO (Recovery Time Objective): 4 hours
- RPO (Recovery Point Objective): 1 hour
- Failover procedures
- Regular DR drills

---

## 9. API Integration Specifications

### 9.1 NBP API Integration

**Endpoint:** `https://api.nbp.pl/api/`

**Key Operations:**
1. **Get Current Rate**
   - Endpoint: `/exchangerates/rates/a/{currency}/today/`
   - Frequency: Daily at 8:00 AM CET
   - Caching: 24 hours

2. **Get Historical Rate**
   - Endpoint: `/exchangerates/rates/a/{currency}/{date}/`
   - On-demand with permanent cache

3. **Get Rate Range**
   - Endpoint: `/exchangerates/rates/a/{currency}/{startDate}/{endDate}/`
   - For bulk historical data

**Error Handling:**
- Retry logic: 3 attempts with exponential backoff
- Fallback: Previous day's rate with warning
- Holiday handling: Use last available working day rate
- Logging: All API calls logged for audit

**Rate Limiting:**
- NBP allows reasonable usage
- Implement client-side throttling: max 100 requests/minute
- Cache aggressively to minimize API calls

### 9.2 KSeF API Integration (Future)

**Endpoint:** `https://ksef.mf.gov.pl/api/` (official endpoint TBD)

**Preparation Steps:**
1. Study KSeF technical documentation
2. Obtain test environment credentials
3. Implement XML invoice generation
4. Build authentication flow
5. Develop submission and status checking

**Timeline:**
- Phase 3: Foundation and XML generation
- Q4 2025: Test environment integration
- Q1 2026: Production readiness

### 9.3 White List API

**Endpoint:** Polish Ministry of Finance white list service

**Operations:**
1. Verify account status
2. Get account details
3. Check historical status

**Integration:**
- Real-time verification for transactions > PLN 15,000
- Daily batch verification for all accounts
- Cache verified accounts (24-hour TTL)

---

## 10. Success Metrics & KPIs

### 10.1 Technical Metrics

- **API Response Time**: < 100ms (p95)
- **System Uptime**: 99.9%
- **Error Rate**: < 0.1%
- **Test Coverage**: > 90%
- **Security Vulnerabilities**: 0 high/critical

### 10.2 Business Metrics

- **Tax Report Accuracy**: 100%
- **Compliance Rate**: 100%
- **User Adoption**: Track active users
- **Time Saved**: vs. manual processes
- **Currency Conversion Accuracy**: 100%

### 10.3 User Experience Metrics

- **Page Load Time**: < 2 seconds
- **User Satisfaction**: > 4.5/5
- **Support Ticket Volume**: Track and reduce
- **Feature Adoption**: Monitor usage

---

## 11. Risk Management

### 11.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| NBP API downtime | High | Low | Cache last known rates, fallback to ECB |
| Database failure | Critical | Low | Automated backups, failover replica |
| Security breach | Critical | Medium | Security audits, encryption, MFA |
| Performance degradation | Medium | Medium | Load testing, auto-scaling, monitoring |

### 11.2 Regulatory Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Tax law changes | High | Medium | Modular design, regular updates, legal advisor |
| KSeF delays | Medium | Medium | Build foundation early, stay informed |
| Compliance violations | Critical | Low | Automated validation, regular audits |

### 11.3 Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Scope creep | Medium | High | Phased approach, strict change control |
| Resource constraints | Medium | Medium | Prioritization, MVP focus |
| User adoption | Medium | Medium | Training, UX focus, support |

---

## 12. Next Steps

### Immediate Actions (Week 1)

1. **Team Assembly**
   - Backend developers (2-3)
   - Frontend developer (1-2)
   - DevOps engineer (1)
   - QA engineer (1)
   - Tax compliance advisor (part-time)

2. **Environment Setup**
   - GitHub repository
   - Development servers
   - CI/CD pipeline
   - Communication tools (Slack, Jira)

3. **Requirements Refinement**
   - Stakeholder interviews
   - User story mapping
   - Technical architecture review
   - Risk assessment workshop

4. **Technology Selection Confirmation**
   - Finalize tech stack
   - Proof of concept: NBP API integration
   - Database schema review

### Week 2-4 Milestones

- [ ] Development environment operational
- [ ] Database schema implemented
- [ ] Currency API MVP functional
- [ ] First API integration test successful
- [ ] CI/CD pipeline deploying to staging

---

## 13. Appendices

### A. Polish Tax Regulations References

1. **VAT Act** (Ustawa o podatku od towarów i usług)
2. **CIT Act** (Ustawa o podatku dochodowym od osób prawnych)
3. **KSeF Technical Documentation** - Ministry of Finance
4. **JPK Schema Specifications** - Ministry of Finance
5. **White List API Documentation** - Ministry of Finance

### B. NBP Exchange Rate Information

- **Official API Docs**: https://api.nbp.pl/en.html
- **Table A**: Average exchange rates (most common)
- **Table B**: Average exchange rates (exotic currencies)
- **Table C**: Bid/ask rates for foreign exchange transactions

### C. Useful Resources

- Polish Tax Authority: https://www.gov.pl/web/kas
- KSeF Portal: https://www.gov.pl/web/kas/ksef
- NBP Rates: https://nbp.pl/en/statistic-and-financial-reporting/rates/
- JPK Schemas: https://www.gov.pl/web/kas/struktury-jpk

### D. Glossary

- **CIT**: Corporate Income Tax (Podatek dochodowy od osób prawnych)
- **JPK**: Standard Audit File for Tax (Jednolity Plik Kontrolny)
- **KSeF**: National e-Invoicing System (Krajowy System e-Faktur)
- **MPP**: Split Payment Mechanism (Mechanizm Podzielonej Płatności)
- **NBP**: National Bank of Poland (Narodowy Bank Polski)
- **NIP**: Tax Identification Number (Numer Identyfikacji Podatkowej)
- **PLN**: Polish Zloty (currency)
- **SAF-T**: Standard Audit File for Tax
- **VAT**: Value Added Tax (Podatek od towarów i usług)

---

## Document Information

**Version**: 1.0
**Date**: 2025-01-22
**Author**: Tax Handler Project Team
**Status**: Planning Phase
**Next Review**: After Phase 1 Completion

---

## Sources & References

This implementation plan is based on comprehensive research of Polish tax regulations and best practices for financial systems:

### Polish Tax Requirements
- [Taxually | VAT Poland Guide 2025](https://www.taxually.com/manuals/poland)
- [Polish VAT Rules in 2025 - Tax in Poland](https://www.dudkowiak.com/tax-law-in-poland/vat-in-poland)
- [Poland - Corporate - Other taxes](https://taxsummaries.pwc.com/poland/corporate/other-taxes)
- [Invoicing In Poland 2025: VAT And Mandatory E-Invoicing Via KSeF](https://polishtax.com/invoicing-in-poland-2025-vat-ksef-and-the-road-to-mandatory-e-invoicing/)
- [VAT in Poland: Complete 2025 Compliance Guide for Businesses - BPCC](https://bpcc.org.pl/vat-in-poland-complete-2025-compliance-guide-for-businesses/)
- [Poland's 2025 VAT Reforms: Complete Guide for Small Businesses - TaxDo](https://taxdo.com/resources/blog/post/poland-vat-updates-2025)
- [VAT changes in Poland from 2025](https://poland-accounting.eu/2024/12/vat-changes-in-poland-from-2025-key-information-for-businesses/)

### Corporate Income Tax
- [Poland - Corporate - Taxes on corporate income](https://taxsummaries.pwc.com/poland/corporate/taxes-on-corporate-income)
- [Polish SAF-T Corporate Income Tax 2025 update](https://www.vatcalc.com/poland/polish-saf-t-corporate-income-tax-2025/)
- [Corporate Income Tax in Poland | Dudkowiak & Putyra](https://www.dudkowiak.com/tax-law-in-poland/corporate-income-tax-in-poland/)
- [Poland CIT Rates & Rules | Intertax](https://polishtax.com/information/polish-tax-law/cit/)

### Currency Exchange & NBP API
- [Currency exchange rates and gold prices - NBP Web API](https://api.nbp.pl/en.html)
- [National Bank of Poland API - PublicAPI](https://publicapi.dev/national-bank-of-poland-api)
- [Rates | NBP](https://nbp.pl/en/statistic-and-financial-reporting/rates/)

### Foreign Currency Transactions
- [Payments For Invoices Issued In A Foreign Currency In Poland | Intertax](https://polishtax.com/payments-for-invoices-issued-in-a-foreign-currency-in-poland/)
- [Invoices In Foreign Currency In Poland | Intertax](https://polishtax.com/invoices-in-foreign-currency-in-poland/)
- [Foreign currency transactions according to IAS 21 | RSM Poland](https://www.rsm.global/poland/en/insights/audit-and-accounting/foreign-currency-transactions-according-to-ias-21)

### Multi-Currency Accounting Best Practices
- [The Multi-Currency Accounting Guide](https://www.netsuite.com/portal/resource/articles/accounting/multi-currency-accounting.shtml)
- [Multi-Currency Accounting Software & Automation Guide](https://www.finoptimal.com/resources/accounting-automation-multi-currency)

---

*End of Implementation Plan*
