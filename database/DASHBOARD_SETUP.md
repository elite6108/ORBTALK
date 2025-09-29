# Dashboard Setup Guide

This guide explains how to set up the dashboard feature with tasks and calendar functionality.

## Database Setup

### 1. Run the SQL Schema

Execute the `tasks-calendar.sql` file in your Supabase SQL editor:

```bash
# In Supabase Dashboard:
1. Go to SQL Editor
2. Create a new query
3. Copy the contents of database/tasks-calendar.sql
4. Run the query
```

This creates:
- `tasks` table - User tasks with priority, status, and due dates
- `calendar_events` table - Calendar events and meetings
- `user_activity_sessions` table - Track focus time and user activity
- RLS policies for secure access
- Indexes for performance

### 2. Database Schema

#### Tasks Table
```sql
- id (UUID, primary key)
- user_id (UUID, references users)
- server_id (UUID, optional, references servers)
- channel_id (UUID, optional, references channels)
- title (VARCHAR 200)
- description (TEXT)
- status (pending|in_progress|completed|cancelled)
- priority (low|medium|high|urgent)
- assigned_to (UUID, references users)
- assigned_by (UUID, references users)
- due_date (TIMESTAMPTZ)
- completed_at (TIMESTAMPTZ)
```

#### Calendar Events Table
```sql
- id (UUID, primary key)
- user_id (UUID, references users)
- server_id (UUID, optional)
- title (VARCHAR 200)
- description (TEXT)
- event_type (meeting|reminder|deadline|event)
- start_time (TIMESTAMPTZ)
- end_time (TIMESTAMPTZ)
- all_day (BOOLEAN)
- location (TEXT)
- attendees (UUID[])
```

#### User Activity Sessions
```sql
- id (UUID, primary key)
- user_id (UUID, references users)
- session_type (focus|active|break)
- started_at (TIMESTAMPTZ)
- ended_at (TIMESTAMPTZ)
- duration_minutes (INTEGER)
```

## Dashboard Features

### Real-time Statistics
- **Active Tasks**: Shows pending and in-progress tasks
- **Unread Messages**: Counts messages from last 24 hours across all servers
- **Team Members**: Shows online members vs total members
- **Focus Time**: Tracks daily focus session time

### Task Management
- View all your tasks and assigned tasks
- Filter by status (pending, in progress, completed)
- Priority levels (low, medium, high, urgent)
- Due date tracking
- Assignment tracking (who assigned, who it's assigned to)

### Recent Activity
- Real-time feed of messages from your servers
- Shows channel and server context
- Time-based sorting

### AI Insights
- Automatically detects upcoming deadlines
- Suggests focus time scheduling
- Analyzes task workload

## Sample Data (Optional)

To test the dashboard with sample data, you can run:

```sql
-- Insert sample tasks
INSERT INTO tasks (user_id, title, description, status, priority, due_date)
VALUES 
  (auth.uid(), 'Review dashboard design mockups', 'Go through the new UI designs', 'in_progress', 'high', NOW() + INTERVAL '2 days'),
  (auth.uid(), 'Prepare demo for client meeting', 'Create presentation for Q4 review', 'pending', 'high', NOW() + INTERVAL '1 day'),
  (auth.uid(), 'Update API documentation', 'Document new endpoints', 'pending', 'medium', NOW() + INTERVAL '5 days');

-- Insert sample focus session
INSERT INTO user_activity_sessions (user_id, session_type, started_at, ended_at, duration_minutes)
VALUES 
  (auth.uid(), 'focus', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '1 hour', 120);
```

## API Routes

The dashboard uses these server actions:
- `getDashboardStats()` - Fetches stats for cards
- `getUserTasks()` - Gets user's active tasks
- `getRecentActivity()` - Gets recent messages from servers

All data is fetched server-side for security and performance.

## Security

All tables have Row Level Security (RLS) enabled:
- Users can only view/edit their own tasks
- Users can only see events they created or are invited to
- Activity sessions are private to each user

## Performance

Indexes are created on:
- User IDs for fast lookups
- Timestamps for time-based queries
- Server IDs for cross-server queries
- Task status and priority for filtering
