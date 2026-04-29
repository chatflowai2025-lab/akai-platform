'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';

// ── Types ─────────────────────────────────────────────────────────────────

export interface LeadProfile {
  vertical: string;
  verticalCustom?: string;
  location: string;
  locationCustom?: string;
  companySize: string[];
  decisionMakers: string[];
  exclusions: string;
  createdAt: string;
  updatedAt: string;
}

interface LeadProfileWizardProps {
  userId: string;
  onComplete: (profile: LeadProfile) => void;
  onCancel: () => void;
  existingProfile?: LeadProfile | null;
}

// ── Options ───────────────────────────────────────────────────────────────

const VERTICALS = [
  { value: 'luxury_kitchens', label: '🏠 Luxury Kitchens & Interiors' },
  { value: 'real_estate', label: '🏢 Real Estate & Property' },
  { value: 'legal', label: '⚖️ Legal Services' },
  { value: 'accounting', label: '📊 Accounting & Finance' },
  { value: 'recruitment', label: '👔 Recruitment & HR' },
  { value: 'construction', label: '🔨 Construction & Trades' },
  { value: 'marine', label: '⛵ Marine & Yachts' },
  { value: 'landscaping', label: '🌿 Landscaping & Outdoor' },
  { value: 'medical', label: '🏥 Medical & Healthcare' },
  { value: 'fitness', label: '💪 Fitness & Wellness' },
  { value: 'hospitality', label: '🍽️ Hospitality & Events' },
  { value: 'ecommerce', label: '🛒 E-commerce & Retail' },
  { value: 'saas', label: '💻 SaaS & Technology' },
  { value: 'other', label: '✨ Other (specify)' },
];

const LOCATIONS = [
  { value: 'sydney', label: '🇦🇺 Sydney, Australia' },
  { value: 'melbourne', label: '🇦🇺 Melbourne, Australia' },
  { value: 'brisbane', label: '🇦🇺 Brisbane, Australia' },
  { value: 'perth', label: '🇦🇺 Perth, Australia' },
  { value: 'australia_wide', label: '🇦🇺 Australia-wide' },
  { value: 'new_york', label: '🇺🇸 New York, USA' },
  { value: 'los_angeles', label: '🇺🇸 Los Angeles, USA' },
  { value: 'usa_wide', label: '🇺🇸 USA-wide' },
  { value: 'london', label: '🇬🇧 London, UK' },
  { value: 'uk_wide', label: '🇬🇧 UK-wide' },
  { value: 'other', label: '🌍 Other (specify)' },
];

const COMPANY_SIZES = [
  { value: 'sole_trader', label: 'Sole Trader / Freelancer' },
  { value: 'micro', label: 'Micro (1-5 employees)' },
  { value: 'small', label: 'Small (6-20 employees)' },
  { value: 'medium', label: 'Medium (21-100 employees)' },
  { value: 'large', label: 'Large (100+ employees)' },
];

const DECISION_MAKERS = [
  { value: 'owner', label: '👤 Owner / Founder' },
  { value: 'ceo', label: '🎯 CEO / Managing Director' },
  { value: 'marketing', label: '📣 Marketing Director / CMO' },
  { value: 'sales', label: '📞 Sales Director / VP Sales' },
  { value: 'operations', label: '⚙️ Operations Manager / COO' },
  { value: 'finance', label: '💰 CFO / Finance Director' },
  { value: 'hr', label: '👥 HR Director' },
  { value: 'it', label: '💻 IT Director / CTO' },
  { value: 'procurement', label: '📋 Procurement / Purchasing' },
];

// ── Component ─────────────────────────────────────────────────────────────

