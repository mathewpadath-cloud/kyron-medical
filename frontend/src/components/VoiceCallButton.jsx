import { useState } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const PhoneIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.5 4.18a2 2 0 011.99-2.18h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 9.91a16 16 0 006.18 6.18l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" />
  </svg>
);

export default function VoiceCallButton({ sessionId, messages, patient }) {
  const [status, setStatus] = useState('idle'); // idle | calling | active | error
  const [errorMsg, setErrorMsg] = useState('');

  const resetAfter = (ms, toStatus = 'idle') => {
    setTimeout(() => {
      setStatus(toStatus);
      setErrorMsg('');
    }, ms);
  };

  const handleClick = async () => {
    if (!patient?.phone) {
      setErrorMsg('Share your phone number in chat first');
      setStatus('error');
      resetAfter(3500);
      return;
    }

    setStatus('calling');

    try {
      await axios.post(`${BACKEND_URL}/api/vapi/initiate-call`, {
        phoneNumber: patient.phone,
        chatHistory: messages,
        patient,
        sessionId
      });

      setStatus('active');
      resetAfter(6000);
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        (err.response?.status === 503 ? 'Voice service not configured' : 'Unable to start call');
      setErrorMsg(msg);
      setStatus('error');
      resetAfter(4000);
    }
  };

  if (status === 'error') {
    return (
      <div
        className="glass-card rounded-xl px-3 py-2 text-xs font-medium"
        style={{
          color: '#ff8080',
          border: '1px solid rgba(255,80,80,0.2)',
          maxWidth: '220px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {errorMsg}
      </div>
    );
  }

  if (status === 'active') {
    return (
      <div
        className="glass-card rounded-xl px-3 py-2 flex items-center gap-2"
        style={{ border: '1px solid rgba(34,197,94,0.25)' }}
      >
        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
        <span className="text-xs font-medium" style={{ color: '#86efac' }}>
          Calling your phone…
        </span>
      </div>
    );
  }

  if (status === 'calling') {
    return (
      <div
        className="glass-card rounded-xl px-3 py-2 flex items-center gap-2"
        style={{ border: '1px solid rgba(0,102,255,0.2)' }}
      >
        <div
          className="w-3 h-3 rounded-full border-2 animate-spin flex-shrink-0"
          style={{ borderColor: '#0066FF', borderTopColor: 'transparent' }}
        />
        <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
          Initiating…
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleClick}
      className="glass-card rounded-xl px-3 py-2 flex items-center gap-2 transition-all duration-200"
      style={{
        border: '1px solid rgba(255,255,255,0.1)',
        color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer',
        userSelect: 'none'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(0,102,255,0.4)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.95)';
        e.currentTarget.style.background = 'rgba(0,102,255,0.08)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.7)';
        e.currentTarget.style.background = '';
      }}
    >
      <PhoneIcon />
      <span className="text-xs font-medium whitespace-nowrap">Switch to Phone Call</span>
    </button>
  );
}
