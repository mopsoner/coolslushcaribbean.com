# Cool Slush - Ninja Slushi Machine Rental Platform

## Overview

Cool Slush is a web application for renting Ninja Slushi 2,5L professional machines. The platform features machines with 5 programs (Slushi, Milkshake, Frozen Drink, Smoothie, and Italian Ice Cream), allowing customers to browse available machines, make bookings, and complete secure payments via Stripe, with deposits of 150€ per machine managed through Swikly. The platform provides a complete booking workflow, including email notifications, a recipe page showcasing the machine's capabilities, and comprehensive administrative tools for managing bookings, machines, pricing, and syrups. The platform offers a seamless and secure booking experience with professional IONOS email service.

## Recent Changes (November 19, 2025)

### Editable Pricing Details & Final Rebranding (Latest - November 19, 2025)
- **Editable Pricing Details**: Added ability for admins to customize pricing details for each offer
  - New `details` TEXT field in Offers table (nullable)
  - Admin pricing page now includes textarea for editing pricing details
  - Frontend automatically displays custom details when available, otherwise falls back to hardcoded features
  - Details support multi-line format for creating feature lists
- **Hero Image**: Added colorful slushie drink image to homepage hero section
  - Generated professional slushie image using AI image generation
  - Integrated into hero section with proper alt text and SEO optimization
- **Final Rebranding Cleanup**: Fixed 3 missed occurrences in home.tsx
  - Testimonials section: "Cool Slush Lemonade" → "Cool Slush"
  - How It Works section: "machine à granité" → "machine à Slushie"
  - CTA section: "machine à granité" → "machine à Slushie"
  - Verified 0 occurrences of legacy terminology remain on the site

### Rebranding to Cool Slush (November 19, 2025)
- **Brand Name**: Updated from "Cool Slush Lemonade" to "Cool Slush" (shorter, more impactful)
- **Terminology**: Replaced all "machine à granité" references with "machine à Slushie"
- **Domain & Email**: Configured for coolslushcaribbean.com with contact@coolslushlemonade.com
- **Email Service**: Integrated IONOS SMTP for professional email delivery
  - SMTP Host: smtp.ionos.fr
  - Port: 587 (STARTTLS)
  - Email credentials stored in Replit secrets (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, EMAIL_FROM)
- **SEO Optimization**: Updated meta tags, Open Graph tags, and page titles for better search visibility
- **Content Updates**: All pages, email templates, and legal documents updated with new brand name

### Swikly Webhook Configuration (November 19, 2025) ✅
- **Webhook Endpoint**: Implemented and configured for automatic booking confirmation
  - Webhook URL: `https://coolslushcaribbean.com/api/swikly-callback`
  - Accepts `customId`, `reference`, or `request.customId` fields from Swikly
  - Validates booking exists before updating status
  - Status codes accepted: `completed`, `accepted`, `validated`
  - **Status**: ✅ Configured in Swikly production account
- **Security**: Rejects webhooks without valid booking identifiers, preventing unauthorized status updates
- **Automatic Redirection**: When user validates Swikly deposit, webhook updates booking to CONFIRMED, frontend polling detects change within 3 seconds and redirects to /success page

### Admin Authentication & SEO Tracking System
- **Admin Authentication**: Implemented password-based admin authentication using JWT tokens stored in Replit secrets
  - Login page at `/admin/login` (not publicly linked)
  - Token-based authentication with server-side verification via `/api/auth/check`
  - All `/api/admin/*` routes protected with `requireAdmin` middleware
  - Frontend auth guards redirect unauthenticated users to login
  - Automatic token invalidation on 401 responses
- **SEO Tracking Codes Management**: New `/admin/settings` page for managing third-party tracking codes
  - Support for Google Analytics 4, Facebook Pixel, Google Tag Manager, Microsoft Clarity, and TikTok Pixel
  - Database-driven settings with active/inactive toggle
  - Strict format validation to prevent XSS attacks
  - TrackingScripts component auto-injects validated codes into page `<head>`
- **Security Hardening**: 
  - Server-side token validation for all admin operations
  - Client-side auth verification with automatic redirect
  - Tracking code format validation with regex patterns
  - 401 error handling with automatic token cleanup

