# Smart Mess Management & Automation System
## Project Context

> This file is the persistent project context for the Smart Mess Management & Automation System.
>
> It summarizes the confirmed product requirements, architectural decisions, development rules, current version scope, and important implementation decisions.
>
> The detailed project documents remain the authoritative source for requirements not explicitly covered here.

---

# 1. Project Overview

The Smart Mess Management & Automation System is a university-wide platform designed to automate mess operations, beginning with student identification and meal-entry automation.

The university may have multiple messes operating across different locations.

The system is designed to evolve through multiple versions.

The initial prototype focuses on the core meal automation workflow using:

Student QR
→ Mobile/Laptop Camera
→ Web Application
→ Backend/API
→ Cloud PostgreSQL Database
→ Verification/Business Logic

The long-term system may later support NFC, billing, leave management, special meals, notifications, analytics, offline operation, and AI/ML capabilities.

These later capabilities must not be unnecessarily implemented in the initial version.

---

# 2. Current Development Version

## V1 — Core Meal Automation

The current development target is V1.

V1 focuses on establishing a reliable identity system and the core QR-based foundation required for automated meal verification.

The final V1 workflow will eventually be:

Admin
→ Select Mess
→ Select Meal
→ Start Meal Approval
→ Continuous QR Scanning
→ Identify Student
→ Check Eligibility
→ Admin Verification
→ NEXT
→ Approve/Reject
→ Record Transaction
→ Automatically Scan Next Student

---

# 3. V1 Development Phases

V1 is divided into four practical development phases:

## Phase 1 — Foundation, Authentication, Identity & QR

Includes:

- Authentication
- University email verification
- OTP/email verification
- Password creation
- Login/logout
- Persistent sessions
- Session expiration
- Student/Admin roles
- First-login profile completion
- Student data
- Mess data
- 12 initial messes (24 hostels, 2 hostels per mess; see Section 11)
- Student credentials
- Unique QR generation
- QR display
- QR printing
- Basic Student Dashboard
- Basic Admin Dashboard
- Database foundation
- Security/RLS foundation

---

## Phase 2 — QR Scanning & Eligibility

Includes:

- Meal selection
- Mess selection
- Meal approval session
- Mobile/laptop camera
- Continuous QR scanning
- QR lookup
- Student information display
- Eligibility engine
- Rejection reasons
- Camera pause/resume

---

## Phase 3 — Approval, Rejection & Manual Verification

Includes:

- NEXT-based QR approval
- QR rejection finalization
- Manual rejection
- Student details mismatch
- Manual University ID verification
- Manual meal approval
- Complete operator workflow

---

## Phase 4 — Reliability, Transactions & V1 Validation

Includes:

- Meal transaction recording
- Duplicate meal prevention
- Camera debouncing
- Error handling
- Database-level protection
- Session/error handling
- Full integration testing
- V1 acceptance testing

---

# 4. Current Implementation Phase

The current phase is:

## Phase 1 — Foundation, Authentication, Identity & QR

Do not implement Phase 2, Phase 3, or Phase 4 functionality during Phase 1.

The Phase 1 architecture must, however, be designed so later phases can be added without major rewrites.

---

# 5. Authentication

Authentication is required for both students and administrators.

## University Email Domain

The accepted university email domain is:

`@uohyd.ac.in`

Normal signup must reject non-university email domains.

---

## Signup Flow

The required signup flow is:

University Email
→ Validate university email domain
→ OTP/email verification
→ Set Password
→ Account Created
→ First Login
→ Complete Mandatory Details
→ Dashboard

A user must set their password during signup.

Passwords must never be stored as plaintext application data.

Use the authentication system securely.

---

# 6. Login Flow

For subsequent logins:

University Email
+
Password
→ Login
→ Appropriate Dashboard

Users should not be forced to log in repeatedly during normal use.

A valid authenticated session should persist appropriately across normal navigation and page refreshes.

If the user has been inactive for a sufficiently long period and the session has expired, the system should require login again.

---

# 7. User Roles

At minimum, the system must support:

- STUDENT
- ADMIN

The architecture should remain extensible for future roles:

- MEAL_SCANNER
- MESS_ADMIN
- BILLING_ADMIN
- SUPER_ADMIN

Do not implement the complete future role system during V1 Phase 1.

A student must never be able to grant themselves an admin role.

Authorization must be enforced server-side, not only through frontend route protection.

