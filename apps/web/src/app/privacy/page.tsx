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
        <p className="text-white/40 text-sm mb-12">Last updated: March 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-8 text-white/70 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Who we are</h2>
            <p>AKAI is an AI-powered business automation platform operated by AI Clozr (ABN 50 179 250 215), based in Sydney, Australia. We can be reached at <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. What we collect</h2>
            <p>We collect information you provide directly, including:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Account details (name, email, business name)</li>
              <li>Business information (website, industry, goals)</li>
              <li>Contact details for lead follow-up (with your consent)</li>
              <li>Usage data and analytics to improve the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. How we use your information</h2>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Operate and improve AKAI services</li>
              <li>Send your AI-generated reports and recommendations</li>
              <li>Contact you about your account and our services</li>
              <li>Comply with legal obligations</li>
            </ul>
            <p className="mt-3">We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. AI calling and communications</h2>
            <p>When you use our Sales skill, Sophie AI may call leads on your behalf. All calls are conducted in compliance with Australian Spam Act 2003 and Privacy Act 1988 requirements. Do Not Call Register compliance is built into the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Data storage</h2>
            <p>Your data is stored securely on servers in Australia and the United States. We use industry-standard encryption for data in transit and at rest.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Your rights</h2>
            <p>Under the Australian Privacy Act 1988, you have the right to access, correct, and request deletion of your personal information. Contact us at <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a> to exercise these rights.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies</h2>
            <p>We use cookies and similar technologies to improve your experience. You can disable cookies in your browser settings, though this may affect some platform features.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Contact</h2>
            <p>Questions about this policy? Email <a href="mailto:hello@getakai.ai" className="text-[#D4AF37] hover:underline">hello@getakai.ai</a>.</p>
          </section>

        </div>
      </div>
    </main>
  );
}
