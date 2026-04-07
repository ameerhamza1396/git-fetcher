# Medmacs.App — Complete Functional Prompts

> **App:** Medmacs.App — Medical education platform for Pakistani MBBS students  
> **Stack:** React + TypeScript + Vite, Supabase (auth + DB + realtime), TanStack Query, Tailwind CSS, Framer Motion  
> **Total:** 49 pages · 32+ components · 4 hooks · 3 utilities

---

## TABLE OF CONTENTS
1. [Application Shell](#1-application-shell)
2. [Auth & Onboarding Pages](#2-auth--onboarding-pages)
3. [Core Learning Pages](#3-core-learning-pages)
4. [AI Feature Pages](#4-ai-feature-pages)
5. [Competitive Feature Pages](#5-competitive-feature-pages)
6. [Account & Commerce Pages](#6-account--commerce-pages)
7. [Content & Info Pages](#7-content--info-pages)
8. [MCQ System Components](#8-mcq-system-components)
9. [Dashboard Components](#9-dashboard-components)
10. [Battle Components](#10-battle-components)
11. [FLP Components](#11-flp-components)
12. [AI Components](#12-ai-components)
13. [Profile & Auth Components](#13-profile--auth-components)
14. [Practical Notes Components](#14-practical-notes-components)
15. [Admin Components](#15-admin-components)
16. [Shared / Layout Components](#16-shared--layout-components)
17. [Hooks & Utilities](#17-hooks--utilities)

---

## 1. APPLICATION SHELL

### `src/App.tsx`
Root application wrapper. Sets up all providers and routing.

**Responsibilities:**
- Wraps app in `QueryClientProvider` (TanStack Query) and `ThemeProvider` (next-themes). Default theme: `light`; supports `light` and `dark` only via `class` attribute strategy.
- `StatusBarHandler` — syncs Capacitor native status bar icon color to resolved theme (`Style.Dark` for dark bg, `Style.Light` for light bg). Only runs on native platform.
- Renders `<Router>` with three global singletons: `<ScrollToTop>`, `<BackHandler>`, `<ConnectionStatusModal>`
- Registers all 55+ routes (see table below)
- Global toasts: `<Toaster>` (shadcn) + `<SonnerToaster position="bottom-center">`

**Route Map (path → component):**

| Path | Component |
|------|-----------|
| `/` | Index (landing wizard) |
| `/login` | Login |
| `/signup` | Signup |
| `/dashboard` | Dashboard |
| `/mcqs` | MCQs |
| `/battle` | Battle |
| `/ai` | AI hub |
| `/ai/chatbot` | AIChatbotPage |
| `/ai/test-generator` | AITestGeneratorPage |
| `/leaderboard` | Leaderboard |
| `/profile` | Profile |
| `/profile/password` | ChangePassword |
| `/pricing` | Pricing |
| `/checkout` | Checkout |
| `/mock-test` | MockTest |
| `/flp` | FLP |
| `/flp-result` | FLPResults |
| `/results/flp/:id` | FLPResultDetail |
| `/saved-mcqs` | SavedMCQsPage |
| `/detailed-analytics` | DetailedAnalytics |
| `/setup` or `/welcome-new-user` | SetupPage |
| `/practicals` or `/practical-notes` | PracticalPage |
| `/practical-notes/subject/:id` | PracticalNotesDetails |
| `/seqs` | SEQs |
| `/announcements` | Announcements |
| `/select-year` | SelectYear |
| `/career` | Career |
| `/teaching-career` | TeachingAmbassadors |
| `/summerinternship2025` | InternshipApplication |
| `/teams` | Team |
| `/redeem` | RedeemCode |
| `/purchase-history` | PurchaseHistory |
| `/payment-success` | PaymentSuccess |
| `/payment-failure` | PaymentFailure |
| `/contact-us` | ContactUsPage |
| `/privacypolicy` | PrivacyPolicy |
| `/terms` | TermsAndConditions |
| `/forgot-password` | ForgotPassword |
| `/update-password` | UpdatePassword |
| `/settings/username` | UsernamePage |
| `/all-set` | AllSetPage |
| `/test-completed` | TestCompletionPage |
| `/test-summary` | TestResults |
| `/results` | MockTestResults |
| `/install-app` | InstallApp |
| `/verify-email` | VerifyEmail |
| `*` | NotFound |

---

## 2. AUTH & ONBOARDING PAGES

### `src/pages/Index.tsx` — Route: `/`
Landing page and first-run onboarding wizard.

**Logic:**
- On mount: checks `localStorage.getItem("hasSeenWizard")` and active Supabase session.
- **Wizard not seen → show 5-step onboarding wizard:**
  - Each step has: gradient background (transitions with animation), mascot PNG, tilted screen mockup (opacity 0.4), large background icon (opacity 0.3)
  - Step 1: "Largest MCQ Collection" — Mascot1 + screen7 + Zap icon — gradient: blue→indigo→purple
  - Step 2: "Track Performance" — Mascot10 + screen17 + BarChart3 — gradient: emerald→teal→cyan
  - Step 3: "Rise to the Top" — Mascot5 + screen16 + Trophy — gradient: orange→red→rose
  - Step 4: "Battle Mode" — Mascot3 + screen18 + Swords — gradient: violet→purple→fuchsia
  - Step 5: "Meet Dr. Ahroid" — Mascot6 + screen11 + Bot — gradient: slate→blue→indigo
  - "Skip" button top-right, "Back"/"Next" buttons, progress dots at bottom
  - On complete: sets `localStorage.hasSeenWizard = "true"`; logged-in users → `/dashboard`
- **Wizard seen + logged in → immediately redirect to `/dashboard`**
- **Wizard seen, not logged in → Login Screen:**
  - Random mascot from: `["Mascot2","Mascot8","Mascot9","Mascot10","Mascot13","Mascot14"]`
  - Floating mascot animation (CSS keyframe `float`)
  - "Medmacs.App" title with teal `.App` accent
  - "Create Account" → `/signup`; "Login" → `/login`
  - Help/revisit icon (top-right) restarts wizard
  - Background: `from-[#0a2e2e] via-[#0f172a] to-[#020617]` with teal + sky blur orbs

---

### `src/pages/Login.tsx` — Route: `/login`
Email/password authentication.

**Functionality:**
- Form: email + password inputs with validation
- Submit → `supabase.auth.signInWithPassword({ email, password })`
- Success → redirect to `/dashboard`
- Google OAuth via `<GoogleSignin />` component
- Links to `/forgot-password` and `/signup`
- Auth error displayed via `<AuthErrorDisplay>`
- Loading state disables form

---

### `src/pages/Signup.tsx` — Route: `/signup`
New user registration.

**Functionality:**
- Fields: full name, email, password, confirm password
- Client validation: passwords match, min 8 chars
- Submit → `supabase.auth.signUp({ email, password, options: { data: { full_name }, emailRedirectTo } })`
- Success → redirect to `/verify-email` with instructions
- Google sign-in alternative via `<GoogleSignin />`
- "Already have account?" → `/login`

---

### `src/pages/SetupPage.tsx` — Routes: `/setup`, `/welcome-new-user`
Multi-step profile setup wizard. **Required** before accessing dashboard.

**Auth guard:** Unauthenticated → `/login`

**Profile inspection on load:**
- Fetches existing profile from Supabase + calls `fetchInstitutes()`
- Auto-advances to first incomplete step:
  - No `username` → Step 1
  - No `institute` → Step 2
  - No valid MBBS `year` → Step 3
  - All complete → redirect to `/dashboard`

**5 Steps (index 0–4) with animated gradient transitions:**

| Step | Title | UI | Saves |
|------|-------|----|-------|
| 0 | Welcome | Mascot1 + greeting "Welcome, {name}!" | Nothing |
| 1 | Username | Text input, validates: ≥3 chars, alphanumeric+underscore, DB unique | `profiles.username` |
| 2 | Institute | Scrollable list from `fetchInstitutes()`: thumbnail + name + short_name. Disabled ones show "Coming Soon" badge. Selection is permanent. | `profiles.institute` |
| 3 | Year | 2-col grid: 1st–5th Year MBBS buttons | `profiles.year` |
| 4 | All Set | Mascot14 + CheckCircle success screen | Nothing |

**Per-step gradients:** violet/purple/indigo → blue/indigo/violet → emerald/teal/cyan → orange/amber/yellow → emerald/green/teal

**UI controls:**
- Animated top progress bar across all 5 steps with labels
- Back + Next buttons at bottom
- Saving spinner during async operations
- "Skip" link on step 0 only (→ `/dashboard`)

---

### `src/pages/ForgotPassword.tsx` — Route: `/forgot-password`
Password reset request page.

**Functionality:**
- Email field → submit → `supabase.auth.resetPasswordForEmail(email, { redirectTo })`
- Success: shows "Check your email" confirmation banner
- Link back to `/login`

---

### `src/pages/UpdatePassword.tsx` — Route: `/update-password`
Set new password after clicking reset link from email.

**Functionality:**
- New password + confirm password fields
- `supabase.auth.updateUser({ password: newPassword })`
- Validates match + minimum length
- Success → toast + redirect to `/login`

---

### `src/pages/ChangePassword.tsx` — Route: `/profile/password`
Change password for already authenticated users.

**Functionality:**
- New password + confirm password inputs
- `supabase.auth.updateUser({ password })`
- Inline validation; success toast
- Back button to `/profile`

---

### `src/pages/UsernamePage.tsx` — Route: `/settings/username`
Dedicated username update page.

**Functionality:**
- Single text input for new username
- Checks uniqueness in DB (excluding own row)
- Saves via `supabase.from('profiles').update({ username })`
- Error if taken or invalid (letters, numbers, underscores only; ≥3 chars)

---

### `src/pages/VerifyEmail.tsx` — Route: `/verify-email`
Post-signup email verification holding page.

**Functionality:**
- Static message: "Check your inbox"
- Resend button → `supabase.auth.resend({ type: 'signup', email })`
- "Already verified?" → `/login`

---

### `src/pages/SelectYear.tsx` — Route: `/select-year`
Standalone MBBS year selection page.

**Functionality:**
- Grid of year buttons (1st–5th Year MBBS)
- Saves to `profiles.year` via Supabase update
- Alternative entry to year setup (used from Profile or onboarding flows)

---

### `src/pages/AllSetPage.tsx` — Route: `/all-set`
Simple congratulatory confirmation page after onboarding.

**Functionality:**
- Mascot + success message
- "Go to Dashboard" CTA → `/dashboard`

---

### `src/pages/WelcomeNewUserPage.tsx`
Minimal legacy welcome page (largely superseded by SetupPage).

---

### `src/pages/NotFound.tsx` — Route: `*`
404 Not Found page.

**Functionality:**
- Friendly message with mascot illustration
- "Go to Home" → `/`
- Fully respects dark/light theme

---
