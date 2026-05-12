# 🏗️ Village Water Management System — Project Architecture

> **Role**: Staff Engineer  
> **Tech Stack**: NestJS + Prisma + PostgreSQL (Neon) | Next.js (App Router) + TypeScript + TailwindCSS  
> **Last Updated**: 2026-02-25

---

## 📐 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│              Next.js App Router + TailwindCSS            │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS (Axios)
                         ▼
┌─────────────────────────────────────────────────────────┐
│                   API GATEWAY (NestJS)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │   Auth    │ │  Guards  │ │  Pipes   │ │ Interceptor│ │
│  │  Module   │ │  (RBAC)  │ │(Validate)│ │ (Logging)  │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │  Users   │ │  Meters  │ │ Readings │ │  Billing   │ │
│  │  Module  │ │  Module  │ │  Module  │ │   Module   │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
└────────────────────────┬────────────────────────────────┘
                         │ Prisma ORM
                         ▼
┌─────────────────────────────────────────────────────────┐
│              PostgreSQL (Neon Serverless)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 1. 📁 โครงสร้างโฟลเดอร์ Backend (`/backend`)

```
backend/
├── prisma/
│   ├── schema.prisma                 # Database schema
│   ├── seed.ts                       # Database seeder
│   └── migrations/                   # Auto-generated migrations
│
├── src/
│   ├── main.ts                       # Bootstrap & server entry
│   ├── app.module.ts                 # Root module
│   ├── app.controller.ts             # Health check endpoint
│   ├── app.service.ts                # App-level service
│   │
│   ├── config/                       # ⚙️ Configuration
│   │   ├── index.ts                  # Config barrel export
│   │   ├── app.config.ts             # App configuration (port, cors)
│   │   ├── database.config.ts        # Database configuration
│   │   ├── jwt.config.ts             # JWT secret, expiration
│   │   └── validation.schema.ts      # Joi/Zod env validation
│   │
│   ├── common/                       # 🔧 Shared utilities
│   │   ├── constants/
│   │   │   ├── index.ts
│   │   │   ├── roles.constant.ts     # Role enum (ADMIN, STAFF, VIEWER)
│   │   │   └── app.constant.ts       # App-wide constants
│   │   │
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts    # @Roles() decorator
│   │   │   ├── public.decorator.ts   # @Public() decorator
│   │   │   └── current-user.decorator.ts  # @CurrentUser() decorator
│   │   │
│   │   ├── dto/
│   │   │   ├── pagination.dto.ts     # PaginationQueryDto
│   │   │   └── api-response.dto.ts   # StandardResponseDto
│   │   │
│   │   ├── enums/
│   │   │   ├── role.enum.ts          # UserRole enum
│   │   │   ├── meter-status.enum.ts  # MeterStatus enum
│   │   │   └── payment-status.enum.ts # PaymentStatus enum
│   │   │
│   │   ├── filters/
│   │   │   ├── http-exception.filter.ts       # HTTP exception filter
│   │   │   └── all-exceptions.filter.ts       # Global catch-all filter
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts     # JWT authentication guard
│   │   │   └── roles.guard.ts        # RBAC authorization guard
│   │   │
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts         # Request/Response logging
│   │   │   ├── transform.interceptor.ts       # Response transformation
│   │   │   └── timeout.interceptor.ts         # Request timeout
│   │   │
│   │   ├── interfaces/
│   │   │   ├── jwt-payload.interface.ts       # JWT payload type
│   │   │   └── request-user.interface.ts      # Request user type
│   │   │
│   │   ├── pipes/
│   │   │   └── parse-int-id.pipe.ts  # ID parameter validation
│   │   │
│   │   └── utils/
│   │       ├── hash.util.ts          # bcrypt helper
│   │       ├── date.util.ts          # Date formatting helpers
│   │       └── pagination.util.ts    # Pagination calculator
│   │
│   ├── modules/                      # 📦 Feature modules
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/
│   │   │   │   ├── jwt.strategy.ts
│   │   │   │   └── local.strategy.ts
│   │   │   └── dto/
│   │   │       ├── login.dto.ts
│   │   │       ├── register.dto.ts
│   │   │       ├── refresh-token.dto.ts
│   │   │       └── auth-response.dto.ts
│   │   │
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── users.repository.ts
│   │   │   └── dto/
│   │   │       ├── create-user.dto.ts
│   │   │       ├── update-user.dto.ts
│   │   │       └── user-response.dto.ts
│   │   │
│   │   ├── meters/
│   │   │   ├── meters.module.ts
│   │   │   ├── meters.controller.ts
│   │   │   ├── meters.service.ts
│   │   │   ├── meters.repository.ts
│   │   │   └── dto/
│   │   │       ├── create-meter.dto.ts
│   │   │       ├── update-meter.dto.ts
│   │   │       └── meter-response.dto.ts
│   │   │
│   │   ├── readings/
│   │   │   ├── readings.module.ts
│   │   │   ├── readings.controller.ts
│   │   │   ├── readings.service.ts
│   │   │   ├── readings.repository.ts
│   │   │   └── dto/
│   │   │       ├── create-reading.dto.ts
│   │   │       ├── update-reading.dto.ts
│   │   │       └── reading-response.dto.ts
│   │   │
│   │   ├── billing/
│   │   │   ├── billing.module.ts
│   │   │   ├── billing.controller.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── billing.repository.ts
│   │   │   └── dto/
│   │   │       ├── create-bill.dto.ts
│   │   │       ├── update-bill.dto.ts
│   │   │       └── bill-response.dto.ts
│   │   │
│   │   ├── reports/
│   │   │   ├── reports.module.ts
│   │   │   ├── reports.controller.ts
│   │   │   ├── reports.service.ts
│   │   │   └── dto/
│   │   │       ├── report-query.dto.ts
│   │   │       └── report-response.dto.ts
│   │   │
│   │   └── settings/
│   │       ├── settings.module.ts
│   │       ├── settings.controller.ts
│   │       ├── settings.service.ts
│   │       └── dto/
│   │           ├── update-settings.dto.ts
│   │           └── settings-response.dto.ts
│   │
│   ├── database/                     # 🗄️ Database layer
│   │   ├── database.module.ts
│   │   └── prisma.service.ts         # PrismaClient lifecycle
│   │
│   └── logger/                       # 📝 Logging
│       ├── logger.module.ts
│       ├── logger.service.ts         # Custom Winston logger
│       └── logger.middleware.ts      # HTTP request logger
│
├── test/                             # 🧪 E2E tests
│   ├── app.e2e-spec.ts
│   ├── auth.e2e-spec.ts
│   └── jest-e2e.json
│
├── logs/                             # 📋 Log output (git-ignored)
│   ├── error.log
│   ├── combined.log
│   └── access.log
│
├── .env                              # Environment variables (git-ignored)
├── .env.example                      # Environment template
├── .eslintrc.js                      # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── nest-cli.json                     # NestJS CLI config
├── tsconfig.json                     # TypeScript config
├── tsconfig.build.json               # Build-specific TS config
├── package.json
└── README.md
```

