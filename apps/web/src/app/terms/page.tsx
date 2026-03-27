export const metadata = {
  title: 'Terms of Service — AKAI',
  description: 'Terms and conditions for using the AKAI platform.',
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <a href="/" className="text-sm text-white/40 hover:text-white transition-colors mb-8 inline-block">← Back to home</a>

        <h1 className="text-4xl font-black mb-2">Terms of Service</h1>
        <p className="text-white/40 text-sm mb-12">Last updated: March 2026 · Governing law: New South Wales, Australia</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-10 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Agreement</h2>
            <p>By accessing or using the AKAI platform (&quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). AKAI is operated by Aaron Kersten (ABN 50 179 250 215) trading as AKAI (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). If you are using AKAI on behalf of a business, you represent that you have authority to bind that business to these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. The Service</h2>
            <p>AKAI provides AI-powered business automation tools including but not limited to: outbound AI calling, lead management, email automation, content generation, website auditing, proposal generation, recruitment screening, advertising management, and social media automation.</p>
            <p className="mt-2">The Service is provided on a subscription basis. Features, pricing, and availability may change. We will provide reasonable notice of material changes.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Subscriptions & Billing</h2>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Subscriptions are billed monthly in advance. Annual billing is available at a discount.</li>
              <li>A 7-day free trial is available on first sign-up. No credit card is required during the trial.</li>
              <li>After the trial period, your chosen plan will be billed automatically.</li>
              <li>You may cancel at any time. Cancellation takes effect at the end of the current billing period. No partial refunds are issued.</li>
              <li>We reserve the right to modify pricing with 30 days&apos; written notice.</li>
              <li>All prices are in AUD unless stated otherwise. GST may apply.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Acceptable Use</h2>
            <p>You agree to use AKAI lawfully and ethically. You must not:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Use the AI calling or outreach features to contact individuals who have not consented to be contacted or who are on Do Not Call registers</li>
              <li>Generate or distribute spam, misleading content, or content that violates any law</li>
              <li>Attempt to reverse-engineer, scrape, or circumvent any part of the platform</li>
              <li>Use AKAI to harass, threaten, or harm any individual or organisation</li>
              <li>Violate any applicable privacy law including the Australian Privacy Act 1988</li>
              <li>Misrepresent your identity or the nature of your communications to contacts</li>
              <li>Share account credentials with unauthorised parties</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or terminate accounts that violate these terms without refund.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. AI Calling & Outreach</h2>
            <p>AKAI&apos;s AI voice and outreach features operate on your behalf using contact data you provide. You are solely responsible for:</p>
            <ul className="list-disc list-inside space-y-2 mt-2">
              <li>Ensuring you have legal authority to contact the individuals in your lead lists</li>
              <li>Compliance with the Do Not Call Register Act 2006 (Australia) and equivalent laws in your jurisdiction</li>
              <li>Compliance with the Spam Act 2003 (Australia) for email outreach</li>
              <li>Ensuring all contacts have appropriate consent where required by law</li>
              <li>The content of scripts, messages, and communications sent via AKAI</li>
            </ul>
            <p className="mt-3">AKAI is a tool. We are not responsible for how you use it or the outcomes of your campaigns.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Data & Privacy</h2>
            <p>Your use of AKAI is also governed by our <a href="/privacy" className="text-[#D4AF37] hover:underline">Privacy Policy</a>. By using the Service, you consent to the collection and use of your data as described therein.</p>
            <p className="mt-2">You retain ownership of your data. We will not sell your data to third parties. We use your data only to provide and improve the Service.</p>
            <p className="mt-2">On account termination, your data will be retained for 30 days and then deleted, unless required by law to retain it longer.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Intellectual Property</h2>
            <p>AKAI and all associated technology, software, and content is owned by us or our licensors. You are granted a limited, non-exclusive, non-transferable licence to use the Service for your internal business purposes.</p>
            <p className="mt-2">Content you create using AKAI (emails, proposals, scripts, social posts) remains yours. You grant us a licence to use anonymised, aggregated data to improve our AI models.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, AKAI and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, revenue, data, or business opportunities, arising from your use of the Service.</p>
            <p className="mt-2">Our total liability to you for any claim arising from these Terms shall not exceed the total fees you paid us in the 3 months preceding the claim.</p>
            <p className="mt-2">Nothing in these Terms excludes liability for fraud, death or personal injury caused by negligence, or any liability that cannot be excluded by law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Warranties</h2>
            <p>The Service is provided &quot;as is&quot; without warranty of any kind. We do not warrant that the Service will be error-free, uninterrupted, or achieve specific business results. AI-generated content may be inaccurate — always review before sending.</p>
            <p className="mt-2">Nothing in these Terms affects your rights under the Australian Consumer Law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">10. Indemnification</h2>
            <p>You agree to indemnify and hold harmless AKAI and its operators from any claims, damages, losses, or costs (including legal fees) arising from: your use of the Service, your violation of these Terms, your violation of any third party&apos;s rights, or your breach of any applicable law.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">11. Termination</h2>
            <p>Either party may terminate the agreement at any time. We may suspend or terminate your account immediately if you breach these Terms. You may cancel via your account settings or by emailing hello@getakai.ai.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">12. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you via email or in-app notification of material changes. Continued use of the Service after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">13. Governing Law</h2>
            <p>These Terms are governed by the laws of New South Wales, Australia. Any disputes shall be subject to the exclusive jurisdiction of the courts of New South Wales.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">14. Contact</h2>
            <p>Questions about these Terms? Contact us at <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a> or write to Aaron Kersten, AKAI, Sydney NSW Australia.</p>
          </section>

        </div>
      </div>
    </main>
  );
}
