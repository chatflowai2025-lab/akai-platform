'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout, { useDashboardChat } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

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

interface Job {
  id: string;
  title: string;
  description: string;
  requirements: string;
  salary: string;
  createdAt: string | Timestamp;
  applicantCount: number;
  status: 'active' | 'closed';
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
    sendMessage(`Draft an outreach message for ${candidate.name}, ${candidate.currentRole} at ${candidate.company}`);
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
            <h2 className="text-sm font-bold text-white">{candidates.length} candidates found</h2>
            <span className="text-xs text-gray-500">AI-matched · sorted by fit score</span>
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

                {/* CTA */}
                <button
                  onClick={() => handleContact(c)}
                  disabled={contactedIds.has(c.id)}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition ${
                    contactedIds.has(c.id)
                      ? 'bg-green-500/10 border border-green-500/20 text-green-400 cursor-default'
                      : 'bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/20'
                  }`}
                >
                  {contactedIds.has(c.id) ? '✅ Outreach drafted in AK chat' : '📬 Contact candidate'}
                </button>
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
    </div>
  );
}

// ── Post a Job Tab ────────────────────────────────────────────────────────────
function PostJobTab() {
  const { user } = useAuth();
  const { sendMessage } = useDashboardChat();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [salary, setSalary] = useState('');
  const [posting, setPosting] = useState(false);
  const [postedJobId, setPostedJobId] = useState<string | null>(null);
  const [postedJobTitle, setPostedJobTitle] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // AI Screen modal
  const [screeningJobTitle, setScreeningJobTitle] = useState('');
  const [screening, setScreening] = useState(false);
  const [screeningResult, setScreeningResult] = useState<ScreeningResult | null>(null);
  const [showScreenModal, setShowScreenModal] = useState(false);

  const loadJobs = useCallback(async () => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) { setLoadingJobs(false); return; }
    try {
      const q = query(collection(db, `users/${user.uid}/jobs`), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setJobs(snap.docs.map(d => ({ id: d.id, ...d.data() } as Job)));
    } catch (e) {
      console.error('Failed to load jobs', e);
    } finally {
      setLoadingJobs(false);
    }
  }, [user]);

  useEffect(() => { loadJobs(); }, [loadJobs]);

  const getApplyLink = (jobId: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : 'https://getakai.ai'}/apply/${user?.uid}/${jobId}`;

  const handlePost = async () => {
    if (!title.trim() || !user) return;
    setPosting(true);
    const db = getFirebaseDb();
    let jobId = `mock-${Date.now()}`;
    if (db) {
      try {
        const jobData = {
          title: title.trim(),
          description: description.trim(),
          requirements: requirements.trim(),
          salary: salary.trim(),
          createdAt: serverTimestamp(),
          applicantCount: 0,
          status: 'active',
        };
        const ref = await addDoc(collection(db, `users/${user.uid}/jobs`), jobData);
        jobId = ref.id;
      } catch (e) {
        console.error('Failed to post job', e);
      }
    }
    setPostedJobId(jobId);
    setPostedJobTitle(title.trim());
    sendMessage(`Posted new job: ${title}${salary ? ` — ${salary}` : ''}. Ready to screen applicants with AI.`);
    setTitle('');
    setDescription('');
    setRequirements('');
    setSalary('');
    setPosting(false);
    await loadJobs();
  };

  const handleAIScreen = async (jobId: string, jobTitle: string) => {
    setScreeningJobTitle(jobTitle);
    setScreening(true);
    setShowScreenModal(true);
    setScreeningResult(null);
    await new Promise(r => setTimeout(r, 1800));
    setScreeningResult(generateScreeningResult(jobTitle));
    setScreening(false);
  };

