export default function Footer() {
  return (
    <footer className="border-t border-[#1f1f1f] py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo + tagline */}
          <div>
            <div className="text-2xl font-black tracking-tight mb-1">
              AK<span className="text-[#F59E0B]">AI</span>
            </div>
            <p className="text-gray-500 text-sm">Your AI Business Partner</p>
          </div>

          {/* Links */}
          <div className="flex items-center gap-8 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="mailto:hello@getakai.ai" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-[#1f1f1f] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-600">
          <p>© {new Date().getFullYear()} AKAI. All rights reserved.</p>
          <p>
            Built on{' '}
            <span className="text-[#F59E0B]">AI</span>.
            Powered by results.
          </p>
        </div>
      </div>
    </footer>
  );
}
