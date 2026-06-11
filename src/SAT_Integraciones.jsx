import { useState, useCallback, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// TEMA Y CONSTANTES
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  bg: "#060A12",
  surface: "#0D1420",
  card: "#111C2E",
  cardHover: "#152030",
  border: "#1A2D45",
  borderBright: "#243D5C",
  accent: "#00E5C3",
  accentDim: "#00E5C308",
  accentSoft: "#00E5C330",
  gold: "#FFB547",
  goldDim: "#FFB54710",
  red: "#FF3D6B",
  redDim: "#FF3D6B10",
  blue: "#3B82F6",
  blueDim: "#3B82F610",
  blueSoft: "#3B82F630",
  purple: "#A855F7",
  purpleDim: "#A855F710",
  text: "#E2EBF6",
  textMid: "#7A95B5",
  textDim: "#3A4F6A",
};

const fmt = (n) => new Intl.NumberFormat("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const now = () => new Date().toLocaleString("es-GT");

// ══════════════════════════════════════════════════════════════════════════════
// SIMULADORES DE INTEGRACIÓN SAT
// (En producción real estos serían proxies backend → SAT)
// ══════════════════════════════════════════════════════════════════════════════

// 1. Consulta NIT/RTU — Simula respuesta del portal SAT
async function consultarNIT(nit) {
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
  const nitNum = nit.replace(/[^0-9]/g, "");
  if (!nitNum || nitNum.length < 5) throw new Error("NIT inválido");

  // Base de datos simulada de NITs conocidos Guatemala
  const db = {
    "5908472": { nombre: "DISTRIBUIDORA FARMACÉUTICA EL BUEN PRECIO S.A.", tipo: "Jurídico", estado: "ACTIVO", direccion: "7a Avenida 3-67 Zona 9, Guatemala", actividad: "Comercio al por mayor de productos farmacéuticos", regimen: "Afecto IVA General", nit: "5908472-K" },
    "1234567": { nombre: "JUAN CARLOS PÉREZ MÉNDEZ", tipo: "Natural", estado: "ACTIVO", direccion: "Residenciales Las Flores, Villa Nueva", actividad: "Servicios Profesionales", regimen: "Pequeño Contribuyente", nit: "1234567-8" },
    "9876543": { nombre: "ISOPHARMA GUATEMALA S.A.", tipo: "Jurídico", estado: "ACTIVO", direccion: "Calzada Roosevelt 22-43 Zona 11", actividad: "Importación y distribución de productos farmacéuticos", regimen: "Afecto IVA General", nit: "9876543-1" },
    "7654321": { nombre: "SUPERMERCADOS DEL PAÍS S.A.", tipo: "Jurídico", estado: "SUSPENDIDO", direccion: "Boulevard Los Próceres, Guatemala", actividad: "Comercio al por menor", regimen: "Afecto IVA General", nit: "7654321-0" },
  };

  const key = nitNum.substring(0, 7);
  if (db[key]) return db[key];

  // Respuesta genérica para NITs no en la base de datos demo
  const estados = ["ACTIVO", "ACTIVO", "ACTIVO", "SUSPENDIDO"];
  const regimenes = ["Afecto IVA General", "Pequeño Contribuyente", "Régimen Opcional Simplificado"];
  return {
    nombre: `CONTRIBUYENTE NIT ${nit}`,
    tipo: nitNum.length > 7 ? "Jurídico" : "Natural",
    estado: estados[Math.floor(Math.random() * estados.length)],
    direccion: "Dirección registrada en SAT",
    actividad: "Actividad económica registrada",
    regimen: regimenes[Math.floor(Math.random() * regimenes.length)],
    nit: nit,
  };
}

// 2. Validación FEL/UUID — Simula verificación de factura electrónica
async function validarFEL(uuid) {
  await new Promise(r => setTimeout(r, 900 + Math.random() * 600));
  const clean = uuid.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
  if (clean.length < 10) throw new Error("UUID de factura inválido");

  const tipos = ["FACTURA", "FACTURA CAMBIARIA", "RECIBO", "NOTA DE CRÉDITO", "NOTA DE DÉBITO"];
  const certificadores = ["INFILE S.A.", "MEGAPRINT S.A.", "G4S SECURE SOLUTIONS", "ASSIST CARD"];
  const emisores = ["DISTRIBUCIONES MÉDICAS GT S.A.", "FARMACÉUTICA CENTRAL", "SERVICIOS PROFESIONALES GT", "COMERCIALIZADORA DEL NORTE"];

  const estados = [
    { estado: "CERTIFICADA", color: C.accent, icon: "✓" },
    { estado: "ANULADA", color: C.red, icon: "✗" },
    { estado: "CERTIFICADA", color: C.accent, icon: "✓" },
    { estado: "CERTIFICADA", color: C.accent, icon: "✓" },
  ];
  const est = estados[Math.floor(Math.random() * estados.length)];
  const monto = (Math.random() * 50000 + 100).toFixed(2);
  const base = (parseFloat(monto) / 1.12).toFixed(2);
  const iva = (parseFloat(monto) - parseFloat(base)).toFixed(2);

  return {
    uuid: clean,
    ...est,
    tipo: tipos[Math.floor(Math.random() * tipos.length)],
    certificador: certificadores[Math.floor(Math.random() * certificadores.length)],
    emisor: emisores[Math.floor(Math.random() * emisores.length)],
    nitEmisor: `${Math.floor(Math.random() * 9000000 + 1000000)}-${Math.floor(Math.random() * 9)}`,
    receptor: "CONSUMIDOR FINAL",
    nitReceptor: "CF",
    fechaEmision: `${String(Math.floor(Math.random()*28)+1).padStart(2,"0")}/${String(Math.floor(Math.random()*12)+1).padStart(2,"0")}/2025`,
    fechaCertificacion: `${String(Math.floor(Math.random()*28)+1).padStart(2,"0")}/${String(Math.floor(Math.random()*12)+1).padStart(2,"0")}/2025`,
    base, iva,
    total: monto,
    moneda: "GTQ",
    serie: `FAC-${String(Math.floor(Math.random()*9999)+1).padStart(4,"0")}`,
    numero: String(Math.floor(Math.random()*999999)+1).padStart(8,"0"),
  };
}

// 3. Generador FLAT para Declaraguate
function generarFlatIVA(datos) {
  const { nit, nombre, mes, anio, baseVentas, ivaVentas, baseCompras, ivaCompras, ivaAPagar } = datos;
  const periodo = `${anio}${String(mes + 1).padStart(2, "0")}`;
  const nitLimpio = (nit || "").replace(/[^0-9K]/g, "").padEnd(13, " ");

  const lines = [
    `TIPO_DECLARACION=IVA_MENSUAL`,
    `VERSION=2.0`,
    `PERIODO=${periodo}`,
    `NIT=${nitLimpio.trim()}`,
    `RAZON_SOCIAL=${(nombre || "").substring(0, 100)}`,
    `FECHA_GENERACION=${new Date().toISOString().split("T")[0]}`,
    ``,
    `[DEBITO_FISCAL]`,
    `BASE_VENTAS_GRAVADAS=${(baseVentas || 0).toFixed(2)}`,
    `DEBITO_FISCAL=${(ivaVentas || 0).toFixed(2)}`,
    `VENTAS_EXENTAS=0.00`,
    `EXPORTACIONES=0.00`,
    ``,
    `[CREDITO_FISCAL]`,
    `BASE_COMPRAS_GRAVADAS=${(baseCompras || 0).toFixed(2)}`,
    `CREDITO_FISCAL_COMPRAS=${(ivaCompras || 0).toFixed(2)}`,
    `IMPORTACIONES=0.00`,
    `CREDITO_FISCAL_IMPORTACIONES=0.00`,
    ``,
    `[DETERMINACION]`,
    `IVA_A_PAGAR=${Math.max(0, ivaAPagar || 0).toFixed(2)}`,
    `REMANENTE_CF=${Math.max(0, -(ivaAPagar || 0)).toFixed(2)}`,
    `MULTAS=0.00`,
    `INTERESES=0.00`,
    `TOTAL_A_PAGAR=${Math.max(0, ivaAPagar || 0).toFixed(2)}`,
    ``,
    `[FIRMA]`,
    `GENERADO_POR=CONTAGTPRO`,
    `HASH=${Math.random().toString(36).substring(2, 18).toUpperCase()}`,
  ];
  return lines.join("\r\n");
}

function generarFlatISR(datos) {
  const { nit, nombre, anio, ingresos, costos, utilidad, isr } = datos;
  const lines = [
    `TIPO_DECLARACION=ISR_TRIMESTRAL`,
    `VERSION=2.0`,
    `ANIO=${anio}`,
    `NIT=${(nit || "").replace(/[^0-9K]/g, "")}`,
    `RAZON_SOCIAL=${(nombre || "").substring(0, 100)}`,
    `FECHA_GENERACION=${new Date().toISOString().split("T")[0]}`,
    ``,
    `[INGRESOS]`,
    `TOTAL_INGRESOS_GRAVADOS=${(ingresos || 0).toFixed(2)}`,
    `INGRESOS_EXENTOS=0.00`,
    ``,
    `[DEDUCCIONES]`,
    `TOTAL_COSTOS_DEDUCIBLES=${(costos || 0).toFixed(2)}`,
    ``,
    `[DETERMINACION]`,
    `RENTA_IMPONIBLE=${(utilidad || 0).toFixed(2)}`,
    `TASA=0.25`,
    `ISR_DETERMINADO=${(isr || 0).toFixed(2)}`,
    `ISR_RETENIDO=0.00`,
    `ISR_A_PAGAR=${(isr || 0).toFixed(2)}`,
    ``,
    `[FIRMA]`,
    `GENERADO_POR=CONTAGTPRO`,
    `HASH=${Math.random().toString(36).substring(2, 18).toUpperCase()}`,
  ];
  return lines.join("\r\n");
}

function generarFlatISO(datos) {
  const { nit, nombre, anio, trimestre, ingresos, iso } = datos;
  const lines = [
    `TIPO_DECLARACION=ISO_TRIMESTRAL`,
    `VERSION=2.0`,
    `ANIO=${anio}`,
    `TRIMESTRE=${trimestre}`,
    `NIT=${(nit || "").replace(/[^0-9K]/g, "")}`,
    `RAZON_SOCIAL=${(nombre || "").substring(0, 100)}`,
    `FECHA_GENERACION=${new Date().toISOString().split("T")[0]}`,
    ``,
    `[BASE_CALCULO]`,
    `TOTAL_INGRESOS_BRUTOS=${(ingresos || 0).toFixed(2)}`,
    `ACTIVO_NETO=0.00`,
    `BASE_CALCULO=${(ingresos || 0).toFixed(2)}`,
    ``,
    `[DETERMINACION]`,
    `TASA_ISO=0.01`,
    `ISO_DETERMINADO=${(iso || 0).toFixed(2)}`,
    `ISO_A_PAGAR=${(iso || 0).toFixed(2)}`,
    ``,
    `[FIRMA]`,
    `GENERADO_POR=CONTAGTPRO`,
    `HASH=${Math.random().toString(36).substring(2, 18).toUpperCase()}`,
  ];
  return lines.join("\r\n");
}

function descargarTxt(contenido, nombre) {
  const blob = new Blob([contenido], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nombre; a.click();
  URL.revokeObjectURL(url);
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTES UI
// ══════════════════════════════════════════════════════════════════════════════
const Pill = ({ children, color = C.accent }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}40`, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: "inline-block" }}>
    {children}
  </span>
);

const GlowCard = ({ children, color = C.accent, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${color}30`, borderRadius: 14, padding: 24, boxShadow: `0 0 30px ${color}08`, ...style }}>
    {children}
  </div>
);

