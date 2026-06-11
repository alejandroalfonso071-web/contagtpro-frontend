import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";

// ══════════════════════════════════════════════════════════════════════════════
// TEMA
// ══════════════════════════════════════════════════════════════════════════════
const C = {
  bg:"#05080F", surface:"#0A1020", card:"#0F1A2E", border:"#162840", borderBr:"#1E3A58",
  accent:"#00C896", accentDim:"#00C89610", accentSoft:"#00C89628",
  gold:"#F5A623", goldDim:"#F5A62312", red:"#FF4060", redDim:"#FF406012",
  blue:"#3B8FFF", blueDim:"#3B8FFF12", blueSoft:"#3B8FFF30",
  purple:"#9B6DFF", purpleDim:"#9B6DFF12",
  text:"#E0EAF6", textMid:"#6A88A8", textDim:"#2E4560",
};

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const fmt = n => new Intl.NumberFormat("es-GT",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
const fmtQ = n => `Q ${fmt(n)}`;
const toNum = v => parseFloat((v+"").replace(/[^0-9.-]/g,""))||0;
const today = () => { const d=new Date(); return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`; };

// ══════════════════════════════════════════════════════════════════════════════
// DATOS INICIALES
// ══════════════════════════════════════════════════════════════════════════════
const PLANES = {
  basico:    { id:"basico",    nombre:"Básico",    precio:149, color:C.blue,   icon:"◈", limiteClientes:5  },
  pro:       { id:"pro",       nombre:"Pro",       precio:299, color:C.accent, icon:"◆", limiteClientes:25 },
  ilimitado: { id:"ilimitado", nombre:"Ilimitado", precio:599, color:C.gold,   icon:"◉", limiteClientes:999},
};

const CLIENTES_INICIALES = [
  { id:"c1", nombre:"Distribuciones El Rápido S.A.", nit:"5908472-K", regimen:"general",  sector:"Comercio",       declaracionesPendientes:1, ultimaDeclaracion:"May 2025" },
  { id:"c2", nombre:"Farmacia San José",             nit:"1234567-8", regimen:"pequenio", sector:"Farmacéutico",   declaracionesPendientes:0, ultimaDeclaracion:"May 2025" },
  { id:"c3", nombre:"Constructora Norte GT",         nit:"9876543-1", regimen:"general",  sector:"Construcción",   declaracionesPendientes:2, ultimaDeclaracion:"Abr 2025" },
  { id:"c4", nombre:"Restaurante La Colonial",       nit:"3456789-0", regimen:"pequenio", sector:"Alimentos",      declaracionesPendientes:0, ultimaDeclaracion:"May 2025" },
  { id:"c5", nombre:"Servicios Tech GT",             nit:"7654321-K", regimen:"opcional", sector:"Tecnología",     declaracionesPendientes:1, ultimaDeclaracion:"May 2025" },
];

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTES BASE
// ══════════════════════════════════════════════════════════════════════════════
const Pill = ({children,color=C.accent,size="sm"})=>(
  <span style={{background:color+"18",color,border:`1px solid ${color}35`,borderRadius:20,padding:size==="sm"?"2px 9px":"4px 14px",fontSize:size==="sm"?10:12,fontWeight:700,letterSpacing:0.4,display:"inline-block",whiteSpace:"nowrap"}}>{children}</span>
);
const Card = ({children,style={},color,onClick})=>(
  <div onClick={onClick} style={{background:C.card,border:`1px solid ${color?color+"30":C.border}`,borderRadius:14,padding:24,transition:"all 0.2s",cursor:onClick?"pointer":"default",boxShadow:color?`0 0 24px ${color}08`:"none",...style}}>{children}</div>
);
const Btn = ({children,onClick,color=C.accent,disabled,icon,size="md",full})=>{
  const pad=size==="sm"?"7px 14px":size==="lg"?"14px 28px":"10px 20px";
  const fs=size==="sm"?11:size==="lg"?15:13;
  return <button onClick={onClick} disabled={disabled} style={{background:disabled?C.surface:color+"18",border:`1px solid ${disabled?C.border:color+"50"}`,color:disabled?C.textDim:color,borderRadius:9,padding:pad,fontSize:fs,fontWeight:700,cursor:disabled?"not-allowed":"pointer",display:"inline-flex",alignItems:"center",gap:7,width:full?"100%":undefined,justifyContent:full?"center":undefined,transition:"all 0.15s",letterSpacing:0.3,fontFamily:"inherit"}}>{icon&&<span style={{fontSize:fs+2}}>{icon}</span>}{children}</button>;
};
const Input = ({label,value,onChange,placeholder,type="text",icon,mono})=>(
  <div style={{marginBottom:14}}>
    {label&&<label style={{display:"block",fontSize:10,color:C.textMid,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>{label}</label>}
    <div style={{position:"relative"}}>
      {icon&&<span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontSize:16,pointerEvents:"none"}}>{icon}</span>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:9,padding:icon?"12px 14px 12px 38px":"11px 14px",fontSize:13,boxSizing:"border-box",fontFamily:mono?"monospace":"inherit"}}/>
    </div>
  </div>
);
const Avatar = ({nombre,size=36,color=C.accent})=>{
  const i=(nombre||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();
  return <div style={{width:size,height:size,borderRadius:"50%",background:color+"22",border:`2px solid ${color}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.35,fontWeight:800,color,flexShrink:0}}>{i}</div>;
};
const Stat = ({label,value,sub,color=C.accent,icon})=>(
  <div style={{background:color+"0A",border:`1px solid ${color}25`,borderRadius:12,padding:"16px 18px"}}>
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>{icon&&<span style={{fontSize:16}}>{icon}</span>}<span style={{fontSize:10,color:C.textMid,letterSpacing:0.8,textTransform:"uppercase"}}>{label}</span></div>
    <div style={{fontSize:24,fontWeight:800,color,fontFamily:"monospace",letterSpacing:-1}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:C.textDim,marginTop:3}}>{sub}</div>}
  </div>
);
const Divider = ({label})=>(
  <div style={{display:"flex",alignItems:"center",gap:12,margin:"18px 0"}}>
    <div style={{flex:1,height:1,background:C.border}}/>
    {label&&<span style={{color:C.textDim,fontSize:10,letterSpacing:1,textTransform:"uppercase"}}>{label}</span>}
    <div style={{flex:1,height:1,background:C.border}}/>
  </div>
);

const planColor = p=>({basico:C.blue,pro:C.accent,ilimitado:C.gold})[p]||C.textMid;
const estadoColor = e=>({activo:C.accent,suspendido:C.red,trial:C.gold})[e]||C.textMid;

// ══════════════════════════════════════════════════════════════════════════════
// PARSER EXCEL
// ══════════════════════════════════════════════════════════════════════════════
function parseExcel(file){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=e=>{
      try{const wb=XLSX.read(e.target.result,{type:"array"});const ws=wb.Sheets[wb.SheetNames[0]];resolve(XLSX.utils.sheet_to_json(ws,{defval:""}));}
      catch(err){reject(err);}
    };
    reader.readAsArrayBuffer(file);
  });
}
function normalizeRows(rows,tipo){
  if(!rows.length)return[];
  const keys=Object.keys(rows[0]).map(k=>k.toLowerCase().trim());
  const find=(...opts)=>{for(const o of opts){const idx=keys.findIndex(k=>k.includes(o));if(idx!==-1)return Object.keys(rows[0])[idx];}return null;};
  const colFecha=find("fecha","date"); const colDoc=find("factura","doc","numero","serie","no.");
  const colNombre=tipo==="compras"?find("proveedor","nombre","razon","empresa"):find("cliente","nombre","razon","empresa");
  const colNIT=find("nit","rtu","id"); const colBase=find("base","subtotal","neto","monto neto");
  const colIVA=find("iva","impuesto","tax"); const colTotal=find("total","monto total","gran total");
  const colDesc=find("descripcion","concepto","detalle","producto");
  return rows.map((r,i)=>{
    let base=toNum(r[colBase]),iva=toNum(r[colIVA]),total=toNum(r[colTotal]);
    if(!base&&!iva&&total){base=total/1.12;iva=total-base;}
    else if(base&&!iva&&!total){iva=base*0.12;total=base+iva;}
    else if(base&&!iva&&total){iva=total-base;}
    else if(!base&&iva&&total){base=total-iva;}
    return{id:i+1,fecha:r[colFecha]||today(),documento:r[colDoc]||`${tipo.toUpperCase()}-${String(i+1).padStart(4,"0")}`,nombre:r[colNombre]||"Sin nombre",nit:r[colNIT]||"CF",base:Math.round(base*100)/100,iva:Math.round(iva*100)/100,total:Math.round(total*100)/100,descripcion:r[colDesc]||"Operación comercial"};
  }).filter(r=>r.total>0||r.base>0);
}