---

## 2. 📁 โครงสร้างโฟลเดอร์ Frontend (`/frontend`)

```
frontend/
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│       └── placeholder.png
│
├── src/
│   ├── app/                          # 🗂️ Next.js App Router
│   │   ├── layout.tsx                # Root layout (fonts, providers)
│   │   ├── page.tsx                  # Landing / redirect page
│   │   ├── loading.tsx               # Global loading UI
│   │   ├── error.tsx                 # Global error UI
│   │   ├── not-found.tsx             # 404 page
│   │   ├── globals.css               # Global styles
│   │   │
│   │   ├── (auth)/                   # 🔐 Auth group (no sidebar layout)
│   │   │   ├── layout.tsx            # Auth-specific layout (centered)
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── forgot-password/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (dashboard)/              # 📊 Dashboard group (with sidebar)
│   │   │   ├── layout.tsx            # Dashboard layout (sidebar + topbar)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx          # Main dashboard / overview
│   │   │   ├── meters/
│   │   │   │   ├── page.tsx          # Meter list
│   │   │   │   ├── [id]/
│   │   │   │   │   └── page.tsx      # Meter detail
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # Add new meter
│   │   │   ├── readings/
│   │   │   │   ├── page.tsx          # Reading records
│   │   │   │   └── new/
│   │   │   │       └── page.tsx      # Record new reading
│   │   │   ├── billing/
│   │   │   │   ├── page.tsx          # Billing list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Bill detail
│   │   │   ├── reports/
│   │   │   │   └── page.tsx          # Reports & analytics
│   │   │   ├── users/                # 👤 Admin-only pages
│   │   │   │   ├── page.tsx          # User management
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # User detail / edit
│   │   │   └── settings/
│   │   │       └── page.tsx          # System settings
│   │   │
│   │   └── api/                      # (Optional) API routes / proxy
│   │       └── health/
│   │           └── route.ts
│   │
│   ├── components/                   # 🧩 Reusable UI Components
│   │   ├── ui/                       # Atomic/base components
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Pagination.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── Avatar.tsx
│   │   │
│   │   ├── layout/                   # Layout-specific components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── MobileNav.tsx
│   │   │   └── BreadCrumb.tsx
│   │   │
│   │   ├── forms/                    # Form components
│   │   │   ├── MeterForm.tsx
│   │   │   ├── ReadingForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── LoginForm.tsx
│   │   │
│   │   ├── charts/                   # Chart/visualization components
│   │   │   ├── UsageChart.tsx
│   │   │   ├── RevenueChart.tsx
│   │   │   └── StatsCard.tsx
│   │   │
│   │   └── shared/                   # Cross-cutting components
│   │       ├── ProtectedRoute.tsx    # Auth + role guard
│   │       ├── RoleGate.tsx          # Conditional render by role
│   │       ├── EmptyState.tsx
│   │       ├── ErrorBoundary.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── hooks/                        # 🪝 Custom hooks
│   │   ├── useAuth.ts                # Auth state & actions
│   │   ├── useUser.ts                # Current user data
│   │   ├── useMeters.ts              # Meter CRUD operations
│   │   ├── useReadings.ts            # Reading operations
│   │   ├── useBilling.ts             # Billing operations
│   │   ├── useDebounce.ts            # Debounce utility
│   │   ├── usePagination.ts          # Pagination state
│   │   └── useToast.ts              # Toast notification
│   │
│   ├── lib/                          # 📚 Core libraries
│   │   ├── axios.ts                  # Axios instance + interceptors
│   │   ├── auth.ts                   # Token management utilities
│   │   └── utils.ts                  # General utility functions
│   │
│   ├── services/                     # 🌐 API service layer
│   │   ├── api.ts                    # Base API configuration
│   │   ├── auth.service.ts           # Auth API calls
│   │   ├── user.service.ts           # User API calls
│   │   ├── meter.service.ts          # Meter API calls
│   │   ├── reading.service.ts        # Reading API calls
│   │   ├── billing.service.ts        # Billing API calls
│   │   ├── report.service.ts         # Report API calls
│   │   └── settings.service.ts       # Settings API calls
│   │
│   ├── stores/                       # 🏬 State management (Zustand)
│   │   ├── auth.store.ts             # Authentication state
│   │   ├── ui.store.ts               # UI state (sidebar, theme)
│   │   └── notification.store.ts     # Notification state
│   │
│   ├── types/                        # 📝 TypeScript types
│   │   ├── auth.types.ts
│   │   ├── user.types.ts
│   │   ├── meter.types.ts
│   │   ├── reading.types.ts
│   │   ├── billing.types.ts
│   │   ├── report.types.ts
│   │   ├── api.types.ts              # API response generics
│   │   └── common.types.ts           # Shared types
│   │
│   ├── constants/                    # 📌 Constants
│   │   ├── routes.ts                 # Route path constants
│   │   ├── roles.ts                  # Role definitions
│   │   ├── menu.ts                   # Sidebar menu config (per role)
│   │   └── api-endpoints.ts          # API endpoint constants
│   │
│   ├── providers/                    # 🔌 Context providers
│   │   ├── AuthProvider.tsx          # Auth context provider
│   │   ├── ThemeProvider.tsx         # Theme context provider
│   │   └── ToastProvider.tsx         # Toast context provider
│   │
│   └── middleware.ts                 # Next.js edge middleware (auth redirect)
│
├── .env.local                        # Environment variables (git-ignored)
├── .env.example                      # Environment template
├── .eslintrc.json                    # ESLint configuration
├── .prettierrc                       # Prettier configuration
├── tailwind.config.ts                # TailwindCSS configuration
├── postcss.config.mjs                # PostCSS configuration
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript config
├── package.json
└── README.md
```

