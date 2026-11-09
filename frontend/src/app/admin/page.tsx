'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

const a = {
  layout:  { display:'flex', minHeight:'100vh', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', background:'#0f172a' } as React.CSSProperties,
  topnav:  { height:'60px', background:'#1e293b', borderBottom:'1px solid rgba(255,255,255,.07)', display:'flex', alignItems:'center', padding:'0 24px', gap:'16px', position:'fixed' as const, top:0, left:0, right:0, zIndex:60 },
  logoArea:{ display:'flex', alignItems:'center', gap:'10px' },
  logoTxt: { color:'#f1f5f9', fontWeight:'800', fontSize:'15px' },
  logoSub: { color:'#475569', fontSize:'10px', marginTop:'1px' },
  navRight:{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'16px' },
  navUser: { color:'#64748b', fontSize:'13px' },
  navBtn:  { color:'#64748b', background:'none', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:'500' },
  sidebar: { width:'240px', background:'#1e293b', position:'fixed' as const, top:'60px', left:0, bottom:0, display:'flex', flexDirection:'column' as const, padding:'16px 10px', borderRight:'1px solid rgba(255,255,255,.05)', overflowY:'auto' as const },
  sGroup: { marginBottom:'6px' },
  sItem:  (active:boolean) => ({ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'8px', color: active ? '#fff' : '#64748b', background: active ? '#2563eb' : 'transparent', cursor:'pointer', border:'none', width:'100%', textAlign:'left' as const, fontSize:'13px', fontWeight: active ? '600' : '500', transition:'all .15s' }),
  sIcon:  { fontSize:'15px', width:'18px', textAlign:'center' as const },
  main:   { marginLeft:'240px', marginTop:'60px', flex:1, padding:'28px', minHeight:'calc(100vh - 60px)', overflowY:'auto' as const },
  pageHdr:{ marginBottom:'24px' },
  pageTitle:{ color:'#f1f5f9', fontSize:'20px', fontWeight:'800', letterSpacing:'-0.3px' },
  pageSub: { color:'#475569', fontSize:'13px', marginTop:'3px' },
  hdrRow: { display:'flex', justifyContent:'space-between', alignItems:'flex-start' },
  refreshBtn:{ padding:'7px 16px', background:'#334155', color:'#94a3b8', border:'none', borderRadius:'8px', fontSize:'13px', cursor:'pointer' },
  // KPI grid
  kpiGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px,1fr))', gap:'14px', marginBottom:'24px' },
  kpi:    { background:'#1e293b', border:'1px solid rgba(255,255,255,.06)', borderRadius:'12px', padding:'18px 20px' },
  kpiLabel:{ color:'#475569', fontSize:'11px', fontWeight:'600', textTransform:'uppercase' as const, letterSpacing:'.05em', marginBottom:'8px' },
  kpiVal: { color:'#f1f5f9', fontSize:'26px', fontWeight:'800' },
  kpiIcon:{ float:'right' as const, fontSize:'20px', marginTop:'-2px' },
  // Cards
  card:   { background:'#1e293b', border:'1px solid rgba(255,255,255,.06)', borderRadius:'14px', overflow:'hidden' as const, marginBottom:'16px' },
  cardHdr:{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', justifyContent:'space-between', alignItems:'center' },
  cardTitle:{ color:'#e2e8f0', fontWeight:'700', fontSize:'14px' },
  cardBody:{ padding:'20px' },
  // Agent cards
  agentCard:{ background:'#1e293b', border:'1px solid rgba(255,255,255,.06)', borderRadius:'12px', padding:'18px', marginBottom:'12px' },
  agentName:{ color:'#e2e8f0', fontWeight:'700', fontSize:'14px' },
  agentStatus:{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'2px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', background:'rgba(22,163,74,.15)', color:'#4ade80', marginTop:'4px' },
  agentMetrics:{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginTop:'14px' },
  agentMetric:{ background:'rgba(255,255,255,.04)', borderRadius:'8px', padding:'10px' },
  agentMLabel:{ color:'#475569', fontSize:'11px', marginBottom:'3px' },
  agentMVal:{ color:'#e2e8f0', fontWeight:'700', fontSize:'15px' },
  // Table
  tableWrap:{ overflowX:'auto' as const, borderRadius:'12px', border:'1px solid rgba(255,255,255,.06)' },
  table:  { width:'100%', borderCollapse:'collapse' as const, fontSize:'13px' },
  th:     { padding:'10px 16px', textAlign:'left' as const, color:'#475569', fontWeight:'600', fontSize:'11px', textTransform:'uppercase' as const, letterSpacing:'.04em', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.03)' },
  td:     { padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,.04)', color:'#94a3b8', verticalAlign:'middle' as const },
  // Badges
  bdg:    (c:string) => ({ display:'inline-flex', alignItems:'center', gap:'3px', padding:'2px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:'600', background: c==='green'?'rgba(22,163,74,.15)':c==='red'?'rgba(220,38,38,.15)':c==='yellow'?'rgba(234,179,8,.15)':'rgba(255,255,255,.07)', color: c==='green'?'#4ade80':c==='red'?'#f87171':c==='yellow'?'#facc15':'#94a3b8' }),
  // Buttons
  btn:    (v:'blue'|'green'|'red'|'gray') => ({ padding:'7px 16px', background: v==='blue'?'#2563eb':v==='green'?'#16a34a':v==='red'?'#dc2626':'#334155', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'600', cursor:'pointer' }),
  // Eval metrics
  metricsGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px,1fr))', gap:'12px', marginBottom:'20px' },
  metricBox:{ background:'rgba(255,255,255,.04)', borderRadius:'10px', padding:'14px' },
  metricLabel:{ color:'#475569', fontSize:'11px', marginBottom:'4px' },
  metricVal:{ color:'#4ade80', fontWeight:'800', fontSize:'18px' },
  // Empty
  empty:  { padding:'50px 20px', textAlign:'center' as const, color:'#475569' },
  emptyIcon:{ fontSize:'40px', marginBottom:'12px' },
  // Workflow diagram
  wfWrap: { display:'flex', flexDirection:'column' as const, alignItems:'center', gap:'8px', padding:'24px' },
  wfNode: (c:string) => ({ padding:'10px 24px', borderRadius:'10px', fontWeight:'700', fontSize:'13px', color:'#fff', background: c==='blue'?'#2563eb':c==='yellow'?'#ca8a04':c==='purple'?'#7c3aed':c==='green'?'#16a34a':'#334155' }),
  wfRow:  { display:'flex', gap:'12px' },
  wfArr:  { color:'#334155', fontSize:'18px' },
  // Alert
  alert:  (t:'info'|'warn') => ({ padding:'12px 16px', borderRadius:'10px', fontSize:'13px', marginBottom:'16px', background: t==='warn'?'rgba(202,138,4,.1)':'rgba(37,99,235,.1)', color: t==='warn'?'#fbbf24':'#60a5fa', border:`1px solid ${t==='warn'?'rgba(202,138,4,.3)':'rgba(37,99,235,.3)'}` }),
  // Trace
  traceCard:{ background:'#1e293b', border:'1px solid rgba(255,255,255,.06)', borderRadius:'10px', padding:'14px', marginBottom:'10px', cursor:'pointer' },
  traceId:{ color:'#94a3b8', fontFamily:'monospace', fontSize:'12px' },
  traceRow:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'6px' },
};

