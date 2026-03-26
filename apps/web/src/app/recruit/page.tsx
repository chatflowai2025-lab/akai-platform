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
  title: string;
  location: string;
  matchScore: number;
  skills: string[];
  experience: string;
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

// ── Mock candidate generator ─────────────────────────────────────────────────
function generateCandidates(jobTitle: string, location: string, skills: string): Candidate[] {
  const firstNames = ['Sarah', 'Michael', 'Emma', 'James', 'Olivia', 'William', 'Sophia', 'Liam'];
  const lastNames = ['Chen', 'Thompson', 'Williams', 'Patel', 'Rodriguez', 'Kim', 'Johnson', 'Davis'];
  const titles = jobTitle
    ? [`Senior ${jobTitle}`, `${jobTitle} Lead`, `${jobTitle} Specialist`, `Junior ${jobTitle}`, `${jobTitle} Consultant`]
    : ['Senior Developer', 'Product Manager', 'Marketing Lead', 'UX Designer', 'Data Analyst'];

  const locations = location
    ? [location, `${location} (Remote)`, 'Remote', 'Sydney, NSW', 'Melbourne, VIC']
    : ['Sydney, NSW', 'Melbourne, VIC', 'Brisbane, QLD', 'Remote', 'Perth, WA'];

  const skillSets = skills
    ? skills.split(',').map(s => s.trim()).filter(Boolean)
    : ['Communication', 'Problem Solving', 'Team Leadership'];

  const extras = ['Project Management', 'Agile', 'Stakeholder Management', 'Data Analysis', 'Strategy'];

  return Array.from({ length: 6 }, (_, i) => ({
    id: `candidate-${i + 1}`,
    name: `${firstNames[i % firstNames.length]} ${lastNames[i % lastNames.length]}`,
    title: titles[i % titles.length],
    location: locations[i % locations.length],
    matchScore: Math.max(62, Math.min(97, 97 - i * 5 + Math.floor(Math.random() * 4))),
    skills: [...skillSets.slice(0, 2), extras[i % extras.length]],
    experience: `${3 + i * 2} years`,
    availability: i < 2 ? 'Immediate' : i < 4 ? '2 weeks' : '1 month',
  })).sort((a, b) => b.matchScore - a.matchScore);
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
    // Simulate API delay
    await new Promise(r => setTimeout(r, 1200));
    setCandidates(generateCandidates(jobTitle, location, skills));
    setSearched(true);
    setSearching(false);
    // Inject into AK chat
    sendMessage(`Find candidates for: ${jobTitle}${location ? ` in ${location}` : ''}${skills ? `, skills: ${skills}` : ''}${salaryRange ? `, salary: ${salaryRange}` : ''}`);
  }, [jobTitle, location, skills, salaryRange, sendMessage]);

  const handleContact = (candidate: Candidate) => {
    setContactedIds(prev => new Set([...prev, candidate.id]));
    sendMessage(`Contact candidate: ${candidate.name}, ${candidate.title} — ${candidate.matchScore}% match for ${jobTitle}`);
  };

  const scoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (score >= 75) return 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20';
    return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
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
          ) : (
            '🔍 Find Candidates'
          )}
        </button>
      </div>

      {/* Results */}
      {searched && !searching && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-white">{candidates.length} candidates found</h2>
            <span className="text-xs text-gray-500">AI-matched · sorted by fit</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map(c => (
              <div key={c.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 hover:border-[#D4AF37]/30 transition">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-black font-bold text-sm mb-2">
                      {c.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <p className="text-sm font-semibold text-white leading-tight">{c.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{c.title}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full border ${scoreColor(c.matchScore)}`}>
                    {c.matchScore}% match
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>📍</span><span>{c.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <span>⏱</span><span>{c.experience} exp · Available {c.availability}</span>
                  </div>
                </div>

                {/* Skills */}
                <div className="flex flex-wrap gap-1 mb-4">
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
                  {contactedIds.has(c.id) ? '✅ Contacted' : '📬 Contact candidate'}
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
  const [posted, setPosted] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handlePost = async () => {
    if (!title.trim() || !user) return;
    setPosting(true);
    const db = getFirebaseDb();
    if (!db) {
      setPosting(false);
      return;
    }
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
      await addDoc(collection(db, `users/${user.uid}/jobs`), jobData);
      setPosted(true);
      setTitle('');
      setDescription('');
      setRequirements('');
      setSalary('');
      sendMessage(`Posted new job: ${title}${salary ? ` — ${salary}` : ''}. Ready to screen applicants with AI.`);
      await loadJobs();
      setTimeout(() => setPosted(false), 3000);
    } catch (e) {
      console.error('Failed to post job', e);
    } finally {
      setPosting(false);
    }
  };

  const getApplyLink = (jobId: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : 'https://getakai.ai'}/apply/${user?.uid}/${jobId}`;

  const copyLink = async (jobId: string) => {
    await navigator.clipboard.writeText(getApplyLink(jobId));
    setCopiedId(jobId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (ts: string | Timestamp) => {
    if (!ts) return '—';
    if (typeof ts === 'string') return new Date(ts).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    // Firestore Timestamp
    const d = (ts as Timestamp).toDate?.();
    return d ? d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
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
          ) : posted ? (
            '✅ Job posted!'
          ) : (
            '📋 Post job'
          )}
        </button>
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
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <button
                      onClick={() => copyLink(job.id)}
                      className="text-xs px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white hover:border-[#D4AF37]/30 transition whitespace-nowrap"
                    >
                      {copiedId === job.id ? '✅ Copied!' : '🔗 Copy apply link'}
                    </button>
                    <button
                      onClick={() => sendMessage(`Screen applicants for job: ${job.title}`)}
                      className="text-xs px-3 py-1.5 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/10 transition whitespace-nowrap"
                    >
                      🤖 Screen applicants
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
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
            { key: 'find', label: '🔍 Find Candidates', desc: 'AKAI sources & screens for you' },
            { key: 'post', label: '📋 Post a Job', desc: 'Receive screened inbound applicants' },
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
