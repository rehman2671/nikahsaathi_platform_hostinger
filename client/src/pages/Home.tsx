import { useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Command,
  Globe2,
  HeartHandshake,
  KeyRound,
  Layers3,
  LockKeyhole,
  Menu,
  MessageSquareWarning,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";

const navItems = [
  { label: "Overview", icon: Activity },
  { label: "Safety rules", icon: ShieldCheck },
  { label: "Communities", icon: Globe2 },
  { label: "Review queues", icon: MessageSquareWarning },
  { label: "Entitlements", icon: Layers3 },
];

const ruleTypeLabels: Record<string, string> = {
  bad_word: "Bad words",
  phone_number: "Phone numbers",
  link_domain: "Links & domains",
  spam: "Spam",
  personal_data: "Personal data",
  threat: "Threats",
  scam: "Scams",
};

function MetricCard({ label, value, caption, icon: Icon, tone }: { label: string; value: number | string; caption: string; icon: typeof Activity; tone: string }) {
  return (
    <Card className="metric-card">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{label}</p>
            <p className="metric-value mt-3">{value}</p>
            <p className="metric-caption mt-2">{caption}</p>
          </div>
          <span className={`metric-icon ${tone}`}><Icon size={18} strokeWidth={2.2} /></span>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Sparkles size={18} /></div>
      <div>
        <p className="font-semibold text-slate-800">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action && <Button variant="outline" size="sm" className="ml-auto">{action}</Button>}
    </div>
  );
}

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [active, setActive] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ruleSearch, setRuleSearch] = useState("");
  const [testText, setTestText] = useState("");
  const [testSurface, setTestSurface] = useState<"posts" | "comments" | "messages" | "profiles">("messages");
  const [testRun, setTestRun] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<"all" | "moderation" | "verification" | "support" | "incident" | "agent_review">("all");
  const isAdmin = Boolean(isAuthenticated && user?.role === "admin");
  const queryOptions = { enabled: isAdmin };
  const overview = trpc.operations.overview.useQuery(undefined, queryOptions);
  const rules = trpc.operations.safetyRules.useQuery(undefined, queryOptions);
  const blockedDomains = trpc.operations.blockedDomains.useQuery(undefined, queryOptions);
  const safetyTest = trpc.operations.testSafetyRule.useQuery({ text: testText, surface: testSurface }, { enabled: isAdmin && testRun && testText.trim().length > 0 });
  const communities = trpc.operations.communities.useQuery(undefined, queryOptions);
  const cases = trpc.operations.reviewCases.useQuery(undefined, queryOptions);
  const moderationQueue = trpc.operations.moderationQueue.useQuery(undefined, queryOptions);
  const verificationQueue = trpc.operations.verificationQueue.useQuery(undefined, queryOptions);
  const supportQueue = trpc.operations.supportQueue.useQuery(undefined, queryOptions);
  const incidentQueue = trpc.operations.incidentQueue.useQuery(undefined, queryOptions);
  const agentReviewQueue = trpc.operations.agentReviewQueue.useQuery(undefined, queryOptions);
  const plans = trpc.operations.subscriptionPlans.useQuery(undefined, queryOptions);
  const fieldPolicies = trpc.operations.profileFieldPolicies.useQuery(undefined, queryOptions);
  const auditLogs = trpc.operations.auditLogs.useQuery(undefined, queryOptions);

  const visibleRules = useMemo(() => {
    const needle = ruleSearch.trim().toLowerCase();
    return (rules.data ?? []).filter(rule => !needle || `${rule.name} ${ruleTypeLabels[rule.ruleType] ?? rule.ruleType}`.toLowerCase().includes(needle));
  }, [rules.data, ruleSearch]);

  const metrics = overview.data ?? { openCases: 0, activeRules: 0, activeCommunities: 0, comingSoonCommunities: 0 };
  const queryError = [overview.error, rules.error, blockedDomains.error, communities.error, cases.error, plans.error, fieldPolicies.error, auditLogs.error].find(Boolean);
  const queueData = reviewQueue === "moderation" ? moderationQueue.data : reviewQueue === "verification" ? verificationQueue.data : reviewQueue === "support" ? supportQueue.data : reviewQueue === "incident" ? incidentQueue.data : reviewQueue === "agent_review" ? agentReviewQueue.data : cases.data;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="hero-panel">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-cyan-100"><span className="status-dot" /> Operations control room</div>
          <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.04em] text-white md:text-4xl">Make every connection feel considered.</h2>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">A single, privacy-first command center for the people, policies and communities that shape NikahSaathi.</p>
        </div>
        <div className="hero-mark"><ShieldCheck size={42} strokeWidth={1.5} /><span>NS</span></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open review cases" value={metrics.openCases} caption="Requires human attention" icon={MessageSquareWarning} tone="tone-rose" />
        <MetricCard label="Active safety rules" value={metrics.activeRules} caption="Across every content surface" icon={ShieldCheck} tone="tone-cyan" />
        <MetricCard label="Live communities" value={metrics.activeCommunities} caption="Platform-managed spaces" icon={UsersRound} tone="tone-violet" />
        <MetricCard label="Coming soon" value={metrics.comingSoonCommunities} caption="Staged for activation" icon={Globe2} tone="tone-amber" />
      </div>
      <Card className="panel-card">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3"><div><p className="eyebrow">Plan visibility</p><CardTitle className="mt-1 text-lg">Field access at a glance</CardTitle></div><Badge className="soft-badge">Server enforced</Badge></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">{["free", "basic", "advanced"].map(code => { const plan = plans.data?.find(item => item.code === code); const accessible = fieldPolicies.data?.filter(policy => code === "free" ? policy.freeAccess : code === "basic" ? policy.basicAccess : policy.advancedAccess).length ?? 0; return <div key={code} className="rounded-xl border border-slate-100 bg-slate-50/70 p-4"><div className="flex items-center justify-between"><p className="font-semibold capitalize text-slate-800">{plan?.name ?? (code === "free" ? "Free" : code === "basic" ? "Basic Paid" : "Advanced Paid")}</p><span className="text-xs font-semibold text-emerald-600">{isAdmin ? `${accessible} fields` : "Protected"}</span></div><p className="mt-2 text-xs leading-5 text-slate-500">{plan?.description ?? "Access appears only after server policy evaluation."}</p></div>; })}</CardContent>
      </Card>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <Card className="panel-card">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4"><div><p className="eyebrow">Operating principles</p><CardTitle className="mt-1 text-lg">Quietly strong by design</CardTitle></div><Badge className="soft-badge">Foundation v1</Badge></CardHeader>
          <CardContent className="space-y-4">
            {[{ icon: LockKeyhole, title: "Privacy before exposure", text: "Server-side projections keep sensitive profile fields out of unauthorized clients." }, { icon: HeartHandshake, title: "Humans retain authority", text: "Uncertain, high-risk and appealed cases always have a human fallback." }, { icon: SlidersHorizontal, title: "Policies, not releases", text: "Rules and entitlements can be tested, versioned and rolled back from operations." }].map(({ icon: Icon, title, text }) => <div key={title} className="principle-row"><span className="principle-icon"><Icon size={17} /></span><div><p className="font-semibold text-slate-800">{title}</p><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div></div>)}
          </CardContent>
        </Card>
        <Card className="panel-card">
          <CardHeader className="space-y-1 pb-4"><p className="eyebrow">Readiness</p><CardTitle className="text-lg">Foundation checklist</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {["Core data model", "Admin authorization", "Field-level entitlements", "Human-review fallback"].map((item, index) => <div className="flex items-center gap-3" key={item}><CheckCircle2 size={17} className={index < 2 ? "text-emerald-500" : "text-slate-300"} /><span className="text-sm text-slate-600">{item}</span><span className="ml-auto text-xs font-medium text-slate-400">{index < 2 ? "Ready" : "Next"}</span></div>)}
            <Separator className="my-4" /><Button variant="outline" className="w-full justify-between">View implementation plan <ArrowUpRight size={15} /></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-5">
      <div className="section-heading"><div><p className="eyebrow">Policy control</p><h2 className="section-title">Safety rules</h2><p className="section-description">Manage content rules across posts, comments, messages and profiles.</p></div><Button className="primary-button"><Plus size={16} /> New rule</Button></div>
      <Card className="panel-card"><CardHeader className="border-b border-slate-100 pb-4"><div className="flex items-center justify-between"><div><CardTitle className="text-base">Test Lab</CardTitle><p className="mt-1 text-xs text-slate-500">Preview a rule decision before activation. Results are server-evaluated.</p></div><Badge className="soft-badge">{blockedDomains.data?.length ?? 0} blocked domains</Badge></div><div className="mt-4 flex flex-col gap-2 md:flex-row"><Input value={testText} onChange={event => { setTestText(event.target.value); setTestRun(false); }} placeholder="Paste a sample message, post or profile text" /><select value={testSurface} onChange={event => setTestSurface(event.target.value as typeof testSurface)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-600"><option value="messages">Messages</option><option value="posts">Posts</option><option value="comments">Comments</option><option value="profiles">Profiles</option></select><Button variant="outline" onClick={() => setTestRun(true)} disabled={!testText.trim()}>Run test</Button></div>{testRun && safetyTest.data && <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${safetyTest.data.length ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>{safetyTest.data.length ? `${safetyTest.data.length} rule match${safetyTest.data.length > 1 ? "es" : ""} found — review before publishing.` : "No active rule matched this sample."}</div>}</CardHeader><CardContent className="p-0"><div className="toolbar"><div className="search-wrap"><Search size={16} /><Input value={ruleSearch} onChange={event => setRuleSearch(event.target.value)} placeholder="Search rules or categories" /></div><Button variant="outline" size="sm"><SlidersHorizontal size={15} /> Filters</Button></div>{visibleRules.length === 0 ? <EmptyState title={isAdmin ? "No rules configured yet" : "Connect an admin workspace"} description={isAdmin ? "Create your first rule and test it before activation. Nothing is silently enabled." : "Sign in with an authorized operations account to view live rules."} action={isAdmin ? "Create rule" : undefined} /> : <div className="divide-y divide-slate-100">{visibleRules.map(rule => <div className="rule-row" key={rule.id}><div className="rule-leading"><span className={`rule-state ${rule.isActive ? "active" : "draft"}`} /><div><p className="font-semibold text-slate-800">{rule.name}</p><p className="mt-1 text-xs text-slate-500">{ruleTypeLabels[rule.ruleType] ?? rule.ruleType} · v{rule.version} · {rule.scope}</p></div></div><Badge variant="outline" className="capitalize">{rule.action.replace("_", " ")}</Badge><Badge className={rule.isActive ? "success-badge" : "muted-badge"}>{rule.isActive ? "Active" : "Draft"}</Badge><ChevronRight size={16} className="text-slate-300" /></div>)}</div>}</CardContent></Card>
    </div>
  );

  const renderCommunities = () => (
    <div className="space-y-5"><div className="section-heading"><div><p className="eyebrow">Managed network</p><h2 className="section-title">Communities</h2><p className="section-description">Stage religion-first, country-next communities without losing operational control.</p></div><Button className="primary-button"><Plus size={16} /> Create community</Button></div><div className="grid gap-4 md:grid-cols-3"><Card className="stat-tile"><CardContent className="p-5"><p className="eyebrow">Membership model</p><p className="mt-2 text-2xl font-semibold text-slate-900">Multi-join</p><p className="mt-1 text-sm text-slate-500">Each eligible user can join more than one active space.</p></CardContent></Card><Card className="stat-tile"><CardContent className="p-5"><p className="eyebrow">Creation rights</p><p className="mt-2 text-2xl font-semibold text-slate-900">Platform only</p><p className="mt-1 text-sm text-slate-500">Users cannot create arbitrary public groups.</p></CardContent></Card><Card className="stat-tile"><CardContent className="p-5"><p className="eyebrow">Launch state</p><p className="mt-2 text-2xl font-semibold text-slate-900">Coming Soon</p><p className="mt-1 text-sm text-slate-500">Interest can be captured before activation.</p></CardContent></Card></div><Card className="panel-card"><CardContent className="p-0">{(communities.data ?? []).length === 0 ? <EmptyState title={isAdmin ? "No communities yet" : "Community controls are protected"} description={isAdmin ? "Create the official community first, then stage religion and country categories." : "Only authorized platform operators can view or change community states."} action={isAdmin ? "Create community" : undefined} /> : <div className="divide-y divide-slate-100">{communities.data?.map(community => <div className="rule-row" key={community.id}><div><p className="font-semibold text-slate-800">{community.name}</p><p className="mt-1 text-xs text-slate-500 capitalize">{community.categoryType} · managed platform space</p></div><Badge className={community.status === "active" ? "success-badge" : "amber-badge"}>{community.status.replace("_", " ")}</Badge><ChevronRight size={16} className="text-slate-300" /></div>)}</div>}</CardContent></Card></div>
  );

  const renderReviews = () => (
    <div className="space-y-5"><div className="section-heading"><div><p className="eyebrow">Human-in-the-loop</p><h2 className="section-title">Review queues</h2><p className="section-description">One view for moderation, verification, support, incidents and agent escalations.</p></div><Button variant="outline"><Command size={15} /> Queue filters</Button></div><div className="flex flex-wrap gap-2">{[{ value: "all", label: "All cases" }, { value: "moderation", label: "Moderation" }, { value: "verification", label: "Verification" }, { value: "support", label: "Support" }, { value: "incident", label: "Incidents" }, { value: "agent_review", label: "Agent review" }].map(item => <button key={item.value} onClick={() => setReviewQueue(item.value as typeof reviewQueue)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${reviewQueue === item.value ? "border-[#2f7b88] bg-[#e8f5f5] text-[#286c78]" : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"}`}>{item.label}</button>)}</div><Card className="panel-card"><CardContent className="p-0">{(queueData ?? []).length === 0 ? <EmptyState title={isAdmin ? "Queues are clear" : "Review queues are protected"} description={isAdmin ? "No open review cases are currently recorded. New low-confidence or high-risk signals will appear here." : "Sign in with an authorized operations account to view queues."} /> : <div className="divide-y divide-slate-100">{queueData?.map(item => <div className="rule-row" key={item.id}><div className="rule-leading"><span className={`priority-pip ${item.severity}`} /><div><p className="font-semibold text-slate-800">{item.summary}</p><p className="mt-1 text-xs text-slate-500 capitalize">{item.caseType.replace("_", " ")} · {item.status}</p></div></div><Badge variant="outline" className="capitalize">{item.severity}</Badge><ChevronRight size={16} className="text-slate-300" /></div>)}</div>}</CardContent></Card></div>
  );

  const renderAgent = () => (
    <div className="space-y-5"><div className="section-heading"><div><p className="eyebrow">Guardrails</p><h2 className="section-title">Agent control room</h2><p className="section-description">Observe automated decisions, confidence and human fallback without giving agents final authority.</p></div><Badge className="success-badge"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" /> Systems nominal</Badge></div><div className="grid gap-4 md:grid-cols-3"><MetricCard label="Decision boundary" value="0.85" caption="Low-confidence cases escalate" icon={Bot} tone="tone-cyan" /><MetricCard label="High-risk actions" value="Human" caption="Second confirmation required" icon={LockKeyhole} tone="tone-rose" /><MetricCard label="Fallback queue" value={metrics.openCases} caption="Cases awaiting attention" icon={MessageSquareWarning} tone="tone-amber" /></div><Card className="panel-card"><CardHeader><CardTitle className="text-lg">Agent responsibilities</CardTitle><p className="text-sm text-slate-500">Agents classify and explain. Authorized humans decide.</p></CardHeader><CardContent className="space-y-3">{["Content triage across four surfaces", "Verification signal preparation", "Safe support categorization", "Community spam and link detection"].map(item => <div key={item} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3 text-sm text-slate-600"><CheckCircle2 size={16} className="text-emerald-500" />{item}<ChevronRight size={15} className="ml-auto text-slate-300" /></div>)}</CardContent></Card></div>
  );

  const renderAccess = () => (
    <div className="space-y-5"><div className="section-heading"><div><p className="eyebrow">Governance</p><h2 className="section-title">Access & audit</h2><p className="section-description">Keep operator access narrow, reviewable and separate from member privacy.</p></div><Button variant="outline"><LockKeyhole size={15} /> Review policy</Button></div><Card className="panel-card"><CardHeader><CardTitle className="text-lg">Operator role boundaries</CardTitle></CardHeader><CardContent className="space-y-2">{[{ role: "Administrator", access: "All operations · high-risk confirmation", tone: "success-badge" }, { role: "Safety lead", access: "Rules, moderation and incidents", tone: "soft-badge" }, { role: "Verification reviewer", access: "Verification desk and appeals", tone: "soft-badge" }, { role: "Read-only analyst", access: "Metrics without member content", tone: "soft-badge" }].map(item => <div key={item.role} className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0"><div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><KeyRound size={15} /></div><div><p className="text-sm font-semibold text-slate-700">{item.role}</p><p className="mt-1 text-xs text-slate-500">{item.access}</p></div><Badge className={`ml-auto ${item.tone}`}>Defined</Badge></div>)}</CardContent></Card><Card className="panel-card"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">Recent audit events</CardTitle><Badge className="soft-badge">Last 50</Badge></div><p className="text-sm text-slate-500">A reviewable trail for policy changes and sensitive decisions.</p></CardHeader><CardContent className="p-0">{!isAdmin ? <EmptyState title="Audit trail is protected" description="Only authorized operators can view governance events." /> : (auditLogs.data ?? []).length === 0 ? <EmptyState title="No audit events yet" description="Policy activations and human decisions will appear here." /> : <div className="divide-y divide-slate-100">{auditLogs.data?.map(log => <div className="flex items-center gap-3 px-5 py-3" key={log.id}><div className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-500"><Activity size={15} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-700">{log.action}</p><p className="mt-1 text-xs text-slate-400">{log.actorType} · {log.resourceType}</p></div><time className="text-[11px] text-slate-400">{new Date(log.createdAt).toLocaleString()}</time></div>)}</div>}</CardContent></Card><div className="notice-card"><LockKeyhole size={18} /><p>Every policy activation, human review decision and sensitive access should produce an immutable audit event before this console is used in production.</p></div></div>
  );

  const renderEntitlements = () => (
    <div className="space-y-5"><div className="section-heading"><div><p className="eyebrow">Privacy projection</p><h2 className="section-title">Entitlements</h2><p className="section-description">Field-level access is evaluated on the server across plan, consent and privacy.</p></div><Button variant="outline"><KeyRound size={15} /> Policy matrix</Button></div><Card className="panel-card"><CardHeader><CardTitle className="text-lg">Profile visibility matrix</CardTitle><p className="text-sm text-slate-500">Paid access never overrides owner privacy or consent.</p></CardHeader><CardContent className="p-0"><div className="entitlement-head"><span>Field policy</span><span>Free</span><span>Basic</span><span>Advanced</span></div>{(fieldPolicies.data ?? []).length === 0 ? <EmptyState title={isAdmin ? "No field policies configured" : "Entitlement policy is protected"} description={isAdmin ? "Add field policies before exposing profile projections to client applications." : "The server controls which profile fields each plan can receive."} /> : fieldPolicies.data?.map(policy => <div className="entitlement-row" key={policy.fieldKey}><div><p className="font-medium text-slate-700">{policy.fieldKey}</p>{policy.isSensitive && <span className="text-[11px] text-amber-600">Sensitive field</span>}</div>{[policy.freeAccess, policy.basicAccess, policy.advancedAccess].map((allowed, index) => <span key={index} className={allowed ? "access-pill allowed" : "access-pill"}>{allowed ? "Allowed" : "Hidden"}</span>)}</div>)}</CardContent></Card><div className="notice-card"><LockKeyhole size={18} /><p><strong>Privacy invariant.</strong> Private photos, contact details, exact locations and hidden identities require owner consent even for Advanced users.</p></div></div>
  );

  const page = active === "Safety rules" ? renderRules() : active === "Communities" ? renderCommunities() : active === "Review queues" ? renderReviews() : active === "Entitlements" ? renderEntitlements() : active === "Agent control room" ? renderAgent() : active === "Access & audit" ? renderAccess() : renderOverview();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-lockup"><div className="brand-symbol">N</div><div><div className="brand-name">nikah<span>saathi</span></div><div className="brand-subtitle">Operations workspace</div></div><button className="mobile-close" onClick={() => setSidebarOpen(false)}><X size={18} /></button></div>
        <div className="workspace-chip"><span className="workspace-avatar">NS</span><div><p className="text-xs font-semibold text-slate-700">NikahSaathi</p><p className="text-[11px] text-slate-400">Core operations</p></div><ChevronRight className="ml-auto text-slate-300" size={15} /></div>
        <nav className="mt-8 space-y-1">{navItems.map(({ label, icon: Icon }) => <button key={label} className={`nav-item ${active === label ? "nav-active" : ""}`} onClick={() => { setActive(label); setSidebarOpen(false); }}><Icon size={17} /><span>{label}</span>{label === "Review queues" && metrics.openCases > 0 && <span className="nav-count">{metrics.openCases}</span>}</button>)}</nav>
        <div className="sidebar-divider" /><p className="sidebar-label">Workspace</p><button className={`nav-item ${active === "Agent control room" ? "nav-active" : ""}`} onClick={() => { setActive("Agent control room"); setSidebarOpen(false); }}><Bot size={17} /><span>Agent control room</span><span className="live-label">Live</span></button><button className={`nav-item ${active === "Access & audit" ? "nav-active" : ""}`} onClick={() => { setActive("Access & audit"); setSidebarOpen(false); }}><LockKeyhole size={17} /><span>Access & audit</span></button>
        <div className="sidebar-bottom"><div className="support-card"><div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><span className="status-dot green" /> Systems nominal</div><p className="mt-2 text-[11px] leading-5 text-slate-500">API-ready policies shared across future clients.</p></div><div className="user-chip"><div className="user-avatar">{user?.name?.slice(0, 1).toUpperCase() ?? "O"}</div><div className="min-w-0"><p className="truncate text-xs font-semibold text-slate-700">{user?.name ?? "Operations owner"}</p><p className="truncate text-[11px] text-slate-400">{isAdmin ? "Administrator" : "Preview mode"}</p></div><Menu size={16} className="ml-auto text-slate-300" /></div></div>
      </aside>
      {sidebarOpen && <button aria-label="Close navigation" className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <main className="main-content"><header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu size={20} /></button><div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{active}</strong></div><div className="topbar-actions"><div className="top-search"><Search size={15} /><span>Search</span><kbd>⌘ K</kbd></div><div className="topbar-avatar">{user?.name?.slice(0, 1).toUpperCase() ?? "O"}</div></div></header><div className="content-wrap">{queryError && isAdmin && <div className="preview-banner"><CircleAlert size={16} /><span><strong>Live data unavailable.</strong> The console is showing safe empty states until the service responds.</span></div>}{!isAdmin && <div className="preview-banner"><CircleAlert size={16} /><span><strong>Preview workspace.</strong> Live operations data appears after an authorized admin signs in.</span>{!isAuthenticated && <Button size="sm" variant="outline" onClick={startLogin}>Sign in</Button>}</div>}{page}</div></main>
    </div>
  );
}
