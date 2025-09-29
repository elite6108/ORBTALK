'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Check, Clock, AlertCircle } from 'lucide-react';

interface TasksViewDialogProps {
  initialTasks?: any[];
  onTaskUpdate?: () => void;
}

export function TasksViewDialog({ initialTasks = [], onTaskUpdate }: TasksViewDialogProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'upcoming' | 'completed'>('all');
  const [tasks, setTasks] = useState(initialTasks);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadAllTasks();
    }
  }, [open]);

  const loadAllTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks/list');
      if (!res.ok) throw new Error('Failed to fetch tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
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

      if (!res.ok) throw new Error('Failed to update task');

      // Update local state
      setTasks(tasks.map((t: any) => 
        t.id === taskId ? { ...t, status: newStatus } : t
      ));
      
      onTaskUpdate?.();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
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

  const filterTasks = (taskList: any[]) => {
    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const weekEnd = new Date(now);
    weekEnd.setDate(now.getDate() + 7);

    switch (activeTab) {
      case 'today':
        return taskList.filter((t: any) => {
          if (!t.due_date || t.status === 'completed') return false;
          const dueDate = new Date(t.due_date);
          return dueDate <= todayEnd;
        });
      case 'upcoming':
        return taskList.filter((t: any) => {
          if (!t.due_date || t.status === 'completed') return false;
          const dueDate = new Date(t.due_date);
          return dueDate > todayEnd && dueDate <= weekEnd;
        });
      case 'completed':
        return taskList.filter((t: any) => t.status === 'completed');
      default:
        return taskList;
    }
  };

  const filteredTasks = filterTasks(tasks);

  const tabs = [
    { id: 'all', label: 'All Tasks', icon: null },
    { id: 'today', label: 'Due Today', icon: AlertCircle },
    { id: 'upcoming', label: 'Upcoming', icon: Clock },
    { id: 'completed', label: 'Completed', icon: Check },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-[#5865f2] hover:text-[#4752c4] text-sm" variant="ghost">
          View all
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#2b2d31] border-none text-[#f2f3f5] max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-[#f2f3f5] text-xl">All Tasks</DialogTitle>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-[#3f4147] pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#5865f2] text-white'
                  : 'text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#383a40]'
              }`}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-2 overflow-y-auto max-h-[500px] pr-2">
          {loading ? (
            <div className="text-center py-12 text-[#949ba4]">Loading tasks...</div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 text-[#949ba4]">
              {activeTab === 'completed' ? 'No completed tasks yet' : 'No tasks found'}
            </div>
          ) : (
            filteredTasks.map((task: any) => (
              <div
                key={task.id}
                className={`flex items-start gap-3 p-4 rounded-lg hover:bg-[#32353b] transition-colors group ${
                  task.status === 'completed' ? 'opacity-60' : ''
                }`}
              >
                <button 
                  onClick={() => toggleTaskComplete(task.id, task.status)}
                  className="flex-shrink-0 cursor-pointer mt-0.5"
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
                  <div className="flex items-center gap-2 mb-2">
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
                  {task.description && (
                    <p className="text-sm text-[#b5bac1] mb-2 line-clamp-2">
                      {task.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-[#949ba4]">
                    {task.assigned_by_user && (
                      <span>by {task.assigned_by_user.display_name || task.assigned_by_user.username}</span>
                    )}
                    {task.due_date && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(task.due_date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded ${
                      task.status === 'completed' ? 'bg-[#3ba55d]' :
                      task.status === 'in_progress' ? 'bg-[#5865f2]' :
                      'bg-[#949ba4]'
                    } text-white`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
