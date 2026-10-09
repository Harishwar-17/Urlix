import { useEffect, useState } from 'react'
import {
  ShieldAlert,
  ShieldCheck,
  Shield,
  Activity,
  Server,
  Lock,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Terminal,
  Info,
  XCircle,
  Copy,
  Check,
  BarChart3,
  Trash2,
  History as HistoryIcon
} from 'lucide-react'

interface HealthResponse {
  status: string
  service: string
  tagline: string
  version: string
  timestamp: string
  uptime_seconds: number
  environment: string
  detection_engine: string
}

interface Finding {
  rule_id: string
  title: string
  severity: 'info' | 'low' | 'medium' | 'high'
  score_impact: number
  evidence: string
  explanation: string
}

interface AnalyzeResponse {
  submitted_url: string
  normalized_url: string
  scheme: string
  hostname: string
  registered_domain: string
  path: string
  risk_category: 'Low' | 'Medium' | 'High'
  heuristic_score: number
  score_description: string
  summary: string
  findings_count: number
  findings: Finding[]
  recommendations: string[]
  disclaimer: string
  analyzed_at: string
  passive_analysis: boolean
}

// Preset test scenarios for fast hackathon demo testing
const SAMPLE_TEST_CASES = [
  {
    label: 'Brand Spoofing & Subdomain Phish',
    url: 'http://login.microsoft.com.secure-auth-update.xyz/auth.php',
    badge: 'High Risk',
    badgeColor: 'text-rose-400 border-rose-800 bg-rose-950/40',
  },
  {
    label: 'Misleading @ Authority Credential Trick',
    url: 'https://paypal.com@evil-phish.top/account-verify',
    badge: 'High Risk',
    badgeColor: 'text-rose-400 border-rose-800 bg-rose-950/40',
  },
  {
    label: 'Direct IP Host with Login Path',
    url: 'http://192.168.1.100/login/update',
    badge: 'High Risk',
    badgeColor: 'text-rose-400 border-rose-800 bg-rose-950/40',
  },
  {
    label: 'Punycode Homograph Domain',
    url: 'http://xn--pple-43d.com/store',
    badge: 'Medium Risk',
    badgeColor: 'text-amber-400 border-amber-800 bg-amber-950/40',
  },
  {
    label: 'Public URL Shortener',
    url: 'https://bit.ly/3xSampleShortener',
    badge: 'Shortener',
    badgeColor: 'text-cyan-400 border-cyan-800 bg-cyan-950/40',
  },
  {
    label: 'Legitimate Web Service',
    url: 'https://github.com/explore',
    badge: 'Low Risk',
    badgeColor: 'text-emerald-400 border-emerald-800 bg-emerald-950/40',
  },
]

