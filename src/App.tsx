import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Divide, History, Minus, Plus, RefreshCw, Sparkles, X, Percent, Calculator as CalculatorIcon } from 'lucide-react'

type Operation = 'add' | 'subtract' | 'multiply' | 'divide' | 'percentage'
type Entry = { id: string; left: number; right: number; operation: Operation; result: number; createdAt: string }
const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') ?? ''
const clientId = (() => {
  const key = 'calculator-client-id'
  const current = localStorage.getItem(key)
  if (current) return current
  const created = crypto.randomUUID()
  localStorage.setItem(key, created)
  return created
})()
const operators: { id: Operation; label: string; short: string; icon: typeof Plus }[] = [
  { id: 'add', label: 'Addition', short: '+', icon: Plus },
  { id: 'subtract', label: 'Subtraction', short: '−', icon: Minus },
  { id: 'multiply', label: 'Multiplication', short: '×', icon: X },
  { id: 'divide', label: 'Division', short: '÷', icon: Divide },
  { id: 'percentage', label: 'Percentage', short: '%', icon: Percent },
]
const pretty = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 8 }).format(value)
const expression = (e: Entry) => e.operation === 'percentage'
  ? `${pretty(e.left)} × ${pretty(e.right)}%`
  : `${pretty(e.left)} ${operators.find(o => o.id === e.operation)?.short} ${pretty(e.right)}`