---

# 8. First Login — Student Profile

After the first successful student login, the system must determine whether the mandatory student profile is complete.

If incomplete:

Login
→ Profile Incomplete
→ Mandatory Details Form
→ Save Details
→ Generate QR
→ Dashboard

If complete:

Login
→ Student Dashboard

A student must not be able to bypass mandatory profile completion by directly navigating to the dashboard.

---

# 9. Mandatory Student Details

The student profile must support the following information:

- University Unique ID
- Registration number
- Name
- Photo
- Hostel
- Course/program
- Year
- Semester
- Assigned mess
- Account status

University Unique ID must uniquely identify a student.

Registration number should have appropriate uniqueness/validation rules according to the final database design.

Protected fields such as assigned mess must not be freely changed by the student.

---

# 10. Student Photo

A student must have a photo as part of their identity.

Use appropriate cloud/object storage for photos.

Do not unnecessarily store large image binaries directly in PostgreSQL.

Student photos must be protected using appropriate authorization.

Do not expose private student photos publicly without authorization.

---

# 11. Mess Structure

The initial system contains exactly 12 messes:

- Mess 1
- Mess 2
- Mess 3
- Mess 4
- Mess 5
- Mess 6
- Mess 7
- Mess 8
- Mess 9
- Mess 10
- Mess 11
- Mess 12

Each student has one assigned mess, derived automatically (server-side) from their hostel via the authoritative `hostel_mess_mapping` table — 24 university hostels (14 male, 10 female), 2 hostels per mess. Students never choose or supply their mess directly.

Example:

Student A → Hostel MH - A → Mess 1
Student B → Hostel MH - C → Mess 2
Student C → Hostel LH - 1 → Mess 8

The system must support multiple messes as a core architectural concept.

Future mess transfer functionality must be possible without destroying historical records, but full transfer functionality is outside Phase 1.

---

# 12. QR Credential System

Each student receives a unique QR credential.

The conceptual relationship is:

Student
→ Active Mess Card/Credential
→ Unique QR Token

The credential should be represented as a separate entity rather than simply storing an arbitrary QR string directly on the student record.

The credential model should be extensible for future credential types such as NFC.

Phase 1 implements QR only.

---

# 13. QR Generation — Critical Requirement

QR generation must happen explicitly after the student has completed the required details.

The required flow is:

Student Signup
→ OTP Verification
→ Set Password
→ First Login
→ Complete Mandatory Details
→ Click `GENERATE QR`
→ Generate Unique QR
→ Display QR
→ Print QR

The system must NOT silently generate a QR immediately after account creation.

The student must explicitly click:

`GENERATE QR`

to create the QR credential.

---

# 14. Unique QR Requirement

Every student must have a unique QR credential.

The QR must contain an opaque unique token.

Example:

`MESS-CARD-8F72A91C`

The exact token-generation implementation can differ, but the token must be sufficiently unique and must not be predictable.

The QR must NOT directly contain:

- Student name
- University ID
- Registration number
- Hostel
- Photo
- Other personal information

The QR should identify the credential through an opaque token.

Later:

QR Token
→ Backend
→ Credential Lookup
→ Student

---

# 15. QR Generation Rules

Repeatedly clicking `GENERATE QR` must not blindly create unlimited active credentials for the same student.

If an active QR credential already exists:

- Show the existing QR
- Do not silently create another active credential

Future credential replacement/reissuance functionality can be implemented later through proper credential lifecycle management.

Do not implement unnecessary credential replacement functionality in Phase 1.

---

# 16. Student QR Page

The student must be able to:

- View QR
- Display QR on their phone
- Save/view the soft-copy QR
- Print QR

The printed QR must be usable later by the meal-scanning system.

The QR page should clearly communicate the student's identity where appropriate while keeping the actual QR payload opaque.

A print-friendly layout must be provided.

---

# 17. Credential Status

The credential model should support the foundation for:

- ACTIVE
- BLOCKED
- DEACTIVATED

These statuses are distinct from:

- Student account status
- Student mess assignment
- Future mess leave status

Historical/deactivated credentials should not be destructively deleted when later credential management is implemented.

---

# 18. Database

Use cloud PostgreSQL through Supabase.

Phase 1 should establish clean relational models for at least:

- User/authentication identity
- Student
- Admin/role foundation
- Mess
- Student credential

