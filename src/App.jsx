import { useState, useEffect, useCallback, useMemo, createContext, useContext, useReducer } from "react";

// ─── DATA LAYER (IndexedDB-like with localStorage + sync-ready architecture) ───
const DB_KEY = "tutor_billing_db";

const defaultDB = {
  settings: { tutorName: "Tutor", theme: "light" },
  centers: [],
  subjects: [],
  standards: [],
  rateRules: [],
  sessions: [],
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const loadDB = () => {
  try {
    const raw = localStorage.getItem(DB_KEY);
    return raw ? { ...defaultDB, ...JSON.parse(raw) } : { ...defaultDB };
  } catch { return { ...defaultDB }; }
};

const saveDB = (db) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

// ─── APP CONTEXT ───
const AppContext = createContext();

const reducer = (state, action) => {
  let next;
  switch (action.type) {
    case "SET_DB": next = action.payload; break;
    case "UPDATE_SETTINGS": next = { ...state, settings: { ...state.settings, ...action.payload } }; break;
    case "ADD_CENTER": next = { ...state, centers: [...state.centers, { id: generateId(), name: action.payload }] }; break;
    case "DEL_CENTER": next = { ...state, centers: state.centers.filter(c => c.id !== action.payload) }; break;
    case "ADD_SUBJECT": next = { ...state, subjects: [...state.subjects, { id: generateId(), name: action.payload }] }; break;
    case "DEL_SUBJECT": next = { ...state, subjects: state.subjects.filter(s => s.id !== action.payload) }; break;
    case "ADD_STANDARD": next = { ...state, standards: [...state.standards, { id: generateId(), name: action.payload }] }; break;
    case "DEL_STANDARD": next = { ...state, standards: state.standards.filter(s => s.id !== action.payload) }; break;
    case "ADD_RATE": next = { ...state, rateRules: [...state.rateRules, { id: generateId(), ...action.payload }] }; break;
    case "UPDATE_RATE": next = { ...state, rateRules: state.rateRules.map(r => r.id === action.payload.id ? { ...r, ...action.payload } : r) }; break;
    case "DEL_RATE": next = { ...state, rateRules: state.rateRules.filter(r => r.id !== action.payload) }; break;
    case "ADD_SESSION": next = { ...state, sessions: [...state.sessions, { id: generateId(), ...action.payload }] }; break;
    case "UPDATE_SESSION": next = { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? { ...s, ...action.payload } : s) }; break;
    case "DEL_SESSION": next = { ...state, sessions: state.sessions.filter(s => s.id !== action.payload) }; break;
    default: return state;
  }
  saveDB(next);
  return next;
};

// ─── RATE ENGINE ───
const findRate = (rateRules, centerId, subjectId, standardId) => {
  // Priority: exact match > partial matches > default
  const exact = rateRules.find(r => r.centerId === centerId && r.subjectId === subjectId && r.standardId === standardId);
  if (exact) return exact.ratePerHour;
  const subjStd = rateRules.find(r => !r.centerId && r.subjectId === subjectId && r.standardId === standardId);
  if (subjStd) return subjStd.ratePerHour;
  const centerSubj = rateRules.find(r => r.centerId === centerId && r.subjectId === subjectId && !r.standardId);
  if (centerSubj) return centerSubj.ratePerHour;
  const centerStd = rateRules.find(r => r.centerId === centerId && !r.subjectId && r.standardId === standardId);
  if (centerStd) return centerStd.ratePerHour;
  const subjOnly = rateRules.find(r => !r.centerId && r.subjectId === subjectId && !r.standardId);
  if (subjOnly) return subjOnly.ratePerHour;
  const centerOnly = rateRules.find(r => r.centerId === centerId && !r.subjectId && !r.standardId);
  if (centerOnly) return centerOnly.ratePerHour;
  const stdOnly = rateRules.find(r => !r.centerId && !r.subjectId && r.standardId === standardId);
  if (stdOnly) return stdOnly.ratePerHour;
  const def = rateRules.find(r => !r.centerId && !r.subjectId && !r.standardId);
  if (def) return def.ratePerHour;
  return 0;
};

// ─── ICONS (inline SVG components) ───
const Icon = ({ d, size = 20, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d}/></svg>
);

