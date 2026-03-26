export default function Footer() {
  return (
    <footer className="relative py-16 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-10">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#D4AF37] flex items-center justify-center">
              <span className="text-black font-black text-[9px] tracking-tight">AK</span>
            </div>
            <div>
              <div className="text-lg font-black tracking-tight">
                AK<span className="text-[#F59E0B]">AI</span>
              </div>
              <p className="text-white/30 text-xs">Your AI Business Partner</p>
            </div>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-8 text-sm text-white/30">
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#modules" className="hover:text-white transition-colors">Modules</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="mailto:hello@getakai.ai" className="hover:text-white transition-colors">Contact</a>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <p>© {new Date().getFullYear()} AKAI. All rights reserved.</p>
          <p>
            Built on <span className="text-[#F59E0B]/60">AI</span>. Powered by results.
          </p>
        </div>
      </div>
    </footer>
  );
}
