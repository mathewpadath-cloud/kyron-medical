/**
 * PatientIntake — Standalone form component for patient data collection.
 * This is used as a fallback or standalone intake form.
 * The primary intake flow is handled conversationally via ChatInterface.
 */

import { useState } from 'react';

const FIELDS = [
  { id: 'firstName', label: 'First Name', type: 'text', placeholder: 'Jane' },
  { id: 'lastName', label: 'Last Name', type: 'text', placeholder: 'Smith' },
  { id: 'dob', label: 'Date of Birth', type: 'date', placeholder: '' },
  { id: 'phone', label: 'Phone Number', type: 'tel', placeholder: '(401) 555-0100' },
  { id: 'email', label: 'Email Address', type: 'email', placeholder: 'jane@example.com' },
  { id: 'reason', label: 'Reason for Visit', type: 'textarea', placeholder: 'Describe your symptoms or reason for visiting…' }
];

export default function PatientIntake({ onSubmit, isLoading = false }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', dob: '', phone: '', email: '', reason: ''
  });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!form.firstName.trim()) newErrors.firstName = 'First name is required';
    if (!form.lastName.trim()) newErrors.lastName = 'Last name is required';
    if (!form.dob) newErrors.dob = 'Date of birth is required';
    if (!form.phone.trim()) newErrors.phone = 'Phone number is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!form.reason.trim() || form.reason.trim().length < 5) {
      newErrors.reason = 'Please describe your reason for visiting';
    }
    return newErrors;
  };

  const handleChange = (id, value) => {
    setForm(prev => ({ ...prev, [id]: value }));
    if (errors[id]) {
      setErrors(prev => { const e = { ...prev }; delete e[id]; return e; });
    }
  };

  const handleSubmit = e => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit?.(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map(field => (
        <div key={field.id}>
          <label
            htmlFor={field.id}
            className="block text-xs font-semibold mb-1.5"
            style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.5px', textTransform: 'uppercase' }}
          >
            {field.label}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              id={field.id}
              value={form[field.id]}
              onChange={e => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              rows={3}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm resize-none"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            />
          ) : (
            <input
              id={field.id}
              type={field.type}
              value={form[field.id]}
              onChange={e => handleChange(field.id, e.target.value)}
              placeholder={field.placeholder}
              className="glass-input w-full rounded-xl px-4 py-3 text-sm"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            />
          )}
          {errors[field.id] && (
            <p className="mt-1 text-xs" style={{ color: '#ff8080' }}>
              {errors[field.id]}
            </p>
          )}
        </div>
      ))}

      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full rounded-xl py-3 text-sm font-semibold mt-2"
      >
        {isLoading ? 'Processing…' : 'Find Available Appointments →'}
      </button>
    </form>
  );
}