Use:

- Primary keys
- Foreign keys
- Unique constraints
- Appropriate indexes
- Timestamps
- Status fields

The database must be designed so future entities can be added without major restructuring.

Future entities may include:

- Meal
- MealTransaction
- BillingPolicy
- DailyBill
- SpecialMeal
- SpecialMealOrder
- MessLeave
- Notification
- AuditLog

Do not fully implement these future business modules in Phase 1.

---

# 19. Supabase

Supabase is the selected cloud platform for the prototype.

It provides the cloud PostgreSQL database and authentication infrastructure.

The Smart Mess project uses its own dedicated Supabase project.

Do not mix this project with unrelated applications.

Supabase credentials must be supplied through environment variables.

---

# 20. Environment Variables & Secrets

Actual secrets must never be committed to GitHub.

The project should have:

`.env.example`

containing variable names/placeholders only.

Actual local secrets belong in:

`.env`
or
`.env.local`

as appropriate for the framework.

The `.gitignore` must protect:

- `.env`
- `.env.*`
- Other secret/environment files

while allowing:

- `.env.example`

to be committed.

Never commit:

- Supabase secret key
- Database password
- Database connection strings containing credentials
- API keys
- Private keys
- Service credentials

The Supabase secret/server key must never be exposed to browser/client-side code.

Do not use a `NEXT_PUBLIC_*` variable for the Supabase secret key.

---

# 21. Security

Security is a core requirement.

At minimum:

- Authentication
- Role-based authorization
- Server-side authorization
- Appropriate Row Level Security
- Secure QR tokens
- Input validation
- Protected admin routes
- Protected student data
- Least-privilege access
- Secure secret management

Students must only be able to access their own protected data.

Students must not be able to:

- Access another student's profile
- Modify another student's data
- Change protected mess assignment
- Create admin privileges
- Access admin-only functionality

Do not rely only on frontend checks.

---

# 22. Admin Security

Do not allow any normal university-email user to freely assign themselves an unrestricted admin role.

Admin role assignment must be controlled.

If a bootstrap admin mechanism is required for the prototype, it must be explicit and secure.

Never trust a role supplied only by the browser.

---

# 23. Dashboards

## Student Dashboard

Phase 1 dashboard should provide:

- Student profile
- Assigned mess
- Account/credential status where appropriate
- QR generation if not yet generated
- Existing QR display
- Print QR
- Logout

Do not create fake billing, leave, analytics, or special-meal functionality.

---

## Admin Dashboard

Phase 1 admin dashboard should provide the foundation for:

- Admin authentication
- Student identity management/foundation
- Mess information
- Phase 1 administration

Do not implement full later-version administrative functionality.

---

# 24. UI/UX

The interface should be:

- Functional
- Responsive
- Mobile-friendly
- Accessible
- Clear
- Easy to understand

Important UX areas:

- Signup
- OTP verification
- Login
- First-login profile completion
- QR generation
- QR display
- QR printing
- Logout
- Error states
- Loading states
- Form validation
- Empty states

Do not prioritize visual complexity over functionality.

---

# 25. Validation

Validate:

- University email
- `@uohyd.ac.in` domain
- OTP/email verification
- Password requirements
- University Unique ID
- Registration number
- Required profile fields
- Year
- Semester
- Photo upload
- Mess assignment
- QR generation

Use client-side validation for good UX and server-side validation for security/data integrity.

---

# 26. Development Architecture

Keep the following concerns modular:

- Authentication
- Authorization
- Student identity
- Student profile
- Mess
- Credential/QR
- Database/infrastructure
- API/business logic
- UI

Do not tightly couple QR implementation to the future meal verification engine.

The long-term architecture should support:

Identification
→ Student
→ Eligibility
→ Admin Confirmation
→ Meal Transaction

Phase 1 implements the identity and credential foundation only.

---

# 27. Testing Philosophy

Every development phase must be tested immediately after implementation.

The development workflow is:

Develop Phase
→ Run automated tests
→ Run build/type/lint checks
→ Manually test actual workflow
→ Fix issues
→ Lock phase
→ Move to next phase

Do not wait until the end of V1 to discover basic phase-level problems.

---

# 28. Phase 1 Testing

At minimum test:

## Authentication

- Valid university signup
- Invalid email-domain rejection
- OTP/email verification
- Password creation
- Login
- Logout
- Session restoration
- Session expiration
- Protected routes

