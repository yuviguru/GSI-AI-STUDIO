# ENGAGE-007: Collaborative Creation — Create Together

## Description
Real-time collaborative creation where two kids build a story, comic, or game together. Uses Firestore real-time listeners for live collaboration. One kid starts, invites a friend via link, and they take turns adding to the creation. Perfect for classrooms and playdates.

## Requires KB Updates
- Update `docs/architecture.md` with real-time collaboration architecture

## Dependencies
- AUTH-001 (both collaborators need accounts)
- PROFILE-001 (kid profiles for attribution)

## Subtasks

### [FE] Create collaboration invite flow
**Target**: `components/collaboration/CollabInvite.tsx`
**Action**: Create
**Requirements**:
- "Create Together" option on studio pages
- Generates shareable invite link
- Friend joins via link and enters session
- Waiting room: shows both avatars and "Ready?" confirmation

### [LIB] Create real-time collaboration service
**Target**: `lib/firebase/collabService.ts`
**Action**: Create
**Requirements**:
- Uses Firestore `onSnapshot` for real-time updates
- Collaboration document: `{ id, hostKidId, guestKidId, studioType, prompt, turns: [], status }`
- Turn-based: kids alternate adding to the prompt or making choices
- Conflict resolution: only active turn holder can edit

### [FE] Create CollabStudio component
**Target**: `components/collaboration/CollabStudio.tsx`
**Action**: Create
**Requirements**:
- Split view showing both collaborators' avatars
- Turn indicator: "Your turn!" / "Waiting for [friend]..."
- Shared prompt area that updates in real-time
- Generate button only active for turn holder
- Final creation attributed to both kids

## Acceptance Criteria
- [ ] Two kids can create together in real-time
- [ ] Turn-based collaboration prevents conflicts
- [ ] Both creators attributed on the final creation
- [ ] Works via shareable invite link
- [ ] Real-time updates visible to both participants
