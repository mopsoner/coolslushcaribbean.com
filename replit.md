# Cool'Slush Guadeloupe - Ninja Slushi Machine Rental Platform

## Overview

Cool'Slush is a web application for renting Ninja Slushi 2,5L professional machines in Guadeloupe. The platform features machines with 5 programs (Slushi, Milkshake, Frozen Drink, Smoothie, and Italian Ice Cream), allowing customers to browse available machines, make bookings, and complete secure payments via Stripe, with deposits of 150€ per machine managed through Swikly. The platform provides a complete booking workflow, including email notifications, a recipe page showcasing the machine's capabilities, and comprehensive administrative tools for managing bookings, machines, pricing, and syrups. The project aims to capture the market for event rentals in Guadeloupe by offering a seamless and secure booking experience.

## Recent Changes (November 16, 2025)

- **BookingDetails Integration**: Integrated BookingDetails component into BookingForm to display real-time booking preview on `/booking` page
- **Query Key Standardization**: Unified query keys across components (`['/api/syrups']` and `['/api/offers']`) for efficient cache sharing via TanStack Query
- **Syrup Pricing Update**: Updated 7 syrups (Ananas, Cassis, Coco, Fruit de la Passion, Grenadine, Mangue, Vanille) from 0€ to 3.00€ in database
- **Real-time Preview**: Booking total now updates instantly as user selects machines and syrups, showing complete breakdown before checkout
- **Enhanced UI**: BookingDetails features colored header, separated sections, and prominent total display with gradient background

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
- **Key Pages**: Home, Booking, Checkout, Success, Recipes (showcasing 5 machine programs), Admin panels (Bookings, Machines, Pricing, Syrups), and Legal pages.

### Backend

- **Framework**: Express.js with TypeScript for REST API.
- **API Design**: RESTful endpoints, centralized route definitions, storage abstraction layer, and separation of concerns between HTTP handling and data persistence.
- **Key Services**: Nodemailer for email notifications and direct integration with Swikly and Stripe APIs.

### Data Storage

- **Database**: PostgreSQL via Neon serverless database, utilizing connection pooling and WebSocket configuration.
- **ORM**: Drizzle ORM for type-safe queries and schema definition, with Drizzle Kit for migrations.
- **Data Models**: Includes `Machines` (Ninja Slushi inventory), `Bookings` for reservations, `Offers` for rental packages with descriptions, `Offer Machine Prices` for overrides, and `Syrups` for flavor catalog.
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

### Payment & Deposit Flow (Updated November 15, 2025)

- **Two-Step Process**:
    1. **Stripe Payment**: Actual charge for rental cost on `/checkout` page.
    2. **Swikly Deposit**: Bank authorization of 150€ per machine with user choice on `/swikly-step`:
       - **Option A - "Payer maintenant"**: Opens Swikly link in new tab, auto-redirects to `/success` when caution validated (polling + webhook)
       - **Option B - "Payer plus tard"**: Confirms booking immediately, sends Swikly link via email for later validation

- **Technical Flow**:
    - Conditional polling activates only when user chooses "Payer maintenant"
    - Webhook `/api/swikly-callback` updates booking status to CONFIRMED
    - Endpoint `/api/bookings/:id/skip-caution` handles "Payer plus tard" option
    - Email service sends Swikly link with clear "no debit" messaging
    - Caution amount: 150€ per machine (defined in `shared/utils.ts` as `CAUTION_PER_MACHINE_CENTS = 15000`)

## Machine Specifications (Updated November 15, 2025)

- **Model**: Ninja Slushi 2,5L professional machine
- **Capacity**: 2,5 liters per machine
- **Programs**: 5 different programs
  1. Slushi - Classic frozen slushy drinks
  2. Milkshake - Creamy milkshakes
  3. Frozen Drink - Frozen cocktails and beverages
  4. Smoothie - Healthy fruit smoothies
  5. Italian Ice Cream - Soft-serve ice cream
- **Brand**: All machines are professional Ninja brand (no longer EZBASICS)
- **Recipe Page**: Platform includes a `/recipes` page with 10+ recipes showcasing all 5 machine programs to inspire customers

## External Dependencies

-   **Payment Processing**: Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`, `stripe` npm package) for rental payments, with a webhook endpoint for confirmation.
-   **Deposit Management**: Swikly API for security deposits (150€ per machine), supporting sandbox and production environments.
-   **Email Service**: Nodemailer for booking confirmations, configurable for SMTP in production and Ethereal in development.
-   **Database**: Neon PostgreSQL for serverless database hosting.
-   **Development Tools**: Replit-specific plugins, TypeScript, and ESBuild.