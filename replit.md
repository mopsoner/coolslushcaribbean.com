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
- **Bookings**: Store customer reservations with date, time slots, customer info, payment status, and external references (Stripe, Swikly)
- **Offers**: Define rental offers (1 Journée, Week-end, Événement) with default prices
- **Price Configurations**: Store pricing rules per offer, with optional machine-specific overrides

**Validation Strategy**
- Shared Zod schemas between client and server for consistent validation
- Schema inference for TypeScript types ensures type safety across the stack

### Dynamic Pricing System

**Architecture** (Added October 6, 2025)
- Database-driven pricing with admin-managed offer configurations
- Support for default offer pricing and optional machine-specific overrides
- Real-time price calculation on frontend and backend

**Admin Interface**
- Back-office pricing management at `/admin/pricing`
- CRUD operations for offers and price configurations
- Edit/delete/create pricing rules through intuitive UI
- Automatic cache invalidation via React Query

**Pricing Flow**
1. Admin defines offers (1 Journée, Week-end, Événement) with default prices in database
2. Optional: Admin sets machine-specific price overrides
3. Customer booking form fetches offers via GET `/api/offers`
4. Frontend calculates and displays total: `price × machineCount`
5. Backend validates and recalculates on booking creation using `storage.getOfferByName()` and `storage.getEffectivePrice()`
6. Final totalCents stored in booking record for payment processing

**Default Offers** (Seeded)
- "1 Journée": 150€ per machine
- "Week-end": 250€ per machine
- "Événement": 350€ per machine

**Testing Configuration**
- **TEMPORARY**: Swikly deposit set to 1€ (100 cents) for testing purposes
- **TODO**: Restore to 500€ before production deployment

### Authentication and Authorization

**Current Implementation**
- No authentication system implemented
- Admin routes (`/admin/bookings`) are publicly accessible
- Session management infrastructure present but not actively used (connect-pg-simple installed)

**Future Considerations**
- Admin authentication should be implemented before production deployment
- Session-based auth infrastructure already available via dependencies

### External Dependencies

**Payment Processing**
- **Stripe**: Payment gateway for booking transactions
  - Client-side: `@stripe/stripe-js`, `@stripe/react-stripe-js`
  - Server-side: `stripe` npm package with API version 2025-09.30.clover
  - Webhook endpoint for payment confirmation at `/api/webhook/stripe`
  - Environment: `STRIPE_SECRET_KEY`, `VITE_STRIPE_PUBLIC_KEY`

**Deposit Management**
- **Swikly**: Third-party deposit/security guarantee service
  - API integration for creating deposit requests (€500 default)
  - Sandbox and production environment support
  - Environment: `SWIKLY_API_KEY`, `SWIKLY_API_SECRET`, `SWIKLY_ENVIRONMENT`
  - **TEMPORARY**: Currently forced to use sandbox mode even in production for testing (see `server/swikly.ts` line 193)
  - **TODO**: Switch to production Swikly credentials before final deployment

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