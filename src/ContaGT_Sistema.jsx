import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ─── UTILIDADES ────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtQ = (n) => `Q ${fmt(n)}`;
const today = () => { const d = new Date(); return `${d.getDate().toString().padStart(2,"0")}/${(d.getMonth()+1).toString().padStart(2,"0")}/${d.getFullYear()}`; };
const toNum = (v) => parseFloat((v+"").replace(/[^0-9.-]/g,"")) || 0;

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

const IVA_RATE = 0.12;
const ISO_RATE = 0.01;
const ISR_RATE_EMPRESA = 0.25;

// ─── COLORES / TEMA ────────────────────────────────────────────────────────────
const C = {
  bg: "#0B0F1A",
  surface: "#111827",
  card: "#1A2235",
  border: "#1E2D45",
  accent: "#00D4AA",
  accentDim: "#00D4AA22",
  accentSoft: "#00D4AA44",
  gold: "#F5A623",
  goldDim: "#F5A62322",
  red: "#FF4D6D",
  redDim: "#FF4D6D22",
  blue: "#4A9FFF",
  blueDim: "#4A9FFF22",
  text: "#E8EDF5",
  textMid: "#8896AB",
  textDim: "#4A5568",
};

// ─── CLAUDE API ───────────────────────────────────────────────────────────────
async function askClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `Eres un contador experto en tributación guatemalteca. Conoces perfectamente la SAT, el ISR (Decreto 10-2012), IVA (Decreto 27-92), ISO (Decreto 99-98), libros contables, formularios SAT-1311, SAT-2800, SAT-1361. Responde en español, de forma precisa y concisa. Cuando des cifras úsalas correctamente.`,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Sin respuesta";
}

// ─── COMPONENTES BÁSICOS ──────────────────────────────────────────────────────
const Badge = ({ children, color = C.accent }) => (
  <span style={{ background: color + "22", color, border: `1px solid ${color}44`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>
    {children}
  </span>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, color = C.accent, disabled, small, icon }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: disabled ? C.surface : color + "18",
    border: `1px solid ${disabled ? C.border : color + "55"}`,
    color: disabled ? C.textDim : color,
    borderRadius: 8, padding: small ? "6px 14px" : "10px 20px",
    fontSize: small ? 12 : 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", gap: 6, transition: "all 0.2s",
    letterSpacing: 0.3,
  }}>
    {icon && <span style={{ fontSize: small ? 14 : 16 }}>{icon}</span>}
    {children}
  </button>
);

const Divider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
    <div style={{ flex: 1, height: 1, background: C.border }} />
    {label && <span style={{ color: C.textDim, fontSize: 11, letterSpacing: 1, textTransform: "uppercase" }}>{label}</span>}
    <div style={{ flex: 1, height: 1, background: C.border }} />
  </div>
);

const StatBox = ({ label, value, color = C.accent, sub }) => (
  <div style={{ background: color + "10", border: `1px solid ${color}30`, borderRadius: 10, padding: "16px 20px" }}>
    <div style={{ color: C.textMid, fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ color, fontSize: 22, fontWeight: 800, fontFamily: "monospace" }}>{value}</div>
    {sub && <div style={{ color: C.textDim, fontSize: 11, marginTop: 4 }}>{sub}</div>}
  </div>
);

// ─── PARSER DE EXCEL ─────────────────────────────────────────────────────────
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(raw);
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
}

// Normaliza filas de compras/ventas detectando columnas automáticamente
function normalizeRows(rows, tipo) {
  if (!rows.length) return [];
  const keys = Object.keys(rows[0]).map(k => k.toLowerCase().trim());

  const find = (...opts) => {
    for (const o of opts) {
      const idx = keys.findIndex(k => k.includes(o));
      if (idx !== -1) return Object.keys(rows[0])[idx];
    }
    return null;
  };

  const colFecha   = find("fecha","date","day");
  const colDoc     = find("factura","doc","numero","nit","serie","no.");
  const colProveedor = tipo === "compras" ? find("proveedor","nombre","razon","empresa") : find("cliente","nombre","razon","empresa");
  const colNIT     = find("nit","rtu","id","identificación");
  const colBase    = find("base","monto neto","subtotal","valor sin iva","neto");
  const colIVA     = find("iva","impuesto","tax");
  const colTotal   = find("total","monto total","valor total","gran total");
  const colDesc    = find("descripcion","concepto","detalle","producto","servicio");

  return rows.map((r, i) => {
    let base = toNum(r[colBase]);
    let iva  = toNum(r[colIVA]);
    let total = toNum(r[colTotal]);

    // Auto-calcular lo que falte
    if (!base && !iva && total) { base = total / 1.12; iva = total - base; }
    else if (base && !iva && !total) { iva = base * 0.12; total = base + iva; }
    else if (base && !iva && total) { iva = total - base; }
    else if (!base && iva && total) { base = total - iva; }

    return {
      id: i + 1,
      fecha:     r[colFecha]     || today(),
      documento: r[colDoc]       || `${tipo.toUpperCase()}-${String(i+1).padStart(4,"0")}`,
      nombre:    r[colProveedor] || r[colNIT] || "Sin nombre",
      nit:       r[colNIT]       || "CF",
      base:      Math.round(base * 100) / 100,
      iva:       Math.round(iva  * 100) / 100,
      total:     Math.round(total * 100) / 100,
      descripcion: r[colDesc]    || "Operación comercial",
    };
  }).filter(r => r.total > 0 || r.base > 0);
}