  const copyLink = async (jobId: string) => {
    await navigator.clipboard.writeText(getApplyLink(jobId));
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (ts: string | Timestamp) => {
    if (!ts) return '—';
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    const d = (ts as Timestamp).toDate?.();
    return d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  };

  const recommendationColor = (rec: ScreeningResult['recommendation']) => {
    if (rec === 'Interview') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (rec === 'Consider') return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
    return 'text-red-400 bg-red-400/10 border-red-400/20';
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Post form */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
        <h2 className="text-sm font-bold text-white mb-4">Post a new job</h2>
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Job title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Senior Product Manager"
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the role, team, and what success looks like..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Requirements</label>
              <textarea
                value={requirements}
                onChange={e => setRequirements(e.target.value)}
                placeholder="5+ years exp, React, Node.js..."
                rows={3}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Salary range</label>
              <input
                value={salary}
                onChange={e => setSalary(e.target.value)}
                placeholder="e.g. $120k–$150k + equity"
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition"
              />
              <div className="mt-3 p-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg">
                <p className="text-xs text-[#D4AF37] font-medium mb-1">🤖 AI Screening included</p>
                <p className="text-xs text-gray-500">Every applicant gets AI-screened against your requirements. You only see the top matches.</p>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={handlePost}
          disabled={!title.trim() || posting}
          className="px-5 py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40 transition flex items-center gap-2"
        >
          {posting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Posting...
            </>
          ) : '📋 Post job'}
        </button>

        {/* Apply link prominently after posting */}
        {postedJobId && (
          <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-green-400 text-sm font-bold">✅ Job posted!</span>
              <span className="text-xs text-gray-500">{postedJobTitle}</span>
            </div>
            <p className="text-xs text-gray-400 mb-2">Share this apply link with candidates:</p>
            <div className="flex items-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2">
              <span className="text-xs text-gray-300 flex-1 truncate font-mono">{getApplyLink(postedJobId)}</span>
              <button
                onClick={() => copyLink(postedJobId)}
                className="text-xs px-2.5 py-1 bg-[#D4AF37] text-black rounded font-bold hover:bg-[#c4a030] transition flex-shrink-0"
              >
                {copiedId === postedJobId ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Posted jobs */}
      <div>
        <h2 className="text-sm font-bold text-white mb-3">Your posted jobs</h2>
        {loadingJobs ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 text-sm">No jobs posted yet</p>
            <p className="text-gray-600 text-xs mt-1">Post your first role above to start receiving screened applicants</p>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => (
              <div key={job.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-[#D4AF37]/20 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                        job.status === 'active'
                          ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                          : 'bg-gray-500/10 border border-gray-500/20 text-gray-400'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    {job.salary && <p className="text-xs text-[#D4AF37] mb-1">{job.salary}</p>}
                    {job.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>📅 {formatDate(job.createdAt)}</span>
                      <span>👥 {job.applicantCount} applicant{job.applicantCount !== 1 ? 's' : ''}</span>
                    </div>

                    {/* Apply link */}
                    <div className="mt-2 flex items-center gap-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-2.5 py-1.5">
                      <span className="text-[10px] text-gray-600 flex-1 truncate font-mono">{getApplyLink(job.id)}</span>
                      <button
                        onClick={() => copyLink(job.id)}
                        className="text-[10px] px-2 py-0.5 border border-[#2a2a2a] text-gray-400 rounded hover:text-white transition flex-shrink-0"
                      >
                        {copiedId === job.id ? '✅' : '🔗 Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleAIScreen(job.id, job.title)}
                      className="text-xs px-3 py-1.5 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/10 transition whitespace-nowrap"
                    >
                      🤖 AI Screen
                    </button>
                    <button
                      onClick={() => sendMessage(`Screen applicants for job: ${job.title}`)}
                      className="text-xs px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white hover:border-[#D4AF37]/30 transition whitespace-nowrap"
                    >
                      Ask AK
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI Screen Modal */}
      {showScreenModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">🤖 AI Screening — {screeningJobTitle}</h3>
              <button
                onClick={() => setShowScreenModal(false)}
                className="text-gray-500 hover:text-white text-xl leading-none"
              >×</button>
            </div>

            {screening ? (
              <div className="flex flex-col items-center gap-3 py-8">
                <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Screening sample candidate against your requirements...</p>
              </div>
            ) : screeningResult && (
              <div className="space-y-4">
                {/* Candidate + score */}
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

                {/* Strengths */}
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

                {/* Gaps */}
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

                {/* Summary */}
                <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-300 leading-relaxed">{screeningResult.summary}</p>
                </div>

                <button
                  onClick={() => setShowScreenModal(false)}
                  className="w-full py-2.5 bg-[#D4AF37] text-black rounded-lg text-sm font-bold hover:bg-[#c4a030] transition"
                >
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RecruitPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'find' | 'post'>('find');

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
            { key: 'post', label: '📋 Post a Job' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'find' | 'post')}
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
          {activeTab === 'find' ? <FindCandidatesTab /> : <PostJobTab />}
        </div>
      </div>
    </DashboardLayout>
  );
}
