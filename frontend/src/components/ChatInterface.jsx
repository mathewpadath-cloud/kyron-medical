import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import VoiceCallButton from './VoiceCallButton';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function getOrCreateSessionId() {
  const key = 'kyron-session-id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

/* ─── Sub-components ─────────────────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3 message-enter">
      <Avatar label="K" gradient />
      <div
        className="glass-card rounded-2xl rounded-bl-sm px-4 py-3.5"
        style={{ minWidth: 64 }}
      >
        <div className="flex items-center gap-1.5 h-4">
          <span className="typing-dot block w-2 h-2 rounded-full" style={{ background: '#0066FF' }} />
          <span className="typing-dot block w-2 h-2 rounded-full" style={{ background: '#0066FF' }} />
          <span className="typing-dot block w-2 h-2 rounded-full" style={{ background: '#0066FF' }} />
        </div>
      </div>
    </div>
  );
}

function Avatar({ label, gradient = false }) {
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 select-none"
      style={
        gradient
          ? {
              background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(0,102,255,0.35)'
            }
          : {
              background: 'rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(255,255,255,0.1)'
            }
      }
    >
      {label}
    </div>
  );
}

function ChatMessage({ msg, index }) {
  const isUser = msg.role === 'user';

  return (
    <div
      className={`flex items-end gap-2.5 message-enter ${isUser ? 'flex-row-reverse' : ''}`}
      style={{ animationDelay: `${Math.min(index * 0.04, 0.3)}s` }}
    >
      <Avatar label={isUser ? 'P' : 'K'} gradient={!isUser} />
      <div
        className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser ? 'rounded-br-sm' : 'glass-card rounded-bl-sm'
        }`}
        style={{
          maxWidth: '78%',
          background: isUser ? 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)' : undefined,
          color: 'rgba(255,255,255,0.93)',
          wordBreak: 'break-word',
          whiteSpace: 'pre-wrap',
          boxShadow: isUser ? '0 4px 14px rgba(0,102,255,0.3)' : undefined
        }}
      >
        {msg.content}
      </div>
    </div>
  );
}

function BookingConfirmation({ patientEmail, onNewAppointment }) {
  return (
    <div
      className="glass-card rounded-2xl p-4 message-enter"
      style={{
        border: '1px solid rgba(34,197,94,0.2)',
        background: 'rgba(34,197,94,0.04)'
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(34,197,94,0.15)' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="#22c55e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="text-sm font-semibold" style={{ color: '#86efac' }}>
          Appointment Confirmed
        </span>
      </div>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', paddingLeft: '34px' }}>
        Confirmation email sent to {patientEmail || 'your email address'}
      </p>
      <button
        onClick={onNewAppointment}
        className="mt-3 w-full rounded-xl py-2 text-xs font-semibold transition-all"
        style={{
          background: 'rgba(0,102,255,0.12)',
          border: '1px solid rgba(0,102,255,0.25)',
          color: '#3385FF',
          cursor: 'pointer'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,102,255,0.2)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,102,255,0.12)'}
      >
        + Book Another Appointment
      </button>
    </div>
  );
}

function SmsOptIn({ checked, onChange }) {
  return (
    <label
      className="flex items-center gap-2.5 cursor-pointer select-none group"
      style={{ padding: '10px 20px' }}
    >
      <div className="relative w-4 h-4 flex-shrink-0">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
        />
        <div
          className="w-4 h-4 rounded border flex items-center justify-center transition-all duration-150"
          style={{
            border: checked ? '1px solid #0066FF' : '1px solid rgba(255,255,255,0.2)',
            background: checked ? '#0066FF' : 'rgba(255,255,255,0.05)'
          }}
        >
          {checked && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
      </div>
      <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
        Also send me an SMS confirmation
      </span>
    </label>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────────── */

export default function ChatInterface() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(getOrCreateSessionId);
  const [sessionData, setSessionData] = useState({});
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [isBooked, setIsBooked] = useState(false);
  const [bookedEmail, setBookedEmail] = useState('');
  const [error, setError] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const initialized = useRef(false);
  const isTypingRef = useRef(false);

  const handleNewAppointment = useCallback(() => {
    sessionStorage.removeItem('kyron-session-id');
    setMessages([]);
    setInput('');
    setIsTyping(false);
    setSessionData({});
    setSmsOptIn(false);
    setIsBooked(false);
    setBookedEmail('');
    setError('');
    initialized.current = false;
    isTypingRef.current = false;
    // Generate a new session and kick off greeting
    const newId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem('kyron-session-id', newId);
    axios.post(`${BACKEND_URL}/api/chat`, { message: 'Hello', sessionId: newId, smsOptIn: false })
      .then(({ data }) => setMessages([{ role: 'assistant', content: data.message }]))
      .catch(() => setError('Connection error. Please try again.'));
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text, currentSmsOptIn = false) => {
    if (isTypingRef.current) return;

    isTypingRef.current = true;
    setIsTyping(true);
    setError('');

    try {
      const { data } = await axios.post(`${BACKEND_URL}/api/chat`, {
        message: text,
        sessionId,
        smsOptIn: currentSmsOptIn
      });

      setIsTyping(false);
      isTypingRef.current = false;

      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);

      if (data.sessionData && Object.keys(data.sessionData).length > 0) {
        setSessionData(prev => ({ ...prev, ...data.sessionData }));
      }

      if (data.booking) {
        await processBooking(data.booking, currentSmsOptIn);
      }
    } catch (err) {
      setIsTyping(false);
      isTypingRef.current = false;

      const msg = err.response?.data?.error || 'Connection error. Please try again.';
      setError(msg);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment."
      }]);
    }
  }, [sessionId]);

  const processBooking = async (booking, currentSmsOptIn) => {
    try {
      // Book the appointment
      const bookRes = await axios.post(`${BACKEND_URL}/api/appointments/book`, {
        slotId: booking.slotId,
        doctorId: booking.doctorId,
        patient: {
          firstName: booking.firstName,
          lastName: booking.lastName,
          dob: booking.dob,
          phone: booking.phone,
          email: booking.email,
          smsOptIn: currentSmsOptIn
        },
        reason: booking.reason
      });

      if (!bookRes.data.success) return;

      const appointment = bookRes.data.appointment;
      setIsBooked(true);
      setBookedEmail(booking.email || '');

      // Send confirmation email (non-blocking)
      axios.post(`${BACKEND_URL}/api/email/send-confirmation`, {
        appointment: {
          ...appointment,
          patient: {
            firstName: booking.firstName,
            lastName: booking.lastName,
            phone: booking.phone,
            email: booking.email,
            smsOptIn: currentSmsOptIn
          }
        }
      }).catch(e => console.warn('Email send failed (non-critical):', e.message));

    } catch (err) {
      console.error('Booking error:', err.response?.data || err.message);
    }
  };

  // Initialize with greeting
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    sendMessage('Hello', false);
  }, [sendMessage]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || isTyping || isBooked) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    sendMessage(text, smsOptIn);
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSmsChange = (checked) => {
    setSmsOptIn(checked);
    // Also send sms opt-in update to backend so it's saved in session
    if (sessionData.phone) {
      axios.post(`${BACKEND_URL}/api/chat`, {
        message: `__sms_update__`,
        sessionId,
        smsOptIn: checked
      }).catch(() => {});
    }
  };

  return (
    <div
      className="glass-card-strong rounded-3xl flex flex-col overflow-hidden"
      style={{
        height: 'calc(100dvh - 96px)',
        maxHeight: 820,
        minHeight: 500
      }}
    >
      {/* ── Chat Header ── */}
      <div
        className="px-5 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #0066FF 0%, #0044CC 100%)',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,102,255,0.4)'
              }}
            >
              K
            </div>
            <div
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
              style={{ background: '#22c55e', borderColor: '#0A1628' }}
            />
          </div>
          <div>
            <div className="text-white font-semibold text-sm leading-tight">Kyra</div>
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.42)' }}>
              AI Receptionist · Kyron Medical
            </div>
          </div>
        </div>

        <VoiceCallButton
          sessionId={sessionId}
          messages={messages}
          patient={sessionData}
        />
      </div>

      {/* ── Messages Area ── */}
      <div
        className="flex-1 overflow-y-auto px-5 py-5 space-y-4"
        style={{ scrollbarWidth: 'thin' }}
      >
        {messages.length === 0 && !isTyping && (
          <div
            className="flex items-center justify-center h-full"
            style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}
          >
            Starting conversation…
          </div>
        )}

        {messages.map((msg, i) => (
          <ChatMessage key={i} msg={msg} index={i} />
        ))}

        {isTyping && <TypingIndicator />}

        {isBooked && (
          <BookingConfirmation patientEmail={bookedEmail} onNewAppointment={handleNewAppointment} />
        )}

        {error && (
          <div
            className="text-center text-xs py-2 px-4 rounded-xl"
            style={{
              color: '#ff8080',
              background: 'rgba(255,80,80,0.06)',
              border: '1px solid rgba(255,80,80,0.15)'
            }}
          >
            {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── SMS Opt-in ── */}
      {!isBooked && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
          <SmsOptIn checked={smsOptIn} onChange={handleSmsChange} />
        </div>
      )}

      {/* ── Input Area ── */}
      <div
        className="px-4 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-end gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => {
              setInput(e.target.value);
              // Auto-resize
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
            }}
            onKeyDown={handleKeyDown}
            placeholder={isBooked ? 'Your appointment is confirmed!' : 'Type your message…'}
            disabled={isBooked || isTyping}
            rows={1}
            className="glass-input flex-1 rounded-2xl px-4 py-3 text-sm resize-none"
            style={{
              minHeight: '44px',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: '1.5'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping || isBooked}
            className="btn-primary rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ width: 44, height: 44 }}
            aria-label="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p
          className="text-center mt-2.5 text-xs"
          style={{ color: 'rgba(255,255,255,0.18)' }}
        >
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