// ─── TABS ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "dashboard",  label: "Dashboard",        icon: "⬡" },
  { id: "datos",      label: "Empresa",           icon: "🏢" },
  { id: "carga",      label: "Cargar Datos",      icon: "📂" },
  { id: "libros",     label: "Libros Contables",  icon: "📚" },
  { id: "iva",        label: "Formulario IVA",    icon: "📋" },
  { id: "isr",        label: "Formulario ISR",    icon: "📊" },
  { id: "iso",        label: "Formulario ISO",    icon: "📈" },
  { id: "inventario", label: "Inventario",        icon: "📦" },
  { id: "asistente",  label: "Asistente IA",      icon: "🤖" },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export default function ContaGT() {
  const [tab, setTab] = useState("dashboard");
  const [empresa, setEmpresa] = useState({ nombre: "", nit: "", direccion: "", actividad: "", regimen: "general", contador: "", colegiado: "" });
  const [compras, setCompras] = useState([]);
  const [ventas, setVentas]   = useState([]);
  const [inventario, setInventario] = useState([]);
  const [periodo, setPeriodo] = useState({ mes: new Date().getMonth(), anio: new Date().getFullYear() });
  const [loading, setLoading] = useState("");
  const [certified, setCertified] = useState(false);
  const [certDate, setCertDate] = useState("");
  const [aiChat, setAiChat] = useState([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const chatRef = useRef(null);

  // ─── TOTALES ────────────────────────────────────────────────────────────────
  const totCompras = {
    base:  compras.reduce((s,r) => s + r.base, 0),
    iva:   compras.reduce((s,r) => s + r.iva,  0),
    total: compras.reduce((s,r) => s + r.total,0),
  };
  const totVentas = {
    base:  ventas.reduce((s,r) => s + r.base, 0),
    iva:   ventas.reduce((s,r) => s + r.iva,  0),
    total: ventas.reduce((s,r) => s + r.total,0),
  };
  const ivaAPagar    = Math.max(0, totVentas.iva - totCompras.iva);
  const ivaCF        = Math.max(0, totCompras.iva - totVentas.iva);
  const utilidadBruta = totVentas.base - totCompras.base;
  const isrEstimado  = Math.max(0, utilidadBruta * ISR_RATE_EMPRESA);
  const isoEstimado  = totVentas.total * ISO_RATE;

  // ─── CARGA ARCHIVOS ──────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file, tipo) => {
    if (!file) return;
    setLoading(tipo);
    try {
      const rows = await parseExcel(file);
      const norm = normalizeRows(rows, tipo);
      if (tipo === "compras") setCompras(norm);
      else if (tipo === "ventas") setVentas(norm);
      else if (tipo === "inventario") setInventario(rows);
    } catch (e) { alert("Error al leer el archivo: " + e.message); }
    setLoading("");
  }, []);

  // ─── CERTIFICAR ─────────────────────────────────────────────────────────────
  const certificar = () => {
    if (!empresa.contador) { alert("Ingresa el nombre del contador antes de certificar."); return; }
    setCertified(true);
    setCertDate(today());
    alert(`✅ Declaración certificada por ${empresa.contador} el ${today()}`);
  };

  // ─── IA CHAT ────────────────────────────────────────────────────────────────
  const sendAI = async () => {
    if (!aiInput.trim() || aiLoading) return;
    const context = `Empresa: ${empresa.nombre || "sin nombre"} | NIT: ${empresa.nit || "sin NIT"} | Régimen: ${empresa.regimen}
Período: ${MESES[periodo.mes]} ${periodo.anio}
Compras: Base Q${fmt(totCompras.base)}, IVA Q${fmt(totCompras.iva)}, Total Q${fmt(totCompras.total)}
Ventas: Base Q${fmt(totVentas.base)}, IVA Q${fmt(totVentas.iva)}, Total Q${fmt(totVentas.total)}
IVA a pagar: Q${fmt(ivaAPagar)} | CF: Q${fmt(ivaCF)}
ISR estimado: Q${fmt(isrEstimado)} | ISO estimado: Q${fmt(isoEstimado)}`;
    const msg = { role: "user", text: aiInput };
    setAiChat(c => [...c, msg]);
    setAiInput("");
    setAiLoading(true);
    try {
      const resp = await askClaude(`CONTEXTO CONTABLE:\n${context}\n\nPREGUNTA DEL CONTADOR: ${aiInput}`);
      setAiChat(c => [...c, { role: "ai", text: resp }]);
    } catch { setAiChat(c => [...c, { role: "ai", text: "Error al conectar con el asistente." }]); }
    setAiLoading(false);
    setTimeout(() => chatRef.current?.scrollTo({ top: 9999, behavior: "smooth" }), 100);
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* HEADER */}
      <header style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 28px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>⬡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.3 }}>ContaGT <span style={{ color: C.accent }}>Pro</span></div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 0.5 }}>SISTEMA TRIBUTARIO GUATEMALTECO</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select value={periodo.mes} onChange={e => setPeriodo(p=>({...p, mes: +e.target.value}))}
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
            {MESES.map((m,i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={periodo.anio} onChange={e => setPeriodo(p=>({...p, anio: +e.target.value}))}
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, borderRadius: 6, padding: "4px 10px", fontSize: 12 }}>
            {[2023,2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          {certified && <Badge color={C.accent}>✓ CERTIFICADO</Badge>}
          <Badge color={empresa.regimen === "pequenio" ? C.gold : C.blue}>{empresa.regimen === "pequenio" ? "PEQUEÑO CONTRIBUYENTE" : "RÉGIMEN GENERAL"}</Badge>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1 }}>
        {/* SIDEBAR */}
        <nav style={{ width: 200, background: C.surface, borderRight: `1px solid ${C.border}`, padding: "16px 0", flexShrink: 0, position: "sticky", top: 60, height: "calc(100vh - 60px)", overflowY: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
              background: tab === t.id ? C.accent + "18" : "transparent",
              borderLeft: tab === t.id ? `3px solid ${C.accent}` : "3px solid transparent",
              border: "none", borderRight: "none",
              color: tab === t.id ? C.accent : C.textMid,
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400, cursor: "pointer",
              textAlign: "left", transition: "all 0.15s",
            }}>
              <span style={{ fontSize: 15 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
          <div style={{ margin: "20px 12px 8px", padding: 12, background: C.accentDim, borderRadius: 8, border: `1px solid ${C.accentSoft}` }}>
            <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, letterSpacing: 0.5, marginBottom: 4 }}>DATOS CARGADOS</div>
            <div style={{ fontSize: 12, color: C.textMid }}>📥 Compras: <b style={{color:C.text}}>{compras.length}</b></div>
            <div style={{ fontSize: 12, color: C.textMid }}>📤 Ventas: <b style={{color:C.text}}>{ventas.length}</b></div>
          </div>
        </nav>

        {/* CONTENT */}
        <main style={{ flex: 1, padding: 28, overflowY: "auto", maxWidth: 1100 }}>

          {/* ── DASHBOARD ─────────────────────────────────────────── */}
          {tab === "dashboard" && (
            <div>
              <div style={{ marginBottom: 24 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Panel Principal</h1>
                <p style={{ color: C.textMid, margin: "4px 0 0", fontSize: 13 }}>
                  {empresa.nombre || "Sin empresa configurada"} — {MESES[periodo.mes]} {periodo.anio}
                </p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
                <StatBox label="Total Ventas" value={fmtQ(totVentas.total)} color={C.accent} sub={`Base: ${fmtQ(totVentas.base)}`} />
                <StatBox label="Total Compras" value={fmtQ(totCompras.total)} color={C.blue} sub={`Base: ${fmtQ(totCompras.base)}`} />
                <StatBox label="IVA a Pagar" value={fmtQ(ivaAPagar)} color={ivaCF > 0 ? C.gold : C.red} sub={ivaCF > 0 ? `CF: ${fmtQ(ivaCF)}` : "SAT-1311"} />
                <StatBox label="ISR Estimado" value={fmtQ(isrEstimado)} color={C.gold} sub={`ISO: ${fmtQ(isoEstimado)}`} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <Card>
                  <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14, color: C.accent }}>📊 Resumen IVA — {MESES[periodo.mes]}</div>
                  {[
                    ["Débito Fiscal (Ventas)", totVentas.iva, C.accent],
                    ["Crédito Fiscal (Compras)", totCompras.iva, C.blue],
                    ["IVA a Pagar / CF", ivaAPagar > 0 ? ivaAPagar : -ivaCF, ivaAPagar > 0 ? C.red : C.gold],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.textMid, fontSize: 13 }}>{l}</span>
                      <span style={{ color: c, fontWeight: 700, fontFamily: "monospace" }}>{fmtQ(Math.abs(v))}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16 }}>
                    <Btn onClick={() => setTab("iva")} small icon="📋">Ver Formulario IVA</Btn>
                  </div>
                </Card>
                <Card>
                  <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14, color: C.gold }}>💼 Resumen ISR / ISO</div>
                  {[
                    ["Ingresos Brutos", totVentas.total, C.accent],
                    ["Costos / Deducciones", totCompras.total, C.blue],
                    ["Utilidad Estimada", utilidadBruta, utilidadBruta >= 0 ? C.accent : C.red],
                    ["ISR (25%)", isrEstimado, C.gold],
                    ["ISO (1% ingresos)", isoEstimado, C.gold],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                      <span style={{ color: C.textMid, fontSize: 13 }}>{l}</span>
                      <span style={{ color: c, fontWeight: 700, fontFamily: "monospace" }}>{fmtQ(v)}</span>
                    </div>
                  ))}
                </Card>
              </div>

              {compras.length === 0 && ventas.length === 0 && (
                <Card style={{ marginTop: 20, textAlign: "center", padding: 40, borderStyle: "dashed" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Sin datos cargados</div>
                  <div style={{ color: C.textMid, marginBottom: 16 }}>Sube tus archivos Excel/CSV de compras y ventas para comenzar</div>
                  <Btn onClick={() => setTab("carga")} icon="📂">Cargar Archivos</Btn>
                </Card>
              )}
            </div>
          )}

          {/* ── DATOS EMPRESA ─────────────────────────────────────── */}
          {tab === "datos" && (
            <div>
              <h2 style={{ fontWeight: 800, marginBottom: 20 }}>🏢 Datos de la Empresa</h2>
              <Card>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                  {[
                    ["Razón Social / Nombre", "nombre", "text"],
                    ["NIT", "nit", "text"],
                    ["Dirección Fiscal", "direccion", "text"],
                    ["Actividad Económica", "actividad", "text"],
                    ["Nombre del Contador", "contador", "text"],
                    ["Número de Colegiado", "colegiado", "text"],
                  ].map(([label, key, type]) => (
                    <div key={key}>
                      <label style={{ fontSize: 11, color: C.textMid, display: "block", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>
                      <input type={type} value={empresa[key]} onChange={e => setEmpresa(p=>({...p,[key]:e.target.value}))}
                        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "10px 14px", fontSize: 13, boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 11, color: C.textMid, display: "block", marginBottom: 6, letterSpacing: 0.5, textTransform: "uppercase" }}>Régimen Tributario</label>
                    <select value={empresa.regimen} onChange={e => setEmpresa(p=>({...p, regimen: e.target.value}))}
                      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "10px 14px", fontSize: 13 }}>
                      <option value="general">Régimen General (ISR 25%)</option>
                      <option value="pequenio">Pequeño Contribuyente (IVA 5%)</option>
                      <option value="opcional">Régimen Opcional Simplificado</option>
                    </select>
                  </div>
                </div>
                <Divider />
                <div style={{ display: "flex", gap: 10 }}>
                  <Btn onClick={() => alert("Datos guardados ✓")} icon="💾">Guardar Datos</Btn>
                  <Btn onClick={() => setTab("carga")} color={C.blue} icon="📂">Ir a Cargar Archivos</Btn>
                </div>
              </Card>
            </div>
          )}

          {/* ── CARGA DE ARCHIVOS ─────────────────────────────────── */}
          {tab === "carga" && (
            <div>
              <h2 style={{ fontWeight: 800, marginBottom: 8 }}>📂 Cargar Archivos</h2>
              <p style={{ color: C.textMid, marginBottom: 24, fontSize: 13 }}>Sube tus Excel o CSV. El sistema detecta las columnas automáticamente.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                {[
                  { tipo: "compras", label: "Libro de Compras", icon: "📥", color: C.blue, data: compras },
                  { tipo: "ventas",  label: "Libro de Ventas",  icon: "📤", color: C.accent, data: ventas },
                ].map(({ tipo, label, icon, color, data }) => (
                  <DropZone key={tipo} label={label} icon={icon} color={color} count={data.length}
                    loading={loading === tipo} onFile={f => handleFile(f, tipo)} />
                ))}
              </div>
              <Card>
                <div style={{ fontWeight: 700, marginBottom: 12, color: C.gold }}>📦 Inventario (opcional)</div>
                <DropZone label="Inventario de Productos" icon="📦" color={C.gold} count={inventario.length}
                  loading={loading === "inventario"} onFile={f => handleFile(f, "inventario")} />
              </Card>

              {(compras.length > 0 || ventas.length > 0) && (
                <Card style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 700, marginBottom: 12, color: C.accent }}>✅ Datos Cargados — Vista Previa</div>
                  {compras.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, color: C.blue, fontWeight: 700, marginBottom: 8 }}>COMPRAS ({compras.length} registros)</div>
                      <MiniTable rows={compras.slice(0, 5)} color={C.blue} />
                    </div>
                  )}
                  {ventas.length > 0 && (
                    <div>
                      <div style={{ fontSize: 12, color: C.accent, fontWeight: 700, marginBottom: 8 }}>VENTAS ({ventas.length} registros)</div>
                      <MiniTable rows={ventas.slice(0, 5)} color={C.accent} />
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* ── LIBROS CONTABLES ──────────────────────────────────── */}
          {tab === "libros" && (
            <div>
              <h2 style={{ fontWeight: 800, marginBottom: 8 }}>📚 Libros Contables</h2>
              <p style={{ color: C.textMid, marginBottom: 20, fontSize: 13 }}>Generados automáticamente según Decreto 27-92 y disposiciones SAT.</p>
              <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                <Btn onClick={() => setTab("libros")} color={C.blue} small>Libro de Compras</Btn>
                <Btn onClick={() => setTab("libros")} color={C.accent} small>Libro de Ventas</Btn>
              </div>
              <LibroContable tipo="compras" rows={compras} totales={totCompras} periodo={periodo} empresa={empresa} />
              <div style={{ height: 24 }} />
              <LibroContable tipo="ventas" rows={ventas} totales={totVentas} periodo={periodo} empresa={empresa} />
            </div>
          )}

          {/* ── FORMULARIO IVA ────────────────────────────────────── */}
          {tab === "iva" && (
            <FormularioIVA compras={compras} ventas={ventas} totC={totCompras} totV={totVentas}
              ivaAPagar={ivaAPagar} ivaCF={ivaCF} empresa={empresa} periodo={periodo}
              certified={certified} certDate={certDate} onCertify={certificar} />
          )}

          {/* ── FORMULARIO ISR ────────────────────────────────────── */}
          {tab === "isr" && (
            <FormularioISR totVentas={totVentas} totCompras={totCompras} utilidad={utilidadBruta}
              isr={isrEstimado} empresa={empresa} periodo={periodo}
              certified={certified} certDate={certDate} onCertify={certificar} />
          )}

          {/* ── FORMULARIO ISO ────────────────────────────────────── */}
          {tab === "iso" && (
            <FormularioISO totVentas={totVentas} iso={isoEstimado} empresa={empresa} periodo={periodo}
              certified={certified} certDate={certDate} onCertify={certificar} />
          )}

          {/* ── INVENTARIO ────────────────────────────────────────── */}
          {tab === "inventario" && (
            <div>
              <h2 style={{ fontWeight: 800, marginBottom: 20 }}>📦 Control de Inventario</h2>
              {inventario.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 40, borderStyle: "dashed" }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>Sin inventario cargado</div>
                  <Btn onClick={() => setTab("carga")} icon="📂">Cargar Inventario</Btn>
                </Card>
              ) : (
                <Card>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {Object.keys(inventario[0]).map(k => (
                            <th key={k} style={{ textAlign: "left", padding: "8px 12px", background: C.surface, color: C.textMid, borderBottom: `1px solid ${C.border}`, fontSize: 10, letterSpacing: 0.5 }}>{k.toUpperCase()}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {inventario.slice(0, 50).map((r, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.surface + "66" }}>
                            {Object.values(r).map((v, j) => (
                              <td key={j} style={{ padding: "7px 12px", borderBottom: `1px solid ${C.border}22`, color: C.text }}>{String(v)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inventario.length > 50 && <div style={{ padding: 12, color: C.textMid, fontSize: 12 }}>... y {inventario.length - 50} registros más</div>}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── ASISTENTE IA ──────────────────────────────────────── */}
          {tab === "asistente" && (
            <div>
              <h2 style={{ fontWeight: 800, marginBottom: 8 }}>🤖 Asistente Tributario IA</h2>
              <p style={{ color: C.textMid, marginBottom: 20, fontSize: 13 }}>Experto en SAT Guatemala. Conoce tus datos contables del período.</p>
              <Card style={{ display: "flex", flexDirection: "column", height: 520 }}>
                <div ref={chatRef} style={{ flex: 1, overflowY: "auto", paddingRight: 4, marginBottom: 16 }}>
                  {aiChat.length === 0 && (
                    <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
                      <div>Pregunta sobre IVA, ISR, ISO, declaraciones, libros contables, plazos SAT...</div>
                      <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                        {["¿Cuándo vence el IVA mensual?","¿Qué es el crédito fiscal?","¿Cómo calcular el ISO?","¿Qué documentos necesito para la declaración anual?"].map(s => (
                          <button key={s} onClick={() => { setAiInput(s); }} style={{ background: C.accentDim, border: `1px solid ${C.accentSoft}`, color: C.accent, borderRadius: 20, padding: "6px 14px", fontSize: 12, cursor: "pointer" }}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiChat.map((m, i) => (
                    <div key={i} style={{ marginBottom: 16, display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                      <div style={{
                        maxWidth: "80%", padding: "12px 16px", borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                        background: m.role === "user" ? C.accent + "22" : C.card, border: `1px solid ${m.role === "user" ? C.accentSoft : C.border}`,
                        fontSize: 13, lineHeight: 1.6, color: C.text, whiteSpace: "pre-wrap",
                      }}>
                        {m.role === "ai" && <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 6, letterSpacing: 0.5 }}>🤖 ASISTENTE TRIBUTARIO</div>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div style={{ display: "flex", gap: 8, padding: 12 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, animation: `pulse 1s ${i*0.2}s infinite` }} />)}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAI()}
                    placeholder="Pregunta sobre tributación guatemalteca..." disabled={aiLoading}
                    style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "12px 16px", fontSize: 13, outline: "none" }} />
                  <Btn onClick={sendAI} disabled={aiLoading || !aiInput.trim()} icon="↑">Enviar</Btn>
                </div>
              </Card>
            </div>
          )}

        </main>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        input:focus, select:focus { outline: 1px solid ${C.accent} !important; }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}

// ─── DROPZONE ─────────────────────────────────────────────────────────────────
function DropZone({ label, icon, color, count, loading, onFile }) {
  const ref = useRef();
  const [drag, setDrag] = useState(false);
  const handleDrop = e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); };
  return (
    <div onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={handleDrop}
      onClick={() => ref.current.click()}
      style={{ border: `2px dashed ${drag ? color : C.border}`, borderRadius: 12, padding: 32, textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: drag ? color + "08" : "transparent" }}>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); }} />
      <div style={{ fontSize: 36, marginBottom: 8 }}>{loading ? "⏳" : count > 0 ? "✅" : icon}</div>
      <div style={{ fontWeight: 700, marginBottom: 4, color: count > 0 ? color : C.text }}>{label}</div>
      {loading ? <div style={{ color: C.textMid, fontSize: 12 }}>Procesando...</div>
        : count > 0 ? <div style={{ color: color, fontSize: 12, fontWeight: 700 }}>{count} registros cargados — click para reemplazar</div>
        : <div style={{ color: C.textDim, fontSize: 12 }}>Arrastra tu archivo .xlsx / .csv aquí</div>}
    </div>
  );
}

// ─── MINI TABLE ──────────────────────────────────────────────────────────────
function MiniTable({ rows, color }) {
  if (!rows.length) return null;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
        <thead>
          <tr>{["Fecha","Documento","Nombre / NIT","Base","IVA","Total"].map(h => (
            <th key={h} style={{ textAlign: "left", padding: "6px 10px", background: color + "22", color, fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td style={td}>{r.fecha}</td>
              <td style={td}>{r.documento}</td>
              <td style={td}>{r.nombre}</td>
              <td style={{...td, color, fontFamily:"monospace"}}>{fmt(r.base)}</td>
              <td style={{...td, fontFamily:"monospace"}}>{fmt(r.iva)}</td>
              <td style={{...td, fontFamily:"monospace", fontWeight:700}}>{fmt(r.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
const td = { padding: "6px 10px", borderBottom: `1px solid #1E2D4533`, color: C.text };

// ─── LIBRO CONTABLE ───────────────────────────────────────────────────────────
function LibroContable({ tipo, rows, totales, periodo, empresa }) {
  const color = tipo === "compras" ? C.blue : C.accent;
  const label = tipo === "compras" ? "LIBRO DE COMPRAS" : "LIBRO DE VENTAS";
  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 800, color, fontSize: 14 }}>{label}</div>
          <div style={{ fontSize: 11, color: C.textDim }}>{empresa.nombre || "Empresa"} — {MESES[periodo.mes]} {periodo.anio} — NIT: {empresa.nit || "—"}</div>
        </div>
        <Badge color={color}>{rows.length} registros</Badge>
      </div>
      {rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 24, color: C.textDim, fontSize: 13 }}>Sin registros. Carga el archivo correspondiente.</div>
      ) : (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>{["#","Fecha","No. Factura","Nombre / Razón Social","NIT","Descripción","Base Imponible","IVA","Total"].map(h => (
                  <th key={h} style={{ textAlign: h.includes("Base") || h === "IVA" || h === "Total" ? "right" : "left", padding: "8px 10px", background: color + "18", color, fontSize: 10, letterSpacing: 0.3, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : C.surface + "55" }}>
                    <td style={{...td, color: C.textDim}}>{r.id}</td>
                    <td style={td}>{r.fecha}</td>
                    <td style={td}>{r.documento}</td>
                    <td style={td}>{r.nombre}</td>
                    <td style={td}>{r.nit}</td>
                    <td style={{...td, color: C.textMid}}>{r.descripcion}</td>
                    <td style={{...td, textAlign:"right", fontFamily:"monospace"}}>{fmt(r.base)}</td>
                    <td style={{...td, textAlign:"right", fontFamily:"monospace"}}>{fmt(r.iva)}</td>
                    <td style={{...td, textAlign:"right", fontFamily:"monospace", fontWeight:700, color}}>{fmt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: color + "18" }}>
                  <td colSpan={6} style={{ padding: "10px", fontWeight: 800, color, fontSize: 12 }}>TOTAL {label}</td>
                  <td style={{ padding: "10px", textAlign:"right", fontFamily:"monospace", fontWeight:800, color }}>{fmt(totales.base)}</td>
                  <td style={{ padding: "10px", textAlign:"right", fontFamily:"monospace", fontWeight:800, color }}>{fmt(totales.iva)}</td>
                  <td style={{ padding: "10px", textAlign:"right", fontFamily:"monospace", fontWeight:800, color }}>{fmt(totales.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}

// ─── FORMULARIO IVA ───────────────────────────────────────────────────────────
function FormularioIVA({ totC, totV, ivaAPagar, ivaCF, empresa, periodo, certified, certDate, onCertify }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800, margin: 0 }}>📋 Formulario IVA — SAT-1311</h2>
          <p style={{ color: C.textMid, margin: "4px 0 0", fontSize: 13 }}>Declaración Mensual del IVA — {MESES[periodo.mes]} {periodo.anio}</p>
        </div>
        {certified && <Badge color={C.accent}>✓ CERTIFICADO POR {empresa.contador?.toUpperCase()}</Badge>}
      </div>

      <Card style={{ marginBottom: 20 }}>
        <SatHeader titulo="DECLARACIÓN JURADA DEL IMPUESTO AL VALOR AGREGADO" form="SAT-1311" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <FormField label="NIT" value={empresa.nit || "—"} />
          <FormField label="Razón Social / Nombre" value={empresa.nombre || "—"} />
          <FormField label="Período" value={`${MESES[periodo.mes]} ${periodo.anio}`} />
        </div>
        <Divider label="DÉBITO FISCAL" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="1. Ventas Gravadas (Base Imponible)" value={fmt(totV.base)} highlight={C.accent} />
          <FormField label="2. Débito Fiscal (IVA Ventas 12%)" value={fmt(totV.iva)} highlight={C.accent} />
        </div>
        <Divider label="CRÉDITO FISCAL" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="3. Compras Gravadas (Base Imponible)" value={fmt(totC.base)} highlight={C.blue} />
          <FormField label="4. Crédito Fiscal (IVA Compras 12%)" value={fmt(totC.iva)} highlight={C.blue} />
        </div>
        <Divider label="DETERMINACIÓN" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {ivaAPagar > 0
            ? <FormField label="5. IVA A PAGAR (Débito - Crédito)" value={fmt(ivaAPagar)} highlight={C.red} big />
            : <FormField label="5. REMANENTE A FAVOR (CF > Débito)" value={fmt(ivaCF)} highlight={C.gold} big />}
          <FormField label="6. Período de Pago" value={`Hasta el 30 de ${MESES[periodo.mes === 11 ? 0 : periodo.mes + 1]}`} />
        </div>
        <CertSection empresa={empresa} certified={certified} certDate={certDate} onCertify={onCertify} />
      </Card>
    </div>
  );
}

// ─── FORMULARIO ISR ───────────────────────────────────────────────────────────
function FormularioISR({ totVentas, totCompras, utilidad, isr, empresa, periodo, certified, certDate, onCertify }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800, margin: 0 }}>📊 Formulario ISR — SAT-1361</h2>
          <p style={{ color: C.textMid, margin: "4px 0 0", fontSize: 13 }}>Impuesto Sobre la Renta — Pagos Trimestrales</p>
        </div>
        {certified && <Badge color={C.gold}>✓ CERTIFICADO</Badge>}
      </div>
      <Card>
        <SatHeader titulo="IMPUESTO SOBRE LA RENTA — RÉGIMEN SOBRE UTILIDADES" form="SAT-1361" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <FormField label="NIT" value={empresa.nit || "—"} />
          <FormField label="Razón Social" value={empresa.nombre || "—"} />
          <FormField label="Período" value={`${MESES[periodo.mes]} ${periodo.anio}`} />
        </div>
        <Divider label="INGRESOS Y DEDUCCIONES" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="1. Total Ingresos Gravados" value={fmt(totVentas.base)} highlight={C.accent} />
          <FormField label="2. Total Costos Deducibles" value={fmt(totCompras.base)} highlight={C.blue} />
          <FormField label="3. Renta Imponible (1 - 2)" value={fmt(utilidad)} highlight={utilidad >= 0 ? C.accent : C.red} />
          <FormField label="4. Tasa ISR" value="25%" />
          <FormField label="5. ISR DETERMINADO" value={fmt(isr)} highlight={C.gold} big />
          <FormField label="6. ISR Retenido / Pagado" value="Q 0.00" />
        </div>
        <Divider label="ISR A PAGAR" />
        <FormField label="7. IMPUESTO A PAGAR" value={fmt(isr)} highlight={C.red} big />
        <CertSection empresa={empresa} certified={certified} certDate={certDate} onCertify={onCertify} />
      </Card>
    </div>
  );
}

// ─── FORMULARIO ISO ───────────────────────────────────────────────────────────
function FormularioISO({ totVentas, iso, empresa, periodo, certified, certDate, onCertify }) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 800, margin: 0 }}>📈 Formulario ISO — SAT-2800</h2>
        <p style={{ color: C.textMid, margin: "4px 0 0", fontSize: 13 }}>Impuesto de Solidaridad — Decreto 73-2008</p>
      </div>
      <Card>
        <SatHeader titulo="DECLARACIÓN JURADA DEL IMPUESTO DE SOLIDARIDAD" form="SAT-2800" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
          <FormField label="NIT" value={empresa.nit || "—"} />
          <FormField label="Razón Social" value={empresa.nombre || "—"} />
          <FormField label="Trimestre" value={`T${Math.ceil((periodo.mes+1)/3)} ${periodo.anio}`} />
        </div>
        <Divider label="CÁLCULO" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <FormField label="1. Base de Cálculo — Total de Ingresos Brutos" value={fmt(totVentas.total)} highlight={C.accent} />
          <FormField label="2. Tasa Aplicable" value="1%" />
          <FormField label="3. ISO DETERMINADO (1% de Ingresos)" value={fmt(iso)} highlight={C.gold} big />
          <FormField label="4. Plazo de Pago" value="Último día del mes siguiente al trimestre" />
        </div>
        <div style={{ marginTop: 16, padding: 12, background: C.goldDim, borderRadius: 8, border: `1px solid ${C.gold}44`, fontSize: 12, color: C.textMid }}>
          ℹ️ El ISO se paga trimestralmente y puede acreditarse contra el ISR anual. Si el ISR anual es mayor, se paga la diferencia. Decreto 99-98 / Decreto 73-2008.
        </div>
        <CertSection empresa={empresa} certified={certified} certDate={certDate} onCertify={onCertify} />
      </Card>
    </div>
  );
}

// ─── COMPONENTES DE FORMULARIO ────────────────────────────────────────────────
function SatHeader({ titulo, form }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, padding: "16px 20px", background: C.surface, borderRadius: 8, border: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, background: `linear-gradient(135deg, #003F8A, #0066CC)`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏛️</div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 12, color: "#0066CC", letterSpacing: 0.3 }}>SUPERINTENDENCIA DE ADMINISTRACIÓN TRIBUTARIA — SAT</div>
          <div style={{ fontWeight: 700, fontSize: 11, color: C.text, marginTop: 2 }}>{titulo}</div>
        </div>
      </div>
      <Badge color={C.blue}>{form}</Badge>
    </div>
  );
}

function FormField({ label, value, highlight, big }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4, letterSpacing: 0.4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ background: C.surface, border: `1px solid ${highlight ? highlight + "55" : C.border}`, borderRadius: 6, padding: big ? "12px 14px" : "8px 12px", fontFamily: "monospace", color: highlight || C.text, fontWeight: big ? 800 : 600, fontSize: big ? 18 : 13 }}>
        {value}
      </div>
    </div>
  );
}