---

## 3. 📦 รายการ Dependencies

### Backend Dependencies

```jsonc
// backend/package.json
{
  "dependencies": {
    // Core
    "@nestjs/common": "^10.x",
    "@nestjs/core": "^10.x",
    "@nestjs/platform-express": "^10.x",

    // Authentication
    "@nestjs/jwt": "^10.x",
    "@nestjs/passport": "^10.x",
    "passport": "^0.7.x",
    "passport-jwt": "^4.x",
    "passport-local": "^1.x",
    "bcryptjs": "^2.4.x",

    // Database
    "@prisma/client": "^6.x",
    "@prisma/adapter-neon": "^6.x",          // Neon serverless adapter
    "@neondatabase/serverless": "^0.10.x",    // Neon serverless driver

    // Validation
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",

    // Configuration
    "@nestjs/config": "^3.x",
    "joi": "^17.x",                           // Env validation

    // Logging
    "winston": "^3.x",
    "nest-winston": "^1.x",

    // Utilities
    "rxjs": "^7.x",
    "helmet": "^7.x",                         // Security headers
    "compression": "^1.x",
    "cookie-parser": "^1.x",
    "@nestjs/throttler": "^6.x",              // Rate limiting
    "dayjs": "^1.x"                           // Date utility
  },
  "devDependencies": {
    // Build & TypeScript
    "@nestjs/cli": "^10.x",
    "@nestjs/schematics": "^10.x",
    "typescript": "^5.x",
    "ts-node": "^10.x",
    "tsconfig-paths": "^4.x",

    // Database
    "prisma": "^6.x",

    // Types
    "@types/node": "^22.x",
    "@types/express": "^5.x",
    "@types/passport-jwt": "^4.x",
    "@types/passport-local": "^1.x",
    "@types/bcryptjs": "^2.x",
    "@types/cookie-parser": "^1.x",
    "@types/compression": "^1.x",

    // Testing
    "@nestjs/testing": "^10.x",
    "jest": "^29.x",
    "@types/jest": "^29.x",
    "ts-jest": "^29.x",
    "supertest": "^7.x",
    "@types/supertest": "^6.x",

    // Linting & Formatting
    "eslint": "^9.x",
    "@typescript-eslint/parser": "^8.x",
    "@typescript-eslint/eslint-plugin": "^8.x",
    "prettier": "^3.x",
    "eslint-config-prettier": "^9.x",
    "eslint-plugin-prettier": "^5.x"
  }
}
```

