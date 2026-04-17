'use client';

import { useState, useCallback, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';

type GBPTab = 'profile' | 'posts' | 'reviews';

interface GBPProfile {
  name: string;
  phone: string;
  website: string;
  category: string;
  mapsUrl: string;
  rating: number | null;
  reviewCount: number;
  locationName: string;
  accountName: string;
}

interface GBPPost {
  summary: string;
  callToActionType: string;
  callToActionUrl?: string;
  topicType: 'STANDARD' | 'EVENT' | 'OFFER';
  eventTitle?: string;
  offerTitle?: string;
}

interface GBPReview {
  reviewId: string;
  reviewer: string;
  starRating: number;
  comment: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
  aiReply?: string;
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <span key={star} className={`text-sm ${star <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</span>
      ))}
    </div>
  );
}

function GBPPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<GBPTab>('profile');

  // Connection state
  const [gbpConnected, setGbpConnected] = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);
  const [connectStatus, setConnectStatus] = useState('');

  // Profile state
  const [profile, setProfile] = useState<GBPProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Posts state
  const [suggestions, setSuggestions] = useState<GBPPost[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [customPost, setCustomPost] = useState('');
  const [postType, setPostType] = useState<'STANDARD' | 'EVENT' | 'OFFER'>('STANDARD');
  const [publishingPost, setPublishingPost] = useState<number | null>(null);
  const [publishedPosts, setPublishedPosts] = useState<Set<number>>(new Set());
  const [postError, setPostError] = useState('');
  const [preview, setPreview] = useState<GBPPost | null>(null);

  // Reviews state
  const [reviews, setReviews] = useState<GBPReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editedReplies, setEditedReplies] = useState<Record<string, string>>({});
  const [publishingReply, setPublishingReply] = useState<string | null>(null);
  const [publishedReplies, setPublishedReplies] = useState<Set<string>>(new Set());

  const getToken = useCallback(async () => {
    if (!user) return null;
    try { return await user.getIdToken(); } catch { return null; }
  }, [user]);

  // Check URL params for connection result
  useEffect(() => {
    const gbpParam = searchParams.get('gbp');
    if (gbpParam === 'connected') {
      setGbpConnected(true);
      setConnectStatus('✅ Google Business Profile connected!');
    } else if (gbpParam === 'error') {
      const reason = searchParams.get('reason') ?? 'unknown error';
      setConnectStatus(`❌ Connection failed: ${reason}`);
    }
  }, [searchParams]);

  const handleConnect = async () => {
    setConnectLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/gbp/auth-url', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setConnectStatus(`❌ ${data.error ?? 'Failed to get auth URL'}`);
      }
    } catch {
      setConnectStatus('❌ Connection failed');
    } finally {
      setConnectLoading(false);
    }
  };

  const loadProfile = useCallback(async () => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/gbp/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { profile?: GBPProfile; error?: string };
      if (!res.ok) {
        if (res.status === 403) {
          setGbpConnected(false);
        }
        throw new Error(data.error ?? 'Failed to load profile');
      }
      setProfile(data.profile ?? null);
      setGbpConnected(true);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setProfileLoading(false);
    }
  }, [getToken]);

  const loadSuggestions = useCallback(async () => {
    setSuggestionsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/gbp/posts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { suggestions?: GBPPost[]; error?: string };
      if (res.ok) setSuggestions(data.suggestions ?? []);
    } catch { /* non-fatal */ } finally {
      setSuggestionsLoading(false);
    }
  }, [getToken]);

  const loadReviews = useCallback(async () => {
    if (!profile?.locationName) return;
    setReviewsLoading(true);
    setReviewsError('');
    try {
      const token = await getToken();
      const res = await fetch(`/api/gbp/reviews?locationName=${encodeURIComponent(profile.locationName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json() as { reviews?: GBPReview[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to load reviews');
      setReviews(data.reviews ?? []);
      // Pre-fill edited replies with AI suggestions
      const initial: Record<string, string> = {};
      (data.reviews ?? []).forEach(r => {
        if (r.aiReply) initial[r.reviewId] = r.aiReply;
      });
      setEditedReplies(initial);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Failed to load reviews');
    } finally {
      setReviewsLoading(false);
    }
  }, [getToken, profile?.locationName]);

  // Load profile when connected
  useEffect(() => {
    if (gbpConnected && !profile) {
      loadProfile();
    }
  }, [gbpConnected, profile, loadProfile]);

  // Load tab data when switching
  useEffect(() => {
    if (!gbpConnected) return;
    if (tab === 'profile' && !profile) loadProfile();
    if (tab === 'posts' && suggestions.length === 0) loadSuggestions();
    if (tab === 'reviews' && reviews.length === 0) loadReviews();
  }, [tab, gbpConnected, profile, suggestions.length, reviews.length, loadProfile, loadSuggestions, loadReviews]);

  const handlePublishPost = async (post: GBPPost, index: number) => {
    if (!profile?.locationName) return;
    setPublishingPost(index);
    setPostError('');
    try {
      const token = await getToken();
      const res = await fetch('/api/gbp/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ post, locationName: profile.locationName }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to publish post');
      setPublishedPosts(prev => new Set([...prev, index]));
      setPreview(null);
    } catch (err) {
      setPostError(err instanceof Error ? err.message : 'Failed to publish post');
    } finally {
      setPublishingPost(null);
    }
  };

  const handlePublishCustomPost = async () => {
    if (!customPost.trim() || !profile?.locationName) return;
    const post: GBPPost = { summary: customPost, topicType: postType, callToActionType: 'LEARN_MORE' };
    await handlePublishPost(post, -1);
    if (!postError) setCustomPost('');
  };

  const handlePublishReply = async (reviewId: string) => {
    if (!profile?.locationName) return;
    const comment = editedReplies[reviewId];
    if (!comment?.trim()) return;
    setPublishingReply(reviewId);
    try {
      const token = await getToken();
      const res = await fetch('/api/gbp/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ locationName: profile.locationName, reviewId, comment }),
      });
      const data = await res.json() as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Failed to publish reply');
      setPublishedReplies(prev => new Set([...prev, reviewId]));
      setReplyingTo(null);
    } catch (err) {
      setReviewsError(err instanceof Error ? err.message : 'Failed to publish reply');
    } finally {
      setPublishingReply(null);
    }
  };

  const topicLabels: Record<string, string> = { STANDARD: "What's New", EVENT: 'Event', OFFER: 'Offer' };

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📍</span>
            <div>
              <h1 className="text-2xl font-bold text-white">Google Business Profile</h1>
              <p className="text-sm text-gray-400">Manage your GBP listing, posts, and reviews</p>
            </div>
          </div>
          {gbpConnected && (
            <span className="text-xs px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">
              ● Connected
            </span>
          )}
        </div>

        {/* Connection status */}
        {connectStatus && (
          <div className={`text-sm px-4 py-3 rounded-xl border ${connectStatus.startsWith('✅') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
            {connectStatus}
          </div>
        )}

        {/* Not connected banner */}
        {!gbpConnected && (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center space-y-4">
            <div className="text-5xl">📍</div>
            <div>
              <h2 className="text-white font-semibold text-lg mb-1">Connect your Google Business Profile</h2>
              <p className="text-gray-400 text-sm">Manage posts, monitor reviews, and get AI-powered insights — all in one place.</p>
            </div>
            <button
              onClick={handleConnect}
              disabled={connectLoading}
              className="px-6 py-3 bg-[#D4AF37] text-black text-sm font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition flex items-center gap-2 mx-auto"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {connectLoading ? 'Connecting...' : 'Connect with Google'}
            </button>
            <p className="text-xs text-gray-600">Requires a verified Google Business Profile account</p>
          </div>
        )}

        {/* Connected view */}
        {gbpConnected && (
          <>
            {/* Tabs */}
            <div className="flex gap-1 bg-[#111] rounded-xl p-1 w-fit">
              {([
                { id: 'profile', label: '📊 Profile' },
                { id: 'posts', label: '📝 Posts' },
                { id: 'reviews', label: '⭐ Reviews' },
              ] as { id: GBPTab; label: string }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tab === t.id
                      ? 'bg-[#D4AF37] text-black'
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── Profile Tab ── */}
            {tab === 'profile' && (
              <div className="space-y-4">
                {profileLoading && (
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-8 text-center text-gray-400 text-sm">
                    Loading profile...
                  </div>
                )}
                {profileError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                    {profileError}
                    <button onClick={loadProfile} className="ml-2 underline">Retry</button>
                  </div>
                )}
                {profile && (
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-white font-bold text-xl">{profile.name}</h2>
                        <p className="text-gray-400 text-sm">{profile.category}</p>
                      </div>
                      {profile.rating !== null && (
                        <div className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <span className="text-[#D4AF37] font-bold text-xl">{profile.rating.toFixed(1)}</span>
                            <span className="text-yellow-400 text-lg">★</span>
                          </div>
                          <p className="text-gray-500 text-xs">{profile.reviewCount} reviews</p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {profile.phone && (
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#1a1a1a]">
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="text-white font-medium text-sm">{profile.phone}</p>
                        </div>
                      )}
                      {profile.website && (
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#1a1a1a]">
                          <p className="text-xs text-gray-500 mb-1">Website</p>
                          <a href={profile.website} target="_blank" rel="noopener noreferrer"
                            className="text-[#D4AF37] font-medium text-sm hover:underline truncate block">
                            {profile.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {profile.mapsUrl && (
                        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#1a1a1a]">
                          <p className="text-xs text-gray-500 mb-1">Google Maps</p>
                          <a href={profile.mapsUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[#D4AF37] font-medium text-sm hover:underline">
                            View listing ↗
                          </a>
                        </div>
                      )}
                    </div>

                    <button onClick={loadProfile} className="text-xs text-gray-500 hover:text-gray-300 transition">
                      ↻ Refresh profile
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Posts Tab ── */}
            {tab === 'posts' && (
              <div className="space-y-5">
                {/* Custom post */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-4">
                  <h2 className="text-white font-semibold">Create a Post</h2>
                  <div className="flex gap-2">
                    {(['STANDARD', 'EVENT', 'OFFER'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setPostType(type)}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition ${
                          postType === type
                            ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                            : 'border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-white'
                        }`}
                      >
                        {topicLabels[type]}
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={customPost}
                    onChange={e => setCustomPost(e.target.value)}
                    placeholder="Write your post here (150-300 characters recommended)..."
                    rows={3}
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
                  />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPreview({ summary: customPost, topicType: postType, callToActionType: 'LEARN_MORE' })}
                      disabled={!customPost.trim()}
                      className="px-4 py-2 text-sm border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white hover:border-[#3a3a3a] disabled:opacity-40 transition"
                    >
                      Preview
                    </button>
                    <button
                      onClick={handlePublishCustomPost}
                      disabled={!customPost.trim() || publishingPost === -1}
                      className="px-5 py-2 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
                    >
                      {publishingPost === -1 ? 'Publishing...' : 'Publish Now →'}
                    </button>
                  </div>
                  {postError && <p className="text-red-400 text-xs">{postError}</p>}
                </div>

                {/* Preview modal */}
                {preview && (
                  <div className="bg-[#111] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[#D4AF37] font-semibold text-sm">Preview — {topicLabels[preview.topicType] ?? preview.topicType}</h3>
                      <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
                    </div>
                    <div className="bg-white rounded-xl p-4">
                      <p className="text-gray-800 text-sm leading-relaxed">{preview.summary}</p>
                    </div>
                    <button
                      onClick={() => handlePublishPost(preview, -1)}
                      disabled={publishingPost === -1}
                      className="px-5 py-2 bg-[#D4AF37] text-black text-sm font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
                    >
                      {publishingPost === -1 ? 'Publishing...' : 'Confirm & Publish →'}
                    </button>
                  </div>
                )}

                {/* AI suggestions */}
                <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-white font-semibold">AI Post Suggestions</h3>
                    <button
                      onClick={loadSuggestions}
                      disabled={suggestionsLoading}
                      className="text-xs text-gray-500 hover:text-gray-300 transition"
                    >
                      {suggestionsLoading ? '⏳ Generating...' : '↻ Refresh ideas'}
                    </button>
                  </div>

                  {suggestionsLoading && (
                    <p className="text-gray-500 text-sm text-center py-4">Generating post ideas...</p>
                  )}

                  {!suggestionsLoading && suggestions.length === 0 && (
                    <button
                      onClick={loadSuggestions}
                      className="w-full py-4 text-sm text-gray-500 hover:text-gray-300 transition"
                    >
                      Generate 5 post ideas →
                    </button>
                  )}

                  <div className="space-y-3">
                    {suggestions.map((sug, i) => (
                      <div key={i} className="bg-[#0a0a0a] rounded-xl p-4 border border-[#1a1a1a]">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full border mb-2 inline-block ${
                              sug.topicType === 'OFFER' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                              sug.topicType === 'EVENT' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' :
                              'bg-[#D4AF37]/10 border-[#D4AF37]/20 text-[#D4AF37]'
                            }`}>
                              {topicLabels[sug.topicType] ?? sug.topicType}
                            </span>
                            <p className="text-white text-sm leading-relaxed">{sug.summary}</p>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            {publishedPosts.has(i) ? (
                              <span className="text-xs text-green-400">✅ Published</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setPreview(sug)}
                                  className="text-xs px-3 py-1.5 border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white transition"
                                >
                                  Preview
                                </button>
                                <button
                                  onClick={() => handlePublishPost(sug, i)}
                                  disabled={publishingPost === i}
                                  className="text-xs px-3 py-1.5 bg-[#D4AF37] text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
                                >
                                  {publishingPost === i ? '...' : 'Publish'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Reviews Tab ── */}
            {tab === 'reviews' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold">Recent Reviews</h2>
                  <button
                    onClick={loadReviews}
                    disabled={reviewsLoading}
                    className="text-xs text-gray-500 hover:text-gray-300 transition"
                  >
                    {reviewsLoading ? '⏳ Loading...' : '↻ Refresh'}
                  </button>
                </div>

                {reviewsLoading && (
                  <div className="text-center py-8 text-gray-400 text-sm">Loading reviews...</div>
                )}

                {reviewsError && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                    {reviewsError}
                  </div>
                )}

                {!profile?.locationName && !reviewsLoading && (
                  <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 text-center text-gray-400 text-sm">
                    Load your profile first to see reviews.
                    <button onClick={loadProfile} className="block mx-auto mt-2 text-[#D4AF37] hover:underline">Load profile →</button>
                  </div>
                )}

                {!reviewsLoading && !reviewsError && reviews.length === 0 && profile?.locationName && (
                  <button
                    onClick={loadReviews}
                    className="w-full py-6 bg-[#111] border border-[#1f1f1f] rounded-2xl text-gray-400 text-sm hover:border-[#D4AF37]/30 transition"
                  >
                    Load reviews →
                  </button>
                )}

                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.reviewId} className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-5 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-semibold text-sm">{review.reviewer}</span>
                            <StarRating rating={review.starRating} />
                          </div>
                          {review.comment && (
                            <p className="text-gray-300 text-sm leading-relaxed">{review.comment}</p>
                          )}
                          {!review.comment && (
                            <p className="text-gray-600 text-sm italic">No written review</p>
                          )}
                          <p className="text-gray-600 text-xs mt-1">
                            {new Date(review.createTime).toLocaleDateString('en-AU', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>

                      {/* Existing reply */}
                      {review.reviewReply && (
                        <div className="bg-[#0a0a0a] rounded-xl p-3 border border-[#1a1a1a]">
                          <p className="text-xs text-[#D4AF37] mb-1">Your reply</p>
                          <p className="text-gray-300 text-sm">{review.reviewReply.comment}</p>
                        </div>
                      )}

                      {/* Reply section */}
                      {!review.reviewReply && (
                        <div className="space-y-2">
                          {publishedReplies.has(review.reviewId) ? (
                            <p className="text-xs text-green-400">✅ Reply published</p>
                          ) : (
                            <>
                              {replyingTo === review.reviewId ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={editedReplies[review.reviewId] ?? ''}
                                    onChange={e => setEditedReplies(prev => ({ ...prev, [review.reviewId]: e.target.value }))}
                                    rows={3}
                                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition resize-none"
                                  />
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => setReplyingTo(null)}
                                      className="px-3 py-1.5 text-xs border border-[#2a2a2a] text-gray-400 rounded-lg hover:text-white transition"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => handlePublishReply(review.reviewId)}
                                      disabled={publishingReply === review.reviewId}
                                      className="px-4 py-1.5 text-xs bg-[#D4AF37] text-black font-bold rounded-lg hover:opacity-90 disabled:opacity-40 transition"
                                    >
                                      {publishingReply === review.reviewId ? 'Publishing...' : 'Publish Reply →'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-3">
                                  {review.aiReply && (
                                    <div className="flex-1 bg-[#0a0a0a] rounded-xl p-3 border border-[#1a1a1a]">
                                      <p className="text-xs text-gray-500 mb-1">✨ AI suggested reply</p>
                                      <p className="text-gray-400 text-xs leading-relaxed">{review.aiReply}</p>
                                    </div>
                                  )}
                                  <button
                                    onClick={() => setReplyingTo(review.reviewId)}
                                    className="flex-shrink-0 px-3 py-1.5 text-xs bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] rounded-lg hover:bg-[#D4AF37]/20 transition"
                                  >
                                    {review.aiReply ? 'Edit & Reply' : 'Reply'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function GBPPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
      <GBPPageInner />
    </Suspense>
  );
}
