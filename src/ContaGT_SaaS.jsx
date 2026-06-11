import { useState, useEffect, useRef } from "react";

// ══════════════════════════════════════════════════════════════════════════════
// TEMA
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:         "#05080F",
  surface:    "#0A1020",
  card:       "#0F1A2E",
  cardHover:  "#132030",
  border:     "#162840",
  borderBr:   "#1E3A58",
  accent:     "#00C896",
  accentDim:  "#00C89610",
  accentSoft: "#00C89628",
  gold:       "#F5A623",
  goldDim:    "#F5A62312",
  red:        "#FF4060",
  redDim:     "#FF406012",
  blue:       "#3B8FFF",
  blueDim:    "#3B8FFF12",
  purple:     "#9B6DFF",
  purpleDim:  "#9B6DFF12",
  text:       "#E0EAF6",
  textMid:    "#6A88A8",
  textDim:    "#2E4560",
};

// ══════════════════════════════════════════════════════════════════════════════
// DATOS SIMULADOS — Base de datos en memoria
// ══════════════════════════════════════════════════════════════════════════════
const PLANES = {
  basico: {
    id: "basico", nombre: "Básico", precio: 149,
    color: C.blue, icon: "◈",
    limiteClientes: 5, limiteDeclaraciones: 20,
    features: ["Hasta 5 empresas cliente","20 declaraciones/mes","IVA, ISR, ISO","Libros contables","Soporte por email"],
    noFeatures: ["Validación FEL ilimitada","Consultas NIT ilimitadas","API access","Soporte prioritario"],
  },
  pro: {
    id: "pro", nombre: "Pro", precio: 299,
    color: C.accent, icon: "◆",
    limiteClientes: 25, limiteDeclaraciones: 100,
    features: ["Hasta 25 empresas cliente","100 declaraciones/mes","Todo del Básico","Validación FEL ilimitada","Consultas NIT ilimitadas","Reportes avanzados","Soporte prioritario"],
    noFeatures: ["API access","White-label"],
  },
  ilimitado: {
    id: "ilimitado", nombre: "Ilimitado", precio: 599,
    color: C.gold, icon: "◉",
    limiteClientes: 999, limiteDeclaraciones: 9999,
    features: ["Clientes ilimitados","Declaraciones ilimitadas","Todo del Pro","API access","White-label personalizable","Gestor de despacho","Soporte 24/7 WhatsApp"],
    noFeatures: [],
  },
};

const INITIAL_USERS = [
  { id: "1", nombre: "Carlos Méndez", email: "carlos@contagt.com", plan: "ilimitado", estado: "activo", clientes: 18, declaracionesMes: 42, fechaRegistro: "2024-08-15", colegiado: "7821", telefono: "5555-1234", rol: "admin" },
  { id: "2", nombre: "María Salazar", email: "maria@despachosal.gt", plan: "pro", estado: "activo", clientes: 12, declaracionesMes: 28, fechaRegistro: "2024-10-02", colegiado: "4432", telefono: "4444-5678", rol: "contador" },
  { id: "3", nombre: "Roberto Fuentes", email: "rfuentes@gmail.com", plan: "basico", estado: "activo", clientes: 4, declaracionesMes: 9, fechaRegistro: "2025-01-20", colegiado: "9901", telefono: "3333-9012", rol: "contador" },
  { id: "4", nombre: "Ana Castillo", email: "ana.castillo@auditgt.com", plan: "pro", estado: "suspendido", clientes: 8, declaracionesMes: 0, fechaRegistro: "2024-12-05", colegiado: "6617", telefono: "2222-3456", rol: "contador" },
  { id: "5", nombre: "Luis Pérez", email: "lperez@fiscalgt.com", plan: "basico", estado: "trial", clientes: 2, declaracionesMes: 4, fechaRegistro: "2025-06-01", colegiado: "1145", telefono: "1111-7890", rol: "contador" },
];

const CLIENTES_DEMO = [
  { id: "c1", nombre: "Distribuciones El Rápido S.A.", nit: "5908472-K", regimen: "general", sector: "Comercio", declaracionesPendientes: 1, ultimaDeclaracion: "May 2025" },
  { id: "c2", nombre: "Farmacia San José", nit: "1234567-8", regimen: "pequenio", sector: "Farmacéutico", declaracionesPendientes: 0, ultimaDeclaracion: "May 2025" },
  { id: "c3", nombre: "Constructora Norte GT", nit: "9876543-1", regimen: "general", sector: "Construcción", declaracionesPendientes: 2, ultimaDeclaracion: "Abr 2025" },
  { id: "c4", nombre: "Restaurante La Colonial", nit: "3456789-0", regimen: "pequenio", sector: "Alimentos", declaracionesPendientes: 0, ultimaDeclaracion: "May 2025" },
  { id: "c5", nombre: "Servicios Tech GT", nit: "7654321-K", regimen: "opcional", sector: "Tecnología", declaracionesPendientes: 1, ultimaDeclaracion: "May 2025" },
];

