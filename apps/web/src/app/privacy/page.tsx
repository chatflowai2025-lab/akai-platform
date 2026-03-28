export const metadata = {
  title: 'Privacy Policy — AKAI',
  description: 'How AKAI collects, uses, and protects your personal information.',
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-sm text-white/40 hover:text-white transition-colors mb-8 inline-block">← Back to home</a>

        <h1 className="text-4xl font-black mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-12">Effective date: 28 March 2026 · Last updated: 28 March 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Who We Are</h2>
            <p>AKAI is an AI-powered business automation platform operated by <strong className="text-white">AI Clozr (ABN 50 179 250 215)</strong>, based in Sydney, New South Wales, Australia.</p>
            <p className="mt-2">We are bound by the <em>Privacy Act 1988</em> (Cth) and the Australian Privacy Principles (APPs) contained in that Act. This Privacy Policy explains how we collect, use, store, and disclose personal information in accordance with those obligations.</p>
            <p className="mt-2">Contact: <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. What We Collect</h2>
            <p>We collect several categories of personal information depending on how you use the Service:</p>

            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">2.1 Account Data</h3>
            <p>When you sign up, we collect your name, email address, business name, industry, website, and other details you provide during onboarding.</p>

            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">2.2 Lead & Enquiry Data</h3>
            <p>When you connect your email inbox (Gmail or Outlook), AKAI reads incoming enquiry emails to identify leads. This means we process the personal information of <strong className="text-white">your leads</strong> — people who have contacted your business. This may include their name, email address, phone number, and the content of their enquiry message. See Section 8 for important information about lead data.</p>

            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">2.3 Calendar Data</h3>
            <p>When you connect your Google or Outlook calendar, we access event times, meeting details, and availability information. This is used to identify free slots and book meetings with your leads on your behalf.</p>

            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">2.4 Call Data</h3>
            <p>When Sophie AI places voice calls on your behalf via Bland.ai, we collect call logs, call duration, and call outcomes (e.g., whether a meeting was booked). Call recordings may be processed by Bland.ai in accordance with their privacy policy.</p>

            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">2.5 Usage Data</h3>
            <p>We collect data about how you interact with AKAI — features used, AI responses, email open/reply rates, and engagement patterns. This data is used to improve platform performance and AI model quality.</p>

            <h3 className="text-base font-semibold text-white/90 mt-4 mb-2">2.6 Payment Data</h3>
            <p>Subscription payments are processed by <strong className="text-white">Stripe</strong>. We do not store your credit card details. Stripe may collect and store payment information in accordance with their own privacy policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p>We use personal information to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong className="text-white">Provide the Service</strong> — processing leads, sending follow-up emails, booking meetings, generating proposals</li>
              <li><strong className="text-white">Autonomous communications</strong> — sending AI-drafted emails to your leads via your connected email account, and placing AI voice calls via Bland.ai, with your explicit authorisation</li>
              <li><strong className="text-white">AI learning and improvement</strong> — analysing anonymised patterns from email and call interactions to improve response quality and platform performance</li>
              <li><strong className="text-white">Account management</strong> — billing, support, and service communications</li>
              <li><strong className="text-white">Legal compliance</strong> — meeting our obligations under applicable law</li>
            </ul>
            <p className="mt-3"><strong className="text-white">We do not sell your personal data to third parties. We do not use your data for advertising.</strong></p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Third-Party Processors</h2>
            <p>We share data with the following trusted third-party processors, strictly to deliver the Service. Each processor is bound by appropriate data protection agreements:</p>
            <ul className="list-disc list-inside space-y-3 mt-3">
              <li>
                <strong className="text-white">Google</strong> (Firebase/Firestore, Gmail API, Google Calendar API) — Data storage and email/calendar integrations.{' '}
                <a href="https://policies.google.com/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-white">Microsoft</strong> (Outlook/Microsoft 365) — Email and calendar integrations.{' '}
                <a href="https://privacy.microsoft.com/en-us/privacystatement" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-white">Railway</strong> — Cloud hosting for AKAI&apos;s backend API and services.{' '}
                <a href="https://railway.app/legal/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-white">Bland.ai</strong> — AI voice call infrastructure (Sophie calls).{' '}
                <a href="https://www.bland.ai/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-white">Anthropic</strong> — AI language model (Claude) for generating email content and responses.{' '}
                <a href="https://www.anthropic.com/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-white">Stripe</strong> — Payment processing.{' '}
                <a href="https://stripe.com/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
              <li>
                <strong className="text-white">Resend</strong> — Transactional email delivery (platform notifications, not lead outreach).{' '}
                <a href="https://resend.com/privacy" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
              </li>
            </ul>
            <p className="mt-3">Some of these processors are located outside Australia. By using AKAI, you consent to your personal information being transferred to and processed in countries including the United States, where these services operate. We take reasonable steps to ensure overseas recipients handle information in a manner consistent with the Australian Privacy Principles.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Australian Privacy Principles (APPs)</h2>
            <p>We are committed to complying with the Australian Privacy Principles under the <em>Privacy Act 1988</em> (Cth). In summary:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong className="text-white">APP 1 — Open and transparent management:</strong> We publish this Privacy Policy and make it freely available.</li>
              <li><strong className="text-white">APP 3 — Collection of solicited personal information:</strong> We collect only what is necessary to provide the Service.</li>
              <li><strong className="text-white">APP 5 — Notification of collection:</strong> We inform individuals (where practicable) when we collect their information.</li>
              <li><strong className="text-white">APP 6 — Use or disclosure:</strong> We use personal information only for the primary purpose it was collected or a directly related secondary purpose, unless you consent or the law requires otherwise.</li>
              <li><strong className="text-white">APP 8 — Cross-border disclosure:</strong> We take reasonable steps to ensure overseas recipients uphold the APPs.</li>
              <li><strong className="text-white">APP 11 — Security:</strong> We hold personal information securely and take reasonable steps to protect it from misuse, loss, and unauthorised access.</li>
              <li><strong className="text-white">APP 12 — Access:</strong> You may request access to your personal information at any time.</li>
              <li><strong className="text-white">APP 13 — Correction:</strong> You may request correction of inaccurate or incomplete information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. AI Calling & Automated Communications</h2>
            <p>AKAI&apos;s core value proposition involves sending emails and making calls to your leads on your behalf. This is done:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Only with your explicit authorisation as the AKAI account holder</li>
              <li>Using your connected email account as the sender (your leads see your email address, not AKAI&apos;s)</li>
              <li>In compliance with the Australian Spam Act 2003 — every automated email includes a functioning unsubscribe mechanism</li>
              <li>Via Bland.ai for voice calls, in compliance with the Do Not Call Register Act 2006</li>
            </ul>
            <p className="mt-3">AKAI uses AI (Anthropic Claude) to generate email content. AI-generated content is used to draft messages on your behalf. You are responsible for reviewing content where possible and for authorising auto-send mode.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Data Storage & Security</h2>
            <p>Your data is stored in <strong className="text-white">Google Firestore</strong>, hosted on Google Cloud infrastructure. AKAI&apos;s backend services run on <strong className="text-white">Railway</strong>. We use industry-standard encryption for data in transit (TLS) and at rest.</p>
            <p className="mt-2">We implement access controls to ensure only authorised personnel and systems can access your data. We regularly review our security practices.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Lead Data & Third-Party Personal Information</h2>
            <p>When you connect your email inbox or import contacts, AKAI processes personal information belonging to <strong className="text-white">third parties</strong> — your leads and customers. This is a critical aspect of our Service.</p>
            <p className="mt-2">As the AKAI account holder, <strong className="text-white">you are the data controller</strong> for your leads&apos; personal information. You are responsible for:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Ensuring you have a lawful basis to process your leads&apos; personal information using AKAI</li>
              <li>Ensuring that AKAI&apos;s processing of lead data on your behalf (including sending emails and making calls) complies with applicable privacy and spam laws</li>
              <li>Honouring any access, correction, or deletion requests made by your leads regarding their personal information</li>
              <li>Promptly informing us of any opt-out requests that require us to cease processing a lead&apos;s data</li>
            </ul>
            <p className="mt-3">AI Clozr acts as a <strong className="text-white">data processor</strong> for lead data — we process it on your instructions. We do not use your leads&apos; personal information for any purpose other than providing the Service to you.</p>
            <p className="mt-2">Leads who wish to have their information removed from our systems should contact the business (AKAI account holder) that collected their enquiry. Businesses may also contact us at <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a> to request deletion of specific lead records.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Unsubscribe & Opt-Out</h2>
            <p>Every automated email sent by AKAI on behalf of a client includes a functioning unsubscribe link. When a lead clicks unsubscribe:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Their opt-out preference is recorded in AKAI</li>
              <li>AKAI will not send further automated emails to that lead on behalf of the same client</li>
              <li>The client is notified of the opt-out</li>
            </ul>
            <p className="mt-3">Clients must honour all opt-out requests. Using AKAI to contact individuals who have unsubscribed is a violation of our Terms of Service and may constitute a breach of the Australian Spam Act 2003.</p>
            <p className="mt-2">If you have received an email from AKAI on behalf of one of our clients and wish to opt out, please use the unsubscribe link in that email, or contact the sending business directly. If you believe we have not honoured your opt-out request, contact us at <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active. Following account cancellation or termination:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Your data is retained for <strong className="text-white">90 days</strong> after cancellation, during which you may request an export</li>
              <li>After 90 days, your account data and associated lead data is permanently deleted</li>
              <li>We may retain certain records longer where required by law (e.g., financial records for tax purposes)</li>
            </ul>
            <p className="mt-3">Anonymised, aggregated data (with no identifying information) may be retained indefinitely for platform improvement purposes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Your Rights</h2>
            <p>Under the Australian Privacy Act 1988, you have the right to:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li><strong className="text-white">Access</strong> your personal information held by us</li>
              <li><strong className="text-white">Correct</strong> inaccurate or incomplete personal information</li>
              <li><strong className="text-white">Request deletion</strong> of your personal information (subject to legal obligations)</li>
              <li><strong className="text-white">Complain</strong> about a breach of the APPs to the Office of the Australian Information Commissioner (OAIC) at <a href="https://www.oaic.gov.au" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">oaic.gov.au</a></li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a>. We will respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Cookies</h2>
            <p>We use cookies and similar technologies to maintain your session and improve your experience on the AKAI platform. We do not use third-party advertising cookies. You can disable cookies in your browser settings, though this may affect some platform features.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or in-app notification. Continued use of the Service after changes constitutes acceptance of the updated Policy. We encourage you to review this page periodically.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">14. Contact & Complaints</h2>
            <p>For privacy enquiries, requests, or complaints, contact our Privacy Officer:</p>
            <p className="mt-2">
              <strong className="text-white">AI Clozr (ABN 50 179 250 215)</strong><br />
              Sydney, New South Wales, Australia<br />
              <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a>
            </p>
            <p className="mt-3">If you are not satisfied with our response to a privacy complaint, you may lodge a complaint with the Office of the Australian Information Commissioner (OAIC): <a href="https://www.oaic.gov.au/privacy/privacy-complaints" className="text-[#D4AF37] hover:underline" target="_blank" rel="noopener noreferrer">oaic.gov.au/privacy/privacy-complaints</a></p>
          </section>

        </div>
      </div>
    </main>
  );
}
