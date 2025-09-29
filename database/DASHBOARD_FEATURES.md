# Dashboard Features Guide

## Create New Items

### Create Task Button
Located in the top-right of the dashboard header (purple button):
- **Fields**:
  - Task Title (required)
  - Description (optional)
  - Priority: Low, Medium, High, Urgent
  - Due Date (optional datetime)
- **Features**:
  - Creates task assigned to you
  - Shows in "Your Tasks" section
  - Can be marked complete by clicking checkbox

### Create Event Button
Located in the top-right of the dashboard header (green button):
- **Fields**:
  - Event Title (required)
  - Description (optional)
  - Event Type: Meeting, Reminder, Deadline, Event
  - Start Time (required datetime)
  - End Time (optional datetime)
  - Location (optional)
  - All Day checkbox
- **Features**:
  - Creates calendar event for you
  - Stores in calendar_events table
  - Future: Will show in calendar view

## Interactive Features

### Task Checkboxes
- Click the checkbox next to any task to mark it complete
- Completed tasks are automatically filtered from the view
- Updates status in real-time

### Real-time Stats
- **Active Tasks**: Your pending + in-progress tasks
- **Unread Messages**: Messages from last 24 hours
- **Team Members**: Online vs total across all servers
- **Focus Time**: Today's total focus session minutes

### Recent Activity
- Shows latest messages from all your servers
- Displays channel and server names
- Time-ago formatting
- Scrollable feed

## API Endpoints

### Create Task
```
POST /api/tasks/create
Body: {
  title: string (required)
  description?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  due_date?: ISO datetime string
  server_id?: UUID
  channel_id?: UUID
}
```

### Update Task
```
PATCH /api/tasks/update
Body: {
  task_id: string (required)
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  title?: string
  description?: string
  priority?: string
  due_date?: ISO datetime string
}
```

### Create Calendar Event
```
POST /api/calendar/create
Body: {
  title: string (required)
  description?: string
  event_type?: 'meeting' | 'reminder' | 'deadline' | 'event'
  start_time: ISO datetime string (required)
  end_time?: ISO datetime string
  location?: string
  all_day?: boolean
  server_id?: UUID
  channel_id?: UUID
}
```

## Future Enhancements

- [ ] Full calendar view
- [ ] Task editing dialog
- [ ] Task assignment to other users
- [ ] Event reminders/notifications
- [ ] Focus time tracker widget
- [ ] Task filtering and sorting
- [ ] Event attendees management
- [ ] Recurring events
- [ ] Task comments/notes
- [ ] Integration with server channels
