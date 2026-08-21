# Smart Mess Management & Automation System
## Phase 1 — Foundation, Authentication, Identity & QR Credentials

The **Smart Mess Management & Automation System** is a university-wide multi-mess platform designed to automate mess operations, starting with student identification and digital credential management across all 10 university dining facilities.

---

## 1. Technology Stack

- **Framework**: Next.js 14+ (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom `@media print` physical card layout
- **Database & Authentication**: Supabase (PostgreSQL 15+, Supabase Auth with `@supabase/ssr`, Supabase Storage)
- **Validation**: Zod (Client-side and Server-side strict schemas)
- **Credential Generation**: Cryptographically secure opaque random token generator & `qrcode.react`
- **Testing**: Vitest test runner

---

## 2. Architecture & Key Design Decisions

```
Student QR Card (Physical / Soft Copy)
        ↓ (Opaque Token: MESS-CARD-XXXX-XXXX)
Mobile / Camera Scanner (Phase 2)
        ↓
Next.js API & SSR (Server-Side Auth & Validation)
        ↓
Supabase PostgreSQL Database (Row Level Security & Triggers)
```

1. **Strict University Authentication**: Only emails ending in `@uohyd.ac.in` are permitted for student registration. Non-university domains are rejected on both client and server layers.
2. **Mandatory First-Login Onboarding**: New students must complete mandatory profile fields (University Unique ID, Registration No, Full Name, Hostel, Course, Year, Semester, Assigned Mess, Photo) before accessing any dashboard features.
3. **Explicit QR Generation**: QR credentials are **never generated silently**. After saving their profile, students explicitly click **"GENERATE QR"**.
4. **Opaque & Zero-PII QR Tokens**: QR payloads contain **zero personal information** (no name, no university ID, no hostel, no photo). The payload consists solely of an opaque token (e.g. `MESS-CARD-XXXX-XXXX`).
5. **Idempotency & Race-Condition Protection**: Repeated clicks on "GENERATE QR" return the existing active credential without creating duplicates. The database enforces this via a partial unique index `idx_unique_active_credential_per_student ON mess_credentials (student_id) WHERE status = 'ACTIVE'`.
6. **Protected Mess Assignment**: `assigned_mess_id` is a protected administrative field. Students cannot alter their assigned mess once submitted.
7. **10 Seeded University Messes**: The platform initializes with exactly 10 messes: `Mess 1` through `Mess 10`.
8. **Controlled Admin Bootstrap**: Administrators are authorized server-side via the `ADMIN_EMAILS` environment variable. Privilege escalation from client-side requests is strictly blocked.

---

## 3. Environment Variables Setup

Create a `.env.local` file in the project root based on `.env.example`:

```bash
cp .env.example .env.local
```

Populate the required environment variables:

| Variable Name | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Browser) | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public (Browser) | Supabase Publishable / Anon key |
| `SUPABASE_SECRET_KEY` | Server-Only | Supabase Secret / Service Role key (**Never expose to client**) |
| `ADMIN_EMAILS` | Server-Only | Comma-separated pre-authorized admin emails (e.g. `admin@uohyd.ac.in`) |
| `NEXT_PUBLIC_APP_URL` | Public (Browser) | Base application URL (e.g. `http://localhost:3000`) |

> **Security Note**: Ensure `.env` and `.env.local` are in `.gitignore` and never committed to version control.

---

## 4. Database Setup & Migrations

All database schemas, triggers, RLS policies, and seed data are provided in the `supabase/` directory:

- `supabase/migrations/001_initial_schema.sql` — Creates `messes`, `user_roles`, `students`, and `mess_credentials` tables with indexes.
- `supabase/migrations/002_rls_and_security.sql` — Configures Row Level Security (RLS) policies and trigger-based field protection.
- `supabase/migrations/003_seed_messes.sql` — Seeds the 10 university messes (`Mess 1` to `Mess 10`).
- `supabase/seed.sql` — Complete one-step setup script.

### Running Migrations in Supabase:
1. Open your Supabase Project Dashboard.
2. Navigate to the **SQL Editor**.
3. Copy and paste the contents of `supabase/seed.sql`.
4. Click **Run**.

---

## 5. Local Development Commands

```bash
# Install dependencies
npm install

# Run automated test suite
npm run test

# Run TypeScript type check
npm run type-check

# Run production build
npm run build

# Start development server
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 6. Phase 1 Manual Verification Checklist

Follow this 14-step checklist to test the entire Phase 1 workflow:

| Step | Action | Expected Result |
| :--- | :--- | :--- |
| **TEST 1** | Register with `test@gmail.com` at `/signup` | Rejected: Only `@uohyd.ac.in` emails allowed. |
| **TEST 2** | Register with `student.test@uohyd.ac.in` and password | OTP verification prompt is shown; verification email dispatched. |
| **TEST 3** | Enter OTP code at `/verify-email` | Account verified and session created. |
| **TEST 4** | Attempt to directly visit `/dashboard` before profile completion | Automatically redirected to `/onboarding`. |
| **TEST 5** | Complete mandatory student profile at `/onboarding` and click Save | Profile saved; redirected to QR page with "GENERATE QR" action. |
| **TEST 6** | Click **"GENERATE QR"** button | Unique opaque QR credential (`MESS-CARD-XXXX-XXXX`) generated and rendered. |
| **TEST 7** | Click **"GENERATE QR"** again | Idempotent: Existing active credential is displayed; no duplicates created. |
| **TEST 8** | Click **"Print Physical QR Card"** | Browser print preview opens with clean card formatting (navbars/buttons hidden). |
| **TEST 9** | Refresh the browser / navigate across pages | Session persists smoothly without repeated login requests. |
| **TEST 10**| Click **"Logout"** | Session cleared; redirected to `/login`. |
| **TEST 11**| Log in again with email + password | Authenticated; redirected directly to Student Dashboard. |
| **TEST 12**| Student tries navigating to `/admin` | Denied / redirected back to `/dashboard`. |
| **TEST 13**| Log in with email listed in `ADMIN_EMAILS` | Admin Console accessible at `/admin`. |
| **TEST 14**| Check Admin Console / Database messes list | Exactly 10 messes present (`Mess 1` through `Mess 10`). |

---

## 7. Scope Boundary (V1 Phase 1)

Phase 1 strictly establishes the **Foundation, Authentication, Identity & QR Credentials**.
The following modules belong to future phases and are intentionally not active in Phase 1:
- Phase 2: Continuous QR Scanning & Meal Eligibility Engine
- Phase 3: Approval / Rejection NEXT Workflow & Manual Verification
- Phase 4: Meal Transactions & Duplicate Prevention Engine
- Version 2+: Daily & Monthly Billing, Mess Leave Management, Special Meals
