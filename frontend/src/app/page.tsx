'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const S = {
  // Layout
  page: { minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#f8fafc' } as React.CSSProperties,
  // Hero
  hero: { background: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 40%, #4f46e5 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' } as React.CSSProperties,
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px', height: '68px', background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.12)' } as React.CSSProperties,
  logoWrap: { display: 'flex', alignItems: 'center', gap: '12px' },
  logoIcon: { fontSize: '28px' },
  logoName: { color: '#fff', fontWeight: '800', fontSize: '22px', letterSpacing: '-0.5px' },
  logoSub: { color: 'rgba(255,255,255,0.55)', fontSize: '11px', marginTop: '1px' },
  navBtns: { display: 'flex', gap: '10px' },
  btnOutline: { padding: '8px 20px', border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', transition: 'all .15s' } as React.CSSProperties,
  btnWhite: { padding: '8px 20px', background: '#fff', color: '#1d4ed8', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', border: 'none', transition: 'all .15s' } as React.CSSProperties,

  // Hero content
  heroContent: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center' } as React.CSSProperties,
  badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '13px', fontWeight: '600', padding: '6px 16px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.25)', marginBottom: '28px' },
  heroTitle: { color: '#fff', fontSize: 'clamp(32px,5vw,58px)', fontWeight: '900', lineHeight: '1.12', letterSpacing: '-1.5px', maxWidth: '700px', margin: '0 auto 20px' },
  heroSpan: { color: '#93c5fd' },
  heroSub: { color: 'rgba(255,255,255,0.75)', fontSize: '18px', lineHeight: '1.7', maxWidth: '580px', margin: '0 auto 40px' },
  heroBtns: { display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' as const },
  btnPrimary: { padding: '14px 32px', background: '#fff', color: '#1d4ed8', borderRadius: '12px', fontSize: '16px', fontWeight: '800', cursor: 'pointer', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'all .15s' } as React.CSSProperties,
  btnGhost: { padding: '14px 32px', background: 'transparent', color: '#fff', borderRadius: '12px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', border: '2px solid rgba(255,255,255,0.4)', transition: 'all .15s' } as React.CSSProperties,

  // Stats bar
  statsBar: { background: 'rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center', gap: '60px', padding: '20px 32px', flexWrap: 'wrap' as const },
  stat: { textAlign: 'center' as const },
  statNum: { color: '#fff', fontSize: '24px', fontWeight: '800', display: 'block' },
  statLabel: { color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: '500' },

  // Features
  features: { background: '#fff', padding: '80px 24px' },
  featuresInner: { maxWidth: '1100px', margin: '0 auto' },
  featuresTitle: { textAlign: 'center' as const, fontSize: '32px', fontWeight: '800', color: '#0f172a', marginBottom: '10px', letterSpacing: '-0.5px' },
  featuresSub: { textAlign: 'center' as const, color: '#64748b', fontSize: '16px', marginBottom: '52px' },
  featuresGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
  featureCard: { padding: '28px', border: '1px solid #e2e8f0', borderRadius: '16px', background: '#f8fafc', transition: 'all .2s' } as React.CSSProperties,
  featureIconWrap: { width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', fontSize: '22px' },
  featureName: { fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' },
  featureDesc: { fontSize: '13.5px', color: '#64748b', lineHeight: '1.6' },

  // How it works
  howWorks: { background: '#f8fafc', padding: '80px 24px' },
  howInner: { maxWidth: '900px', margin: '0 auto' },
  steps: { display: 'flex', flexDirection: 'column' as const, gap: '0' },
  step: { display: 'flex', gap: '24px', alignItems: 'flex-start', position: 'relative' as const, paddingBottom: '32px' },
  stepNum: { width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #1d4ed8, #4f46e5)', color: '#fff', fontWeight: '800', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  stepTitle: { fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' },
  stepDesc: { fontSize: '13.5px', color: '#64748b', lineHeight: '1.6' },

  // Admin section
  adminSect: { background: 'linear-gradient(135deg, #0f172a, #1e293b)', padding: '64px 24px' },
  adminInner: { maxWidth: '700px', margin: '0 auto', textAlign: 'center' as const },
  adminTitle: { color: '#fff', fontSize: '28px', fontWeight: '800', marginBottom: '12px' },
  adminDesc: { color: '#94a3b8', fontSize: '15px', lineHeight: '1.7', marginBottom: '28px' },
  adminBadges: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' as const, marginBottom: '28px' },
  adminBadge: { padding: '6px 16px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', fontSize: '13px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.1)' },
  adminBtn: { padding: '12px 28px', background: '#2563eb', color: '#fff', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', border: 'none' } as React.CSSProperties,

  // Auth modal overlay
  overlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' },
  modal: { background: '#fff', borderRadius: '20px', padding: '40px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
  modalTitle: { fontSize: '24px', fontWeight: '800', color: '#0f172a', marginBottom: '6px', textAlign: 'center' as const },
  modalSub: { fontSize: '14px', color: '#64748b', marginBottom: '28px', textAlign: 'center' as const },
  formField: { marginBottom: '16px' },
  label: { display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' },
  inputStyle: { width: '100%', padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', color: '#0f172a' } as React.CSSProperties,
  submitBtn: { width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '15px', fontWeight: '700', cursor: 'pointer', marginTop: '8px' } as React.CSSProperties,
  modalClose: { position: 'absolute' as const, top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#94a3b8', padding: '4px 8px' },
  modalSwitch: { textAlign: 'center' as const, marginTop: '16px', fontSize: '13.5px', color: '#64748b' },
  switchLink: { color: '#2563eb', fontWeight: '600', cursor: 'pointer', textDecoration: 'none' },
  divider: { display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' },
  dividerLine: { flex: 1, height: '1px', background: '#e2e8f0' },
  dividerText: { fontSize: '12px', color: '#94a3b8', fontWeight: '500' },
  guestBtn: { width: '100%', padding: '11px', background: '#f8fafc', color: '#374151', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer' } as React.CSSProperties,

  // Footer
  footer: { background: '#0f172a', padding: '32px 24px', textAlign: 'center' as const },
  footerText: { color: '#475569', fontSize: '13px' },
};

type Mode = 'home' | 'login' | 'register';

export default function HomePage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [mode, setMode] = useState<Mode>('home');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', full_name: '' });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.login({ email: formData.email, password: formData.password }) as { access_token: string; user: { id: string; email: string; role: string; is_guest: boolean; full_name?: string } };
      setAuth(res.user, res.access_token);
      toast.success('Welcome back!');
      router.push(res.user.role === 'admin' ? '/admin' : '/citizen');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.register(formData) as { access_token: string; user: { id: string; email: string; role: string; is_guest: boolean; full_name?: string } };
      setAuth(res.user, res.access_token);
      toast.success('Account created!');
      router.push('/citizen');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
    } finally { setLoading(false); }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      const res = await api.guestLogin() as { access_token: string; user: { id: string; email: string; role: string; is_guest: boolean } };
      setAuth(res.user, res.access_token);
      router.push('/citizen');
    } catch { toast.error('Failed to start guest session'); }
    finally { setLoading(false); }
  };

  const features = [
    { icon: '🔍', name: 'Scheme Discovery', desc: 'AI finds central & state schemes tailored to your profile from official sources' },
    { icon: '✅', name: 'Eligibility Check', desc: 'Instant preliminary eligibility assessment based on official government criteria' },
    { icon: '📄', name: 'Document Help', desc: 'Personalized checklists and guided document uploads for each application' },
    { icon: '📝', name: 'Application Guide', desc: 'Step-by-step guidance through official government portals' },
    { icon: '🔒', name: 'Info Verification', desc: 'Cross-checks every scheme with authoritative government sources' },
    { icon: '📊', name: 'Track Applications', desc: 'Monitor progress, get deadline reminders, and status updates' },
    { icon: '🧠', name: 'AI Orchestrator', desc: 'Central coordinator ensuring accurate, secure multi-agent collaboration' },
  ];

  const steps = [
    { n: '01', title: 'Tell us about yourself', desc: 'Enter basic details — state, age, occupation, income. Takes 60 seconds.' },
    { n: '02', title: 'AI finds your schemes', desc: '7 specialized agents search central & state databases for relevant benefits.' },
    { n: '03', title: 'Check your eligibility', desc: 'Get a clear preliminary eligibility report with explanations.' },
    { n: '04', title: 'Prepare and apply', desc: 'Document checklist, upload assistance, and direct links to official portals.' },
  ];

  return (
    <div style={S.page}>
      {/* ── Hero Section ── */}
      <div style={S.hero}>
        {/* Navbar */}
        <nav style={S.nav}>
          <div style={{ ...S.logoWrap, cursor:'pointer' }} onClick={() => router.push('/')}>
            <span style={S.logoIcon}>🏛️</span>
            <div>
              <div style={S.logoName}>NagrikAI</div>
              <div style={S.logoSub}>Government Services Platform</div>
            </div>
          </div>
          <div style={S.navBtns}>
            <button style={S.btnOutline} onClick={() => setMode('login')}>Sign In</button>
            <button style={S.btnWhite} onClick={() => setMode('register')}>Get Started</button>
          </div>
        </nav>

        {/* Hero Content */}
        <div style={S.heroContent}>
          <div style={S.badge}>✨ Powered by IBM Granite AI (watsonx)</div>
          <h1 style={S.heroTitle}>
            Your Intelligent Guide to<br />
            <span style={S.heroSpan}>Government Services</span>
          </h1>
          <p style={S.heroSub}>
            Discover schemes, check eligibility, prepare documents, and track applications — 
            all powered by 7 specialized AI agents. Available in English, हिंदी, and ಕನ್ನಡ.
          </p>
          <div style={S.heroBtns}>
            <button style={S.btnPrimary} onClick={() => setMode('register')}>
              Start Free →
            </button>
            <button style={S.btnGhost} onClick={handleGuest} disabled={loading}>
              {loading ? 'Starting...' : 'Try as Guest'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={S.statsBar}>
          {[
            ['7', 'AI Agents'],
            ['100+', 'Schemes Covered'],
            ['3', 'Languages'],
            ['100%', 'Free to Use'],
          ].map(([n, l]) => (
            <div key={l} style={S.stat}>
              <span style={S.statNum}>{n}</span>
              <span style={S.statLabel}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features Grid ── */}
      <div style={S.features}>
        <div style={S.featuresInner}>
          <h2 style={S.featuresTitle}>7 Specialized AI Agents Working Together</h2>
          <p style={S.featuresSub}>Each agent is an expert in its domain, coordinated by a central orchestrator</p>
          <div style={S.featuresGrid}>
            {features.map((f) => (
              <div key={f.name} style={S.featureCard}>
                <div style={S.featureIconWrap}>{f.icon}</div>
                <div style={S.featureName}>{f.name}</div>
                <div style={S.featureDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div style={S.howWorks}>
        <div style={S.howInner}>
          <h2 style={{ ...S.featuresTitle, marginBottom: '10px' }}>How It Works</h2>
          <p style={{ ...S.featuresSub, marginBottom: '48px' }}>From your first question to a submitted application in minutes</p>
          <div style={S.steps}>
            {steps.map((s, i) => (
              <div key={s.n} style={{ ...S.step, paddingBottom: i < steps.length - 1 ? '32px' : '0' }}>
                <div style={S.stepNum}>{s.n}</div>
                <div>
                  <div style={S.stepTitle}>{s.title}</div>
                  <div style={S.stepDesc}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Admin Section ── */}
      <div style={S.adminSect}>
        <div style={S.adminInner}>
          <h2 style={S.adminTitle}>🔧 Administrator Dashboard</h2>
          <p style={S.adminDesc}>
            Full AI performance monitoring — agent metrics, guardrail events, LLM evaluation, 
            cost analytics, execution traces, and human approval workflows.
          </p>
          <div style={S.adminBadges}>
            {['LLM Evaluation', 'Guardrail Monitor', 'Cost Analytics', 'Execution Traces', 'Human Approvals'].map(b => (
              <span key={b} style={S.adminBadge}>{b}</span>
            ))}
          </div>
          <button style={S.adminBtn} onClick={() => setMode('login')}>
            Admin Login →
          </button>
          <div style={{ marginTop: '12px', color: '#64748b', fontSize: '13px' }}>
            admin@nagrikAI.gov.in / Admin@NagrikAI2024
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={S.footer}>
        <p style={S.footerText}>
          © 2024 NagrikAI · Powered by IBM Granite AI (watsonx) · For demonstration purposes ·
          Always verify with official government sources at{' '}
          <a href="https://myscheme.gov.in" target="_blank" rel="noreferrer" style={{ color: '#3b82f6' }}>myscheme.gov.in</a>
        </p>
      </footer>

      {/* ── Auth Modal ── */}
      {mode !== 'home' && (
        <div style={S.overlay} onClick={(e) => e.target === e.currentTarget && setMode('home')}>
          <div style={{ ...S.modal, position: 'relative' }}>
            <button style={S.modalClose} onClick={() => setMode('home')}>✕</button>

            {mode === 'login' ? (
              <>
                <div style={S.modalTitle}>Welcome back</div>
                <div style={S.modalSub}>Sign in to your NagrikAI account</div>
                <form onSubmit={handleLogin}>
                  <div style={S.formField}>
                    <label style={S.label}>Email address</label>
                    <input type="email" required placeholder="you@example.com" style={S.inputStyle}
                      value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Password</label>
                    <input type="password" required placeholder="••••••••" style={S.inputStyle}
                      value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <button type="submit" disabled={loading} style={S.submitBtn}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </button>
                </form>
                <div style={S.divider}>
                  <div style={S.dividerLine} />
                  <span style={S.dividerText}>or</span>
                  <div style={S.dividerLine} />
                </div>
                <button onClick={handleGuest} disabled={loading} style={S.guestBtn}>
                  Continue as Guest
                </button>
                <div style={S.modalSwitch}>
                  Don&apos;t have an account?{' '}
                  <span style={S.switchLink} onClick={() => setMode('register')}>Create one</span>
                </div>
              </>
            ) : (
              <>
                <div style={S.modalTitle}>Create your account</div>
                <div style={S.modalSub}>Join NagrikAI to access all government services</div>
                <form onSubmit={handleRegister}>
                  <div style={S.formField}>
                    <label style={S.label}>Full Name</label>
                    <input type="text" placeholder="Your full name" style={S.inputStyle}
                      value={formData.full_name} onChange={e => setFormData(p => ({ ...p, full_name: e.target.value }))} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Email address</label>
                    <input type="email" required placeholder="you@example.com" style={S.inputStyle}
                      value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
                  </div>
                  <div style={S.formField}>
                    <label style={S.label}>Password</label>
                    <input type="password" required placeholder="Minimum 6 characters" style={S.inputStyle}
                      value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} />
                  </div>
                  <button type="submit" disabled={loading} style={S.submitBtn}>
                    {loading ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
                <div style={S.divider}>
                  <div style={S.dividerLine} />
                  <span style={S.dividerText}>or</span>
                  <div style={S.dividerLine} />
                </div>
                <button onClick={handleGuest} disabled={loading} style={S.guestBtn}>
                  Continue as Guest
                </button>
                <div style={S.modalSwitch}>
                  Already have an account?{' '}
                  <span style={S.switchLink} onClick={() => setMode('login')}>Sign in</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
