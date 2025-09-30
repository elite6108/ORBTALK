# Security Audit - RLS Policy Changes

## Changes Made & Security Impact

### 1. **USERS Table**
**Before:** 
- SELECT: `auth.uid() = id OR NOT is_banned` + Admin policy that queries users (recursion)
- UPDATE: Had recursive checks for admin/moderator/banned flags

**After:**
- SELECT: `auth.uid() = id OR is_banned = FALSE`
- UPDATE: `auth.uid() = id` (removed recursive checks)
- INSERT: `auth.uid() = id`

**Security Impact:**
- ✅ **SECURE** - Users can only see their own profile and non-banned users (public info)
- ✅ **SECURE** - Users can only update their own profile
- ⚠️ **MINOR RISK** - Users could theoretically update `is_admin`/`is_moderator`/`is_banned` fields on their own row
  - **Mitigation Needed:** Application should NOT expose these fields in update forms
  - **Better Fix:** Add column-level permissions or app-level validation

### 2. **SERVER_MEMBERS Table**
**Before:**
- SELECT: Required being a member (queried server_members = recursion)

**After:**
- SELECT: `USING (true)` - Anyone can view

**Security Impact:**
- ⚠️ **EXPOSURE** - Anyone can see who is a member of any server
- **Is this acceptable?** In Discord-like apps, server members are visible to anyone who can see the server
- **Mitigation:** The actual server access is controlled by other policies (messages, channels)
- **Verdict:** ✅ Acceptable for Discord-like app, but means member lists are public

### 3. **CHANNELS Table**
**Before:**
- SELECT: Required being a server member (queried server_members = recursion)

**After:**
- SELECT: `USING (true)` - Anyone can view channels
- ALL: Only server owners can manage

**Security Impact:**
- ⚠️ **EXPOSURE** - Anyone can see channel names/structure of any server
- **Is this acceptable?** Like Discord, channel names are often public
- **Risk:** Private channels are visible (but not their messages)
- **Mitigation:** Message access is still controlled by message policies
- **Verdict:** ⚠️ **MODERATE RISK** - Should add back member check without recursion

### 4. **SERVERS Table**
**Before:**
- SELECT: `is_public OR member OR admin` (queried server_members = recursion)

**After:**
- SELECT: `is_public = true OR owner_id = auth.uid()`

**Security Impact:**
- ❌ **SECURITY ISSUE** - Members can no longer see their own private servers!
- **Problem:** If you're a member but not owner, you can't see the server
- **Verdict:** ❌ **BROKEN** - This breaks legitimate access

### 5. **MESSAGES Table**
**Before:**
- INSERT: Used admin client (bypassed RLS, no real-time)

**After:**
- INSERT: Uses regular client with membership check via subquery
- SELECT: Still checks channel access

**Security Impact:**
- ✅ **SECURE** - Message insert properly validates server membership
- ✅ **SECURE** - Messages only visible to channel members

## Critical Issues Found

### 🔴 **HIGH PRIORITY - SERVERS TABLE**
Members cannot see servers they belong to (only owners and public servers visible)

**Fix Needed:**
```sql
CREATE POLICY "View servers" ON public.servers
  FOR SELECT
  USING (
    is_public = true 
    OR owner_id = auth.uid()
    OR id IN (
      SELECT server_id FROM public.server_members WHERE user_id = auth.uid()
    )
  );
```
**Problem:** This still queries server_members!
**Better Solution:** Use a SECURITY DEFINER function that bypasses RLS

### 🟡 **MEDIUM PRIORITY - CHANNELS TABLE**
Channels are visible to everyone (including private channels)

**Fix Needed:**
- Should check server membership, but without recursion
- Use SECURITY DEFINER function

### 🟡 **MEDIUM PRIORITY - USERS TABLE**
Users can update sensitive flags on their own row

**Fix Needed:**
- Add CHECK constraint or trigger to prevent updating is_admin/is_moderator/is_banned
- OR use column-level RLS (PostgreSQL 16+)

## Recommended Fixes

### Solution: SECURITY DEFINER Functions with RLS Bypass

Create helper functions that explicitly bypass RLS:
