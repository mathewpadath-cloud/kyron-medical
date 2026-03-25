/**
 * AppointmentPicker — Displays available slots and handles selection.
 * Used as a standalone slot picker component.
 * The primary booking flow runs through ChatInterface.
 */

import { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function formatSlot(isoString) {
  const date = new Date(isoString);
  const dayName = date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  return { dayName, monthDay, time };
}

export default function AppointmentPicker({ doctorId, onSelect, selectedSlotId = null }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dayFilter, setDayFilter] = useState('');

  useEffect(() => {
    if (!doctorId) return;
    fetchSlots();
  }, [doctorId, dayFilter]);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    try {
      const params = dayFilter ? { day: dayFilter } : {};
      const { data } = await axios.get(`${BACKEND_URL}/api/appointments/slots/${doctorId}`, { params });
      setSlots(data.slots || []);
    } catch (e) {
      setError('Could not load available slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  if (!doctorId) return null;

  return (
    <div className="space-y-4">
      {/* Day filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setDayFilter('')}
          className="text-xs px-3 py-1.5 rounded-full transition-all"
          style={{
            background: !dayFilter ? 'rgba(0,102,255,0.2)' : 'rgba(255,255,255,0.06)',
            color: !dayFilter ? '#3385FF' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${!dayFilter ? 'rgba(0,102,255,0.35)' : 'rgba(255,255,255,0.1)'}`
          }}
        >
          All Days
        </button>
        {DAYS.map(day => (
          <button
            key={day}
            onClick={() => setDayFilter(day.toLowerCase())}
            className="text-xs px-3 py-1.5 rounded-full transition-all"
            style={{
              background: dayFilter === day.toLowerCase() ? 'rgba(0,102,255,0.2)' : 'rgba(255,255,255,0.06)',
              color: dayFilter === day.toLowerCase() ? '#3385FF' : 'rgba(255,255,255,0.5)',
              border: `1px solid ${dayFilter === day.toLowerCase() ? 'rgba(0,102,255,0.35)' : 'rgba(255,255,255,0.1)'}`
            }}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Slots list */}
      {loading && (
        <div className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Loading available times…
        </div>
      )}

      {error && (
        <div className="text-sm text-center py-3" style={{ color: '#ff8080' }}>
          {error}
        </div>
      )}

      {!loading && !error && slots.length === 0 && (
        <div className="text-center py-6 text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No available slots {dayFilter ? `for ${dayFilter}` : ''}. Try a different day.
        </div>
      )}

      {!loading && slots.length > 0 && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {slots.slice(0, 20).map(slot => {
            const { dayName, monthDay, time } = formatSlot(slot.datetime);
            const isSelected = slot.id === selectedSlotId;

            return (
              <button
                key={slot.id}
                onClick={() => onSelect?.(slot)}
                className="w-full text-left rounded-xl px-4 py-3 transition-all"
                style={{
                  background: isSelected
                    ? 'rgba(0,102,255,0.15)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${isSelected ? 'rgba(0,102,255,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  cursor: 'pointer'
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-white">{dayName}, {monthDay}</div>
                    <div className="text-xs mt-0.5" style={{ color: isSelected ? '#3385FF' : 'rgba(255,255,255,0.45)' }}>
                      {time}
                    </div>
                  </div>
                  {isSelected && (
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ background: '#0066FF' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
