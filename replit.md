# Cool'Slush Guadeloupe - Slushy Machine Rental Platform

## Overview

Cool'Slush is a web application for renting slushy machines in Guadeloupe. It allows customers to browse machines, make bookings, and complete secure payments via Stripe, with deposits managed through Swikly. The platform provides a complete booking workflow, including email notifications and administrative tools for managing bookings. The project aims to capture the market for event rentals in Guadeloupe by offering a seamless and secure booking experience.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript.
- **Build Tool**: Vite for development and optimized production builds.
- **Routing**: Wouter for lightweight client-side navigation.
- **UI Components**: Shadcn/ui (Radix UI primitives) and TailwindCSS for styling with a tropical theme.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation, and React hooks for local UI state.
- **Design Patterns**: Path aliases for clean imports, component co-location, custom hooks for reusable logic, and clear separation of page and reusable components.

### Backend

- **Framework**: Express.js with TypeScript for REST API.
- **API Design**: RESTful endpoints, centralized route definitions, storage abstraction layer, and separation of concerns between HTTP handling and data persistence.
- **Key Services**: Nodemailer for email notifications and direct integration with Swikly and Stripe APIs.

### Data Storage

- **Database**: PostgreSQL via Neon serverless database, utilizing connection pooling and WebSocket configuration.
- **ORM**: Drizzle ORM for type-safe queries and schema definition, with Drizzle Kit for migrations.
- **Data Models**: Includes `Machines` for inventory, `Bookings` for reservations, `Offers` for rental packages, `Offer Machine Prices` for overrides, and `Syrups` for flavor catalog.
- **Validation**: Shared Zod schemas between client and server for consistent validation.

### Unified Pricing System

- **Architecture**: Database-driven pricing with `Offers` defining daily prices and `Offer Machine Prices` for machine-specific overrides.
- **Pricing Logic**: `Total = (dailyPrice × machineCount × rentalDays) + (syrupPrice × quantity)`. Rental days are calculated inclusively.
- **Admin Interface**: Provides a unified back-office for managing offers, including daily prices and optional machine-specific overrides, with transactional CRUD operations.
- **Integrity**: Transactional writes ensure data consistency, and server-side validation prevents client-side manipulation of pricing.

### Syrup Selection & Customization

- **Catalog**: Database-driven syrup catalog with admin management for CRUD operations, including individual pricing.
- **Booking Integration**: Customers select syrup quantities and cup sizes (petit, moyen, grand) during booking.

### Authentication and Authorization

- **Current Status**: No authentication implemented for admin routes, which are publicly accessible. Session management infrastructure is present but unused.
- **Security Warning**: Critical need for authentication on admin routes and verification of Swikly webhooks before production.
- **Implemented Hardening**: Server-side validation for Stripe payment amounts, Drizzle ORM for SQL injection prevention, React XSS sanitization, and Zod for input validation.

### Payment & Deposit Flow

- **Two-Step Process**:
    1. **Stripe Payment**: Actual charge for rental cost on `/checkout` page.
    2. **Swikly Deposit**: Bank authorization for a security deposit via external redirect to Swikly from `/swikly-step`. No actual charge occurs; the hold is released automatically.
- **User Experience**: 
    - Clear multi-step indicators and explicit messaging distinguishing payment from deposit.
    - External redirect to Swikly platform for deposit authorization
    - Return URL brings users back to `/swikly-return` which polls booking status
    - Webhook callback updates booking status when deposit is confirmed
    - Automatic redirect to success page once deposit is complete
- **Deposit States**:
    - `depositStatus: "PENDING"`: Waiting for Swikly webhook confirmation
    - `depositStatus: "COMPLETED"`: Deposit authorized successfully
    - `depositStatus: "FAILED"`: Swikly API error, manual review required (booking remains `status: "PENDING"` for operator follow-up)
- **Fallback Handling**: If Swikly API fails, user is redirected to `/swikly-return` with a manual review message. Payment is completed via Stripe, but deposit requires operator intervention.

## External Dependencies

-   **Payment Processing**: Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`, `stripe` npm package) for rental payments, with a webhook endpoint for confirmation.
-   **Deposit Management**: Swikly API for security deposits, supporting sandbox and production environments.
-   **Email Service**: Nodemailer for booking confirmations, configurable for SMTP in production and Ethereal in development.
-   **Database**: Neon PostgreSQL for serverless database hosting.
-   **Development Tools**: Replit-specific plugins, TypeScript, and ESBuild.