### Frontend Dependencies

```jsonc
// frontend/package.json
{
  "dependencies": {
    // Core
    "next": "^15.x",
    "react": "^19.x",
    "react-dom": "^19.x",

    // HTTP Client
    "axios": "^1.x",

    // State Management
    "zustand": "^5.x",

    // Forms
    "react-hook-form": "^7.x",
    "@hookform/resolvers": "^3.x",
    "zod": "^3.x",

    // UI Enhancement
    "lucide-react": "^0.470.x",              // Icons
    "recharts": "^2.x",                       // Charts
    "sonner": "^1.x",                         // Toast notifications
    "clsx": "^2.x",                           // Classname utility
    "tailwind-merge": "^2.x",                 // TailwindCSS merge

    // Date
    "dayjs": "^1.x",

    // Animation
    "framer-motion": "^11.x"
  },
  "devDependencies": {
    // TypeScript
    "typescript": "^5.x",
    "@types/node": "^22.x",
    "@types/react": "^19.x",
    "@types/react-dom": "^19.x",

    // Styling
    "tailwindcss": "^4.x",
    "@tailwindcss/postcss": "^4.x",

    // Linting & Formatting
    "eslint": "^9.x",
    "eslint-config-next": "^15.x",
    "prettier": "^3.x",
    "prettier-plugin-tailwindcss": "^0.6.x",

    // Testing
    "vitest": "^2.x",
    "@testing-library/react": "^16.x",
    "@testing-library/jest-dom": "^6.x"
  }
}
```

---

## 4. 🔐 โครงสร้าง `.env`

### Backend `.env`

