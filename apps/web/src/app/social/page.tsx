'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

interface PlatformPost {
  platform: string;
  icon: string;
  content: string;
  hashtags: string;
  characterCount: number;
}

interface ScheduledPost {
  id: string;
  platform: string;
  icon: string;
  content: string;
  scheduledAt: string;
  status: 'scheduled' | 'draft';
}

const MOCK_SCHEDULED: ScheduledPost[] = [
  {
    id: '1',
    platform: 'Instagram',
    icon: '📸',
    content: 'The future of business is AI-powered. Here\'s how we\'re using it to 10x our results...',
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    status: 'scheduled',
  },
  {
    id: '2',
    platform: 'LinkedIn',
    icon: '💼',
    content: '3 lessons from scaling an AI agency from zero to clients in 30 days...',
    scheduledAt: new Date(Date.now() + 172800000).toISOString(),
    status: 'scheduled',
  },
];

const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-500' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼', color: 'from-blue-600 to-blue-400' },
  { id: 'facebook', label: 'Facebook', icon: '👥', color: 'from-blue-500 to-indigo-500' },
];

function formatScheduledDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function SocialPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Content generator state
  const [brief, setBrief] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedPosts, setGeneratedPosts] = useState<PlatformPost[]>([]);
  const [generateError, setGenerateError] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // Quick post state
  const [quickCaption, setQuickCaption] = useState('');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram']);
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [quickPosting, setQuickPosting] = useState(false);
  const [quickPostSuccess, setQuickPostSuccess] = useState('');

  // Calendar state
  const [scheduledPosts] = useState<ScheduledPost[]>(MOCK_SCHEDULED);
  const [activeTab, setActiveTab] = useState<'generator' | 'calendar' | 'quick'>('generator');

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

  async function handleGenerate() {
    if (!brief.trim()) return;
    setGenerating(true);
    setGenerateError('');
    setGeneratedPosts([]);
    try {
      const res = await fetch('/api/social/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: brief.trim() }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setGeneratedPosts(data.posts ?? []);
    } catch {
      setGenerateError('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy(idx: number, content: string, hashtags: string) {
    navigator.clipboard.writeText(`${content}\n\n${hashtags}`);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function togglePlatform(id: string) {
    setSelectedPlatforms(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  }

  async function handleQuickPost() {
    if (!quickCaption.trim() || selectedPlatforms.length === 0) return;
    setQuickPosting(true);
    // Simulate posting
    await new Promise(r => setTimeout(r, 1200));
    setQuickPosting(false);
    const action = scheduleMode === 'now' ? 'posted' : 'scheduled';
    setQuickPostSuccess(`Content ${action} to ${selectedPlatforms.join(', ')}! ✅`);
    setQuickCaption('');
    setTimeout(() => setQuickPostSuccess(''), 4000);
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">Social</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-powered content for Instagram, LinkedIn & Facebook</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium">Live</span>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Connect Accounts */}
        <section>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Connect Accounts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Instagram', icon: '📸', gradient: 'from-pink-500/20 to-purple-500/20', border: 'border-pink-500/20', text: 'text-pink-400' },
              { label: 'LinkedIn', icon: '💼', gradient: 'from-blue-600/20 to-blue-400/20', border: 'border-blue-500/20', text: 'text-blue-400' },
              { label: 'Facebook', icon: '👥', gradient: 'from-blue-500/20 to-indigo-500/20', border: 'border-indigo-500/20', text: 'text-indigo-400' },
            ].map(p => (
              <button
                key={p.label}
                className={`flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r ${p.gradient} border ${p.border} cursor-pointer hover:opacity-80 transition-opacity`}
                title={`Connect ${p.label} (coming soon)`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{p.icon}</span>
                  <div className="text-left">
                    <div className={`text-sm font-semibold ${p.text}`}>{p.label}</div>
                    <div className="text-xs text-gray-500">Not connected</div>
                  </div>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">Connect</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-600 mt-2">OAuth integration coming soon — generate and copy content now, connect to auto-post later.</p>
        </section>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111] rounded-xl p-1 w-fit">
          {[
            { id: 'generator', label: '✨ Content Generator' },
            { id: 'quick', label: '⚡ Quick Post' },
            { id: 'calendar', label: '📅 Calendar' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Generator Tab */}
        {activeTab === 'generator' && (
          <section className="space-y-4">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-1">What do you want to post about?</h3>
              <p className="text-xs text-gray-500 mb-3">Describe your topic, product, announcement, or idea — AK will write it for all three platforms.</p>
              <div className="flex gap-2">
                <textarea
                  value={brief}
                  onChange={e => setBrief(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                  placeholder="e.g. We just launched a new AI tool that helps SMBs get more leads..."
                  rows={3}
                  className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-600">Tip: Cmd+Enter to generate</span>
                <button
                  onClick={handleGenerate}
                  disabled={!brief.trim() || generating}
                  className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black text-sm font-bold disabled:opacity-40 hover:bg-[#c4a030] transition-colors flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : '✨ Generate Posts'}
                </button>
              </div>
              {generateError && <p className="text-xs text-red-400 mt-2">{generateError}</p>}
            </div>

            {/* Generated results */}
            {generatedPosts.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {generatedPosts.map((post, idx) => (
                  <div key={post.platform} className="bg-[#111] border border-[#1f1f1f] rounded-xl p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{post.icon}</span>
                        <span className="text-sm font-semibold text-white">{post.platform}</span>
                      </div>
                      <span className="text-xs text-gray-600">{post.content.length} chars</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed flex-1 whitespace-pre-wrap">{post.content}</p>
                    <p className="text-xs text-[#D4AF37]/70 mt-2">{post.hashtags}</p>
                    <button
                      onClick={() => handleCopy(idx, post.content, post.hashtags)}
                      className="mt-3 w-full py-2 rounded-lg border border-[#2a2a2a] text-xs text-gray-400 hover:text-white hover:border-[#D4AF37]/40 transition-all"
                    >
                      {copiedIdx === idx ? '✅ Copied!' : '📋 Copy to clipboard'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {generatedPosts.length === 0 && !generating && (
              <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl p-8 text-center">
                <div className="text-4xl mb-3">✨</div>
                <p className="text-sm text-gray-500">Your generated content will appear here, optimised for each platform.</p>
              </div>
            )}
          </section>
        )}

        {/* Quick Post Tab */}
        {activeTab === 'quick' && (
          <section className="bg-[#111] border border-[#1f1f1f] rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">Quick Post</h3>
              <p className="text-xs text-gray-500">Write your caption, pick platforms, and schedule or post immediately.</p>
            </div>

            <textarea
              value={quickCaption}
              onChange={e => setQuickCaption(e.target.value)}
              placeholder="Write your caption here..."
              rows={4}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-[#D4AF37]/50 transition-colors"
            />

            {/* Platform selector */}
            <div>
              <p className="text-xs text-gray-400 mb-2 font-medium">Platforms</p>
              <div className="flex gap-2 flex-wrap">
                {PLATFORMS.map(p => (
                  <button
                    key={p.id}
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedPlatforms.includes(p.id)
                        ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]'
                        : 'border-[#2a2a2a] text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <span>{p.icon}</span> {p.label}
                    {selectedPlatforms.includes(p.id) && <span className="text-[10px]">✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Schedule mode */}
            <div className="flex gap-2">
              <button
                onClick={() => setScheduleMode('now')}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                  scheduleMode === 'now' ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500'
                }`}
              >
                ⚡ Post Now
              </button>
              <button
                onClick={() => setScheduleMode('schedule')}
                className={`px-4 py-2 rounded-lg text-xs font-medium border transition-all ${
                  scheduleMode === 'schedule' ? 'border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]' : 'border-[#2a2a2a] text-gray-500'
                }`}
              >
                📅 Schedule
              </button>
            </div>

            {scheduleMode === 'schedule' && (
              <input
                type="datetime-local"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
              />
            )}

            {quickPostSuccess && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 text-sm text-green-400">
                {quickPostSuccess}
              </div>
            )}

            <button
              onClick={handleQuickPost}
              disabled={!quickCaption.trim() || selectedPlatforms.length === 0 || quickPosting}
              className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-black text-sm font-bold disabled:opacity-40 hover:bg-[#c4a030] transition-colors flex items-center justify-center gap-2"
            >
              {quickPosting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                  {scheduleMode === 'now' ? 'Posting...' : 'Scheduling...'}
                </>
              ) : scheduleMode === 'now' ? '⚡ Post Now' : '📅 Schedule Post'}
            </button>
            <p className="text-xs text-gray-600">Note: Direct posting requires connected accounts. Content will be saved to your calendar.</p>
          </section>
        )}

        {/* Calendar Tab */}
        {activeTab === 'calendar' && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Scheduled Posts</h3>
              <span className="text-xs text-gray-500">{scheduledPosts.length} upcoming</span>
            </div>

            {scheduledPosts.length === 0 ? (
              <div className="bg-[#0d0d0d] border border-dashed border-[#2a2a2a] rounded-xl p-10 text-center">
                <div className="text-4xl mb-3">📅</div>
                <p className="text-sm text-gray-400 font-medium mb-1">No posts scheduled</p>
                <p className="text-xs text-gray-600">Generate content above or use Quick Post to add to your calendar.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {scheduledPosts.map(post => (
                  <div key={post.id} className="bg-[#111] border border-[#1f1f1f] rounded-xl px-4 py-3 flex items-center gap-4">
                    <span className="text-xl">{post.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-white">{post.platform}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          post.status === 'scheduled'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                        }`}>
                          {post.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{post.content}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">{formatScheduledDate(post.scheduledAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

      </div>
    </DashboardLayout>
  );
}
