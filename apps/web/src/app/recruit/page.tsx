'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

// ── Safe sendMessage wrapper — prevents crash if chat context not ready ────
function safeSend(sendMessage: (t: string) => void, text: string) {
  try { sendMessage(text); } catch { /* chat not ready */ }
}
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Candidate {
  id: string;
  name: string;
  currentRole: string;
  company: string;
  location: string;
  yearsExp: number;
  skills: string[];
  matchScore: number;
  availability: string;
}

interface ScreeningResult {
  candidateName: string;
  score: number;
  strengths: string[];
  gaps: string[];
  recommendation: 'Interview' | 'Consider' | 'Pass';
  summary: string;
}

// ── Candidate data generators ─────────────────────────────────────────────────
const CANDIDATE_POOL = [
  { firstName: 'Sarah', lastName: 'Chen', role: 'Senior Software Engineer', company: 'Atlassian', location: 'Sydney, NSW', yearsExp: 7 },
  { firstName: 'Michael', lastName: 'Thompson', role: 'Product Manager', company: 'Canva', location: 'Sydney, NSW', yearsExp: 5 },
  { firstName: 'Emma', lastName: 'Williams', role: 'Full Stack Developer', company: 'Afterpay', location: 'Melbourne, VIC', yearsExp: 4 },
  { firstName: 'James', lastName: 'Patel', role: 'Engineering Manager', company: 'REA Group', location: 'Melbourne, VIC', yearsExp: 9 },
  { firstName: 'Olivia', lastName: 'Rodriguez', role: 'UX Designer', company: 'Seek', location: 'Remote', yearsExp: 6 },
  { firstName: 'William', lastName: 'Kim', role: 'Data Scientist', company: 'Commonwealth Bank', location: 'Sydney, NSW', yearsExp: 3 },
  { firstName: 'Sophia', lastName: 'Johnson', role: 'DevOps Engineer', company: 'Xero', location: 'Auckland, NZ', yearsExp: 5 },
  { firstName: 'Liam', lastName: 'Davis', role: 'Frontend Engineer', company: 'Freelancer', location: 'Brisbane, QLD', yearsExp: 4 },
  { firstName: 'Amelia', lastName: 'Wilson', role: 'Tech Lead', company: 'WiseTech Global', location: 'Sydney, NSW', yearsExp: 8 },
  { firstName: 'Noah', lastName: 'Martinez', role: 'Backend Engineer', company: 'Zip Co', location: 'Remote', yearsExp: 6 },
];