```env
# ═══════════════════════════════════════════
# 🔧 APPLICATION
# ═══════════════════════════════════════════
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1
CORS_ORIGIN=http://localhost:3000

# ═══════════════════════════════════════════
# 🗄️ DATABASE (Neon PostgreSQL)
# ═══════════════════════════════════════════
# Connection string for Prisma migrations & direct queries
DATABASE_URL=postgresql://<user>:<password>@<host>.neon.tech/<database>?sslmode=require

# Pooled connection string (for application runtime)
DATABASE_URL_POOLED=postgresql://<user>:<password>@<host>.neon.tech/<database>?sslmode=require&pgbouncer=true

# Direct connection (for Prisma migrations only)
DIRECT_URL=postgresql://<user>:<password>@<host>.neon.tech/<database>?sslmode=require

# ═══════════════════════════════════════════
# 🔑 JWT AUTHENTICATION
# ═══════════════════════════════════════════
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_EXPIRATION=7d

# ═══════════════════════════════════════════
# 📝 LOGGING
# ═══════════════════════════════════════════
LOG_LEVEL=debug
LOG_DIR=./logs

# ═══════════════════════════════════════════
# 🔒 SECURITY
# ═══════════════════════════════════════════
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
BCRYPT_SALT_ROUNDS=12

# ═══════════════════════════════════════════
# 📧 (FUTURE) EMAIL / NOTIFICATIONS
# ═══════════════════════════════════════════
# SMTP_HOST=smtp.example.com
# SMTP_PORT=587
# SMTP_USER=
# SMTP_PASS=
```

### Frontend `.env.local`

```env
# ═══════════════════════════════════════════
# 🌐 API CONFIGURATION
# ═══════════════════════════════════════════
NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
NEXT_PUBLIC_APP_NAME=ระบบจัดการประปาหมู่บ้าน
NEXT_PUBLIC_APP_VERSION=1.0.0

# ═══════════════════════════════════════════
# 🔧 ENVIRONMENT
# ═══════════════════════════════════════════
NEXT_PUBLIC_ENV=development

# ═══════════════════════════════════════════
# 📊 (FUTURE) ANALYTICS
# ═══════════════════════════════════════════
# NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
```

---

## 5. 📏 Coding Standard

### 5.1 General Rules

| Rule | Standard |
|------|----------|
| **Language** | TypeScript strict mode (`"strict": true`) |
| **Formatting** | Prettier (2-space indent, single quotes, trailing comma) |
| **Linting** | ESLint with TypeScript plugin |
| **Max line length** | 100 characters (soft limit) |
| **File encoding** | UTF-8 |
| **Line endings** | LF (Unix-style) |
| **Semicolons** | Required (`;`) |
| **Quotes** | Single quotes (`'`) for strings |
| **Trailing comma** | Always (`es5` or `all`) |

### 5.2 Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### 5.3 TypeScript Rules

```typescript
// ✅ DO: Use explicit return types for public methods
async findAll(): Promise<User[]> {
  return this.prisma.user.findMany();
}

// ❌ DON'T: Use `any` type
function processData(data: any) { } // BAD

// ✅ DO: Use proper types/interfaces
function processData(data: UserDto) { } // GOOD

// ✅ DO: Use readonly for immutable properties
interface Config {
  readonly port: number;
  readonly host: string;
}

// ✅ DO: Use enum for fixed values
enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  VIEWER = 'VIEWER',
}

// ✅ DO: Use optional chaining and nullish coalescing
const name = user?.profile?.name ?? 'Unknown';
```

### 5.4 NestJS-Specific Standards

```typescript
// ✅ Module structure: Always follow the pattern
// module → controller → service → repository

// ✅ Use dependency injection (constructor injection)
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {}
}

// ✅ Always use DTOs for input validation
@Post()
async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
  return this.usersService.create(createUserDto);
}

// ✅ Use class-validator decorators for DTO validation
export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @IsEmail()
  email: string;

  @IsEnum(UserRole)
  role: UserRole;
}

// ✅ Use custom decorators for cross-cutting concerns
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('users')
export class UsersController { }
```

### 5.5 React/Next.js Standards

