# Cool'Slush Guadeloupe - Slushy Machine Rental Platform

## Overview

Cool'Slush is a web application for renting slushy machines in Guadeloupe. The platform enables customers to browse available machines, make bookings, complete secure payments via Stripe, and provide deposits through Swikly. The application handles the complete booking workflow from machine selection to payment confirmation, including email notifications and admin booking management.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server for fast HMR and optimized production builds
- Wouter for lightweight client-side routing (alternative to React Router)

**UI Component System**
- Shadcn/ui component library with Radix UI primitives for accessible, customizable components
- TailwindCSS for utility-first styling with custom theme configuration
- CSS variables for theming with tropical/Caribbean color palette (sky blue primary, orange accent)

**State Management**
- TanStack Query (React Query) for server state management, caching, and API synchronization
- React Hook Form with Zod validation for form state and input validation
- Local component state with React hooks for UI-specific state

**Design Patterns**
- Path aliases configured for clean imports (`@/`, `@shared/`, `@assets/`)
- Component co-location with UI components in `/client/src/components/ui/`
- Custom hooks in `/client/src/hooks/` for reusable logic
- Separation of page components and reusable components

### Backend Architecture

**Server Framework**
- Express.js with TypeScript for REST API endpoints
- Custom middleware for request logging and JSON body parsing
- Vite middleware integration for SSR/development mode

**API Design**
- RESTful endpoints under `/api/` prefix
- Route handlers in `server/routes.ts` centralize all endpoint definitions
- Storage abstraction layer (`server/storage.ts`) provides interface for data operations
- Separation of concerns: routes handle HTTP, storage handles data persistence

**Key Backend Services**
- Email service (`server/email.ts`) using Nodemailer with SMTP/Ethereal fallback for development
- Swikly integration (`server/swikly.ts`) for deposit management via API
- Stripe payment processing integrated directly in routes

### Data Storage Solutions

**Database**
- PostgreSQL via Neon serverless database (@neondatabase/serverless)
- Connection pooling for efficient database access
- WebSocket configuration for serverless compatibility

**ORM & Schema Management**
- Drizzle ORM for type-safe database queries and schema definition
- Schema defined in `shared/schema.ts` with Zod integration for validation
- Database migrations managed via Drizzle Kit in `/migrations/` directory

**Data Models**
- **Machines**: Track slushy machine inventory with status (AVAILABLE, UNAVAILABLE, MAINTENANCE)
- **Bookings**: Store customer reservations with date, time slots, customer info, payment status, external references (Stripe, Swikly), syrup selections, and cup size preference
- **Offers**: Define rental offers (1 Journée, Week-end, Événement) with base prices (basePriceCents field added October 7, 2025)
- **Offer Machine Prices**: Store optional machine-specific price overrides only (formerly price_configurations, refactored October 7, 2025)
- **Syrups**: Catalog of available syrup flavors with individual pricing and active status

**Validation Strategy**
- Shared Zod schemas between client and server for consistent validation
- Schema inference for TypeScript types ensures type safety across the stack

### Unified Pricing System

**Architecture** (Updated November 13, 2025 - Daily Pricing)
- Database-driven pricing with unified offer management (daily price + optional machine overrides)
- Offers contain basePriceCents which represents the **daily price per machine**
- Separate offer_machine_prices table for optional machine-specific daily price overrides
- Real-time price calculation on frontend and backend with rental days
- Transactional integrity: all offer mutations (create/update) wrap offer + overrides in db.transaction for atomicity

**Pricing Formula** (Added November 13, 2025)
```
Total = (dailyPrice × machineCount × rentalDays) + (syrupPrice × quantity)
```
- `dailyPrice`: Price per machine per day from offer (basePriceCents)
- `machineCount`: Number of machines rented
- `rentalDays`: Calculated inclusively (startDate to endDate)
  - Same day rental = 1 day
  - Multi-day rental = (endDate - startDate) + 1 day
- Utility functions in `shared/utils.ts`: `calculateRentalDays()`, `calculateBookingTotal()`

**Admin Interface**
- Back-office unified pricing management at `/admin/pricing`
- Single form to create/edit offers with:
  - Offer details (name, description, active status)
  - Daily price per machine (basePriceCents)
  - Optional machine-specific daily price overrides
- CRUD operations handled through unified API: `createOfferWithPricing`, `updateOfferWithPricing`
- All mutations are transactional (rollback if any part fails)
- Automatic cache invalidation via React Query

**Pricing Flow**
1. Admin defines offers with daily prices and optional machine overrides through unified form
2. All data persisted atomically in transaction (offer + overrides)
3. Customer booking form fetches offers via GET `/api/offers` or `/api/admin/offers` (with overrides)
4. Frontend calculates rental days from startDate/endDate using `calculateRentalDays()`
5. Frontend displays total in real-time: `dailyPrice × machineCount × rentalDays + syrupTotal`
6. Backend validates and recalculates on booking creation using `storage.getOfferByName()` and `storage.getEffectivePrice()`
   - getEffectivePrice checks for machine-specific override first, falls back to basePriceCents
   - Rental days calculated server-side to prevent client manipulation
7. Final totalCents stored in booking record for payment processing

**Data Integrity**
- Transactional writes prevent orphaned price overrides
- No default price rows needed (daily price stored in offer itself)
- Machine overrides only created when explicitly needed
- Server-side validation ensures client cannot manipulate pricing

**Default Offers** (Seeded - Daily Rates)
- "1 Journée": 180€ per machine per day (1 day)
- "Week-end": 150€ per machine per day (typically 2-3 days)
- "Événement": 117€ per machine per day (typically 3+ days)

