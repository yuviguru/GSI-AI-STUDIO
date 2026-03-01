# AUTH-001: Phone OTP Authentication with Age Gate

## Description
Implement Firebase Auth with phone number OTP for parent accounts. Parents verify via SMS, pass an age gate (must be 18+ per DPDPA compliance), and create their account. Anonymous session creations automatically migrate to the new authenticated account. This is the foundation for all Phase 2 features.

## Requires KB Updates
- Update `docs/security.md` with auth flow details and DPDPA compliance notes
- Update `docs/architecture.md` with auth state management diagram

## Subtasks

### [LIB] Configure Firebase Auth phone provider
**Target**: `lib/firebase/client.ts`
**Action**: Update
**Requirements**:
- Initialize Firebase Auth alongside existing Firestore client
- Configure `RecaptchaVerifier` for phone auth (invisible reCAPTCHA)
- Export `auth` instance and `signInWithPhoneNumber` helper
- Export `signOut` function
- Ensure auth persistence is set to `browserLocalPersistence`

### [HOOK] Create useAuth hook
**Target**: `hooks/useAuth.ts`
**Action**: Create
**Requirements**:
- Wraps Firebase `onAuthStateChanged` listener
- Returns `{ user, loading, isAuthenticated, signOut, error }`
- `user` contains: `uid`, `phoneNumber`, `displayName`
- Provides `AuthContext` and `AuthProvider` wrapper component
- Provider wraps app in root layout (alongside existing `AiPointsProvider`)
- Loading state while auth initializes (prevents flash of unauthenticated UI)

### [FE] Create PhoneAuthFlow component
**Target**: `components/auth/PhoneAuthFlow.tsx`
**Action**: Create
**Requirements**:
- 3-step flow:
  1. **Age Gate**: "Are you a parent or guardian?" with DOB picker. Must be 18+ to proceed. Shows explanation: "A parent or guardian must set up the account."
  2. **Phone Input**: Indian phone number input with +91 prefix, "Send OTP" button. Uses `signInWithPhoneNumber` with reCAPTCHA
  3. **OTP Verification**: 6-digit OTP input with auto-focus between digits, "Verify" button, "Resend OTP" link (30s cooldown)
- Success state: mascot celebrating + "Welcome!" message
- Error handling: invalid number, wrong OTP, too many attempts
- Kid-friendly UI: large inputs, clear labels, encouraging copy
- Uses `framer-motion` for step transitions (matching studio pattern)

### [FE] Create LoginPrompt component
**Target**: `components/auth/LoginPrompt.tsx`
**Action**: Create
**Requirements**:
- Non-blocking prompt encouraging login (not a gate)
- Shows after 2nd creation: "Save your creations forever! Ask a parent to sign up."
- Dismissable with "Maybe later" link
- "Sign Up" button opens `PhoneAuthFlow` in a bottom sheet
- Tracks dismissal in localStorage (`gsi-login-prompt-dismissed`)
- Re-shows after 3 days if dismissed

### [API] Create session claim endpoint
**Target**: `app/api/auth/claim-session/route.ts`
**Action**: Create
**Requirements**:
- `POST` method: accepts `{ sessionId: string }` with Firebase Auth token in `Authorization` header
- Verifies Firebase ID token via Admin SDK
- Finds all creations with matching `sessionId`
- Updates each creation: sets `userId` to authenticated user's UID
- Migrates session points and badges to user profile
- Returns `{ claimedCount: number }`
- Idempotent: safe to call multiple times

### [FE] Add auth state to Header
**Target**: `components/layout/Header.tsx`
**Action**: Update
**Requirements**:
- When authenticated: show user avatar circle (first letter of phone or default avatar) replacing or alongside AiPointsBadge
- Tap avatar: opens profile dropdown with "My Profile", "Switch Kid", "Sign Out"
- When not authenticated: keep existing AiPointsBadge behavior
- Add subtle "Sign In" text link next to AiPointsBadge for unauthenticated users

### [FE] Auto-claim session on auth
**Target**: `components/layout/SessionInit.tsx`
**Action**: Update
**Requirements**:
- After successful authentication, automatically call `/api/auth/claim-session`
- Pass current `sessionId` from localStorage
- On success: refresh creations list (they now belong to the user)
- Show toast: "Your creations have been saved to your account!"

## Acceptance Criteria
- [ ] Parent can sign up with phone number + OTP
- [ ] Age gate prevents minors from creating accounts
- [ ] OTP verification works with 6-digit code
- [ ] Anonymous creations migrate to authenticated account
- [ ] Auth state persists across page refreshes
- [ ] Header shows avatar when authenticated
- [ ] Login prompt appears after 2nd creation (non-blocking)
- [ ] Sign out clears auth state and returns to anonymous mode
- [ ] reCAPTCHA prevents automated sign-ups