```typescript
// ✅ Use functional components with TypeScript interfaces
interface MeterCardProps {
  meter: Meter;
  onEdit: (id: string) => void;
  isLoading?: boolean;
}

export const MeterCard: React.FC<MeterCardProps> = ({ meter, onEdit, isLoading = false }) => {
  // ...
};

// ✅ Separate server and client components
// Server Component (default) — no 'use client' directive
export default async function MetersPage() {
  // Can fetch data directly
}

// Client Component — needs interactivity
'use client';
export const MeterForm: React.FC<MeterFormProps> = () => {
  const [value, setValue] = useState('');
  // ...
};

// ✅ Use custom hooks for reusable logic
export function useMeters() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ...
  return { meters, isLoading, createMeter, updateMeter, deleteMeter };
}

// ✅ Handle loading, error, and empty states
{isLoading && <Skeleton />}
{error && <ErrorState message={error.message} />}
{!isLoading && data.length === 0 && <EmptyState />}
{data.length > 0 && <DataTable data={data} />}
```

### 5.6 Error Handling Standard

```typescript
// Backend: Use NestJS HttpException hierarchy
throw new NotFoundException(`Meter #${id} not found`);
throw new ForbiddenException('Insufficient permissions');
throw new BadRequestException('Invalid meter reading');

// Backend: Global filter returns consistent format
{
  "success": false,
  "statusCode": 404,
  "message": "Meter #123 not found",
  "error": "Not Found",
  "timestamp": "2026-02-25T06:52:35.000Z",
  "path": "/api/v1/meters/123"
}

// Frontend: Axios interceptor for global error handling
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login
      authStore.logout();
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data ?? error);
  },
);
```

### 5.7 API Response Standard

```typescript
// ✅ Consistent API response format
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ✅ Example success response
{
  "success": true,
  "data": { "id": 1, "meterNumber": "WM-001", ... },
  "message": "Meter created successfully"
}