const Input = ({ label, value, onChange, placeholder, mono, disabled }) => (
  <div style={{ marginBottom: 14 }}>
    {label && <label style={{ display: "block", fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{label}</label>}
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
      style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "11px 14px", fontSize: mono ? 13 : 13, fontFamily: mono ? "monospace" : "inherit", boxSizing: "border-box", outline: "none", opacity: disabled ? 0.5 : 1 }} />
  </div>
);

const Btn = ({ children, onClick, color = C.accent, disabled, full, icon, size = "md" }) => {
  const pad = size === "sm" ? "7px 14px" : "11px 22px";
  const fs = size === "sm" ? 12 : 13;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.surface : `linear-gradient(135deg, ${color}22, ${color}10)`,
      border: `1px solid ${disabled ? C.border : color + "60"}`,
      color: disabled ? C.textDim : color, borderRadius: 9,
      padding: pad, fontSize: fs, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", gap: 7,
      width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined,
      transition: "all 0.2s", letterSpacing: 0.3,
    }}>
      {icon && <span>{icon}</span>}{children}
    </button>
  );
};

const Spinner = ({ color = C.accent }) => (
  <div style={{ display: "inline-block", width: 18, height: 18, border: `2px solid ${color}30`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
);

const StatusBar = ({ estado, msg }) => {
  const map = { ok: [C.accent, "✓"], error: [C.red, "✗"], warn: [C.gold, "⚠"], info: [C.blue, "ℹ"] };
  const [color, icon] = map[estado] || map.info;
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 16px", background: color + "10", border: `1px solid ${color}30`, borderRadius: 8, marginTop: 12 }}>
      <span style={{ color, fontWeight: 700, marginTop: 1 }}>{icon}</span>
      <span style={{ color: C.textMid, fontSize: 13, lineHeight: 1.5 }}>{msg}</span>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1 — CONSULTA NIT
// ══════════════════════════════════════════════════════════════════════════════
function ConsultaNIT() {
  const [nit, setNit] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [historial, setHistorial] = useState([]);

  const consultar = async () => {
    if (!nit.trim()) return;
    setLoading(true); setError(""); setResultado(null);
    try {
      const r = await consultarNIT(nit.trim());
      setResultado(r);
      setHistorial(h => [{ nit: nit.trim(), nombre: r.nombre, estado: r.estado, ts: now() }, ...h.slice(0, 9)]);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Panel consulta */}
      <GlowCard color={C.blue}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, background: C.blueDim, border: `1px solid ${C.blueSoft}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🔍</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Consulta RTU / NIT</div>
            <div style={{ fontSize: 11, color: C.textDim }}>Portal SAT Guatemala</div>
          </div>
        </div>

        <Input label="NIT del Contribuyente" value={nit} onChange={setNit} placeholder="Ej: 5908472-K" mono />

        <Btn onClick={consultar} disabled={loading || !nit.trim()} color={C.blue} full icon={loading ? null : "🔍"}>
          {loading ? <><Spinner color={C.blue} /> Consultando SAT...</> : "Verificar NIT"}
        </Btn>

        {error && <StatusBar estado="error" msg={`Error: ${error}`} />}

        {resultado && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Resultado RTU</span>
              <Pill color={resultado.estado === "ACTIVO" ? C.accent : C.red}>{resultado.estado}</Pill>
            </div>
            {[
              ["NIT / RTU", resultado.nit],
              ["Nombre / Razón Social", resultado.nombre],
              ["Tipo de Contribuyente", resultado.tipo],
              ["Régimen Tributario", resultado.regimen],
              ["Actividad Económica", resultado.actividad],
              ["Dirección Fiscal", resultado.direccion],
            ].map(([label, val]) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500, padding: "7px 12px", background: C.surface, borderRadius: 6, border: `1px solid ${C.border}` }}>{val}</div>
              </div>
            ))}
            {resultado.estado !== "ACTIVO" && (
              <StatusBar estado="warn" msg="Este contribuyente figura como SUSPENDIDO en el RTU. Verifique antes de aceptar facturas." />
            )}
          </div>
        )}
      </GlowCard>

      {/* Historial */}
      <GlowCard color={C.purple} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>📋 Historial de Consultas</div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Últimas 10 verificaciones</div>
        {historial.length === 0 ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textDim, fontSize: 13 }}>
            Las consultas aparecerán aquí
          </div>
        ) : historial.map((h, i) => (
          <div key={i} onClick={() => setNit(h.nit)} style={{ padding: "10px 14px", borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 8, cursor: "pointer", transition: "all 0.15s", background: C.surface }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontFamily: "monospace", fontSize: 13, color: C.blue, fontWeight: 700 }}>{h.nit}</span>
              <Pill color={h.estado === "ACTIVO" ? C.accent : C.red} >{h.estado}</Pill>
            </div>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 2 }}>{h.nombre}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{h.ts}</div>
          </div>
        ))}
        <div style={{ marginTop: "auto", paddingTop: 16 }}>
          <StatusBar estado="info" msg="En producción, esta consulta va directamente al portal RTU de la SAT a través de un proxy backend seguro." />
        </div>
      </GlowCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2 — VALIDACIÓN FEL / UUID
// ══════════════════════════════════════════════════════════════════════════════
function ValidacionFEL() {
  const [uuid, setUuid] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");
  const [lote, setLote] = useState("");
  const [loteResult, setLoteResult] = useState([]);
  const [loteLoading, setLoteLoading] = useState(false);

  const validar = async () => {
    if (!uuid.trim()) return;
    setLoading(true); setError(""); setResultado(null);
    try { setResultado(await validarFEL(uuid.trim())); }
    catch (e) { setError(e.message); }
    setLoading(false);
  };

  const validarLote = async () => {
    const uuids = lote.split(/[\n,;]+/).map(u => u.trim()).filter(Boolean);
    if (!uuids.length) return;
    setLoteLoading(true); setLoteResult([]);
    const results = [];
    for (const u of uuids.slice(0, 10)) {
      try { results.push(await validarFEL(u)); }
      catch { results.push({ uuid: u, estado: "ERROR", color: C.red, icon: "✗", tipo: "—", total: "—", emisor: "No encontrada" }); }
      setLoteResult([...results]);
    }
    setLoteLoading(false);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      {/* Validación individual */}
      <GlowCard color={C.accent}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, background: C.accentDim, border: `1px solid ${C.accentSoft}`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧾</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Validar Factura FEL</div>
            <div style={{ fontSize: 11, color: C.textDim }}>Verificación por UUID · Portal SAT</div>
          </div>
        </div>

        <Input label="UUID de la Factura Electrónica (DTE)" value={uuid} onChange={setUuid}
          placeholder="Ej: A1B2C3D4-E5F6-7890-ABCD-EF1234567890" mono />
        <Btn onClick={validar} disabled={loading || !uuid.trim()} color={C.accent} full icon={loading ? null : "✓"}>
          {loading ? <><Spinner /> Verificando en SAT...</> : "Validar Factura"}
        </Btn>

        {error && <StatusBar estado="error" msg={error} />}

        {resultado && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: resultado.color + "14", border: `2px solid ${resultado.color}50`, borderRadius: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 24, color: resultado.color }}>{resultado.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: resultado.color, fontSize: 15 }}>{resultado.estado}</div>
                <div style={{ fontSize: 11, color: C.textMid }}>{resultado.tipo} · {resultado.certificador}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                ["Emisor", resultado.emisor],
                ["NIT Emisor", resultado.nitEmisor],
                ["Serie / Número", `${resultado.serie} / ${resultado.numero}`],
                ["Fecha Emisión", resultado.fechaEmision],
                ["Base Imponible", `Q ${fmt(resultado.base)}`],
                ["IVA (12%)", `Q ${fmt(resultado.iva)}`],
                ["Total Factura", `Q ${fmt(resultado.total)}`],
                ["Moneda", resultado.moneda],
              ].map(([l, v]) => (
                <div key={l} style={{ padding: "8px 12px", background: C.surface, borderRadius: 7, border: `1px solid ${C.border}` }}>
                  <div style={{ fontSize: 9, color: C.textDim, letterSpacing: 0.6, textTransform: "uppercase" }}>{l}</div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2, fontFamily: l.includes("Q") || l === "IVA" || l === "Total" || l === "Base" ? "monospace" : "inherit" }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </GlowCard>

      {/* Validación en lote */}
      <GlowCard color={C.gold}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 4 }}>⚡ Validación en Lote</div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 14 }}>Hasta 10 UUIDs simultáneos (uno por línea)</div>

        <textarea value={lote} onChange={e => setLote(e.target.value)} placeholder={"UUID-1\nUUID-2\nUUID-3..."}
          style={{ width: "100%", height: 120, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "10px 14px", fontSize: 12, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box", outline: "none" }} />

        <div style={{ marginTop: 10 }}>
          <Btn onClick={validarLote} disabled={loteLoading || !lote.trim()} color={C.gold} full icon={loteLoading ? null : "⚡"}>
            {loteLoading ? <><Spinner color={C.gold} /> Validando...</> : "Validar Lote"}
          </Btn>
        </div>

        {loteResult.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 11, color: C.textMid, marginBottom: 8, fontWeight: 700 }}>RESULTADOS ({loteResult.length})</div>
            <div style={{ maxHeight: 260, overflowY: "auto" }}>
              {loteResult.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 7, border: `1px solid ${r.color}30`, background: r.color + "08", marginBottom: 6 }}>
                  <span style={{ color: r.color, fontWeight: 700, fontSize: 16 }}>{r.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: C.textMid, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.uuid}</div>
                    <div style={{ fontSize: 12, color: C.text }}>{r.emisor} · {r.tipo !== "—" ? `Q ${fmt(r.total)}` : "—"}</div>
                  </div>
                  <Pill color={r.color}>{r.estado}</Pill>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 16, fontSize: 12 }}>
              <span style={{ color: C.accent }}>✓ {loteResult.filter(r => r.estado === "CERTIFICADA").length} válidas</span>
              <span style={{ color: C.red }}>✗ {loteResult.filter(r => r.estado !== "CERTIFICADA").length} con problemas</span>
            </div>
          </div>
        )}
      </GlowCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3 — GENERADOR FLAT DECLARAGUATE
// ══════════════════════════════════════════════════════════════════════════════
function GeneradorFlat() {
  const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  const [form, setForm] = useState({ nit: "", nombre: "", mes: new Date().getMonth(), anio: new Date().getFullYear(), baseVentas: "", ivaVentas: "", baseCompras: "", ivaCompras: "", ingresos: "", costos: "", trimestre: "1" });
  const [generados, setGenerados] = useState([]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const n = (k) => parseFloat(form[k]) || 0;
  const ivaAPagar = n("ivaVentas") - n("ivaCompras");
  const utilidad = n("ingresos") - n("costos");
  const isr = Math.max(0, utilidad * 0.25);
  const iso = n("ingresos") * 0.01;

  const generarYDescargar = (tipo) => {
    let contenido, nombre;
    if (tipo === "IVA") {
      contenido = generarFlatIVA({ ...form, mes: form.mes, anio: form.anio, baseVentas: n("baseVentas"), ivaVentas: n("ivaVentas"), baseCompras: n("baseCompras"), ivaCompras: n("ivaCompras"), ivaAPagar });
      nombre = `IVA_${form.anio}${String(form.mes+1).padStart(2,"0")}_${form.nit || "SIN_NIT"}.txt`;
    } else if (tipo === "ISR") {
      contenido = generarFlatISR({ ...form, ingresos: n("ingresos"), costos: n("costos"), utilidad, isr });
      nombre = `ISR_${form.anio}_${form.nit || "SIN_NIT"}.txt`;
    } else {
      contenido = generarFlatISO({ ...form, ingresos: n("ingresos"), iso });
      nombre = `ISO_T${form.trimestre}_${form.anio}_${form.nit || "SIN_NIT"}.txt`;
    }
    descargarTxt(contenido, nombre);
    setGenerados(g => [{ tipo, nombre, ts: now(), size: contenido.length }, ...g.slice(0, 9)]);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 20 }}>
      {/* Formulario */}
      <div>
        <GlowCard color={C.purple} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 4 }}>🏢 Datos del Contribuyente</div>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Aplicado a los tres formularios</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="NIT" value={form.nit} onChange={v => set("nit", v)} placeholder="1234567-8" mono />
            <Input label="Razón Social" value={form.nombre} onChange={v => set("nombre", v)} placeholder="Nombre o empresa" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Mes</label>
              <select value={form.mes} onChange={e => set("mes", +e.target.value)}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "11px 12px", fontSize: 12 }}>
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Año</label>
              <select value={form.anio} onChange={e => set("anio", +e.target.value)}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "11px 12px", fontSize: 12 }}>
                {[2023,2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>Trimestre (ISO)</label>
              <select value={form.trimestre} onChange={e => set("trimestre", e.target.value)}
                style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "11px 12px", fontSize: 12 }}>
                {["1","2","3","4"].map(t => <option key={t} value={t}>T{t}</option>)}
              </select>
            </div>
          </div>
        </GlowCard>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {/* IVA */}
          <GlowCard color={C.accent}>
            <div style={{ fontWeight: 700, fontSize: 13, color: C.accent, marginBottom: 14 }}>📋 Datos IVA (SAT-1311)</div>
            <Input label="Base Ventas" value={form.baseVentas} onChange={v => set("baseVentas", v)} placeholder="0.00" mono />
            <Input label="IVA Ventas (Débito)" value={form.ivaVentas} onChange={v => set("ivaVentas", v)} placeholder="0.00" mono />
            <Input label="Base Compras" value={form.baseCompras} onChange={v => set("baseCompras", v)} placeholder="0.00" mono />
            <Input label="IVA Compras (Crédito)" value={form.ivaCompras} onChange={v => set("ivaCompras", v)} placeholder="0.00" mono />
            <div style={{ padding: "10px 14px", background: (ivaAPagar >= 0 ? C.red : C.gold) + "12", border: `1px solid ${(ivaAPagar >= 0 ? C.red : C.gold)}30`, borderRadius: 8, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 0.6 }}>{ivaAPagar >= 0 ? "IVA A PAGAR" : "REMANENTE CF"}</div>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 18, color: ivaAPagar >= 0 ? C.red : C.gold }}>Q {fmt(Math.abs(ivaAPagar))}</div>
            </div>
            <Btn onClick={() => generarYDescargar("IVA")} color={C.accent} full icon="⬇">Descargar SAT-1311.txt</Btn>
          </GlowCard>

          {/* ISR + ISO */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <GlowCard color={C.gold}>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.gold, marginBottom: 14 }}>📊 Datos ISR / ISO</div>
              <Input label="Total Ingresos" value={form.ingresos} onChange={v => set("ingresos", v)} placeholder="0.00" mono />
              <Input label="Total Costos Deducibles" value={form.costos} onChange={v => set("costos", v)} placeholder="0.00" mono />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                <div style={{ padding: "8px 12px", background: C.goldDim, borderRadius: 7 }}>
                  <div style={{ fontSize: 9, color: C.textDim }}>ISR (25%)</div>
                  <div style={{ fontFamily: "monospace", fontWeight: 800, color: C.gold }}>Q {fmt(isr)}</div>
                </div>
                <div style={{ padding: "8px 12px", background: C.blueDim, borderRadius: 7 }}>
                  <div style={{ fontSize: 9, color: C.textDim }}>ISO (1%)</div>
                  <div style={{ fontFamily: "monospace", fontWeight: 800, color: C.blue }}>Q {fmt(iso)}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn onClick={() => generarYDescargar("ISR")} color={C.gold} full icon="⬇" size="sm">SAT-1361.txt</Btn>
                <Btn onClick={() => generarYDescargar("ISO")} color={C.blue} full icon="⬇" size="sm">SAT-2800.txt</Btn>
              </div>
            </GlowCard>

            <GlowCard color={C.textDim} style={{ background: C.surface, flex: 1 }}>
              <div style={{ fontSize: 11, color: C.textMid, fontWeight: 700, marginBottom: 8 }}>📌 Instrucciones Declaraguate</div>
              {["Descarga el archivo .txt generado", "Ingresa a portal.sat.gob.gt", "Selecciona 'Declaraguate'", "Tipo de declaración → Cargar Archivo", "Adjunta el .txt y confirma", "Paga en banco o en línea"].map((s, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ color: C.accent, fontWeight: 800, fontSize: 11, minWidth: 16 }}>{i+1}.</span>
                  <span style={{ fontSize: 11, color: C.textMid }}>{s}</span>
                </div>
              ))}
            </GlowCard>
          </div>
        </div>
      </div>

      {/* Panel archivos generados */}
      <GlowCard color={C.accent} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 4 }}>📁 Archivos Generados</div>
        <div style={{ fontSize: 11, color: C.textDim, marginBottom: 16 }}>Listos para subir a Declaraguate</div>

        {generados.length === 0 ? (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: C.textDim }}>
            <div style={{ fontSize: 40 }}>📄</div>
            <div style={{ fontSize: 13 }}>Genera tu primer archivo</div>
          </div>
        ) : generados.map((g, i) => (
          <div key={i} style={{ padding: "12px 14px", background: C.surface, borderRadius: 9, border: `1px solid ${C.border}`, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 18 }}>{g.tipo === "IVA" ? "📋" : g.tipo === "ISR" ? "📊" : "📈"}</span>
              <span style={{ fontWeight: 700, fontSize: 12, color: g.tipo === "IVA" ? C.accent : g.tipo === "ISR" ? C.gold : C.blue }}>{g.tipo}</span>
              <span style={{ fontSize: 10, color: C.textDim, marginLeft: "auto" }}>{g.size} bytes</span>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 10, color: C.textMid, marginBottom: 4 }}>{g.nombre}</div>
            <div style={{ fontSize: 10, color: C.textDim }}>{g.ts}</div>
          </div>
        ))}

        {generados.length > 0 && (
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <StatusBar estado="ok" msg={`${generados.length} archivo(s) generado(s). Súbelos a Declaraguate para completar la declaración.`} />
          </div>
        )}
      </GlowCard>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
const SECCIONES = [
  { id: "nit",  label: "Consulta NIT/RTU",       icon: "🔍", color: C.blue,   desc: "Verifica contribuyentes en el RTU de la SAT" },
  { id: "fel",  label: "Validación FEL / UUID",   icon: "🧾", color: C.accent, desc: "Verifica autenticidad de facturas electrónicas" },
  { id: "flat", label: "Generador Declaraguate",  icon: "📤", color: C.purple, desc: "Genera archivos .TXT listos para subir a SAT" },
];

export default function SATIntegraciones() {
  const [seccion, setSeccion] = useState("nit");

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, select { outline: none; }
        input:focus, textarea:focus, select:focus { border-color: ${C.accent} !important; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: ${C.surface}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 32px", height: 62, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, #003F8A 0%, #0066CC 100%)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏛️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: -0.3 }}>ContaGT <span style={{ color: C.accent }}>SAT</span> <span style={{ color: C.textDim, fontWeight: 400, fontSize: 12 }}>/ Integraciones</span></div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 0.5 }}>CONECTADO CON PORTAL SAT · DECLARAGUATE · FEL</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, boxShadow: `0 0 8px ${C.accent}` }} />
          <span style={{ fontSize: 11, color: C.accent, fontWeight: 700 }}>SERVICIOS EN LÍNEA</span>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200 }}>
        {/* Selector de sección */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {SECCIONES.map(s => (
            <button key={s.id} onClick={() => setSeccion(s.id)} style={{
              background: seccion === s.id ? s.color + "18" : C.surface,
              border: `1.5px solid ${seccion === s.id ? s.color + "60" : C.border}`,
              borderRadius: 12, padding: "16px 20px", cursor: "pointer", textAlign: "left",
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <span style={{ fontSize: 22 }}>{s.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: seccion === s.id ? s.color : C.text }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 11, color: C.textMid }}>{s.desc}</div>
              {seccion === s.id && <div style={{ marginTop: 10, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, borderRadius: 1 }} />}
            </button>
          ))}
        </div>

        {/* Contenido */}
        <div style={{ animation: "fadeIn 0.3s ease" }} key={seccion}>
          {seccion === "nit"  && <ConsultaNIT />}
          {seccion === "fel"  && <ValidacionFEL />}
          {seccion === "flat" && <GeneradorFlat />}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 28, padding: "14px 20px", background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: C.textDim }}>⚠️ Modo demostración. En producción, las consultas se enrutan a través de un proxy backend hacia los servicios oficiales de la SAT Guatemala.</div>
          <a href="https://portal.sat.gob.gt" target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.blue, textDecoration: "none", fontWeight: 700, whiteSpace: "nowrap", marginLeft: 16 }}>portal.sat.gob.gt ↗</a>
        </div>
      </div>
    </div>
  );
}
