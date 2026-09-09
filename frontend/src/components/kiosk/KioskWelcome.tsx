'use client';

import { useState } from 'react';
import { User, Calendar, Phone, CreditCard, ArrowRight, Stethoscope } from 'lucide-react';
import { useKioskStore } from '@/store/kioskStore';
import type { PatientRegistration, BiologicalSex } from '@/types/kiosk';
import { cn } from '@/lib/utils';
import { playBeep } from '@/lib/sound';
import { createPatientAndSession } from '@/lib/actions/db';

export function KioskWelcome() {
  const { initSession, addAIMessage } = useKioskStore();
  const [form, setForm] = useState<PatientRegistration>({
    name: '',
    age: '',
    sex: 'male',
    mobile: '',
    abhaId: '',
    language: 'en',
  });
  const [errors, setErrors] = useState<Partial<PatientRegistration>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = () => {
    const e: Partial<PatientRegistration> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.age || isNaN(Number(form.age)) || Number(form.age) < 1 || Number(form.age) > 120)
      e.age = 'Valid age required (1–120)';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setIsSubmitting(true);
    playBeep();
    const sessionId = initSession(form);
    const token = useKioskStore.getState().tokenNumber || 1;

    // Persist to Supabase asynchronously (continues in memory even if DB is offline)
    createPatientAndSession(form, sessionId, token).then((res) => {
      if (!res.success) {
        console.warn('[Supabase Notice]:', res.error);
      }
    });

    // Add the opening AI greeting to the chat
    addAIMessage(
      `Hello ${form.name}! I'm your MediKiosk AI assistant. I'll be asking you a few questions about your health today to help the doctor understand your condition better before your consultation. This usually takes 5–10 minutes. Let's start — what brings you to the hospital today? What is your main concern?`
    );
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-clinical-offwhite flex flex-col items-center justify-center p-6">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Stethoscope className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-kiosk-xl text-slate-900 mb-2">Welcome to MediKiosk</h1>
        <p className="text-kiosk-sm text-slate-600 max-w-md mx-auto">
          Please enter your details below to begin your health history intake.
        </p>
      </div>

      {/* Form */}
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-clinical-muted p-8 space-y-5">

        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <User className="inline w-4 h-4 mr-1" /> Full Name *
          </label>
          <input
            type="text"
            placeholder="e.g. Ramesh Kumar"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className={cn(
              'w-full px-4 py-4 rounded-xl border text-kiosk-sm bg-clinical-offwhite focus:outline-none focus:ring-2 focus:ring-teal-400 transition-all',
              errors.name ? 'border-red-400' : 'border-clinical-muted'
            )}
          />
          {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
        </div>

        {/* Age + Sex */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" /> Age *
            </label>
            <input
              type="number"
              placeholder="Years"
              min={1}
              max={120}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: e.target.value })}
              className={cn(
                'w-full px-4 py-4 rounded-xl border text-kiosk-sm bg-clinical-offwhite focus:outline-none focus:ring-2 focus:ring-teal-400',
                errors.age ? 'border-red-400' : 'border-clinical-muted'
              )}
            />
            {errors.age && <p className="text-red-500 text-sm mt-1">{errors.age}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sex</label>
            <div className="flex gap-2">
              {(['male', 'female', 'other'] as BiologicalSex[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, sex: s })}
                  className={cn(
                    'flex-1 py-4 rounded-xl border text-sm font-semibold capitalize transition-all',
                    form.sex === s
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-clinical-offwhite text-slate-600 border-clinical-muted hover:border-teal-300'
                  )}
                >
                  {s === 'male' ? 'M' : s === 'female' ? 'F' : 'O'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile (optional) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <Phone className="inline w-4 h-4 mr-1" /> Mobile Number{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="tel"
            placeholder="+91 98765 43210"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className="w-full px-4 py-4 rounded-xl border border-clinical-muted text-kiosk-sm bg-clinical-offwhite focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* ABHA ID (optional) */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            <CreditCard className="inline w-4 h-4 mr-1" /> ABHA / OPD Token{' '}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. 91-8273-1928 or OPD-042"
            value={form.abhaId}
            onChange={(e) => setForm({ ...form, abhaId: e.target.value })}
            className="w-full px-4 py-4 rounded-xl border border-clinical-muted text-kiosk-sm bg-clinical-offwhite focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        {/* Language */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Preferred Language
          </label>
          <div className="flex gap-3">
            {[
              { val: 'en', label: 'English' },
              { val: 'hi', label: 'हिन्दी' },
            ].map((lang) => (
              <button
                key={lang.val}
                onClick={() => setForm({ ...form, language: lang.val as 'en' | 'hi' })}
                className={cn(
                  'flex-1 py-4 rounded-xl border font-semibold text-sm transition-all touch-target',
                  form.language === lang.val
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-clinical-offwhite text-slate-600 border-clinical-muted hover:border-teal-300'
                )}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-3 text-kiosk-sm touch-target-lg transition-colors disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? (
            'Starting...'
          ) : (
            <>
              Begin Health Interview
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