const ACTIVIDAD_RECIENTE = [
  { tipo: "declaracion", msg: "IVA Mayo 2025 — Farmacia San José", tiempo: "hace 2 horas", color: C.accent },
  { tipo: "nit", msg: "Consulta NIT 5908472-K — Activo", tiempo: "hace 3 horas", color: C.blue },
  { tipo: "fel", msg: "Validación FEL — 12 facturas verificadas", tiempo: "hace 5 horas", color: C.purple },
  { tipo: "cliente", msg: "Nuevo cliente: Restaurante La Colonial", tiempo: "ayer", color: C.gold },
  { tipo: "declaracion", msg: "ISR T2 2025 — Constructora Norte GT", tiempo: "ayer", color: C.accent },
];

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTES BASE
// ══════════════════════════════════════════════════════════════════════════════
const Pill = ({ children, color = C.accent, size = "sm" }) => (
  <span style={{ background: color + "18", color, border: `1px solid ${color}35`, borderRadius: 20, padding: size === "sm" ? "2px 9px" : "4px 14px", fontSize: size === "sm" ? 10 : 12, fontWeight: 700, letterSpacing: 0.4, display: "inline-block", whiteSpace: "nowrap" }}>
    {children}
  </span>
);

const Card = ({ children, style = {}, color, onClick }) => (
  <div onClick={onClick} style={{ background: C.card, border: `1px solid ${color ? color + "30" : C.border}`, borderRadius: 14, padding: 24, transition: "all 0.2s", cursor: onClick ? "pointer" : "default", boxShadow: color ? `0 0 24px ${color}08` : "none", ...style }}>
    {children}
  </div>
);

const Btn = ({ children, onClick, color = C.accent, disabled, icon, size = "md", variant = "filled", full }) => {
  const pad = size === "sm" ? "7px 14px" : size === "lg" ? "14px 28px" : "10px 20px";
  const fs = size === "sm" ? 11 : size === "lg" ? 15 : 13;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? C.surface : variant === "ghost" ? "transparent" : color + "18",
      border: `1px solid ${disabled ? C.border : variant === "ghost" ? "transparent" : color + "50"}`,
      color: disabled ? C.textDim : color, borderRadius: 9,
      padding: pad, fontSize: fs, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", gap: 7,
      width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined,
      transition: "all 0.15s", letterSpacing: 0.3, fontFamily: "inherit",
    }}>
      {icon && <span style={{ fontSize: fs + 2 }}>{icon}</span>}{children}
    </button>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text", icon }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <label style={{ display: "block", fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 6 }}>{label}</label>}
    <div style={{ position: "relative" }}>
      {icon && <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, pointerEvents: "none" }}>{icon}</span>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 9, padding: icon ? "12px 14px 12px 38px" : "12px 14px", fontSize: 14, boxSizing: "border-box", fontFamily: "inherit" }} />
    </div>
  </div>
);