const Icons = {
  home: (p) => <Icon {...p} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />,
  calendar: (p) => <Icon {...p} d="M19 4H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zM16 2v4M8 2v4M3 10h18" />,
  settings: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
  report: (p) => <Icon {...p} d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />,
  plus: (p) => <Icon {...p} d="M12 5v14M5 12h14" />,
  trash: (p) => <Icon {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />,
  edit: (p) => <Icon {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />,
  download: (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  sun: (p) => <svg width={p?.size||20} height={p?.size||20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>,
  moon: (p) => <Icon {...p} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />,
  chevron: (p) => <Icon {...p} d="M9 18l6-6-6-6" />,
  x: (p) => <Icon {...p} d="M18 6L6 18M6 6l12 12" />,
  backup: (p) => <Icon {...p} d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />,
};

// ─── FORMATTERS ───
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const fmtDate = (d) => new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

// ─── SHARED COMPONENTS ───
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn-icon" onClick={onClose}>{Icons.x()}</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const ConfirmDialog = ({ open, onClose, onConfirm, message }) => (
  <Modal open={open} onClose={onClose} title="Confirm">
    <p style={{ padding: "16px 0", opacity: 0.8 }}>{message}</p>
    <div className="modal-actions">
      <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
      <button className="btn btn-danger" onClick={() => { onConfirm(); onClose(); }}>Delete</button>
    </div>
  </Modal>
);

const Select = ({ value, onChange, options, placeholder, allowEmpty }) => (
  <select value={value} onChange={e => onChange(e.target.value)} className="input">
    {(allowEmpty || !value) && <option value="">{placeholder || "Select..."}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

const Chip = ({ label, onDelete }) => (
  <span className="chip">
    {label}
    {onDelete && <button className="chip-del" onClick={onDelete}>{Icons.x({ size: 14 })}</button>}
  </span>
);

// ─── DASHBOARD ───
const Dashboard = () => {
  const { state, dispatch } = useContext(AppContext);
  const [showAdd, setShowAdd] = useState(false);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const completedThisMonth = state.sessions.filter(s => s.status === "completed" && s.date >= monthStart && s.date <= monthEnd);
  const totalHours = completedThisMonth.reduce((a, s) => a + (s.duration || 0), 0);
  const totalEarnings = completedThisMonth.reduce((a, s) => a + (s.amount || 0), 0);
  const upcoming = state.sessions.filter(s => s.status === "scheduled" && s.date >= now.toISOString().slice(0, 10)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const getName = (list, id) => list.find(i => i.id === id)?.name || "—";

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{Icons.plus({ size: 16 })} Add Session</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card accent-green">
          <span className="stat-label">Earnings this month</span>
          <span className="stat-value">{fmt(totalEarnings)}</span>
        </div>
        <div className="stat-card accent-blue">
          <span className="stat-label">Hours this month</span>
          <span className="stat-value">{totalHours.toFixed(1)}h</span>
        </div>
        <div className="stat-card accent-amber">
          <span className="stat-label">Sessions this month</span>
          <span className="stat-value">{completedThisMonth.length}</span>
        </div>
      </div>

      {upcoming.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Upcoming Sessions</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Center</th><th>Subject</th><th>Standard</th><th>Duration</th></tr></thead>
              <tbody>
                {upcoming.map(s => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.date)}</td>
                    <td>{getName(state.centers, s.centerId)}</td>
                    <td>{getName(state.subjects, s.subjectId)}</td>
                    <td>{getName(state.standards, s.standardId)}</td>
                    <td>{s.duration}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {state.centers.length === 0 && (
        <div className="card empty-state" style={{ marginTop: 24 }}>
          <p>Welcome! Start by setting up your <strong>Centers</strong>, <strong>Subjects</strong>, <strong>Standards</strong>, and <strong>Rates</strong> in the Settings page.</p>
        </div>
      )}

      {showAdd && <SessionModal onClose={() => setShowAdd(false)} />}
    </div>
  );
};

// ─── SESSION MODAL ───
const SessionModal = ({ onClose, editSession }) => {
  const { state, dispatch } = useContext(AppContext);
  const [form, setForm] = useState(editSession || {
    date: new Date().toISOString().slice(0, 10),
    centerId: "",
    subjectId: "",
    standardId: "",
    duration: 1,
    status: "completed",
  });

  const rate = findRate(state.rateRules, form.centerId, form.subjectId, form.standardId);
  const amount = rate * (form.duration || 0);

  const save = () => {
    if (!form.centerId || !form.subjectId || !form.standardId || !form.date) return;
    const payload = { ...form, duration: parseFloat(form.duration) || 0, rate, amount };
    if (editSession) {
      dispatch({ type: "UPDATE_SESSION", payload });
    } else {
      dispatch({ type: "ADD_SESSION", payload });
    }
    onClose();
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal open title={editSession ? "Edit Session" : "Log Session"} onClose={onClose}>
      <div className="form-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" className="input" value={form.date} onChange={e => set("date", e.target.value)} />
        </label>
        <label className="field">
          <span>Center</span>
          <Select value={form.centerId} onChange={v => set("centerId", v)} options={state.centers.map(c => ({ value: c.id, label: c.name }))} placeholder="Select center" />
        </label>
        <label className="field">
          <span>Subject</span>
          <Select value={form.subjectId} onChange={v => set("subjectId", v)} options={state.subjects.map(s => ({ value: s.id, label: s.name }))} placeholder="Select subject" />
        </label>
        <label className="field">
          <span>Standard</span>
          <Select value={form.standardId} onChange={v => set("standardId", v)} options={state.standards.map(s => ({ value: s.id, label: s.name }))} placeholder="Select standard" />
        </label>
        <label className="field">
          <span>Duration (hours)</span>
          <input type="number" step="0.25" min="0.25" className="input" value={form.duration} onChange={e => set("duration", e.target.value)} />
        </label>
        <label className="field">
          <span>Status</span>
          <Select value={form.status} onChange={v => set("status", v)} options={[{ value: "completed", label: "Completed" }, { value: "scheduled", label: "Scheduled" }, { value: "cancelled", label: "Cancelled" }]} />
        </label>
      </div>
      <div className="rate-preview">
        <span>Rate: {fmt(rate)}/hr</span>
        <span className="amount-preview">Amount: {fmt(amount)}</span>
      </div>
      <div className="modal-actions">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={!form.centerId || !form.subjectId || !form.standardId}>Save</button>
      </div>
    </Modal>
  );
};

// ─── SESSIONS PAGE ───
const Sessions = () => {
  const { state, dispatch } = useContext(AppContext);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  const getName = (list, id) => list.find(i => i.id === id)?.name || "—";
  const sorted = [...state.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const filtered = filterStatus ? sorted.filter(s => s.status === filterStatus) : sorted;
  const editSession = editId ? state.sessions.find(s => s.id === editId) : null;

  const statusColor = { completed: "var(--green)", scheduled: "var(--blue)", cancelled: "var(--red)" };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Sessions</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <Select value={filterStatus} onChange={setFilterStatus} options={[{ value: "completed", label: "Completed" }, { value: "scheduled", label: "Scheduled" }, { value: "cancelled", label: "Cancelled" }]} placeholder="All statuses" allowEmpty />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>{Icons.plus({ size: 16 })} Add</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card empty-state"><p>No sessions logged yet.</p></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Center</th><th>Subject</th><th>Std</th><th>Hrs</th><th>Rate</th><th>Amount</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.date)}</td>
                    <td>{getName(state.centers, s.centerId)}</td>
                    <td>{getName(state.subjects, s.subjectId)}</td>
                    <td>{getName(state.standards, s.standardId)}</td>
                    <td>{s.duration}</td>
                    <td>{fmt(s.rate || 0)}</td>
                    <td><strong>{fmt(s.amount || 0)}</strong></td>
                    <td><span className="status-badge" style={{ background: statusColor[s.status] + "22", color: statusColor[s.status] }}>{s.status}</span></td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="btn-icon" onClick={() => setEditId(s.id)}>{Icons.edit({ size: 16 })}</button>
                        <button className="btn-icon" onClick={() => setDelId(s.id)}>{Icons.trash({ size: 16 })}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <SessionModal onClose={() => setShowAdd(false)} />}
      {editSession && <SessionModal onClose={() => setEditId(null)} editSession={editSession} />}
      <ConfirmDialog open={!!delId} onClose={() => setDelId(null)} onConfirm={() => dispatch({ type: "DEL_SESSION", payload: delId })} message="Delete this session?" />
    </div>
  );
};

// ─── REPORTS PAGE ───
const Reports = () => {
  const { state } = useContext(AppContext);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [centerId, setCenterId] = useState("");

  const getName = (list, id) => list.find(i => i.id === id)?.name || "—";

  const completed = state.sessions.filter(s =>
    s.status === "completed" &&
    s.date >= startDate &&
    s.date <= endDate &&
    (!centerId || s.centerId === centerId)
  ).sort((a, b) => a.date.localeCompare(b.date));

  const totalHours = completed.reduce((a, s) => a + (s.duration || 0), 0);
  const totalAmount = completed.reduce((a, s) => a + (s.amount || 0), 0);

  // Group by center
  const byCenter = {};
  completed.forEach(s => {
    const cn = getName(state.centers, s.centerId);
    if (!byCenter[cn]) byCenter[cn] = { sessions: [], hours: 0, amount: 0 };
    byCenter[cn].sessions.push(s);
    byCenter[cn].hours += s.duration || 0;
    byCenter[cn].amount += s.amount || 0;
  });

  // Group by subject
  const bySubject = {};
  completed.forEach(s => {
    const sn = getName(state.subjects, s.subjectId);
    if (!bySubject[sn]) bySubject[sn] = { hours: 0, amount: 0 };
    bySubject[sn].hours += s.duration || 0;
    bySubject[sn].amount += s.amount || 0;
  });

  const exportCSV = () => {
    const rows = [["Date", "Center", "Subject", "Standard", "Hours", "Rate", "Amount"]];
    completed.forEach(s => rows.push([s.date, getName(state.centers, s.centerId), getName(state.subjects, s.subjectId), getName(state.standards, s.standardId), s.duration, s.rate, s.amount]));
    rows.push(["", "", "", "TOTAL", totalHours, "", totalAmount]);
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `billing_${startDate}_${endDate}.csv`; a.click();
  };

  const exportPDF = () => {
    // Build HTML for PDF
    const html = `
      <html><head><style>
        * { font-family: 'Segoe UI', sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
        body { padding: 40px; color: #1a1a2e; }
        .header { border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 24px; } .header p { color: #666; margin-top: 4px; }
        .summary { display: flex; gap: 24px; margin-bottom: 24px; }
        .summary-item { background: #f4f4f8; padding: 12px 20px; border-radius: 8px; }
        .summary-item strong { display: block; font-size: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
        th { background: #1a1a2e; color: white; padding: 8px 12px; text-align: left; }
        td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
        tr:nth-child(even) { background: #fafafa; }
        .total-row td { font-weight: bold; border-top: 2px solid #1a1a2e; }
        .center-section { margin-top: 24px; }
        .center-section h3 { margin-bottom: 8px; color: #1a1a2e; }
        @media print { body { padding: 20px; } }
      </style></head><body>
        <div class="header">
          <h1>Billing Report</h1>
          <p><strong>${state.settings.tutorName}</strong></p>
          <p>${fmtDate(startDate)} — ${fmtDate(endDate)}${centerId ? " | " + getName(state.centers, centerId) : " | All Centers"}</p>
        </div>
        <div class="summary">
          <div class="summary-item"><span>Total Hours</span><strong>${totalHours.toFixed(1)}h</strong></div>
          <div class="summary-item"><span>Total Earnings</span><strong>${fmt(totalAmount)}</strong></div>
          <div class="summary-item"><span>Sessions</span><strong>${completed.length}</strong></div>
        </div>
        ${Object.entries(byCenter).map(([cn, data]) => `
          <div class="center-section">
            <h3>${cn}</h3>
            <table>
              <thead><tr><th>Date</th><th>Subject</th><th>Standard</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                ${data.sessions.map(s => `<tr><td>${fmtDate(s.date)}</td><td>${getName(state.subjects, s.subjectId)}</td><td>${getName(state.standards, s.standardId)}</td><td>${s.duration}</td><td>${fmt(s.rate || 0)}</td><td>${fmt(s.amount || 0)}</td></tr>`).join("")}
                <tr class="total-row"><td colspan="3">Subtotal — ${cn}</td><td>${data.hours.toFixed(1)}</td><td></td><td>${fmt(data.amount)}</td></tr>
              </tbody>
            </table>
          </div>
        `).join("")}
        <div style="margin-top:32px; padding-top:16px; border-top:3px solid #1a1a2e; display:flex; justify-content:space-between;">
          <div><strong>Grand Total</strong></div>
          <div><strong>${totalHours.toFixed(1)}h — ${fmt(totalAmount)}</strong></div>
        </div>
      </body></html>
    `;
    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Billing Report</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={exportCSV}>{Icons.download({ size: 16 })} CSV</button>
          <button className="btn btn-primary" onClick={exportPDF}>{Icons.download({ size: 16 })} PDF</button>
        </div>
      </div>

      <div className="filter-bar">
        <label className="field"><span>From</span><input type="date" className="input" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
        <label className="field"><span>To</span><input type="date" className="input" value={endDate} onChange={e => setEndDate(e.target.value)} /></label>
        <label className="field"><span>Center</span><Select value={centerId} onChange={setCenterId} options={state.centers.map(c => ({ value: c.id, label: c.name }))} placeholder="All Centers" allowEmpty /></label>
      </div>

      <div className="stat-grid" style={{ marginTop: 16 }}>
        <div className="stat-card accent-green"><span className="stat-label">Total Earnings</span><span className="stat-value">{fmt(totalAmount)}</span></div>
        <div className="stat-card accent-blue"><span className="stat-label">Total Hours</span><span className="stat-value">{totalHours.toFixed(1)}h</span></div>
        <div className="stat-card accent-amber"><span className="stat-label">Sessions</span><span className="stat-value">{completed.length}</span></div>
      </div>

      {Object.keys(bySubject).length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>Subject Breakdown</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Subject</th><th>Hours</th><th>Amount</th></tr></thead>
              <tbody>
                {Object.entries(bySubject).map(([sn, d]) => <tr key={sn}><td>{sn}</td><td>{d.hours.toFixed(1)}</td><td>{fmt(d.amount)}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 8 }}>All Sessions</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Center</th><th>Subject</th><th>Std</th><th>Hrs</th><th>Rate</th><th>Amount</th></tr></thead>
              <tbody>
                {completed.map(s => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.date)}</td>
                    <td>{getName(state.centers, s.centerId)}</td>
                    <td>{getName(state.subjects, s.subjectId)}</td>
                    <td>{getName(state.standards, s.standardId)}</td>
                    <td>{s.duration}</td>
                    <td>{fmt(s.rate || 0)}</td>
                    <td><strong>{fmt(s.amount || 0)}</strong></td>
                  </tr>
                ))}
                <tr className="total-row"><td colSpan={4}><strong>Total</strong></td><td><strong>{totalHours.toFixed(1)}</strong></td><td></td><td><strong>{fmt(totalAmount)}</strong></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── SETTINGS PAGE ───
const SettingsPage = () => {
  const { state, dispatch } = useContext(AppContext);
  const [tab, setTab] = useState("general");
  const [input, setInput] = useState({});
  const [delTarget, setDelTarget] = useState(null);

  // Rate form
  const [rateForm, setRateForm] = useState({ centerId: "", subjectId: "", standardId: "", ratePerHour: "" });
  const [editRateId, setEditRateId] = useState(null);

  const getName = (list, id) => list.find(i => i.id === id)?.name || "Any";

  const addItem = (type, key) => {
    const val = (input[key] || "").trim();
    if (!val) return;
    dispatch({ type, payload: val });
    setInput(i => ({ ...i, [key]: "" }));
  };

  const saveRate = () => {
    const rate = parseFloat(rateForm.ratePerHour);
    if (!rate || rate <= 0) return;
    const payload = { ...rateForm, ratePerHour: rate };
    if (editRateId) {
      dispatch({ type: "UPDATE_RATE", payload: { ...payload, id: editRateId } });
      setEditRateId(null);
    } else {
      // Check for conflict
      const conflict = state.rateRules.find(r => r.centerId === rateForm.centerId && r.subjectId === rateForm.subjectId && r.standardId === rateForm.standardId);
      if (conflict) {
        dispatch({ type: "UPDATE_RATE", payload: { ...payload, id: conflict.id } });
      } else {
        dispatch({ type: "ADD_RATE", payload });
      }
    }
    setRateForm({ centerId: "", subjectId: "", standardId: "", ratePerHour: "" });
  };

  const backupData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `tutor_backup_${new Date().toISOString().slice(0, 10)}.json`; a.click();
  };

  const restoreData = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = ".json";
    inp.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          dispatch({ type: "SET_DB", payload: { ...defaultDB, ...data } });
        } catch { alert("Invalid backup file"); }
      };
      reader.readAsText(file);
    };
    inp.click();
  };

  const tabs = [
    { id: "general", label: "General" },
    { id: "centers", label: "Centers" },
    { id: "subjects", label: "Subjects" },
    { id: "standards", label: "Standards" },
    { id: "rates", label: "Rate Rules" },
    { id: "data", label: "Data" },
  ];

  return (
    <div className="page">
      <div className="page-header"><h1>Settings</h1></div>

      <div className="settings-tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === "general" && (
        <div className="card">
          <label className="field">
            <span>Tutor Name</span>
            <input className="input" value={state.settings.tutorName} onChange={e => dispatch({ type: "UPDATE_SETTINGS", payload: { tutorName: e.target.value } })} />
          </label>
        </div>
      )}

      {tab === "centers" && (
        <div className="card">
          <div className="inline-add">
            <input className="input" placeholder="Center name" value={input.center || ""} onChange={e => setInput(i => ({ ...i, center: e.target.value }))} onKeyDown={e => e.key === "Enter" && addItem("ADD_CENTER", "center")} />
            <button className="btn btn-primary" onClick={() => addItem("ADD_CENTER", "center")}>{Icons.plus({ size: 16 })} Add</button>
          </div>
          <div className="chip-list">
            {state.centers.map(c => <Chip key={c.id} label={c.name} onDelete={() => setDelTarget({ type: "DEL_CENTER", id: c.id, name: c.name })} />)}
          </div>
          {state.centers.length === 0 && <p className="muted">No centers added yet.</p>}
        </div>
      )}

      {tab === "subjects" && (
        <div className="card">
          <div className="inline-add">
            <input className="input" placeholder="Subject name" value={input.subject || ""} onChange={e => setInput(i => ({ ...i, subject: e.target.value }))} onKeyDown={e => e.key === "Enter" && addItem("ADD_SUBJECT", "subject")} />
            <button className="btn btn-primary" onClick={() => addItem("ADD_SUBJECT", "subject")}>{Icons.plus({ size: 16 })} Add</button>
          </div>
          <div className="chip-list">
            {state.subjects.map(s => <Chip key={s.id} label={s.name} onDelete={() => setDelTarget({ type: "DEL_SUBJECT", id: s.id, name: s.name })} />)}
          </div>
          {state.subjects.length === 0 && <p className="muted">No subjects added yet.</p>}
        </div>
      )}

      {tab === "standards" && (
        <div className="card">
          <div className="inline-add">
            <input className="input" placeholder="Standard / Grade (e.g. Std 10)" value={input.standard || ""} onChange={e => setInput(i => ({ ...i, standard: e.target.value }))} onKeyDown={e => e.key === "Enter" && addItem("ADD_STANDARD", "standard")} />
            <button className="btn btn-primary" onClick={() => addItem("ADD_STANDARD", "standard")}>{Icons.plus({ size: 16 })} Add</button>
          </div>
          <div className="chip-list">
            {state.standards.map(s => <Chip key={s.id} label={s.name} onDelete={() => setDelTarget({ type: "DEL_STANDARD", id: s.id, name: s.name })} />)}
          </div>
          {state.standards.length === 0 && <p className="muted">No standards added yet.</p>}
        </div>
      )}

      {tab === "rates" && (
        <div className="card">
          <div className="rate-form">
            <Select value={rateForm.centerId} onChange={v => setRateForm(f => ({ ...f, centerId: v }))} options={state.centers.map(c => ({ value: c.id, label: c.name }))} placeholder="Any Center" allowEmpty />
            <Select value={rateForm.subjectId} onChange={v => setRateForm(f => ({ ...f, subjectId: v }))} options={state.subjects.map(s => ({ value: s.id, label: s.name }))} placeholder="Any Subject" allowEmpty />
            <Select value={rateForm.standardId} onChange={v => setRateForm(f => ({ ...f, standardId: v }))} options={state.standards.map(s => ({ value: s.id, label: s.name }))} placeholder="Any Standard" allowEmpty />
            <input className="input" type="number" placeholder="₹ Rate/hr" value={rateForm.ratePerHour} onChange={e => setRateForm(f => ({ ...f, ratePerHour: e.target.value }))} />
            <button className="btn btn-primary" onClick={saveRate}>{editRateId ? "Update" : "Add"}</button>
            {editRateId && <button className="btn btn-ghost" onClick={() => { setEditRateId(null); setRateForm({ centerId: "", subjectId: "", standardId: "", ratePerHour: "" }); }}>Cancel</button>}
          </div>
          {state.rateRules.length > 0 ? (
            <div className="table-wrap" style={{ marginTop: 16 }}>
              <table>
                <thead><tr><th>Center</th><th>Subject</th><th>Standard</th><th>Rate/hr</th><th></th></tr></thead>
                <tbody>
                  {state.rateRules.map(r => (
                    <tr key={r.id}>
                      <td>{getName(state.centers, r.centerId)}</td>
                      <td>{getName(state.subjects, r.subjectId)}</td>
                      <td>{getName(state.standards, r.standardId)}</td>
                      <td><strong>{fmt(r.ratePerHour)}</strong></td>
                      <td>
                        <div style={{ display: "flex", gap: 4 }}>
                          <button className="btn-icon" onClick={() => { setEditRateId(r.id); setRateForm({ centerId: r.centerId, subjectId: r.subjectId, standardId: r.standardId, ratePerHour: r.ratePerHour }); }}>{Icons.edit({ size: 16 })}</button>
                          <button className="btn-icon" onClick={() => setDelTarget({ type: "DEL_RATE", id: r.id, name: "this rate rule" })}>{Icons.trash({ size: 16 })}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="muted" style={{ marginTop: 12 }}>No rate rules configured. Add centers, subjects, and standards first, then define rates.</p>}
        </div>
      )}

      {tab === "data" && (
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Backup & Restore</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" onClick={backupData}>{Icons.download({ size: 16 })} Export Backup</button>
            <button className="btn btn-ghost" onClick={restoreData}>{Icons.backup({ size: 16 })} Import Backup</button>
          </div>
          <p className="muted" style={{ marginTop: 12 }}>Export saves all your data as a JSON file. Import restores from a previously exported file.</p>
        </div>
      )}

      <ConfirmDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={() => delTarget && dispatch({ type: delTarget.type, payload: delTarget.id })}
        message={`Delete "${delTarget?.name}"? This cannot be undone.`}
      />
    </div>
  );
};

// ─── MAIN APP ───
export default function App() {
  const [state, dispatch] = useReducer(reducer, null, loadDB);
  const [page, setPage] = useState("dashboard");
  const isDark = state.settings.theme === "dark";

  const toggleTheme = () => dispatch({ type: "UPDATE_SETTINGS", payload: { theme: isDark ? "light" : "dark" } });

  const navItems = [
    { id: "dashboard", label: "Home", icon: Icons.home },
    { id: "sessions", label: "Sessions", icon: Icons.calendar },
    { id: "reports", label: "Reports", icon: Icons.report },
    { id: "settings", label: "Settings", icon: Icons.settings },
  ];

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className={`app-root ${isDark ? "dark" : "light"}`}>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

          .app-root {
            --font: 'DM Sans', sans-serif;
            --mono: 'JetBrains Mono', monospace;
            --radius: 10px;
            --green: #22c55e;
            --blue: #3b82f6;
            --amber: #f59e0b;
            --red: #ef4444;
            --transition: 0.2s ease;
            font-family: var(--font);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
          }

          .app-root.light {
            --bg: #f8f7f4;
            --bg2: #ffffff;
            --bg3: #f0efe9;
            --fg: #1a1a2e;
            --fg2: #555;
            --border: #e4e2db;
            --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
            --shadow-lg: 0 10px 25px rgba(0,0,0,0.08);
            background: var(--bg);
            color: var(--fg);
          }

          .app-root.dark {
            --bg: #0f0f17;
            --bg2: #1a1a28;
            --bg3: #252538;
            --fg: #e8e6e1;
            --fg2: #999;
            --border: #2a2a3e;
            --shadow: 0 1px 3px rgba(0,0,0,0.3);
            --shadow-lg: 0 10px 25px rgba(0,0,0,0.4);
            background: var(--bg);
            color: var(--fg);
          }

          /* ─── TOP BAR ─── */
          .topbar {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 20px;
            background: var(--bg2);
            border-bottom: 1px solid var(--border);
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .topbar-brand {
            font-weight: 700;
            font-size: 17px;
            letter-spacing: -0.3px;
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .topbar-brand .dot {
            width: 8px; height: 8px;
            background: var(--green);
            border-radius: 50%;
            display: inline-block;
          }
          .theme-toggle {
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 6px 10px;
            cursor: pointer;
            color: var(--fg);
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            font-family: var(--font);
            transition: var(--transition);
          }
          .theme-toggle:hover { background: var(--border); }

          /* ─── BOTTOM NAV ─── */
          .bottom-nav {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: var(--bg2);
            border-top: 1px solid var(--border);
            display: flex;
            z-index: 100;
            padding-bottom: env(safe-area-inset-bottom, 0);
          }
          .nav-item {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 8px 0 6px;
            gap: 2px;
            background: none;
            border: none;
            color: var(--fg2);
            cursor: pointer;
            font-family: var(--font);
            font-size: 11px;
            font-weight: 500;
            transition: var(--transition);
          }
          .nav-item.active { color: var(--blue); }
          .nav-item:hover { color: var(--fg); }

          /* ─── PAGE ─── */
          .main-content {
            flex: 1;
            padding-bottom: 72px;
          }
          .page {
            max-width: 900px;
            margin: 0 auto;
            padding: 20px 16px;
          }
          .page-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 20px;
            flex-wrap: wrap;
            gap: 12px;
          }
          .page-header h1 {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.5px;
          }

          /* ─── CARD ─── */
          .card {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
          }
          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--fg2);
          }

          /* ─── STATS ─── */
          .stat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
          }
          .stat-card {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 16px 20px;
            display: flex;
            flex-direction: column;
            gap: 4px;
            box-shadow: var(--shadow);
            position: relative;
            overflow: hidden;
          }
          .stat-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 4px; height: 100%;
          }
          .stat-card.accent-green::before { background: var(--green); }
          .stat-card.accent-blue::before { background: var(--blue); }
          .stat-card.accent-amber::before { background: var(--amber); }
          .stat-label { font-size: 12px; color: var(--fg2); font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
          .stat-value { font-size: 24px; font-weight: 700; font-family: var(--mono); letter-spacing: -0.5px; }

          /* ─── TABLE ─── */
          .table-wrap { overflow-x: auto; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--fg2); border-bottom: 2px solid var(--border); font-weight: 600; white-space: nowrap; }
          td { padding: 10px 12px; border-bottom: 1px solid var(--border); white-space: nowrap; }
          .total-row td { font-weight: 700; border-top: 2px solid var(--border); background: var(--bg3); }

          /* ─── STATUS ─── */
          .status-badge {
            font-size: 11px;
            font-weight: 600;
            padding: 3px 10px;
            border-radius: 12px;
            text-transform: capitalize;
          }

          /* ─── FORMS ─── */
          .input {
            width: 100%;
            padding: 9px 12px;
            background: var(--bg);
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--fg);
            font-family: var(--font);
            font-size: 14px;
            transition: var(--transition);
            outline: none;
          }
          .input:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
          select.input { cursor: pointer; }

          .field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .field > span {
            font-size: 12px;
            font-weight: 600;
            color: var(--fg2);
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }

          .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            padding: 8px 0;
          }
          @media (max-width: 500px) { .form-grid { grid-template-columns: 1fr; } }

          .filter-bar {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
          }
          .filter-bar .field { min-width: 140px; flex: 1; }

          .inline-add {
            display: flex;
            gap: 8px;
            margin-bottom: 16px;
          }
          .inline-add .input { flex: 1; }

          .rate-form {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            align-items: flex-end;
          }
          .rate-form > * { flex: 1; min-width: 120px; }

          .rate-preview {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 0;
            font-size: 14px;
            color: var(--fg2);
          }
          .amount-preview { font-weight: 700; font-family: var(--mono); color: var(--green); font-size: 16px; }

          /* ─── BUTTONS ─── */
          .btn {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            font-family: var(--font);
            font-size: 13px;
            font-weight: 600;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            transition: var(--transition);
            white-space: nowrap;
          }
          .btn-primary { background: var(--blue); color: white; }
          .btn-primary:hover { filter: brightness(1.1); }
          .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
          .btn-ghost { background: var(--bg3); color: var(--fg); border: 1px solid var(--border); }
          .btn-ghost:hover { background: var(--border); }
          .btn-danger { background: var(--red); color: white; }
          .btn-danger:hover { filter: brightness(1.1); }
          .btn-icon {
            background: none;
            border: none;
            color: var(--fg2);
            cursor: pointer;
            padding: 4px;
            border-radius: 6px;
            transition: var(--transition);
          }
          .btn-icon:hover { color: var(--fg); background: var(--bg3); }

          /* ─── CHIPS ─── */
          .chip-list { display: flex; flex-wrap: wrap; gap: 8px; }
          .chip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: var(--bg3);
            border: 1px solid var(--border);
            border-radius: 20px;
            font-size: 13px;
            font-weight: 500;
          }
          .chip-del {
            background: none; border: none; cursor: pointer;
            color: var(--fg2); display: flex; padding: 0;
            transition: var(--transition);
          }
          .chip-del:hover { color: var(--red); }

          /* ─── SETTINGS TABS ─── */
          .settings-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            overflow-x: auto;
            padding-bottom: 4px;
          }
          .tab-btn {
            padding: 7px 14px;
            font-family: var(--font);
            font-size: 13px;
            font-weight: 500;
            border: 1px solid var(--border);
            background: var(--bg2);
            border-radius: 8px;
            cursor: pointer;
            color: var(--fg2);
            transition: var(--transition);
            white-space: nowrap;
          }
          .tab-btn.active { background: var(--blue); color: white; border-color: var(--blue); }
          .tab-btn:hover:not(.active) { background: var(--bg3); }

          /* ─── MODAL ─── */
          .modal-overlay {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 200;
            padding: 16px;
            backdrop-filter: blur(4px);
          }
          .modal-content {
            background: var(--bg2);
            border: 1px solid var(--border);
            border-radius: 14px;
            width: 100%;
            max-width: 520px;
            max-height: 90vh;
            overflow-y: auto;
            padding: 20px;
            box-shadow: var(--shadow-lg);
          }
          .modal-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 12px;
          }
          .modal-header h3 { font-size: 17px; font-weight: 700; }
          .modal-actions {
            display: flex;
            gap: 8px;
            justify-content: flex-end;
            padding-top: 12px;
          }

          .muted { color: var(--fg2); font-size: 13px; }

          /* Scrollbar */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        `}</style>

        <header className="topbar">
          <div className="topbar-brand"><span className="dot" /> TutorBill</div>
          <button className="theme-toggle" onClick={toggleTheme}>
            {isDark ? Icons.sun({ size: 16 }) : Icons.moon({ size: 16 })}
            {isDark ? "Light" : "Dark"}
          </button>
        </header>

        <main className="main-content">
          {page === "dashboard" && <Dashboard />}
          {page === "sessions" && <Sessions />}
          {page === "reports" && <Reports />}
          {page === "settings" && <SettingsPage />}
        </main>

        <nav className="bottom-nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
              {item.icon({ size: 20 })}
              {item.label}
            </button>
          ))}
        </nav>
      </div>
    </AppContext.Provider>
  );
}
