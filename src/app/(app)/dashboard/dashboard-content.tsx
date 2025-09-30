'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/dashboard/create-task-dialog';
import { CreateEventDialog } from '@/components/dashboard/create-event-dialog';
import { TasksViewDialog } from '@/components/dashboard/tasks-view-dialog';
import { 
  CheckSquare, 
  MessageSquare, 
  Users, 
  Clock,
  TrendingUp,
  Calendar,
  AlertCircle,
  Check
} from 'lucide-react';

interface DashboardContentProps {
  user: any;
  initialStats?: any;
  initialTasks?: any[];
  initialActivities?: any[];
}

export function DashboardContent({ user, initialStats, initialTasks, initialActivities }: DashboardContentProps) {
  const [stats, setStats] = useState(initialStats || {
    unreadMessages: 0,
    teamMembers: 0,
    onlineMembers: 0,
    focusTime: '0 hrs'
  });
  const [tasks, setTasks] = useState(initialTasks || []);
  const [activities, setActivities] = useState(initialActivities || []);

  const refreshDashboard = () => {
    // Refresh the page to get latest data
    window.location.reload();
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    
    try {
      const res = await fetch('/api/tasks/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_id: taskId,
          status: newStatus
        })
      });

      if (!res.ok) {
        throw new Error('Failed to update task');
      }

      // Update local state - keep completed tasks visible with strikethrough
      setTasks(tasks.map((t: any) => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getPriorityLabel = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
  };

  return (
    <div className="flex-1 bg-[#1e1f22] min-h-screen">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#f2f3f5] mb-2">
              Workspace Hub
            </h1>
            <p className="text-[#b5bac1]">
              Your centralized productivity dashboard
            </p>
          </div>
          <div className="flex gap-3">
            <CreateEventDialog onEventCreated={refreshDashboard} />
            <CreateTaskDialog onTaskCreated={refreshDashboard} />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Active Tasks */}
          <Card className="bg-[#2b2d31] border-none p-6 hover:bg-[#32353b] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="text-[#b5bac1] text-sm font-medium">Active Tasks</div>
              <CheckSquare className="h-5 w-5 text-[#5865f2]" />
            </div>
            <div className="text-3xl font-bold text-[#f2f3f5] mb-2">
              {tasks.filter((t: any) => t.status !== 'completed' && t.status !== 'cancelled').length}
            </div>
            <div className="text-sm text-[#3ba55d]">
              {tasks.filter((t: any) => t.status === 'in_progress').length > 0 ? '+' : ''}
              {tasks.filter((t: any) => t.status === 'in_progress').length} in progress
            </div>
          </Card>

          {/* Unread Messages */}
          <Card className="bg-[#2b2d31] border-none p-6 hover:bg-[#32353b] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="text-[#b5bac1] text-sm font-medium">Unread Messages</div>
              <MessageSquare className="h-5 w-5 text-[#5865f2]" />
            </div>
            <div className="text-3xl font-bold text-[#f2f3f5] mb-2">
              {stats.unreadMessages}
            </div>
            <div className="text-sm text-[#949ba4]">
              Across {stats.channelCount || 0} channels
            </div>
          </Card>

          {/* Team Members */}
          <Card className="bg-[#2b2d31] border-none p-6 hover:bg-[#32353b] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="text-[#b5bac1] text-sm font-medium">Team Members</div>
              <Users className="h-5 w-5 text-[#5865f2]" />
            </div>
            <div className="text-3xl font-bold text-[#f2f3f5] mb-2">
              {stats.onlineMembers} online
            </div>
            <div className="text-sm text-[#949ba4]">
              Out of {stats.teamMembers} total
            </div>
          </Card>

          {/* Focus Time */}
          <Card className="bg-[#2b2d31] border-none p-6 hover:bg-[#32353b] transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="text-[#b5bac1] text-sm font-medium">Focus Time</div>
              <Clock className="h-5 w-5 text-[#5865f2]" />
            </div>
            <div className="text-3xl font-bold text-[#f2f3f5] mb-2">
              {stats.focusTime}
            </div>
            <div className="text-sm text-[#3ba55d]">
              Today's total
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Your Tasks - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Card className="bg-[#2b2d31] border-none">
              <div className="p-6 border-b border-[#3f4147]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-[#f2f3f5]" />
                    <h2 className="text-lg font-semibold text-[#f2f3f5]">Your Tasks</h2>
                  </div>
                  <TasksViewDialog initialTasks={tasks} onTaskUpdate={refreshDashboard} />
                </div>
              </div>
              <div className="p-4 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-[#949ba4]">
                    No active tasks. You&apos;re all caught up!
                  </div>
                ) : (
                  tasks.map((task: any) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-4 rounded-lg hover:bg-[#32353b] transition-colors group ${
                        task.status === 'completed' ? 'opacity-60' : ''
                      }`}
                    >
                      <button 
                        onClick={() => toggleTaskComplete(task.id, task.status)}
                        className="flex-shrink-0 cursor-pointer"
                      >
                        <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
                          task.status === 'completed' 
                            ? 'bg-[#5865f2] border-[#5865f2]' 
                            : 'border-[#949ba4] group-hover:border-[#5865f2]'
                        }`}>
                          {task.status === 'completed' && (
                            <Check className="h-3 w-3 text-white" />
                          )}
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className={`text-sm font-medium truncate ${
                            task.status === 'completed' 
                              ? 'text-[#949ba4] line-through' 
                              : 'text-[#f2f3f5]'
                          }`}>
                            {task.title}
                          </h3>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium text-white ${getPriorityColor(task.priority)}`}>
                            {getPriorityLabel(task.priority)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-[#949ba4]">
                          {task.assigned_by_user && (
                            <span>by {task.assigned_by_user.display_name || task.assigned_by_user.username}</span>
                          )}
                          {task.due_date && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(task.due_date).toLocaleDateString()}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <Card className="bg-[#2b2d31] border-none">
              <div className="p-6 border-b border-[#3f4147]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#f2f3f5]" />
                  <h2 className="text-lg font-semibold text-[#f2f3f5]">Recent Activity</h2>
                </div>
              </div>
              <div className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                {activities.length === 0 ? (
                  <div className="text-center py-12 text-[#949ba4]">
                    No recent activity
                  </div>
                ) : (
                  activities.map((activity: any) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-lg bg-[#5865f2] flex items-center justify-center">
                          <MessageSquare className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f2f3f5] mb-1">
                          {activity.title}
                        </p>
                        {activity.description && (
                          <p className="text-sm text-[#b5bac1] line-clamp-2 mb-1">
                            {activity.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-[#949ba4]">
                          <span>{formatTimeAgo(activity.time)}</span>
                          {activity.channelName && (
                            <>
                              <span>•</span>
                              <span>#{activity.channelName}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* AI Insights */}
        {tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length > 0 && (
          <Card className="bg-[#5865f2] border-none p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-white mb-2">AI Insights</h3>
                <p className="text-white/90 mb-4">
                  Based on your activity, you have {tasks.filter((t: any) => t.due_date && new Date(t.due_date) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length} upcoming deadlines this week. 
                  Consider scheduling a focus session to complete high-priority tasks.
                </p>
                <Button className="bg-white text-[#5865f2] hover:bg-white/90">
                  Schedule focus time →
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}