## Student

- Mandatory profile validation
- Student identity uniqueness
- Student can access only own profile
- Student cannot modify protected fields

## Mess

- All 10 messes exist
- Student can have an assigned mess
- Student cannot arbitrarily modify protected mess assignment

## QR

- QR generation
- Unique QR credential
- Repeated Generate QR does not create duplicate active credentials
- QR token is opaque
- Student can view QR
- Student can print QR
- Student cannot access another student's QR

## Authorization

- Student cannot access admin routes
- Student cannot make themselves admin
- Unauthorized access is rejected

---

# 29. Phase 1 Acceptance Criteria

Phase 1 is complete only when a test student can perform:

SIGN UP
→ University Email
→ OTP Verification
→ Set Password
→ Account Created
→ First Login
→ Complete Mandatory Details
→ Click `GENERATE QR`
→ Unique QR Generated
→ View QR
→ Print QR
→ Logout
→ Login Again
→ Student Dashboard

And a controlled administrator can:

Login
→ Admin Dashboard

The system must contain:

- Mess 1
- Mess 2
- Mess 3
- Mess 4
- Mess 5
- Mess 6
- Mess 7
- Mess 8
- Mess 9
- Mess 10

---

# 30. Future V1 Rules — Do Not Forget

These requirements are important for later phases.

## Continuous QR scanning

The scanner must eventually work continuously:

Camera ON
→ QR detected
→ Camera pauses
→ Student displayed
→ Eligibility calculated
→ Admin verifies
→ NEXT
→ Transaction finalized
→ Camera resumes
→ Next student

There should not be a separate Scan button after every student.

---

## QR Approval

For QR scanning:

ELIGIBLE
→ Admin verifies student
→ NEXT
→ APPROVED
→ Transaction
→ Scanner resumes

Displaying `ELIGIBLE` does NOT approve the meal.

`NEXT` is the finalizing action.

---

## Rejection

For rejected students:

REJECTED
→ Reason displayed
→ NEXT
→ Rejection finalized
→ Scanner resumes

Possible rejection reasons later include:

- Invalid card
- Blocked card
- Deactivated card
- Wrong mess
- Student on leave
- Meal already consumed
- Meal unavailable
- Student details mismatch
- Other

---

## Manual Verification

Later, when QR scanning is unavailable:

Manual Verification
→ University Unique ID
→ Student details
→ Physical verification
→ APPROVE MEAL

Manual verification uses an explicit `APPROVE MEAL` action rather than QR `NEXT` behavior.

---

# 31. V1 Scope Boundary

V1 must remain focused.

Do NOT implement in Phase 1:

- Meal scanning
- Meal approval
- Meal rejection workflow
- Eligibility engine
- Meal transactions
- Billing
- Daily bills
- Monthly bills
- Mess leave
- Special meals
- Notifications
- Analytics
- NFC
- Offline mode
- AI/ML
- Production hardware

These belong to later development phases/versions.

---

# 32. Long-Term Version Direction

The product roadmap is:

## V1
Core Meal Automation

## V2
Student Platform + Billing

## V3
Leave + Special Meals

## V4
Administration & Control

## V5
Notifications + Analytics + NFC/Offline/AI extensions

Future features must not be prematurely implemented into the current phase.

---

# 33. Source Documents

The project has two detailed source documents:

1. `SmartMessManagement.docx`
2. `VersionWisePlanMessSystem.docx`

They contain the detailed product specification and version roadmap.

This `PROJECT_CONTEXT.md` is the consolidated development context.

When implementing a phase:

1. Read this file.
2. Read the relevant detailed specification.
3. Follow the current phase scope.
4. Do not invent conflicting requirements.
5. Preserve the architecture for future phases.

---

# 34. Current Development Rule

CURRENT VERSION:

V1 — Core Meal Automation

CURRENT PHASE:

Phase 1 — Foundation, Authentication, Identity & QR Credentials

The developer/AI must stop after completing Phase 1.

Do not automatically begin Phase 2.

After implementation, provide:

- Implementation summary
- Architecture summary
- Database summary
- Authentication summary
- QR implementation summary
- Security summary
- Tests and results
- Build/type/lint results
- Environment variables required (names only)
- Manual setup still required
- Manual testing instructions
- Known limitations
- Phase completion status

Do not claim completion if acceptance criteria are failing.