const Avatar = ({ nombre, size = 36, color = C.accent }) => {
  const initials = (nombre || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color + "22", border: `2px solid ${color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.35, fontWeight: 800, color, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

const Stat = ({ label, value, sub, color = C.accent, icon }) => (
  <div style={{ background: color + "0A", border: `1px solid ${color}25`, borderRadius: 12, padding: "18px 20px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
      {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      <span style={{ fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase" }}>{label}</span>
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color, fontFamily: "monospace", letterSpacing: -1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>{sub}</div>}
  </div>
);

const planColor = (plan) => ({ basico: C.blue, pro: C.accent, ilimitado: C.gold })[plan] || C.textMid;
const estadoColor = (e) => ({ activo: C.accent, suspendido: C.red, trial: C.gold })[e] || C.textMid;
const estadoLabel = (e) => ({ activo: "ACTIVO", suspendido: "SUSPENDIDO", trial: "TRIAL" })[e] || e;

// ══════════════════════════════════════════════════════════════════════════════
// PANTALLA: LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function PantallaLogin({ onLogin }) {
  const [modo, setModo] = useState("login"); // login | registro | forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [colegiado, setColegiado] = useState("");
  const [plan, setPlan] = useState("pro");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async () => {
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 900));
    // Admin demo
    if (email === "admin@contagtpro.gt" && password === "admin123") {
      onLogin({ id: "1", nombre: "Carlos Méndez", email, plan: "ilimitado", rol: "admin", colegiado: "7821" });
    } else if (email && password.length >= 4) {
      onLogin({ id: "2", nombre: nombre || "Contador Demo", email, plan, rol: "contador", colegiado: colegiado || "0000" });
    } else {
      setError("Credenciales incorrectas. Usa admin@contagtpro.gt / admin123 para demo.");
    }
    setLoading(false);
  };

  const handleRegistro = async () => {
    setError("");
    if (!nombre || !email || !password || !colegiado) { setError("Completa todos los campos"); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSuccess(`¡Cuenta creada! Tu período de prueba de 14 días con plan ${PLANES[plan].nombre} está activo.`);
    setLoading(false);
    setTimeout(() => onLogin({ id: Date.now().toString(), nombre, email, plan, rol: "contador", colegiado }), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Panel izquierdo — branding */}
      <div style={{ flex: 1, background: `linear-gradient(160deg, #0A1825 0%, #051018 60%, #0A1A10 100%)`, display: "flex", flexDirection: "column", justifyContent: "center", padding: "60px 56px", position: "relative", overflow: "hidden" }}>
        {/* Decoración */}
        <div style={{ position: "absolute", top: -80, right: -80, width: 300, height: 300, borderRadius: "50%", background: C.accent + "06", border: `1px solid ${C.accent}12` }} />
        <div style={{ position: "absolute", bottom: -60, left: -60, width: 240, height: 240, borderRadius: "50%", background: C.blue + "06", border: `1px solid ${C.blue}12` }} />

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 56 }}>
          <div style={{ width: 44, height: 44, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⬡</div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22, color: C.text, letterSpacing: -0.5 }}>ContaGT <span style={{ color: C.accent }}>Pro</span></div>
            <div style={{ fontSize: 10, color: C.textDim, letterSpacing: 1 }}>SISTEMA TRIBUTARIO GUATEMALTECO</div>
          </div>
        </div>

        <h1 style={{ fontSize: 42, fontWeight: 900, color: C.text, lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>
          La plataforma de<br /><span style={{ color: C.accent }}>contadores CPA</span><br />de Guatemala
        </h1>
        <p style={{ color: C.textMid, fontSize: 16, lineHeight: 1.7, marginBottom: 48, maxWidth: 400 }}>
          IVA, ISR e ISO generados automáticamente. Conectado con el portal SAT, FEL y Declaraguate. Libros contables en segundos.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { icon: "⚡", txt: "Declara en minutos, no en horas" },
            { icon: "🔗", txt: "Conectado en tiempo real con SAT" },
            { icon: "🛡️", txt: "Certificación digital del contador" },
            { icon: "📊", txt: "Maneja todos tus clientes desde un panel" },
          ].map(({ icon, txt }) => (
            <div key={txt} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 32, height: 32, background: C.accentSoft, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>{icon}</div>
              <span style={{ color: C.textMid, fontSize: 14 }}>{txt}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 56, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, color: C.textDim, marginBottom: 12 }}>USADO POR CONTADORES EN:</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {["Guatemala","Mixco","Villa Nueva","Quetzaltenango","Escuintla"].map(c => (
              <span key={c} style={{ fontSize: 11, color: C.textMid, background: C.border + "80", borderRadius: 4, padding: "3px 8px" }}>{c}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ width: 480, background: C.surface, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 44px", borderLeft: `1px solid ${C.border}` }}>
        {modo === "login" && (
          <>
            <h2 style={{ fontSize: 26, fontWeight: 800, color: C.text, marginBottom: 6 }}>Iniciar sesión</h2>
            <p style={{ color: C.textMid, fontSize: 14, marginBottom: 32 }}>Bienvenido de vuelta a ContaGT Pro</p>

            <Input label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" icon="📧" />
            <Input label="Contraseña" value={password} onChange={setPassword} placeholder="••••••••" type="password" icon="🔒" />

            {error && <div style={{ background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 12, marginBottom: 16 }}>{error}</div>}

            <Btn onClick={handleLogin} disabled={loading} color={C.accent} full size="lg" icon={loading ? "⏳" : "→"}>
              {loading ? "Verificando..." : "Ingresar al sistema"}
            </Btn>

            <div style={{ margin: "20px 0", textAlign: "center" }}>
              <button onClick={() => setModo("forgot")} style={{ background: "none", border: "none", color: C.textMid, fontSize: 13, cursor: "pointer" }}>¿Olvidaste tu contraseña?</button>
            </div>

            <div style={{ textAlign: "center", padding: "16px 0", borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: C.textMid, fontSize: 13 }}>¿No tienes cuenta? </span>
              <button onClick={() => setModo("registro")} style={{ background: "none", border: "none", color: C.accent, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Crear cuenta gratis →</button>
            </div>

            <div style={{ marginTop: 24, padding: 14, background: C.accentDim, border: `1px solid ${C.accentSoft}`, borderRadius: 9 }}>
              <div style={{ fontSize: 10, color: C.accent, fontWeight: 700, marginBottom: 4 }}>ACCESO DEMO</div>
              <div style={{ fontSize: 12, color: C.textMid }}>Email: <b style={{ color: C.text }}>admin@contagtpro.gt</b></div>
              <div style={{ fontSize: 12, color: C.textMid }}>Password: <b style={{ color: C.text }}>admin123</b></div>
            </div>
          </>
        )}

        {modo === "registro" && (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>Crear cuenta</h2>
            <p style={{ color: C.textMid, fontSize: 13, marginBottom: 24 }}>14 días de prueba gratis — sin tarjeta de crédito</p>

            <Input label="Nombre completo" value={nombre} onChange={setNombre} placeholder="Lic. Juan Pérez" icon="👤" />
            <Input label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" icon="📧" />
            <Input label="Contraseña" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" type="password" icon="🔒" />
            <Input label="Número de Colegiado CPA" value={colegiado} onChange={setColegiado} placeholder="Ej: 12345" icon="🏛️" />

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10, color: C.textMid, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 }}>Selecciona tu plan</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.values(PLANES).map(p => (
                  <button key={p.id} onClick={() => setPlan(p.id)} style={{ flex: 1, padding: "10px 8px", background: plan === p.id ? p.color + "20" : C.surface, border: `1.5px solid ${plan === p.id ? p.color : C.border}`, borderRadius: 9, cursor: "pointer", textAlign: "center" }}>
                    <div style={{ fontSize: 16, marginBottom: 2 }}>{p.icon}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: plan === p.id ? p.color : C.textMid }}>{p.nombre}</div>
                    <div style={{ fontSize: 10, color: C.textDim }}>Q{p.precio}/mes</div>
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ background: C.redDim, border: `1px solid ${C.red}30`, borderRadius: 8, padding: "10px 14px", color: C.red, fontSize: 12, marginBottom: 12 }}>{error}</div>}
            {success && <div style={{ background: C.accentDim, border: `1px solid ${C.accentSoft}`, borderRadius: 8, padding: "10px 14px", color: C.accent, fontSize: 12, marginBottom: 12 }}>{success}</div>}

            <Btn onClick={handleRegistro} disabled={loading} color={C.accent} full size="lg" icon="✓">
              {loading ? "Creando cuenta..." : "Comenzar 14 días gratis"}
            </Btn>
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => setModo("login")} style={{ background: "none", border: "none", color: C.textMid, fontSize: 13, cursor: "pointer" }}>← Volver al login</button>
            </div>
          </>
        )}

        {modo === "forgot" && (
          <>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6 }}>Recuperar contraseña</h2>
            <p style={{ color: C.textMid, fontSize: 13, marginBottom: 24 }}>Te enviamos un enlace a tu correo</p>
            <Input label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" icon="📧" />
            <Btn onClick={() => { setSuccess("Enlace enviado. Revisa tu bandeja de entrada."); }} color={C.accent} full>Enviar enlace de recuperación</Btn>
            {success && <div style={{ marginTop: 12, background: C.accentDim, border: `1px solid ${C.accentSoft}`, borderRadius: 8, padding: "10px 14px", color: C.accent, fontSize: 12 }}>{success}</div>}
            <div style={{ textAlign: "center", marginTop: 16 }}>
              <button onClick={() => setModo("login")} style={{ background: "none", border: "none", color: C.textMid, fontSize: 13, cursor: "pointer" }}>← Volver al login</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ADMINISTRADOR
// ══════════════════════════════════════════════════════════════════════════════
function PanelAdmin({ usuario, onLogout }) {
  const [tab, setTab] = useState("usuarios");
  const [usuarios, setUsuarios] = useState(INITIAL_USERS);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroPlan, setFiltroPlan] = useState("todos");
  const [modalUsuario, setModalUsuario] = useState(null);
  const [confirmacion, setConfirmacion] = useState(null);

  const usuariosFiltrados = usuarios.filter(u => {
    const matchBusq = !busqueda || u.nombre.toLowerCase().includes(busqueda.toLowerCase()) || u.email.toLowerCase().includes(busqueda.toLowerCase());
    const matchEst = filtroEstado === "todos" || u.estado === filtroEstado;
    const matchPlan = filtroPlan === "todos" || u.plan === filtroPlan;
    return matchBusq && matchEst && matchPlan;
  });

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.estado === "activo").length,
    mrr: usuarios.filter(u => u.estado === "activo").reduce((s, u) => s + (PLANES[u.plan]?.precio || 0), 0),
    declaraciones: usuarios.reduce((s, u) => s + u.declaracionesMes, 0),
  };

  const cambiarEstado = (id, estado) => {
    setUsuarios(us => us.map(u => u.id === id ? { ...u, estado } : u));
    setConfirmacion(null);
    setModalUsuario(null);
  };

  const cambiarPlan = (id, plan) => {
    setUsuarios(us => us.map(u => u.id === id ? { ...u, plan } : u));
  };

  const TABS_ADMIN = [
    { id: "usuarios", label: "Contadores", icon: "👥" },
    { id: "planes", label: "Planes & Precios", icon: "💎" },
    { id: "reportes", label: "Reportes", icon: "📊" },
    { id: "sistema", label: "Sistema", icon: "⚙️" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex" }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 18px 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⬡</div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>ContaGT <span style={{ color: C.accent }}>Pro</span></div>
              <Pill color={C.gold}>ADMIN</Pill>
            </div>
          </div>
        </div>

        {TABS_ADMIN.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
            background: tab === t.id ? C.accent + "15" : "transparent",
            borderLeft: tab === t.id ? `3px solid ${C.accent}` : "3px solid transparent",
            border: "none", borderRight: "none",
            color: tab === t.id ? C.accent : C.textMid, fontSize: 13,
            fontWeight: tab === t.id ? 700 : 400, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}

        <div style={{ marginTop: "auto", padding: "16px 18px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Avatar nombre={usuario.nombre} size={32} color={C.gold} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{usuario.nombre}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>Administrador</div>
            </div>
          </div>
          <Btn onClick={onLogout} color={C.red} size="sm" full icon="↩">Cerrar sesión</Btn>
        </div>
      </nav>

      {/* Contenido */}
      <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>

        {/* USUARIOS */}
        {tab === "usuarios" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Gestión de Contadores</h2>
                <p style={{ color: C.textMid, margin: "4px 0 0", fontSize: 13 }}>{usuarios.length} contadores registrados</p>
              </div>
              <Btn icon="+" color={C.accent}>Agregar contador</Btn>
            </div>

            {/* Stats rápidas */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 24 }}>
              <Stat label="Total contadores" value={stats.total} icon="👥" color={C.blue} />
              <Stat label="Cuentas activas" value={stats.activos} icon="✓" color={C.accent} />
              <Stat label="MRR estimado" value={`Q${stats.mrr.toLocaleString()}`} icon="💰" color={C.gold} sub="Ingresos mensuales" />
              <Stat label="Declaraciones/mes" value={stats.declaraciones} icon="📋" color={C.purple} sub="Todas las cuentas" />
            </div>

            {/* Filtros */}
            <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
              <input value={busqueda} onChange={e => setBusqueda(e.target.value)} placeholder="🔍  Buscar por nombre o email..."
                style={{ flex: 1, minWidth: 220, background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "9px 14px", fontSize: 13, fontFamily: "inherit" }} />
              {[["todos","Todos"], ["activo","Activos"], ["suspendido","Suspendidos"], ["trial","Trial"]].map(([v, l]) => (
                <Btn key={v} onClick={() => setFiltroEstado(v)} color={filtroEstado === v ? C.accent : C.textDim} size="sm" variant={filtroEstado === v ? "filled" : "ghost"}>{l}</Btn>
              ))}
              <select value={filtroPlan} onChange={e => setFiltroPlan(e.target.value)}
                style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.text, borderRadius: 8, padding: "7px 12px", fontSize: 12, fontFamily: "inherit" }}>
                <option value="todos">Todos los planes</option>
                {Object.values(PLANES).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>

            {/* Tabla */}
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: C.surface }}>
                    {["Contador","Email","Plan","Estado","Clientes","Declarac./mes","Registrado","Acciones"].map(h => (
                      <th key={h} style={{ textAlign: "left", padding: "12px 16px", fontSize: 10, color: C.textDim, letterSpacing: 0.6, fontWeight: 700, borderBottom: `1px solid ${C.border}` }}>{h.toUpperCase()}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((u, i) => (
                    <tr key={u.id} style={{ borderBottom: `1px solid ${C.border}20`, background: i % 2 === 0 ? "transparent" : C.surface + "40" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar nombre={u.nombre} size={30} color={planColor(u.plan)} />
                          <div>
                            <div style={{ fontWeight: 600, color: C.text }}>{u.nombre}</div>
                            <div style={{ fontSize: 10, color: C.textDim }}>Colegiado #{u.colegiado}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", color: C.textMid, fontSize: 12 }}>{u.email}</td>
                      <td style={{ padding: "12px 16px" }}><Pill color={planColor(u.plan)}>{PLANES[u.plan]?.nombre || u.plan}</Pill></td>
                      <td style={{ padding: "12px 16px" }}><Pill color={estadoColor(u.estado)}>{estadoLabel(u.estado)}</Pill></td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: C.text, fontWeight: 600 }}>{u.clientes} / {PLANES[u.plan]?.limiteClientes || "—"}</td>
                      <td style={{ padding: "12px 16px", fontFamily: "monospace", color: C.text }}>{u.declaracionesMes}</td>
                      <td style={{ padding: "12px 16px", color: C.textMid, fontSize: 11 }}>{u.fechaRegistro}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <Btn size="sm" color={C.blue} onClick={() => setModalUsuario(u)} icon="✏">Ver</Btn>
                          {u.estado === "activo"
                            ? <Btn size="sm" color={C.red} onClick={() => setConfirmacion({ u, accion: "suspendido" })} icon="⊘">Suspender</Btn>
                            : <Btn size="sm" color={C.accent} onClick={() => cambiarEstado(u.id, "activo")} icon="✓">Activar</Btn>
                          }
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {usuariosFiltrados.length === 0 && (
                <div style={{ textAlign: "center", padding: 40, color: C.textDim }}>No se encontraron contadores con esos filtros</div>
              )}
            </Card>
          </div>
        )}

        {/* PLANES */}
        {tab === "planes" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 6 }}>Planes & Precios</h2>
            <p style={{ color: C.textMid, marginBottom: 28, fontSize: 13 }}>Configura los límites y precios de cada plan</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {Object.values(PLANES).map(p => (
                <Card key={p.id} color={p.color} style={{ position: "relative" }}>
                  {p.id === "pro" && (
                    <div style={{ position: "absolute", top: -1, right: 20, background: p.color, color: "#000", fontSize: 10, fontWeight: 800, padding: "4px 12px", borderRadius: "0 0 8px 8px", letterSpacing: 0.5 }}>MÁS POPULAR</div>
                  )}
                  <div style={{ fontSize: 28, color: p.color, marginBottom: 8 }}>{p.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: C.text, marginBottom: 4 }}>{p.nombre}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 32, fontWeight: 900, color: p.color, marginBottom: 4 }}>Q{p.precio}<span style={{ fontSize: 14, color: C.textMid, fontWeight: 400 }}>/mes</span></div>
                  <div style={{ fontSize: 11, color: C.textDim, marginBottom: 20 }}>
                    {usuarios.filter(u => u.plan === p.id && u.estado === "activo").length} contadores activos ·
                    Q{(usuarios.filter(u => u.plan === p.id && u.estado === "activo").length * p.precio).toLocaleString()} MRR
                  </div>
                  <div style={{ borderTop: `1px solid ${p.color}25`, paddingTop: 16, marginBottom: 16 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ color: p.color, fontWeight: 700, marginTop: 1 }}>✓</span>
                        <span style={{ fontSize: 12, color: C.textMid }}>{f}</span>
                      </div>
                    ))}
                    {p.noFeatures.map(f => (
                      <div key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8 }}>
                        <span style={{ color: C.textDim, fontWeight: 700, marginTop: 1 }}>✗</span>
                        <span style={{ fontSize: 12, color: C.textDim }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <Btn color={p.color} full size="sm" icon="✏">Editar plan</Btn>
                </Card>
              ))}
            </div>

            <Card style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: C.gold }}>💰 Resumen de Ingresos Estimados</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
                <Stat label="MRR Total" value={`Q${stats.mrr.toLocaleString()}`} color={C.gold} />
                <Stat label="ARR Proyectado" value={`Q${(stats.mrr * 12).toLocaleString()}`} color={C.accent} />
                <Stat label="Ticket promedio" value={`Q${stats.activos ? Math.round(stats.mrr / stats.activos) : 0}`} color={C.blue} />
                <Stat label="Churn potencial" value={`${usuarios.filter(u => u.estado === "suspendido").length} cuentas`} color={C.red} />
              </div>
            </Card>
          </div>
        )}

        {/* REPORTES */}
        {tab === "reportes" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Reportes del Sistema</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.accent, marginBottom: 16 }}>📈 Crecimiento de Contadores</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {["Ene","Feb","Mar","Abr","May","Jun"].map((m, i) => {
                    const val = [1, 2, 3, 3, 4, 5][i];
                    return (
                      <div key={m} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: C.textDim, width: 30 }}>{m}</span>
                        <div style={{ flex: 1, height: 20, background: C.surface, borderRadius: 4, overflow: "hidden" }}>
                          <div style={{ width: `${val * 20}%`, height: "100%", background: `linear-gradient(90deg, ${C.accent}, ${C.blue})`, borderRadius: 4, transition: "width 1s" }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: C.text, width: 20 }}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.gold, marginBottom: 16 }}>💎 Distribución por Plan</div>
                {Object.values(PLANES).map(p => {
                  const count = usuarios.filter(u => u.plan === p.id).length;
                  const pct = Math.round(count / usuarios.length * 100);
                  return (
                    <div key={p.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, color: p.color, fontWeight: 700 }}>{p.nombre}</span>
                        <span style={{ fontSize: 12, color: C.textMid }}>{count} contadores ({pct}%)</span>
                      </div>
                      <div style={{ height: 8, background: C.surface, borderRadius: 4 }}>
                        <div style={{ width: `${pct}%`, height: "100%", background: p.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.blue, marginBottom: 16 }}>📋 Actividad Reciente</div>
                {ACTIVIDAD_RECIENTE.map((a, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < ACTIVIDAD_RECIENTE.length - 1 ? `1px solid ${C.border}20` : "none" }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: a.color, marginTop: 5, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: C.text }}>{a.msg}</div>
                      <div style={{ fontSize: 10, color: C.textDim }}>{a.tiempo}</div>
                    </div>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.purple, marginBottom: 16 }}>🔌 Estado de Servicios SAT</div>
                {[["Portal RTU / NIT", "operational"], ["Portal FEL", "operational"], ["Declaraguate", "degraded"], ["SAQB'E / DUCA", "operational"]].map(([s, est]) => (
                  <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{ fontSize: 13, color: C.textMid }}>{s}</span>
                    <Pill color={est === "operational" ? C.accent : C.gold}>{est === "operational" ? "Operacional" : "Degradado"}</Pill>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* SISTEMA */}
        {tab === "sistema" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Configuración del Sistema</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.accent, marginBottom: 16 }}>🔐 Seguridad</div>
                {[["JWT Secret", "Configurado ✓"], ["API Key SAT", "Configurado ✓"], ["Rate Limiting", "Activo"], ["CORS Origins", "2 dominios"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{ fontSize: 13, color: C.textMid }}>{k}</span>
                    <span style={{ fontSize: 12, color: C.accent, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.gold, marginBottom: 16 }}>🗄️ Base de Datos</div>
                {[["Motor", "PostgreSQL 15"], ["Tablas", "8 tablas activas"], ["Usuarios", `${usuarios.length} registros`], ["Caché NIT", "24h TTL"], ["Caché FEL", "1h TTL"]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{ fontSize: 13, color: C.textMid }}>{k}</span>
                    <span style={{ fontSize: 12, color: C.gold, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Modal usuario */}
      {modalUsuario && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 32, width: 480, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Detalle del Contador</h3>
              <button onClick={() => setModalUsuario(null)} style={{ background: "none", border: "none", color: C.textMid, fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
              <Avatar nombre={modalUsuario.nombre} size={52} color={planColor(modalUsuario.plan)} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{modalUsuario.nombre}</div>
                <div style={{ color: C.textMid, fontSize: 13 }}>{modalUsuario.email}</div>
                <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                  <Pill color={planColor(modalUsuario.plan)}>{PLANES[modalUsuario.plan]?.nombre}</Pill>
                  <Pill color={estadoColor(modalUsuario.estado)}>{estadoLabel(modalUsuario.estado)}</Pill>
                </div>
              </div>
            </div>
            {[["Colegiado CPA", `#${modalUsuario.colegiado}`], ["Teléfono", modalUsuario.telefono], ["Clientes activos", `${modalUsuario.clientes} / ${PLANES[modalUsuario.plan]?.limiteClientes}`], ["Declaraciones este mes", modalUsuario.declaracionesMes], ["Fecha de registro", modalUsuario.fechaRegistro], ["Rol en sistema", modalUsuario.rol]].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}20` }}>
                <span style={{ fontSize: 13, color: C.textMid }}>{k}</span>
                <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 10, color: C.textMid, letterSpacing: 0.6, marginBottom: 8 }}>CAMBIAR PLAN</div>
              <div style={{ display: "flex", gap: 8 }}>
                {Object.values(PLANES).map(p => (
                  <Btn key={p.id} size="sm" color={p.color} onClick={() => cambiarPlan(modalUsuario.id, p.id)} variant={modalUsuario.plan === p.id ? "filled" : "ghost"}>{p.nombre}</Btn>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              {modalUsuario.estado === "activo"
                ? <Btn color={C.red} onClick={() => { setConfirmacion({ u: modalUsuario, accion: "suspendido" }); setModalUsuario(null); }} icon="⊘" full>Suspender cuenta</Btn>
                : <Btn color={C.accent} onClick={() => cambiarEstado(modalUsuario.id, "activo")} icon="✓" full>Activar cuenta</Btn>
              }
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación */}
      {confirmacion && (
        <div style={{ position: "fixed", inset: 0, background: "#00000088", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: C.card, border: `1px solid ${C.red}40`, borderRadius: 14, padding: 32, width: 380, textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <h3 style={{ margin: "0 0 8px", color: C.text }}>¿Suspender cuenta?</h3>
            <p style={{ color: C.textMid, fontSize: 13, marginBottom: 24 }}>Se suspenderá el acceso de <b style={{ color: C.text }}>{confirmacion.u.nombre}</b>. Podrás reactivarla en cualquier momento.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn color={C.textMid} onClick={() => setConfirmacion(null)} full>Cancelar</Btn>
              <Btn color={C.red} onClick={() => cambiarEstado(confirmacion.u.id, "suspendido")} full icon="⊘">Suspender</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL CONTADOR (usuario normal)
// ══════════════════════════════════════════════════════════════════════════════
function PanelContador({ usuario, onLogout }) {
  const [tab, setTab] = useState("clientes");
  const [clientes] = useState(CLIENTES_DEMO);
  const [clienteActivo, setClienteActivo] = useState(null);
  const plan = PLANES[usuario.plan] || PLANES.basico;

  const TABS = [
    { id: "clientes", label: "Mis Clientes", icon: "🏢" },
    { id: "declaraciones", label: "Declaraciones", icon: "📋" },
    { id: "actividad", label: "Actividad", icon: "⚡" },
    { id: "perfil", label: "Mi Cuenta", icon: "👤" },
  ];

  const usoPct = Math.round(clientes.length / plan.limiteClientes * 100);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', 'Segoe UI', sans-serif", display: "flex" }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "20px 0" }}>
        <div style={{ padding: "0 18px 20px", borderBottom: `1px solid ${C.border}`, marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div style={{ width: 34, height: 34, background: `linear-gradient(135deg, ${C.accent}, ${C.blue})`, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⬡</div>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>ContaGT <span style={{ color: C.accent }}>Pro</span></div>
          </div>
          <Pill color={plan.color} size="md">{plan.icon} Plan {plan.nombre}</Pill>
        </div>

        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 18px",
            background: tab === t.id ? C.accent + "15" : "transparent",
            borderLeft: tab === t.id ? `3px solid ${C.accent}` : "3px solid transparent",
            border: "none", borderRight: "none",
            color: tab === t.id ? C.accent : C.textMid, fontSize: 13,
            fontWeight: tab === t.id ? 700 : 400, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
          }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}

        {/* Uso del plan */}
        <div style={{ margin: "16px 12px", padding: 14, background: plan.color + "0A", border: `1px solid ${plan.color}25`, borderRadius: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: C.textDim }}>CLIENTES USADOS</span>
            <span style={{ fontSize: 10, color: plan.color, fontWeight: 700 }}>{clientes.length}/{plan.limiteClientes}</span>
          </div>
          <div style={{ height: 6, background: C.surface, borderRadius: 3 }}>
            <div style={{ width: `${usoPct}%`, height: "100%", background: usoPct > 80 ? C.red : plan.color, borderRadius: 3, transition: "width 1s" }} />
          </div>
          {usoPct > 80 && <div style={{ fontSize: 10, color: C.gold, marginTop: 6 }}>⚠ Considera subir de plan</div>}
        </div>

        <div style={{ marginTop: "auto", padding: "16px 18px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <Avatar nombre={usuario.nombre} size={32} color={plan.color} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.3 }}>{usuario.nombre}</div>
              <div style={{ fontSize: 10, color: C.textDim }}>CPA #{usuario.colegiado}</div>
            </div>
          </div>
          <Btn onClick={onLogout} color={C.red} size="sm" full icon="↩">Salir</Btn>
        </div>
      </nav>

      {/* Contenido */}
      <main style={{ flex: 1, padding: 28, overflowY: "auto" }}>

        {tab === "clientes" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontWeight: 800, fontSize: 22, margin: 0 }}>Mis Empresas Cliente</h2>
                <p style={{ color: C.textMid, margin: "4px 0 0", fontSize: 13 }}>{clientes.length} empresas activas — Plan {plan.nombre}</p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Btn icon="+" color={C.accent} disabled={clientes.length >= plan.limiteClientes}>Agregar empresa</Btn>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
              {clientes.map(c => (
                <Card key={c.id} color={c.declaracionesPendientes > 0 ? C.gold : C.accent} onClick={() => setClienteActivo(c)} style={{ cursor: "pointer", transition: "all 0.2s" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 4 }}>{c.nombre}</div>
                      <div style={{ fontSize: 11, color: C.textDim, fontFamily: "monospace" }}>NIT: {c.nit}</div>
                    </div>
                    {c.declaracionesPendientes > 0 && (
                      <div style={{ background: C.red, color: "#fff", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{c.declaracionesPendientes}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                    <Pill color={C.blue} size="sm">{c.sector}</Pill>
                    <Pill color={C.purple} size="sm">{c.regimen === "general" ? "Régimen General" : c.regimen === "pequenio" ? "Pequeño Contrib." : "Opcional"}</Pill>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: C.textDim }}>Última declaración: {c.ultimaDeclaracion}</span>
                    <Btn size="sm" color={C.accent} icon="→">Gestionar</Btn>
                  </div>
                </Card>
              ))}

              {/* Card agregar */}
              {clientes.length < plan.limiteClientes && (
                <div style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, cursor: "pointer", minHeight: 160, color: C.textDim }}>
                  <div style={{ fontSize: 32 }}>+</div>
                  <div style={{ fontSize: 13 }}>Agregar empresa cliente</div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "declaraciones" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Centro de Declaraciones</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
              <Stat label="Pendientes" value="3" color={C.red} icon="⏰" sub="Vencen este mes" />
              <Stat label="Completadas" value="42" color={C.accent} icon="✓" sub="Este mes" />
              <Stat label="Clientes al día" value={`${clientes.filter(c => c.declaracionesPendientes === 0).length}/${clientes.length}`} color={C.blue} icon="📋" />
            </div>
            <Card>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.accent, marginBottom: 16 }}>📅 Próximos Vencimientos — Junio 2025</div>
              {[
                { empresa: "Constructora Norte GT", tipo: "IVA Mayo", vence: "30 Jun", estado: "pendiente" },
                { empresa: "Servicios Tech GT", tipo: "ISO T2", vence: "30 Jun", estado: "pendiente" },
                { empresa: "Distribuciones El Rápido", tipo: "IVA Mayo", vence: "30 Jun", estado: "pendiente" },
                { empresa: "Farmacia San José", tipo: "IVA Mayo", vence: "30 Jun", estado: "completado" },
                { empresa: "Restaurante La Colonial", tipo: "IVA Mayo", vence: "30 Jun", estado: "completado" },
              ].map((d, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: `1px solid ${C.border}20` }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.estado === "completado" ? C.accent : C.red, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{d.empresa}</div>
                    <div style={{ fontSize: 11, color: C.textDim }}>{d.tipo} · Vence: {d.vence}</div>
                  </div>
                  <Pill color={d.estado === "completado" ? C.accent : C.red}>{d.estado === "completado" ? "LISTA" : "PENDIENTE"}</Pill>
                  {d.estado !== "completado" && <Btn size="sm" color={C.accent} icon="📋">Declarar</Btn>}
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab === "actividad" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Actividad Reciente</h2>
            <Card>
              {ACTIVIDAD_RECIENTE.map((a, i) => (
                <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start", padding: "14px 0", borderBottom: i < ACTIVIDAD_RECIENTE.length - 1 ? `1px solid ${C.border}20` : "none" }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: a.color + "18", border: `1px solid ${a.color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                    {a.tipo === "declaracion" ? "📋" : a.tipo === "nit" ? "🔍" : a.tipo === "fel" ? "🧾" : "🏢"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{a.msg}</div>
                    <div style={{ fontSize: 11, color: C.textDim, marginTop: 2 }}>{a.tiempo}</div>
                  </div>
                  <Pill color={a.color}>{a.tipo.toUpperCase()}</Pill>
                </div>
              ))}
            </Card>
          </div>
        )}

        {tab === "perfil" && (
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 20 }}>Mi Cuenta</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <Card>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.accent, marginBottom: 20 }}>👤 Datos Profesionales</div>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
                  <Avatar nombre={usuario.nombre} size={56} color={plan.color} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>{usuario.nombre}</div>
                    <div style={{ color: C.textMid, fontSize: 13 }}>{usuario.email}</div>
                    <div style={{ fontSize: 12, color: C.textDim }}>CPA Colegiado #{usuario.colegiado}</div>
                  </div>
                </div>
                {[["Email", usuario.email], ["Colegiado", `#${usuario.colegiado}`], ["Plan activo", plan.nombre], ["Clientes disponibles", `${plan.limiteClientes - clientes.length} restantes`]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}20` }}>
                    <span style={{ fontSize: 13, color: C.textMid }}>{k}</span>
                    <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </Card>
              <Card color={plan.color}>
                <div style={{ fontWeight: 700, fontSize: 14, color: plan.color, marginBottom: 16 }}>💎 Tu Plan: {plan.nombre}</div>
                <div style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 900, color: plan.color, marginBottom: 16 }}>Q{plan.precio}<span style={{ fontSize: 13, color: C.textMid, fontWeight: 400 }}>/mes</span></div>
                {plan.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <span style={{ color: plan.color }}>✓</span>
                    <span style={{ fontSize: 12, color: C.textMid }}>{f}</span>
                  </div>
                ))}
                <div style={{ marginTop: 20 }}>
                  <Btn color={plan.color} full icon="⬆">Subir de plan</Btn>
                </div>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function ContaGTSaaS() {
  const [usuario, setUsuario] = useState(null);

  const handleLogin = (u) => setUsuario(u);
  const handleLogout = () => setUsuario(null);

  if (!usuario) return <PantallaLogin onLogin={handleLogin} />;
  if (usuario.rol === "admin") return <PanelAdmin usuario={usuario} onLogout={handleLogout} />;
  return <PanelContador usuario={usuario} onLogout={handleLogout} />;
}
