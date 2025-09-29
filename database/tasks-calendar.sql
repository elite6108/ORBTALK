-- =====================================================
-- TASKS AND CALENDAR SCHEMA
-- Real productivity features for dashboard
-- =====================================================

-- Tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    due_date TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT title_length CHECK (LENGTH(title) BETWEEN 1 AND 200)
);

-- Calendar events table
CREATE TABLE IF NOT EXISTS public.calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    server_id UUID REFERENCES public.servers(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.channels(id) ON DELETE SET NULL,
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(20) NOT NULL DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'reminder', 'deadline', 'event')),
    
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT FALSE,
    
    location TEXT,
    attendees UUID[] DEFAULT ARRAY[]::UUID[],
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    CONSTRAINT title_length CHECK (LENGTH(title) BETWEEN 1 AND 200),
    CONSTRAINT valid_time_range CHECK (end_time IS NULL OR end_time > start_time)
);

-- User activity tracking (for focus time, etc.)
CREATE TABLE IF NOT EXISTS public.user_activity_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    session_type VARCHAR(20) NOT NULL CHECK (session_type IN ('focus', 'active', 'break')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_server_id ON public.tasks(server_id);

CREATE INDEX IF NOT EXISTS idx_calendar_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_server_id ON public.calendar_events(server_id);

CREATE INDEX IF NOT EXISTS idx_activity_user_id ON public.user_activity_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_started_at ON public.user_activity_sessions(started_at);

-- RLS Policies
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity_sessions ENABLE ROW LEVEL SECURITY;

-- Tasks policies
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can create their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Calendar policies
CREATE POLICY "Users can view their own events"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = ANY(attendees));

CREATE POLICY "Users can create their own events"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own events"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own events"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Activity sessions policies
CREATE POLICY "Users can view their own activity"
  ON public.user_activity_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own activity"
  ON public.user_activity_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity"
  ON public.user_activity_sessions FOR UPDATE
  USING (auth.uid() = user_id);
