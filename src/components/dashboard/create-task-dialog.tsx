'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface CreateTaskDialogProps {
  onTaskCreated?: () => void;
}

export function CreateTaskDialog({ onTaskCreated }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priority: formData.priority,
          due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create task');
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: ''
      });

      setOpen(false);
      onTaskCreated?.();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#5865f2] hover:bg-[#4752c4] text-white">
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#2b2d31] border-none text-[#f2f3f5]">
        <DialogHeader>
          <DialogTitle className="text-[#f2f3f5]">Create New Task</DialogTitle>
          <DialogDescription className="text-[#b5bac1]">
            Add a new task to track your work
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-[#b5bac1]">
              Task Title *
            </Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
              className="bg-[#383a40] border-none text-[#dbdee1] placeholder:text-[#87898c] mt-2"
            />
          </div>

          <div>
            <Label htmlFor="description" className="text-[#b5bac1]">
              Description
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details..."
              rows={3}
              className="bg-[#383a40] border-none text-[#dbdee1] placeholder:text-[#87898c] mt-2 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="priority" className="text-[#b5bac1]">
              Priority
            </Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              className="w-full mt-2 bg-[#383a40] border-none text-[#dbdee1] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <Label htmlFor="dueDate" className="text-[#b5bac1]">
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="datetime-local"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              className="bg-[#383a40] border-none text-[#dbdee1] mt-2"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-[#b5bac1] hover:text-[#dbdee1] hover:bg-[#383a40]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.title}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
