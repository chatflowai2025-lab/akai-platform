export default function Footer() {
  return (
    <footer className="relative py-16 px-6">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <a href="/" className="flex items-center">
              <span className="text-xl font-black tracking-tight">AK<span className="text-[#F59E0B]">AI</span></span>
            </a>
            <p className="text-white/30 text-xs">Your AI Business Partner</p>
            <a href="mailto:hello@getakai.ai" className="text-white/20 text-xs hover:text-white/50 transition-colors mt-1">
              hello@getakai.ai
            </a>
          </div>

          {/* Links */}
          <div className="flex flex-col sm:flex-row gap-8 text-sm">
            <div className="flex flex-col gap-3">
              <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Product</p>
              <a href="#how-it-works" className="text-white/40 hover:text-white transition-colors">How It Works</a>
              <a href="#modules" className="text-white/40 hover:text-white transition-colors">Skills</a>
              <a href="#pricing" className="text-white/40 hover:text-white transition-colors">Pricing</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Company</p>
              <a href="mailto:hello@getakai.ai" className="text-white/40 hover:text-white transition-colors">Contact Us</a>
              <a href="/login?tab=signup" className="text-white/40 hover:text-white transition-colors">Get Started</a>
              <a href="/login" className="text-white/40 hover:text-white transition-colors">Sign In</a>
            </div>
            <div className="flex flex-col gap-3">
              <p className="text-white/20 text-xs uppercase tracking-widest font-semibold">Legal</p>
              <a href="/privacy" className="text-white/40 hover:text-white transition-colors">Privacy Policy</a>
              <a href="/terms" className="text-white/40 hover:text-white transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-white/[0.04] flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/20">
          <p>© {new Date().getFullYear()} AKAI. All rights reserved. ABN 50 179 250 215</p>
          <p>
            Built on <span className="text-[#F59E0B]/60">AI</span>. Powered by results.
          </p>
        </div>
      </div>
    </footer>
  );
}
