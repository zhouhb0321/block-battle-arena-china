

# Plan: Unread Message Badge + Offline Message History + Bug Fixes

## Overview

Three main tasks:
1. **Fix critical bugs** preventing private messaging from working
2. **Add unread message count badge** on the navigation bar (visible after login)
3. **Ensure offline messages are loaded** when user logs in

---

## Bug Fixes Found

### Bug 1: `conversation_id` type mismatch
- The `private_messages.conversation_id` column is type `uuid`, but the code in `PrivateChatDialog.tsx` line 134 inserts a string: `[user.id, friendId].sort().join('_')`
- **Fix**: Either remove `conversation_id` from the insert (it's nullable), or migrate the column to `text` type

### Bug 2: Realtime not enabled for `private_messages`
- Only `room_messages`, `battle_rooms`, `battle_participants`, `battle_records` are in the `supabase_realtime` publication
- The realtime subscription in `PrivateChatDialog.tsx` will silently fail
- **Fix**: Add `private_messages` to the realtime publication via migration

---

## Implementation Steps

### Step 1: Database Migration
- Add `private_messages` to `supabase_realtime` publication
- Change `conversation_id` from `uuid` to `text` (or drop it and remove from insert code)

### Step 2: Fix `PrivateChatDialog.tsx`
- Remove `conversation_id` from the insert statement (it's not used anywhere for queries)
- The existing message loading and realtime subscription logic is otherwise correct

### Step 3: Create `useUnreadMessages` Hook
New file: `src/hooks/useUnreadMessages.ts`
- On mount (when user is authenticated), query `private_messages` for `receiver_id = user.id AND is_read = false` and return the count
- Subscribe to realtime `INSERT` events on `private_messages` where `receiver_id = user.id` to increment count
- Provide a `markAsRead(friendId)` function
- Re-query count when messages are marked as read

### Step 4: Update `NavigationBar.tsx`
- Import the `useUnreadMessages` hook
- Show a red badge with unread count next to the user menu (or as a small notification dot)
- Only visible when `unreadCount > 0`

### Step 5: Update `UserMenu.tsx`
- Import `useUnreadMessages` hook
- Show unread count badge next to the "Friends" menu item
- When user opens FriendSystem, the count updates

### Step 6: Update `FriendSystem.tsx`
- Show per-friend unread message count badges next to the chat button
- When opening a chat with a friend, mark those messages as read and update the count

### Step 7: Update `PrivateChatDialog.tsx`
- Call `markAsRead` from the hook when opening a conversation
- Ensure marking messages as read triggers count update

### Step 8: Add i18n translations
- `chat.unreadMessages`: "Unread Messages" / "未读消息" / etc.
- `chat.newMessage`: "New message from {username}" / "来自{username}的新消息" / etc.

---

## Technical Details

### Files Modified
| File | Change |
|------|--------|
| **Migration SQL** | Add `private_messages` to realtime publication; alter `conversation_id` to text |
| `src/hooks/useUnreadMessages.ts` | **NEW** - Hook for tracking unread message count globally |
| `src/components/PrivateChatDialog.tsx` | Fix conversation_id insert; integrate markAsRead |
| `src/components/NavigationBar.tsx` | Add unread badge indicator |
| `src/components/UserMenu.tsx` | Add unread badge on Friends menu item |
| `src/components/FriendSystem.tsx` | Show per-friend unread counts on chat buttons |
| `src/contexts/LanguageContext.tsx` | Add new translation keys |

### Data Flow

```text
User logs in
  -> useUnreadMessages queries unread count
  -> Badge appears on NavigationBar + UserMenu
  -> Realtime subscription listens for new messages
  -> New message arrives -> count increments + optional toast
  -> User opens chat -> markAsRead called -> count decrements
```

### No new tables needed
All functionality uses the existing `private_messages` table. Only realtime publication needs to be enabled.