export default function App() {
  const [left, setLeft] = useState(''); const [right, setRight] = useState('')
  const [operation, setOperation] = useState<Operation>('add')
  const [result, setResult] = useState<number | null>(null)
  const [history, setHistory] = useState<Entry[]>([])
  const [busy, setBusy] = useState(false); const [error, setError] = useState('')
  const [storageReady, setStorageReady] = useState(false)

  async function loadHistory() {
    try {
      const response = await fetch(`${api}/api/calculations?limit=8&clientId=${encodeURIComponent(clientId)}`)
      if (!response.ok) throw new Error('Could not reach the calculator API.')
      const data: Entry[] = await response.json(); setHistory(data); setStorageReady(true)
    } catch {
      setStorageReady(false)
      try { setHistory(JSON.parse(localStorage.getItem('calculator-history') || '[]')) } catch { setHistory([]) }
    }
  }
  useEffect(() => { void loadHistory() }, [])

  async function calculate(e: React.FormEvent) {
    e.preventDefault(); setError(''); setResult(null)
    const a = Number(left); const b = Number(right)
    if (!left.trim() || !right.trim() || !Number.isFinite(a) || !Number.isFinite(b)) { setError('Enter a number in both fields.'); return }
    if (operation === 'divide' && b === 0) { setError('A number cannot be divided by zero.'); return }
    setBusy(true)
    try {
      const response = await fetch(`${api}/api/calculations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ left: a, right: b, operation, clientId }) })
      if (response.ok) {
        const entry: Entry = await response.json(); setResult(entry.result); setHistory(items => [entry, ...items.filter(i => i.id !== entry.id)].slice(0, 8)); setStorageReady(true)
      } else {
        const body = await response.json().catch(() => ({})); throw new Error(body.message || 'The calculation could not be saved.')
      }
    } catch (err) {
      if (api) { setError(err instanceof Error ? `${err.message} Check that the API is running.` : 'The API is unavailable.'); setBusy(false); return }
      const value = operation === 'add' ? a + b : operation === 'subtract' ? a - b : operation === 'multiply' ? a * b : operation === 'divide' ? a / b : a * b / 100
      const entry: Entry = { id: crypto.randomUUID(), left: a, right: b, operation, result: value, createdAt: new Date().toISOString() }
      setStorageReady(false); setResult(value); setHistory(items => { const next = [entry, ...items].slice(0, 8); localStorage.setItem('calculator-history', JSON.stringify(next)); return next })
    } finally { setBusy(false) }
  }

  return <main className="shell">
    <header className="topbar"><a className="brand" href="#"><span className="brand-mark"><CalculatorIcon size={18}/></span><span>valery<span className="brand-dot">.</span></span></a><span className="top-label">A LITTLE CLARITY, ONE CALCULATION AT A TIME</span><span className="online"><i/> READY TO CALCULATE</span></header>
    <section className="intro"><div className="eyebrow"><Sparkles size={14}/> THE EVERYDAY CALCULATOR</div><h1>Numbers, meet<br/><em>your match.</em></h1><p>Simple operations. A clear answer. Every calculation, kept close.</p></section>
    <section className="workspace">
      <form className="calculator card" onSubmit={calculate}>
        <div className="card-head"><div><span className="section-kicker">01 / CALCULATE</span><h2>Make it add up.</h2></div><div className="round-icon"><CalculatorIcon size={18}/></div></div>
        <div className="fields"><label className="field"><span>FIRST NUMBER</span><input inputMode="decimal" value={left} onChange={e => setLeft(e.target.value)} placeholder="0" aria-label="First number" /></label><div className="field-connector">{operators.find(o => o.id === operation)?.short}</div><label className="field"><span>{operation === 'percentage' ? 'PERCENT' : 'SECOND NUMBER'}</span><input inputMode="decimal" value={right} onChange={e => setRight(e.target.value)} placeholder="0" aria-label={operation === 'percentage' ? 'Percentage' : 'Second number'} /></label></div>
        <div className="operation-label">CHOOSE AN OPERATION</div><div className="operations" role="radiogroup" aria-label="Choose operation">{operators.map(({id,label,short,icon:Icon})=><button key={id} type="button" className={`operation ${operation===id?'selected':''}`} role="radio" aria-checked={operation===id} onClick={()=>{setOperation(id);setResult(null)}}><Icon size={17}/><span>{label}</span><b>{short}</b></button>)}</div>
        <div className="result-box"><span className="section-kicker">YOUR RESULT</span><output>{result === null ? <span className="result-placeholder">Waiting on the numbers<span className="blink">_</span></span> : pretty(result)}</output>{result !== null && <span className="result-equation">{operation==='percentage'?`${pretty(Number(left))} × ${pretty(Number(right))}%`:`${pretty(Number(left))} ${operators.find(o=>o.id===operation)?.short} ${pretty(Number(right))}`}</span>}</div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="submit" type="submit" disabled={busy}>{busy ? 'WORKING…' : <>CALCULATE <ArrowUpRight size={18}/></>}</button>
        <p className="helper">{operation === 'percentage' ? 'Find a percentage of a number · e.g. 15% of 200 = 30' : 'Your calculations are saved to your history.'}</p>
      </form>
      <aside className="history-card card"><div className="card-head"><div><span className="section-kicker">02 / YOUR ACTIVITY</span><h2>Recent history<span className="count">{history.length.toString().padStart(2,'0')}</span></h2></div><button className="refresh" onClick={()=>void loadHistory()} aria-label="Refresh history"><RefreshCw size={16}/></button></div>
        <div className="history-list">{history.length===0?<div className="empty"><span className="empty-icon"><History size={20}/></span><strong>Your story starts here.</strong><p>Run your first calculation and it will show up here.</p></div>:history.map((entry,i)=><div className="history-row" key={entry.id}><div className={`history-symbol ${entry.result<0?'negative':''}`}>{entry.result<0?<ArrowDownRight size={16}/>:<ArrowUpRight size={16}/>}</div><div className="history-main"><strong>{expression(entry)}</strong><span>{new Date(entry.createdAt).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})}</span></div><b className="history-result">{pretty(entry.result)}</b></div>)}</div>
        <div className="history-foot"><span className={storageReady?'db-status':'local-status'}><i/>{storageReady?'SUPABASE DATABASE':'LOCAL PREVIEW'}</span><span>{storageReady?'SYNCED':'API NOT CONNECTED'}</span></div>
      </aside>
    </section>
    <footer><span>BUILT WITH CARE BY VALERY</span><span>REACT <b>·</b> .NET 10 <b>·</b> SUPABASE</span></footer>
  </main>
}
