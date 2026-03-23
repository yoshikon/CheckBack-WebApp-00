# CheckBack - Design Review & Feedback Management

## Overview

CheckBack is a web-based design review and feedback management platform that enables designers to collect, track, and resolve feedback on design files. The application allows users to create projects, upload design files (images/PDFs), add location-specific comments with visual pins, share files with external reviewers via secure links, and track comment resolution status through a workflow system.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for client-side routing (lightweight alternative to React Router)
- **State Management**: TanStack Query (React Query) for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming (light/dark mode support)
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **API Design**: RESTful JSON API endpoints under `/api/` prefix
- **File Uploads**: Multer middleware for handling multipart file uploads, stored in local `uploads/` directory
- **Authentication**: Simple token-based auth stored in localStorage (user ID passed via `x-user-id` header)

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all table definitions shared between client and server
- **Validation**: Zod schemas generated from Drizzle schemas using `drizzle-zod`
- **Storage Abstraction**: `IStorage` interface in `server/storage.ts` with in-memory implementation (designed for easy swap to database)

### Key Data Models
- **Users**: Authentication and user profiles
- **Projects**: Container for design files, with metadata like client name and due date
- **Files**: Uploaded design assets (images, PDFs) linked to projects
- **Comments**: Feedback items with status tracking (open, in_progress, resolved)
- **CommentAnchors**: Coordinate data linking comments to specific locations on files
- **ShareLinks**: Secure token-based links for external reviewer access

### Key Pages
- **Home** (`/home`): Shows "最近のトーク" (placeholder) and "最近閲覧したファイル" (tracked via localStorage)
- **Quick Check** (`/quick-check`): Quick file upload and web page capture with Basic認証 support
- **Dashboard** (`/dashboard`): Project statistics and recent projects overview
- **Projects** (`/projects`): Project listing with create/delete functionality
- **File Review** (`/files/:id`): File viewing with comment pins, paint mode, zoom controls, share link creation, and **Compare Mode** (見比べ機能) for side-by-side file comparison with optional video sync
- **File Compare** (`/projects/:projectId/compare`): Side-by-side version comparison (legacy route)
- **Guest Review** (`/s/:token`): External reviewer access via secure share links

### Build System
- **Development**: Vite dev server with HMR proxied through Express
- **Production**: Custom build script using esbuild for server bundling, Vite for client

## External Dependencies

### Database
- PostgreSQL (configured via `DATABASE_URL` environment variable)
- Drizzle Kit for schema migrations (`db:push` command)

### PSD Rendering Architecture
- **Parser**: ag-psd (replaces older psd library) for accurate PSD file parsing
- **Preview Generation**: Uses embedded composite image from PSD for pixel-perfect Photoshop-matching previews
- **Layer Extraction**: Full extraction of blend modes, layer effects (drop shadow, outer/inner glow, inner shadow, stroke, color/gradient overlay), fill opacity, masks (with invert support), clipping masks, text layers, smart objects, adjustment layers
- **Client Compositing**: Canvas 2D API with proper globalCompositeOperation mapping for blend modes (multiply, screen, overlay, darken, lighten, color-dodge, color-burn, hard-light, soft-light, difference, exclusion, hue, saturation, color, luminosity, with fallbacks for unsupported modes like linear-burn→multiply, vivid-light→hard-light)
- **Layer Effects**: Client-side rendering of drop shadows, outer/inner glow, inner shadow, stroke (outside/inside/center), color overlay, gradient overlay with proper compositing order
- **PNG Generation**: pngjs for converting raw ImageData to PNG files server-side

### Third-Party Libraries
- **Radix UI**: Accessible UI primitive components
- **TanStack Query**: Async state management
- **Multer**: File upload handling
- **ag-psd**: PSD file parsing with full layer data extraction
- **pngjs**: PNG image encoding for server-side image generation
- **Puppeteer**: Headless browser for web page capture (requires PUPPETEER_EXECUTABLE_PATH env var)
- **date-fns**: Date formatting utilities
- **Zod**: Runtime type validation

### Development Tools
- **Replit Plugins**: Runtime error overlay, cartographer, and dev banner for Replit environment
- **TypeScript**: Strict mode enabled with path aliases (`@/` for client, `@shared/` for shared code)