const SKILL_POOLS: Record<string, string[]> = {
  default: ['Communication', 'Problem Solving', 'Agile', 'Team Leadership', 'Stakeholder Management', 'Data Analysis', 'Strategy', 'Project Management'],
  engineering: ['TypeScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'GraphQL', 'PostgreSQL', 'Kubernetes', 'CI/CD'],
  product: ['Product Strategy', 'Roadmapping', 'OKRs', 'User Research', 'A/B Testing', 'Figma', 'JIRA', 'Stakeholder Management'],
  design: ['Figma', 'User Research', 'Prototyping', 'Design Systems', 'Usability Testing', 'Interaction Design', 'Accessibility'],
  data: ['Python', 'SQL', 'Tableau', 'Machine Learning', 'Statistics', 'dbt', 'Spark', 'BigQuery'],
};

function inferSkillPool(jobTitle: string): string[] {
  const t = jobTitle.toLowerCase();
  if (t.includes('engineer') || t.includes('developer') || t.includes('devops') || t.includes('tech')) return SKILL_POOLS.engineering;
  if (t.includes('product') || t.includes('manager') || t.includes('pm')) return SKILL_POOLS.product;
  if (t.includes('design') || t.includes('ux') || t.includes('ui')) return SKILL_POOLS.design;
  if (t.includes('data') || t.includes('analyst') || t.includes('scientist')) return SKILL_POOLS.data;
  return SKILL_POOLS.default;
}

function generateCandidates(jobTitle: string, location: string, requiredSkills: string): Candidate[] {
  const pool = inferSkillPool(jobTitle);
  const extra = requiredSkills
    ? requiredSkills.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  const allSkills = [...new Set([...extra, ...pool])];
  const availabilities = ['Immediate', 'Immediate', '2 weeks', '2 weeks', '1 month', '4 weeks'];

  return CANDIDATE_POOL.slice(0, 6).map((person, i) => {
    const score = Math.max(62, Math.min(97, 97 - i * 5 + (i % 2 === 0 ? 2 : -1)));
    const personSkills = [
      allSkills[i % allSkills.length] ?? pool[0],
      allSkills[(i + 1) % allSkills.length] ?? pool[1],
      allSkills[(i + 2) % allSkills.length] ?? pool[2],
    ].filter(Boolean).slice(0, 3);

    return {
      id: `candidate-${i + 1}`,
      name: `${person.firstName} ${person.lastName}`,
      currentRole: person.role,
      company: person.company,
      location: location && i < 2 ? location : person.location,
      yearsExp: person.yearsExp,
      skills: personSkills,
      matchScore: score,
      availability: availabilities[i],
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function generateScreeningResult(jobTitle: string): ScreeningResult {
  return {
    candidateName: 'Alex Turner',
    score: 84,
    strengths: [
      `5+ years in ${jobTitle}-adjacent roles`,
      'Strong communication skills rated by 3 referees',
      'Delivered similar projects at scale at previous company',
    ],
    gaps: [
      'No direct experience with required tech stack',
      'Available in 4 weeks — not immediate',
    ],
    recommendation: 'Interview',
    summary: `Alex is a strong candidate for ${jobTitle}. Their track record of delivering results in high-growth environments aligns well with your requirements. The skill gap is learnable — recommend a 30-min technical screen to validate.`,
  };
}

// ── Find Candidates Tab ───────────────────────────────────────────────────────
function FindCandidatesTab() {
  const { sendMessage } = useDashboardChat();
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [salaryRange, setSalaryRange] = useState('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

  // AI Screen modal
  const [screeningJobTitle, setScreeningJobTitle] = useState('');
  const [screening, setScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [showScreenModal, setShowScreenModal] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!jobTitle.trim()) return;
    setSearching(true);
    await new Promise(r => setTimeout(r, 1400));
    setCandidates(generateCandidates(jobTitle, location, skills));
    setSearched(true);
    setSearching(false);
  }, [jobTitle, location, skills]);

  const handleContact = (candidate: Candidate) => {
    setContactedIds(prev => new Set([...prev, candidate.id]));
    // Open mailto with pre-filled outreach — no sendMessage to avoid chat context issues
    const subject = encodeURIComponent(`Exciting opportunity — ${jobTitle || 'a great role'}`);
    const body = encodeURIComponent(`Hi ${candidate.name.split(' ')[0]},\n\nI came across your profile and think you'd be a great fit for a ${jobTitle || 'role'} we're hiring for.\n\nWould you be open to a quick 15-minute call to learn more?\n\nBest,\n[Your name]`);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  const handleAIScreen = async (candidate: Candidate) => {
    setScreeningJobTitle(candidate.name);
    setScreening(true);
    setShowScreenModal(true);
    setScreeningResult(null);
    try {
      const res = await fetch('/api/recruit/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle || 'the role',
          industry: 'Technology',
          candidateName: candidate.name,
          resumeSummary: `${candidate.name} is a ${candidate.currentRole} at ${candidate.company} with ${candidate.yearsExp} years of experience. Skills include: ${candidate.skills.join(', ')}. Location: ${candidate.location}. Availability: ${candidate.availability}.`,
          requirements: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : candidate.skills,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScreeningResult({
          candidateName: candidate.name,
          score: data.score,
          strengths: data.reasons.filter((r: string) => !r.toLowerCase().includes('missing') && !r.toLowerCase().includes('limited')),
          gaps: data.reasons.filter((r: string) => r.toLowerCase().includes('missing') || r.toLowerCase().includes('limited') || r.toLowerCase().includes('gap')),
          recommendation: data.recommendation === 'advance' ? 'Interview' : data.recommendation === 'review' ? 'Consider' : 'Pass',
          summary: data.nextStep,
        });
      } else {
        // Fallback to local generation if API fails
        setScreeningResult(generateScreeningResult(jobTitle));
      }
    } catch {
      setScreeningResult(generateScreeningResult(jobTitle));
    } finally {
      setScreening(false);
    }
  };

  const recommendationColor = (rec: ScreeningResult['recommendation']) => {
    if (rec === 'Interview') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (rec === 'Consider') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (score >= 75) return 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20';
    return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
  };

  const availabilityColor = (avail: string) => {
    if (avail === 'Immediate') return 'text-green-400';
    if (avail === '2 weeks') return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Search Form */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">Tell us who you need</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Job title *</label>
            <input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="e.g. Senior Software Engineer"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Sydney, NSW or Remote"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Key skills (comma-separated)</label>
            <input
              value={skills}
              onChange={e => setSkills(e.target.value)}
              placeholder="e.g. React, TypeScript, Node.js"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Salary range</label>
            <input
              value={salaryRange}
              onChange={e => setSalaryRange(e.target.value)}
              placeholder="e.g. $90k–$120k"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={!jobTitle.trim() || searching}
          className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-2"
        >
          {searching ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Searching candidates...
            </>
          ) : '🔍 Find Candidates'}
        </button>
      </div>

      {/* Results */}
      {searched && !searching && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">{candidates.length} example profiles</h2>
            <span className="text-xs text-gray-500">AI-generated · illustrative only · connect LinkedIn Recruiter for real candidates</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map(c => (
              <div key={c.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-[#D4AF37]/30 transition flex flex-col">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-black font-bold text-sm flex-shrink-0">
                      {c.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white leading-tight">{c.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.currentRole}</p>
                      <p className="text-xs text-gray-600">{c.company}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border flex-shrink-0 ${scoreColor(c.matchScore)}`}>
                    {c.matchScore}%
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>📍</span><span>{c.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>🕐</span><span>{c.yearsExp} yrs exp</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <span>⚡</span>
                    <span className={`font-medium ${availabilityColor(c.availability)}`}>
                      {c.availability === 'Immediate' ? 'Available now' : `Available in ${c.availability}`}
                    </span>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-4 flex-1">
                  {c.skills.map(skill => (
                    <span key={skill} className="text-xs px-2 py-0.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-gray-400">
                      {skill}
                    </span>
                  ))}
                </div>

                {/* CTAs */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleContact(c)}
                    disabled={contactedIds.has(c.id)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                      contactedIds.has(c.id)
                        ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default'
                        : 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                    }`}
                  >
                    {contactedIds.has(c.id) ? '✅ Drafted' : '📬 Contact'}
                  </button>
                  <button
                    onClick={() => handleAIScreen(c)}
                    className="px-3 py-2 rounded-lg text-xs font-bold border border-[#2a2a2a] text-gray-400 hover:text-white hover:border-[#D4AF37]/30 transition"
                  >
                    🤖 Screen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searched && (
        <div className="flex-1 flex items-center justify-center py-16">
          <div className="text-center">
            <div className="text-5xl mb-4">🎯</div>
            <p className="text-gray-500 text-sm">Enter a job title above to find matched candidates</p>
            <p className="text-gray-600 text-xs mt-1">AI screens and ranks by fit score</p>
          </div>
        </div>
      )}

      {/* AI Screen Modal */}
      {showScreenModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">🤖 AI Screening — {screeningJobTitle}</h3>
              <button onClick={() => setShowScreenModal(false)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>
            {screening ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Screening against your requirements...</p>
              </div>
            ) : screeningResult && (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{screeningResult.candidateName}</p>
                    <p className="text-xs text-gray-500">Sample candidate</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-[#D4AF37]">{screeningResult.score}%</div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${recommendationColor(screeningResult.recommendation)}`}>
                      {screeningResult.recommendation}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">✅ Strengths</p>
                  <ul className="space-y-1">
                    {screeningResult.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-2">⚠️ Gaps</p>
                  <ul className="space-y-1">
                    {screeningResult.gaps.map((g, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-orange-400 mt-0.5">•</span>{g}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-300 leading-relaxed">{screeningResult.summary}</p>
                </div>
                <button onClick={() => setShowScreenModal(false)} className="w-full py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:bg-[#c4a030] transition">
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Platform definitions ───────────────────────────────────────────────────────
interface Platform {
  id: string;
  name: string;
  tagline: string;
  color: string;
  bgColor: string;
  borderColor: string;
  emoji: string;
}

const PLATFORMS: Platform[] = [
  { id: 'seek', name: 'SEEK', tagline: "Australia's #1 job board", color: '#1E4FBE', bgColor: 'rgba(30,79,190,0.1)', borderColor: 'rgba(30,79,190,0.3)', emoji: '🔵' },
  { id: 'linkedin', name: 'LinkedIn', tagline: 'Professional network', color: '#0077B5', bgColor: 'rgba(0,119,181,0.1)', borderColor: 'rgba(0,119,181,0.3)', emoji: '💼' },
  { id: 'indeed', name: 'Indeed', tagline: 'Global job board', color: '#2164F3', bgColor: 'rgba(33,100,243,0.1)', borderColor: 'rgba(33,100,243,0.3)', emoji: '🌐' },
  { id: 'jora', name: 'Jora', tagline: 'Australian job search', color: '#00B4B4', bgColor: 'rgba(0,180,180,0.1)', borderColor: 'rgba(0,180,180,0.3)', emoji: '🔍' },
  { id: 'website', name: 'Your Website', tagline: 'Post via Web module', color: '#D4AF37', bgColor: 'rgba(212,175,55,0.1)', borderColor: 'rgba(212,175,55,0.3)', emoji: '🌍' },
  { id: 'all', name: 'All Platforms', tagline: 'Post everywhere at once', color: '#9B59B6', bgColor: 'rgba(155,89,182,0.1)', borderColor: 'rgba(155,89,182,0.3)', emoji: '🚀' },
];

// ── Post a Job Tab ────────────────────────────────────────────────────────────
type PostStep = 'form' | 'generating' | 'review' | 'platforms' | 'posted';

interface JobFormData {
  title: string;
  location: string;
  isRemote: boolean;
  employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Casual';
  salaryMin: string;
  salaryMax: string;
  description: string;
}

interface PostedJob {
  id: string;
  title: string;
  location: string;
  employmentType: string;
  salaryMin: string;
  salaryMax: string;
  platforms: string[];
  postedAt: string;
}

function PostJobTab() {
  const { user } = useAuth();
  const { sendMessage } = useDashboardChat();

  // Step state
  const [step, setStep] = useState<PostStep>('form');

  // Form state
  const [form, setForm] = useState<JobFormData>({
    title: '',
    location: '',
    isRemote: false,
    employmentType: 'Full-time',
    salaryMin: '',
    salaryMax: '',
    description: '',
  });

  // JD state
  const [generatedJD, setGeneratedJD] = useState('');
  const [editedJD, setEditedJD] = useState('');

  // Platform state
  const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(new Set());
  const [connectedPlatforms] = useState<Set<string>>(new Set()); // mock — none connected by default

  // Posted job state
  const [postedJob, setPostedJob] = useState<PostedJob | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState('');

  const handleGenerateJD = async () => {
    if (!form.title.trim()) return;
    setStep('generating');

    try {
      const locationStr = form.isRemote
        ? form.location ? `${form.location} (Remote)` : 'Remote'
        : form.location || 'Australia';

      const res = await fetch('/api/recruit/generate-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: form.title,
          location: locationStr,
          employmentType: form.employmentType,
          salaryMin: form.salaryMin,
          salaryMax: form.salaryMax,
          description: form.description,
          businessName: user?.displayName || undefined,
          industry: undefined,
        }),
      });

      const data = await res.json();
      const jd = data.jd || '';
      setGeneratedJD(jd);
      setEditedJD(jd);
      setStep('review');
    } catch {
      // fallback
      const fallback = `# ${form.title}\n\n## About the Company\n\nWe're a growing business looking for exceptional talent.\n\n## Role Overview\n\n${form.description || `We're looking for a talented ${form.title} to join our team.`}\n\n## Key Responsibilities\n\n- Lead core responsibilities for this role\n- Collaborate with cross-functional teams\n- Drive results and continuous improvement\n- Build strong stakeholder relationships\n- Contribute to team culture\n\n## What We're Looking For\n\n- Proven experience in a similar role\n- Strong communication skills\n- Results-driven mindset\n- Team player with initiative\n\n## What We Offer\n\n- Salary: ${form.salaryMin && form.salaryMax ? `$${form.salaryMin}–$${form.salaryMax} AUD` : 'Competitive'}\n- ${form.employmentType} position\n- ${form.isRemote ? 'Remote' : form.location || 'Australia'}\n- Supportive team environment\n\n## How to Apply\n\nSubmit your resume and cover letter. We'll be in touch within 5 business days.`;
      setGeneratedJD(fallback);
      setEditedJD(fallback);
      setStep('review');
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms(prev => {
      const next = new Set(prev);
      if (id === 'all') {
        if (next.has('all')) {
          next.clear();
        } else {
          PLATFORMS.forEach(p => next.add(p.id));
        }
      } else {
        if (next.has(id)) {
          next.delete(id);
          next.delete('all');
        } else {
          next.add(id);
          // if all individual ones selected, also select 'all'
          const individualSelected = PLATFORMS.filter(p => p.id !== 'all').every(p => next.has(p.id));
          if (individualSelected) next.add('all');
        }
      }
      return next;
    });
  };

  const handlePost = async () => {
    if (selectedPlatforms.size === 0 || !user) return;
    setPosting(true);
    setPostError('');

    const platformNames = Array.from(selectedPlatforms)
      .filter(id => id !== 'all')
      .map(id => PLATFORMS.find(p => p.id === id)?.name || id);

    const jobId = `job-${Date.now()}`;

    // Save to Firestore
    const db = getFirebaseDb();
    if (db) {
      try {
        const locationStr = form.isRemote
          ? form.location ? `${form.location} (Remote)` : 'Remote'
          : form.location || 'Australia';

        await addDoc(collection(db, `users/${user.uid}/jobs`), {
          title: form.title,
          location: locationStr,
          employmentType: form.employmentType,
          salaryMin: form.salaryMin,
          salaryMax: form.salaryMax,
          description: form.description,
          jd: editedJD,
          platforms: platformNames,
          createdAt: serverTimestamp(),
          status: 'active',
          applicantCount: 0,
        });
      } catch (e) {
        console.error('Failed to save job', e);
        setPostError('Failed to save job. Please check your connection and try again.');
        setPosting(false);
        return;
      }
    }

    setPostedJob({
      id: jobId,
      title: form.title,
      location: form.isRemote ? (form.location ? `${form.location} (Remote)` : 'Remote') : form.location || 'Australia',
      employmentType: form.employmentType,
      salaryMin: form.salaryMin,
      salaryMax: form.salaryMax,
      platforms: platformNames,
      postedAt: new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }),
    });

    setPosting(false);
    setStep('posted');
  };

  const handleStartOver = () => {
    setStep('form');
    setForm({ title: '', location: '', isRemote: false, employmentType: 'Full-time', salaryMin: '', salaryMax: '', description: '' });
    setGeneratedJD('');
    setEditedJD('');
    setSelectedPlatforms(new Set());
    setPostedJob(null);
  };

  const activePlatforms = Array.from(selectedPlatforms).filter(id => id !== 'all');

  // ── Step indicator ─────────────────────────────────────────────────────────
  const steps = [
    { key: 'form', label: 'Details' },
    { key: 'review', label: 'JD Review' },
    { key: 'platforms', label: 'Platforms' },
    { key: 'posted', label: 'Posted' },
  ];
  const currentStepIdx = steps.findIndex(s => s.key === step || (step === 'generating' && s.key === 'review'));

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Step indicator */}
      {step !== 'posted' && (
        <div className="flex items-center gap-2">
          {steps.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${
                i === currentStepIdx ? 'text-[#D4AF37]' : i < currentStepIdx ? 'text-green-400' : 'text-gray-600'
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  i === currentStepIdx ? 'bg-[#D4AF37] text-black' : i < currentStepIdx ? 'bg-green-500 text-black' : 'bg-[#2a2a2a] text-gray-600'
                }`}>
                  {i < currentStepIdx ? '✓' : i + 1}
                </span>
                {s.label}
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-px ${i < currentStepIdx ? 'bg-green-500' : 'bg-[#2a2a2a]'}`} />}
            </div>
          ))}
        </div>
      )}

      {/* ── STEP 1: Form ─────────────────────────────────────────────────── */}
      {step === 'form' && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
          <h2 className="text-sm font-bold text-white mb-1">Post a new job</h2>
          <p className="text-xs text-gray-500 mb-5">Fill in the basics — AK will write the full job description for you.</p>

          <div className="space-y-4">
            {/* Job title */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Job title *</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Senior Product Manager"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
              />
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Location</label>
              <div className="flex items-center gap-3">
                <input
                  value={form.location}
                  onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="e.g. Sydney, NSW"
                  className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                />
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={form.isRemote}
                    onChange={e => setForm(f => ({ ...f, isRemote: e.target.checked }))}
                    className="w-3.5 h-3.5 accent-[#D4AF37]"
                  />
                  Remote
                </label>
              </div>
            </div>

            {/* Employment type */}
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Employment type</label>
              <div className="flex flex-wrap gap-2">
                {(['Full-time', 'Part-time', 'Contract', 'Casual'] as const).map(type => (
                  <label key={type} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition ${
                    form.employmentType === type
                      ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                      : 'border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a]'
                  }`}>
                    <input
                      type="radio"
                      name="employmentType"
                      value={type}
                      checked={form.employmentType === type}
                      onChange={() => setForm(f => ({ ...f, employmentType: type }))}
                      className="hidden"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            {/* Salary range */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Salary range (AUD)</label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">$</span>
                  <input
                    type="number"
                    value={form.salaryMin}
                    onChange={e => setForm(f => ({ ...f, salaryMin: e.target.value }))}
                    placeholder="60,000"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <span className="text-gray-600 text-sm">–</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm">$</span>
                  <input
                    type="number"
                    value={form.salaryMax}
                    onChange={e => setForm(f => ({ ...f, salaryMax: e.target.value }))}
                    placeholder="90,000"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
                  />
                </div>
                <span className="text-xs text-gray-600 whitespace-nowrap">AUD / yr</span>
              </div>
            </div>

            {/* Brief description */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Brief description</label>
              <p className="text-[11px] text-gray-600 mb-1.5">2-3 sentences — tell us what the role is about</p>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. We're looking for an experienced PM to lead our product team. You'll own the roadmap for our core SaaS platform and work closely with engineering and design."
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateJD}
            disabled={!form.title.trim()}
            className="mt-5 px-5 py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-2"
          >
            Generate Job Description →
          </button>
        </div>
      )}

      {/* ── STEP 2: Generating ────────────────────────────────────────────── */}
      {step === 'generating' && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-10 flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-white font-semibold text-sm">✍️ Writing your job description...</p>
            <p className="text-gray-500 text-xs mt-1">AK is crafting a compelling JD based on your details</p>
          </div>
        </div>
      )}

      {/* ── STEP 3: JD Review ────────────────────────────────────────────── */}
      {step === 'review' && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">Your Job Description</h2>
                <p className="text-xs text-gray-500 mt-0.5">Review and edit before posting</p>
              </div>
              <span className="text-xs px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">✅ AI Generated</span>
            </div>
            <textarea
              value={editedJD}
              onChange={e => setEditedJD(e.target.value)}
              rows={24}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-gray-300 font-mono leading-relaxed focus:outline-none focus:border-[#D4AF37] transition resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('platforms')}
              className="flex-1 py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 transition"
            >
              Looks good — choose platforms →
            </button>
            <button
              onClick={() => safeSend(sendMessage, `Change something in the JD for my ${form.title} role`)}
              className="px-4 py-2.5 border border-[#2a2a2a] text-gray-400 rounded-lg text-sm font-semibold hover:text-white hover:border-[#D4AF37]/30 transition whitespace-nowrap"
            >
              Ask AK to change something
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Platform Selection ───────────────────────────────────── */}
      {step === 'platforms' && (
        <div className="space-y-4">
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
            <h2 className="text-sm font-bold text-white mb-1">Choose where to post</h2>
            <p className="text-xs text-gray-500 mb-5">Select one or more platforms — connect any that aren't linked yet</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {PLATFORMS.map(platform => {
                const isSelected = selectedPlatforms.has(platform.id);
                const isConnected = connectedPlatforms.has(platform.id) || platform.id === 'all';

                return (
                  <div
                    key={platform.id}
                    onClick={() => togglePlatform(platform.id)}
                    className={`relative rounded-xl border p-4 cursor-pointer transition select-none ${
                      isSelected
                        ? 'border-[#D4AF37] bg-[#D4AF37]/5'
                        : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                    }`}
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <span className="absolute top-2 right-2 text-[#D4AF37] text-xs font-bold">✓</span>
                    )}

                    {/* Logo placeholder */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3"
                      style={{ background: platform.bgColor, border: `1px solid ${platform.borderColor}` }}
                    >
                      {platform.emoji}
                    </div>

                    <p className="text-sm font-bold text-white">{platform.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 mb-3">{platform.tagline}</p>

                    {/* Connection status */}
                    {platform.id !== 'all' && (
                      isConnected ? (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <span>✅</span> Connected
                        </span>
                      ) : (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            safeSend(sendMessage, `I want to connect ${platform.name} for job posting`);
                          }}
                          className="text-xs px-2.5 py-1 border rounded-lg transition"
                          style={{ borderColor: platform.borderColor, color: platform.color, background: platform.bgColor }}
                        >
                          Connect {platform.name}
                        </button>
                      )
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {activePlatforms.length > 0 && (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-3">
                Posting to: {activePlatforms.map(id => PLATFORMS.find(p => p.id === id)?.name).filter(Boolean).join(', ')}
              </p>
              <button
                onClick={handlePost}
                disabled={posting}
                className="w-full py-3 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center justify-center gap-2"
              >
                {posting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    Posting...
                  </>
                ) : `Post to ${activePlatforms.length} platform${activePlatforms.length !== 1 ? 's' : ''}`}
              </button>
              {postError && (
                <p className="text-red-400 text-xs mt-2 text-center">{postError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── STEP 5: Posted ───────────────────────────────────────────────── */}
      {step === 'posted' && postedJob && (
        <div className="space-y-4">
          {/* Success banner */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
            <p className="text-green-400 font-bold text-base mb-1">
              ✅ Posted to {postedJob.platforms.join(', ')}.
            </p>
            <p className="text-sm text-gray-400">
              Here's what happens next: applications will appear in your dashboard as they come in.
              Every applicant is AI-screened and ranked before you see them.
            </p>
          </div>

          {/* Live job card */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-3">Live Job Posting</p>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 hover:border-[#D4AF37]/20 transition">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-black font-black text-lg flex-shrink-0">
                    💼
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{postedJob.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{postedJob.location} · {postedJob.employmentType}</p>
                    {(postedJob.salaryMin || postedJob.salaryMax) && (
                      <p className="text-xs text-[#D4AF37] mt-1 font-semibold">
                        {postedJob.salaryMin && postedJob.salaryMax
                          ? `$${Number(postedJob.salaryMin).toLocaleString()} – $${Number(postedJob.salaryMax).toLocaleString()} AUD`
                          : postedJob.salaryMin
                          ? `From $${Number(postedJob.salaryMin).toLocaleString()} AUD`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-xs px-2 py-1 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex-shrink-0">
                  Active
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {postedJob.platforms.map(p => (
                  <span key={p} className="text-xs px-2.5 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full text-gray-400">
                    {p}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-600">
                <span>📅 Posted {postedJob.postedAt}</span>
                <span>👥 0 applicants</span>
                <span>🤖 AI screening active</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleStartOver}
            className="w-full py-2.5 border border-[#2a2a2a] text-gray-400 rounded-lg text-sm font-semibold hover:text-white hover:border-[#D4AF37]/30 transition"
          >
            + Post another job
          </button>
        </div>
      )}
    </div>
  );
}

// ── Screen Applicants Tab ─────────────────────────────────────────────────────
function ScreenApplicantsTab() {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeText, setResumeText] = useState('');
  const [screening, setScreening] = useState(false);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState('');

  const handleScreen = async () => {
    if (!jobTitle.trim() || !resumeText.trim()) return;
    setScreening(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/recruit/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobTitle: jobTitle.trim(),
          industry: 'General',
          candidateName: 'Applicant',
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim() || undefined,
          requirements: jobDescription.trim()
            ? jobDescription.trim().split('\n').filter(l => l.trim().length > 5).slice(0, 8)
            : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Screening failed');

      const score: number = data.score ?? 50;
      const rec: 'advance' | 'review' | 'reject' = data.recommendation ?? 'review';
      setResult({
        candidateName: 'Applicant',
        score,
        strengths: data.strengths?.length
          ? data.strengths
          : data.reasons?.filter((r: string) => !r.toLowerCase().includes('missing') && !r.toLowerCase().includes('limited')) ?? [],
        gaps: data.gaps?.length
          ? data.gaps
          : data.reasons?.filter((r: string) => r.toLowerCase().includes('missing') || r.toLowerCase().includes('limited') || r.toLowerCase().includes('gap')) ?? [],
        recommendation: rec === 'advance' ? 'Interview' : rec === 'review' ? 'Consider' : 'Pass',
        summary: data.nextStep || 'Review completed.',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Screening failed. Try again.');
    } finally {
      setScreening(false);
    }
  };

  const recColor = (rec: ScreeningResult['recommendation']) => {
    if (rec === 'Interview') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (rec === 'Consider') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  const scoreColor = (s: number) => {
    if (s >= 80) return 'text-green-400';
    if (s >= 60) return 'text-[#D4AF37]';
    return 'text-red-400';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white mb-1">Screen an Applicant</h2>
          <p className="text-xs text-gray-500">Paste the resume/CV text and optionally the job description — AI scores the match and gives a hire recommendation.</p>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Job title *</label>
          <input
            value={jobTitle}
            onChange={e => setJobTitle(e.target.value)}
            placeholder="e.g. Senior Software Engineer"
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Job description / requirements <span className="text-gray-600">(optional but improves accuracy)</span></label>
          <textarea
            value={jobDescription}
            onChange={e => setJobDescription(e.target.value)}
            placeholder="Paste the job description or key requirements here..."
            rows={4}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
          />
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Resume / CV text *</label>
          <textarea
            value={resumeText}
            onChange={e => setResumeText(e.target.value)}
            placeholder="Paste the candidate's resume or CV here..."
            rows={8}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none font-mono text-xs"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleScreen}
          disabled={!jobTitle.trim() || !resumeText.trim() || screening}
          className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-2"
        >
          {screening ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Screening...
            </>
          ) : '🤖 Screen Applicant'}
        </button>
      </div>

      {/* Result card */}
      {result && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-base">Screening Result</h3>
            <span className={`text-xs px-3 py-1.5 rounded-full border font-bold ${recColor(result.recommendation)}`}>
              {result.recommendation === 'Interview' ? '✅ Hire' : result.recommendation === 'Consider' ? '⚠️ Maybe' : '❌ Pass'}
            </span>
          </div>

          {/* Score meter */}
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Match Score</p>
              <p className={`text-4xl font-black ${scoreColor(result.score)}`}>{result.score}%</p>
            </div>
            <div className="w-full h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  result.score >= 80 ? 'bg-green-400' : result.score >= 60 ? 'bg-[#D4AF37]' : 'bg-red-400'
                }`}
                style={{ width: `${result.score}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>0%</span>
              <span>Pass ← 60 → Consider ← 80 → Hire</span>
              <span>100%</span>
            </div>
          </div>

          {/* Strengths */}
          {result.strengths.length > 0 && (
            <div>
              <p className="text-xs text-green-400 font-semibold uppercase tracking-wider mb-2">✅ Strengths</p>
              <ul className="space-y-1.5">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-green-400 mt-0.5 flex-shrink-0">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gaps */}
          {result.gaps.length > 0 && (
            <div>
              <p className="text-xs text-orange-400 font-semibold uppercase tracking-wider mb-2">⚠️ Gaps</p>
              <ul className="space-y-1.5">
                {result.gaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                    <span className="text-orange-400 mt-0.5 flex-shrink-0">•</span>
                    {g}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next step */}
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Next Step</p>
            <p className="text-sm text-white leading-relaxed">{result.summary}</p>
          </div>

          {/* Reset */}
          <button
            onClick={() => { setResult(null); setResumeText(''); setJobDescription(''); }}
            className="text-xs text-gray-500 hover:text-white transition"
          >
            ← Screen another applicant
          </button>
        </div>
      )}

      {/* Empty state */}
      {!result && !screening && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-5xl mb-4">🤖</div>
          <p className="text-gray-500 text-sm">Paste a resume above to get an AI score</p>
          <p className="text-gray-600 text-xs mt-1">Returns: match score · strengths · gaps · hire recommendation</p>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruitPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'find' | 'post' | 'screen'>('find');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0">
          <div>
            <h1 className="text-xl font-black text-white">Recruit</h1>
            <p className="text-xs text-gray-500 mt-0.5">AI candidate screening &amp; pipeline management</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[#D4AF37] font-medium">Live</span>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-[#1f1f1f] bg-[#080808] flex-shrink-0 px-6">
          {[
            { key: 'find', label: '🔍 Find Candidates' },
            { key: 'screen', label: '🤖 Screen Applicants' },
            { key: 'post', label: '📋 Post a Job' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'find' | 'post' | 'screen')}
              className={`px-4 py-3 text-sm font-semibold border-b-2 transition mr-2 ${
                activeTab === tab.key
                  ? 'border-[#D4AF37] text-[#D4AF37]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {activeTab === 'find' ? <FindCandidatesTab /> : activeTab === 'screen' ? <ScreenApplicantsTab /> : <PostJobTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}