export function LeadProfileWizard({ userId, onComplete, onCancel, existingProfile }: LeadProfileWizardProps) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [vertical, setVertical] = useState(existingProfile?.vertical || '');
  const [verticalCustom, setVerticalCustom] = useState(existingProfile?.verticalCustom || '');
  const [location, setLocation] = useState(existingProfile?.location || '');
  const [locationCustom, setLocationCustom] = useState(existingProfile?.locationCustom || '');
  const [companySize, setCompanySize] = useState<string[]>(existingProfile?.companySize || []);
  const [decisionMakers, setDecisionMakers] = useState<string[]>(existingProfile?.decisionMakers || []);
  const [exclusions, setExclusions] = useState(existingProfile?.exclusions || '');

  const totalSteps = 5;

  const toggleArrayValue = (arr: string[], value: string, setter: (v: string[]) => void) => {
    if (arr.includes(value)) {
      setter(arr.filter(v => v !== value));
    } else {
      setter([...arr, value]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return vertical !== '' && (vertical !== 'other' || verticalCustom.trim() !== '');
      case 2: return location !== '' && (location !== 'other' || locationCustom.trim() !== '');
      case 3: return companySize.length > 0;
      case 4: return decisionMakers.length > 0;
      case 5: return true; // Exclusions are optional
      default: return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    const profile: LeadProfile = {
      vertical,
      verticalCustom: vertical === 'other' ? verticalCustom : undefined,
      location,
      locationCustom: location === 'other' ? locationCustom : undefined,
      companySize,
      decisionMakers,
      exclusions: exclusions.trim(),
      createdAt: existingProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, 'users', userId), { leadProfile: profile }, { merge: true });
      }
      onComplete(profile);
    } catch (err) {
      console.error('[LeadProfileWizard] Save failed:', err);
      // Still call onComplete to update local state
      onComplete(profile);
    } finally {
      setSaving(false);
    }
  };

  // ── Render Steps ──────────────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">What industry are you targeting?</h3>
              <p className="text-gray-500 text-sm">We'll find leads in this vertical for you.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {VERTICALS.map(v => (
                <button
                  key={v.value}
                  onClick={() => setVertical(v.value)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                    vertical === v.value
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{v.label}</span>
                </button>
              ))}
            </div>
            {vertical === 'other' && (
              <input
                type="text"
                value={verticalCustom}
                onChange={e => setVerticalCustom(e.target.value)}
                placeholder="Enter your industry..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
              />
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Where are your ideal customers?</h3>
              <p className="text-gray-500 text-sm">Geographic focus for lead generation.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {LOCATIONS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLocation(l.value)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors ${
                    location === l.value
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{l.label}</span>
                </button>
              ))}
            </div>
            {location === 'other' && (
              <input
                type="text"
                value={locationCustom}
                onChange={e => setLocationCustom(e.target.value)}
                placeholder="Enter city or region..."
                className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
              />
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">What size companies?</h3>
              <p className="text-gray-500 text-sm">Select all that apply. We'll prioritize leads matching these sizes.</p>
            </div>
            <div className="space-y-2">
              {COMPANY_SIZES.map(s => (
                <button
                  key={s.value}
                  onClick={() => toggleArrayValue(companySize, s.value, setCompanySize)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between ${
                    companySize.includes(s.value)
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{s.label}</span>
                  {companySize.includes(s.value) && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Who do you want to reach?</h3>
              <p className="text-gray-500 text-sm">Select the decision-maker titles you want to contact.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
              {DECISION_MAKERS.map(d => (
                <button
                  key={d.value}
                  onClick={() => toggleArrayValue(decisionMakers, d.value, setDecisionMakers)}
                  className={`text-left px-4 py-3 rounded-xl border transition-colors flex items-center justify-between ${
                    decisionMakers.includes(d.value)
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                  }`}
                >
                  <span className="text-sm font-medium">{d.label}</span>
                  {decisionMakers.includes(d.value) && <span>✓</span>}
                </button>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <h3 className="text-white font-bold text-lg mb-1">Any exclusions?</h3>
              <p className="text-gray-500 text-sm">Competitors, existing clients, or businesses to avoid. (Optional)</p>
            </div>
            <textarea
              value={exclusions}
              onChange={e => setExclusions(e.target.value)}
              placeholder="e.g. Competitor ABC, my current clients, franchises..."
              rows={4}
              className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
            />
            <div className="p-4 bg-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-xl">
              <p className="text-xs text-[#D4AF37] font-semibold mb-2">📋 Your Gold Standard Profile</p>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• <span className="text-white">{VERTICALS.find(v => v.value === vertical)?.label || verticalCustom}</span></li>
                <li>• <span className="text-white">{LOCATIONS.find(l => l.value === location)?.label || locationCustom}</span></li>
                <li>• <span className="text-white">{companySize.map(s => COMPANY_SIZES.find(cs => cs.value === s)?.label).join(', ')}</span></li>
                <li>• <span className="text-white">{decisionMakers.map(d => DECISION_MAKERS.find(dm => dm.value === d)?.label.replace(/^[^\s]+\s/, '')).join(', ')}</span></li>
                {exclusions.trim() && <li>• Excluding: <span className="text-white">{exclusions}</span></li>}
              </ul>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f1f1f]">
          <div>
            <h2 className="text-white font-black text-lg">🎯 Build Your Lead Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of {totalSteps}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-white text-xl leading-none p-1"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-4">
          <div className="h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D4AF37] transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {renderStep()}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1f1f1f]">
          <button
            onClick={step === 1 ? onCancel : handleBack}
            className="px-4 py-2 text-gray-500 hover:text-white text-sm font-medium transition-colors"
          >
            {step === 1 ? 'Cancel' : '← Back'}
          </button>
          
          {step < totalSteps ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                '✨ Generate Leads'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Lead Profile Summary Card ─────────────────────────────────────────────

interface LeadProfileCardProps {
  profile: LeadProfile;
  onEdit: () => void;
  onGenerateLeads: () => void;
  generating?: boolean;
}

export function LeadProfileCard({ profile, onEdit, onGenerateLeads, generating }: LeadProfileCardProps) {
  const verticalLabel = VERTICALS.find(v => v.value === profile.vertical)?.label || profile.verticalCustom || profile.vertical;
  const locationLabel = LOCATIONS.find(l => l.value === profile.location)?.label || profile.locationCustom || profile.location;
  const sizeLabels = profile.companySize.map(s => COMPANY_SIZES.find(cs => cs.value === s)?.label || s).join(', ');
  const dmLabels = profile.decisionMakers.map(d => DECISION_MAKERS.find(dm => dm.value === d)?.label.replace(/^[^\s]+\s/, '') || d).join(', ');

  return (
    <div className="bg-[#111] border border-[#D4AF37]/20 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <span className="text-[#D4AF37]">🎯</span>
            Your Gold Standard Lead Profile
          </h3>
          <p className="text-xs text-gray-600 mt-0.5">
            Last updated {new Date(profile.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
          </p>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-gray-500 hover:text-white px-3 py-1 border border-[#2a2a2a] rounded-lg transition-colors"
        >
          Edit
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-[#0d0d0d] rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Industry</p>
          <p className="text-sm text-white font-medium truncate">{verticalLabel}</p>
        </div>
        <div className="bg-[#0d0d0d] rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Location</p>
          <p className="text-sm text-white font-medium truncate">{locationLabel}</p>
        </div>
        <div className="bg-[#0d0d0d] rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Company Size</p>
          <p className="text-sm text-white font-medium truncate">{sizeLabels}</p>
        </div>
        <div className="bg-[#0d0d0d] rounded-xl p-3">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Decision Makers</p>
          <p className="text-sm text-white font-medium truncate">{dmLabels}</p>
        </div>
      </div>

      {profile.exclusions && (
        <div className="bg-[#0d0d0d] rounded-xl p-3 mb-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Exclusions</p>
          <p className="text-xs text-gray-400">{profile.exclusions}</p>
        </div>
      )}

      {/* Prominent Generate Leads CTA */}
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-[#D4AF37]/30 to-[#D4AF37]/10 rounded-2xl blur-md opacity-75" />
        <button
          onClick={onGenerateLeads}
          disabled={generating}
          className="relative w-full flex items-center justify-center gap-3 px-4 py-4 bg-[#D4AF37] text-black rounded-xl text-base font-black hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-[#D4AF37]/20"
        >
          {generating ? (
            <>
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Finding your ideal leads...
            </>
          ) : (
            <>
              <span className="text-xl">✨</span>
              Generate New Leads
              <span className="text-lg">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────

interface EmptyLeadProfileProps {
  onSetup: () => void;
}

export function EmptyLeadProfile({ onSetup }: EmptyLeadProfileProps) {
  return (
    <div className="bg-gradient-to-br from-[#D4AF37]/5 to-transparent border-2 border-dashed border-[#D4AF37]/30 rounded-2xl p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center">
        <span className="text-4xl">🎯</span>
      </div>
      <h3 className="text-white font-black text-xl mb-2">Ready to Generate Leads?</h3>
      <p className="text-gray-400 text-sm mb-6 max-w-md mx-auto">
        Tell us your ideal customer in 5 quick steps. We&apos;ll find and deliver targeted leads matching your Gold Standard profile.
      </p>
      
      <button
        onClick={onSetup}
        className="group inline-flex items-center gap-3 px-8 py-4 bg-[#D4AF37] text-black rounded-xl text-base font-black hover:scale-105 transition-all duration-200 shadow-lg shadow-[#D4AF37]/30 hover:shadow-[#D4AF37]/50"
      >
        <span className="text-xl group-hover:animate-pulse">✨</span>
        Build Your Lead Profile
        <span className="text-lg group-hover:translate-x-1 transition-transform">→</span>
      </button>
      
      <div className="mt-6 flex items-center justify-center gap-6 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="text-green-400">✓</span> 5 quick steps
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-green-400">✓</span> AI-powered matching
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-green-400">✓</span> Verified contacts
        </span>
      </div>
    </div>
  );
}