export default function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loadingHealth, setLoadingHealth] = useState<boolean>(true)
  const [pingLatency, setPingLatency] = useState<number | null>(null)

  // URL Analysis State
  const [inputUrl, setInputUrl] = useState<string>('')
  const [analyzing, setAnalyzing] = useState<boolean>(false)
  const [analysisResult, setAnalysisResult] = useState<AnalyzeResponse | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [expandedFindings, setExpandedFindings] = useState<Record<string, boolean>>({})
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false)

  // History and Dashboard State
  const [history, setHistory] = useState<AnalyzeResponse[]>([])

  // Load history on mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('urlix_history')
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory))
      } catch (e) {
        console.error('Failed to parse history', e)
      }
    }
  }, [])

  // Save history when it changes
  useEffect(() => {
    localStorage.setItem('urlix_history', JSON.stringify(history))
  }, [history])

  const fetchHealth = async () => {
    setLoadingHealth(true)
    const startTime = performance.now()
    try {
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: HealthResponse = await res.json()
      setPingLatency(Math.round(performance.now() - startTime))
      setHealth(data)
    } catch (err) {
      console.error('Failed to reach backend health:', err)
      setHealth(null)
    } finally {
      setLoadingHealth(false)
    }
  }

  useEffect(() => {
    fetchHealth()
  }, [])

  const handleAnalyze = async (targetUrl?: string) => {
    const urlToTest = (targetUrl !== undefined ? targetUrl : inputUrl).trim()
    if (!urlToTest) {
      setAnalysisError('Please enter a URL to analyze.')
      setAnalysisResult(null)
      return
    }

    setAnalyzing(true)
    setAnalysisError(null)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: urlToTest }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.detail || data.error || `HTTP ${res.status}: Failed to analyze URL`)
      }

      setAnalysisResult(data)
      
      // Update History
      setHistory((prev) => {
        // Remove duplicate URL if it exists to bring it to top, or just keep all scans
        // Requirement says "latest 50 scans", usually implies chronological order
        const newHistory = [data, ...prev].slice(0, 50)
        return newHistory
      })

      // Auto-expand all findings by default
      const initialExpanded: Record<string, boolean> = {}
      data.findings?.forEach((f: Finding) => {
        initialExpanded[f.rule_id] = true
      })
      setExpandedFindings(initialExpanded)
    } catch (err: any) {
      setAnalysisError(err.message || 'An unexpected error occurred during analysis.')
      setAnalysisResult(null)
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleFinding = (ruleId: string) => {
    setExpandedFindings((prev) => ({
      ...prev,
      [ruleId]: !prev[ruleId],
    }))
  }

  const copyUrl = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedUrl(true)
    setTimeout(() => setCopiedUrl(false), 2000)
  }

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your scan history?')) {
      setHistory([])
    }
  }

  const stats = {
    total: history.length,
    high: history.filter((s) => s.risk_category === 'High').length,
    medium: history.filter((s) => s.risk_category === 'Medium').length,
    low: history.filter((s) => s.risk_category === 'Low').length,
  }

  // Visual helper for risk badge styling
  const getRiskTheme = (category?: string) => {
    switch (category) {
      case 'High':
        return {
          badge: 'bg-rose-950/60 border-rose-600/70 text-rose-400',
          gradient: 'from-rose-500/20 via-rose-950/20 to-transparent',
          scoreBar: 'bg-gradient-to-r from-amber-500 via-rose-500 to-red-600',
          scoreText: 'text-rose-400',
          border: 'border-rose-900/60',
          icon: <ShieldAlert className="w-8 h-8 text-rose-500" />,
        }
      case 'Medium':
        return {
          badge: 'bg-amber-950/60 border-amber-600/70 text-amber-400',
          gradient: 'from-amber-500/20 via-amber-950/20 to-transparent',
          scoreBar: 'bg-gradient-to-r from-emerald-500 via-yellow-500 to-amber-500',
          scoreText: 'text-amber-400',
          border: 'border-amber-900/60',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
        }
      default:
        return {
          badge: 'bg-emerald-950/60 border-emerald-600/70 text-emerald-400',
          gradient: 'from-emerald-500/20 via-emerald-950/20 to-transparent',
          scoreBar: 'bg-gradient-to-r from-teal-500 to-emerald-500',
          scoreText: 'text-emerald-400',
          border: 'border-emerald-900/60',
          icon: <ShieldCheck className="w-8 h-8 text-emerald-400" />,
        }
    }
  }

  const currentTheme = analysisResult ? getRiskTheme(analysisResult.risk_category) : null

  return (
    <div className="relative min-h-screen bg-[#07090e] text-slate-100 cyber-grid selection:bg-cyan-500/20 selection:text-cyan-300">
      <div className="absolute inset-0 cyber-glow pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-[#0b0f19]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-6xl mx-auto px-4 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 p-[1.5px] shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-[#0b0f19] rounded-[10px] flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  URLIX
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-950/70 border border-cyan-800/60 text-cyan-400">
                  Detection Engine v0.2
                </span>
              </div>
              <p className="text-xs text-slate-400 tracking-tight hidden sm:block">
                See the Link. Spot the Threat.
              </p>
            </div>
          </div>

          {/* Backend Connection Status Badge */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                loadingHealth
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
                  : health
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {health && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    loadingHealth
                      ? 'bg-amber-400'
                      : health
                      ? 'bg-emerald-500'
                      : 'bg-rose-500'
                  }`}
                ></span>
              </span>
              <span>
                {loadingHealth
                  ? 'Connecting...'
                  : health
                  ? `Engine Online (${pingLatency ?? 0}ms)`
                  : 'Engine Offline'}
              </span>
            </div>

            <button
              onClick={fetchHealth}
              disabled={loadingHealth}
              title="Refresh engine status"
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-4 py-10 flex flex-col gap-10">
        {/* Hero Section & Input */}
        <section className="text-center max-w-3xl mx-auto flex flex-col items-center gap-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/30 text-cyan-300 text-xs font-medium shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Passive Explainable Heuristic Detection Engine</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            See the Link.{' '}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Spot the Threat.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            Inspect untrusted links with zero execution risk. URLIX deconstructs lexical structure,
            detects brand impersonation, and calculates an explainable heuristic risk score.
          </p>

          {/* Interactive URL Input Form */}
          <div className="w-full mt-2">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAnalyze()
              }}
              className="relative flex flex-col sm:flex-row items-center gap-2 p-2 rounded-2xl bg-[#0f1422] border border-slate-800 focus-within:border-cyan-500/70 shadow-2xl shadow-cyan-950/30 transition-all"
            >
              <div className="flex items-center gap-2.5 px-3 w-full sm:flex-1">
                <Search className="w-5 h-5 text-slate-500 shrink-0" />
                <input
                  type="text"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="Paste URL to inspect (e.g. https://paypal.com@verify-auth.top/login)"
                  className="w-full bg-transparent text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
                  disabled={analyzing}
                />
                {inputUrl && (
                  <button
                    type="button"
                    onClick={() => setInputUrl('')}
                    className="text-slate-500 hover:text-slate-300 p-1"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={analyzing}
                className="w-full sm:w-auto px-7 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-bold text-sm tracking-wide shadow-md shadow-cyan-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-slate-950" />
                    <span>Analyze Link</span>
                  </>
                )}
              </button>
            </form>

            {/* Zero-Execution Safety Banner */}
            <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                <strong>Zero-Execution Guarantee:</strong> Submitted URLs are parsed statically and{' '}
                <span className="text-slate-200 underline decoration-slate-600">never visited or opened</span>.
              </span>
            </div>

            {/* Quick-Test Sample Pills */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="text-slate-500 mr-1 flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5" /> Sample Test Links:
              </span>
              {SAMPLE_TEST_CASES.map((tc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setInputUrl(tc.url)
                    handleAnalyze(tc.url)
                  }}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono transition hover:scale-105 active:scale-95 ${tc.badgeColor}`}
                  title={tc.url}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Error Notification Alert */}
        {analysisError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-200 text-sm flex items-start gap-3 shadow-lg animate-fadeIn max-w-3xl mx-auto w-full">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-rose-300">Invalid URL or Request Error</h4>
              <p className="text-xs text-rose-200/90 mt-0.5">{analysisError}</p>
            </div>
          </div>
        )}

        {/* Loading Spinner Skeleton */}
        {analyzing && (
          <div className="max-w-3xl mx-auto w-full p-8 rounded-2xl bg-[#0c101c] border border-slate-800 flex flex-col items-center justify-center gap-3 animate-pulse">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-semibold text-white">Running Explainable Heuristic Checks...</p>
            <p className="text-xs text-slate-400">
              Inspecting scheme, entropy, punycode, brand lookalikes, and authority delimiters
            </p>
          </div>
        )}

        {/* Loading Spinner Skeleton */}
        {analyzing && (
          <div className="max-w-3xl mx-auto w-full p-8 rounded-2xl bg-[#0c101c] border border-slate-800 flex flex-col items-center justify-center gap-3 animate-pulse">
            <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
            <p className="text-sm font-semibold text-white">Running Explainable Heuristic Checks...</p>
            <p className="text-xs text-slate-400">
              Inspecting scheme, entropy, punycode, brand lookalikes, and authority delimiters
            </p>
          </div>
        )}

        {/* Security Dashboard */}
        {history.length > 0 && !analyzing && !analysisResult && (
          <section className="flex flex-col gap-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-cyan-400" />
                  Security Dashboard
                </h2>
                <p className="text-xs text-slate-400">Aggregated statistics from your recent scan history</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800 shadow-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Scans</span>
                <span className="text-3xl font-extrabold text-white mt-1">{stats.total}</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#0b0f19] border border-rose-900/40 shadow-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-500">High Risk</span>
                <span className="text-3xl font-extrabold text-rose-400 mt-1">{stats.high}</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#0b0f19] border border-amber-900/40 shadow-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">Medium Risk</span>
                <span className="text-3xl font-extrabold text-amber-400 mt-1">{stats.medium}</span>
              </div>
              <div className="p-5 rounded-2xl bg-[#0b0f19] border border-emerald-900/40 shadow-xl flex flex-col items-center">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-500">Low Risk</span>
                <span className="text-3xl font-extrabold text-emerald-400 mt-1">{stats.low}</span>
              </div>
            </div>

            {/* Visual Risk Distribution Bar */}
            <div className="w-full h-4 rounded-full bg-slate-800 flex overflow-hidden border border-slate-700/50">
              <div 
                className="h-full bg-rose-500 transition-all duration-500" 
                style={{ width: `${(stats.high / stats.total) * 100}%` }}
                title={`High Risk: ${stats.high}`}
              />
              <div 
                className="h-full bg-amber-500 transition-all duration-500" 
                style={{ width: `${(stats.medium / stats.total) * 100}%` }}
                title={`Medium Risk: ${stats.medium}`}
              />
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${(stats.low / stats.total) * 100}%` }}
                title={`Low Risk: ${stats.low}`}
              />
            </div>
          </section>
        )}

        {/* Scan History List */}
        {history.length > 0 && !analyzing && !analysisResult && (
          <section className="flex flex-col gap-4 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <HistoryIcon className="w-5 h-5 text-cyan-400" />
                  Scan History
                </h2>
                <p className="text-xs text-slate-400">Your latest 50 security inspections</p>
              </div>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 text-rose-400 hover:bg-rose-950/40 transition text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear History
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b0f19] shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-900/50 border-b border-slate-800">
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">URL / Target Host</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Category</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Heuristic Risk</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px]">Timestamp</th>
                      <th className="px-6 py-4 font-bold text-slate-400 uppercase tracking-wider text-[10px] text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {history.map((scan, i) => {
                      const theme = getRiskTheme(scan.risk_category)
                      return (
                        <tr key={i} className="hover:bg-slate-800/30 transition group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col max-w-md">
                              <span className="text-slate-200 font-mono text-xs truncate" title={scan.submitted_url}>
                                {scan.submitted_url}
                              </span>
                              <span className="text-[10px] text-slate-500 mt-0.5 truncate font-mono">
                                Host: {scan.hostname}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${theme.badge}`}>
                              {scan.risk_category}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`font-mono font-bold ${theme.scoreText}`}>{scan.heuristic_score}</span>
                              <div className="w-12 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                <div className={`h-full ${theme.scoreBar}`} style={{ width: `${scan.heuristic_score}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                            {new Date(scan.analyzed_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setAnalysisResult(scan)
                                window.scrollTo({ top: 0, behavior: 'smooth' })
                              }}
                              className="text-cyan-400 hover:text-cyan-300 text-xs font-bold transition flex items-center justify-end gap-1 ml-auto"
                            >
                              View Report <ArrowRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* Analysis Results Display */}
        {analysisResult && !analyzing && currentTheme && (
          <div className="flex flex-col gap-8 animate-fadeIn">
            {/* Top Risk Score & Verdict Banner */}
            <section
              className={`relative overflow-hidden rounded-2xl border p-6 sm:p-8 bg-[#0b0f19] ${currentTheme.border} shadow-2xl`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-r ${currentTheme.gradient} opacity-40 pointer-events-none`}
              />

              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
                    {currentTheme.icon}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-xs uppercase font-extrabold tracking-wider px-3 py-1 rounded-full border ${currentTheme.badge}`}
                      >
                        {analysisResult.risk_category} Risk Category
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {analysisResult.findings_count} Observation
                        {analysisResult.findings_count === 1 ? '' : 's'}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                      {analysisResult.score_description}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
                      {analysisResult.summary}
                    </p>
                  </div>
                </div>

                {/* Score Dial / Numerical Display */}
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 min-w-[170px] text-center shrink-0">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Heuristic Score
                  </span>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className={`text-4xl font-extrabold font-mono ${currentTheme.scoreText}`}>
                      {analysisResult.heuristic_score}
                    </span>
                    <span className="text-slate-500 font-bold text-sm">/100</span>
                  </div>
                  {/* Visual Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden mt-1">
                    <div
                      className={`h-full ${currentTheme.scoreBar} transition-all duration-700`}
                      style={{ width: `${Math.max(5, analysisResult.heuristic_score)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1.5">
                    Static heuristic indicator (not a probability)
                  </span>
                </div>
              </div>

              {/* Parsed Structure Details */}
              <div className="relative z-10 pt-5 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-500 block text-[11px]">Scheme:</span>
                  <span
                    className={`font-semibold ${
                      analysisResult.scheme === 'https' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {analysisResult.scheme}://
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60">
                  <span className="text-slate-500 block text-[11px]">Registered Domain:</span>
                  <span className="text-cyan-300 font-semibold truncate block" title={analysisResult.registered_domain}>
                    {analysisResult.registered_domain || 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 sm:col-span-2 flex items-center justify-between">
                  <div className="truncate mr-2">
                    <span className="text-slate-500 block text-[11px]">Full Target Host:</span>
                    <span className="text-slate-200 font-semibold truncate block" title={analysisResult.hostname}>
                      {analysisResult.hostname}
                    </span>
                  </div>
                  <button
                    onClick={() => copyUrl(analysisResult.submitted_url)}
                    className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
                    title="Copy submitted URL"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </section>

            {/* Heuristic Findings Breakdown */}
            <section className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-cyan-400" />
                    Explainable Heuristic Breakdown
                  </h3>
                  <p className="text-xs text-slate-400">
                    Transparent examination of individual lexical flags, syntax indicators, and score weights
                  </p>
                </div>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800/90 text-slate-300">
                  {analysisResult.findings.length} Finding{analysisResult.findings.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {analysisResult.findings.map((finding) => {
                  const isExpanded = !!expandedFindings[finding.rule_id]
                  const isHigh = finding.severity === 'high'
                  const isMed = finding.severity === 'medium'
                  const isLow = finding.severity === 'low'

                  const severityBadgeClass = isHigh
                    ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                    : isMed
                    ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                    : isLow
                    ? 'bg-blue-950/60 border-blue-800/80 text-blue-300'
                    : 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'

                  return (
                    <div
                      key={finding.rule_id}
                      className="rounded-xl border border-slate-800 bg-[#0c101c] overflow-hidden transition hover:border-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => toggleFinding(finding.rule_id)}
                        className="w-full p-4 flex items-center justify-between gap-4 text-left cursor-pointer hover:bg-slate-900/30 transition"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${severityBadgeClass}`}
                          >
                            {finding.severity}
                          </span>
                          <span className="font-semibold text-sm text-slate-200 truncate">
                            {finding.title}
                          </span>
                          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
                            [{finding.rule_id}]
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                              finding.score_impact > 0
                                ? isHigh
                                  ? 'bg-rose-950/50 text-rose-400 border border-rose-900'
                                  : 'bg-amber-950/50 text-amber-400 border border-amber-900'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            +{finding.score_impact} pts
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-slate-500" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 flex flex-col gap-3 text-xs bg-[#090d18]/40 animate-fadeIn">
                          {/* Evidence */}
                          <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-slate-300">
                            <span className="text-slate-500 block text-[10px] uppercase font-semibold">
                              Observed Evidence:
                            </span>
                            <span className="text-cyan-300 break-all">{finding.evidence}</span>
                          </div>

                          {/* Plain-Language Explanation */}
                          <div>
                            <span className="text-slate-400 font-semibold block mb-1">
                              Why this matters:
                            </span>
                            <p className="text-slate-300 leading-relaxed">
                              {finding.explanation}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Actionable Next Steps & Security Recommendations */}
            <section className="p-6 rounded-2xl bg-[#0b0f19] border border-slate-800 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Actionable Security Recommendations</span>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                {analysisResult.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/70 flex items-start gap-2.5 leading-relaxed"
                  >
                    <ArrowRight className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Safety & Heuristic Disclaimer */}
            <section className="p-4 rounded-xl bg-[#090c14] border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="text-slate-300 font-semibold">Important Security Notice: </strong>
                {analysisResult.disclaimer}
              </div>
            </section>
          </div>
        )}

        {/* Live System Diagnostics (Telemetry section preserved from Milestone 1) */}
        <section className="bg-[#0b0f1a] border border-slate-800 rounded-2xl p-6 shadow-xl mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-800/50 text-cyan-400">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  URLIX Engine Status & Telemetry
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-normal">
                    GET /api/health
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  FastAPI Heuristic Detection Engine connected at /api/analyze
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchHealth}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition"
              >
                <RefreshCw className={`w-3 h-3 ${loadingHealth ? 'animate-spin' : ''}`} />
                <span>Test Ping</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            <div className="p-4 rounded-xl bg-[#080b13] border border-slate-800/80 flex flex-col gap-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-400" /> Detection Engine
              </span>
              <span className="text-sm font-semibold capitalize mt-1 flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {health?.detection_engine || (loadingHealth ? 'Querying...' : 'Active')}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080b13] border border-slate-800/80 flex flex-col gap-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-teal-400" /> Server Uptime
              </span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-1">
                {health ? `${health.uptime_seconds}s` : '---'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080b13] border border-slate-800/80 flex flex-col gap-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" /> Round-Trip Latency
              </span>
              <span className="text-sm font-semibold font-mono text-cyan-300 mt-1">
                {pingLatency !== null ? `${pingLatency} ms` : '---'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#080b13] border border-slate-800/80 flex flex-col gap-1">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> API Version
              </span>
              <span className="text-sm font-semibold font-mono text-slate-200 mt-1">
                {health ? `FastAPI v${health.version}` : '---'}
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-[#080b13] py-6 text-center text-xs text-slate-500">
        <p>URLIX — Phishing & Malicious Link Detection Engine • 8-Hour Hackathon Project</p>
      </footer>
    </div>
  )
}
