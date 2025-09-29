# Voice System Documentation

## How Voice Persistence Works

The voice system is designed to work like Discord - you stay connected to a voice channel even when navigating away from the server.

### Architecture

#### 1. **Voice Dock** (`src/components/voice/voice-dock.tsx`)
- Small persistent UI component shown at the bottom of the sidebar
- Displays when user is connected to voice
- Shows:
  - **Green pulsing indicator** - "Voice Connected"
  - **Channel name** - Which voice channel you're in
  - **Mute button** - Toggle microphone on/off
  - **Disconnect button** - Leave voice channel

#### 2. **Global Session Storage**
Uses `localStorage` to persist voice session across navigation:

```typescript
{
  serverId: string;
  channelId: string;
  roomName: string;
  url: string;
  token: string;
  channelName?: string;
}
```

#### 3. **Connection Flow**

**When user joins a voice channel:**
1. Voice channel page fetches LiveKit token from API
2. Stores session in `localStorage`
3. Dispatches `orbtalk:voice:updated` event
4. Voice dock picks up the session and renders
5. LiveKit connection is maintained in the dock

**When user navigates away:**
1. Voice dock continues to render (it's in the global layout)
2. LiveKit connection stays active
3. User can still mute/unmute and disconnect
4. Works across all pages (servers, DMs, dashboard, etc.)

**When user disconnects:**
1. Click "Disconnect" button in voice dock
2. Session removed from `localStorage`
3. LiveKit connection closes
4. Voice dock disappears

### Code Locations

- **Voice Dock**: `src/components/voice/voice-dock.tsx`
- **Voice Channel**: `src/components/chat/voice-channel-content.tsx`
- **Rendered in**:
  - `src/components/app/app-shell.tsx` (server pages)
  - `src/app/(app)/layout.tsx` (DM pages)

### Features

✅ **Persistent Connection**: Stay connected when navigating between pages
✅ **Global Controls**: Mute/unmute from anywhere
✅ **Visual Indicator**: Green pulsing dot shows active connection
✅ **Cross-Page**: Works in servers, DMs, dashboard, profile, etc.
✅ **Secure Context Check**: Gracefully handles HTTP vs HTTPS
✅ **Discord-like UX**: Familiar voice dock UI

### User Flow Examples

#### Scenario 1: Join voice and browse channels
1. User clicks on "voice-chat" channel
2. Joins voice (sees participants)
3. Voice dock appears at bottom of sidebar
4. User navigates to "general" text channel
5. Voice dock stays visible - still connected
6. User can chat while in voice

#### Scenario 2: Join voice and check DMs
1. User in voice channel on Server A
2. Voice dock shows connection
3. User clicks DMs in sidebar
4. Voice dock persists in DM view
5. User can read/send DMs while in voice
6. Navigate back to server - still connected

#### Scenario 3: Disconnect from voice
1. User connected to voice channel
2. Click "Disconnect" in voice dock
3. Connection closes
4. Voice dock disappears
5. Can rejoin anytime

### API Routes

- **POST /api/livekit** - Get LiveKit token for voice channel
  - Body: `{ serverId, channelId }`
  - Returns: `{ token, url, roomName, channelName }`

### Security

- **Secure Context Required**: Microphone access needs HTTPS or localhost
- **Graceful Fallback**: Shows error message if accessed via HTTP
- **Hydration Safe**: Uses `useEffect` to check `window.isSecureContext`

### Styling

Voice Dock uses Discord's color scheme:
- Background: `#1e1f22` (dark gray)
- Border: `#3ba55d/30` (green glow)
- Active indicator: `#3ba55d` (Discord green)
- Disconnect button: `#da373c` (Discord red)
- Mute (muted): Red with red background tint
- Mute (unmuted): Gray with hover effects

### Future Enhancements

- [ ] Show other participants in voice dock
- [ ] Video toggle
- [ ] Screen share
- [ ] Voice activity indicator (speaking animation)
- [ ] Double-click to quickly mute/unmute
- [ ] Keyboard shortcuts (Ctrl+Shift+M to mute)
- [ ] Server deafen option
- [ ] Push-to-talk mode
