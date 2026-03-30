'use client';

/**
 * TrialExpiredOverlay — shown over all dashboard content when trial has expired.
 *
 * Design:
 * - Semi-transparent overlay locks all agent modules except Sales/Email Guard
 *   (one agent stays live to keep them hooked)
 * - Big CTA: "Subscribe from $199/mo — your agents restart instantly"
 * - "Your data is safe" reassurance
 * - Only rendered when TRIAL_MODE_ACTIVE=true AND trial.status === 'expired'
 */

interface TrialExpiredOverlayProps {
  /** Whether the overlay should be shown */
  show: boolean;
}

export default function TrialExpiredOverlay({ show }: TrialExpiredOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0a0a0a]/90 backdrop-blur-sm">
      <div className="max-w-lg w-full mx-4 bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-8 text-center shadow-2xl">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">⏸️</span>
        </div>

        {/* Headline */}
        <h2 className="text-2xl font-black text-white mb-2">Your trial has ended</h2>
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">
          Your AI team is paused. All your data, leads, and history are safe —
          your agents restart the moment you subscribe.
        </p>

        {/* What stays running */}
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 mb-6 text-left">
          <p className="text-green-400 text-xs font-bold mb-2">✅ Still running for you</p>
          <p className="text-gray-300 text-xs leading-relaxed">
            <strong>Email Guard (Sales)</strong> — AKAI is still watching your inbox for leads so you don&apos;t miss anything while you decide.
          </p>
        </div>

        {/* Paused agents */}
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6 text-left">
          <p className="text-gray-500 text-xs font-bold mb-2">⏸️ Paused — reactivate to resume</p>
          <div className="grid grid-cols-2 gap-1.5">
            {['Sophie (Voice)', 'Social / CMO', 'Proposals', 'Calendar', 'Ads', 'Recruit', 'Finance', 'Web Agent'].map(agent => (
              <div key={agent} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-700 flex-shrink-0" />
                {agent}
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <a
          href="/settings#upgrade"
          className="block w-full bg-[#D4AF37] text-black font-black text-sm py-3.5 rounded-xl hover:opacity-90 transition mb-3"
        >
          Subscribe from $199/mo — restart instantly →
        </a>

        <p className="text-gray-600 text-xs">
          No setup. No waiting. Your agents restart the moment payment confirms.
        </p>
      </div>
    </div>
  );
}
