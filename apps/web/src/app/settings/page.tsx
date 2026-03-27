'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { getFirebaseDb, getFirebaseAuth, getFirebaseStorage } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
      <h2 className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-gray-500 font-medium">{label}</label>
      {children}
    </div>
  );
}

const VOICE_OPTIONS = [
  { id: 'sophie-au', label: 'Sophie — Australian English', description: 'Warm, professional Australian accent', default: true },
  { id: 'sophie-us', label: 'Sophie — American English', description: 'Neutral American accent' },
  { id: 'olivia-au', label: 'Olivia — Australian English', description: 'Friendly, upbeat tone' },
];

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  trial: { label: 'Free Trial', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  starter: { label: 'Starter — $297/mo', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  growth: { label: 'Growth — $597/mo', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  scale: { label: 'Scale — $1,197/mo', color: 'text-[#D4AF37] bg-[#D4AF37]/10 border-[#D4AF37]/20' },
};

interface NotifPrefs {
  email: boolean;
  sms: boolean;
  smsNumber: string;
  whatsapp: boolean;
  whatsappNumber: string;
  telegram: boolean;
  telegramChatId: string;
  signal: boolean;
  signalNumber: string;
}

export default function SettingsPage() {
  const { user, userProfile } = useAuth();

  // Business profile
  const [bizForm, setBizForm] = useState({ businessName: '', industry: '', location: '', website: '', phone: '' });
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [bizSaving, setBizSaving] = useState(false);
  const [bizSaved, setBizSaved] = useState(false);
  const [bizError, setBizError] = useState<string | null>(null);

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    email: true,
    sms: false,
    smsNumber: '',
    whatsapp: false,
    whatsappNumber: '',
    telegram: false,
    telegramChatId: '',
    signal: false,
    signalNumber: '',
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Sophie voice
  const [selectedVoice, setSelectedVoice] = useState('sophie-au');

  // Plan
  const [planTier, setPlanTier] = useState<string>('trial');

  // Avatar
  const AVATAR_COLORS = ['#D4AF37', '#3B82F6', '#10B981', '#EF4444', '#8B5CF6', '#F97316'];
  const [avatarColor, setAvatarColor] = useState('#D4AF37');
  const [avatarPhotoUrl, setAvatarPhotoUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Connected Accounts
  interface ConnectedAccount {
    connected: boolean;
    identifier?: string; // email or handle
  }
  const [connectedAccounts, setConnectedAccounts] = useState<{
    microsoft: ConnectedAccount;
    gmail: ConnectedAccount;
    googleCalendar: ConnectedAccount;
    instagram: ConnectedAccount;
    linkedin: ConnectedAccount;
    facebook: ConnectedAccount;
    x: ConnectedAccount;
  }>({
    microsoft: { connected: false },
    gmail: { connected: false },
    googleCalendar: { connected: false },
    instagram: { connected: false },
    linkedin: { connected: false },
    facebook: { connected: false },
    x: { connected: false },
  });

  // Email Guard
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [forwardCopied, setForwardCopied] = useState(false);

  const webhookUrl = 'https://api-server-production-2a27.up.railway.app/api/mail-guard/inbound';
  const forwardAddress = 'inbound@getakai.ai';

  const copy = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Load settings from Firestore
  useEffect(() => {
    if (!user?.uid) return;
    const db = getFirebaseDb();
    if (!db) return;

    (async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) return;
        const data = snap.data();

        // Business profile from onboarding sub-doc or top-level
        const onboarding = data.onboarding || {};
        setBizForm({
          businessName: onboarding.businessName || data.businessName || '',
          industry: onboarding.industry || '',
          location: onboarding.location || '',
          website: onboarding.website || data.website || '',
          phone: onboarding.phone || data.phone || '',
        });
        setProfileLoaded(true);

        // Notification prefs (new multi-channel)
        const np = data.notificationPrefs || {};
        setNotifPrefs({
          email: np.email !== false,
          sms: np.sms || false,
          smsNumber: np.smsNumber || '',
          whatsapp: np.whatsapp || false,
          whatsappNumber: np.whatsappNumber || '',
          telegram: np.telegram || false,
          telegramChatId: np.telegramChatId || '',
          signal: np.signal || false,
          signalNumber: np.signalNumber || '',
        });

        // Voice
        setSelectedVoice(data.sophieVoice || 'sophie-au');

        // Plan
        setPlanTier(data.plan || data.planTier || 'trial');

        // Avatar
        if (data.avatarColor) setAvatarColor(data.avatarColor);
        if (data.avatarPhotoUrl) setAvatarPhotoUrl(data.avatarPhotoUrl);

        // Connected Accounts — inbox integrations
        const inboxConn = data.inboxConnection || {};
        const gmailConn = data.gmailConnection || {};

        // Load Google Calendar from integrations sub-doc
        let gcalConnected = false;
        let gcalEmail: string | undefined;
        try {
          const gcalSnap = await getDoc(doc(db, 'users', user.uid, 'integrations', 'googleCalendar'));
          if (gcalSnap.exists()) {
            const gcal = gcalSnap.data();
            gcalConnected = gcal.connected === true || !!gcal.accessToken;
            gcalEmail = gcal.email || undefined;
          }
        } catch { /* ignore */ }

        // Load social connections
        const socialMap: Record<string, ConnectedAccount> = {
          instagram: { connected: false },
          linkedin: { connected: false },
          facebook: { connected: false },
          x: { connected: false },
        };
        try {
          const socialSnap = await getDocs(collection(db, 'users', user.uid, 'socialConnections'));
          socialSnap.forEach(d => {
            const platform = d.id;
            const sd = d.data();
            if (platform in socialMap) {
              const isConnected = sd.connected === true || sd.waitlisted === true || sd.requested === true;
              socialMap[platform] = {
                connected: isConnected,
                identifier: sd.handle || sd.profileUrl || sd.email || undefined,
              };
            }
          });
        } catch { /* ignore */ }

        setConnectedAccounts({
          microsoft: {
            connected: inboxConn.connected === true || !!inboxConn.email,
            identifier: inboxConn.email || undefined,
          },
          gmail: {
            connected: gmailConn.connected === true || !!gmailConn.email,
            identifier: gmailConn.email || undefined,
          },
          googleCalendar: { connected: gcalConnected, identifier: gcalEmail },
          instagram: socialMap.instagram,
          linkedin: socialMap.linkedin,
          facebook: socialMap.facebook,
          x: socialMap.x,
        });
      } catch (err) {
        console.error('[SETTINGS] load error', err);
      }
    })();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const saveBizProfile = async () => {
    if (!user?.uid || bizSaving) return;
    setBizSaving(true);
    try {
      const db = getFirebaseDb();
      if (!db) throw new Error('Firestore not available');

      // Update main user doc
      const userSave = setDoc(doc(db, 'users', user.uid), {
        businessName: bizForm.businessName,
        displayName: bizForm.businessName,
        campaignConfig: {
          businessName: bizForm.businessName,
          industry: bizForm.industry,
          location: bizForm.location,
          website: bizForm.website,
          phone: bizForm.phone,
        },
        onboarding: {
          businessName: bizForm.businessName,
          industry: bizForm.industry,
          location: bizForm.location,
          website: bizForm.website,
          phone: bizForm.phone,
        },
      }, { merge: true });

      // Also update voiceConfig so Sophie uses the right businessName
      const voiceSave = setDoc(doc(db, 'users', user.uid, 'voiceConfig', 'config'), {
        businessName: bizForm.businessName,
        industry: bizForm.industry,
        location: bizForm.location,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      }, { merge: true });

      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Save timed out')), 8000));
      await Promise.race([Promise.all([userSave, voiceSave]), timeout]);
      setBizSaved(true);
      setBizError(null);
      setTimeout(() => setBizSaved(false), 3000);
    } catch (err) {
      console.error('[SETTINGS] save biz error', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setBizError(`Save failed: ${msg}. Please try again.`);
    } finally {
      setBizSaving(false);
    }
  };

  const saveNotifications = async () => {
    if (!user?.uid || notifSaving) return;
    setNotifSaving(true);
    setNotifError(null);
    try {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, 'users', user.uid), {
          notificationPrefs: {
            email: notifPrefs.email,
            sms: notifPrefs.sms,
            smsNumber: notifPrefs.smsNumber,
            whatsapp: notifPrefs.whatsapp,
            whatsappNumber: notifPrefs.whatsappNumber,
            telegram: notifPrefs.telegram,
            telegramChatId: notifPrefs.telegramChatId,
            signal: notifPrefs.signal,
            signalNumber: notifPrefs.signalNumber,
          },
        }, { merge: true });
      }
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch (err) {
      console.error('[SETTINGS] save notif error', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setNotifError(`Save failed: ${msg}. Please try again.`);
    } finally {
      setNotifSaving(false);
    }
  };

  const saveVoice = async (voiceId: string) => {
    setSelectedVoice(voiceId);
    if (!user?.uid) return;
    try {
      const db = getFirebaseDb();
      if (db) {
        await setDoc(doc(db, 'users', user.uid), { sophieVoice: voiceId }, { merge: true });
      }
    } catch (err) {
      console.error('[SETTINGS] save voice error', err);
    }
  };

  const planInfo = PLAN_LABELS[planTier] || PLAN_LABELS.trial;

  const saveAvatarColor = async (color: string) => {
    setAvatarColor(color);
    if (!user?.uid) return;
    try {
      const db = getFirebaseDb();
      if (db) await setDoc(doc(db, 'users', user.uid), { avatarColor: color }, { merge: true });
    } catch (err) { console.error('[SETTINGS] save avatar color', err); }
  };

  const uploadAvatarPhoto = async (file: File) => {
    if (!user?.uid || avatarUploading) return;
    setAvatarUploading(true);
    try {
      const storage = getFirebaseStorage();
      if (!storage) throw new Error('Storage unavailable');
      const storageRef = ref(storage, `avatars/${user.uid}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setAvatarPhotoUrl(url);
      const db = getFirebaseDb();
      if (db) await setDoc(doc(db, 'users', user.uid), { avatarPhotoUrl: url }, { merge: true });
    } catch (err) { console.error('[SETTINGS] avatar upload', err); }
    finally { setAvatarUploading(false); }
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== 'DELETE' || !user) return;
    setDeleting(true);
    try {
      const db = getFirebaseDb();
      if (db) {
        // Delete all user data from Firestore
        await setDoc(doc(db, 'users', user.uid), { deleted: true, deletedAt: new Date().toISOString() }, { merge: true });
      }
      // Sign out and redirect
      await getFirebaseAuth()?.signOut();
      window.location.href = '/login';
    } catch (err) {
      console.error('[DELETE ACCOUNT]', err);
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout>
      <header className="flex items-center justify-between px-8 py-4 border-b border-[#1f1f1f] bg-[#080808]">
        <div>
          <h1 className="text-xl font-black text-white">Settings</h1>
          <p className="text-xs text-gray-500 mt-0.5">Account and workspace configuration</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8">
      <div className="space-y-6 max-w-2xl w-full">

        {/* Account */}
        <Section title="Account">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              {avatarPhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarPhotoUrl}
                  alt="Avatar"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#2a2a2a]"
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-full border-2 border-[#2a2a2a] flex items-center justify-center font-black text-xl text-black"
                  style={{ backgroundColor: avatarColor }}
                >
                  {(userProfile?.displayName || user?.email || 'A')[0].toUpperCase()}
                </div>
              )}
              {avatarUploading && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">{userProfile?.displayName || userProfile?.businessName || 'Your Account'}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
              {/* Color picker */}
              <div className="flex items-center gap-1.5 mt-2">
                {AVATAR_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => saveAvatarColor(c)}
                    title={c}
                    className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: avatarColor === c ? 'white' : 'transparent',
                    }}
                  />
                ))}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="ml-1 text-xs text-gray-500 hover:text-white transition px-2 py-0.5 border border-[#2a2a2a] rounded-full hover:border-[#3a3a3a]"
                  title="Upload photo"
                >
                  📷 Upload
                </button>
                {avatarPhotoUrl && (
                  <button
                    onClick={() => {
                      setAvatarPhotoUrl(null);
                      if (user?.uid) {
                        const db = getFirebaseDb();
                        if (db) setDoc(doc(db, 'users', user.uid), { avatarPhotoUrl: null }, { merge: true }).catch(() => {});
                      }
                    }}
                    className="text-xs text-gray-600 hover:text-red-400 transition"
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadAvatarPhoto(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div className="ml-auto flex-shrink-0">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${planInfo.color}`}>
                {planInfo.label}
              </span>
            </div>
          </div>
        </Section>

        {/* Business Profile */}
        <Section title="Business Profile">
          <p className="text-sm text-gray-400">This information is used by Sophie AI and your campaign scripts.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Business Name">
              <input
                type="text"
                value={bizForm.businessName}
                onChange={e => setBizForm(f => ({ ...f, businessName: e.target.value }))}
                placeholder="e.g. Smith Plumbing"
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </FieldRow>
            <FieldRow label="Industry">
              <input
                type="text"
                value={bizForm.industry}
                onChange={e => setBizForm(f => ({ ...f, industry: e.target.value }))}
                placeholder="e.g. Trades, Legal, Real Estate"
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </FieldRow>
            <FieldRow label="Location">
              <input
                type="text"
                value={bizForm.location}
                onChange={e => setBizForm(f => ({ ...f, location: e.target.value }))}
                placeholder="e.g. Sydney, NSW"
                className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </FieldRow>
          </div>
          {bizError && (
            <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 mb-2">
              {bizError}
            </div>
          )}
          {bizSaved && (
            <div className="flex items-center gap-2 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 mb-2 text-green-400 font-semibold animate-in fade-in">
              <span>✅</span>
              <span>Business profile saved — Sophie is now updated with your latest details.</span>
            </div>
          )}
          <button
            onClick={saveBizProfile}
            disabled={bizSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {bizSaving ? (
              <><span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> Saving…</>
            ) : (
              'Save Business Profile'
            )}
          </button>
        </Section>

        {/* Connected Accounts */}
        <Section title="Connected Accounts">
          <p className="text-sm text-gray-400">Integration status for all connected services.</p>
          <div className="divide-y divide-[#1f1f1f]">
            {[
              {
                key: 'microsoft',
                label: 'Microsoft Outlook',
                icon: '📧',
                account: connectedAccounts.microsoft,
                connectHref: '/email-guard',
                disconnectHref: '/email-guard',
              },
              {
                key: 'gmail',
                label: 'Gmail',
                icon: '📩',
                account: connectedAccounts.gmail,
                connectHref: '/email-guard',
                disconnectHref: '/email-guard',
              },
              {
                key: 'googleCalendar',
                label: 'Google Calendar',
                icon: '📅',
                account: connectedAccounts.googleCalendar,
                connectHref: '/calendar',
                disconnectHref: '/calendar',
              },
              {
                key: 'instagram',
                label: 'Instagram',
                icon: '📸',
                account: connectedAccounts.instagram,
                connectHref: '/social',
                disconnectHref: '/social',
              },
              {
                key: 'linkedin',
                label: 'LinkedIn',
                icon: '💼',
                account: connectedAccounts.linkedin,
                connectHref: '/social',
                disconnectHref: '/social',
              },
              {
                key: 'facebook',
                label: 'Facebook',
                icon: '👥',
                account: connectedAccounts.facebook,
                connectHref: '/social',
                disconnectHref: '/social',
              },
              {
                key: 'x',
                label: 'X (Twitter)',
                icon: '𝕏',
                account: connectedAccounts.x,
                connectHref: '/social',
                disconnectHref: '/social',
              },
            ].map(item => (
              <div key={item.key} className="flex items-center gap-4 py-3">
                <span className="text-xl w-8 flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{item.label}</p>
                  {item.account.connected && item.account.identifier && (
                    <p className="text-xs text-gray-500 truncate">{item.account.identifier}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {item.account.connected ? (
                    <>
                      <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Connected
                      </span>
                      <Link
                        href={item.disconnectHref}
                        className="text-xs text-gray-500 hover:text-red-400 transition underline underline-offset-2"
                      >
                        Disconnect
                      </Link>
                    </>
                  ) : (
                    <>
                      <span className="text-xs text-gray-600">Not connected</span>
                      <Link
                        href={item.connectHref}
                        className="text-xs text-[#D4AF37] hover:text-[#c4a030] transition font-medium"
                      >
                        Connect →
                      </Link>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Plan Info */}
        <Section title="Plan">
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Current Plan</p>
              <p className="text-xs text-gray-500 mt-0.5">Billing managed via Stripe</p>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full border ${planInfo.color}`}>
              {planInfo.label}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { tier: 'starter', label: 'Starter', price: '$297/mo' },
              { tier: 'growth', label: 'Growth', price: '$597/mo' },
              { tier: 'scale', label: 'Scale', price: '$1,197/mo' },
            ].map(p => (
              <div key={p.tier} className={`rounded-xl border p-3 text-center ${planTier === p.tier ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#0a0a0a]'}`}>
                <p className="text-xs font-bold text-white">{p.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.price}</p>
              </div>
            ))}
          </div>
          <a
            href="/pricing"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl text-sm font-medium hover:border-[#D4AF37]/30 transition"
          >
            Upgrade Plan →
          </a>
        </Section>

        {/* Notification Preferences */}
        <Section title="Notification Preferences">
          <p className="text-sm text-gray-400">How would you like AKAI to notify you? Select one or more channels.</p>

          <div className="space-y-3">
            {/* Email card */}
            <button
              onClick={() => setNotifPrefs(p => ({ ...p, email: !p.email }))}
              className={`w-full flex items-start gap-4 px-4 py-4 rounded-xl border transition-colors text-left ${
                notifPrefs.email
                  ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5'
                  : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
              }`}
            >
              <span className="text-2xl mt-0.5">📧</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-white">Email</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  We&apos;ll email you at <span className="text-gray-300">{user?.email}</span>
                </p>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                notifPrefs.email ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a] bg-transparent'
              }`}>
                {notifPrefs.email && <span className="text-black text-[10px] font-black">✓</span>}
              </div>
            </button>

            {/* SMS card */}
            <div className={`rounded-xl border transition-colors ${
              notifPrefs.sms ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#0a0a0a]'
            }`}>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, sms: !p.sms }))}
                className="w-full flex items-start gap-4 px-4 py-4 text-left hover:opacity-90 transition"
              >
                <span className="text-2xl mt-0.5">💬</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">SMS</p>
                  <p className="text-xs text-gray-500 mt-0.5">We&apos;ll text you when a lead qualifies</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                  notifPrefs.sms ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a] bg-transparent'
                }`}>
                  {notifPrefs.sms && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
              </button>
              {notifPrefs.sms && (
                <div className="px-4 pb-4">
                  <input
                    type="tel"
                    value={notifPrefs.smsNumber}
                    onChange={e => setNotifPrefs(p => ({ ...p, smsNumber: e.target.value }))}
                    placeholder="+61 4XX XXX XXX"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Australian mobile format: +61 4XX XXX XXX</p>
                </div>
              )}
            </div>

            {/* WhatsApp card */}
            <div className={`rounded-xl border transition-colors ${
              notifPrefs.whatsapp ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#0a0a0a]'
            }`}>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, whatsapp: !p.whatsapp }))}
                className="w-full flex items-start gap-4 px-4 py-4 text-left hover:opacity-90 transition"
              >
                <span className="text-2xl mt-0.5">📱</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">WhatsApp</p>
                  <p className="text-xs text-gray-500 mt-0.5">We&apos;ll message you on WhatsApp</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                  notifPrefs.whatsapp ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a] bg-transparent'
                }`}>
                  {notifPrefs.whatsapp && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
              </button>
              {notifPrefs.whatsapp && (
                <div className="px-4 pb-4">
                  <input
                    type="tel"
                    value={notifPrefs.whatsappNumber}
                    onChange={e => setNotifPrefs(p => ({ ...p, whatsappNumber: e.target.value }))}
                    placeholder="+61 4XX XXX XXX"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Include country code: +61 for Australia</p>
                </div>
              )}
            </div>
          </div>

            {/* Telegram card */}
            <div className={`rounded-xl border transition-colors ${
              notifPrefs.telegram ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#0a0a0a]'
            }`}>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, telegram: !p.telegram }))}
                className="w-full flex items-start gap-4 px-4 py-4 text-left hover:opacity-90 transition"
              >
                <span className="text-2xl mt-0.5">✈️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Telegram</p>
                  <p className="text-xs text-gray-500 mt-0.5">We&apos;ll message you on Telegram</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                  notifPrefs.telegram ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a] bg-transparent'
                }`}>
                  {notifPrefs.telegram && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
              </button>
              {notifPrefs.telegram && (
                <div className="px-4 pb-4">
                  <input
                    type="text"
                    value={notifPrefs.telegramChatId}
                    onChange={e => setNotifPrefs(p => ({ ...p, telegramChatId: e.target.value }))}
                    placeholder="Your Telegram username or chat ID"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Start a chat with @AKAI_Notify_Bot first, then enter your username</p>
                </div>
              )}
            </div>

            {/* Signal card */}
            <div className={`rounded-xl border transition-colors ${
              notifPrefs.signal ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5' : 'border-[#2a2a2a] bg-[#0a0a0a]'
            }`}>
              <button
                onClick={() => setNotifPrefs(p => ({ ...p, signal: !p.signal }))}
                className="w-full flex items-start gap-4 px-4 py-4 text-left hover:opacity-90 transition"
              >
                <span className="text-2xl mt-0.5">🔵</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Signal</p>
                  <p className="text-xs text-gray-500 mt-0.5">Private and encrypted notifications via Signal</p>
                </div>
                <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors ${
                  notifPrefs.signal ? 'border-[#D4AF37] bg-[#D4AF37]' : 'border-[#3a3a3a] bg-transparent'
                }`}>
                  {notifPrefs.signal && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
              </button>
              {notifPrefs.signal && (
                <div className="px-4 pb-4">
                  <input
                    type="tel"
                    value={notifPrefs.signalNumber}
                    onChange={e => setNotifPrefs(p => ({ ...p, signalNumber: e.target.value }))}
                    placeholder="+61 4XX XXX XXX"
                    className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37] transition-colors"
                  />
                  <p className="text-xs text-gray-600 mt-1.5">Your Signal-registered mobile number</p>
                </div>
              )}
            </div>

          <button
            onClick={saveNotifications}
            disabled={notifSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-xl text-sm font-semibold hover:border-[#D4AF37]/30 transition disabled:opacity-50"
          >
            {notifSaving ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
            ) : notifSaved ? (
              '✓ Saved!'
            ) : (
              'Save Notifications'
            )}
          </button>
          {notifError && (
            <p className="text-red-400 text-xs mt-2">{notifError}</p>
          )}
        </Section>

        {/* Sophie AI Voice Settings */}
        <Section title="Sophie AI — Voice Settings">
          <p className="text-sm text-gray-400">Choose the voice Sophie uses when calling your leads.</p>
          <div className="space-y-2">
            {VOICE_OPTIONS.map(voice => (
              <button
                key={voice.id}
                onClick={() => saveVoice(voice.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors text-left ${
                  selectedVoice === voice.id
                    ? 'border-[#D4AF37]/40 bg-[#D4AF37]/5'
                    : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#3a3a3a]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-white">{voice.label}</p>
                    {voice.default && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 font-semibold">Default</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{voice.description}</p>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                  selectedVoice === voice.id ? 'border-[#D4AF37]' : 'border-[#3a3a3a]'
                }`}>
                  {selectedVoice === voice.id && <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-semibold">Powered by Bland.ai BTTS</span>
            </div>
          </div>
        </Section>

        {/* Email Guard Connect */}
        <Section title="Email Guard — Connect your inbox">
          <p className="text-sm text-gray-400 leading-relaxed">
            Point your enquiry inbox at AKAI. Every inbound email is parsed, classified, and a tailored proposal is generated automatically.
          </p>

          <div className="space-y-4">
            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Option A — Email Forwarding</span>
                <span className="text-xs px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full">Recommended</span>
              </div>
              <p className="text-xs text-gray-500 mb-3">Set up an auto-forward rule in your email client to this address:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-[#D4AF37] font-mono">{forwardAddress}</code>
                <button
                  onClick={() => copy(forwardAddress, setForwardCopied)}
                  className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-xs font-medium hover:border-[#D4AF37]/30 transition flex-shrink-0"
                >
                  {forwardCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-white/50 uppercase tracking-wider">Option B — Webhook</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white/70 font-mono truncate">{webhookUrl}</code>
                <button
                  onClick={() => copy(webhookUrl, setWebhookCopied)}
                  className="px-3 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white rounded-lg text-xs font-medium hover:border-[#D4AF37]/30 transition flex-shrink-0"
                >
                  {webhookCopied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          <a
            href="/email-guard"
            className="flex items-center gap-2 px-4 py-2 bg-[#D4AF37] text-black rounded-xl text-sm font-bold hover:opacity-90 transition w-fit"
          >
            ✉️ View Email Guard →
          </a>
        </Section>

      {/* Danger Zone */}
      <Section title="Danger Zone">
        <p className="text-sm text-gray-400">Permanently delete your account and all associated data. This cannot be undone.</p>
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
          <p className="text-xs text-red-400 font-semibold">This will permanently delete:</p>
          <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
            <li>Your business profile and all settings</li>
            <li>All email connections and OAuth tokens</li>
            <li>Campaign history and lead data</li>
            <li>All chat conversations and proposals</li>
          </ul>
          <div className="space-y-2 pt-2">
            <label className="text-xs text-gray-500">Type <span className="font-mono text-red-400 font-bold">DELETE</span> to confirm</label>
            <input
              type="text"
              value={deleteConfirm}
              onChange={e => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full bg-[#0a0a0a] border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition font-mono"
            />
            <button
              onClick={deleteAccount}
              disabled={deleteConfirm !== 'DELETE' || deleting}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition disabled:opacity-40"
            >
              {deleting ? '⏳ Deleting...' : '🗑️ Delete My Account'}
            </button>
          </div>
        </div>
      </Section>
      </div>
      </div>
    </DashboardLayout>
  );
}