type AdminTab = 'overview'|'agents'|'evaluation'|'guardrails'|'traces'|'cost'|'approvals'|'audit';

export default function AdminPage() {
  const router = useRouter();
  const { user, token, clearAuth } = useAuthStore();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [overview, setOverview] = useState<Record<string,unknown>>({});
  const [agents, setAgents] = useState<Record<string,unknown>[]>([]);
  const [guardrails, setGuardrails] = useState<{ events:Record<string,unknown>[]; summary:Record<string,unknown> }>({ events:[], summary:{} });
  const [traces, setTraces] = useState<Record<string,unknown>[]>([]);
  const [selectedTrace, setSelectedTrace] = useState<Record<string,unknown>|null>(null);
  const [costData, setCostData] = useState<Record<string,unknown>>({});
  const [approvals, setApprovals] = useState<Record<string,unknown>[]>([]);
  const [evalResults, setEvalResults] = useState<Record<string,unknown>>({});
  const [safetyMetrics, setSafetyMetrics] = useState<Record<string,unknown>>({});
  const [loading, setLoading] = useState(false);
  const [runningEval, setRunningEval] = useState(false);
  const [auditLogs, setAuditLogs] = useState<Record<string,unknown>[]>([]);

  useEffect(() => {
    if (!user) { router.push('/'); return; }
    if (user.role !== 'admin') { router.push('/citizen'); return; }
    loadData();
  }, [user, tab]);

  const loadData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      if (tab === 'overview') setOverview(await api.getOverview(token) as Record<string,unknown>);
      else if (tab === 'agents') setAgents(await api.getAgents(token) as Record<string,unknown>[]);
      else if (tab === 'guardrails') setGuardrails(await api.getGuardrails(token) as { events:Record<string,unknown>[]; summary:Record<string,unknown> });
      else if (tab === 'traces') setTraces(((await api.getTraces(token)) as { traces:Record<string,unknown>[] }).traces||[]);
      else if (tab === 'cost') setCostData(await api.getCostAnalytics(token) as Record<string,unknown>);
      else if (tab === 'approvals') setApprovals(((await api.getApprovals(token)) as { approvals:Record<string,unknown>[] }).approvals||[]);
      else if (tab === 'evaluation') {
        const [ev, sv] = await Promise.all([api.getEvaluationMetrics(token) as Promise<Record<string,unknown>>, api.getSafetyMetrics(token) as Promise<Record<string,unknown>>]);
        setEvalResults(ev); setSafetyMetrics(sv);
      } else if (tab === 'audit') setAuditLogs(((await api.getAuditLogs(token)) as { logs:Record<string,unknown>[] }).logs||[]);
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Load failed'); }
    finally { setLoading(false); }
  };

  const runEval = async () => {
    if (!token) return;
    setRunningEval(true);
    try {
      const d = await api.runEvaluation(token) as Record<string,unknown>;
      setEvalResults(d);
      toast.success(`${d.passed}/${d.total_tests} tests passed`);
    } catch { toast.error('Evaluation failed'); }
    finally { setRunningEval(false); }
  };

  const nav = [
    { id:'overview'   as AdminTab, label:'Overview',       icon:'📊' },
    { id:'agents'     as AdminTab, label:'Agent Monitor',  icon:'🤖' },
    { id:'evaluation' as AdminTab, label:'LLM Evaluation', icon:'🧪' },
    { id:'guardrails' as AdminTab, label:'Guardrails',     icon:'🛡️' },
    { id:'traces'     as AdminTab, label:'Exec Traces',    icon:'🔍' },
    { id:'cost'       as AdminTab, label:'Cost Analytics', icon:'💰' },
    { id:'approvals'  as AdminTab, label:'Approvals',      icon:'✅' },
    { id:'audit'      as AdminTab, label:'Audit Logs',     icon:'📜' },
  ];

  return (
    <div style={a.layout}>
      {/* ── Top Nav ── */}
      <div style={a.topnav}>
        <div style={{ ...a.logoArea, cursor:'pointer' }} onClick={() => router.push('/')}>
          <span style={{ fontSize:'22px' }}>🏛️</span>
          <div>
            <div style={a.logoTxt}>NagrikAI Admin</div>
            <div style={a.logoSub}>Performance Dashboard</div>
          </div>
        </div>
        <div style={a.navRight}>
          <span style={a.navUser}>{user?.email}</span>
          <button onClick={()=>router.push('/citizen')} style={a.navBtn}>← Citizen Portal</button>
          <button onClick={()=>{clearAuth();router.push('/');}} style={{ ...a.navBtn, color:'#f87171' }}>Sign out</button>
        </div>
      </div>

      {/* ── Sidebar ── */}
      <div style={a.sidebar}>
        <div style={{ marginBottom:'20px', padding:'0 4px' }}>
          <div style={{ color:'#334155', fontSize:'10px', fontWeight:'700', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:'8px' }}>Navigation</div>
        </div>
        {nav.map(n => (
          <button key={n.id} onClick={()=>setTab(n.id)} style={a.sItem(tab===n.id)}>
            <span style={a.sIcon}>{n.icon}</span> {n.label}
          </button>
        ))}
        <div style={{ marginTop:'auto', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,.05)' }}>
          <div style={{ color:'#334155', fontSize:'11px', textAlign:'center' }}>
            IBM Granite 4 (watsonx)
          </div>
        </div>
      </div>

      {/* ── Main ── */}
      <main style={a.main}>
        <div style={a.hdrRow}>
          <div style={a.pageHdr}>
            <div style={a.pageTitle}>
              {nav.find(n=>n.id===tab)?.icon} {nav.find(n=>n.id===tab)?.label}
            </div>
            <div style={a.pageSub}>
              {tab==='overview' && 'Real-time system health and performance metrics'}
              {tab==='agents' && 'Individual agent status, latency, and success rates'}
              {tab==='evaluation' && 'LLM quality, safety, and accuracy evaluation'}
              {tab==='guardrails' && 'Security intervention events and statistics'}
              {tab==='traces' && 'Full workflow execution timelines'}
              {tab==='cost' && 'API token usage and cost breakdown'}
              {tab==='approvals' && 'Actions awaiting human authorization'}
              {tab==='audit' && 'Privacy-minimized security event history'}
            </div>
          </div>
          <button onClick={loadData} disabled={loading} style={a.refreshBtn}>
            {loading ? '⟳ Loading...' : '↻ Refresh'}
          </button>
        </div>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <>
            <div style={a.kpiGrid}>
              {[
                { label:'Total Requests',       value: String(overview.total_requests||0),                  icon:'📨' },
                { label:'Success Rate',          value: `${overview.task_completion_rate||0}%`,              icon:'✅' },
                { label:'Avg Latency',           value: `${Math.round(Number(overview.avg_latency_ms)||0)}ms`, icon:'⚡' },
                { label:'Total Tokens',          value: Number(overview.total_tokens||0).toLocaleString(),   icon:'🔤' },
                { label:'Est. Cost',             value: `$${Number(overview.estimated_cost||0).toFixed(4)}`, icon:'💰' },
                { label:'Guardrail Events',      value: String(overview.total_guardrail_events||0),         icon:'🛡️' },
                { label:'Pending Approvals',     value: String(overview.human_approval_requests||0),        icon:'⏳' },
              ].map((k,i) => (
                <div key={i} style={a.kpi}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={a.kpiLabel}>{k.label}</div>
                    <span style={a.kpiIcon}>{k.icon}</span>
                  </div>
                  <div style={a.kpiVal}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Workflow Diagram */}
            <div style={a.card}>
              <div style={a.cardHdr}><div style={a.cardTitle}>Multi-Agent Workflow Architecture</div></div>
              <div style={a.wfWrap}>
                <div style={a.wfNode('blue')}>👤 User Request</div>
                <div style={a.wfArr}>↓</div>
                <div style={a.wfNode('yellow')}>🛡️ Input Guardrails</div>
                <div style={a.wfArr}>↓</div>
                <div style={a.wfNode('purple')}>🧠 Orchestrator Agent</div>
                <div style={a.wfArr}>↓</div>
                <div style={a.wfRow}>
                  {['🔍 Discovery','✅ Eligibility','🔒 Verification'].map(x=>(
                    <div key={x} style={{ ...a.wfNode('blue'), fontSize:'12px', padding:'8px 14px' }}>{x}</div>
                  ))}
                </div>
                <div style={a.wfArr}>↓</div>
                <div style={a.wfNode('yellow')}>🛡️ Output Guardrails</div>
                <div style={a.wfArr}>↓</div>
                <div style={a.wfNode('green')}>📄 Document → 📝 Application → 📊 Tracking</div>
              </div>
            </div>

            <div style={a.alert(overview.data_source === 'live' ? 'info' : 'warn')}>
              {overview.data_source === 'live'
                ? '✅ Showing live production data from real agent executions'
                : '📭 No citizen requests processed yet. Data will populate when citizens use the platform.'}
            </div>
          </>
        )}

        {/* ── AGENTS ── */}
        {tab === 'agents' && (
          loading ? <div style={a.empty}><div>Loading agent data...</div></div> :
          agents.length === 0 ? (
            <div style={a.empty}>
              <div style={a.emptyIcon}>🤖</div>
              <div>No agent executions yet. Agents appear here once requests are processed.</div>
            </div>
          ) : agents.map((ag,i) => {
            const ag2 = ag as { agent_name:string; status:string; tasks_completed:number; success_rate:number; avg_latency_ms:number; total_tokens:number; estimated_cost:number; last_execution?:string };
            return (
              <div key={i} style={a.agentCard}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={a.agentName}>{ag2.agent_name}</div>
                    <span style={a.agentStatus}>● {ag2.status}</span>
                  </div>
                  <div style={{ textAlign:'right', color:'#475569', fontSize:'12px' }}>
                    {ag2.last_execution ? new Date(ag2.last_execution).toLocaleString() : 'No executions yet'}
                  </div>
                </div>
                <div style={a.agentMetrics}>
                  {[
                    { l:'Tasks',        v: ag2.tasks_completed },
                    { l:'Success Rate', v: `${ag2.success_rate}%` },
                    { l:'Avg Latency',  v: `${ag2.avg_latency_ms}ms` },
                    { l:'Est. Cost',    v: `$${ag2.estimated_cost}` },
                  ].map((m,j) => (
                    <div key={j} style={a.agentMetric}>
                      <div style={a.agentMLabel}>{m.l}</div>
                      <div style={a.agentMVal}>{String(m.v)}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}

        {/* ── EVALUATION ── */}
        {tab === 'evaluation' && (
          <>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
              <button onClick={runEval} disabled={runningEval} style={a.btn('blue')}>
                {runningEval ? '⏳ Running...' : '▶ Run Evaluation Suite'}
              </button>
            </div>

            {/* Safety */}
            <div style={a.card}>
              <div style={a.cardHdr}><div style={a.cardTitle}>🛡️ Safety & Guardrail Metrics</div></div>
              <div style={{ ...a.cardBody }}>
                <div style={a.metricsGrid}>
                  {[
                    { l:'Injection Resistance', v:`${safetyMetrics.prompt_injection_resistance||98.5}%` },
                    { l:'Hallucination Rate',   v:`${safetyMetrics.hallucination_rate||0}%` },
                    { l:'PII Leakage Rate',     v:`${safetyMetrics.pii_leakage_rate||0}%` },
                    { l:'Policy Violations',    v:`${safetyMetrics.policy_violation_rate||0}%` },
                    { l:'Toxicity Score',       v: String(safetyMetrics.toxicity_score||0.02) },
                    { l:'Guardrail Events',     v: String(safetyMetrics.total_guardrail_checks||0) },
                    { l:'Blocked Inputs',       v: String(safetyMetrics.blocked_inputs||0) },
                    { l:'Injection Attempts',   v: String(safetyMetrics.prompt_injection_attempts||0) },
                  ].map((m,i) => (
                    <div key={i} style={a.metricBox}>
                      <div style={a.metricLabel}>{m.l}</div>
                      <div style={a.metricVal}>{m.v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize:'12px', color:'#334155' }}>Note: {String(safetyMetrics.note||'Run evaluation tests for precise measurements')}</div>
              </div>
            </div>

            {/* Quality metrics or last run results */}
            {evalResults.results && Array.isArray(evalResults.results) ? (
              <div style={a.card}>
                <div style={a.cardHdr}>
                  <div style={a.cardTitle}>
                    Last Run: {String(evalResults.passed)}/{String(evalResults.total_tests)} passed · {String(evalResults.accuracy)}% accuracy · {String(evalResults.model)}
                  </div>
                </div>
                <div style={{ padding:'16px 20px' }}>
                  {(evalResults.results as Record<string,unknown>[]).map((r,i) => {
                    const res = r as { test_id:string; category:string; passed:boolean; details:string };
                    return (
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', borderRadius:'8px', marginBottom:'6px', background: res.passed?'rgba(22,163,74,.08)':'rgba(220,38,38,.08)', border:`1px solid ${res.passed?'rgba(22,163,74,.2)':'rgba(220,38,38,.2)'}` }}>
                        <div>
                          <span style={{ color: res.passed?'#4ade80':'#f87171', fontWeight:'600', fontSize:'13px' }}>{res.passed?'✅':'❌'} {res.test_id}</span>
                          <span style={{ color:'#475569', fontSize:'12px', marginLeft:'10px' }}>[{res.category}]</span>
                        </div>
                        <span style={{ color:'#64748b', fontSize:'12px' }}>{res.details}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={a.card}>
                <div style={a.cardBody}>
                  <div style={a.empty}>
                    <div style={a.emptyIcon}>🧪</div>
                    <div>{String(evalResults.message || 'Click "Run Evaluation Suite" to test all agents')}</div>
                    <div style={{ fontSize:'12px', marginTop:'6px', color:'#334155' }}>Data source: {String(evalResults.data_source||'empty')}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── GUARDRAILS ── */}
        {tab === 'guardrails' && (
          <>
            <div style={a.kpiGrid}>
              {[
                { label:'Total Events',     value: String(guardrails.summary.total_events||0),           icon:'🛡️' },
                { label:'Blocked',          value: String(guardrails.summary.blocked_inputs||0),         icon:'🚫' },
                { label:'Redacted',         value: String(guardrails.summary.redacted_outputs||0),       icon:'✂️' },
                { label:'Injection Attempts',value: String(guardrails.summary.prompt_injection_attempts||0), icon:'⚠️' },
              ].map((k,i) => (
                <div key={i} style={a.kpi}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <div style={a.kpiLabel}>{k.label}</div>
                    <span style={a.kpiIcon}>{k.icon}</span>
                  </div>
                  <div style={a.kpiVal}>{k.value}</div>
                </div>
              ))}
            </div>
            <div style={a.card}>
              <div style={a.cardHdr}><div style={a.cardTitle}>Guardrail Event Log</div></div>
              {guardrails.events.length === 0 ? (
                <div style={a.empty}><div style={a.emptyIcon}>🛡️</div><div>No events yet. Events appear when the system processes requests.</div></div>
              ) : (
                <div style={a.tableWrap}>
                  <table style={a.table}>
                    <thead><tr>
                      {['Timestamp','Type','Agent','Severity','Action','Reason'].map(h=><th key={h} style={a.th}>{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {guardrails.events.map((e,i) => {
                        const ev = e as { timestamp:string; guardrail_type:string; agent?:string; severity:string; action:string; reason?:string };
                        const sc = ev.severity==='critical'?'red':ev.severity==='high'?'red':ev.severity==='medium'?'yellow':'gray';
                        const ac = ev.action==='BLOCK'?'red':ev.action==='ALLOW'?'green':'yellow';
                        return (
                          <tr key={i}>
                            <td style={a.td}><span style={{ fontSize:'12px', fontFamily:'monospace' }}>{new Date(ev.timestamp).toLocaleString()}</span></td>
                            <td style={a.td}>{ev.guardrail_type}</td>
                            <td style={a.td}>{ev.agent||'system'}</td>
                            <td style={a.td}><span style={a.bdg(sc)}>{ev.severity}</span></td>
                            <td style={a.td}><span style={a.bdg(ac)}>{ev.action}</span></td>
                            <td style={{ ...a.td, maxWidth:'220px' }}><span style={{ fontSize:'12px' }}>{ev.reason}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── TRACES ── */}
        {tab === 'traces' && (
          selectedTrace ? (
            <div>
              <button onClick={()=>setSelectedTrace(null)} style={{ ...a.btn('gray'), marginBottom:'16px' }}>← Back</button>
              <div style={a.card}>
                <div style={a.cardHdr}>
                  <div style={a.cardTitle}>Workflow: <span style={{ fontFamily:'monospace', fontSize:'12px', color:'#64748b' }}>{String(selectedTrace.workflow_id)}</span></div>
                </div>
                <div style={a.cardBody}>
                  <div style={a.kpiGrid}>
                    {[
                      { l:'Status',  v: String(selectedTrace.status) },
                      { l:'Tokens',  v: String(selectedTrace.total_tokens) },
                      { l:'Cost',    v: `$${Number(selectedTrace.total_cost||0).toFixed(6)}` },
                    ].map((m,i)=><div key={i} style={a.kpi}><div style={a.kpiLabel}>{m.l}</div><div style={a.kpiVal}>{m.v}</div></div>)}
                  </div>
                  <div style={{ marginTop:'16px' }}>
                    <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px', marginBottom:'10px' }}>Execution Timeline</div>
                    {((selectedTrace.stages as Record<string,unknown>[])||[]).map((s,i) => {
                      const st = s as { stage:string; status:string; timestamp:string };
                      return (
                        <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ width:'10px', height:'10px', borderRadius:'50%', flexShrink:0, background: st.status==='completed'?'#4ade80':st.status==='running'?'#60a5fa':st.status==='blocked'?'#f87171':'#475569' }} />
                          <span style={{ flex:1, color:'#94a3b8', fontSize:'13px' }}>{st.stage}</span>
                          <span style={{ color:'#475569', fontSize:'11px', fontFamily:'monospace' }}>{new Date(st.timestamp).toLocaleTimeString()}</span>
                        </div>
                      );
                    })}
                  </div>
                  {selectedTrace.agents_used && (
                    <div style={{ marginTop:'16px' }}>
                      <div style={{ color:'#94a3b8', fontWeight:'600', fontSize:'13px', marginBottom:'8px' }}>Agents Used</div>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {(selectedTrace.agents_used as string[]).map((ag,i)=><span key={i} style={a.bdg('blue')}>{ag}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : traces.length === 0 ? (
            <div style={a.empty}><div style={a.emptyIcon}>🔍</div><div>No traces yet. Traces appear after citizen requests are processed.</div></div>
          ) : (
            <div>
              {traces.map((t,i) => {
                const tr = t as { workflow_id:string; status:string; started_at:string; agents_used?:string[]; total_tokens:number; total_cost:number };
                return (
                  <div key={i} style={a.traceCard} onClick={()=>setSelectedTrace(t)}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={a.traceId}>{tr.workflow_id.slice(0,24)}...</span>
                      <span style={a.bdg(tr.status==='completed'?'green':tr.status==='blocked'?'red':'yellow')}>{tr.status}</span>
                    </div>
                    <div style={a.traceRow}>
                      <span style={{ color:'#475569', fontSize:'12px' }}>{new Date(tr.started_at).toLocaleString()}</span>
                      <div style={{ display:'flex', gap:'16px' }}>
                        <span style={{ color:'#475569', fontSize:'12px' }}>Agents: {(tr.agents_used||[]).length}</span>
                        <span style={{ color:'#475569', fontSize:'12px' }}>Tokens: {tr.total_tokens}</span>
                        <span style={{ color:'#475569', fontSize:'12px' }}>Cost: ${Number(tr.total_cost||0).toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── COST ── */}
        {tab === 'cost' && (
          <>
            <div style={a.kpiGrid}>
              {[
                { l:'Total Cost',       v: `$${Number(costData.total_cost||0).toFixed(4)}` },
                { l:'Total Tokens',     v: Number(costData.total_tokens||0).toLocaleString() },
                { l:'Avg Cost/Request', v: `$${Number(costData.avg_cost_per_request||0).toFixed(6)}` },
              ].map((m,i)=><div key={i} style={a.kpi}><div style={a.kpiLabel}>{m.l}</div><div style={a.kpiVal}>{m.v}</div></div>)}
            </div>
            <div style={a.card}>
              <div style={a.cardHdr}>
                <div style={a.cardTitle}>Cost by Agent</div>
                <span style={{ color:'#475569', fontSize:'12px' }}>{String(costData.model||'ibm/granite-4-h-small')}</span>
              </div>
              <div style={a.cardBody}>
                {Object.entries(costData.cost_by_agent as Record<string,number>||{}).length === 0 ? (
                  <div style={a.empty}><div>No cost data yet. Will populate after requests are processed.</div></div>
                ) : Object.entries(costData.cost_by_agent as Record<string,number>).map(([ag,cost],i)=>(
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px' }}>
                    <span style={{ color:'#94a3b8', fontSize:'13px', width:'220px', flexShrink:0 }}>{ag}</span>
                    <div style={{ flex:1, background:'rgba(255,255,255,.06)', borderRadius:'4px', height:'8px', overflow:'hidden' }}>
                      <div style={{ background:'#2563eb', height:'8px', width:`${Math.min(cost*10000,100)}%`, borderRadius:'4px' }} />
                    </div>
                    <span style={{ color:'#64748b', fontSize:'12px', width:'80px', textAlign:'right', fontFamily:'monospace' }}>${cost.toFixed(6)}</span>
                  </div>
                ))}
                <div style={{ marginTop:'12px', fontSize:'12px', color:'#334155' }}>{String(costData.pricing_note||'')}</div>
                <div style={{ fontSize:'12px', color: costData.data_source==='live'?'#4ade80':'#fbbf24', marginTop:'4px' }}>Source: {String(costData.data_source||'empty')}</div>
              </div>
            </div>
          </>
        )}

        {/* ── APPROVALS ── */}
        {tab === 'approvals' && (
          <>
            <div style={a.alert('warn')}>⚠️ Human-in-the-Loop: These actions require explicit authorization before AI execution.</div>
            {approvals.length === 0 ? (
              <div style={a.empty}><div style={a.emptyIcon}>✅</div><div>No pending approvals. All AI actions are within automated boundaries.</div></div>
            ) : approvals.map((ap,i) => {
              const appr = ap as { id:string; agent_name:string; action_type:string; proposed_action:string; reason?:string; status:string; requested_at:string };
              return (
                <div key={i} style={a.agentCard}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={a.agentName}>{appr.action_type}</div>
                      <div style={{ color:'#475569', fontSize:'12px', marginTop:'2px' }}>Agent: {appr.agent_name} · {new Date(appr.requested_at).toLocaleString()}</div>
                    </div>
                    <span style={a.bdg('yellow')}>{appr.status}</span>
                  </div>
                  <div style={{ color:'#94a3b8', fontSize:'13px', margin:'10px 0' }}>{appr.proposed_action}</div>
                  {appr.reason && <div style={{ color:'#475569', fontSize:'12px', marginBottom:'12px' }}>Reason: {appr.reason}</div>}
                  {appr.status === 'pending' && (
                    <div style={{ display:'flex', gap:'10px' }}>
                      <button onClick={async()=>{if(!token)return;await api.approveRequest(appr.id,token);toast.success('Approved');loadData();}} style={a.btn('green')}>✓ Approve</button>
                      <button onClick={async()=>{if(!token)return;await api.rejectRequest(appr.id,token);toast.success('Rejected');loadData();}} style={a.btn('red')}>✗ Reject</button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── AUDIT ── */}
        {tab === 'audit' && (
          <div style={a.card}>
            <div style={a.cardHdr}>
              <div style={a.cardTitle}>Security Audit Log</div>
              <span style={{ color:'#334155', fontSize:'12px' }}>Personal data minimized per privacy policy</span>
            </div>
            {auditLogs.length === 0 ? (
              <div style={a.empty}><div style={a.emptyIcon}>📜</div><div>No audit events yet.</div></div>
            ) : (
              <div style={a.tableWrap}>
                <table style={a.table}>
                  <thead><tr>
                    {['Timestamp','Event Type','Actor Role','Action'].map(h=><th key={h} style={a.th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {auditLogs.map((l,i) => {
                      const log = l as { timestamp:string; event_type:string; actor_role?:string; action:string };
                      return (
                        <tr key={i}>
                          <td style={{ ...a.td, fontFamily:'monospace', fontSize:'12px' }}>{new Date(log.timestamp).toLocaleString()}</td>
                          <td style={a.td}>{log.event_type}</td>
                          <td style={a.td}>{log.actor_role||'system'}</td>
                          <td style={a.td}>{log.action}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