### Swikly iframe Integration
- **Embedded iframe**: Swikly validation now displays in an embedded iframe (700px height) instead of opening a new tab when user chooses "Payer maintenant"
- **Enhanced UX**: Spinner during iframe loading, styled container with border and shadow, informational messages about automatic redirection
- **Option Toggle**: Users can change between "Payer maintenant" and "Payer plus tard" options via "← Changer d'option" button

### Stripe Configuration Security Fix
- **VITE_STRIPE_PUBLIC_KEY**: Corrected to use proper publishable key (pk_test_...) instead of secret key, resolving client-side Stripe.js initialization errors
- **STRIPE_SECRET_KEY**: Configured with proper secret key (sk_test_...) for server-side PaymentIntent creation
- **Security**: Eliminated exposure of secret key to client-side code

### BookingDetails Integration
- **Real-time Preview**: Integrated BookingDetails component into BookingForm to display booking preview on `/booking` page
- **Query Key Standardization**: Unified query keys (`['/api/syrups']`, `['/api/offers']`) for efficient TanStack Query cache sharing
- **Syrup Pricing**: Updated 7 syrups from 0€ to 3.00€ (Ananas, Cassis, Coco, Fruit de la Passion, Grenadine, Mangue, Vanille)
- **Enhanced UI**: BookingDetails features colored header, separated sections, prominent total display with gradient background

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
- **Key Pages**: Home, Booking, Checkout, Success, Admin panels (Login, Bookings, Machines, Pricing, Syrups, Settings), and Legal pages.

### Backend

- **Framework**: Express.js with TypeScript for REST API.
- **API Design**: RESTful endpoints, centralized route definitions, storage abstraction layer, and separation of concerns between HTTP handling and data persistence.
- **Key Services**: Nodemailer for email notifications and direct integration with Swikly and Stripe APIs.

### Data Storage

- **Database**: PostgreSQL via Neon serverless database, utilizing connection pooling and WebSocket configuration.
- **ORM**: Drizzle ORM for type-safe queries and schema definition, with Drizzle Kit for migrations.
- **Data Models**: Includes `Machines` (Ninja Slushi inventory), `Bookings` for reservations, `Offers` for rental packages with descriptions, `Offer Machine Prices` for overrides, `Syrups` for flavor catalog, and `Settings` for SEO tracking codes.
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

- **Admin Authentication**: Password-based JWT authentication system protecting all admin routes
  - Password stored in Replit secret `ADMIN_PASSWORD`
  - JWT tokens with 7-day expiration
  - Middleware `requireAdmin` protects all `/api/admin/*` endpoints
  - Frontend auth guard `useAdminAuth` verifies tokens and redirects unauthorized users
  - Automatic token cleanup on 401 responses
- **Security Implementation**: 
  - Server-side token validation via `/api/auth/check`
  - Bearer token authentication in HTTP headers
  - XSS prevention through tracking code format validation
  - Server-side validation for Stripe payment amounts
  - Drizzle ORM for SQL injection prevention
  - Zod for input validation
- **Future Work**: Swikly webhook verification still needed before production

### Payment & Deposit Flow (Updated November 16, 2025)

- **Two-Step Process**:
    1. **Stripe Payment**: Actual charge for rental cost on `/checkout` page.
    2. **Swikly Deposit**: Bank authorization of 150€ per machine with user choice on `/swikly-step`:
       - **Option A - "Payer maintenant"**: Displays Swikly validation form in embedded iframe (700px), auto-redirects to `/success` when caution validated (polling + webhook)
       - **Option B - "Payer plus tard"**: Confirms booking immediately, sends Swikly link via email for later validation

- **Technical Flow**:
    - Embedded iframe replaces external tab opening for "Payer maintenant" option
    - Spinner displays during iframe loading, disappears when iframe loads
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

## External Dependencies

-   **Payment Processing**: Stripe (`@stripe/stripe-js`, `@stripe/react-stripe-js`, `stripe` npm package) for rental payments, with a webhook endpoint for confirmation.
-   **Deposit Management**: Swikly API for security deposits (150€ per machine), supporting sandbox and production environments.
-   **Email Service**: Nodemailer with IONOS SMTP (smtp.ionos.fr:587) for professional email delivery via contact@coolslushlemonade.com. Falls back to Ethereal for development if SMTP credentials not configured.
-   **Database**: Neon PostgreSQL for serverless database hosting.
-   **Development Tools**: Replit-specific plugins, TypeScript, and ESBuild.