function CertSection({ empresa, certified, certDate, onCertify }) {
  return (
    <div style={{ marginTop: 28, padding: 20, background: certified ? C.accentDim : C.surface, border: `1px solid ${certified ? C.accentSoft : C.border}`, borderRadius: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8 }}>FIRMA Y SELLO DEL CONTADOR</div>
          <div style={{ height: 40, borderBottom: `1px solid ${C.border}` }} />
          <div style={{ fontSize: 11, color: C.textMid, marginTop: 6 }}>{empresa.contador || "Contador Público y Auditor"}</div>
          {empresa.colegiado && <div style={{ fontSize: 10, color: C.textDim }}>Colegiado No. {empresa.colegiado}</div>}
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8 }}>FIRMA DEL REPRESENTANTE LEGAL</div>
          <div style={{ height: 40, borderBottom: `1px solid ${C.border}` }} />
          <div style={{ fontSize: 11, color: C.textMid, marginTop: 6 }}>{empresa.nombre || "Contribuyente"}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 8 }}>FECHA DE CERTIFICACIÓN</div>
          <div style={{ height: 40, display: "flex", alignItems: "center", borderBottom: `1px solid ${C.border}`, fontFamily:"monospace", color: C.text }}>{certified ? certDate : "— / — / ——"}</div>
        </div>
      </div>
      {certified
        ? <div style={{ textAlign: "center", color: C.accent, fontWeight: 800, fontSize: 13 }}>✓ DECLARACIÓN CERTIFICADA — Lista para presentar a la SAT</div>
        : <div style={{ textAlign: "center" }}>
            <Btn onClick={onCertify} color={C.accent} icon="✓">Certificar y Aprobar Declaración</Btn>
            <div style={{ fontSize: 11, color: C.textDim, marginTop: 8 }}>El contador debe revisar los datos antes de certificar</div>
          </div>
      }
    </div>
  );
}