**Production Configuration**
- Swikly deposit: 500€ (50,000 cents)
- Swikly environment: Automatically uses production mode when NODE_ENV=production
- Email: Falls back to Ethereal test account in development, uses SMTP in production

### Syrup Selection & Customization System

**Architecture** (Added October 6, 2025)
- Database-driven syrup catalog with admin management
- Customer syrup selection with quantity control in booking form
- Cup size selection (petit/moyen/grand) for booking customization

**Admin Interface**
- Back-office syrup management at `/admin/syrups`
- CRUD operations for syrups (create, edit, toggle active/inactive, delete)
- Individual pricing per syrup (can be free or priced)
- Automatic cache invalidation via React Query

**Booking Integration**
1. Admin configures available syrups with names and optional prices in database
2. Customer booking form fetches active syrups via GET `/api/syrups`
3. Customers select syrup quantities (0-10 per syrup) using +/- controls
4. Customers choose cup size: petit (250ml), moyen (350ml), or grand (500ml)
5. Selected syrups stored as JSON array `{ syrupId: string, quantity: number }[]` in booking
6. Cup size stored as text enum in booking record

**Data Structure**
- Syrups table: id, name, amountCents, active status
- Booking fields: selectedSyrups (JSON), cupSize (enum: petit/moyen/grand)
- Default cup size: "moyen"

### Authentication and Authorization

**Current Implementation**
- No authentication system implemented
- Admin routes (`/admin/bookings`, `/admin/pricing`, `/admin/syrups`) are publicly accessible
- Session management infrastructure present but not actively used (connect-pg-simple installed)

**CRITICAL SECURITY WARNINGS - Must Fix Before Production:**
1. **Admin Routes Unprotected** ⚠️ CRITICAL
   - `/api/bookings` (GET, PATCH) - Anyone can view/modify all bookings
   - `/api/admin/*` - All admin endpoints are public
   - **Action Required**: Implement authentication (basic auth, Replit Auth, or session-based)

2. **Swikly Webhook Unverified** ⚠️ IMPORTANT
   - `/api/swikly-callback` accepts any request without signature verification
   - **Recommendation**: Validate Swikly signature or request origin

3. **Security Hardening Implemented** ✅
   - Stripe payment amount validation (server-side calculation, client input ignored)
   - Drizzle ORM protects against SQL injection
   - React sanitizes XSS by default
   - Zod validates all user inputs

**Future Considerations**
- Admin authentication should be implemented before production deployment
- Session-based auth infrastructure already available via dependencies
- Consider rate limiting on payment and booking routes
- Add error monitoring and logging

### Payment & Deposit Flow

**Two-Step Booking Process** (Updated November 14, 2025)

The booking flow consists of two distinct steps to ensure secure transactions:

1. **Step 1: Swikly Deposit (Bank Authorization)**
   - Purpose: Security deposit / guarantee
   - Amount: 500€ bank authorization (NO actual charge)
   - Process: Customer authorizes a hold on their card
   - Result: No money is debited; hold is automatically released 48h after event
   - Page: `/booking-confirmation` with prominent Swikly call-to-action

2. **Step 2: Stripe Payment (Actual Charge)**
   - Purpose: Payment for the rental
   - Amount: Total booking cost (machines + syrups)
   - Process: Customer pays via Stripe payment form
   - Result: Actual charge to customer's card
   - Page: `/checkout` with Stripe Elements payment form

**User Experience Flow:**
```
/booking (form) 
  → POST /api/bookings (creates booking + Swikly request)
  → /booking-confirmation (shows "Step 1/2: Swikly")
  → User clicks "Valider la caution (aucun débit)"
  → Swikly external page (bank authorization)
  → Redirect to /checkout (shows "Step 2/2: Payment")
  → Stripe payment form
  → /success (booking confirmed)
```

**Communication Clarity:**
- All user-facing text explicitly states "Step 1/2" and "Step 2/2"
- Swikly labeled as "bank authorization" with "no debit" messaging
- Stripe labeled as actual payment with specific amount
- Email notifications mirror same two-step messaging
- Timeline indicators show both steps upfront

### External Dependencies

**Payment Processing**
- **Stripe**: Payment gateway for booking transactions
  - Client-side: `@stripe/stripe-js`, `@stripe/react-stripe-js`
  - Server-side: `stripe` npm package with API version 2025-09.30.clover
  - Webhook endpoint for payment confirmation at `/api/webhook/stripe`
  - Environment: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`
  - Payment intent created in `/api/create-payment-intent`
  - Checkout page at `/checkout` with Stripe Elements

**Deposit Management**
- **Swikly**: Third-party deposit/security guarantee service
  - API integration for creating deposit requests (€500 default)
  - Sandbox and production environment support
  - Environment: `SWIKLY_API_KEY`, `SWIKLY_API_SECRET`, `SWIKLY_ENVIRONMENT`
  - Automatically switches to production mode when NODE_ENV=production
  - Confirmation page at `/booking-confirmation` explains two-step flow

**Email Service**
- **Nodemailer**: Email delivery for booking confirmations
  - Production: Custom SMTP configuration
  - Development: Ethereal email for testing
  - Environment: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

**Database**
- **Neon PostgreSQL**: Serverless Postgres database
  - WebSocket connection for serverless compatibility
  - Environment: `DATABASE_URL`

**Development Tools**
- Replit-specific plugins for development environment (`@replit/vite-plugin-*`)
- TypeScript for static type checking across entire codebase
- ESBuild for server-side code bundling in production

**Build & Deployment**
- Production build: Vite builds client to `dist/public/`, ESBuild bundles server to `dist/`
- Development: TSX for running TypeScript server with hot reload
- Environment variable validation on startup for critical services