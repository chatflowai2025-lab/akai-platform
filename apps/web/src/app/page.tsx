import Hero from '@/components/landing/Hero';
import HowItWorks from '@/components/landing/HowItWorks';
import Modules from '@/components/landing/Modules';
import Pricing from '@/components/landing/Pricing';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <Hero />
      <HowItWorks />
      <Modules />
      <Pricing />
    </main>
  );
}