// ══════════════════════════════════════════════════════════════════════════════
// CLAUDE AI
// ══════════════════════════════════════════════════════════════════════════════
const API_URL = process.env.REACT_APP_API_URL || "";
const API_KEY = process.env.REACT_APP_API_KEY || "";
async function askClaude(prompt){
  const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:"Eres un contador experto en tributación guatemalteca. Conoces perfectamente la SAT, ISR (Decreto 10-2012), IVA (Decreto 27-92), ISO (Decreto 73-2008). Responde en español, preciso y conciso.",messages:[{role:"user",content:prompt}]})});
  const data=await res.json();
  return data.content?.map(b=>b.text||"").join("")||"Sin respuesta";
}

// ══════════════════════════════════════════════════════════════════════════════
// DROPZONE
// ══════════════════════════════════════════════════════════════════════════════
function DropZone({label,icon,color,count,loading,onFile}){
  const ref=useRef();
  const [drag,setDrag]=useState(false);
  return(
    <div onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={()=>setDrag(false)}
      onDrop={e=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)onFile(f);}}
      onClick={()=>ref.current.click()}
      style={{border:`2px dashed ${drag?color:C.border}`,borderRadius:12,padding:28,textAlign:"center",cursor:"pointer",transition:"all 0.2s",background:drag?color+"08":"transparent"}}>
      <input ref={ref} type="file" accept=".xlsx,.xls,.csv" style={{display:"none"}} onChange={e=>{if(e.target.files[0])onFile(e.target.files[0]);}}/>
      <div style={{fontSize:32,marginBottom:6}}>{loading?"⏳":count>0?"✅":icon}</div>
      <div style={{fontWeight:700,marginBottom:4,color:count>0?color:C.text,fontSize:13}}>{label}</div>
      {loading?<div style={{color:C.textMid,fontSize:12}}>Procesando...</div>
        :count>0?<div style={{color,fontSize:12,fontWeight:700}}>{count} registros — clic para reemplazar</div>
        :<div style={{color:C.textDim,fontSize:12}}>Arrastra tu .xlsx o .csv aquí</div>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SISTEMA CONTABLE (módulo por cliente)
// ══════════════════════════════════════════════════════════════════════════════
function SistemaContable({cliente,onVolver}){
  const [tab,setTab]=useState("dashboard");
  const [compras,setCompras]=useState([]);
  const [ventas,setVentas]=useState([]);
  const [periodo,setPeriodo]=useState({mes:new Date().getMonth(),anio:new Date().getFullYear()});
  const [loading,setLoading]=useState("");
  const [certified,setCertified]=useState(false);
  const [certDate,setCertDate]=useState("");
  const [aiChat,setAiChat]=useState([]);
  const [aiInput,setAiInput]=useState("");
  const [aiLoading,setAiLoading]=useState(false);
  const [nitConsulta,setNitConsulta]=useState("");
  const [nitLoading,setNitLoading]=useState(false);
  const [nitResult,setNitResult]=useState(null);
  const [uuidConsulta,setUuidConsulta]=useState("");
  const [felLoading,setFelLoading]=useState(false);
  const [felResult,setFelResult]=useState(null);
  const chatRef=useRef(null);

  const totC={base:compras.reduce((s,r)=>s+r.base,0),iva:compras.reduce((s,r)=>s+r.iva,0),total:compras.reduce((s,r)=>s+r.total,0)};
  const totV={base:ventas.reduce((s,r)=>s+r.base,0),iva:ventas.reduce((s,r)=>s+r.iva,0),total:ventas.reduce((s,r)=>s+r.total,0)};
  const ivaAPagar=Math.max(0,totV.iva-totC.iva);
  const ivaCF=Math.max(0,totC.iva-totV.iva);
  const utilidad=totV.base-totC.base;
  const isr=Math.max(0,utilidad*0.25);
  const iso=totV.total*0.01;

  const handleFile=useCallback(async(file,tipo)=>{
    setLoading(tipo);
    try{const rows=await parseExcel(file);const norm=normalizeRows(rows,tipo);if(tipo==="compras")setCompras(norm);else setVentas(norm);}
    catch(e){alert("Error al leer: "+e.message);}
    setLoading("");
  },[]);

  const certificar=()=>{setCertified(true);setCertDate(today());alert(`✅ Declaración certificada el ${today()}`);};

  const consultarNIT=async()=>{
  if(!nitConsulta.trim())return;
  setNitLoading(true);setNitResult(null);
  try{
    const res=await fetch(`${API_URL}/api/nit/${nitConsulta.trim()}`,{
      headers:{"X-API-Key":API_KEY}
    });
    const data=await res.json();
    if(data.ok){setNitResult(data.datos);}
    else{setNitResult({nit:nitConsulta,nombre:"Error al consultar",estado:"ERROR",tipo:"—",regimen:"—",actividad:"—",direccion:data.error||"Sin respuesta"});}
  }catch(e){
    setNitResult({nit:nitConsulta,nombre:"Sin conexión al backend",estado:"ERROR",tipo:"—",regimen:"—",actividad:"—",direccion:e.message});
  }
  setNitLoading(false);
};

  const validarFEL=async()=>{
  if(!uuidConsulta.trim())return;
  setFelLoading(true);setFelResult(null);
  try{
    const res=await fetch(`${API_URL}/api/fel/${uuidConsulta.trim()}`,{
      headers:{"X-API-Key":API_KEY}
    });
    const data=await res.json();
    if(data.datos){
      setFelResult({
        uuid:uuidConsulta,
        estado:data.datos.estado,
        color:data.datos.estado==="CERTIFICADA"?C.accent:C.red,
        icon:data.datos.estado==="CERTIFICADA"?"✓":"✗",
        tipo:data.datos.tipo||"FACTURA",
        emisor:data.datos.nombreEmisor||"—",
        nitEmisor:data.datos.nitEmisor||"—",
        fechaEmision:data.datos.fechaEmision||"—",
        base:data.datos.totalSinImpuestos||0,
        iva:data.datos.totalImpuestos||0,
        total:data.datos.totalConImpuestos||0,
        certificador:data.datos.certificador||"—",
      });
    }else{
      setFelResult({uuid:uuidConsulta,estado:"ERROR",color:C.red,icon:"✗",tipo:"—",emisor:data.error||"Sin respuesta",nitEmisor:"—",fechaEmision:"—",base:0,iva:0,total:0,certificador:"—"});
    }
  }catch(e){
    setFelResult({uuid:uuidConsulta,estado:"ERROR",color:C.red,icon:"✗",tipo:"—",emisor:e.message,nitEmisor:"—",fechaEmision:"—",base:0,iva:0,total:0,certificador:"—"});
  }
  setFelLoading(false);
};

  const sendAI=async()=>{
    if(!aiInput.trim()||aiLoading)return;
    const ctx=`Cliente: ${cliente.nombre} | NIT: ${cliente.nit} | Régimen: ${cliente.regimen}\nPeríodo: ${MESES[periodo.mes]} ${periodo.anio}\nVentas: Q${fmt(totV.total)} | Compras: Q${fmt(totC.total)} | IVA a pagar: Q${fmt(ivaAPagar)} | ISR: Q${fmt(isr)}`;
    setAiChat(c=>[...c,{role:"user",text:aiInput}]);
    setAiInput("");setAiLoading(true);
    try{const r=await askClaude(`CONTEXTO:\n${ctx}\n\nPREGUNTA: ${aiInput}`);setAiChat(c=>[...c,{role:"ai",text:r}]);}
    catch{setAiChat(c=>[...c,{role:"ai",text:"Error al conectar con el asistente."}]);}
    setAiLoading(false);
    setTimeout(()=>chatRef.current?.scrollTo({top:9999,behavior:"smooth"}),100);
  };

  const descargarFlat=(tipo)=>{
    const nit=cliente.nit.replace(/[^0-9K]/g,"");
    const periodo_str=`${periodo.anio}${String(periodo.mes+1).padStart(2,"0")}`;
    let contenido="";
    if(tipo==="IVA"){
      contenido=`INICIO_DECLARACION\nFORMULARIO=SAT-1311\nPERIODO=${periodo_str}\nNIT=${nit}\nRAZON_SOCIAL=${cliente.nombre}\nBASE_VENTAS=${totV.base.toFixed(2)}\nIVA_VENTAS=${totV.iva.toFixed(2)}\nBASE_COMPRAS=${totC.base.toFixed(2)}\nIVA_COMPRAS=${totC.iva.toFixed(2)}\nIVA_A_PAGAR=${ivaAPagar.toFixed(2)}\nREMANENTE_CF=${ivaCF.toFixed(2)}\nTOTAL_A_PAGAR=${ivaAPagar.toFixed(2)}\nFIN_DECLARACION`;
    } else if(tipo==="ISR"){
      contenido=`INICIO_DECLARACION\nFORMULARIO=SAT-1361\nANIO=${periodo.anio}\nNIT=${nit}\nRAZON_SOCIAL=${cliente.nombre}\nTOTAL_INGRESOS=${totV.base.toFixed(2)}\nTOTAL_COSTOS=${totC.base.toFixed(2)}\nRENTA_IMPONIBLE=${Math.max(0,utilidad).toFixed(2)}\nISR_DETERMINADO=${isr.toFixed(2)}\nISR_A_PAGAR=${isr.toFixed(2)}\nFIN_DECLARACION`;
    } else {
      contenido=`INICIO_DECLARACION\nFORMULARIO=SAT-2800\nANIO=${periodo.anio}\nNIT=${nit}\nRAZON_SOCIAL=${cliente.nombre}\nINGRESOS_BRUTOS=${totV.total.toFixed(2)}\nBASE_ISO=${totV.total.toFixed(2)}\nISO_DETERMINADO=${iso.toFixed(2)}\nISO_A_PAGAR=${iso.toFixed(2)}\nFIN_DECLARACION`;
    }
    const blob=new Blob([contenido],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`${tipo}_${periodo_str}_${nit}.txt`;a.click();URL.revokeObjectURL(url);
  };

  const TABS=[
    {id:"dashboard",label:"Resumen",icon:"⬡"},
    {id:"carga",label:"Cargar Datos",icon:"📂"},
    {id:"libros",label:"Libros",icon:"📚"},
    {id:"iva",label:"IVA",icon:"📋"},
    {id:"isr",label:"ISR",icon:"📊"},
    {id:"iso",label:"ISO",icon:"📈"},
    {id:"sat",label:"Consultas SAT",icon:"🔗"},
    {id:"asistente",label:"Asistente IA",icon:"🤖"},
  ];

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif",display:"flex",flexDirection:"column"}}>
      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:58,display:"flex",alignItems:"center",gap:14,position:"sticky",top:0,zIndex:100}}>
        <Btn onClick={onVolver} color={C.textMid} size="sm" icon="←">Mis Clientes</Btn>
        <div style={{width:1,height:28,background:C.border}}/>
        <div style={{width:32,height:32,background:C.accentSoft,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏢</div>
        <div>
          <div style={{fontWeight:800,fontSize:14,color:C.text}}>{cliente.nombre}</div>
          <div style={{fontSize:10,color:C.textDim}}>NIT: {cliente.nit} · {cliente.regimen==="general"?"Régimen General":cliente.regimen==="pequenio"?"Pequeño Contribuyente":"Opcional"}</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
          <select value={periodo.mes} onChange={e=>setPeriodo(p=>({...p,mes:+e.target.value}))}
            style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"4px 10px",fontSize:12,fontFamily:"inherit"}}>
            {MESES.map((m,i)=><option key={i} value={i}>{m}</option>)}
          </select>
          <select value={periodo.anio} onChange={e=>setPeriodo(p=>({...p,anio:+e.target.value}))}
            style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,padding:"4px 10px",fontSize:12,fontFamily:"inherit"}}>
            {[2023,2024,2025,2026].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
          {certified&&<Pill color={C.accent}>✓ CERTIFICADO</Pill>}
        </div>
      </div>

      <div style={{display:"flex",flex:1}}>
        {/* Sidebar */}
        <nav style={{width:180,background:C.surface,borderRight:`1px solid ${C.border}`,padding:"12px 0",flexShrink:0}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{width:"100%",display:"flex",alignItems:"center",gap:9,padding:"9px 16px",background:tab===t.id?C.accent+"18":"transparent",borderLeft:tab===t.id?`3px solid ${C.accent}`:"3px solid transparent",border:"none",borderRight:"none",color:tab===t.id?C.accent:C.textMid,fontSize:12,fontWeight:tab===t.id?700:400,cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
              <span style={{fontSize:14}}>{t.icon}</span>{t.label}
            </button>
          ))}
          <div style={{margin:"16px 10px",padding:12,background:C.accentDim,border:`1px solid ${C.accentSoft}`,borderRadius:8}}>
            <div style={{fontSize:9,color:C.accent,fontWeight:700,letterSpacing:0.5,marginBottom:4}}>DATOS CARGADOS</div>
            <div style={{fontSize:11,color:C.textMid}}>📥 Compras: <b style={{color:C.text}}>{compras.length}</b></div>
            <div style={{fontSize:11,color:C.textMid}}>📤 Ventas: <b style={{color:C.text}}>{ventas.length}</b></div>
          </div>
        </nav>

        {/* Contenido */}
        <main style={{flex:1,padding:24,overflowY:"auto"}}>

          {/* DASHBOARD */}
          {tab==="dashboard"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Resumen del Período</h2>
              <p style={{color:C.textMid,marginBottom:20,fontSize:13}}>{MESES[periodo.mes]} {periodo.anio} — {cliente.nombre}</p>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:20}}>
                <Stat label="Total Ventas" value={fmtQ(totV.total)} color={C.accent} icon="📤" sub={`Base: ${fmtQ(totV.base)}`}/>
                <Stat label="Total Compras" value={fmtQ(totC.total)} color={C.blue} icon="📥" sub={`Base: ${fmtQ(totC.base)}`}/>
                <Stat label="IVA a Pagar" value={fmtQ(ivaAPagar)} color={ivaCF>0?C.gold:C.red} icon="📋" sub={ivaCF>0?`CF: ${fmtQ(ivaCF)}`:"SAT-1311"}/>
                <Stat label="ISR Estimado" value={fmtQ(isr)} color={C.gold} icon="📊" sub={`ISO: ${fmtQ(iso)}`}/>
              </div>
              {compras.length===0&&ventas.length===0?(
                <Card style={{textAlign:"center",padding:40,borderStyle:"dashed"}}>
                  <div style={{fontSize:40,marginBottom:12}}>📂</div>
                  <div style={{fontWeight:700,fontSize:16,marginBottom:8}}>Sin datos para {cliente.nombre}</div>
                  <div style={{color:C.textMid,marginBottom:16,fontSize:13}}>Sube los archivos Excel o CSV de compras y ventas de este cliente</div>
                  <Btn onClick={()=>setTab("carga")} icon="📂">Cargar Archivos</Btn>
                </Card>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                  <Card>
                    <div style={{fontWeight:700,marginBottom:14,fontSize:13,color:C.accent}}>📋 Resumen IVA</div>
                    {[["Débito Fiscal",totV.iva,C.accent],["Crédito Fiscal",totC.iva,C.blue],[ivaAPagar>0?"IVA a Pagar":"Remanente CF",ivaAPagar>0?ivaAPagar:ivaCF,ivaAPagar>0?C.red:C.gold]].map(([l,v,c])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                        <span style={{color:C.textMid,fontSize:13}}>{l}</span>
                        <span style={{color:c,fontWeight:700,fontFamily:"monospace"}}>{fmtQ(v)}</span>
                      </div>
                    ))}
                    <div style={{marginTop:14,display:"flex",gap:8}}>
                      <Btn onClick={()=>descargarFlat("IVA")} color={C.accent} size="sm" icon="⬇">SAT-1311.txt</Btn>
                    </div>
                  </Card>
                  <Card>
                    <div style={{fontWeight:700,marginBottom:14,fontSize:13,color:C.gold}}>💼 ISR / ISO</div>
                    {[["Ingresos",totV.total,C.accent],["Costos",totC.total,C.blue],["Utilidad",utilidad,utilidad>=0?C.accent:C.red],["ISR (25%)",isr,C.gold],["ISO (1%)",iso,C.blue]].map(([l,v,c])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:`1px solid ${C.border}`}}>
                        <span style={{color:C.textMid,fontSize:13}}>{l}</span>
                        <span style={{color:c,fontWeight:700,fontFamily:"monospace"}}>{fmtQ(v)}</span>
                      </div>
                    ))}
                    <div style={{marginTop:14,display:"flex",gap:8}}>
                      <Btn onClick={()=>descargarFlat("ISR")} color={C.gold} size="sm" icon="⬇">SAT-1361.txt</Btn>
                      <Btn onClick={()=>descargarFlat("ISO")} color={C.blue} size="sm" icon="⬇">SAT-2800.txt</Btn>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          )}

          {/* CARGA */}
          {tab==="carga"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Cargar Archivos</h2>
              <p style={{color:C.textMid,marginBottom:20,fontSize:13}}>Sube los Excel o CSV de {cliente.nombre}. El sistema detecta las columnas automáticamente.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                <DropZone label="Libro de Compras" icon="📥" color={C.blue} count={compras.length} loading={loading==="compras"} onFile={f=>handleFile(f,"compras")}/>
                <DropZone label="Libro de Ventas" icon="📤" color={C.accent} count={ventas.length} loading={loading==="ventas"} onFile={f=>handleFile(f,"ventas")}/>
              </div>
              {(compras.length>0||ventas.length>0)&&(
                <Card>
                  <div style={{fontWeight:700,marginBottom:12,color:C.accent,fontSize:13}}>✅ Vista Previa — Primeros 5 registros</div>
                  {compras.length>0&&(
                    <div style={{marginBottom:16}}>
                      <div style={{fontSize:11,color:C.blue,fontWeight:700,marginBottom:8}}>COMPRAS ({compras.length} registros)</div>
                      <MiniTable rows={compras.slice(0,5)} color={C.blue}/>
                    </div>
                  )}
                  {ventas.length>0&&(
                    <div>
                      <div style={{fontSize:11,color:C.accent,fontWeight:700,marginBottom:8}}>VENTAS ({ventas.length} registros)</div>
                      <MiniTable rows={ventas.slice(0,5)} color={C.accent}/>
                    </div>
                  )}
                </Card>
              )}
            </div>
          )}

          {/* LIBROS */}
          {tab==="libros"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:20}}>Libros Contables</h2>
              <LibroContable tipo="compras" rows={compras} totales={totC} periodo={periodo} cliente={cliente}/>
              <div style={{height:20}}/>
              <LibroContable tipo="ventas" rows={ventas} totales={totV} periodo={periodo} cliente={cliente}/>
            </div>
          )}

          {/* IVA */}
          {tab==="iva"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Formulario IVA — SAT-1311</h2>
              <p style={{color:C.textMid,marginBottom:20,fontSize:13}}>Declaración Mensual — {MESES[periodo.mes]} {periodo.anio}</p>
              <Card>
                <SatHeader titulo="DECLARACIÓN JURADA DEL IMPUESTO AL VALOR AGREGADO" form="SAT-1311"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                  <FormField label="NIT" value={cliente.nit}/>
                  <FormField label="Razón Social" value={cliente.nombre}/>
                  <FormField label="Período" value={`${MESES[periodo.mes]} ${periodo.anio}`}/>
                </div>
                <Divider label="DÉBITO FISCAL"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <FormField label="Base Ventas Gravadas" value={fmt(totV.base)} highlight={C.accent}/>
                  <FormField label="Débito Fiscal (IVA 12%)" value={fmt(totV.iva)} highlight={C.accent}/>
                </div>
                <Divider label="CRÉDITO FISCAL"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <FormField label="Base Compras Gravadas" value={fmt(totC.base)} highlight={C.blue}/>
                  <FormField label="Crédito Fiscal (IVA 12%)" value={fmt(totC.iva)} highlight={C.blue}/>
                </div>
                <Divider label="DETERMINACIÓN"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  {ivaAPagar>0
                    ?<FormField label="IVA A PAGAR" value={fmt(ivaAPagar)} highlight={C.red} big/>
                    :<FormField label="REMANENTE A FAVOR (CF)" value={fmt(ivaCF)} highlight={C.gold} big/>}
                  <FormField label="Período de Pago" value={`Hasta el 30 de ${MESES[periodo.mes===11?0:periodo.mes+1]}`}/>
                </div>
                <CertSection certified={certified} certDate={certDate} onCertify={certificar} onDescargar={()=>descargarFlat("IVA")}/>
              </Card>
            </div>
          )}

          {/* ISR */}
          {tab==="isr"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Formulario ISR — SAT-1361</h2>
              <p style={{color:C.textMid,marginBottom:20,fontSize:13}}>Impuesto Sobre la Renta — Régimen Sobre Utilidades 25%</p>
              <Card>
                <SatHeader titulo="IMPUESTO SOBRE LA RENTA — RÉGIMEN SOBRE UTILIDADES" form="SAT-1361"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                  <FormField label="NIT" value={cliente.nit}/>
                  <FormField label="Razón Social" value={cliente.nombre}/>
                  <FormField label="Año" value={periodo.anio}/>
                </div>
                <Divider label="INGRESOS Y DEDUCCIONES"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <FormField label="Total Ingresos Gravados" value={fmt(totV.base)} highlight={C.accent}/>
                  <FormField label="Total Costos Deducibles" value={fmt(totC.base)} highlight={C.blue}/>
                  <FormField label="Renta Imponible" value={fmt(Math.max(0,utilidad))} highlight={utilidad>=0?C.accent:C.red}/>
                  <FormField label="Tasa ISR" value="25%"/>
                  <FormField label="ISR DETERMINADO" value={fmt(isr)} highlight={C.gold} big/>
                  <FormField label="ISR a Pagar" value={fmt(isr)} highlight={C.red} big/>
                </div>
                <CertSection certified={certified} certDate={certDate} onCertify={certificar} onDescargar={()=>descargarFlat("ISR")}/>
              </Card>
            </div>
          )}

          {/* ISO */}
          {tab==="iso"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Formulario ISO — SAT-2800</h2>
              <p style={{color:C.textMid,marginBottom:20,fontSize:13}}>Impuesto de Solidaridad — 1% sobre ingresos brutos</p>
              <Card>
                <SatHeader titulo="DECLARACIÓN JURADA DEL IMPUESTO DE SOLIDARIDAD" form="SAT-2800"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:16}}>
                  <FormField label="NIT" value={cliente.nit}/>
                  <FormField label="Razón Social" value={cliente.nombre}/>
                  <FormField label="Trimestre" value={`T${Math.ceil((periodo.mes+1)/3)} ${periodo.anio}`}/>
                </div>
                <Divider label="CÁLCULO"/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                  <FormField label="Ingresos Brutos" value={fmt(totV.total)} highlight={C.accent}/>
                  <FormField label="Tasa ISO" value="1%"/>
                  <FormField label="ISO DETERMINADO" value={fmt(iso)} highlight={C.gold} big/>
                  <FormField label="ISO a Pagar" value={fmt(iso)} highlight={C.red} big/>
                </div>
                <div style={{marginTop:14,padding:12,background:C.goldDim,border:`1px solid ${C.gold}40`,borderRadius:8,fontSize:12,color:C.textMid}}>
                  ℹ️ El ISO pagado puede acreditarse contra el ISR anual (Art. 10 Decreto 73-2008).
                </div>
                <CertSection certified={certified} certDate={certDate} onCertify={certificar} onDescargar={()=>descargarFlat("ISO")}/>
              </Card>
            </div>
          )}

          {/* SAT */}
          {tab==="sat"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:20}}>Consultas SAT en Tiempo Real</h2>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                <Card color={C.blue}>
                  <div style={{fontWeight:700,fontSize:14,color:C.blue,marginBottom:16}}>🔍 Consulta NIT / RTU</div>
                  <Input label="NIT del Contribuyente" value={nitConsulta} onChange={setNitConsulta} placeholder="Ej: 1234567-8" mono/>
                  <Btn onClick={consultarNIT} disabled={nitLoading||!nitConsulta.trim()} color={C.blue} full icon={nitLoading?"⏳":"🔍"}>
                    {nitLoading?"Consultando SAT...":"Verificar NIT"}
                  </Btn>
                  {nitResult&&(
                    <div style={{marginTop:16}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                        <span style={{fontWeight:700,fontSize:13}}>Resultado RTU</span>
                        <Pill color={nitResult.estado==="ACTIVO"?C.accent:C.red}>{nitResult.estado}</Pill>
                      </div>
                      {[["NIT",nitResult.nit],["Nombre",nitResult.nombre],["Tipo",nitResult.tipo],["Régimen",nitResult.regimen],["Actividad",nitResult.actividad],["Dirección",nitResult.direccion]].map(([l,v])=>(
                        <div key={l} style={{marginBottom:8}}>
                          <div style={{fontSize:9,color:C.textDim,letterSpacing:0.6,textTransform:"uppercase"}}>{l}</div>
                          <div style={{fontSize:12,color:C.text,padding:"6px 10px",background:C.surface,borderRadius:6,border:`1px solid ${C.border}`,marginTop:2}}>{v}</div>
                        </div>
                      ))}
                      {nitResult.estado!=="ACTIVO"&&<div style={{padding:"10px 14px",background:C.redDim,border:`1px solid ${C.red}30`,borderRadius:8,color:C.red,fontSize:12,marginTop:8}}>⚠️ Contribuyente SUSPENDIDO — verifique antes de aceptar facturas.</div>}
                    </div>
                  )}
                </Card>
                <Card color={C.accent}>
                  <div style={{fontWeight:700,fontSize:14,color:C.accent,marginBottom:16}}>🧾 Validar Factura FEL / UUID</div>
                  <Input label="UUID de la Factura Electrónica" value={uuidConsulta} onChange={setUuidConsulta} placeholder="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX" mono/>
                  <Btn onClick={validarFEL} disabled={felLoading||!uuidConsulta.trim()} color={C.accent} full icon={felLoading?"⏳":"✓"}>
                    {felLoading?"Verificando en SAT...":"Validar Factura"}
                  </Btn>
                  {felResult&&(
                    <div style={{marginTop:16}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:felResult.color+"12",border:`2px solid ${felResult.color}40`,borderRadius:10,marginBottom:14}}>
                        <span style={{fontSize:22,color:felResult.color}}>{felResult.icon}</span>
                        <div>
                          <div style={{fontWeight:800,color:felResult.color,fontSize:14}}>{felResult.estado}</div>
                          <div style={{fontSize:11,color:C.textMid}}>{felResult.tipo} · {felResult.certificador}</div>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {[["Emisor",felResult.emisor],["NIT Emisor",felResult.nitEmisor],["Fecha",felResult.fechaEmision],["Base",`Q ${fmt(felResult.base)}`],["IVA",`Q ${fmt(felResult.iva)}`],["Total",`Q ${fmt(felResult.total)}`]].map(([l,v])=>(
                          <div key={l} style={{padding:"8px 10px",background:C.surface,borderRadius:7,border:`1px solid ${C.border}`}}>
                            <div style={{fontSize:9,color:C.textDim,textTransform:"uppercase"}}>{l}</div>
                            <div style={{fontSize:12,color:C.text,fontWeight:600,marginTop:2}}>{v}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            </div>
          )}

          {/* ASISTENTE */}
          {tab==="asistente"&&(
            <div>
              <h2 style={{fontWeight:800,fontSize:20,marginBottom:4}}>Asistente Tributario IA</h2>
              <p style={{color:C.textMid,marginBottom:16,fontSize:13}}>Conoce los datos de {cliente.nombre} para este período.</p>
              <Card style={{display:"flex",flexDirection:"column",height:500}}>
                <div ref={chatRef} style={{flex:1,overflowY:"auto",paddingRight:4,marginBottom:14}}>
                  {aiChat.length===0&&(
                    <div style={{textAlign:"center",padding:32,color:C.textDim}}>
                      <div style={{fontSize:32,marginBottom:8}}>🤖</div>
                      <div style={{marginBottom:16}}>Pregunta sobre este cliente o sobre tributación guatemalteca</div>
                      <div style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center"}}>
                        {["¿Cuándo vence el IVA?","¿Qué es el crédito fiscal?","¿Cómo calcular el ISO?","¿Conviene cambiar de régimen?"].map(s=>(
                          <button key={s} onClick={()=>setAiInput(s)} style={{background:C.accentDim,border:`1px solid ${C.accentSoft}`,color:C.accent,borderRadius:20,padding:"6px 14px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{s}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  {aiChat.map((m,i)=>(
                    <div key={i} style={{marginBottom:14,display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                      <div style={{maxWidth:"80%",padding:"11px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?C.accent+"20":C.card,border:`1px solid ${m.role==="user"?C.accentSoft:C.border}`,fontSize:13,lineHeight:1.6,color:C.text,whiteSpace:"pre-wrap"}}>
                        {m.role==="ai"&&<div style={{fontSize:9,color:C.accent,fontWeight:700,marginBottom:5,letterSpacing:0.5}}>🤖 ASISTENTE SAT</div>}
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading&&<div style={{display:"flex",gap:6,padding:10}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.accent,animation:`pulse 1s ${i*0.2}s infinite`}}/>)}</div>}
                </div>
                <div style={{display:"flex",gap:10}}>
                  <input value={aiInput} onChange={e=>setAiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendAI()} placeholder="Pregunta sobre tributación guatemalteca..." disabled={aiLoading}
                    style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:8,padding:"11px 14px",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                  <Btn onClick={sendAI} disabled={aiLoading||!aiInput.trim()} icon="↑">Enviar</Btn>
                </div>
              </Card>
            </div>
          )}

        </main>
      </div>
      <style>{`*{box-sizing:border-box;}input:focus,select:focus{outline:1px solid ${C.accent}!important;}::-webkit-scrollbar{width:5px;}::-webkit-scrollbar-track{background:${C.surface};}::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}@keyframes pulse{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ── Sub-componentes contables ──
function MiniTable({rows,color}){
  if(!rows.length)return null;
  const tdS={padding:"6px 10px",borderBottom:`1px solid #1E2D4533`,color:C.text};
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>{["Fecha","Doc","Nombre","Base","IVA","Total"].map(h=><th key={h} style={{textAlign:"left",padding:"6px 10px",background:color+"20",color,fontSize:10,letterSpacing:0.4}}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((r,i)=><tr key={i}><td style={tdS}>{r.fecha}</td><td style={tdS}>{r.documento}</td><td style={tdS}>{r.nombre}</td><td style={{...tdS,color,fontFamily:"monospace"}}>{fmt(r.base)}</td><td style={{...tdS,fontFamily:"monospace"}}>{fmt(r.iva)}</td><td style={{...tdS,fontFamily:"monospace",fontWeight:700}}>{fmt(r.total)}</td></tr>)}</tbody>
      </table>
    </div>
  );
}
function LibroContable({tipo,rows,totales,periodo,cliente}){
  const color=tipo==="compras"?C.blue:C.accent;
  const label=tipo==="compras"?"LIBRO DE COMPRAS":"LIBRO DE VENTAS";
  const tdS={padding:"8px 10px",borderBottom:`1px solid ${C.border}20`,color:C.text,fontSize:12};
  return(
    <Card>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div><div style={{fontWeight:800,color,fontSize:14}}>{label}</div><div style={{fontSize:11,color:C.textDim}}>{cliente.nombre} — {MESES[periodo.mes]} {periodo.anio} — NIT: {cliente.nit}</div></div>
        <Pill color={color}>{rows.length} registros</Pill>
      </div>
      {rows.length===0?<div style={{textAlign:"center",padding:24,color:C.textDim,fontSize:13}}>Sin registros. Carga el archivo correspondiente.</div>:(
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["#","Fecha","No. Factura","Nombre / Razón Social","NIT","Descripción","Base","IVA","Total"].map(h=><th key={h} style={{textAlign:["Base","IVA","Total"].includes(h)?"right":"left",padding:"8px 10px",background:color+"18",color,fontSize:10,letterSpacing:0.3,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
            <tbody>{rows.map((r,i)=><tr key={i} style={{background:i%2===0?"transparent":C.surface+"44"}}><td style={{...tdS,color:C.textDim}}>{r.id}</td><td style={tdS}>{r.fecha}</td><td style={tdS}>{r.documento}</td><td style={tdS}>{r.nombre}</td><td style={tdS}>{r.nit}</td><td style={{...tdS,color:C.textMid}}>{r.descripcion}</td><td style={{...tdS,textAlign:"right",fontFamily:"monospace"}}>{fmt(r.base)}</td><td style={{...tdS,textAlign:"right",fontFamily:"monospace"}}>{fmt(r.iva)}</td><td style={{...tdS,textAlign:"right",fontFamily:"monospace",fontWeight:700,color}}>{fmt(r.total)}</td></tr>)}</tbody>
            <tfoot><tr style={{background:color+"18"}}><td colSpan={6} style={{padding:"10px",fontWeight:800,color,fontSize:12}}>TOTAL</td><td style={{padding:"10px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color}}>{fmt(totales.base)}</td><td style={{padding:"10px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color}}>{fmt(totales.iva)}</td><td style={{padding:"10px",textAlign:"right",fontFamily:"monospace",fontWeight:800,color}}>{fmt(totales.total)}</td></tr></tfoot>
          </table>
        </div>
      )}
    </Card>
  );
}
function SatHeader({titulo,form}){
  return(
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,padding:"14px 18px",background:C.surface,borderRadius:8,border:`1px solid ${C.border}`}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:38,height:38,background:"linear-gradient(135deg,#003F8A,#0066CC)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>🏛️</div>
        <div><div style={{fontWeight:800,fontSize:11,color:"#4A9FFF",letterSpacing:0.3}}>SUPERINTENDENCIA DE ADMINISTRACIÓN TRIBUTARIA — SAT</div><div style={{fontWeight:700,fontSize:11,color:C.text,marginTop:2}}>{titulo}</div></div>
      </div>
      <Pill color={C.blue}>{form}</Pill>
    </div>
  );
}
function FormField({label,value,highlight,big}){
  return(
    <div style={{marginBottom:4}}>
      <div style={{fontSize:9,color:C.textDim,marginBottom:3,letterSpacing:0.4,textTransform:"uppercase"}}>{label}</div>
      <div style={{background:C.surface,border:`1px solid ${highlight?highlight+"55":C.border}`,borderRadius:6,padding:big?"12px 14px":"8px 12px",fontFamily:"monospace",color:highlight||C.text,fontWeight:big?800:600,fontSize:big?18:13}}>{value}</div>
    </div>
  );
}
function CertSection({certified,certDate,onCertify,onDescargar}){
  return(
    <div style={{marginTop:24,padding:18,background:certified?C.accentDim:C.surface,border:`1px solid ${certified?C.accentSoft:C.border}`,borderRadius:10}}>
      {certified?(
        <div style={{textAlign:"center"}}>
          <div style={{color:C.accent,fontWeight:800,fontSize:14,marginBottom:12}}>✓ DECLARACIÓN CERTIFICADA — Lista para presentar a la SAT</div>
          <div style={{color:C.textMid,fontSize:12,marginBottom:14}}>Certificada el {certDate}</div>
          <Btn onClick={onDescargar} color={C.accent} icon="⬇">Descargar archivo .TXT para Declaraguate</Btn>
        </div>
      ):(
        <div style={{textAlign:"center"}}>
          <div style={{color:C.textMid,fontSize:13,marginBottom:12}}>Revisa los datos antes de certificar</div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <Btn onClick={onCertify} color={C.accent} icon="✓">Certificar y Aprobar</Btn>
            <Btn onClick={onDescargar} color={C.blue} icon="⬇">Descargar borrador</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL CONTADOR
// ══════════════════════════════════════════════════════════════════════════════
function PanelContador({usuario,onLogout}){
  const [clientes,setClientes]=useState(CLIENTES_INICIALES);
  const [clienteActivo,setClienteActivo]=useState(null);
  const [mostrarModal,setMostrarModal]=useState(false);
  const [nuevoCliente,setNuevoCliente]=useState({nombre:"",nit:"",regimen:"general",sector:""});
  const plan=PLANES[usuario.plan]||PLANES.basico;

  const agregarCliente=()=>{
    if(!nuevoCliente.nombre||!nuevoCliente.nit){alert("Nombre y NIT son requeridos");return;}
    setClientes(cs=>[...cs,{id:`c${Date.now()}`,declaracionesPendientes:0,ultimaDeclaracion:"—",...nuevoCliente}]);
    setNuevoCliente({nombre:"",nit:"",regimen:"general",sector:""});
    setMostrarModal(false);
  };

  if(clienteActivo) return <SistemaContable cliente={clienteActivo} onVolver={()=>setClienteActivo(null)}/>;

  const usoPct=Math.round(clientes.length/plan.limiteClientes*100);

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      {/* Header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 28px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,background:`linear-gradient(135deg,${C.accent},${C.blue})`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>⬡</div>
          <div><div style={{fontWeight:800,fontSize:15}}>ContaGT <span style={{color:C.accent}}>Pro</span></div><div style={{fontSize:10,color:C.textDim}}>SISTEMA TRIBUTARIO GUATEMALTECO</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{padding:"6px 14px",background:plan.color+"12",border:`1px solid ${plan.color}30`,borderRadius:8,fontSize:12,color:plan.color,fontWeight:700}}>{plan.icon} Plan {plan.nombre}</div>
          <Avatar nombre={usuario.nombre} size={32} color={plan.color}/>
          <div style={{fontSize:12,color:C.text,fontWeight:600}}>{usuario.nombre}</div>
          <Btn onClick={onLogout} color={C.red} size="sm" icon="↩">Salir</Btn>
        </div>
      </div>

      <div style={{padding:28,maxWidth:1100}}>
        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <Stat label="Total Clientes" value={clientes.length} icon="🏢" color={C.blue} sub={`Límite: ${plan.limiteClientes}`}/>
          <Stat label="Declaraciones Pendientes" value={clientes.reduce((s,c)=>s+c.declaracionesPendientes,0)} icon="⏰" color={C.red}/>
          <Stat label="Clientes al Día" value={clientes.filter(c=>c.declaracionesPendientes===0).length} icon="✓" color={C.accent}/>
          <div style={{background:plan.color+"0A",border:`1px solid ${plan.color}25`,borderRadius:12,padding:"16px 18px"}}>
            <div style={{fontSize:10,color:C.textMid,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>USO DEL PLAN</div>
            <div style={{fontSize:24,fontWeight:800,color:plan.color,fontFamily:"monospace"}}>{clientes.length}/{plan.limiteClientes}</div>
            <div style={{height:6,background:C.surface,borderRadius:3,marginTop:8}}>
              <div style={{width:`${usoPct}%`,height:"100%",background:usoPct>80?C.red:plan.color,borderRadius:3}}/>
            </div>
          </div>
        </div>

        {/* Header clientes */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <div>
            <h2 style={{fontWeight:800,fontSize:20,margin:0}}>Mis Empresas Cliente</h2>
            <p style={{color:C.textMid,margin:"4px 0 0",fontSize:13}}>Haz clic en una empresa para gestionar sus declaraciones</p>
          </div>
          <Btn onClick={()=>setMostrarModal(true)} icon="+" color={C.accent} disabled={clientes.length>=plan.limiteClientes}>
            {clientes.length>=plan.limiteClientes?"Límite alcanzado":"Agregar Empresa"}
          </Btn>
        </div>

        {/* Grid clientes */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
          {clientes.map(c=>(
            <div key={c.id} onClick={()=>setClienteActivo(c)}
              style={{background:C.card,border:`1px solid ${c.declaracionesPendientes>0?C.gold+"50":C.border}`,borderRadius:14,padding:22,cursor:"pointer",transition:"all 0.2s",boxShadow:c.declaracionesPendientes>0?`0 0 20px ${C.gold}08`:"none"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14,color:C.text,marginBottom:4}}>{c.nombre}</div>
                  <div style={{fontSize:11,color:C.textDim,fontFamily:"monospace"}}>NIT: {c.nit}</div>
                </div>
                {c.declaracionesPendientes>0&&<div style={{background:C.red,color:"#fff",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,flexShrink:0}}>{c.declaracionesPendientes}</div>}
              </div>
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                {c.sector&&<Pill color={C.blue} size="sm">{c.sector}</Pill>}
                <Pill color={C.purple} size="sm">{c.regimen==="general"?"Reg. General":c.regimen==="pequenio"?"Pequeño Contrib.":"Opcional"}</Pill>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11,color:C.textDim}}>Última declaración: {c.ultimaDeclaracion}</span>
                <div style={{background:C.accent+"18",border:`1px solid ${C.accent}40`,color:C.accent,borderRadius:7,padding:"5px 12px",fontSize:11,fontWeight:700}}>Gestionar →</div>
              </div>
            </div>
          ))}
          {clientes.length<plan.limiteClientes&&(
            <div onClick={()=>setMostrarModal(true)} style={{border:`2px dashed ${C.border}`,borderRadius:14,padding:24,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,cursor:"pointer",minHeight:160,color:C.textDim,transition:"all 0.2s"}}>
              <div style={{fontSize:32}}>+</div>
              <div style={{fontSize:13}}>Agregar empresa cliente</div>
            </div>
          )}
        </div>
      </div>

      {/* Modal nuevo cliente */}
      {mostrarModal&&(
        <div style={{position:"fixed",inset:0,background:"#00000088",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:32,width:460}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{margin:0,fontSize:18,fontWeight:800}}>Agregar Empresa Cliente</h3>
              <button onClick={()=>setMostrarModal(false)} style={{background:"none",border:"none",color:C.textMid,fontSize:20,cursor:"pointer"}}>✕</button>
            </div>
            <Input label="Nombre o Razón Social" value={nuevoCliente.nombre} onChange={v=>setNuevoCliente(n=>({...n,nombre:v}))} placeholder="Ej: Distribuciones XYZ S.A." icon="🏢"/>
            <Input label="NIT" value={nuevoCliente.nit} onChange={v=>setNuevoCliente(n=>({...n,nit:v}))} placeholder="Ej: 1234567-8" icon="🔢" mono/>
            <Input label="Sector / Industria" value={nuevoCliente.sector} onChange={v=>setNuevoCliente(n=>({...n,sector:v}))} placeholder="Ej: Comercio, Farmacéutico, Construcción" icon="🏭"/>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:10,color:C.textMid,letterSpacing:0.8,textTransform:"uppercase",marginBottom:6}}>Régimen Tributario</label>
              <select value={nuevoCliente.regimen} onChange={e=>setNuevoCliente(n=>({...n,regimen:e.target.value}))}
                style={{width:"100%",background:C.surface,border:`1px solid ${C.border}`,color:C.text,borderRadius:9,padding:"11px 14px",fontSize:13,fontFamily:"inherit"}}>
                <option value="general">Régimen General (ISR 25%)</option>
                <option value="pequenio">Pequeño Contribuyente (IVA 5%)</option>
                <option value="opcional">Régimen Opcional Simplificado (7%)</option>
              </select>
            </div>
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <Btn onClick={()=>setMostrarModal(false)} color={C.textMid} full>Cancelar</Btn>
              <Btn onClick={agregarCliente} color={C.accent} full icon="✓">Agregar Cliente</Btn>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PANEL ADMIN
// ══════════════════════════════════════════════════════════════════════════════
function PanelAdmin({usuario,onLogout}){
  const [usuarios]=useState([
    {id:"1",nombre:"María Salazar",email:"maria@despachosal.gt",plan:"pro",estado:"activo",clientes:12,declaracionesMes:28,fechaRegistro:"2024-10-02",colegiado:"4432"},
    {id:"2",nombre:"Roberto Fuentes",email:"rfuentes@gmail.com",plan:"basico",estado:"activo",clientes:4,declaracionesMes:9,fechaRegistro:"2025-01-20",colegiado:"9901"},
    {id:"3",nombre:"Ana Castillo",email:"ana@auditgt.com",plan:"pro",estado:"suspendido",clientes:8,declaracionesMes:0,fechaRegistro:"2024-12-05",colegiado:"6617"},
    {id:"4",nombre:"Luis Pérez",email:"lperez@fiscalgt.com",plan:"basico",estado:"trial",clientes:2,declaracionesMes:4,fechaRegistro:"2025-06-01",colegiado:"1145"},
  ]);
  const mrr=usuarios.filter(u=>u.estado==="activo").reduce((s,u)=>s+(PLANES[u.plan]?.precio||0),0);

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 28px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:34,height:34,background:`linear-gradient(135deg,${C.accent},${C.blue})`,borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17}}>⬡</div>
          <div><div style={{fontWeight:800,fontSize:15}}>ContaGT <span style={{color:C.accent}}>Pro</span></div><div style={{fontSize:10,color:C.textDim}}>PANEL ADMINISTRADOR</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <Pill color={C.gold}>👑 ADMIN</Pill>
          <span style={{fontSize:13,color:C.text,fontWeight:600}}>{usuario.nombre}</span>
          <Btn onClick={onLogout} color={C.red} size="sm" icon="↩">Salir</Btn>
        </div>
      </div>
      <div style={{padding:28}}>
        <h2 style={{fontWeight:800,fontSize:20,marginBottom:20}}>Panel de Administración</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:24}}>
          <Stat label="Contadores" value={usuarios.length} icon="👥" color={C.blue}/>
          <Stat label="Activos" value={usuarios.filter(u=>u.estado==="activo").length} icon="✓" color={C.accent}/>
          <Stat label="MRR" value={`Q${mrr.toLocaleString()}`} icon="💰" color={C.gold} sub="Ingresos mensuales"/>
          <Stat label="En Trial" value={usuarios.filter(u=>u.estado==="trial").length} icon="⏳" color={C.purple}/>
        </div>
        <Card>
          <div style={{fontWeight:700,fontSize:14,color:C.accent,marginBottom:16}}>👥 Contadores Registrados</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr style={{background:C.surface}}>{["Contador","Email","Plan","Estado","Clientes","Registrado"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:10,color:C.textDim,letterSpacing:0.6,borderBottom:`1px solid ${C.border}`}}>{h.toUpperCase()}</th>)}</tr></thead>
            <tbody>{usuarios.map((u,i)=>(
              <tr key={u.id} style={{borderBottom:`1px solid ${C.border}20`,background:i%2===0?"transparent":C.surface+"40"}}>
                <td style={{padding:"11px 14px"}}><div style={{display:"flex",alignItems:"center",gap:10}}><Avatar nombre={u.nombre} size={28} color={planColor(u.plan)}/><div><div style={{fontWeight:600,fontSize:13}}>{u.nombre}</div><div style={{fontSize:10,color:C.textDim}}>#{u.colegiado}</div></div></div></td>
                <td style={{padding:"11px 14px",color:C.textMid,fontSize:12}}>{u.email}</td>
                <td style={{padding:"11px 14px"}}><Pill color={planColor(u.plan)}>{PLANES[u.plan]?.nombre}</Pill></td>
                <td style={{padding:"11px 14px"}}><Pill color={estadoColor(u.estado)}>{u.estado.toUpperCase()}</Pill></td>
                <td style={{padding:"11px 14px",fontFamily:"monospace",fontWeight:600}}>{u.clientes}/{PLANES[u.plan]?.limiteClientes}</td>
                <td style={{padding:"11px 14px",color:C.textMid,fontSize:11}}>{u.fechaRegistro}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function PantallaLogin({onLogin}){
  const [modo,setModo]=useState("login");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [nombre,setNombre]=useState("");
  const [colegiado,setColegiado]=useState("");
  const [plan,setPlan]=useState("pro");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handleLogin=async()=>{
    setError("");setLoading(true);
    await new Promise(r=>setTimeout(r,800));
    if(email==="admin@contagtpro.gt"&&password==="admin123"){onLogin({id:"0",nombre:"Carlos Méndez",email,plan:"ilimitado",rol:"admin",colegiado:"7821"});}
    else if(email&&password.length>=4){onLogin({id:Date.now().toString(),nombre:nombre||email.split("@")[0],email,plan,rol:"contador",colegiado:colegiado||"0000"});}
    else{setError("Credenciales incorrectas.");}
    setLoading(false);
  };

  const handleRegistro=async()=>{
    if(!nombre||!email||!password){setError("Completa todos los campos");return;}
    setLoading(true);await new Promise(r=>setTimeout(r,1000));
    onLogin({id:Date.now().toString(),nombre,email,plan,rol:"contador",colegiado:colegiado||"0000"});
    setLoading(false);
  };

  return(
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{flex:1,background:"linear-gradient(160deg,#0A1825 0%,#051018 60%,#0A1A10 100%)",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px 56px",position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-80,right:-80,width:300,height:300,borderRadius:"50%",background:C.accent+"06",border:`1px solid ${C.accent}12`}}/>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:48}}>
          <div style={{width:44,height:44,background:`linear-gradient(135deg,${C.accent},${C.blue})`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>⬡</div>
          <div><div style={{fontWeight:900,fontSize:22,color:C.text}}>ContaGT <span style={{color:C.accent}}>Pro</span></div><div style={{fontSize:10,color:C.textDim,letterSpacing:1}}>SISTEMA TRIBUTARIO GUATEMALTECO</div></div>
        </div>
        <h1 style={{fontSize:40,fontWeight:900,color:C.text,lineHeight:1.15,marginBottom:20,letterSpacing:-1}}>La plataforma de<br/><span style={{color:C.accent}}>contadores CPA</span><br/>de Guatemala</h1>
        <p style={{color:C.textMid,fontSize:15,lineHeight:1.7,marginBottom:40,maxWidth:380}}>IVA, ISR e ISO generados automáticamente desde tu Excel. Conectado con SAT, FEL y Declaraguate.</p>
        {[{icon:"⚡",txt:"Declara en minutos, no en horas"},{icon:"🔗",txt:"Conectado en tiempo real con SAT"},{icon:"🛡️",txt:"Certificación digital del contador"},{icon:"📊",txt:"Todos tus clientes en un solo panel"}].map(({icon,txt})=>(
          <div key={txt} style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
            <div style={{width:30,height:30,background:C.accentSoft,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>{icon}</div>
            <span style={{color:C.textMid,fontSize:13}}>{txt}</span>
          </div>
        ))}
      </div>
      <div style={{width:460,background:C.surface,display:"flex",flexDirection:"column",justifyContent:"center",padding:"48px 40px",borderLeft:`1px solid ${C.border}`}}>
        {modo==="login"&&(
          <>
            <h2 style={{fontSize:24,fontWeight:800,color:C.text,marginBottom:6}}>Iniciar sesión</h2>
            <p style={{color:C.textMid,fontSize:13,marginBottom:28}}>Bienvenido de vuelta</p>
            <Input label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" icon="📧"/>
            <Input label="Contraseña" value={password} onChange={setPassword} placeholder="••••••••" type="password" icon="🔒"/>
            {error&&<div style={{background:C.redDim,border:`1px solid ${C.red}30`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:12,marginBottom:14}}>{error}</div>}
            <Btn onClick={handleLogin} disabled={loading} color={C.accent} full size="lg" icon={loading?"⏳":"→"}>{loading?"Verificando...":"Ingresar al sistema"}</Btn>
            <div style={{textAlign:"center",marginTop:20,paddingTop:16,borderTop:`1px solid ${C.border}`}}>
              <span style={{color:C.textMid,fontSize:13}}>¿No tienes cuenta? </span>
              <button onClick={()=>setModo("registro")} style={{background:"none",border:"none",color:C.accent,fontSize:13,fontWeight:700,cursor:"pointer"}}>Crear cuenta gratis →</button>
            </div>
            <div style={{marginTop:20,padding:12,background:C.accentDim,border:`1px solid ${C.accentSoft}`,borderRadius:9}}>
              <div style={{fontSize:10,color:C.accent,fontWeight:700,marginBottom:4}}>ACCESO DEMO ADMINISTRADOR</div>
              <div style={{fontSize:12,color:C.textMid}}>Email: <b style={{color:C.text}}>admin@contagtpro.gt</b></div>
              <div style={{fontSize:12,color:C.textMid}}>Password: <b style={{color:C.text}}>admin123</b></div>
            </div>
          </>
        )}
        {modo==="registro"&&(
          <>
            <h2 style={{fontSize:22,fontWeight:800,color:C.text,marginBottom:6}}>Crear cuenta</h2>
            <p style={{color:C.textMid,fontSize:13,marginBottom:22}}>14 días de prueba gratis</p>
            <Input label="Nombre completo" value={nombre} onChange={setNombre} placeholder="Lic. Juan Pérez" icon="👤"/>
            <Input label="Correo electrónico" value={email} onChange={setEmail} placeholder="tu@correo.com" type="email" icon="📧"/>
            <Input label="Contraseña" value={password} onChange={setPassword} placeholder="Mínimo 8 caracteres" type="password" icon="🔒"/>
            <Input label="Número de Colegiado CPA" value={colegiado} onChange={setColegiado} placeholder="Ej: 12345" icon="🏛️"/>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,color:C.textMid,letterSpacing:0.8,textTransform:"uppercase",marginBottom:8}}>Selecciona tu plan</div>
              <div style={{display:"flex",gap:8}}>
                {Object.values(PLANES).map(p=>(
                  <button key={p.id} onClick={()=>setPlan(p.id)} style={{flex:1,padding:"10px 6px",background:plan===p.id?p.color+"20":C.surface,border:`1.5px solid ${plan===p.id?p.color:C.border}`,borderRadius:9,cursor:"pointer",textAlign:"center",fontFamily:"inherit"}}>
                    <div style={{fontSize:16,marginBottom:2}}>{p.icon}</div>
                    <div style={{fontSize:11,fontWeight:700,color:plan===p.id?p.color:C.textMid}}>{p.nombre}</div>
                    <div style={{fontSize:10,color:C.textDim}}>Q{p.precio}/mes</div>
                  </button>
                ))}
              </div>
            </div>
            {error&&<div style={{background:C.redDim,border:`1px solid ${C.red}30`,borderRadius:8,padding:"10px 14px",color:C.red,fontSize:12,marginBottom:12}}>{error}</div>}
            <Btn onClick={handleRegistro} disabled={loading} color={C.accent} full size="lg" icon="✓">{loading?"Creando cuenta...":"Comenzar 14 días gratis"}</Btn>
            <div style={{textAlign:"center",marginTop:14}}><button onClick={()=>setModo("login")} style={{background:"none",border:"none",color:C.textMid,fontSize:13,cursor:"pointer"}}>← Volver al login</button></div>
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// APP PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export default function ContaGTPro(){
  const [usuario,setUsuario]=useState(null);
  if(!usuario) return <PantallaLogin onLogin={setUsuario}/>;
  if(usuario.rol==="admin") return <PanelAdmin usuario={usuario} onLogout={()=>setUsuario(null)}/>;
  return <PanelContador usuario={usuario} onLogout={()=>setUsuario(null)}/>;
}
