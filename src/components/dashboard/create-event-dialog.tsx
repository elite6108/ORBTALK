'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, Plus } from 'lucide-react';

interface CreateEventDialogProps {
  onEventCreated?: () => void;
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'meeting',
    startTime: '',
    endTime: '',
    location: '',
    allDay: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          event_type: formData.eventType,
          start_time: formData.startTime ? new Date(formData.startTime).toISOString() : null,
          end_time: formData.endTime ? new Date(formData.endTime).toISOString() : null,
          location: formData.location,
          all_day: formData.allDay
        })
      });

      if (!res.ok) {
        throw new Error('Failed to create event');
      }

      // Reset form
      setFormData({
        title: '',
        description: '',
        eventType: 'meeting',
        startTime: '',
        endTime: '',
        location: '',
        allDay: false
      });

      setOpen(false);
      onEventCreated?.();
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#3ba55d] hover:bg-[#2d7d46] text-white">
          <Calendar className="h-4 w-4 mr-2" />
          New Event
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#2b2d31] border-none text-[#f2f3f5]">
        <DialogHeader>
          <DialogTitle className="text-[#f2f3f5]">Create Calendar Event</DialogTitle>
          <DialogDescription className="text-[#b5bac1]">
            Schedule a new meeting or event
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="event-title" className="text-[#b5bac1]">
              Event Title *
            </Label>
            <Input
              id="event-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter event title"
              required
              className="bg-[#383a40] border-none text-[#dbdee1] placeholder:text-[#87898c] mt-2"
            />
          </div>

          <div>
            <Label htmlFor="event-description" className="text-[#b5bac1]">
              Description
            </Label>
            <Textarea
              id="event-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add event details..."
              rows={2}
              className="bg-[#383a40] border-none text-[#dbdee1] placeholder:text-[#87898c] mt-2 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="event-type" className="text-[#b5bac1]">
              Event Type
            </Label>
            <select
              id="event-type"
              value={formData.eventType}
              onChange={(e) => setFormData({ ...formData, eventType: e.target.value })}
              className="w-full mt-2 bg-[#383a40] border-none text-[#dbdee1] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
            >
              <option value="meeting">Meeting</option>
              <option value="reminder">Reminder</option>
              <option value="deadline">Deadline</option>
              <option value="event">Event</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time" className="text-[#b5bac1]">
                Start Time *
              </Label>
              <Input
                id="start-time"
                type="datetime-local"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                required
                className="bg-[#383a40] border-none text-[#dbdee1] mt-2"
              />
            </div>
            <div>
              <Label htmlFor="end-time" className="text-[#b5bac1]">
                End Time
              </Label>
              <Input
                id="end-time"
                type="datetime-local"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="bg-[#383a40] border-none text-[#dbdee1] mt-2"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="location" className="text-[#b5bac1]">
              Location
            </Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Add location or meeting link"
              className="bg-[#383a40] border-none text-[#dbdee1] placeholder:text-[#87898c] mt-2"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              id="all-day"
              type="checkbox"
              checked={formData.allDay}
              onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
              className="w-4 h-4 rounded bg-[#383a40] border-none accent-[#5865f2]"
            />
            <Label htmlFor="all-day" className="text-[#b5bac1] cursor-pointer">
              All day event
            </Label>
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
              disabled={loading || !formData.title || !formData.startTime}
              className="bg-[#5865f2] hover:bg-[#4752c4] text-white"
            >
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