// ✅ Example paginated response
{
  "success": true,
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

---

## 6. 🏷️ Naming Convention

### 6.1 File Naming

| Category | Convention | Example |
|----------|-----------|---------|
| **NestJS Module** | `kebab-case.module.ts` | `users.module.ts` |
| **NestJS Controller** | `kebab-case.controller.ts` | `users.controller.ts` |
| **NestJS Service** | `kebab-case.service.ts` | `users.service.ts` |
| **NestJS Repository** | `kebab-case.repository.ts` | `users.repository.ts` |
| **NestJS DTO** | `kebab-case.dto.ts` | `create-user.dto.ts` |
| **NestJS Guard** | `kebab-case.guard.ts` | `jwt-auth.guard.ts` |
| **NestJS Filter** | `kebab-case.filter.ts` | `http-exception.filter.ts` |
| **NestJS Interceptor** | `kebab-case.interceptor.ts` | `logging.interceptor.ts` |
| **NestJS Decorator** | `kebab-case.decorator.ts` | `roles.decorator.ts` |
| **NestJS Strategy** | `kebab-case.strategy.ts` | `jwt.strategy.ts` |
| **NestJS Interface** | `kebab-case.interface.ts` | `jwt-payload.interface.ts` |
| **NestJS Pipe** | `kebab-case.pipe.ts` | `parse-int-id.pipe.ts` |
| **NestJS Constant** | `kebab-case.constant.ts` | `roles.constant.ts` |
| **NestJS Enum** | `kebab-case.enum.ts` | `role.enum.ts` |
| **React Component** | `PascalCase.tsx` | `MeterCard.tsx` |
| **React Hook** | `camelCase.ts` | `useMeters.ts` |
| **React Context/Provider** | `PascalCase.tsx` | `AuthProvider.tsx` |
| **Next.js Page** | `page.tsx` (convention) | `app/meters/page.tsx` |
| **Next.js Layout** | `layout.tsx` (convention) | `app/(dashboard)/layout.tsx` |
| **Service/API** | `kebab-case.service.ts` | `meter.service.ts` |
| **Type Definition** | `kebab-case.types.ts` | `meter.types.ts` |
| **Utility** | `kebab-case.util.ts` | `date.util.ts` |
| **Store** | `kebab-case.store.ts` | `auth.store.ts` |
| **Test** | `*.spec.ts` or `*.test.ts` | `users.service.spec.ts` |
| **Prisma Schema** | `schema.prisma` | `prisma/schema.prisma` |

### 6.2 Variable & Function Naming

| Category | Convention | Example |
|----------|-----------|---------|
| **Variable** | `camelCase` | `meterReading`, `totalUsage` |
| **Constant** | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE` |
| **Function** | `camelCase` (verb prefix) | `getMeterById()`, `calculateUsage()` |
| **Class** | `PascalCase` | `UsersService`, `MeterCard` |
| **Interface** | `PascalCase` (no `I` prefix) | `UserProfile`, `MeterReading` |
| **Type** | `PascalCase` | `ApiResponse<T>`, `UserRole` |
| **Enum** | `PascalCase` | `UserRole`, `MeterStatus` |
| **Enum member** | `UPPER_SNAKE_CASE` | `UserRole.ADMIN`, `MeterStatus.ACTIVE` |
| **Boolean** | `is/has/can/should` prefix | `isActive`, `hasPermission` |
| **Array** | Plural noun | `users`, `meterReadings` |
| **Event handler** | `handle` prefix | `handleSubmit`, `handleDelete` |
| **Callback prop** | `on` prefix | `onSubmit`, `onChange` |
| **Private field** | No underscore (use `private`) | `private readonly logger` |

### 6.3 API Endpoint Naming

| Method | Convention | Example |
|--------|-----------|---------|
| **GET (list)** | `GET /resource` | `GET /api/v1/meters` |
| **GET (detail)** | `GET /resource/:id` | `GET /api/v1/meters/123` |
| **POST (create)** | `POST /resource` | `POST /api/v1/meters` |
| **PATCH (update)** | `PATCH /resource/:id` | `PATCH /api/v1/meters/123` |
| **DELETE (remove)** | `DELETE /resource/:id` | `DELETE /api/v1/meters/123` |
| **GET (nested)** | `GET /resource/:id/sub` | `GET /api/v1/meters/123/readings` |
| **POST (action)** | `POST /resource/:id/action` | `POST /api/v1/billing/123/pay` |

### 6.4 Database Naming (Prisma Schema)

| Category | Convention | Example |
|----------|-----------|---------|
| **Model** | `PascalCase` (singular) | `User`, `Meter`, `Reading` |
| **Field** | `camelCase` | `firstName`, `meterNumber` |
| **Relation field** | `camelCase` (model name) | `user`, `meter`, `readings` |
| **Table (@@map)** | `snake_case` (plural) | `@@map("users")`, `@@map("meters")` |
| **Column (@map)** | `snake_case` | `@map("first_name")` |
| **Enum** | `PascalCase` | `UserRole`, `MeterStatus` |
| **Index** | Auto-generated | `@@index([userId])` |

### 6.5 Git Convention

```
# Branch naming
feature/add-meter-readings
bugfix/fix-login-redirect
hotfix/patch-billing-calc
refactor/extract-auth-module

# Commit messages (Conventional Commits)
feat(meters): add meter CRUD endpoints
fix(auth): resolve token refresh race condition
chore(deps): update prisma to v6.3
docs(readme): add API documentation
test(billing): add unit tests for bill calculation
refactor(users): extract repository pattern
style(ui): improve meter card spacing
perf(readings): optimize batch insert query
```

---

## 7. 🔐 RBAC — Role-Based Access Control Matrix

| Resource | ADMIN | STAFF | VIEWER |
|----------|-------|-------|--------|
| Dashboard | ✅ Full | ✅ Full | ✅ View only |
| Users | ✅ CRUD | ❌ | ❌ |
| Meters | ✅ CRUD | ✅ CRUD | ✅ Read |
| Readings | ✅ CRUD | ✅ Create/Read | ✅ Read |
| Billing | ✅ CRUD | ✅ Create/Read | ✅ Read |
| Reports | ✅ Full | ✅ View | ✅ View |
| Settings | ✅ Full | ❌ | ❌ |

---

## 8. 🏃 Quick Start Commands

```bash
# Clone and setup
git clone <repo-url>

# Backend
cd backend
npm install
cp .env.example .env           # Fill in your values
npx prisma generate            # Generate Prisma Client
npx prisma migrate dev         # Run migrations
npx prisma db seed             # Seed initial data
npm run start:dev              # Start dev server → http://localhost:4000

# Frontend
cd frontend
npm install
cp .env.example .env.local     # Fill in your values
npm run dev                    # Start dev server → http://localhost:3000
```

---

## 9. 📁 Root Project Structure

```
Water-system/
├── backend/                   # NestJS API server
├── frontend/                  # Next.js web application
├── docker-compose.yml         # Local dev orchestration (optional)
├── .gitignore                 # Root gitignore
├── PROJECT_ARCHITECTURE.md    # This document
└── README.md                  # Project overview
```
