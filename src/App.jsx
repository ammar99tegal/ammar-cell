// Ammar Cell App -- build 20260602-1043
import { useState, useEffect, useCallback, useRef } from "react";
import { db, dbSaldo, dbSaldoBank, dbShift, dbBank, dbProductOrder, dbStokOrder, dbCashflow, dbAktifProduk, supabase } from "./supabase.js";

// ==============================================================================
// CONSTANTS
// ==============================================================================
const DEFAULT_SALDO_APPS = ["Digipos","Sidiva","Rita","OK","Dana","OVO","GoPay","ShopeePay","LinkAja","M-Kios"];

// -- Responsive helpers --------------------------------------------------------
const useDevice = () => {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  // breakpoints
  const isMobile  = w < 768;
  const isTablet  = w >= 768 && w < 1200;
  const isDesktop = w >= 1200;
  const fs = isMobile ? 0.85 : isTablet ? 0.95 : 1; // font scale
  return { w, isMobile, isTablet, isDesktop, fs };
};

const fmt   = n => new Intl.NumberFormat("id-ID").format(n??0);
const fmtRp = n => `Rp ${fmt(n)}`;
const pctGrowth = (a,b) => b>0?((a-b)/b*100).toFixed(1):"N/A";
const growthColor = g => isNaN(+g)?"#94a3b8":+g>0?"#10b981":+g<0?"#f43f5e":"#94a3b8";
const growthBg    = g => isNaN(+g)?"#f8fafc":+g>0?"#ecfdf5":+g<0?"#fff1f2":"#f8fafc";
const growthIcon  = g => isNaN(+g)?"--":+g>0?"▲":+g<0?"▼":"--";
const fmtS  = n => n>=1000000?`${(n/1000000).toFixed(1)}jt`:n>=1000?`${(n/1000).toFixed(0)}rb`:String(Math.round(n));
const safeDt = v => {
  if(!v) return null;
  const d = new Date(v);
  if(!isNaN(d)) return d;
  const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(m){ const d2=new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`); if(!isNaN(d2)) return d2; }
  return null;
};
const fmtDT = v => { const d=safeDt(v); if(!d) return '--'; return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); };
const fmtT  = v => { const d=safeDt(v); if(!d) return '--'; return d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); };
const now   = () => new Date().toLocaleString("id-ID");
const uid   = () => Math.random().toString(36).substr(2,8).toUpperCase();
const today = () => new Date().toLocaleDateString("id-ID");

// ── Helper: periode key untuk grouping misi/todo (harian/mingguan/bulanan) ──
const isoDate = (d=new Date()) => d.toISOString().slice(0,10); // "2026-06-12"
const getPeriodeKey = (periode, d=new Date()) => {
  if(periode==="harian") return isoDate(d);
  if(periode==="mingguan") {
    // ISO week number
    const dt = new Date(d); dt.setHours(0,0,0,0);
    dt.setDate(dt.getDate() + 3 - ((dt.getDay()+6)%7)); // ke kamis minggu ini
    const week1 = new Date(dt.getFullYear(),0,4);
    const wk = 1 + Math.round(((dt-week1)/86400000 - 3 + ((week1.getDay()+6)%7))/7);
    return `${dt.getFullYear()}-W${String(wk).padStart(2,"0")}`;
  }
  // bulanan: "2026-06"
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
};
const getPeriodeLabel = (periode, d=new Date()) => {
  if(periode==="bulanan") return d.toLocaleDateString("id-ID",{month:"long",year:"numeric"});
  if(periode==="mingguan") return `Minggu ${getPeriodeKey("mingguan",d)}`;
  return d.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});
};


// ==============================================================================
// ICONS
// ==============================================================================
const Ic = {
  Cart:     (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={s} height={s}><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  Trash:    (s=14)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width={s} height={s}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6M9 6V4h6v2"/></svg>,
  Plus:     (s=14)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width={s} height={s}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Minus:    (s=14)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width={s} height={s}><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search:   (s=14)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Barcode:  (s=14)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/></svg>,
  History:  (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>,
  Stock:    (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
  Cash:     (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  Check:    (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width={s} height={s}><polyline points="20 6 9 17 4 12"/></svg>,
  Export:   (s=14)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Refund:   (s=12)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>,
  Produk:   (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Edit:     (s=13)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  PlusCirc: (s=15)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  Dashboard:(s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  Laporan:  (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  Outlet:   (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  Logout:   (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Lock:     (s=18)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  User:     (s=18)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  Eye:      (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  EyeOff:   (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  StockIn:  (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M12 5v14"/><path d="M5 12l7 7 7-7"/></svg>,
  StockOut: (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>,
  Transfer: (s=16)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3"/><path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"/><path d="M12 8l4 4-4 4"/><path d="M12 16V8"/></svg>,
  Chart: (s=22)=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width={s} height={s}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>,
};

// ==============================================================================
// HELPERS
// ==============================================================================
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  *{box-sizing:border-box;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#a7e5d8;border-radius:10px;}
  @keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
  @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
  button,input,textarea,select{font-family:'Nunito',sans-serif;}

  /* -- Responsive base -- */
  html { font-size: 16px; }

  /* Desktop besar */
  @media (min-width: 1400px) {
    html { font-size: 18px; }
  }
  /* Desktop normal */
  @media (min-width: 1200px) and (max-width: 1399px) {
    html { font-size: 16px; }
  }
  /* Tablet */
  @media (min-width: 768px) and (max-width: 1199px) {
    html { font-size: 14px; }
  }
  /* HP landscape */
  @media (max-width: 767px) and (orientation: landscape) {
    html { font-size: 12px; }
  }
  /* HP portrait -- sarankan landscape */
  @media (max-width: 767px) and (orientation: portrait) {
    html { font-size: 13px; }
  }

  /* -- Portal & PilihAkses: full portrait centered -- */
  .portal-root, .pilih-root {
    max-width: 430px;
    margin: 0 auto;
    min-height: 100vh;
    min-height: -webkit-fill-available;
  }
  @media (max-width: 430px) {
    .portal-root, .pilih-root { max-width: 100%; }
  }

  /* -- Cashflow Mobile -- */
  @media (max-width: 767px) {
    .cf-kalkulator-grid { grid-template-columns: 1fr !important; }
    .cf-versus-row      { flex-direction: column !important; gap: 6px !important; }
    .cf-tabs-header     { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .cf-tab-btn         { padding: 8px 10px !important; font-size: 10px !important; }
    .cf-header-kpi      { display: none !important; }
    .cf-mobile-kpi      { display: flex !important; }
    .cf-content         { padding: 10px 12px !important; }
    .cf-irow            { flex-direction: row; }
    .cf-irow input      { font-size: 14px !important; }
    /* Bottom nav for mobile */
    .cf-bottom-nav      { display: flex !important; }
    .cf-main-content    { padding-bottom: 70px !important; }
  }
  @media (min-width: 768px) {
    .cf-mobile-kpi  { display: none !important; }
    .cf-bottom-nav  { display: none !important; }
  }

  /* Kasir layout responsif */
  .kasir-layout {
    display: flex;
    height: calc(100vh - 48px);
  }
  .kasir-produk { flex: 1; overflow: hidden; padding: 10px; }
  .kasir-cart   { width: 280px; }

  @media (min-width: 1400px) {
    .kasir-cart { width: 340px; }
  }
  @media (min-width: 768px) and (max-width: 1199px) {
    .kasir-cart { width: 250px; }
  }
  @media (max-width: 767px) {
    .kasir-layout { flex-direction: column; height: auto; }
    .kasir-cart   { width: 100%; }
  }

  /* Portrait warning overlay — visibility dikontrol via JS (inline style),
     CSS hanya mengatur posisi/tampilan saat ditampilkan */
  .portrait-warn {
    position: fixed; inset: 0; z-index: 9998;
    background: linear-gradient(135deg,#0a7a70,#0d9488);
    flex-direction: column; align-items: center; justify-content: center;
    color: white; text-align: center; padding: 24px;
  }
`;

function Toast({ toast }) {
  if (!toast) return null;
  return <div style={{position:"fixed",top:13,right:13,zIndex:9999,background:toast.type==="err"?"#ff4757":toast.type==="warn"?"#f39c12":"#0d9488",color:"#fff",padding:"8px 16px",borderRadius:11,fontWeight:700,fontSize:12,boxShadow:"0 4px 18px rgba(0,0,0,.22)",animation:"slideIn .25s ease"}}>{toast.msg}</div>;
}

function Modal({ children, onClose, title, width=420 }) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{background:"#fff",borderRadius:18,padding:22,width,boxShadow:"0 20px 55px rgba(0,0,0,.25)",maxHeight:"92vh",overflowY:"auto",animation:"fadeUp .2s ease",fontFamily:"'Nunito',sans-serif"}}>
        {title&&<div style={{fontWeight:900,fontSize:15,color:"#0d9488",marginBottom:16}}>{title}</div>}
        {children}
      </div>
    </div>
  );
}

function SubHeader({ title, onBack, right, badge, connDot }) {
  return (
    <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",alignItems:"center",padding:"0 16px",boxShadow:"0 2px 14px rgba(13,148,136,.3)",position:"sticky",top:0,zIndex:100,fontFamily:"'Nunito',sans-serif"}}>
      {connDot&&connDot!=="online"&&(
        <div style={{width:10,height:10,borderRadius:"50%",flexShrink:0,cursor:"default",
          background:connDot==="offline"?"#ef4444":connDot==="reconnecting"?"#f59e0b":"#f59e0b",
          animation:"pulse-conn 1.2s infinite",
          boxShadow:connDot==="offline"?"0 0 0 3px #ef444444":"0 0 0 3px #f59e0b44"}}
          title={connDot==="offline"?"📵 Tidak ada koneksi":connDot==="reconnecting"?"🔄 Menghubungkan...":"⚠ Sinyal bermasalah"}/>
      )}
      <style>{`@keyframes pulse-conn{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.6)}}`}</style>
      {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"6px 13px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",marginRight:12,fontFamily:"inherit"}}>← Kembali</button>}
      <div style={{fontWeight:900,fontSize:15,color:"#fff",marginRight:"auto",display:"flex",alignItems:"center",gap:8}}>{title}{badge&&<span style={{background:"rgba(255,255,255,.2)",borderRadius:20,padding:"2px 10px",fontSize:11}}>{badge}</span>}</div>
      {right&&<div style={{display:"flex",gap:8,alignItems:"center"}}>{right}</div>}
    </div>
  );
}

function ConfirmModal({ msg, onConfirm, onCancel, danger=true }) {
  return (
    <Modal onClose={onCancel} title="">
      <div style={{textAlign:"center",padding:"8px 0 16px"}}>
        <div style={{fontSize:40,marginBottom:8}}>{danger?"🗑️":"⚠️"}</div>
        <div style={{fontWeight:800,fontSize:14,color:danger?"#ff4757":"#f39c12",marginBottom:10}}>{msg}</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onCancel} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:11,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
          <button onClick={onConfirm} style={{flex:1,background:danger?"linear-gradient(135deg,#ff4757,#ff6b6b)":"linear-gradient(135deg,#f39c12,#e67e22)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Ya, Lanjutkan</button>
        </div>
      </div>
    </Modal>
  );
}

const inp = {width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"};
const lbl = {fontSize:11,fontWeight:700,color:"#444",marginBottom:4,display:"block"};
function Field({label,value,onChange,type="text",placeholder="",note,style:sx={}}) {
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:4}}>
        <span style={{fontSize:11,fontWeight:700,color:"#444"}}>{label}</span>
        {note&&<span style={{fontSize:10,color:"#aaa",fontWeight:600}}>{note}</span>}
      </div>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{...inp,...sx}}/>
    </div>
  );
}

// ==============================================================================
// LOGIN
// ==============================================================================
function LoginPage({ users, onLogin, onChangePass }) {
  const [username,  setUsername] = useState("");
  const [password,  setPassword] = useState("");
  const [showPass,  setShowPass] = useState(false);
  const [error,     setError]    = useState("");
  const [loading,   setLoading]  = useState(false);
  // Ganti password mandiri
  const [showGanti, setShowGanti]= useState(false);
  const [gpUser,    setGpUser]   = useState("");
  const [gpLama,    setGpLama]   = useState("");
  const [gpBaru,    setGpBaru]   = useState("");
  const [gpKonfirm, setGpKonfirm]= useState("");
  const [showGL,    setShowGL]   = useState(false);
  const [showGB,    setShowGB]   = useState(false);
  const [gpErr,     setGpErr]    = useState("");
  const [gpOk,      setGpOk]     = useState(false);

  const onlyAngka = v => v.replace(/[^0-9]/g,"");
  const blockNonAngka = e => { if(!/[0-9]|Backspace|Delete|Tab|Enter|ArrowLeft|ArrowRight/.test(e.key)) e.preventDefault(); };

  const handleLogin = () => {
    if(!username||!password) return setError("Isi username dan password!");
    setLoading(true);
    setTimeout(()=>{
      const user = users[username.toLowerCase()];
      if(!user||user.pass!==password){ setError("Username atau password salah!"); setLoading(false); }
      else { setError(""); onLogin({username:username.toLowerCase(),...user}); }
    },600);
  };

  const handleGanti = async () => {
    setGpErr("");
    if(!gpUser||!gpLama||!gpBaru||!gpKonfirm) return setGpErr("Semua kolom harus diisi!");
    if(!/^\d+$/.test(gpBaru)) return setGpErr("Password baru harus angka saja!");
    if(gpBaru.length<4) return setGpErr("Password baru minimal 4 digit!");
    if(gpBaru!==gpKonfirm) return setGpErr("Konfirmasi tidak cocok!");
    const u = users[gpUser.toLowerCase()];
    if(!u) return setGpErr("Username tidak ditemukan!");
    if(u.pass!==gpLama) return setGpErr("Password lama salah!");
    setLoading(true);
    try {
      if(onChangePass) await onChangePass(gpUser.toLowerCase(), gpBaru);
      setGpOk(true);
      setTimeout(()=>{ setGpOk(false); setShowGanti(false); setGpUser(""); setGpLama(""); setGpBaru(""); setGpKonfirm(""); }, 2200);
    } catch(e){ setGpErr("Gagal: "+e.message); }
    setLoading(false);
  };

  const PwInput = ({val,set,show,tog,ph})=>(
    <div style={{position:"relative"}}>
      <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Lock(16)}</span>
      <input type={show?"text":"password"} inputMode="numeric" pattern="[0-9]*"
        value={val} onChange={e=>{set(onlyAngka(e.target.value));setGpErr("");}}
        onKeyDown={blockNonAngka} placeholder={ph} maxLength={12}
        style={{...inp,paddingLeft:34,paddingRight:34,fontSize:13,padding:"8px 34px",letterSpacing:show?"normal":"3px",fontWeight:700}}/>
      <button onClick={tog} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>
        {show?Ic.EyeOff():Ic.Eye()}
      </button>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif",padding:16}}>
      <style>{`@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}`}</style>
      <div style={{background:"#fff",borderRadius:24,padding:"36px 32px",width:"100%",maxWidth:380,boxShadow:"0 24px 80px rgba(0,0,0,.25)",animation:"fadeUp .4s ease"}}>
        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:8}}>🏪</div>
          <div style={{fontWeight:900,fontSize:22,color:"#0d9488"}}>Ammar Cell</div>
          <div style={{fontSize:12,color:"#aaa",fontWeight:600,marginTop:2}}>Sistem Kasir Terpadu</div>
        </div>

        {/* Username */}
        <div style={{marginBottom:12}}>
          <label style={{...lbl}}>Username</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.User(18)}</span>
            <input type="text" value={username} onChange={e=>{setUsername(e.target.value);setError("");}}
              onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Username..."
              style={{...inp,paddingLeft:38,border:`2px solid ${error?"#ff4757":"#b2ede6"}`}}/>
          </div>
        </div>

        {/* Password */}
        <div style={{marginBottom:4}}>
          <label style={{...lbl}}>Password <span style={{fontSize:10,color:"#aaa",fontWeight:600}}>(angka saja)</span></label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Lock(18)}</span>
            <input type={showPass?"text":"password"} inputMode="numeric" pattern="[0-9]*"
              value={password} onChange={e=>{setPassword(onlyAngka(e.target.value));setError("");}}
              onKeyDown={e=>{blockNonAngka(e);if(e.key==="Enter")handleLogin();}}
              placeholder="Password angka..." maxLength={12}
              style={{...inp,paddingLeft:38,paddingRight:38,border:`2px solid ${error?"#ff4757":"#b2ede6"}`,letterSpacing:showPass?"normal":"4px",fontWeight:700}}/>
            <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>
              {showPass?Ic.EyeOff():Ic.Eye()}
            </button>
          </div>
        </div>

        {/* Link ganti password */}
        <div style={{textAlign:"right",marginBottom:10}}>
          <button onClick={()=>{setShowGanti(p=>!p);setGpErr("");setGpOk(false);}}
            style={{background:"none",border:"none",color:"#0d9488",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",padding:0,textDecoration:"underline",textUnderlineOffset:2}}>
            {showGanti?"✕ Tutup":"🔑 Ganti Password?"}
          </button>
        </div>

        {/* Panel ganti password */}
        {showGanti&&(
          <div style={{background:"#f0faf8",borderRadius:14,padding:"14px 16px",marginBottom:12,border:"2px solid #b2ede6",animation:"slideDown .25s ease"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>🔑 Ganti Password</div>
            {gpOk?(
              <div style={{textAlign:"center",padding:"10px 0"}}>
                <div style={{fontSize:32,marginBottom:6}}>✅</div>
                <div style={{fontWeight:800,fontSize:13,color:"#16a34a"}}>Password Berhasil Diubah!</div>
              </div>
            ):(
              <>
                <div style={{marginBottom:8}}>
                  <label style={{...lbl,fontSize:10}}>Username</label>
                  <div style={{position:"relative"}}>
                    <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.User(14)}</span>
                    <input type="text" value={gpUser} onChange={e=>{setGpUser(e.target.value);setGpErr("");}} placeholder="Username kamu..."
                      style={{...inp,paddingLeft:34,fontSize:12,padding:"8px 10px 8px 34px"}}/>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{...lbl,fontSize:10}}>Password Lama</label>
                  <PwInput val={gpLama} set={setGpLama} show={showGL} tog={()=>setShowGL(p=>!p)} ph="Password lama..."/>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{...lbl,fontSize:10}}>Password Baru <span style={{color:"#aaa"}}>(min. 4 angka)</span></label>
                  <PwInput val={gpBaru} set={setGpBaru} show={showGB} tog={()=>setShowGB(p=>!p)} ph="Password baru..."/>
                </div>
                <div style={{marginBottom:8}}>
                  <label style={{...lbl,fontSize:10}}>Konfirmasi Password Baru</label>
                  <PwInput val={gpKonfirm} set={setGpKonfirm} show={showGB} tog={()=>setShowGB(p=>!p)} ph="Ulangi password baru..."/>
                  {gpBaru&&gpKonfirm&&(gpBaru===gpKonfirm
                    ?<div style={{fontSize:10,color:"#16a34a",marginTop:3,fontWeight:700}}>✅ Cocok</div>
                    :<div style={{fontSize:10,color:"#ff4757",marginTop:3,fontWeight:700}}>❌ Tidak cocok</div>
                  )}
                </div>
                {gpErr&&<div style={{fontSize:11,color:"#ff4757",fontWeight:700,marginBottom:8,padding:"6px 10px",background:"#fff0f0",borderRadius:8}}>⚠️ {gpErr}</div>}
                <button onClick={handleGanti} disabled={loading}
                  style={{width:"100%",padding:"9px",borderRadius:10,border:"none",background:loading?"#ccc":"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:13,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit"}}>
                  {loading?"⏳ Menyimpan...":"💾 Simpan Password Baru"}
                </button>
              </>
            )}
          </div>
        )}

        {error&&<div style={{fontSize:12,color:"#ff4757",fontWeight:700,marginBottom:8,padding:"6px 10px",background:"#fff0f0",borderRadius:8}}>⚠ {error}</div>}
        <button onClick={handleLogin} disabled={loading}
          style={{width:"100%",background:loading?"#ccc":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",marginTop:4,boxShadow:loading?"none":"0 4px 16px rgba(13,148,136,.4)"}}>
          {loading?"⏳ Masuk...":"Masuk →"}
        </button>
      </div>
    </div>
  );
}
// ==============================================================================
// MENU UTAMA
// ==============================================================================
function MenuUtama({ user, onNavigate, onLogout, stats }) {
  const menus = [
    {id:"kasir",    icon:Ic.Cart(),     label:"Kasir",              desc:"Buka transaksi penjualan",     color:"#0d9488", bg:"#e0faf5", roles:["admin","karyawan"]},
    {id:"bank",     icon:Ic.Cash(22),   label:"Bank",               desc:"Pencatatan transaksi keuangan",color:"#0d9488", bg:"#e0faf5", roles:["admin","karyawan"]},
    {id:"monitor",  icon:Ic.Dashboard(),label:"Monitor Live",        desc:"Pantau kasir & bank realtime", color:"#27ae60", bg:"#e8f8f0", roles:["admin"]},
    {id:"cashflow", icon:Ic.Dashboard(),label:"Cashflow Manager",    desc:"Pantau arus kas & saran bisnis",color:"#27ae60",bg:"#e8f8f0", roles:["admin"]},
    {id:"produk",   icon:Ic.Produk(),   label:"Produk & Stok",      desc:"Produk, stok, opname & aktif",color:"#27ae60", bg:"#e8f8f0", roles:["admin"]},
    {id:"outlet",   icon:Ic.Outlet(),   label:"Manajemen Outlet",   desc:"Kelola outlet & kasir",        color:"#2980b9", bg:"#e8f4fd", roles:["admin"]},
    {id:"saldo",    icon:Ic.Cash(22),   label:"Saldo Aplikasi",     desc:"Setting saldo kasir & bank",   color:"#0d9488", bg:"#e0faf5", roles:["admin"]},
    {id:"dashboard",    icon:Ic.Dashboard(),label:"Dashboard",        desc:"Pantau omset & performa",      color:"#e67e22", bg:"#fef5e7", roles:["admin"]},
    {id:"dashboardbank", icon:Ic.Chart(),    label:"Dashboard Bank",     desc:"Pantau transaksi keuangan bank",color:"#0d9488", bg:"#e0faf5", roles:["admin"]},
    {id:"overall",  icon:Ic.Laporan(),  label:"Dashboard Overall",  desc:"Semua lini bisnis & analisis", color:"#8e44ad", bg:"#f5eeff", roles:["admin"]},
    {id:"laporan",  icon:Ic.Laporan(),  label:"Laporan",            desc:"Riwayat, per outlet & shift",  color:"#c0392b", bg:"#fff0f0", roles:["admin"]},
    {id:"strategi", icon:"🧠",      label:"Strategi Bulanan",   desc:"Insight & misi otomatis dari penjualan", color:"#4338ca", bg:"#eef2ff", roles:["admin"]},
    {id:"portal-admin", icon:"👷",      label:"Portal Karyawan",    desc:"Kelola misi, absensi & izin",  color:"#0d9488", bg:"#e0faf5", roles:["admin"]},
  ];
  const accessible = menus.filter(m=>m.roles.includes(user.role));

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",padding:"16px 24px",display:"flex",alignItems:"center",boxShadow:"0 2px 14px rgba(13,148,136,.3)"}}>
        <div style={{marginRight:"auto"}}>
          <div style={{fontWeight:900,fontSize:18,color:"#fff"}}>🏪 Ammar Cell</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.7)",fontWeight:600}}>Selamat datang, {user.nama}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.15)",borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:800,color:"#fff",marginRight:10}}>
          {user.role==="admin"?"👑 Admin":"👷 "+user.nama}
        </div>
        <button onClick={onLogout} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"6px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
          {Ic.Logout()} Logout
        </button>
      </div>
      <div style={{padding:"22px",maxWidth:900,margin:"0 auto"}}>
        {user.role==="admin"&&(
          <>
            {/* Baris 1: KPI utama */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
              {[
                {label:"Omset Hari Ini", val:fmtRp(stats.omsetHari),       color:"#0d9488", bg:"linear-gradient(135deg,#0d9488,#14b8a6)", tc:"#fff"},
                {label:"Transaksi",      val:stats.txHari+" trx",           color:"#2980b9", bg:"#e8f4fd",    tc:"#2980b9"},
                {label:"Stok Menipis",   val:stats.stokMenipis+" produk",   color:"#ff4757", bg:"#fff0f0",    tc:"#ff4757"},
                {label:"Produk Aktif",   val:(stats.totalProduk||0)+" item",color:"#8e44ad", bg:"#f5eeff",    tc:"#8e44ad"},
              ].map(s=>(
                <div key={s.label} style={{background:s.bg,borderRadius:12,padding:"12px 16px",border:s.bg.includes("gradient")?"none":"2px solid #e0f5f1"}}>
                  <div style={{fontWeight:900,fontSize:18,color:s.tc}}>{s.val}</div>
                  <div style={{fontSize:11,fontWeight:600,marginTop:2,color:s.tc,opacity:s.bg.includes("gradient")?0.85:0.7}}>{s.label}</div>
                </div>
              ))}
            </div>
            {/* Baris 2: Cashflow */}
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"14px 18px",marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>💰 Cashflow Hari Ini</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                {[
                  {label:"Uang Masuk Kasir",  val:fmtRp(stats.omsetHari),      color:"#0d9488"},
                  {label:"Bank Masuk",         val:fmtRp(stats.bankMasukHari||0),color:"#27ae60"},
                  {label:"Bank Keluar",        val:fmtRp(stats.bankKeluarHari||0),color:"#e74c3c"},
                  {label:"Fee/Saldo",          val:fmtRp(stats.feeHari||0),     color:"#f39c12"},
                  {label:"Net Cashflow",       val:fmtRp((stats.omsetHari||0)+(stats.bankMasukHari||0)-(stats.bankKeluarHari||0)), color:"#8e44ad"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#f8fffe",borderRadius:9,padding:"9px 11px",border:"1px solid #e0f5f1",textAlign:"center"}}>
                    <div style={{fontWeight:900,fontSize:14,color:s.color}}>{s.val}</div>
                    <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:3,lineHeight:1.3}}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:13}}>
          {accessible.map(m=>(
            <button key={m.id} onClick={()=>onNavigate(m.id)} style={{background:"#fff",border:`2px solid ${m.color}22`,borderRadius:16,padding:"22px 18px",textAlign:"left",cursor:"pointer",fontFamily:"inherit",boxShadow:"0 2px 10px rgba(0,0,0,.05)",transition:"all .18s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.borderColor=m.color;e.currentTarget.style.boxShadow=`0 8px 24px ${m.color}30`;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.borderColor=`${m.color}22`;e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.05)";}}>
              <div style={{background:m.bg,borderRadius:12,width:48,height:48,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:12,color:m.color}}>{m.icon}</div>
              <div style={{fontWeight:800,fontSize:14,color:"#1a2e2a",marginBottom:4}}>{m.label}</div>
              <div style={{fontSize:11,color:"#aaa",fontWeight:600,lineHeight:1.4}}>{m.desc}</div>
            </button>
          ))}
        </div>
        {user.role==="karyawan"&&(
          <div style={{marginTop:18,background:"#fffbe6",border:"2px solid #f39c12",borderRadius:12,padding:"12px 16px",fontSize:12,color:"#b7770d",fontWeight:700,display:"flex",alignItems:"center",gap:8}}>
            {Ic.Lock()} Fitur lainnya hanya untuk Admin / Boss.
          </div>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// OUTLET MANAGEMENT
// ==============================================================================
function OutletPage({ outlets, setOutlets, users, setUsers, stocks, setStocks, products, onBack, notify }) {
  const [tab,           setTab]           = useState("outlets"); // outlets | users
  const [showOutletForm,setShowOutletForm]= useState(false);
  const [showUserForm,  setShowUserForm]  = useState(false);
  const [editOutlet,    setEditOutlet]    = useState(null);
  const [editUser,      setEditUser]      = useState(null);
  const [confirmDel,    setConfirmDel]    = useState(null);
  const [resetPassTarget, setResetPassTarget] = useState(null); // {key, nama}
  const [resetPassVal,  setResetPassVal]  = useState("");
  const [resetPassOk,   setResetPassOk]   = useState(false);
  const [oForm, setOForm] = useState({nama:"",alamat:"",lat:"",lng:"",radius:100,fiturGabungan:false});
  const [uForm, setUForm] = useState({username:"",pass:"",nama:"",outletId:"",outletIds:[],role:"karyawan"});

  const openAddOutlet = ()=>{ setEditOutlet(null); setOForm({nama:"",alamat:"",lat:"",lng:"",radius:100,fiturGabungan:false}); setShowOutletForm(true); };
  const openEditOutlet= o=>{ setEditOutlet(o); setOForm({nama:o.nama,alamat:o.alamat||"",lat:o.lat||"",lng:o.lng||"",radius:o.radius||100,fiturGabungan:!!(o.fitur_gabungan??o.fiturGabungan)}); setShowOutletForm(true); };
  const saveOutlet = async ()=>{
    if (!oForm.nama.trim()) return notify("Isi nama outlet!","err");
    const outletData = {
      nama: oForm.nama.trim(),
      alamat: oForm.alamat.trim(),
      lat: oForm.lat ? +oForm.lat : null,
      lng: oForm.lng ? +oForm.lng : null,
      radius: +oForm.radius || 100,
      fitur_gabungan: !!oForm.fiturGabungan,
    };
    if (editOutlet) {
      try {
        await db.updateOutlet(editOutlet.id, outletData);
        setOutlets(prev=>prev.map(o=>o.id===editOutlet.id?{...o,...outletData}:o));
        notify("Outlet diperbarui","ok");
      } catch(e) { notify("Gagal simpan outlet!","err"); return; }
    } else {
      const id="o"+uid();
      const newOutlet = {id,...outletData,aktif:true};
      try {
        await db.addOutlet(newOutlet);
        setOutlets(prev=>[...prev,newOutlet]);
        setStocks(prev=>({...prev,[id]:Object.fromEntries(products.map(p=>[p.id,0]))}));
        notify("Outlet ditambahkan","ok");
      } catch(e) { notify("Gagal tambah outlet!","err"); return; }
    }
    setShowOutletForm(false);
  };
  const toggleOutlet = async id=>{
    const o = outlets.find(x=>x.id===id);
    if(!o) return;
    try {
      await db.updateOutlet(id, {aktif:!o.aktif});
      setOutlets(prev=>prev.map(x=>x.id===id?{...x,aktif:!x.aktif}:x));
    } catch(e) { notify("Gagal update outlet!","err"); }
  };
  const deleteOutlet = async id=>{
    try {
      await db.deleteOutlet(id);
      setOutlets(prev=>prev.filter(o=>o.id!==id));
      setStocks(prev=>{const s={...prev};delete s[id];return s;});
      setConfirmDel(null); notify("Outlet dihapus","warn");
    } catch(e) { notify("Gagal hapus outlet!","err"); }
  };

  const openAddUser  = ()=>{ setEditUser(null); setUForm({username:"",pass:"",nama:"",outletId:"",outletIds:[],role:"karyawan"}); setShowUserForm(true); };
  const openEditUser = (u,k)=>{
    // Rebuild outletIds dari semua sumber yang mungkin
    let outletIds = [];
    if(Array.isArray(u.outletIds)&&u.outletIds.length>0) outletIds=[...u.outletIds];
    else if(typeof u.outletIds==="string"){ try{outletIds=JSON.parse(u.outletIds);}catch{} }
    if(outletIds.length===0&&u.outlet_ids){ try{outletIds=JSON.parse(u.outlet_ids);}catch{} }
    if(outletIds.length===0&&u.outletId) outletIds=[u.outletId];
    if(outletIds.length===0&&u.outlet_id) outletIds=[u.outlet_id];
    outletIds=[...new Set(outletIds)].filter(Boolean);

    const outletId=outletIds[0]||u.outletId||u.outlet_id||"";
    setEditUser(k);
    setUForm({username:k, pass:u.pass||"", nama:u.nama||"", outletId, outletIds, role:u.role||"karyawan"});
    setShowUserForm(true);
  };
  const saveUser = async ()=>{
    if (!uForm.username.trim()||!uForm.nama.trim()) return notify("Isi username & nama!","err");
    if (!editUser && !uForm.pass) return notify("Isi password!","err");
    if (!editUser && users[uForm.username.toLowerCase()]) return notify("Username sudah ada!","err");
    if((uForm.role==="kasir"||uForm.role==="bank"||uForm.role==="staff")&&(uForm.outletIds||[]).length===0)
      return notify("Kasir/Bank harus ditugaskan ke minimal 1 outlet!","err");

    const outletIds = [...new Set(uForm.outletIds||[])].filter(Boolean);
    const outletId  = outletIds[0]||uForm.outletId||null;
    const pass      = uForm.pass||(editUser?users[editUser]?.pass:"");

    // userData lengkap — outletIds HARUS ada di sini agar masuk ke JSON di DB
    const userData = {
      pass, nama:uForm.nama.trim(), role:uForm.role,
      outletId, outletIds,
    };

    // 1. Update state lokal DULU (langsung tampil)
    setUsers(prev=>{
      const n={...prev};
      if(editUser&&editUser!==uForm.username.toLowerCase()) delete n[editUser];
      n[uForm.username.toLowerCase()]={...userData};
      return n;
    });

    try {
      if(editUser && editUser!==uForm.username.toLowerCase()) {
        try{ await db.deleteUser(editUser); }catch(e2){ console.warn('deleteUser:',e2); }
        try{ await supabase.from('user_outlets').delete().eq('username', editUser); }catch{}
      }
      try{ await db.upsertUser(uForm.username.toLowerCase(), userData); }catch(e2){ console.warn('upsertUser:',e2); }

      // Simpan outletIds ke tabel user_outlets
      if(outletIds.length>0) {
        try{
          await supabase.from('user_outlets').delete().eq('username', uForm.username.toLowerCase());
        }catch{}
        try{
          await supabase.from('user_outlets').insert(
            outletIds.map(oid=>({username:uForm.username.toLowerCase(), outlet_id:oid, role:uForm.role}))
          );
        }catch(e){ console.warn('user_outlets insert:',e); }
      }

      try{
        const saved=JSON.parse(localStorage.getItem('ammar_user')||'null');
        if(saved&&saved.username===uForm.username.toLowerCase()){
          localStorage.setItem('ammar_user',JSON.stringify({...saved,...userData,username:uForm.username.toLowerCase()}));
        }
      }catch{}
      notify(editUser?"User diperbarui ✓":"User ditambahkan ✓","ok");
      setShowUserForm(false);
    } catch(e) {
      notify("Gagal simpan user: "+e.message,"err");
      setUsers(prev=>{ const n={...prev}; if(editUser) n[editUser]=users[editUser]; else delete n[uForm.username.toLowerCase()]; return n; });
    }
  };
  const deleteUser = async k=>{
    try {
      await db.deleteUser(k);
      setUsers(prev=>{const n={...prev};delete n[k];return n;});
      setConfirmDel(null); notify("User dihapus","warn");
    } catch(e) { notify("Gagal hapus user!","err"); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="🏪 Manajemen Outlet" onBack={onBack}
        right={
          <button onClick={tab==="outlets"?openAddOutlet:openAddUser} style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:"7px 14px",color:"#fff",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontFamily:"inherit"}}>
            {Ic.PlusCirc()} {tab==="outlets"?"Tambah Outlet":"Tambah User"}
          </button>
        }
      />
      <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>
        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:16,background:"#fff",borderRadius:12,padding:4,border:"2px solid #e0f5f1",width:"fit-content"}}>
          {[{k:"outlets",l:"🏪 Outlet"},{k:"users",l:"👤 Kasir & User"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"7px 20px",borderRadius:9,border:"none",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",background:tab===t.k?"#0d9488":"transparent",color:tab===t.k?"#fff":"#888",transition:"all .15s"}}>{t.l}</button>
          ))}
        </div>

        {/* OUTLETS */}
        {tab==="outlets"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:13}}>
            {outlets.map(o=>{
              const kasirList=Object.entries(users).filter(([,u])=>u.outletId===o.id);
              const stokCount=Object.values(stocks[o.id]||{}).reduce((s,v)=>s+v,0);
              return (
                <div key={o.id} style={{background:"#fff",borderRadius:14,padding:"16px",border:`2px solid ${o.aktif?"#e0f5f1":"#eee"}`,opacity:o.aktif?1:.6}}>
                  <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:15,color:"#1a2e2a"}}>{o.nama}</div>
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{o.alamat||"--"}</div>
                    </div>
                    <span style={{background:o.aktif?"#e0faf5":"#f0f0f0",color:o.aktif?"#0d9488":"#aaa",fontWeight:800,fontSize:10,padding:"2px 9px",borderRadius:20}}>{o.aktif?"🟢 Aktif":"⚫ Nonaktif"}</span>
                  </div>
                  {(o.fitur_gabungan??o.fiturGabungan)&&<div style={{display:"inline-block",background:"#eef2ff",color:"#4338ca",fontWeight:800,fontSize:9,padding:"2px 9px",borderRadius:20,marginBottom:8}}>🧾 Kasir+Bank Gabungan</div>}
                  <div style={{display:"flex",gap:8,marginBottom:12}}>
                    <div style={{flex:1,background:"#f0faf8",borderRadius:9,padding:"7px 10px",textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{kasirList.length}</div>
                      <div style={{fontSize:10,color:"#aaa",fontWeight:600}}>Kasir</div>
                    </div>
                    <div style={{flex:1,background:"#f0faf8",borderRadius:9,padding:"7px 10px",textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:16,color:"#27ae60"}}>{stokCount}</div>
                      <div style={{fontSize:10,color:"#aaa",fontWeight:600}}>Total Stok</div>
                    </div>
                  </div>
                  {kasirList.length>0&&<div style={{fontSize:11,color:"#0d9488",fontWeight:700,marginBottom:10}}>👤 {kasirList.map(([,u])=>u.nama).join(", ")}</div>}
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>openEditOutlet(o)} style={{flex:1,background:"#e0faf5",border:"none",borderRadius:8,padding:"6px 0",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{Ic.Edit()} Edit</button>
                    <button onClick={()=>toggleOutlet(o.id)} style={{flex:1,background:o.aktif?"#fffbe6":"#e0faf5",border:"none",borderRadius:8,padding:"6px 0",color:o.aktif?"#f39c12":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{o.aktif?"Nonaktifkan":"Aktifkan"}</button>
                    <button onClick={()=>setConfirmDel({type:"outlet",id:o.id,nama:o.nama})} style={{background:"#fff0f0",border:"none",borderRadius:8,padding:"6px 10px",color:"#ff4757",cursor:"pointer"}}>{Ic.Trash()}</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* USERS */}
        {tab==="users"&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#e0faf5"}}>
                {["Username","Nama","Role","Outlet","Aksi"].map(h=>(
                  <th key={h} style={{padding:"9px 13px",textAlign:"left",fontWeight:800,color:"#0d9488"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {Object.entries(users).map(([key,u],i)=>{
                  const outletNama=outlets.find(o=>o.id===u.outletId)?.nama||"--";
                  return (
                    <tr key={key} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                      <td style={{padding:"10px 13px",fontWeight:800,color:"#0d9488",fontFamily:"monospace"}}>{key}</td>
                      <td style={{padding:"10px 13px",fontWeight:700}}>{u.nama}</td>
                      <td style={{padding:"10px 13px"}}><span style={{
                        background:u.role==="admin"?"#f5eeff":u.role==="monitor"?"#fef3c7":u.role==="kasir"?"#e0faf5":u.role==="bank"?"#e8f4fd":u.role==="staff"?"#f0fff4":u.role==="cashflow"?"#e8f8f0":"#fffbeb",
                        color:u.role==="admin"?"#8e44ad":u.role==="monitor"?"#d97706":u.role==="kasir"?"#0d9488":u.role==="bank"?"#2980b9":u.role==="staff"?"#16a34a":u.role==="cashflow"?"#27ae60":"#d97706",
                        fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>
                        {u.role==="admin"?"👑 Admin":u.role==="monitor"?"👁 Monitor":u.role==="kasir"?"🛒 Kasir":u.role==="bank"?"🏦 Bank":u.role==="staff"?"💼 Kasir+Bank":u.role==="cashflow"?"📋 Cashflow":"👤 Portal"}
                      </span></td>
                      <td style={{padding:"10px 13px"}}>
                        {u.role==="admin"||u.role==="cashflow"?(
                          <span style={{color:"#aaa",fontSize:11}}>{u.role==="cashflow"?"Jurnal global":"Semua outlet"}</span>
                        ):(u.outletIds||[]).length>0?(
                          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                            {(u.outletIds||[]).map(id=>(
                              <span key={id} style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"1px 7px",borderRadius:20}}>
                                {outlets.find(o=>o.id===id)?.nama?.replace("Ammar Cell ","")||id}
                              </span>
                            ))}
                          </div>
                        ):u.outletId?(
                          <span style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"1px 7px",borderRadius:20}}>
                            {outlets.find(o=>o.id===u.outletId)?.nama?.replace("Ammar Cell ","")||u.outletId}
                          </span>
                        ):(
                          <span style={{color:"#ccc",fontSize:11}}>
                            {u.role==="kasir"||u.role==="bank"
                              ? <span style={{color:"#ef4444",fontWeight:700}}>⚠️ Belum ditugaskan</span>
                              : "—"}
                          </span>
                        )}
                      </td>
                      <td style={{padding:"10px 13px"}}>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          <button onClick={()=>openEditUser(u,key)} style={{background:"#e0faf5",border:"none",borderRadius:7,padding:"5px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}>{Ic.Edit()} Edit</button>
                          <button onClick={()=>setResetPassTarget({key,nama:u.nama})} style={{background:"#fffbeb",border:"none",borderRadius:7,padding:"5px 10px",color:"#d97706",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🔑 Reset</button>
                          <button onClick={()=>setConfirmDel({type:"user",id:key,nama:u.nama})} style={{background:"#fff0f0",border:"none",borderRadius:7,padding:"5px 10px",color:"#ff4757",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{Ic.Trash()} Hapus</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OUTLET FORM */}
      {showOutletForm&&(
        <Modal onClose={()=>setShowOutletForm(false)} title={editOutlet?"✏️ Edit Outlet":"🏪 Tambah Outlet"}>
          <Field label="Nama Outlet *" value={oForm.nama} onChange={e=>setOForm(p=>({...p,nama:e.target.value}))} placeholder="Nama outlet..."/>
          <Field label="Alamat" value={oForm.alamat} onChange={e=>setOForm(p=>({...p,alamat:e.target.value}))} placeholder="Alamat outlet..."/>
          {/* GPS fields */}
          <div style={{background:"#f0faf8",borderRadius:10,padding:"12px",border:"2px solid #e0f5f1",marginBottom:8}}>
            <div style={{fontWeight:700,fontSize:11,color:"#0d9488",marginBottom:8}}>📍 Koordinat GPS (untuk batasi akses kasir/bank)</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:3}}>Latitude</label>
                <input type="number" step="any" value={oForm.lat} onChange={e=>setOForm(p=>({...p,lat:e.target.value}))} placeholder="-6.9175" style={{width:"100%",padding:"7px 9px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div>
                <label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:3}}>Longitude</label>
                <input type="number" step="any" value={oForm.lng} onChange={e=>setOForm(p=>({...p,lng:e.target.value}))} placeholder="107.6191" style={{width:"100%",padding:"7px 9px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:3}}>Radius (meter) — default 100m</label>
              <input type="number" value={oForm.radius} onChange={e=>setOForm(p=>({...p,radius:e.target.value}))} placeholder="100" style={{width:"100%",padding:"7px 9px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
            </div>
            <div style={{marginTop:8,fontSize:9,color:"#aaa"}}>💡 Kosongkan jika tidak ingin batasi lokasi. Koordinat dari Google Maps (tap & tahan pada titik toko)</div>
          </div>

          {/* Toggle fitur Kasir+Bank Gabungan */}
          <div style={{background:"#eef2ff",borderRadius:10,padding:"12px",border:"2px solid #c7d2fe",marginBottom:8}}>
            <button onClick={()=>setOForm(p=>({...p,fiturGabungan:!p.fiturGabungan}))}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,background:"none",border:"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left",padding:0}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${oForm.fiturGabungan?"#4338ca":"#c7d2fe"}`,background:oForm.fiturGabungan?"#4338ca":"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,flexShrink:0,transition:"all .15s"}}>{oForm.fiturGabungan?"✓":""}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:12,color:"#4338ca"}}>🧾 Aktifkan Kasir + Bank Gabungan</div>
                <div style={{fontSize:10,color:"#6366f1",marginTop:1}}>Tampilkan menu "Kasir + Bank (1 Laci)" untuk karyawan outlet ini</div>
              </div>
            </button>
          </div>

          <div style={{display:"flex",gap:8,marginTop:8}}>
            <button onClick={()=>setShowOutletForm(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:11,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
            <button onClick={saveOutlet} style={{flex:2,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {editOutlet?"💾 Simpan":"✓ Tambah Outlet"}
            </button>
          </div>
        </Modal>
      )}

      {/* USER FORM */}
      {showUserForm&&(
        <Modal onClose={()=>setShowUserForm(false)} title={editUser?"✏️ Edit User":"👤 Tambah User"}>
          <Field label="Username *" value={uForm.username} onChange={e=>setUForm(p=>({...p,username:e.target.value.toLowerCase()}))} placeholder="username (huruf kecil)..."/>
          <Field label="Password" value={uForm.pass} onChange={e=>setUForm(p=>({...p,pass:e.target.value}))} placeholder={editUser?"Kosongkan jika tidak diubah":"Password baru..."} type="password"/>
          <Field label="Nama Lengkap *" value={uForm.nama} onChange={e=>setUForm(p=>({...p,nama:e.target.value}))} placeholder="Nama tampil..."/>

          {/* Role -- tombol visual */}
          <div style={{marginBottom:14}}>
            <label style={{...lbl}}>Role *</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
              {[
                {k:"kasir",   icon:"🛒",l:"Kasir",      sub:"+ Portal",  bg:"#e0faf5",c:"#0d9488"},
                {k:"bank",    icon:"🏦",l:"Bank",        sub:"+ Portal",  bg:"#e8f4fd",c:"#2980b9"},
                {k:"staff",   icon:"💼",l:"Kasir+Bank",  sub:"+ Portal",  bg:"#f0fff4",c:"#16a34a"},
                {k:"karyawan",icon:"👤",l:"Portal",      sub:"Only",      bg:"#fffbeb",c:"#d97706"},
                {k:"admin",   icon:"👑",l:"Admin",       sub:"Semua",     bg:"#f5eeff",c:"#8e44ad"},
                {k:"monitor", icon:"👁",l:"Monitor",     sub:"Live only", bg:"#fef3c7",c:"#b45309"},
                {k:"cashflow",icon:"📋",l:"Cashflow",    sub:"Jurnal only",bg:"#e8f8f0",c:"#27ae60"},
              ].map(r=>(
                <button key={r.k} onClick={()=>setUForm(p=>({...p,role:r.k}))}
                  style={{padding:"10px 6px",borderRadius:10,border:`2px solid ${uForm.role===r.k?r.c:"#b2ede6"}`,background:uForm.role===r.k?r.bg:"#fff",color:uForm.role===r.k?r.c:"#aaa",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all .15s"}}>
                  <div style={{fontSize:18,marginBottom:3}}>{r.icon}</div>
                  <div style={{fontWeight:800,fontSize:10}}>{r.l}</div>
                  <div style={{fontSize:8,color:uForm.role===r.k?r.c:"#ccc",marginTop:1}}>{r.sub}</div>
                </button>
              ))}
            </div>
            <div style={{background:"#f0faf8",borderRadius:8,padding:"8px 10px",fontSize:10,color:"#555",lineHeight:1.7}}>
              {uForm.role==="kasir"  &&<>🛒 <b>Kasir</b> — Akses kasir (GPS wajib di toko) + Portal bebas</>}
              {uForm.role==="bank"   &&<>🏦 <b>Bank</b> — Akses bank (GPS wajib di toko) + Portal bebas</>}
              {uForm.role==="staff"  &&<>💼 <b>Kasir+Bank</b> — Akses kasir <b>dan</b> bank (GPS wajib di toko) + Portal bebas</>}
              {uForm.role==="karyawan"&&<>👤 <b>Portal Only</b> — Hanya portal (absensi, izin, misi). Tidak ada akses kasir/bank</>}
              {uForm.role==="admin"  &&<>👑 <b>Admin</b> — Akses semua fitur dari mana saja</>}
              {uForm.role==="monitor"&&<>👁 <b>Monitor</b> — Hanya halaman monitor live</>}
              {uForm.role==="cashflow"&&<>📋 <b>Cashflow</b> — Langsung masuk ke Jurnal Cashflow saja, untuk input transaksi keuangan cepat</>}
            </div>
          </div>

          {/* Outlet checklist -- semua role kecuali admin & cashflow (cashflow tidak per-outlet) */}
          {uForm.role!=="admin"&&uForm.role!=="cashflow"?(
            <div style={{marginBottom:14}}>
              <label style={{...lbl}}>
                Outlet Tugasan
                <span style={{color:uForm.role==="monitor"?"#d97706":"#0d9488",fontWeight:600,marginLeft:6,fontSize:10}}>
                  {uForm.role==="monitor"?"-- outlet yang dipantau":"-- bisa pilih beberapa"}
                </span>
              </label>
              <div style={{border:"2px solid #b2ede6",borderRadius:11,padding:"8px 10px",background:"#fafffe"}}>
                {outlets.map(o=>{
                  const checked=(uForm.outletIds||[]).includes(o.id);
                  return(
                    <div key={o.id} onClick={()=>{
                      const ids=uForm.outletIds||[];
                      setUForm(p=>({...p,outletIds:ids.includes(o.id)?ids.filter(x=>x!==o.id):[...ids,o.id]}));
                    }}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"7px 6px",cursor:"pointer",borderRadius:8,background:checked?"#e0faf5":"transparent",marginBottom:2,transition:"background .15s"}}>
                      <div style={{width:20,height:20,borderRadius:6,flexShrink:0,border:`2px solid ${checked?"#0d9488":"#b2ede6"}`,background:checked?"#0d9488":"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"all .15s"}}>
                        {checked&&<span style={{color:"#fff",fontSize:11,fontWeight:900,lineHeight:1}}>✓</span>}
                      </div>
                      <span style={{fontSize:13,fontWeight:checked?700:500,color:checked?"#0d9488":"#1a2e2a"}}>{o.nama}</span>
                    </div>
                  );
                })}
                {(uForm.outletIds||[]).length===0&&(
                  <div style={{fontSize:11,color:"#aaa",textAlign:"center",padding:"4px 0",marginTop:2}}>* Belum ada outlet dipilih</div>
                )}
              </div>
              {(uForm.outletIds||[]).length>0&&(
                <div style={{marginTop:7,background:"#e0faf5",borderRadius:9,padding:"6px 11px",display:"flex",gap:5,flexWrap:"wrap",alignItems:"center"}}>
                  <span style={{fontSize:10,color:"#0d9488",fontWeight:700}}>Dipilih:</span>
                  {(uForm.outletIds||[]).map(id=>(
                    <span key={id} style={{background:"#fff",color:"#0d9488",fontWeight:700,fontSize:10,padding:"1px 8px",borderRadius:20,border:"1px solid #0d948833"}}>
                      {outlets.find(o=>o.id===id)?.nama?.replace("Ammar Cell ","")||id}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ):(
            <div style={{background:uForm.role==="cashflow"?"#e8f8f0":"#f5eeff",border:`1px solid ${uForm.role==="cashflow"?"#27ae6033":"#8e44ad33"}`,borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:12,color:uForm.role==="cashflow"?"#27ae60":"#8e44ad",fontWeight:600}}>
              {uForm.role==="cashflow"?"📋 Cashflow tidak terikat outlet tertentu — akses langsung ke Jurnal.":"👑 Admin punya akses ke semua outlet otomatis."}
            </div>
          )}

          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowUserForm(false)}
              style={{width:44,height:44,borderRadius:10,border:"2px solid #b2ede6",background:"#fff",color:"#aaa",fontSize:18,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              ✕
            </button>
            <button onClick={saveUser}
              style={{flex:1,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {editUser?"💾 Simpan":"✓ Tambah User"}
            </button>
          </div>
        </Modal>
      )}

      {confirmDel&&(
        <ConfirmModal
          msg={`Hapus ${confirmDel.type==="outlet"?"outlet":"user"} "${confirmDel.nama}"?`}
          onConfirm={()=>confirmDel.type==="outlet"?deleteOutlet(confirmDel.id):deleteUser(confirmDel.id)}
          onCancel={()=>setConfirmDel(null)}
        />
      )}

      {/* MODAL RESET PASSWORD */}
      {resetPassTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:18,padding:"24px",width:"100%",maxWidth:380,boxShadow:"0 16px 48px rgba(0,0,0,.25)"}}>
            {resetPassOk?(
              <div style={{textAlign:"center",padding:"12px 0"}}>
                <div style={{fontSize:48,marginBottom:10}}>✅</div>
                <div style={{fontWeight:900,fontSize:16,color:"#16a34a"}}>Password Berhasil Direset!</div>
                <div style={{fontSize:12,color:"#aaa",marginTop:4}}>Password baru: <b style={{color:"#0d9488",letterSpacing:2}}>{resetPassVal}</b></div>
              </div>
            ):(
              <>
                <div style={{fontWeight:900,fontSize:16,color:"#1a2e2a",marginBottom:4}}>🔑 Reset Password</div>
                <div style={{fontSize:12,color:"#aaa",marginBottom:16}}>
                  User: <b style={{color:"#0d9488"}}>{resetPassTarget.nama}</b> <span style={{color:"#ccc"}}>({resetPassTarget.key})</span>
                </div>
                <div style={{marginBottom:16}}>
                  <label style={{...lbl}}>Password Baru <span style={{fontSize:10,color:"#aaa"}}>(angka saja, min. 4 digit)</span></label>
                  <input type="text" inputMode="numeric" pattern="[0-9]*"
                    value={resetPassVal}
                    onChange={e=>setResetPassVal(e.target.value.replace(/[^0-9]/g,""))}
                    onKeyDown={e=>{ if(!/[0-9]|Backspace|Delete|Tab|Enter|ArrowLeft|ArrowRight/.test(e.key)) e.preventDefault(); }}
                    placeholder="Contoh: 1234"
                    maxLength={12} autoFocus
                    style={{...inp,letterSpacing:"6px",fontWeight:900,fontSize:20,textAlign:"center"}}/>
                  {resetPassVal&&resetPassVal.length<4&&<div style={{fontSize:11,color:"#d97706",marginTop:4}}>⚠ Minimal 4 digit</div>}
                  {resetPassVal&&resetPassVal.length>=4&&<div style={{fontSize:11,color:"#16a34a",marginTop:4}}>✅ Password valid</div>}
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setResetPassTarget(null);setResetPassVal("");}}
                    style={{flex:1,padding:"10px",borderRadius:10,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
                  <button disabled={!resetPassVal||resetPassVal.length<4}
                    onClick={async()=>{
                      const u=users[resetPassTarget.key];
                      if(!u) return;
                      const updated={...u,pass:resetPassVal};
                      setUsers(prev=>({...prev,[resetPassTarget.key]:updated}));
                      try{ await db.upsertUser(resetPassTarget.key,updated); }catch(e){ console.warn('resetPass:',e); }
                      notify(`Password "${resetPassTarget.nama}" berhasil direset ✓`,"ok");
                      setResetPassOk(true);
                      setTimeout(()=>{ setResetPassTarget(null); setResetPassVal(""); setResetPassOk(false); },2200);
                    }}
                    style={{flex:2,padding:"10px",borderRadius:10,border:"none",
                      background:resetPassVal&&resetPassVal.length>=4?"linear-gradient(135deg,#d97706,#f59e0b)":"#e0e0e0",
                      color:"#fff",fontWeight:800,fontSize:13,
                      cursor:resetPassVal&&resetPassVal.length>=4?"pointer":"not-allowed",fontFamily:"inherit"}}>
                    🔑 Reset Password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// -- Komponen baris edit kategori (useState tidak boleh di dalam .map()) ------
function CategoryEditRow({ cat, onSave }) {
  const [val, setVal] = useState(cat);
  return (
    <div style={{display:"flex",gap:6,alignItems:"center"}}>
      <input value={val} onChange={e=>setVal(e.target.value)}
        style={{flex:1,padding:"6px 10px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
      <button onClick={()=>onSave(cat,val)}
        style={{background:"#0d9488",border:"none",borderRadius:8,padding:"6px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
        Simpan
      </button>
    </div>
  );
}

// -- StokPageInner -- reuse StokPage body dengan tab dari parent --------------
function StokPageInner({ tab, products, outlets, stocks, setStocks, selectedOutlet, notify, prodOrder }) {
  return (
    <StokPage
      key={tab}
      products={products} outlets={outlets}
      stocks={stocks} setStocks={setStocks}
      onBack={null} notify={notify}
      _initTab={tab} _initOutlet={selectedOutlet}
      _prodOrder={prodOrder}
    />
  );
}

// -- StokAktifTab -- kelola produk aktif per outlet ------------------------------
function StokAktifTab({ products, outlets, selectedOutlet, aktifProds, setAktifProds, notify }) {
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const [dirty,   setDirty]   = useState(false);

  // Jika belum ada setting untuk outlet ini, inisialisasi semua aktif
  const outletAktif = aktifProds[selectedOutlet] != null
    ? aktifProds[selectedOutlet]
    : products.map(p=>String(p.id));

  const isAktif = id => outletAktif.includes(String(id));

  const toggle = id => {
    const next = isAktif(id)
      ? outletAktif.filter(x=>x!==String(id))
      : [...outletAktif, String(id)];
    setAktifProds(prev=>({...prev,[selectedOutlet]:next}));
    setDirty(true);
  };

  const filtered = products.filter(p=>p.name?.toLowerCase().includes(search.toLowerCase()));

  const toggleAll = () => {
    const allIds = filtered.map(p=>String(p.id));
    const allOn  = allIds.every(id=>outletAktif.includes(id));
    const next   = allOn
      ? outletAktif.filter(id=>!allIds.includes(id))
      : [...new Set([...outletAktif,...allIds])];
    setAktifProds(prev=>({...prev,[selectedOutlet]:next}));
    setDirty(true);
  };

  const aktifCount = outletAktif.length;
  const outlet = outlets?.find(o=>o.id===selectedOutlet);

  const save = async () => {
    setSaving(true);
    try {
      await dbAktifProduk.saveAktif(selectedOutlet, outletAktif);
      setDirty(false);
      notify("Produk aktif disimpan ✓","ok");
    } catch(e) {
      notify("Gagal simpan: "+e.message,"err");
    }
    setSaving(false);
  };

  // Auto-init: jika outlet ini belum punya setting, simpan default semua aktif
  useEffect(()=>{
    if(aktifProds[selectedOutlet]==null && products.length>0){
      // Set ke semua aktif tapi JANGAN auto-save supaya user bisa pilih dulu
      setAktifProds(prev=>({...prev,[selectedOutlet]:products.map(p=>String(p.id))}));
    }
  },[selectedOutlet, products.length]);

  return (
    <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        {[
          {l:`Aktif -- ${outlet?.nama?.replace("Ammar Cell ","")||""}`,v:`${aktifCount}/${products.length}`,c:"#27ae60",bg:"#e8f8f0"},
          {l:"Nonaktif",v:products.length-aktifCount,c:"#e74c3c",bg:"#fff0f0"},
          {l:"Total Produk",v:products.length,c:"#2980b9",bg:"#e8f4fd"},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:11,padding:"11px 14px"}}>
            <div style={{fontWeight:900,fontSize:18,color:k.c}}>{k.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:k.c,opacity:.8,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>
      <div style={{background:"#fff8e1",border:"1px solid #f39c1233",borderRadius:10,padding:"8px 13px",marginBottom:10,fontSize:11,color:"#b7770d",fontWeight:600}}>
        💡 Produk <b>aktif</b> tampil di kasir outlet ini. Produk <b>nonaktif</b> tersembunyi saat transaksi.
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari produk..."
        style={{width:"100%",padding:"8px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",marginBottom:10,boxSizing:"border-box"}}/>
      <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",overflow:"hidden"}}>
        <div onClick={toggleAll} style={{display:"flex",alignItems:"center",padding:"9px 16px",borderBottom:"1px solid #e0f5f1",background:"#e0faf5",cursor:"pointer"}}>
          <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${filtered.every(p=>isAktif(p.id))?"#0d9488":"#b2ede6"}`,background:filtered.every(p=>isAktif(p.id))?"#0d9488":"#fff",display:"flex",alignItems:"center",justifyContent:"center",marginRight:10,flexShrink:0}}>
            {filtered.every(p=>isAktif(p.id))&&<span style={{color:"#fff",fontSize:11,fontWeight:900,lineHeight:1}}>✓</span>}
          </div>
          <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>Pilih / Batalkan Semua ({filtered.length})</span>
        </div>
        {filtered.map((p,i)=>{
          const on=isAktif(p.id);
          return (
            <div key={p.id} onClick={()=>toggle(p.id)}
              style={{display:"flex",alignItems:"center",padding:"9px 16px",borderTop:"1px solid #f0faf8",background:on?"#f8fffd":i%2===0?"#fff":"#fafffe",cursor:"pointer",transition:"background .1s"}}
              onMouseEnter={e=>e.currentTarget.style.background=on?"#edfaf5":"#f0faf8"}
              onMouseLeave={e=>e.currentTarget.style.background=on?"#f8fffd":i%2===0?"#fff":"#fafffe"}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${on?"#0d9488":"#b2ede6"}`,background:on?"#0d9488":"#fff",display:"flex",alignItems:"center",justifyContent:"center",marginRight:12,flexShrink:0,transition:"all .15s"}}>
                {on&&<span style={{color:"#fff",fontSize:11,fontWeight:900,lineHeight:1}}>✓</span>}
              </div>
              <div style={{flex:1,fontWeight:on?700:500,fontSize:13,color:on?"#1a2e2a":"#aaa"}}>{p.name}</div>
              <span style={{background:"#e0faf515",color:"#0d9488",fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,marginRight:10}}>{p.category}</span>
              <span style={{background:on?"#27ae6015":"#f0f0f0",color:on?"#27ae60":"#aaa",fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,minWidth:60,textAlign:"center"}}>
                {on?"✅ Aktif":"○ Nonaktif"}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{fontSize:11,color:dirty?"#d97706":"#aaa",fontWeight:700}}>
          {dirty?"⚠️ Ada perubahan belum disimpan":"✅ Tersimpan"}
        </div>
        <button onClick={save} disabled={saving||!dirty}
          style={{background:dirty?"linear-gradient(135deg,#0d9488,#14b8a6)":"#e0f5f1",border:"none",borderRadius:11,padding:"11px 28px",
            color:dirty?"#fff":"#0d9488",fontWeight:900,fontSize:14,cursor:dirty?"pointer":"default",fontFamily:"inherit",transition:"all .3s",opacity:saving?0.7:1}}>
          {saving?"⏳ Menyimpan...":dirty?"💾 Simpan Perubahan":"✅ Tersimpan"}
        </button>
      </div>
    </div>
  );
}

// ==============================================================================
// PRODUK (Master Produk -- tanpa stok, stok ada di per outlet)
// ==============================================================================
function ProdukPage({ products, setProducts, stocks, setStocks, outlets, onBack, notify, prodOrderRoot, setProdOrderRoot, aktifProdsRoot, setAktifProdsRoot }) {
  const [mainTab,      setMainTab]     = useState("produk"); // produk|opname|masuk|keluar|transfer|aktif|log
  const [selOutlet,    setSelOutlet]   = useState(outlets?.[0]?.id||"");
  const [aktifProds,   setAktifProds]  = useState(aktifProdsRoot||{});     // {outletId: [productId,...]}

  // Sync lokal saat aktifProdsRoot berubah dari parent (misalnya setelah load DB)
  useEffect(()=>{ if(aktifProdsRoot&&Object.keys(aktifProdsRoot).length>0) setAktifProds(aktifProdsRoot); },[aktifProdsRoot]);
  const [showModal,   setShowModal]   = useState(false);
  const [editTarget,  setEditTarget]  = useState(null);
  const [form,        setForm]        = useState({name:"",barcode:"",category:"",price:"",modal:""});
  const [search,      setSearch]      = useState("");
  const [catFilter,   setCatFilter]   = useState("Semua");
  const [confirmDel,  setConfirmDel]  = useState(null);
  const [editCats,    setEditCats]    = useState(false);
  const [catForm,     setCatForm]     = useState("");
  const [bulkMode,    setBulkMode]    = useState(false);
  const [bulkData,    setBulkData]    = useState([]);
  const [showImport,  setShowImport]  = useState(false);
  const [importText,  setImportText]  = useState("");
  const [importError, setImportError] = useState("");
  const [saving,      setSaving]      = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkAddRows, setBulkAddRows] = useState([]);
  // prodOrder local -- init dari prodOrderRoot (App root) agar sudah terisi saat buka
  const [prodOrder,   setProdOrder]   = useState(prodOrderRoot||null);
  const [sortProd,    setSortProd]    = useState("default");
  const dragProdIdx  = useRef(null);
  const [draggingProd, setDraggingProd] = useState(null);
  const [dragOverProd, setDragOverProd] = useState(null); // index target drop
  const saveOrderTimer = useRef(null);

  // Load urutan produk dari Supabase + realtime
  useEffect(()=>{
    dbProductOrder.getOrder().then(ord=>{
      if(ord && ord.length>0){
        const mapped = ord.map(x=>x.productId||x);
        setProdOrder(mapped);
        if(setProdOrderRoot) setProdOrderRoot(mapped);
      }
    }).catch(()=>{});
    // Realtime listener product_order
    const ch = supabase.channel('product-order-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'product_order'},()=>{
        dbProductOrder.getOrder().then(ord=>{
          if(ord && ord.length>0){
            const mapped = ord.map(x=>x.productId||x);
            setProdOrder(mapped);
            if(setProdOrderRoot) setProdOrderRoot(mapped);
          }
        }).catch(()=>{});
      }).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  // Simpan urutan ke Supabase (debounced 800ms)
  const saveProdOrder = (newOrder) => {
    setProdOrder(newOrder);
    if(setProdOrderRoot) setProdOrderRoot(newOrder); // sync ke App root langsung
    if(saveOrderTimer.current) clearTimeout(saveOrderTimer.current);
    saveOrderTimer.current = setTimeout(()=>{
      dbProductOrder.saveOrder(newOrder).catch(e=>console.warn('saveProdOrder:',e));
    }, 800);
  };

  const allCats    = ["Semua",...Array.from(new Set(products.map(p=>p.category)))];
  const uniqueCats = Array.from(new Set(products.map(p=>p.category)));

  // Urutan produk: jika ada prodOrder, pakai itu; sisanya append di belakang
  const orderedProducts = prodOrder
    ? [...prodOrder.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean),
       ...products.filter(p=>!prodOrder.map(String).includes(String(p.id)))]
    : products;
  const fpBase = orderedProducts.filter(p=>(catFilter==="Semua"||p.category===catFilter)&&(p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)));
  const fp = sortProd==="default" ? fpBase : [...fpBase].sort((a,b)=>{
    if(sortProd==="nama")      return a.name.localeCompare(b.name);
    if(sortProd==="kat")       return a.category.localeCompare(b.category);
    if(sortProd==="harga_asc") return a.price-b.price;
    if(sortProd==="harga_dsc") return b.price-a.price;
    return 0;
  });

  const openAdd  = ()=>{ setEditTarget(null); setForm({name:"",barcode:"",category:"",price:"",modal:""}); setShowModal(true); };
  const openEdit = p=>{ setEditTarget(p); setForm({name:p.name,barcode:p.barcode||"",category:p.category,price:String(p.price),modal:String(p.modal)}); setShowModal(true); };

  const save = async ()=>{
    if(!form.name.trim())    return notify("Isi nama produk!","err");
    if(!form.price)          return notify("Isi harga jual!","err");
    if(!form.category.trim())return notify("Isi kategori!","err");
    if(editTarget){
      const updated={name:form.name.trim(),barcode:form.barcode.trim(),category:form.category.trim(),price:+form.price,modal:+form.modal||0};
      try{ await db.updateProduct(editTarget.id,updated); setProducts(prev=>prev.map(p=>p.id===editTarget.id?{...p,...updated}:p)); notify("Produk diperbarui ✓","ok"); }
      catch{ notify("Gagal simpan!","err"); return; }
    } else {
      const newProd={name:form.name.trim(),barcode:form.barcode.trim(),category:form.category.trim(),price:+form.price,modal:+form.modal||0};
      try{
        const saved=await db.addProduct(newProd);
        setProducts(prev=>[...prev,saved]);
        setStocks(prev=>{ const s={...prev}; Object.keys(s).forEach(oid=>{s[oid]={...s[oid],[saved.id]:0};}); return s; });
        notify("Produk ditambahkan ✓","ok");
      } catch{ notify("Gagal tambah!","err"); return; }
    }
    setShowModal(false);
  };

  const del = async id=>{
    try{ await db.deleteProduct(id); setProducts(prev=>prev.filter(p=>p.id!==id)); setStocks(prev=>{ const s={...prev}; Object.keys(s).forEach(oid=>{const o={...s[oid]};delete o[id];s[oid]=o;}); return s; }); setConfirmDel(null); notify("Produk dihapus","warn"); }
    catch{ notify("Gagal hapus!","err"); }
  };

  const renameCategory = async (oldCat,newCat)=>{
    if(!newCat.trim()||newCat===oldCat) return;
    try{ await Promise.all(products.filter(p=>p.category===oldCat).map(p=>db.updateProduct(p.id,{...p,category:newCat.trim()}))); setProducts(prev=>prev.map(p=>p.category===oldCat?{...p,category:newCat.trim()}:p)); notify("Kategori diperbarui","ok"); }
    catch{ notify("Gagal update kategori!","err"); }
  };

  // -- EXPORT MASSAL ----------------------------------------------------------
  const exportCSV = () => {
    const rows=[["Nama Produk","Barcode","Kategori","Harga Modal","Harga Jual"]];
    products.forEach(p=>rows.push([p.name, p.barcode||"", p.category, p.modal, p.price]));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`produk-ammar-cell.csv`; a.click();
    notify(`Export ${products.length} produk berhasil!`,"ok");
  };

  // -- EDIT MASSAL ------------------------------------------------------------
  const startBulkEdit = () => { setBulkData(fp.map(p=>({...p}))); setBulkMode(true); };
  const updateBulkRow = (id, field, val) => setBulkData(prev=>prev.map(p=>p.id===id?{...p,[field]:val}:p));
  const saveBulkEdit = async () => {
    setSaving(true);
    try{
      await Promise.all(bulkData.map(p=>db.updateProduct(p.id,{name:p.name,barcode:p.barcode||"",category:p.category,price:+p.price||0,modal:+p.modal||0})));
      setProducts(prev=>prev.map(p=>{ const b=bulkData.find(x=>x.id===p.id); return b?{...p,...b,price:+b.price||0,modal:+b.modal||0}:p; }));
      setBulkMode(false); notify(`${bulkData.length} produk disimpan ✓`,"ok");
    } catch{ notify("Gagal simpan massal!","err"); }
    setSaving(false);
  };

  // -- IMPORT MASSAL CSV ------------------------------------------------------
  const handleImportFile = e => {
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>setImportText(ev.target.result);
    reader.readAsText(file,"UTF-8");
    e.target.value="";
  };

  const doImport = async () => {
    setImportError("");
    if(!importText.trim()) return setImportError("File kosong atau belum dipilih!");
    try{
      const lines=importText.trim().split(/\r?\n/).filter(l=>l.trim());
      const startIdx=lines[0].toLowerCase().replace(/"/g,"").includes("nama")?1:0;
      const newProds=[];
      for(let i=startIdx;i<lines.length;i++){
        const cols=lines[i].split(",").map(c=>c.trim().replace(/^"|"$/g,""));
        if(cols.length<3) continue;
        const [name,barcode,category,modal,price] = cols.length>=5
          ? [cols[0],cols[1],cols[2],cols[3],cols[4]]
          : [cols[0],"",cols[1],cols[2],cols[3]];
        if(!name||!category) continue;
        newProds.push({name:name.trim(),barcode:barcode?.trim()||"",category:category.trim(),modal:+modal||0,price:+price||0});
      }
      if(newProds.length===0) return setImportError("Tidak ada data valid. Pastikan format CSV: Nama,Barcode,Kategori,Modal,Jual");
      setSaving(true);
      const saved=await Promise.all(newProds.map(p=>db.addProduct(p)));
      setProducts(prev=>[...prev,...saved]);
      setStocks(prev=>{ const s={...prev}; saved.forEach(p=>{Object.keys(s).forEach(oid=>{s[oid]={...s[oid],[p.id]:0};});}); return s; });
      notify(`${saved.length} produk berhasil diimport!`,"ok");
      setShowImport(false); setImportText(""); setSaving(false);
    } catch(e){ setImportError("Error: "+e.message); setSaving(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(13,148,136,.3)"}}>
        <div style={{padding:"0 18px",minHeight:50,display:"flex",alignItems:"center",gap:8}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Menu</button>
          <div style={{fontWeight:900,fontSize:15,color:"#fff",flex:1}}>📦 Produk & Stok</div>
        </div>
        {/* Outlet selector -- hanya tab stok */}
        {["opname","masuk","keluar","transfer","aktif","log"].includes(mainTab)&&(
          <div style={{background:"rgba(0,0,0,.1)",padding:"5px 18px",display:"flex",gap:7,overflowX:"auto"}}>
            <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.7)",flexShrink:0,paddingTop:3}}>Outlet:</span>
            {(outlets||[]).map(o=>(
              <button key={o.id} onClick={()=>setSelOutlet(o.id)}
                style={{padding:"3px 12px",borderRadius:20,border:`2px solid ${selOutlet===o.id?"#fff":"rgba(255,255,255,.3)"}`,background:selOutlet===o.id?"rgba(255,255,255,.25)":"transparent",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0,whiteSpace:"nowrap"}}>
                {o.nama}
              </button>
            ))}
          </div>
        )}
        {/* Tabs */}
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.1)",overflowX:"auto"}}>
          {[{k:"produk",l:"🛍️ Produk"},{k:"opname",l:"📋 Opname"},{k:"masuk",l:"⬇ Masuk"},{k:"keluar",l:"⬆ Keluar"},{k:"transfer",l:"⇄ Transfer"},{k:"aktif",l:"☑ Aktif"},{k:"log",l:"📜 Log"}].map(t=>(
            <button key={t.k} onClick={()=>setMainTab(t.k)}
              style={{padding:"9px 14px",border:"none",borderBottom:`3px solid ${mainTab===t.k?"#fff":"transparent"}`,background:"transparent",color:mainTab===t.k?"#fff":"rgba(255,255,255,.5)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* -- BULK EDIT TABLE -- */}
      {bulkMode&&(
        <div style={{padding:"14px 18px",maxWidth:1000,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:14,color:"#0d9488"}}>📝 Edit Massal -- {bulkData.length} produk</div>
            <div style={{display:"flex",gap:7}}>
              <button onClick={()=>setBulkMode(false)} style={{background:"#f0f0f0",border:"none",borderRadius:9,padding:"7px 14px",fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
              <button onClick={saveBulkEdit} disabled={saving} style={{background:saving?"#ccc":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:"7px 16px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                {saving?"⏳ Menyimpan...":"💾 Simpan Semua"}
              </button>
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#e0faf5"}}>
                {["#","Nama Produk","Barcode","Kategori","Harga Modal","Harga Jual"].map(h=>(
                  <th key={h} style={{padding:"9px 10px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {bulkData.map((p,i)=>(
                  <tr key={p.id} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                    <td style={{padding:"5px 10px",color:"#ccc",fontSize:11,width:30}}>{i+1}</td>
                    {[{f:"name",w:200,t:"text"},{f:"barcode",w:110,t:"text"},{f:"category",w:110,t:"text"},{f:"modal",w:90,t:"number"},{f:"price",w:90,t:"number"}].map(({f,w,t})=>(
                      <td key={f} style={{padding:"4px 6px"}}>
                        <input type={t} value={p[f]||""} onChange={e=>updateBulkRow(p.id,f,e.target.value)}
                          style={{width:w,padding:"5px 8px",borderRadius:7,border:"1px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{fontSize:11,color:"#aaa",marginTop:6}}>* Edit langsung di tabel, lalu klik "Simpan Semua" untuk menyimpan ke database</div>
        </div>
      )}

      {/* -- IMPORT MODAL -- */}
      {showImport&&(
        <Modal onClose={()=>setShowImport(false)} title="📥 Import Produk dari CSV">
          <div style={{background:"#f0faf8",borderRadius:9,padding:"10px 13px",marginBottom:12,fontSize:12}}>
            <div style={{fontWeight:700,color:"#0d9488",marginBottom:4}}>Format CSV yang diterima:</div>
            <code style={{fontSize:11,color:"#555",display:"block",lineHeight:1.8}}>
              Nama Produk, Barcode, Kategori, Harga Modal, Harga Jual<br/>
              VC ISAT 6GB, 8991101152, INDOSAT, 9295, 11000<br/>
              Kabel Data, , AKSESORIS, 15000, 25000
            </code>
            <div style={{fontSize:10,color:"#aaa",marginTop:4}}>* Baris pertama (header) boleh ada atau tidak . Barcode boleh kosong</div>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#444",marginBottom:5,display:"block"}}>Upload File CSV / TXT</label>
            <input type="file" accept=".csv,.txt" onChange={handleImportFile}
              style={{width:"100%",padding:"8px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,fontFamily:"inherit",cursor:"pointer"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#444",marginBottom:5,display:"block"}}>Atau Paste Data CSV di sini</label>
            <textarea value={importText} onChange={e=>setImportText(e.target.value)}
              placeholder={"Nama Produk,Barcode,Kategori,Modal,Jual\nVC TRI 10GB,,TRI,12400,14500"}
              style={{width:"100%",padding:"9px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,minHeight:120,resize:"vertical",outline:"none",fontFamily:"monospace"}}/>
          </div>
          {importError&&<div style={{background:"#fff0f0",border:"1px solid #ffd6d6",borderRadius:8,padding:"8px 11px",fontSize:12,color:"#ff4757",fontWeight:700,marginBottom:10}}>⚠ {importError}</div>}
          {importText&&!importError&&(
            <div style={{background:"#e0faf5",borderRadius:8,padding:"7px 11px",fontSize:11,color:"#0d9488",fontWeight:700,marginBottom:10}}>
              ✓ {importText.trim().split(/\r?\n/).filter(l=>l.trim()).length} baris terdeteksi
            </div>
          )}
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowImport(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:11,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
            <button onClick={doImport} disabled={saving||!importText.trim()} style={{flex:2,background:saving||!importText.trim()?"#ccc":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {saving?"⏳ Mengimport...":"📥 Import Sekarang"}
            </button>
          </div>
        </Modal>
      )}

      {/* -- NORMAL VIEW (Produk tab) -- */}
      {!bulkMode&&mainTab==="produk"&&(
      <div style={{padding:"14px 18px",maxWidth:920,margin:"0 auto"}}>

        {/* Edit Kategori Panel */}
        {editCats&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"14px 16px",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>✏️ Edit Kategori</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8}}>
              {uniqueCats.map(cat=>(
                <CategoryEditRow key={cat} cat={cat} onSave={renameCategory}/>
              ))}
            </div>
          </div>
        )}

        {/* -- Stats -- */}
        <div style={{display:"flex",gap:9,marginBottom:10}}>
          {[
            {l:"Total Produk", v:products.length,   c:"#0d9488", bg:"#e0faf5"},
            {l:"Kategori",     v:uniqueCats.length,  c:"#8e44ad", bg:"#f5f0ff"},
            {l:"Harga Modal Total", v:fmtRp(fp.reduce((s,p)=>s+(p.modal||0),0)), c:"#2980b9", bg:"#e8f4fd"},
          ].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:11,padding:"10px 16px",border:`2px solid ${s.c}20`,flex:1,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,fontWeight:700,color:s.c,opacity:.8,marginTop:1}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* -- Search + Category Filter -- */}
        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:1,minWidth:200}}>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Search()}</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / barcode..."
              style={{width:"100%",padding:"7px 10px 7px 27px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {allCats.map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)} style={{padding:"4px 11px",borderRadius:20,border:"2px solid",borderColor:catFilter===c?"#0d9488":"#b2ede6",background:catFilter===c?"#0d9488":"#fff",color:catFilter===c?"#fff":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{c}</button>
            ))}
          </div>
        </div>

        {/* -- Action Toolbar -- */}
        <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap",alignItems:"center",background:"#fff",borderRadius:13,padding:"10px 14px",border:"2px solid #e0f5f1",boxShadow:"0 1px 6px rgba(13,148,136,.06)"}}>
          <button onClick={openAdd}
            style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:"7px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px rgba(13,148,136,.3)"}}>
            {Ic.PlusCirc(15)} + Tambah Produk
          </button>
          <button onClick={()=>setShowBulkAdd(true)}
            style={{background:"linear-gradient(135deg,#27ae60,#2ecc71)",border:"none",borderRadius:9,padding:"7px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            📋 Tambah Massal
          </button>
          <div style={{width:1,height:28,background:"#e0f5f1",margin:"0 2px"}}/>
          <button onClick={()=>setEditCats(p=>!p)}
            style={{background:editCats?"#e0faf5":"#f8fffe",border:`2px solid ${editCats?"#0d9488":"#e0f5f1"}`,borderRadius:9,padding:"6px 13px",color:"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            {Ic.Edit(13)} Kategori
          </button>
          <button onClick={startBulkEdit}
            style={{background:"#f8fffe",border:"2px solid #e0f5f1",borderRadius:9,padding:"6px 13px",color:"#555",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            📝 Edit Massal
          </button>
          <button onClick={()=>{setShowImport(true);setImportText("");setImportError("");}}
            style={{background:"#f8fffe",border:"2px solid #e0f5f1",borderRadius:9,padding:"6px 13px",color:"#555",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            📥 Import CSV
          </button>
          <button onClick={exportCSV}
            style={{background:"#f8fffe",border:"2px solid #e0f5f1",borderRadius:9,padding:"6px 13px",color:"#555",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            📤 Export
          </button>
        </div>

        {/* Sort & drag info */}
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <span style={{fontSize:11,fontWeight:700,color:"#555"}}>Urutkan:</span>
          {[{k:"default",l:"Default"},{k:"nama",l:"A-Z Nama"},{k:"kat",l:"Kategori"},{k:"harga_asc",l:"Harga ↑"},{k:"harga_dsc",l:"Harga ↓"}].map(s=>(
            <button key={s.k} onClick={()=>setSortProd(s.k)}
              style={{padding:"4px 11px",borderRadius:20,border:`2px solid ${sortProd===s.k?"#0d9488":"#b2ede6"}`,background:sortProd===s.k?"#0d9488":"#fff",color:sortProd===s.k?"#fff":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              {s.l}
            </button>
          ))}
          <span style={{fontSize:10,color:"#aaa",marginLeft:8}}>⠿ Drag untuk atur urutan kustom</span>
        </div>

        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#e0faf5"}}>
              {["#","","Nama","Barcode","Kategori","Harga Modal","Harga Jual","Aksi"].map(h=>(
                <th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {fp.map((p,i)=>{
                const isDragging = draggingProd===i;
                const isOver = dragOverProd===i && draggingProd!==null && draggingProd!==i;
                return (
                <tr key={p.id}
                  draggable
                  onDragStart={(e)=>{
                    dragProdIdx.current=i;
                    setDraggingProd(i);
                    setDragOverProd(null);
                    e.dataTransfer.effectAllowed="move";
                  }}
                  onDragOver={(e)=>{
                    e.preventDefault();
                    e.dataTransfer.dropEffect="move";
                    if(dragProdIdx.current===null||dragProdIdx.current===i) return;
                    setDragOverProd(i);
                  }}
                  onDragEnter={(e)=>{
                    e.preventDefault();
                    if(dragProdIdx.current===null||dragProdIdx.current===i) return;
                    setDragOverProd(i);
                  }}
                  onDragLeave={()=>{ setDragOverProd(null); }}
                  onDrop={(e)=>{
                    e.preventDefault();
                    if(dragProdIdx.current===null||dragProdIdx.current===i) {
                      setDragOverProd(null); return;
                    }
                    const next=[...fp];
                    const [moved]=next.splice(dragProdIdx.current,1);
                    // Determine insert position: above or below based on mouse Y
                    const rect=e.currentTarget.getBoundingClientRect();
                    const midY=rect.top+rect.height/2;
                    const insertAt = e.clientY < midY ? i : i+1;
                    // Adjust insertAt for removed element
                    const adjInsert = dragProdIdx.current < insertAt ? insertAt-1 : insertAt;
                    next.splice(adjInsert,0,moved);
                    dragProdIdx.current=adjInsert;
                    setSortProd("default");
                    saveProdOrder(next.map(x=>String(x.id)));
                    setDragOverProd(null);
                  }}
                  onDragEnd={()=>{ dragProdIdx.current=null; setDraggingProd(null); setDragOverProd(null); }}
                  style={{
                    borderTop: isOver ? `3px solid #0d9488` : "1px solid #f0faf8",
                    borderBottom: isOver ? "none" : undefined,
                    background: isDragging?"#d0f5ee":isOver?"#e8fdf8":i%2===0?"#fff":"#fafffe",
                    cursor: isDragging?"grabbing":"grab",
                    opacity: isDragging?0.5:1,
                    boxShadow: isDragging?"0 6px 18px rgba(13,148,136,.25)":"none",
                    transform: isDragging?"scale(1.01)":"none",
                    transition:"background .08s,opacity .08s,transform .08s",
                  }}
                  onMouseEnter={e=>{ if(draggingProd===null) e.currentTarget.style.background="#f0fdfb"; }}
                  onMouseLeave={e=>{ if(draggingProd===null) e.currentTarget.style.background=i%2===0?"#fff":"#fafffe"; }}>
                  <td style={{padding:"9px 12px",color:"#ccc",fontWeight:600}}>{i+1}</td>
                  <td style={{padding:"9px 6px",color:isDragging?"#0d9488":"#b2ede6",fontSize:18,cursor:isDragging?"grabbing":"grab",userSelect:"none",textAlign:"center",transition:"color .15s"}} title="Drag untuk atur urutan">⠿</td>
                  <td style={{padding:"9px 12px",fontWeight:800}}>{p.name}</td>
                  <td style={{padding:"9px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{p.barcode||"--"}</td>
                  <td style={{padding:"9px 12px"}}><span style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"2px 8px",borderRadius:6}}>{p.category}</span></td>
                  <td style={{padding:"9px 12px",color:"#888"}}>{fmtRp(p.modal)}</td>
                  <td style={{padding:"9px 12px",fontWeight:800,color:"#0d9488"}}>{fmtRp(p.price)}</td>
                  <td style={{padding:"9px 12px"}}>
                    <div style={{display:"flex",gap:5}}>
                      <button onClick={()=>openEdit(p)} style={{background:"#e0faf5",border:"none",borderRadius:7,padding:"5px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}>{Ic.Edit()} Edit</button>
                      <button onClick={()=>setConfirmDel(p)} style={{background:"#fff0f0",border:"none",borderRadius:7,padding:"5px 10px",color:"#ff4757",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{Ic.Trash()} Hapus</button>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          {fp.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:30,fontSize:13}}>Tidak ada produk</div>}
        </div>
      </div>
      )}{/* end !bulkMode */}

      {showModal&&(
        <Modal onClose={()=>setShowModal(false)} title={editTarget?"✏️ Edit Produk":"➕ Tambah Produk"}>
          <Field label="Nama Produk *" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="Nama produk..."/>
          <Field label="Barcode" value={form.barcode} onChange={e=>setForm(p=>({...p,barcode:e.target.value}))} placeholder="Scan/ketik barcode (opsional)"/>
          <div style={{marginBottom:10}}>
            <label style={{...lbl}}>Kategori *</label>
            <input value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} placeholder="Ketik atau pilih..." style={{...inp,marginBottom:6}}/>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {uniqueCats.map(c=>(
                <button key={c} onClick={()=>setForm(p=>({...p,category:c}))} style={{padding:"2px 9px",borderRadius:20,border:"2px solid",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",borderColor:form.category===c?"#0d9488":"#b2ede6",background:form.category===c?"#0d9488":"#f0fdfb",color:form.category===c?"#fff":"#0d9488"}}>{c}</button>
              ))}
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div><label style={{...lbl}}>Harga Modal</label><input type="number" value={form.modal} onChange={e=>setForm(p=>({...p,modal:e.target.value}))} placeholder="0" style={inp}/></div>
            <div><label style={{...lbl}}>Harga Jual *</label><input type="number" value={form.price} onChange={e=>setForm(p=>({...p,price:e.target.value}))} placeholder="0" style={{...inp,border:"2px solid #0d9488",fontWeight:700}}/></div>
          </div>
          {form.price&&form.modal&&+form.modal>0&&(
            <div style={{background:"#e0faf5",borderRadius:9,padding:"7px 12px",marginBottom:10,display:"flex",justifyContent:"space-between",fontSize:12}}>
              <span style={{color:"#555",fontWeight:700}}>Margin</span>
              <span style={{fontWeight:900,color:"#0d9488"}}>{fmtRp(+form.price-+form.modal)} <span style={{fontSize:10,color:"#888"}}>({Math.round(((+form.price-+form.modal)/+form.modal)*100)}%)</span></span>
            </div>
          )}
          <div style={{display:"flex",gap:8,marginTop:4}}>
            <button onClick={()=>setShowModal(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:11,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
            <button onClick={save} style={{flex:2,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>{editTarget?"💾 Simpan":"✓ Tambah"}</button>
          </div>
        </Modal>
      )}
      {confirmDel&&<ConfirmModal msg={`Hapus produk "${confirmDel.name}"?`} onConfirm={()=>del(confirmDel.id)} onCancel={()=>setConfirmDel(null)}/>}

      {/* -- MODAL TAMBAH MASSAL -- */}
      {showBulkAdd&&(()=>{
        const emptyRow = ()=>({_id:uid(),name:"",barcode:"",category:"",modal:"",price:""});
        if(bulkAddRows.length===0) setBulkAddRows([emptyRow(),emptyRow(),emptyRow(),emptyRow(),emptyRow()]);
        const updateRow = (idx,field,val) => setBulkAddRows(prev=>prev.map((r,i)=>i===idx?{...r,[field]:val}:r));
        const addRow    = () => setBulkAddRows(prev=>[...prev,emptyRow()]);
        const delRow    = idx => setBulkAddRows(prev=>prev.filter((_,i)=>i!==idx));
        const saveBulkAdd = async () => {
          const valid = bulkAddRows.filter(r=>r.name.trim()&&r.price);
          if(!valid.length) return notify("Isi minimal 1 baris dengan Nama & Harga Jual!","err");
          setSaving(true);
          try {
            for(const r of valid){
              const np={name:r.name.trim(),barcode:r.barcode.trim(),category:r.category.trim()||"Umum",modal:+r.modal||0,price:+r.price||0};
              const saved = await db.addProduct(np).catch(()=>null);
              if(saved) setProducts(prev=>[...prev,saved]);
            }
            notify(`${valid.length} produk berhasil ditambahkan ✓`,"ok");
            setShowBulkAdd(false); setBulkAddRows([]);
          } catch(e){ notify("Gagal simpan: "+e.message,"err"); }
          setSaving(false);
        };
        const allCatsOpt = ["Umum",...uniqueCats.filter(c=>c!=="Semua"&&c!=="Umum")];
        const filled = bulkAddRows.filter(r=>r.name.trim()).length;
        return (
          <Modal title="📋 Tambah Produk Massal" onClose={()=>{setShowBulkAdd(false);setBulkAddRows([]);}}>
            <div style={{marginBottom:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{fontSize:11,color:"#555",fontWeight:600,flex:1}}>
                Isi nama & harga jual. Kolom lain opsional. Baris kosong dilewati.
              </div>
              <span style={{fontSize:11,background:"#e0faf5",color:"#0d9488",fontWeight:700,padding:"3px 10px",borderRadius:20}}>{filled} baris diisi</span>
              <button onClick={addRow} style={{padding:"5px 12px",borderRadius:8,border:"2px solid #0d9488",background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>+ Tambah Baris</button>
            </div>
            <div style={{overflowX:"auto",maxHeight:420,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#e0faf5",position:"sticky",top:0}}>
                    {["#","Nama Produk *","Barcode","Kategori","Harga Modal","Harga Jual *",""].map(h=>(
                      <th key={h} style={{padding:"7px 8px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkAddRows.map((row,i)=>{
                    const hasName = row.name.trim().length>0;
                    const hasPrice = row.price;
                    return (
                      <tr key={row._id} style={{background:hasName?"#f0fdfb":i%2===0?"#fff":"#fafffe",borderTop:"1px solid #f0faf8"}}>
                        <td style={{padding:"4px 6px",color:"#aaa",fontSize:11,width:24}}>{i+1}</td>
                        <td style={{padding:"4px 5px"}}>
                          <input value={row.name} onChange={e=>updateRow(i,"name",e.target.value)}
                            placeholder="Nama produk..."
                            style={{width:"100%",minWidth:160,padding:"5px 8px",borderRadius:7,border:`2px solid ${hasName?"#0d9488":"#b2ede6"}`,fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                        </td>
                        <td style={{padding:"4px 5px"}}>
                          <input value={row.barcode} onChange={e=>updateRow(i,"barcode",e.target.value)}
                            placeholder="--"
                            style={{width:90,padding:"5px 8px",borderRadius:7,border:"1px solid #b2ede6",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                        </td>
                        <td style={{padding:"4px 5px"}}>
                          <input list={`cats-${i}`} value={row.category} onChange={e=>updateRow(i,"category",e.target.value)}
                            placeholder="Kategori"
                            style={{width:100,padding:"5px 8px",borderRadius:7,border:"1px solid #b2ede6",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                          <datalist id={`cats-${i}`}>{allCatsOpt.map(c=><option key={c} value={c}/>)}</datalist>
                        </td>
                        <td style={{padding:"4px 5px"}}>
                          <input type="number" value={row.modal} onChange={e=>updateRow(i,"modal",e.target.value)}
                            placeholder="0"
                            style={{width:80,padding:"5px 8px",borderRadius:7,border:"1px solid #b2ede6",fontSize:12,textAlign:"right",outline:"none",fontFamily:"inherit"}}/>
                        </td>
                        <td style={{padding:"4px 5px"}}>
                          <input type="number" value={row.price} onChange={e=>updateRow(i,"price",e.target.value)}
                            placeholder="0"
                            style={{width:80,padding:"5px 8px",borderRadius:7,border:`2px solid ${hasPrice?"#0d9488":"#b2ede6"}`,fontSize:12,fontWeight:700,textAlign:"right",outline:"none",fontFamily:"inherit"}}/>
                        </td>
                        <td style={{padding:"4px 5px"}}>
                          <button onClick={()=>delRow(i)} style={{background:"none",border:"none",color:"#fca5a5",cursor:"pointer",fontSize:14,padding:"2px 4px"}}
                            onMouseEnter={e=>e.currentTarget.style.color="#dc2626"} onMouseLeave={e=>e.currentTarget.style.color="#fca5a5"}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{marginTop:12,display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>{setShowBulkAdd(false);setBulkAddRows([]);}}
                style={{padding:"8px 18px",borderRadius:9,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
              <button onClick={saveBulkAdd} disabled={saving||filled===0}
                style={{padding:"8px 22px",borderRadius:9,border:"none",
                  background:saving||filled===0?"#ccc":"linear-gradient(135deg,#27ae60,#2ecc71)",
                  color:"#fff",fontWeight:800,fontSize:13,cursor:filled>0?"pointer":"default",fontFamily:"inherit"}}>
                {saving?"⏳ Menyimpan...":filled>0?`💾 Simpan ${filled} Produk`:"💾 Simpan"}
              </button>
            </div>
          </Modal>
        );
      })()}

      {/* -- STOK TABS (Opname/Masuk/Keluar/Transfer/Log) -- */}
      {["opname","masuk","keluar","transfer","log"].includes(mainTab)&&(
        <StokPageInner
          tab={mainTab}
          products={products} outlets={outlets}
          stocks={stocks} setStocks={setStocks}
          selectedOutlet={selOutlet} notify={notify}
          prodOrder={prodOrder}
        />
      )}

      {/* -- TAB AKTIF -- */}
      {mainTab==="aktif"&&(
        <StokAktifTab
          products={products} outlets={outlets}
          selectedOutlet={selOutlet}
          aktifProds={aktifProds}
          setAktifProds={(updater)=>{
            setAktifProds(updater);
            if(setAktifProdsRoot) setAktifProdsRoot(updater);
          }}
          notify={notify}
        />
      )}
    </div>
  );
}

// -- LogRow: edit & hapus per baris log stok ----------------------------------
const LOG_TYPE_COLOR = {masuk:"#27ae60", keluar:"#e74c3c", transfer:"#2980b9"};
const LOG_TYPE_ICON  = {masuk:"⬇ Masuk", keluar:"⬆ Keluar", transfer:"⇄ Transfer"};

function LogRow({ l, i, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [qty,     setQty]     = useState(String(l.qty));
  const [note,    setNote]    = useState(l.note||"");
  const tc = LOG_TYPE_COLOR[l.type];

  const save = () => {
    if (!qty || +qty <= 0) return;
    onEdit({ qty: +qty, note });
    setEditing(false);
  };

  const cellStyle = {padding:"7px 11px"};

  if (editing) return (
    <tr style={{borderTop:"1px solid #f0faf8", background:"#f0fdfb"}}>
      <td style={cellStyle}><span style={{fontSize:11,color:"#aaa"}}>{l.time}</span></td>
      <td style={cellStyle}><span style={{background:`${tc}18`,color:tc,fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>{LOG_TYPE_ICON[l.type]}</span></td>
      <td style={cellStyle}><span style={{fontWeight:700,fontSize:11}}>{l.outletNama}</span></td>
      <td style={cellStyle}><span style={{fontWeight:700}}>{l.productName}</span></td>
      <td style={cellStyle}>
        <input type="number" value={qty} onChange={e=>setQty(e.target.value)}
          style={{width:60,padding:"3px 6px",borderRadius:6,border:"2px solid #0d9488",fontWeight:700,fontSize:12,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
      </td>
      <td style={cellStyle}>
        <input value={note} onChange={e=>setNote(e.target.value)} placeholder="catatan..."
          style={{width:"100%",padding:"3px 7px",borderRadius:6,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
      </td>
      <td style={cellStyle}>
        <div style={{display:"flex",gap:4}}>
          <button onClick={save} style={{background:"#0d9488",border:"none",borderRadius:6,padding:"4px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✓ Simpan</button>
          <button onClick={()=>setEditing(false)} style={{background:"#f0f0f0",border:"none",borderRadius:6,padding:"4px 9px",color:"#666",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✗</button>
        </div>
      </td>
    </tr>
  );

  return (
    <tr style={{borderTop:"1px solid #f0faf8", background:i%2===0?"#fff":"#fafffe"}}>
      <td style={{...cellStyle,color:"#aaa",fontSize:11}}>{l.time}</td>
      <td style={cellStyle}><span style={{background:`${tc}18`,color:tc,fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>{LOG_TYPE_ICON[l.type]}</span></td>
      <td style={{...cellStyle,fontWeight:700,fontSize:11}}>{l.outletNama}</td>
      <td style={{...cellStyle,fontWeight:700}}>{l.productName}</td>
      <td style={{...cellStyle,fontWeight:900,color:tc}}>{l.type==="masuk"?"+":"-"}{l.qty}</td>
      <td style={{...cellStyle,color:"#888",fontStyle:"italic"}}>{l.note||"--"}</td>
      <td style={cellStyle}>
        <div style={{display:"flex",gap:5}}>
          <button onClick={()=>setEditing(true)} style={{background:"#e0faf5",border:"none",borderRadius:6,padding:"4px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>{Ic.Edit(11)} Edit</button>
          <button onClick={onDelete} style={{background:"#fff0f0",border:"none",borderRadius:6,padding:"4px 9px",color:"#ff4757",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{Ic.Trash(11)}</button>
        </div>
      </td>
    </tr>
  );
}

// ==============================================================================
// STOK (per outlet, stok masuk/keluar/transfer)
// ==============================================================================
function StokPage({ products, outlets, stocks, setStocks, onBack, notify, _initTab, _initOutlet, _prodOrder }) {
  const [selectedOutlet, setSelectedOutlet] = useState(_initOutlet||outlets[0]?.id||"");
  const [tab,            setTab]            = useState(_initTab||"opname");
  const [search,         setSearch]         = useState("");
  const [log,            setLog]            = useState([]);
  const [form,           setForm]           = useState({productId:"",qty:"",note:""});
  const [transferTo,     setTransferTo]     = useState("");
  const [realStocks,     setRealStocks]     = useState({});
  // Bulk state
  const [bulkMode,       setBulkMode]       = useState(false);
  const [bulkType,       setBulkType]       = useState("masuk"); // masuk|keluar|transfer
  const [bulkRows,       setBulkRows]       = useState([]);
  const [bulkTransferTo, setBulkTransferTo] = useState("");
  const [bulkSaving,     setBulkSaving]     = useState(false);
  const [sortField,      setSortField]      = useState("habis"); // default habis dulu
  const [stokAdminOrder, setStokAdminOrder] = useState(null);
  const dragStokAdminIdx = useRef(null);
  const [draggingStokAdmin, setDraggingStokAdmin] = useState(null);
  const [dragOverStokAdmin, setDragOverStokAdmin] = useState(null);

  const outletStock = stocks[selectedOutlet]||{};
  const outlet      = outlets.find(o=>o.id===selectedOutlet);

  // Load stock_logs dari Supabase
  useEffect(()=>{
    db.getStockLogs().then(rows=>{
      const mapped = (rows||[]).map(r=>({
        id:r.id, time:r.time||r.created_at?.substring(11,16)||"",
        type:r.type, outletNama:r.outlet_nama||r.outletNama||"",
        productName:r.product_name||r.productName||"",
        qty:r.qty||0, note:r.note||"",
      }));
      setLog(mapped);
    }).catch(()=>{});

    // Realtime stock_logs
    const ch = supabase.channel("stock-logs-rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"stock_logs"},(p)=>{
        const r=p.new; if(!r) return;
        setLog(prev=>[{id:r.id,time:r.time||"",type:r.type,outletNama:r.outlet_nama||"",productName:r.product_name||"",qty:r.qty||0,note:r.note||""},...prev]);
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"stock_logs"},(p)=>{
        const id=p.old?.id; if(!id) return;
        setLog(prev=>prev.filter(x=>x.id!==id));
      })
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  const initReal = (oid)=>{
    const s={};
    Object.entries(stocks[oid]||{}).forEach(([pid,qty])=>{s[pid]=qty;});
    setRealStocks(s);
  };

  const addLog = (type,oid,pid,qty,note="")=>{
    const p=products.find(x=>x.id===+pid);
    const o=outlets.find(x=>x.id===oid);
    const logEntry={id:uid(),time:now(),type,outletNama:o?.nama,productName:p?.name,qty,note};
    setLog(prev=>[logEntry,...prev]);
    db.addStockLog(logEntry).catch(()=>{});
  };

  const doMasuk = ()=>{
    if(!form.productId||!form.qty||+form.qty<=0) return notify("Lengkapi form!","err");
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],[form.productId]:(prev[selectedOutlet]?.[form.productId]||0)+(+form.qty)}}));
    db.upsertStock(selectedOutlet,+form.productId,(stocks[selectedOutlet]?.[form.productId]||0)+(+form.qty)).catch(()=>{});
    addLog("masuk",selectedOutlet,form.productId,+form.qty,form.note);
    notify(`Stok masuk +${form.qty} berhasil`,"ok");
    setForm({productId:"",qty:"",note:""});
  };

  const doKeluar = ()=>{
    if(!form.productId||!form.qty||+form.qty<=0) return notify("Lengkapi form!","err");
    const cur=stocks[selectedOutlet]?.[form.productId]||0;
    if(+form.qty>cur) return notify("Stok tidak cukup!","err");
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],[form.productId]:cur-(+form.qty)}}));
    db.upsertStock(selectedOutlet,+form.productId,cur-(+form.qty)).catch(()=>{});
    addLog("keluar",selectedOutlet,form.productId,+form.qty,form.note);
    notify(`Stok keluar -${form.qty} berhasil`,"ok");
    setForm({productId:"",qty:"",note:""});
  };

  const doTransfer = ()=>{
    if(!form.productId||!form.qty||+form.qty<=0||!transferTo) return notify("Lengkapi semua!","err");
    const cur=stocks[selectedOutlet]?.[form.productId]||0;
    if(+form.qty>cur) return notify("Stok tidak cukup!","err");
    const newSrc=cur-(+form.qty);
    const newDst=(stocks[transferTo]?.[form.productId]||0)+(+form.qty);
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],[form.productId]:newSrc},[transferTo]:{...prev[transferTo],[form.productId]:newDst}}));
    db.upsertStock(selectedOutlet,+form.productId,newSrc).catch(()=>{});
    db.upsertStock(transferTo,+form.productId,newDst).catch(()=>{});
    const oTujuan=outlets.find(o=>o.id===transferTo)?.nama;
    addLog("transfer",selectedOutlet,form.productId,+form.qty,`→ ${oTujuan}`);
    notify(`Transfer berhasil → ${oTujuan}`,"ok");
    setForm({productId:"",qty:"",note:""});
  };

  const saveOpname = ()=>{
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],...realStocks}}));
    Object.entries(realStocks).forEach(([pid,qty])=>db.upsertStock(selectedOutlet,+pid,qty).catch(()=>{}));
    notify("Stok opname disimpan ✓","ok");
  };

  // -- BULK OPERATIONS --------------------------------------------------------
  const startBulk = (type) => {
    const baseList = (_prodOrder&&_prodOrder.length)
      ? [..._prodOrder.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean),
         ...products.filter(p=>!_prodOrder.map(String).includes(String(p.id)))]
      : products;
    setBulkType(type);
    setBulkRows(baseList.map(p=>({id:p.id, name:p.name, stokSaat:outletStock[p.id]??0, qty:"", note:""})));
    setBulkMode(true);
    setBulkTransferTo("");
  };

  const updateBulkRow = (id, field, val) => setBulkRows(prev=>prev.map(r=>r.id===id?{...r,[field]:val}:r));

  const saveBulk = async () => {
    const toProcess = bulkRows.filter(r=>r.qty&&+r.qty>0);
    if(toProcess.length===0) return notify("Isi minimal 1 qty!","err");
    if(bulkType==="transfer"&&!bulkTransferTo) return notify("Pilih outlet tujuan!","err");

    setBulkSaving(true);
    let successCount=0;
    const newStocks={...stocks};

    for(const row of toProcess){
      const cur = newStocks[selectedOutlet]?.[row.id]??0;
      const qty = +row.qty;

      if(bulkType==="masuk"){
        const newQty=cur+qty;
        if(!newStocks[selectedOutlet]) newStocks[selectedOutlet]={};
        newStocks[selectedOutlet]={...newStocks[selectedOutlet],[row.id]:newQty};
        await db.upsertStock(selectedOutlet,row.id,newQty).catch(()=>{});
        addLog("masuk",selectedOutlet,row.id,qty,row.note||"bulk masuk");
      } else if(bulkType==="keluar"){
        if(qty>cur){ notify(`Stok ${row.name} tidak cukup (${cur})!`,"warn"); continue; }
        const newQty=cur-qty;
        newStocks[selectedOutlet]={...newStocks[selectedOutlet],[row.id]:newQty};
        await db.upsertStock(selectedOutlet,row.id,newQty).catch(()=>{});
        addLog("keluar",selectedOutlet,row.id,qty,row.note||"bulk keluar");
      } else if(bulkType==="transfer"){
        if(qty>cur){ notify(`Stok ${row.name} tidak cukup (${cur})!`,"warn"); continue; }
        const newSrc=cur-qty;
        const newDst=(newStocks[bulkTransferTo]?.[row.id]??0)+qty;
        newStocks[selectedOutlet]={...newStocks[selectedOutlet],[row.id]:newSrc};
        if(!newStocks[bulkTransferTo]) newStocks[bulkTransferTo]={};
        newStocks[bulkTransferTo]={...newStocks[bulkTransferTo],[row.id]:newDst};
        await db.upsertStock(selectedOutlet,row.id,newSrc).catch(()=>{});
        await db.upsertStock(bulkTransferTo,row.id,newDst).catch(()=>{});
        const oTujuan=outlets.find(o=>o.id===bulkTransferTo)?.nama;
        addLog("transfer",selectedOutlet,row.id,qty,`→ ${oTujuan} (bulk)`);
      }
      successCount++;
    }

    setStocks(newStocks);
    setBulkSaving(false);
    setBulkMode(false);
    notify(`${successCount} produk berhasil diproses ✓`,"ok");
  };

  // Urutan: _prodOrder (global dari ProdukPage admin) override segalanya kecuali ada sort eksplisit
  const baseOrder = _prodOrder || stokAdminOrder;
  const filteredProdsBase = products
    .filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  const filteredProds = (() => {
    // Jika ada global/local order DAN tidak ada sort eksplisit → pakai order
    if(baseOrder && sortField==="habis") {
      return [
        ...baseOrder.map(id=>filteredProdsBase.find(p=>String(p.id)===String(id))).filter(Boolean),
        ...filteredProdsBase.filter(p=>!baseOrder.map(String).includes(String(p.id)))
      ];
    }
    // Sort eksplisit dipilih user
    const sorted = [...filteredProdsBase].sort((a,b)=>{
      const qa=outletStock[a.id]??0, qb=outletStock[b.id]??0;
      if(sortField==="nama")    return a.name.localeCompare(b.name);
      if(sortField==="kat")     return a.category.localeCompare(b.category);
      if(sortField==="stok_asc")return qa-qb;
      if(sortField==="stok_dsc")return qb-qa;
      if(sortField==="habis")   return (qa===0?-1:1)-(qb===0?-1:1);
      return a.name.localeCompare(b.name);
    });
    return sorted;
  })();
  const getStatus = s=>s===0?"habis":s<=2?"menipis":s>=20?"over":"aman";
  const ss={habis:{bg:"#ffe5e5",c:"#c0392b",l:"✗ Habis"},menipis:{bg:"#fff0f0",c:"#ff4757",l:"⚠ Menipis"},over:{bg:"#fffbe6",c:"#f39c12",l:"▲ Over"},aman:{bg:"#e8f8f4",c:"#0d9488",l:"✓ Aman"}};
  const typeColor={masuk:"#27ae60",keluar:"#e74c3c",transfer:"#2980b9"};
  const typeIcon={masuk:"⬇ Masuk",keluar:"⬆ Keluar",transfer:"⇄ Transfer"};

  // -- BULK TABLE VIEW --------------------------------------------------------
  if(bulkMode) return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title={`📦 ${bulkType==="masuk"?"Stok Masuk Massal":bulkType==="keluar"?"Stok Keluar Massal":"Transfer Massal"}`} onBack={()=>setBulkMode(false)}
        right={
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            {bulkType==="transfer"&&(
              <select value={bulkTransferTo} onChange={e=>setBulkTransferTo(e.target.value)}
                style={{padding:"6px 10px",borderRadius:9,border:"2px solid rgba(255,255,255,.4)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:700,fontSize:12,fontFamily:"inherit",outline:"none"}}>
                <option value="" style={{color:"#000"}}>-- Outlet Tujuan --</option>
                {outlets.filter(o=>o.id!==selectedOutlet).map(o=><option key={o.id} value={o.id} style={{color:"#000"}}>{o.nama}</option>)}
              </select>
            )}
            <button onClick={saveBulk} disabled={bulkSaving} style={{background:bulkSaving?"#ccc":"linear-gradient(135deg,#fff,#e0faf5)",border:"none",borderRadius:9,padding:"7px 16px",color:"#0d9488",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {bulkSaving?"⏳ Menyimpan...":"💾 Simpan Semua"}
            </button>
          </div>
        }
      />
      <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>
        <div style={{background:"#fff8e1",border:"2px solid #f39c12",borderRadius:10,padding:"10px 14px",marginBottom:12,fontSize:12,color:"#b7770d",fontWeight:600}}>
          💡 Outlet: <b>{outlet?.nama}</b> . Isi kolom QTY untuk produk yang mau diproses . Kosongkan untuk skip
        </div>
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#e0faf5"}}>
              {["#","Produk","Kategori","Stok Saat Ini","QTY","Catatan"].map(h=>(
                <th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bulkRows.map((row,i)=>(
                <tr key={row.id} style={{borderTop:"1px solid #f0faf8",background:row.qty&&+row.qty>0?(bulkType==="masuk"?"#f0fdf4":bulkType==="keluar"?"#fff5f5":"#eff6ff"):i%2===0?"#fff":"#fafffe"}}>
                  <td style={{padding:"7px 11px",color:"#ccc"}}>{i+1}</td>
                  <td style={{padding:"7px 11px",fontWeight:700}}>{row.name}</td>
                  <td style={{padding:"7px 11px"}}><span style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"2px 7px",borderRadius:6}}>{products.find(p=>p.id===row.id)?.category}</span></td>
                  <td style={{padding:"7px 11px",fontWeight:800,color:row.stokSaat<=2?"#ff4757":"#1a2e2a"}}>{row.stokSaat}</td>
                  <td style={{padding:"7px 11px"}}>
                    <input type="number" min="0" value={row.qty} onChange={e=>updateBulkRow(row.id,"qty",e.target.value)}
                      placeholder="0"
                      style={{width:70,padding:"5px 8px",borderRadius:7,border:`2px solid ${row.qty&&+row.qty>0?typeColor[bulkType]:"#b2ede6"}`,fontWeight:700,fontSize:13,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                  </td>
                  <td style={{padding:"7px 11px"}}>
                    <input value={row.note} onChange={e=>updateBulkRow(row.id,"note",e.target.value)}
                      placeholder="opsional..."
                      style={{width:150,padding:"5px 8px",borderRadius:7,border:"1px solid #b2ede6",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{fontSize:11,color:"#aaa",marginTop:7}}>* Baris yang QTY-nya diisi akan diproses. Baris kosong dilewati otomatis.</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      {onBack&&<SubHeader title="📦 Stok" onBack={onBack}/>}
      <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>

        {/* Pilih outlet -- hanya tampil saat standalone */}
        {onBack&&(
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#555"}}>Outlet:</span>
          {outlets.map(o=>(
            <button key={o.id} onClick={()=>{setSelectedOutlet(o.id);initReal(o.id);}} style={{padding:"6px 14px",borderRadius:20,border:"2px solid",borderColor:selectedOutlet===o.id?"#0d9488":"#b2ede6",background:selectedOutlet===o.id?"#0d9488":"#fff",color:selectedOutlet===o.id?"#fff":"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{o.nama}</button>
          ))}
        </div>
        )}

        {/* Bulk action buttons -- hanya di standalone */}
        {onBack&&(
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          <button onClick={()=>startBulk("masuk")} style={{background:"linear-gradient(135deg,#27ae60,#2ecc71)",border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            ⬇ Masuk Massal
          </button>
          <button onClick={()=>startBulk("keluar")} style={{background:"linear-gradient(135deg,#e74c3c,#ff6b6b)",border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            ⬆ Keluar Massal
          </button>
          <button onClick={()=>startBulk("transfer")} style={{background:"linear-gradient(135deg,#2980b9,#3498db)",border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5}}>
            ⇄ Transfer Massal
          </button>
        </div>
        )}

        {/* Tabs -- hanya di standalone */}
        {onBack&&(
        <div style={{display:"flex",gap:0,marginBottom:14,background:"#fff",borderRadius:12,padding:4,border:"2px solid #e0f5f1",width:"fit-content",flexWrap:"wrap"}}>
          {[{k:"opname",l:"📋 Opname"},{k:"masuk",l:"⬇ Masuk"},{k:"keluar",l:"⬆ Keluar"},{k:"transfer",l:"⇄ Transfer"},{k:"log",l:"📜 Log"}].map(t=>(
            <button key={t.k} onClick={()=>{ setTab(t.k); setBulkMode(false); }} style={{padding:"7px 14px",borderRadius:9,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:tab===t.k?"#0d9488":"transparent",color:tab===t.k?"#fff":"#888",transition:"all .15s"}}>{t.l}</button>
          ))}
        </div>
        )}

        {/* OPNAME TAB */}
        {tab==="opname"&&(
          <>
            {/* Sort buttons */}
            <div style={{display:"flex",gap:6,marginBottom:10,alignItems:"center",flexWrap:"wrap"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#555"}}>Urutkan:</span>
              {[...((_prodOrder||stokAdminOrder)?[{k:"habis",l:"✅ Urutan Produk"}]:[]),{k:"nama",l:"A-Z Nama"},{k:"kat",l:"Kategori"},{k:"habis_only",l:"Habis Dulu"},{k:"stok_asc",l:"Stok ↑"},{k:"stok_dsc",l:"Stok ↓"}].map(s=>(
                <button key={s.k} onClick={()=>setSortField(s.k)} style={{padding:"4px 11px",borderRadius:20,border:`2px solid ${sortField===s.k?"#0d9488":"#b2ede6"}`,background:sortField===s.k?"#0d9488":"#fff",color:sortField===s.k?"#fff":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{s.l}</button>
              ))}
            </div>

            {/* -- Total Modal Keseluruhan -- */}
            {(()=>{
              const allProds = filteredProds;
              const totalModalOutlet   = products.reduce((s,p)=>s+(outletStock[p.id]??0)*(p.modal||0),0);
              const totalStokOutlet    = products.reduce((s,p)=>s+(outletStock[p.id]??0),0);
              const habisCount         = products.filter(p=>(outletStock[p.id]??0)===0).length;
              const menipisCount       = products.filter(p=>{ const q=outletStock[p.id]??0; return q>0&&q<=5; }).length;
              const totalModalNyata    = products.reduce((s,p)=>s+(realStocks[p.id]??outletStock[p.id]??0)*(p.modal||0),0);
              return (
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:9,marginBottom:12}}>
                  {[
                    {l:"Total Stok",    v:`${totalStokOutlet} pcs`,  c:"#0d9488", bg:"#e0faf5"},
                    {l:"Nilai Modal",   v:fmtRp(totalModalOutlet),   c:"#7c3aed", bg:"#f5f3ff"},
                    {l:"Modal Nyata",   v:fmtRp(totalModalNyata),    c:"#2980b9", bg:"#e8f4fd"},
                    {l:"SKU",           v:products.length,           c:"#555",    bg:"#f9fafb"},
                    {l:"Habis",         v:habisCount,                c:"#dc2626", bg:"#fff5f5"},
                    {l:"Menipis ≤5",    v:menipisCount,              c:"#d97706", bg:"#fffbeb"},
                  ].map(k=>(
                    <div key={k.l} style={{background:k.bg,borderRadius:11,padding:"10px 14px",border:`1px solid ${k.c}20`,textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:16,color:k.c}}>{k.v}</div>
                      <div style={{fontSize:9,fontWeight:700,color:k.c,opacity:.75,marginTop:2}}>{k.l}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
              <div style={{position:"relative",flex:1}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Search()}</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari produk..."
                  style={{width:"100%",padding:"7px 10px 7px 27px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <button onClick={saveOpname} style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:"8px 16px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Opname</button>
            </div>
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#e0faf5"}}>
                  {["#","Produk","Kategori","Status","Stok Sistem","Stok Nyata","Selisih"].map(h=>(
                    <th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filteredProds.map((p,i)=>{
                    const sysQty = outletStock[p.id]??0;
                    const realQty = realStocks[p.id]??sysQty;
                    const diff = realQty-sysQty;
                    const st = getStatus(sysQty);
                    return (
                      <tr key={p.id}
                        draggable
                        onDragStart={(e)=>{
                          dragStokAdminIdx.current=i; setDraggingStokAdmin(i); setDragOverStokAdmin(null);
                          e.dataTransfer.effectAllowed="move";
                        }}
                        onDragOver={(e)=>{
                          e.preventDefault(); e.dataTransfer.dropEffect="move";
                          if(dragStokAdminIdx.current===null||dragStokAdminIdx.current===i) return;
                          setDragOverStokAdmin(i);
                        }}
                        onDragEnter={(e)=>{
                          e.preventDefault();
                          if(dragStokAdminIdx.current===null||dragStokAdminIdx.current===i) return;
                          setDragOverStokAdmin(i);
                        }}
                        onDragLeave={()=>setDragOverStokAdmin(null)}
                        onDrop={(e)=>{
                          e.preventDefault();
                          if(dragStokAdminIdx.current===null||dragStokAdminIdx.current===i){setDragOverStokAdmin(null);return;}
                          const ord=filteredProds.map(x=>String(x.id));
                          const [mv]=ord.splice(dragStokAdminIdx.current,1);
                          const rect=e.currentTarget.getBoundingClientRect();
                          const ins = e.clientY<rect.top+rect.height/2 ? i : i+1;
                          const adj = dragStokAdminIdx.current<ins ? ins-1 : ins;
                          ord.splice(adj,0,mv);
                          dragStokAdminIdx.current=adj;
                          setStokAdminOrder(ord);
                          setDragOverStokAdmin(null);
                          // Sync ke prodOrder global (admin)
                          if(typeof setProdOrderRoot==="function") setProdOrderRoot(ord);
                          dbStokOrder.saveOrder(selectedOutlet, ord).catch(()=>{});
                          dbProductOrder.saveOrder(ord).catch(()=>{});
                        }}
                        onDragEnd={()=>{dragStokAdminIdx.current=null; setDraggingStokAdmin(null); setDragOverStokAdmin(null);}}
                        style={{
                          borderTop: dragOverStokAdmin===i?"3px solid #0d9488":"1px solid #f0faf8",
                          background: draggingStokAdmin===i?"#d0f5ee":dragOverStokAdmin===i?"#e8fdf8":i%2===0?"#fff":"#fafffe",
                          cursor: draggingStokAdmin===i?"grabbing":"grab",
                          opacity: draggingStokAdmin===i?0.5:1,
                          transform: draggingStokAdmin===i?"scale(1.01)":"none",
                          boxShadow: draggingStokAdmin===i?"0 4px 14px rgba(13,148,136,.2)":"none",
                          transition:"background .08s,opacity .08s,transform .08s",
                        }}>
                        <td style={{padding:"7px 11px",color:"#ccc",fontWeight:600}}>{i+1}</td>
                        <td style={{padding:"7px 6px",color:draggingStokAdmin===i?"#0d9488":"#b2ede6",fontSize:18,userSelect:"none",textAlign:"center",cursor:draggingStokAdmin===i?"grabbing":"grab"}} title="Drag untuk atur urutan">⠿</td>
                        <td style={{padding:"7px 11px",fontWeight:700}}>{p.name}</td>
                        <td style={{padding:"7px 11px"}}><span style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"2px 7px",borderRadius:6}}>{p.category}</span></td>
                        <td style={{padding:"7px 11px"}}><span style={{background:ss[st].bg,color:ss[st].c,fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>{ss[st].l}</span></td>
                        <td style={{padding:"7px 11px",fontWeight:800,color:sysQty<=2?"#ff4757":"#1a2e2a"}}>{sysQty}</td>
                        <td style={{padding:"7px 11px"}}>
                          <input type="number" min="0" value={realQty} onChange={e=>setRealStocks(prev=>({...prev,[p.id]:Number(e.target.value)}))}
                            style={{width:64,padding:"4px 7px",borderRadius:7,border:"2px solid #b2ede6",fontWeight:700,fontSize:13,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                        </td>
                        <td style={{padding:"7px 11px",fontWeight:800,fontSize:13,color:diff===0?"#2ecc71":diff>0?"#f39c12":"#ff4757"}}>{diff>0?`+${diff}`:diff===0?"✓":diff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* MASUK / KELUAR / TRANSFER */}
        {["masuk","keluar","transfer"].includes(tab)&&(()=>{
          const tc = {masuk:"#27ae60",keluar:"#e74c3c",transfer:"#2980b9"}[tab];
          const tIcon = {masuk:"⬇",keluar:"⬆",transfer:"⇄"}[tab];
          const tName = tab==="masuk"?"Stok Masuk":tab==="keluar"?"Stok Keluar":"Transfer Stok";
          const baseList = (_prodOrder&&_prodOrder.length)
            ? [..._prodOrder.map(id=>products.find(p=>String(p.id)===String(id))).filter(Boolean),
               ...products.filter(p=>!_prodOrder.map(String).includes(String(p.id)))]
            : products;
          const initBulk = () => {
            setBulkType(tab);
            setBulkRows(baseList.map(p=>({id:p.id,name:p.name,stokSaat:outletStock[p.id]??0,qty:"",note:""})));
            setBulkTransferTo("");
            setBulkMode(true);
          };
          return (
            <div>
              {/* Toggle satuan / massal */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{fontWeight:800,fontSize:14,color:tc}}>{tIcon} {tName}</div>
                <div style={{marginLeft:"auto",display:"flex",gap:7}}>
                  <button onClick={()=>setBulkMode(false)}
                    style={{padding:"6px 16px",borderRadius:9,border:`2px solid ${!bulkMode?tc:"#e0f5f1"}`,
                      background:!bulkMode?tc:"#fff",color:!bulkMode?"#fff":tc,
                      fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                    📝 Satuan
                  </button>
                  <button onClick={initBulk}
                    style={{padding:"6px 16px",borderRadius:9,border:`2px solid ${bulkMode?tc:"#e0f5f1"}`,
                      background:bulkMode?tc:"#fff",color:bulkMode?"#fff":tc,
                      fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",display:"flex",alignItems:"center",gap:5}}>
                    📋 Input Massal
                    {bulkMode&&bulkRows.filter(r=>r.qty&&+r.qty>0).length>0&&(
                      <span style={{background:"rgba(255,255,255,.3)",borderRadius:20,padding:"0 6px",fontSize:10,fontWeight:800}}>
                        {bulkRows.filter(r=>r.qty&&+r.qty>0).length} diisi
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* -- SATUAN -- */}
              {!bulkMode&&(
                <div style={{maxWidth:480}}>
                  <div style={{background:"#fff",borderRadius:14,border:`2px solid ${tc}25`,padding:"18px"}}>
                    <div style={{marginBottom:10}}>
                      <label style={{...lbl}}>Produk *</label>
                      <select value={form.productId} onChange={e=>setForm(p=>({...p,productId:e.target.value}))} style={{...inp}}>
                        <option value="">-- Pilih Produk --</option>
                        {baseList.map(p=><option key={p.id} value={p.id}>{p.name} (stok: {outletStock[p.id]??0})</option>)}
                      </select>
                    </div>
                    {tab==="transfer"&&(
                      <div style={{marginBottom:10}}>
                        <label style={{...lbl}}>Outlet Tujuan *</label>
                        <select value={transferTo} onChange={e=>setTransferTo(e.target.value)} style={{...inp}}>
                          <option value="">-- Pilih Outlet --</option>
                          {outlets.filter(o=>o.id!==selectedOutlet).map(o=><option key={o.id} value={o.id}>{o.nama}</option>)}
                        </select>
                      </div>
                    )}
                    <Field label="Jumlah *" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} type="number" placeholder="0"/>
                    <Field label="Catatan" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Opsional..."/>
                    <button onClick={tab==="masuk"?doMasuk:tab==="keluar"?doKeluar:doTransfer}
                      style={{width:"100%",background:`linear-gradient(135deg,${tab==="masuk"?"#27ae60,#2ecc71":tab==="keluar"?"#e74c3c,#ff6b6b":"#2980b9,#3498db"})`,
                        border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
                      {tab==="masuk"?"Simpan Stok Masuk":tab==="keluar"?"Simpan Stok Keluar":"Lakukan Transfer"}
                    </button>
                  </div>
                </div>
              )}

              {/* -- MASSAL -- bulkMode=true sudah dirender di awal sebagai full-screen view */}
              {bulkMode&&(
                <div style={{background:tc+"08",border:`2px dashed ${tc}40`,borderRadius:12,padding:"14px 16px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>📋</span>
                  <div>
                    <div style={{fontWeight:700,fontSize:13,color:tc}}>Mode Input Massal Aktif</div>
                    <div style={{fontSize:11,color:"#888",marginTop:2}}>Tabel massal ditampilkan di atas halaman ini.</div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* LOG */}
        {tab==="log"&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
            {log.length===0?(
              <div style={{textAlign:"center",color:"#ccc",padding:40,fontSize:13}}>Belum ada log stok</div>
            ):(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:"#e0faf5"}}>
                  {["Waktu","Tipe","Outlet","Produk","Qty","Catatan","Aksi"].map(h=>(
                    <th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:800,color:"#0d9488"}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {log.map((l,i)=>(
                    <LogRow key={l.id} l={l} i={i}
                      onEdit={updated=>setLog(prev=>prev.map(x=>x.id===l.id?{...x,...updated}:x))}
                      onDelete={()=>setLog(prev=>prev.filter(x=>x.id!==l.id))}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// -- helper: parse "dd/mm/yyyy" → Date ----------------------------------------
const parseDate = s => { try { const [d,m,y]=s.split("/"); return new Date(+y,+m-1,+d); } catch { return null; } };
const toInputDate = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const fromInputDate = s => { const [y,m,d]=s.split("-"); return new Date(+y,+m-1,+d); };

// ==============================================================================
// DASHBOARD
// ==============================================================================
function DashboardPage({ transactions, products, outlets, stocks, onBack }) {
  const [chartMetric,  setChartMetric]  = useState("omset");
  const [period,       setPeriod]       = useState("daily");   // daily|monthly|yearly|custom
  const [hoverIdx,     setHoverIdx]     = useState(null);
  const [filterOutlet, setFilterOutlet] = useState("semua"); // filter outlet
  // Default custom range: last 30 days
  const nowD = new Date();
  const thirtyAgo = new Date(nowD); thirtyAgo.setDate(nowD.getDate()-29);
  const [dateFrom, setDateFrom] = useState(toInputDate(thirtyAgo));
  const [dateTo,   setDateTo]   = useState(toInputDate(nowD));

  const calcOmset  = list => list.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
  const calcProfit = list => list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+(i.price-(i.modal||0))*i.qty,0),0);

  // -- Filter transactions by date range --------------------------------------
  const isInRange = t => {
    const td = parseDate(t.date);
    if (!td) return false;
    if (period === "custom") {
      const from = fromInputDate(dateFrom);
      const to   = fromInputDate(dateTo);
      to.setHours(23,59,59);
      return td >= from && td <= to;
    }
    // for preset periods, show all-time in stats, range handled in chart
    return true;
  };

  const txByOutlet  = filterOutlet==="semua" ? transactions : transactions.filter(t=>t.outletId===filterOutlet);
  const filteredTx  = period === "custom" ? txByOutlet.filter(isInRange) : txByOutlet;
  const todayTrx   = txByOutlet.filter(t=>t.date===today());
  const omsetHari  = calcOmset(todayTrx);
  const profitHari = calcProfit(todayTrx);
  const totalItems = todayTrx.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
  const allLowStock= products.filter(p=>outlets.some(o=>(stocks[o.id]?.[p.id]??0)<=2));

  // -- Preset shortcuts --------------------------------------------------------
  const applyPreset = preset => {
    const n=new Date();
    if (preset==="today")     { setDateFrom(toInputDate(n)); setDateTo(toInputDate(n)); }
    else if (preset==="7d")   { const d=new Date(n);d.setDate(n.getDate()-6); setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    else if (preset==="30d")  { const d=new Date(n);d.setDate(n.getDate()-29);setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    else if (preset==="month"){ const d=new Date(n.getFullYear(),n.getMonth(),1);setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    else if (preset==="year") { const d=new Date(n.getFullYear(),0,1);setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    setPeriod("custom");
  };

  // -- Chart data --------------------------------------------------------------
  const getChartData = () => {
    const now=new Date(); const pts=[];
    if (period==="custom") {
      const from=fromInputDate(dateFrom), to=fromInputDate(dateTo);
      const diffDays=Math.round((to-from)/(1000*60*60*24))+1;
      if (diffDays<=31) {
        // daily points
        for(let d=0;d<diffDays;d++){
          const dt=new Date(from);dt.setDate(from.getDate()+d);
          const dateStr=dt.toLocaleDateString("id-ID");
          const label=dt.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"});
          const list=txByOutlet.filter(t=>t.date===dateStr);
          const ic=list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
          pts.push({label,omset:calcOmset(list),profit:calcProfit(list),item:ic});
        }
      } else if(diffDays<=366){
        // monthly
        const cur=new Date(from.getFullYear(),from.getMonth(),1);
        while(cur<=to){
          const yr=cur.getFullYear(),mo=cur.getMonth();
          const label=cur.toLocaleDateString("id-ID",{month:"short",year:"2-digit"});
          const list=txByOutlet.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr&&td.getMonth()===mo&&td>=from&&td<=to;});
          const icm=list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
          pts.push({label,omset:calcOmset(list),profit:calcProfit(list),item:icm});
          cur.setMonth(cur.getMonth()+1);
        }
      } else {
        // yearly
        for(let y=from.getFullYear();y<=to.getFullYear();y++){
          const list=txByOutlet.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===y&&td>=from&&td<=to;});
          const icy=list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
          pts.push({label:String(y),omset:calcOmset(list),profit:calcProfit(list),item:icy});
        }
      }
    } else if(period==="daily"){
      for(let d=13;d>=0;d--){const dt=new Date(now);dt.setDate(now.getDate()-d);const label=dt.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"});const dateStr=dt.toLocaleDateString("id-ID");const list=transactions.filter(t=>t.date===dateStr);const itemCount=list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);pts.push({label,omset:calcOmset(list),profit:calcProfit(list),item:itemCount});}
    } else if(period==="monthly"){
      for(let m=11;m>=0;m--){const dt=new Date(now.getFullYear(),now.getMonth()-m,1);const yr=dt.getFullYear(),mo=dt.getMonth();const label=dt.toLocaleDateString("id-ID",{month:"short",year:"2-digit"});const list=txByOutlet.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr&&td.getMonth()===mo;});const itemCount=list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);pts.push({label,omset:calcOmset(list),profit:calcProfit(list),item:itemCount});}
    } else {
      for(let y=4;y>=0;y--){const yr=now.getFullYear()-y;const list=txByOutlet.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr;});const itemCount=list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);pts.push({label:String(yr),omset:calcOmset(list),profit:calcProfit(list),item:itemCount});}
    }
    return pts;
  };

  const chartData=getChartData();
  const rangedTx  = period==="custom" ? filteredTx : chartData.reduce((acc,_,i)=>{ /* use all */ return acc; }, filteredTx);
  const vals=chartData.map(p=>p[chartMetric]);
  const maxVal=Math.max(...vals,1);
  const cW=640,cH=200,pL=52,pR=16,pT=16,pB=32,iW=cW-pL-pR,iH=cH-pT-pB,n=chartData.length;
  const pts2=chartData.map((p,i)=>({x:pL+(i/((n-1)||1))*iW,y:pT+(1-p[chartMetric]/maxVal)*iH,val:p[chartMetric],label:p.label}));
  const linePath=pts2.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath=pts2.length>1?`${linePath} L${pts2[pts2.length-1].x},${pT+iH} L${pts2[0].x},${pT+iH} Z`:"";
  const lastTwo=pts2.slice(-2);
  const trend=lastTwo.length===2?(lastTwo[1].val>=lastTwo[0].val?"up":"down"):"up";
  const tC=trend==="up"?"#0d9488":"#ff4757";
  const gId=`g${chartMetric}${trend}`;
  const yLabels2=[0,.25,.5,.75,1].map(f=>({y:pT+iH*(1-f),val:maxVal*f}));

  const salesMap={},profitMap={};
  filteredTx.forEach(t=>t.items.filter(i=>!i.refunded).forEach(i=>{salesMap[i.name]=(salesMap[i.name]||0)+i.qty;profitMap[i.name]=(profitMap[i.name]||0)+(i.price-(i.modal||0))*i.qty;}));
  const fastMoving=Object.entries(salesMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const topProfit=Object.entries(profitMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const outletStats=outlets.map(o=>{const list=filteredTx.filter(t=>t.outletId===o.id);return{nama:o.nama,omset:calcOmset(list),profit:calcProfit(list),trx:list.length};}).sort((a,b)=>b.profit-a.profit);

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="📊 Dashboard" onBack={onBack}
        right={
          <select value={filterOutlet} onChange={e=>setFilterOutlet(e.target.value)}
            style={{padding:"5px 11px",borderRadius:20,border:"1px solid rgba(255,255,255,.35)",
              background:"rgba(255,255,255,.18)",color:"#fff",fontWeight:700,fontSize:11,
              outline:"none",fontFamily:"inherit",cursor:"pointer"}}>
            <option value="semua" style={{color:"#000",background:"#fff"}}>Semua Outlet</option>
            {(outlets||[]).map(o=>(
              <option key={o.id} value={o.id} style={{color:"#000",background:"#fff"}}>{o.nama}</option>
            ))}
          </select>
        }
      />
      <div style={{padding:"14px 20px",maxWidth:980,margin:"0 auto"}}>

        {/* KPI */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[
            {l:"Omset Hari Ini",  v:fmtRp(omsetHari),             bg:"linear-gradient(135deg,#0d9488,#14b8a6)",c:"#fff"},
            {l:"Profit Hari Ini", v:fmtRp(profitHari),            bg:"linear-gradient(135deg,#8e44ad,#9b59b6)",c:"#fff"},
            {l:"Omset Periode",   v:fmtRp(calcOmset(filteredTx)), bg:"#e8f4fd",c:"#2980b9"},
            {l:"Stok Kritis",     v:`${allLowStock.length} produk`,bg:"#fff0f0",c:"#e74c3c"},
          ].map(k=>(
            <div key={k.l} style={{background:k.bg,borderRadius:13,padding:"13px 15px",boxShadow:"0 2px 10px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:900,fontSize:20,color:k.c}}>{k.v}</div>
              <div style={{fontSize:11,fontWeight:700,color:k.c,opacity:.8,marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* CHART */}
        <div style={{background:"#fff",borderRadius:16,padding:"16px 18px",border:"2px solid #e0f5f1",marginBottom:14}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div>
              <span style={{fontWeight:900,fontSize:15,color:"#1a2e2a"}}>{trend==="up"?"📈":"📉"} Grafik {chartMetric==="omset"?"Omset":chartMetric==="profit"?"Profit":"Per Item"}</span>
              <span style={{fontSize:12,fontWeight:700,color:tC,marginLeft:8,background:`${tC}18`,padding:"2px 9px",borderRadius:20}}>{trend==="up"?"▲ Naik":"▼ Turun"}</span>
              <div style={{fontSize:11,color:"#aaa",fontWeight:600,marginTop:2}}>
                {period==="custom"?`${dateFrom} s/d ${dateTo}`:period==="daily"?"14 Hari Terakhir":period==="monthly"?"12 Bulan Terakhir":"5 Tahun Terakhir"}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {/* Metric */}
              <div style={{display:"flex",gap:0,background:"#f0faf8",borderRadius:9,padding:3}}>
                {[{k:"omset",l:"Omset"},{k:"profit",l:"Profit"},{k:"item",l:"Per Item"}].map(m=>(
                  <button key={m.k} onClick={()=>setChartMetric(m.k)} style={{padding:"5px 11px",borderRadius:7,border:"none",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",background:chartMetric===m.k?"#0d9488":"transparent",color:chartMetric===m.k?"#fff":"#888"}}>{m.l}</button>
                ))}
              </div>
              {/* Preset quick periods */}
              <div style={{display:"flex",gap:0,background:"#f0faf8",borderRadius:9,padding:3}}>
                {[{k:"daily",l:"14H"},{k:"monthly",l:"12Bln"},{k:"yearly",l:"5Thn"}].map(p=>(
                  <button key={p.k} onClick={()=>setPeriod(p.k)} style={{padding:"5px 10px",borderRadius:7,border:"none",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",background:period===p.k?"#0d9488":"transparent",color:period===p.k?"#fff":"#888"}}>{p.l}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Date range picker */}
          <div style={{background:"#f8fffe",borderRadius:11,padding:"10px 14px",marginBottom:12,border:"1px solid #e0f5f1"}}>
            <div style={{fontSize:11,fontWeight:800,color:"#0d9488",marginBottom:8}}>📅 Rentang Tanggal Kustom</div>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:"#555",whiteSpace:"nowrap"}}>Dari:</label>
                <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPeriod("custom");}}
                  style={{padding:"5px 9px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",cursor:"pointer"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <label style={{fontSize:11,fontWeight:700,color:"#555",whiteSpace:"nowrap"}}>Sampai:</label>
                <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPeriod("custom");}}
                  style={{padding:"5px 9px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",cursor:"pointer"}}/>
              </div>
              {/* Shortcut presets */}
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {[{k:"today",l:"Hari Ini"},{k:"7d",l:"7 Hari"},{k:"30d",l:"30 Hari"},{k:"month",l:"Bulan Ini"},{k:"year",l:"Tahun Ini"}].map(p=>(
                  <button key={p.k} onClick={()=>applyPreset(p.k)} style={{padding:"4px 10px",borderRadius:20,border:"2px solid #b2ede6",background:"#fff",color:"#0d9488",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="#0d9488";e.currentTarget.style.color="#fff";e.currentTarget.style.borderColor="#0d9488";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="#fff";e.currentTarget.style.color="#0d9488";e.currentTarget.style.borderColor="#b2ede6";}}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {/* -- Interactive Stock-style Chart -- */}
          <div style={{overflowX:"auto",position:"relative"}}>
            {/* Tooltip floating */}
            {hoverIdx!==null&&pts2[hoverIdx]&&(()=>{
              const p=pts2[hoverIdx];
              const tipW=160, tipH=64;
              // posisi tooltip: kiri/kanan tergantung posisi titik
              const txPct = p.x/cW;
              const tipLeft = txPct>0.7
                ? `calc(${(p.x/cW*100).toFixed(1)}% - ${tipW+12}px)`
                : `calc(${(p.x/cW*100).toFixed(1)}% + 12px)`;
              // hitung perubahan dari titik sebelumnya
              const prev = hoverIdx>0?pts2[hoverIdx-1]:null;
              const diff = prev?p.val-prev.val:null;
              const diffPct = prev&&prev.val>0?((diff/prev.val)*100).toFixed(1):null;
              return (
                <div style={{
                  position:"absolute",top:0,left:tipLeft,
                  background:"#fff",borderRadius:12,padding:"10px 14px",
                  boxShadow:"0 4px 20px rgba(0,0,0,.18)",
                  border:`2px solid ${tC}33`,
                  pointerEvents:"none",zIndex:10,width:tipW,
                  animation:"fadeUp .12s ease"
                }}>
                  <div style={{fontSize:11,fontWeight:800,color:"#555",marginBottom:3}}>{p.label}</div>
                  <div style={{fontSize:16,fontWeight:900,color:tC}}>{fmtRp(p.val)}</div>
                  {diff!==null&&(
                    <div style={{fontSize:11,fontWeight:700,color:diff>=0?"#27ae60":"#e74c3c",marginTop:3,display:"flex",alignItems:"center",gap:3}}>
                      {diff>=0?"▲":"▼"} {fmtRp(Math.abs(diff))} ({diff>=0?"+":""}{diffPct}%)
                    </div>
                  )}
                </div>
              );
            })()}
            <svg
              width="100%"
              viewBox={`0 0 ${cW} ${cH}`}
              style={{display:"block",minWidth:320,cursor:"crosshair"}}
              onMouseLeave={()=>setHoverIdx(null)}
              onMouseMove={e=>{
                const rect=e.currentTarget.getBoundingClientRect();
                const mx=(e.clientX-rect.left)*(cW/rect.width);
                if(pts2.length===0){setHoverIdx(null);return;}
                let best=0,bestD=Infinity;
                pts2.forEach((p,i)=>{const d=Math.abs(p.x-mx);if(d<bestD){bestD=d;best=i;}});
                setHoverIdx(best);
              }}
            >
              <defs>
                <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tC} stopOpacity="0.28"/>
                  <stop offset="100%" stopColor={tC} stopOpacity="0.02"/>
                </linearGradient>
                <filter id="chartShadow">
                  <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={tC} floodOpacity="0.18"/>
                </filter>
              </defs>

              {/* Grid lines & Y labels */}
              {yLabels2.map((yl,i)=>(
                <g key={i}>
                  <line x1={pL} y1={yl.y} x2={cW-pR} y2={yl.y}
                    stroke={i===0?"#e0f5f1":"#f0faf8"} strokeWidth={i===0?"1.5":"1"}
                    strokeDasharray={i===0?"none":"4,4"}/>
                  <text x={pL-6} y={yl.y+4} textAnchor="end" fontSize="11"
                    fill="#aaa" fontFamily="Nunito,sans-serif" fontWeight="700">
                    {fmtS(yl.val)}
                  </text>
                </g>
              ))}

              {/* Area fill */}
              {pts2.length>1&&<path d={areaPath} fill={`url(#${gId})`}/>}

              {/* Main line */}
              {pts2.length>1&&<path d={linePath} fill="none" stroke={tC} strokeWidth="2.5"
                strokeLinejoin="round" strokeLinecap="round" filter="url(#chartShadow)"/>}

              {/* Hover crosshair */}
              {hoverIdx!==null&&pts2[hoverIdx]&&(()=>{
                const p=pts2[hoverIdx];
                return (
                  <g>
                    {/* Vertical crosshair line */}
                    <line x1={p.x} y1={pT} x2={p.x} y2={pT+iH}
                      stroke={tC} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"/>
                    {/* Horizontal crosshair line */}
                    <line x1={pL} y1={p.y} x2={cW-pR} y2={p.y}
                      stroke={tC} strokeWidth="1" strokeDasharray="3,3" opacity="0.4"/>
                    {/* Y axis value label */}
                    <rect x={0} y={p.y-9} width={pL-2} height={18} rx="4" fill={tC}/>
                    <text x={pL-5} y={p.y+4} textAnchor="end" fontSize="10"
                      fill="#fff" fontFamily="Nunito,sans-serif" fontWeight="800">
                      {fmtS(p.val)}
                    </text>
                  </g>
                );
              })()}

              {/* Data points */}
              {pts2.map((p,i)=>{
                const isHover=hoverIdx===i;
                const showLabel = n<=14 || isHover;
                // X label: show every Nth to avoid clutter
                const showX = n<=14 || i===0 || i===n-1 || i%Math.ceil(n/10)===0 || isHover;
                return (
                  <g key={i}>
                    {/* Outer glow ring on hover */}
                    {isHover&&<circle cx={p.x} cy={p.y} r="10" fill={tC} opacity="0.12"/>}
                    {isHover&&<circle cx={p.x} cy={p.y} r="6.5" fill={tC} opacity="0.2"/>}
                    {/* Main dot */}
                    <circle cx={p.x} cy={p.y}
                      r={isHover?5.5:3.5}
                      fill={isHover?tC:"#fff"}
                      stroke={tC}
                      strokeWidth={isHover?0:2.5}
                      style={{transition:"r .1s,fill .1s"}}
                    />
                    {/* X axis label */}
                    {showX&&(
                      <text x={p.x} y={pT+iH+16} textAnchor="middle" fontSize="10"
                        fill={isHover?tC:"#999"} fontFamily="Nunito,sans-serif"
                        fontWeight={isHover?"800":"600"}>
                        {p.label}
                      </text>
                    )}
                    {/* Value label above dot -- always show if few points or on hover */}
                    {(showLabel&&p.val>0)&&(
                      <text x={p.x} y={p.y-(isHover?10:8)} textAnchor="middle" fontSize={isHover?"11":"9"}
                        fill={tC} fontWeight="800" fontFamily="Nunito,sans-serif">
                        {fmtS(p.val)}
                      </text>
                    )}
                  </g>
                );
              })}

              {pts2.length===0&&(
                <text x={cW/2} y={cH/2} textAnchor="middle" fill="#ccc"
                  fontSize="13" fontFamily="Nunito,sans-serif">
                  Belum ada data
                </text>
              )}
            </svg>
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            {[
              {l:`Total`,v:fmtRp(vals.reduce((s,v)=>s+v,0)),c:"#0d9488"},
              {l:"Rata-rata",v:fmtRp(Math.round(vals.reduce((s,v)=>s+v,0)/(vals.filter(v=>v>0).length||1))),c:"#2980b9"},
              {l:"Tertinggi",v:fmtRp(Math.max(...vals,0)),c:"#27ae60"},
              {l:"Terendah", v:fmtRp(Math.min(...vals.filter(v=>v>0),0)),c:"#e74c3c"},
            ].map(s=>(
              <div key={s.l} style={{flex:1,background:"#f0faf8",borderRadius:9,padding:"7px 10px",border:"1px solid #e0f5f1"}}>
                <div style={{fontWeight:900,fontSize:13,color:s.c}}>{s.v}</div>
                <div style={{fontSize:10,color:"#aaa",fontWeight:600}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Fast Moving + Top Profit */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div style={{background:"#fff",borderRadius:14,padding:16,border:"2px solid #e0f5f1"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#0d9488",marginBottom:12}}>🚀 Fast Moving</div>
            {fastMoving.length===0?<div style={{textAlign:"center",color:"#ccc",padding:20,fontSize:12}}>Belum ada data</div>:fastMoving.map(([name,qty],i)=>{
              const pct=Math.round((qty/(fastMoving[0]?.[1]||1))*100);
              return (
                <div key={name} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:19,height:19,borderRadius:"50%",background:["#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#ccfbf1"][i],color:i<2?"#fff":"#0d9488",fontWeight:900,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                      <span style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:130}}>{name}</span>
                    </div>
                    <span style={{fontWeight:900,fontSize:12,color:"#0d9488",flexShrink:0}}>{qty} pcs</span>
                  </div>
                  <div style={{background:"#e0faf5",borderRadius:20,height:4}}><div style={{background:"linear-gradient(90deg,#0d9488,#14b8a6)",height:"100%",width:`${pct}%`,borderRadius:20}}/></div>
                </div>
              );
            })}
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:16,border:"2px solid #e0f5f1"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#8e44ad",marginBottom:12}}>💎 Top Profit Produk</div>
            {topProfit.length===0?<div style={{textAlign:"center",color:"#ccc",padding:20,fontSize:12}}>Belum ada data</div>:topProfit.map(([name,profit],i)=>{
              const pct=Math.round((profit/(topProfit[0]?.[1]||1))*100);
              return (
                <div key={name} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:3}}>
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <div style={{width:19,height:19,borderRadius:"50%",background:["#8e44ad","#9b59b6","#a569bd","#b07ec9","#c39bd3"][i],color:"#fff",fontWeight:900,fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                      <span style={{fontSize:12,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{name}</span>
                    </div>
                    <span style={{fontWeight:900,fontSize:12,color:"#8e44ad",flexShrink:0}}>{fmtRp(profit)}</span>
                  </div>
                  <div style={{background:"#f5eeff",borderRadius:20,height:4}}><div style={{background:"linear-gradient(90deg,#8e44ad,#9b59b6)",height:"100%",width:`${pct}%`,borderRadius:20}}/></div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking outlet + stok kritis */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div style={{background:"#fff",borderRadius:14,padding:16,border:"2px solid #e0f5f1"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#e67e22",marginBottom:12}}>🏅 Ranking Keuntungan Outlet</div>
            {outletStats.length===0?<div style={{textAlign:"center",color:"#ccc",padding:20,fontSize:12}}>Belum ada data</div>:outletStats.map((o,i)=>{
              const maxP=outletStats[0]?.profit||1;
              const pct=Math.round((o.profit/maxP)*100);
              return (
                <div key={o.nama} style={{marginBottom:11,padding:"9px 11px",borderRadius:10,background:i===0?"#fffbe6":"#f8fffe",border:`2px solid ${i===0?"#f39c12":"#e0f5f1"}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontWeight:800,fontSize:13}}>{["🥇","🥈","🥉"][i]||`#${i+1}`} {o.nama}</span>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:13,color:"#e67e22"}}>{fmtRp(o.profit)}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>profit</div>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,fontSize:10,color:"#888",marginBottom:4}}>
                    <span>Omset: <b style={{color:"#0d9488"}}>{fmtRp(o.omset)}</b></span>
                    <span>Trx: <b style={{color:"#2980b9"}}>{o.trx}</b></span>
                  </div>
                  <div style={{background:"#fde8c8",borderRadius:20,height:4}}><div style={{background:"linear-gradient(90deg,#e67e22,#f39c12)",height:"100%",width:`${pct}%`,borderRadius:20}}/></div>
                </div>
              );
            })}
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:16,border:"2px solid #ffe0e0"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#ff4757",marginBottom:12}}>⚠️ Stok Kritis</div>
            {allLowStock.length===0?<div style={{textAlign:"center",color:"#2ecc71",padding:20,fontSize:12,fontWeight:700}}>✅ Semua stok aman!</div>:allLowStock.slice(0,7).map(p=>{
              const perOutlet=outlets.map(o=>({nama:o.nama,qty:stocks[o.id]?.[p.id]??0})).filter(o=>o.qty<=2);
              return (
                <div key={p.id} style={{marginBottom:9,padding:"7px 10px",borderRadius:8,background:"#fff8f8",border:"1px solid #ffd6d6"}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:12}}>{p.name}</span>
                    <span style={{fontSize:10,background:"#e0faf5",color:"#0d9488",padding:"1px 7px",borderRadius:6,fontWeight:700}}>{p.category}</span>
                  </div>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                    {perOutlet.map(o=>(
                      <span key={o.nama} style={{fontSize:10,fontWeight:700,color:o.qty===0?"#c0392b":"#ff4757",background:o.qty===0?"#ffe5e5":"#fff0f0",padding:"1px 7px",borderRadius:6}}>
                        {o.nama.replace("Ammar Cell ","")}: {o.qty===0?"Habis":`${o.qty}`}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ringkasan per outlet */}
        <div style={{background:"#fff",borderRadius:14,padding:16,border:"2px solid #e0f5f1"}}>
          <div style={{fontWeight:800,fontSize:14,color:"#0d9488",marginBottom:12}}>💰 Ringkasan Semua Outlet</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(195px,1fr))",gap:10}}>
            {outlets.map((o,i)=>{
              const list=filteredTx.filter(t=>t.outletId===o.id);
              const om=calcOmset(list),pr=calcProfit(list);
              const todL=transactions.filter(t=>t.outletId===o.id&&t.date===today());
              return (
                <div key={o.id} style={{background:"#f0faf8",borderRadius:11,padding:"12px 14px",border:`2px solid ${i===0?"#0d9488":"#e0f5f1"}`}}>
                  <div style={{fontWeight:800,fontSize:12,color:"#0d9488",marginBottom:7}}>{o.nama}</div>
                  {[{l:"Total Omset",v:fmtRp(om),c:"#0d9488"},{l:"Total Profit",v:fmtRp(pr),c:"#8e44ad"},{l:"Omset Hari Ini",v:fmtRp(calcOmset(todL)),c:"#2980b9"},{l:"Transaksi",v:list.length,c:"#555"}].map(s=>(
                    <div key={s.l} style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                      <span style={{fontSize:10,color:"#888"}}>{s.l}</span>
                      <span style={{fontWeight:800,fontSize:11,color:s.c}}>{s.v}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}

// ==============================================================================
// LAPORAN (per outlet + per shift)
// ==============================================================================
// -- Bank Shift Detail Modal ---------------------------------------------------
function BankShiftDetailModal({ shift: sh, onClose }) {
  const [modalTab, setModalTab] = useState('ringkasan');
  const masuk  = sh.trx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
  const keluar = sh.trx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
  const fee    = sh.trx.reduce((s,t)=>s+(t.fee||0),0);
  const sc     = sh.saldo_close||{}, so = sh.saldo_open||{};
  const sel    = sc.selisih??null;
  const isAct  = sh.status==='active';
  const sistemAkhir = (so.cashKemb||0)+masuk-keluar;
  return (
  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:999,fontFamily:"'Nunito',sans-serif"}}
    onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:'#fff',borderRadius:'20px 20px 0 0',width:'100%',maxWidth:600,maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column',boxShadow:'0 -8px 40px rgba(0,0,0,.25)'}}>
      {/* Modal header */}
      <div style={{background:isAct?'linear-gradient(135deg,#065f46,#059669)':'linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)',padding:'16px 20px',flexShrink:0}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
              <span style={{fontWeight:900,fontSize:18,color:'#fff'}}>{sh.nama}</span>
              <span style={{fontSize:11,fontWeight:700,padding:'2px 10px',borderRadius:20,background:'rgba(0,0,0,.18)',color:'#fff'}}>{isAct?'🟢 Aktif':'⚫ Tutup'}</span>
            </div>
            <div style={{fontSize:11,color:'rgba(255,255,255,.75)'}}>
              {fmtDT(sh.start_time)}{sh.end_time&&` → ${fmtDT(sh.end_time)}`}
            </div>
          </div>
          <button onClick={()=>onClose()} style={{background:'rgba(255,255,255,.2)',border:'none',borderRadius:20,padding:'5px 12px',color:'#fff',fontWeight:700,fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>✕</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:6,marginTop:12}}>
          {[{l:'Masuk',v:fmtRp(masuk),c:'#a7f3d0'},{l:'Keluar',v:fmtRp(keluar),c:'#fca5a5'},{l:'Fee',v:fmtRp(fee),c:'#fcd34d'},{l:'Trx',v:`${sh.trx.length}x`,c:'#e0e7ff'}].map(k=>(
            <div key={k.l} style={{textAlign:'center',background:'rgba(255,255,255,.12)',borderRadius:9,padding:'7px 4px',border:'1px solid rgba(255,255,255,.2)'}}>
              <div style={{fontWeight:900,fontSize:12,color:k.c}}>{k.v}</div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.55)',fontWeight:700}}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Tabs */}
      <div style={{display:'flex',borderBottom:'2px solid #e0f5f1',background:'#fff',flexShrink:0}}>
        {[{k:'ringkasan',l:'📊 Ringkasan'},{k:'saldo',l:'💰 Saldo'},{k:`transaksi`,l:`💳 Trx (${sh.trx.length})`}].map(t=>(
          <button key={t.k} onClick={()=>setModalTab(t.k)} style={{flex:1,padding:'10px 4px',border:'none',borderBottom:`3px solid ${modalTab===t.k?'#0d9488':'transparent'}`,background:'transparent',color:modalTab===t.k?'#0d9488':'#aaa',fontWeight:700,fontSize:11,cursor:'pointer',fontFamily:'inherit',transition:'all .15s'}}>{t.l}</button>
        ))}
      </div>
      {/* Content */}
      <div style={{overflowY:'auto',flex:1,padding:'16px 20px'}}>
        {/* -- Ringkasan -- */}
        {modalTab==='ringkasan'&&(
          <div>
            {!isAct&&sel!==null&&(
              <div style={{background:sel===0?'linear-gradient(135deg,#065f46,#059669)':sel>0?'linear-gradient(135deg,#78350f,#b45309)':'linear-gradient(135deg,#7f1d1d,#dc2626)',borderRadius:16,padding:'16px 18px',marginBottom:14,display:'flex',alignItems:'center',gap:12}}>
                <div style={{fontSize:36}}>{sel===0?'✅':sel>0?'📈':'📉'}</div>
                <div>
                  <div style={{fontWeight:900,fontSize:16,color:'#fff'}}>{sel===0?'Kas Balance -- Mantap!':sel>0?`Kelebihan ${fmtRp(sel)}`:`Kekurangan ${fmtRp(Math.abs(sel))}`}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,.75)',marginTop:2}}>Sistem: {fmtRp(sistemAkhir)} . Fisik: {fmtRp(sc.uangLaci||0)}</div>
                </div>
              </div>
            )}
            {isAct&&<div style={{background:'linear-gradient(135deg,#065f46,#059669)',borderRadius:14,padding:'12px 16px',marginBottom:14,display:'flex',alignItems:'center',gap:10}}><div style={{fontSize:28}}>🟢</div><div style={{fontWeight:800,fontSize:14,color:'#fff'}}>Shift Sedang Aktif -- Belum Tutup</div></div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              {[{l:'Total Masuk',v:fmtRp(masuk),c:'#0d9488',bg:'#e0faf5'},{l:'Total Keluar',v:fmtRp(keluar),c:'#e74c3c',bg:'#fff0f0'},{l:'Total Fee',v:fmtRp(fee),c:'#d97706',bg:'#fffbeb'},{l:'Uang Sistem',v:fmtRp(sistemAkhir),c:'#555',bg:'#f9fafb'}].map(k=>(
                <div key={k.l} style={{background:k.bg,borderRadius:12,padding:'12px 14px',border:`1px solid ${k.c}22`}}>
                  <div style={{fontSize:10,fontWeight:700,color:k.c,marginBottom:4,textTransform:'uppercase',letterSpacing:'.3px'}}>{k.l}</div>
                  <div style={{fontWeight:900,fontSize:16,color:k.c}}>{k.v}</div>
                </div>
              ))}
            </div>
            <div style={{background:'#f8fffe',borderRadius:12,padding:'12px 14px',border:'1px solid #e0f5f1',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:12,color:'#0d9488',marginBottom:8}}>⏱ Info Shift</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {[{l:'Nama',v:sh.nama},{l:'Kasir',v:sh.userId||'--'},{l:'Buka',v:fmtDT(sh.start_time)},{l:'Tutup',v:sh.end_time?fmtDT(sh.end_time):'Belum tutup'}].map(r=>(
                  <div key={r.l}><div style={{fontSize:10,color:'#aaa',fontWeight:600}}>{r.l}</div><div style={{fontSize:12,fontWeight:700,color:'#1a2e2a',marginTop:1}}>{r.v}</div></div>
                ))}
              </div>
            </div>
            {sc.catatan&&(
              <div style={{background:'#fffbe6',borderRadius:12,padding:'12px 14px',border:'2px solid #fde68a',marginBottom:14}}>
                <div style={{fontWeight:700,fontSize:12,color:'#b45309',marginBottom:5}}>📝 Catatan</div>
                <div style={{fontSize:13,color:'#92400e',fontWeight:600,lineHeight:1.6}}>{sc.catatan}</div>
              </div>
            )}
            {Object.keys(so.saldoApps||{}).length>0&&(
              <div style={{background:'#fff',borderRadius:12,border:'2px solid #e0f5f1',overflow:'hidden'}}>
                <div style={{padding:'10px 14px',background:'#e0faf5',borderBottom:'1px solid #b2f5ea',fontWeight:700,fontSize:12,color:'#0d9488'}}>📱 Saldo Aplikasi</div>
                {Object.entries(so.saldoApps||{}).map(([app,val],i)=>{
                  const sAkhirMap=sc.saldoAppsAkhir||{}; const akhir=sAkhirMap[app]??sAkhirMap[app.toLowerCase()]??null; const delta=akhir!=null?akhir-val:null;
                  return(<div key={app} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 14px',borderTop:i>0?'1px solid #f0faf8':'none',background:i%2===0?'#fff':'#fafffe'}}>
                    <div style={{flex:1,fontWeight:700,fontSize:12}}>{app}</div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:11,color:'#aaa'}}>Awal: {fmtRp(val)}</div>
                      {akhir!=null&&<div style={{fontSize:12,fontWeight:800,color:'#0d9488'}}>Akhir: {fmtRp(akhir)}{delta!=null&&<span style={{marginLeft:6,fontSize:10,color:delta>=0?'#22c55e':'#e74c3c',fontWeight:700}}>({delta>=0?'+':''}{fmtRp(delta)})</span>}</div>}
                    </div>
                  </div>);
                })}
              </div>
            )}
          </div>
        )}
        {/* -- Saldo -- */}
        {modalTab==='saldo'&&(
          <div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <div style={{background:'#e0faf5',borderRadius:12,padding:'13px 15px',border:'1px solid #b2f5ea',textAlign:'center'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#0d9488',marginBottom:5}}>💻 UANG SISTEM</div>
                <div style={{fontWeight:900,fontSize:20,color:'#0d9488'}}>{fmtRp(sistemAkhir)}</div>
                <div style={{fontSize:10,color:'#aaa',marginTop:3}}>Cash awal + net trx</div>
              </div>
              <div style={{background:!isAct?'#f0fdf4':'#f9fafb',borderRadius:12,padding:'13px 15px',border:`1px solid ${!isAct?'#86efac':'#e5e7eb'}`,textAlign:'center'}}>
                <div style={{fontSize:10,fontWeight:700,color:'#16a34a',marginBottom:5}}>🪙 UANG FISIK</div>
                <div style={{fontWeight:900,fontSize:20,color:!isAct?'#16a34a':'#ccc'}}>{sc.uangLaci!=null?fmtRp(sc.uangLaci):'Belum dihitung'}</div>
              </div>
            </div>
            {sel!==null&&(
              <div style={{background:sel===0?'#f0fdf4':sel>0?'#fffbeb':'#fff5f5',borderRadius:12,padding:'14px 16px',marginBottom:14,border:`2px solid ${sel===0?'#86efac':sel>0?'#fde047':'#fca5a5'}`}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:sel===0?'#16a34a':sel>0?'#ca8a04':'#dc2626'}}>{sel===0?'✅ Kas Balance':sel>0?'📈 Kelebihan':'📉 Kekurangan'}</div>
                    <div style={{fontSize:11,color:'#888',marginTop:2}}>Selisih fisik vs sistem</div>
                  </div>
                  <div style={{fontWeight:900,fontSize:22,color:sel===0?'#16a34a':sel>0?'#ca8a04':'#dc2626'}}>{sel===0?'Rp 0':(sel>0?'+':'-')+fmtRp(Math.abs(sel))}</div>
                </div>
              </div>
            )}
            <div style={{background:'#fff',borderRadius:12,border:'2px solid #e0f5f1',padding:'14px 16px',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:11,color:'#0d9488',marginBottom:8,textTransform:'uppercase',letterSpacing:'.3px'}}>Rincian Perhitungan</div>
              {[{l:'Cash Kembalian Awal',v:so.cashKemb||0,c:'#0d9488'},{l:'+ Total Masuk',v:masuk,c:'#16a34a'},{l:'− Total Keluar',v:-keluar,c:'#dc2626'},{l:'= Uang Sistem',v:sistemAkhir,c:'#0d9488',bold:true},{l:'Uang Fisik (hitung)',v:sc.uangLaci??null,c:'#555'},{l:'Selisih',v:sel,c:sel===0?'#16a34a':sel>0?'#ca8a04':'#dc2626',bold:true}].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderTop:i>0?'1px dotted #f0f0f0':'none',fontWeight:r.bold?800:600,fontSize:r.bold?13:12}}>
                  <span style={{color:'#555'}}>{r.l}</span>
                  <span style={{color:r.c}}>{r.v===null?'--':fmtRp(Math.abs(r.v||0))}</span>
                </div>
              ))}
            </div>
            {Object.keys(so.saldoApps||{}).length>0&&(
              <div style={{background:'#fff',borderRadius:12,border:'2px solid #e0f5f1',overflow:'hidden'}}>
                <div style={{padding:'10px 14px',background:'#e0faf5',borderBottom:'1px solid #b2f5ea',fontWeight:700,fontSize:12,color:'#0d9488'}}>📱 Perubahan Saldo Aplikasi</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <thead><tr style={{background:'#f8fffe'}}>{['Aplikasi','Awal','Akhir','Δ'].map(h=><th key={h} style={{padding:'8px 13px',textAlign:'left',fontWeight:700,color:'#0d9488',fontSize:11}}>{h}</th>)}</tr></thead>
                  <tbody>{Object.entries(so.saldoApps||{}).map(([app,awal],i)=>{
                    const saldoAkhirMap=sc.saldoAppsAkhir||{}; const akhir=saldoAkhirMap[app]??saldoAkhirMap[app.toLowerCase()]??null; const delta=akhir!=null?akhir-awal:null;
                    return(<tr key={app} style={{borderTop:'1px solid #f0faf8',background:i%2===0?'#fff':'#fafffe'}}>
                      <td style={{padding:'8px 13px',fontWeight:700}}>{app}</td>
                      <td style={{padding:'8px 13px',color:'#888'}}>{fmtRp(awal)}</td>
                      <td style={{padding:'8px 13px',fontWeight:700,color:'#0d9488'}}>{akhir!=null?fmtRp(akhir):'--'}</td>
                      <td style={{padding:'8px 13px',fontWeight:800,color:delta==null?'#ccc':delta>=0?'#16a34a':'#dc2626'}}>{delta==null?'--':(delta>=0?'+':'')+fmtRp(delta)}</td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            )}
          </div>
        )}
        {/* -- Transaksi -- */}
        {modalTab==='transaksi'&&(
          <div>
            {sh.trx.length===0?<div style={{textAlign:'center',color:'#ccc',padding:32}}>Belum ada transaksi</div>
            :sh.trx.sort((a,b)=>new Date(b.waktu)-new Date(a.waktu)).map((t,i)=>(
              <div key={t.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 0',borderTop:i>0?'1px solid #f0faf8':'none'}}>
                <div style={{width:32,height:32,borderRadius:9,flexShrink:0,background:t.netNominal>0?'#e0faf5':'#fff0f0',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15}}>{t.netNominal>0?'⬇':'⬆'}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.nama}</div>
                  <div style={{fontSize:10,color:'#aaa',marginTop:2,display:'flex',gap:8}}>
                    <span>{fmtDT(t.waktu)}</span>
                    {(t.fee||0)>0&&<span style={{color:'#d97706',fontWeight:600}}>+fee {fmtRp(t.fee)}</span>}
                  </div>
                </div>
                <div style={{fontWeight:900,fontSize:14,flexShrink:0,color:t.netNominal>0?'#0d9488':'#dc2626'}}>{t.netNominal>0?'+':''}{fmtRp(Math.abs(t.netNominal))}</div>
              </div>
            ))}
            {sh.trx.length>0&&(
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginTop:14,paddingTop:14,borderTop:'2px solid #e0f5f1'}}>
                {[{l:'Masuk',v:fmtRp(masuk),c:'#0d9488',bg:'#e0faf5'},{l:'Keluar',v:fmtRp(keluar),c:'#dc2626',bg:'#fff0f0'},{l:'Fee',v:fmtRp(fee),c:'#d97706',bg:'#fffbeb'}].map(k=>(
                  <div key={k.l} style={{background:k.bg,borderRadius:10,padding:'9px 12px',textAlign:'center',border:`1px solid ${k.c}22`}}>
                    <div style={{fontWeight:900,fontSize:13,color:k.c}}>{k.v}</div>
                    <div style={{fontSize:9,fontWeight:700,color:k.c,opacity:.8,marginTop:2}}>{k.l}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);
}


// -- Laporan Bank List (realtime) -- per outlet + per shift accordion ---------
function LaporanBankList({ bankTrxMap, bankShiftLogs, shiftLogs, outlets, filterOutlet, dateFrom, dateTo, onSelectShift }) {
  const [bankTrx,       setBankTrx]       = useState([]);
  const [bankShiftData, setBankShiftData] = useState([]);
  const [activeShifts,  setActiveShifts]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [selShift,      setSelShift]      = useState(null);

  const loadAll = async () => {
    try {
      const [trxRes, logsRes, activeRes] = await Promise.all([
        supabase.from('bank_transactions').select('*').order('created_at',{ascending:false}).limit(2000),
        supabase.from('bank_shift_logs').select('*').order('created_at',{ascending:false}).limit(300),
        supabase.from('bank_shifts').select('*'),
      ]);
      setBankTrx((trxRes.data||[]).map(r=>({
        id:r.id, tgl:r.tgl, waktu:r.waktu||r.created_at,
        shiftId:r.shift_id, nama:r.nama, jenis:r.jenis,
        fee:r.fee||0, nominal:r.nominal, netNominal:r.net_nominal,
        outletId:r.outlet_id,
      })));
      // Normalise bank_shift_logs fields
      setBankShiftData((logsRes.data||[]).map(l=>({
        ...l,
        // start_time bisa string waktu, ISO, atau format lain
        start_time: l.start_time||l.created_at||null,
        end_time:   l.end_time||null,
        // selisih ada di saldo_close
        _selisih:   (l.saldo_close?.selisih)??null,
        _catatan:   l.saldo_close?.catatan||'',
        _namaShift: l.saldo_open?.namaShift||l.nama||l.user_id||'Shift',
      })));
      setActiveShifts(activeRes.data||[]);
      setLastRefresh(new Date().toLocaleTimeString('id-ID'));
    } catch(e){ console.error('LaporanBankList load:', e); }
    setLoading(false);
  };

  useEffect(()=>{
    loadAll();
    const iv = setInterval(loadAll, 10000);
    const ch = supabase.channel('laporan-bank-rt-v4')
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_transactions'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_shift_logs'},()=>loadAll())
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_shifts'},()=>loadAll())
      .subscribe();
    return()=>{ clearInterval(iv); supabase.removeChannel(ch); };
  },[]);

  // Build shift list dari closed + active
  // Parse date range
  const parseDate = s => { try{ const d=new Date(s); return isNaN(d)?null:d; }catch{return null;} };
  const filterFrom = dateFrom ? new Date(dateFrom) : null;
  const filterTo   = dateTo   ? new Date(dateTo)   : null;
  if(filterFrom) filterFrom.setHours(0,0,0,0);
  if(filterTo)   filterTo.setHours(23,59,59,999);
  const inRange = (startTime) => {
    if(!filterFrom||!filterTo) return true;
    if(!startTime) return true; // tidak ada tanggal → tampilkan
    const d = parseDate(startTime);
    if(!d) return true; // tidak bisa parse → tampilkan
    return d>=filterFrom && d<=filterTo;
  };

  const buildShifts = () => {
    const result = [];

    // Closed shifts dari bank_shift_logs
    bankShiftData.forEach(l=>{
      if(filterOutlet!=='all' && l.outlet_id!==filterOutlet) return;
      if((l.saldo_close||{}).disembunyikan) return;
      // Coba ambil tanggal dari berbagai field
      const startRaw = l.start_time||l.created_at||null;
      if(!inRange(startRaw)) return;
      const trxList = bankTrx.filter(t=>t.shiftId===l.id);
      const masuk   = trxList.filter(t=>(t.netNominal||0)>0).reduce((s,t)=>s+(t.netNominal||0),0);
      const keluar  = trxList.filter(t=>(t.netNominal||0)<0).reduce((s,t)=>s+Math.abs(t.netNominal||0),0);
      const fee     = trxList.reduce((s,t)=>s+(t.fee||0),0);
      const outletObj = outlets.find(o=>o.id===l.outlet_id)||{nama:'--'};
      result.push({
        id:l.id, outletId:l.outlet_id, outletNama:outletObj.nama,
        nama:l._namaShift||(l.saldo_open?.namaShift)||l.nama||l.user_id||'Shift',
        userId:l.user_id||'',
        start_time:startRaw,
        end_time:l.end_time||null,
        status:'closed',
        masuk, keluar, fee,
        trx:trxList,          // array untuk BankShiftDetailModal
        trxCount:trxList.length, // number untuk display
        selisih:l._selisih??(l.saldo_close?.selisih)??null,
        catatan:l._catatan||(l.saldo_close?.catatan)||'',
        saldo_open:l.saldo_open||{},
        saldo_close:l.saldo_close||{},
      });
    });

    // Active shifts dari bank_shifts
    activeShifts.forEach(s=>{
      if(filterOutlet!=='all' && s.outlet_id!==filterOutlet) return;
      const sd=s.saldo_data||{};
      const startRaw = s.start_time||s.created_at||null;
      // Active shift selalu tampil (tidak difilter tanggal karena sedang berjalan)
      const trxList = bankTrx.filter(t=>t.shiftId===s.id);
      const masuk   = trxList.filter(t=>(t.netNominal||0)>0).reduce((s2,t)=>s2+(t.netNominal||0),0);
      const keluar  = trxList.filter(t=>(t.netNominal||0)<0).reduce((s2,t)=>s2+Math.abs(t.netNominal||0),0);
      const fee     = trxList.reduce((s2,t)=>s2+(t.fee||0),0);
      const outletObj = outlets.find(o=>o.id===s.outlet_id)||{nama:'--'};
      result.push({
        id:s.id, outletId:s.outlet_id, outletNama:outletObj.nama,
        nama:sd.namaShift||s.nama||s.user_id||'Shift Aktif',
        userId:s.user_id||'',
        start_time:startRaw, end_time:null,
        status:'active',
        masuk, keluar, fee,
        trx:trxList,          // array untuk BankShiftDetailModal
        trxCount:trxList.length, // number untuk display
        selisih:null, catatan:'',
        saldo_open:sd||{},
        saldo_close:{},
      });
    });

    return result.sort((a,b)=>{
      const ta=a.start_time?new Date(a.start_time):new Date(0);
      const tb=b.start_time?new Date(b.start_time):new Date(0);
      return tb-ta;
    });
  };

  const shifts = buildShifts();

  if(loading) return <div style={{textAlign:'center',padding:32,color:'#0d9488',fontSize:13,fontWeight:700}}>⏳ Memuat data bank...</div>;

  return (
    <div>
      {/* Filter bar -- Live + Refresh */}
      <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
        <div style={{display:'flex',alignItems:'center',gap:6,background:'#e0faf5',borderRadius:9,padding:'5px 12px',fontSize:11,color:'#0d9488',fontWeight:700}}>
          🔴 Live{lastRefresh&&<span style={{opacity:.7}}> . {lastRefresh}</span>}
        </div>
        <span style={{fontSize:11,color:'#94a3b8',fontWeight:600}}>{shifts.length} shift</span>
        <button onClick={loadAll} style={{marginLeft:'auto',background:'#f0faf8',border:'2px solid #b2ede6',borderRadius:9,padding:'5px 12px',fontSize:11,fontWeight:700,color:'#0d9488',cursor:'pointer',fontFamily:'inherit'}}>🔄 Refresh</button>
      </div>

      {/* Empty */}
      {shifts.length===0&&(
        <div style={{textAlign:'center',padding:40,color:'#94a3b8'}}>
          <div style={{fontSize:36,marginBottom:8}}>📭</div>
          <div style={{fontWeight:700,fontSize:14}}>Tidak ada shift dalam rentang ini</div>
          <div style={{fontSize:11,marginTop:4}}>Coba ubah rentang tanggal atau filter outlet</div>
        </div>
      )}

      {/* Shift cards -- identik layout dengan Laporan Kasir */}
      {shifts.map(s=>{
        const startDate = s.start_time ? new Date(s.start_time) : null;
        const isActive  = s.status==='active';
        const hasIssue  = s.selisih!==null && s.selisih!==0;
        const saldo     = s.masuk - s.keluar;
        const dateLabel = startDate&&!isNaN(startDate) ?
          startDate.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '';

        return(
        <div key={s.id}
          onClick={()=>setSelShift(s)}
          style={{background:'#fff',borderRadius:13,padding:'13px 16px',marginBottom:10,
            border:`2px solid ${hasIssue?'#fca5a522':'#e0f5f1'}`,
            cursor:'pointer',transition:'all .2s',boxShadow:'0 2px 8px rgba(0,0,0,.04)'}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor='#0d9488';e.currentTarget.style.boxShadow='0 2px 12px rgba(13,148,136,.12)';}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor=hasIssue?'#fca5a522':'#e0f5f1';e.currentTarget.style.boxShadow='0 2px 8px rgba(0,0,0,.04)';}}>

          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12,flex:1,minWidth:0}}>

              {/* Date badge -- identik dengan kasir */}
              {startDate&&!isNaN(startDate)&&(
                <div style={{background:isActive?'#e0faf5':'#f8fafc',
                  borderRadius:10,padding:'8px 10px',textAlign:'center',flexShrink:0,
                  border:`1px solid ${isActive?'#b2f5ea':'#e2e8f0'}`,minWidth:52}}>
                  <div style={{fontWeight:900,fontSize:22,color:isActive?'#0d9488':'#1e293b',lineHeight:1}}>
                    {startDate.getDate().toString().padStart(2,'0')}
                  </div>
                  <div style={{fontSize:9,fontWeight:700,color:'#94a3b8',marginTop:1}}>
                    {['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agt','Sep','Okt','Nov','Des'][startDate.getMonth()]}
                  </div>
                  <div style={{fontSize:8,color:'#cbd5e1',fontWeight:600}}>{startDate.getFullYear()}</div>
                </div>
              )}

              <div style={{flex:1,minWidth:0}}>
                {/* Nama + badges */}
                <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap',marginBottom:4}}>
                  <span style={{fontWeight:800,fontSize:14,color:'#1a2e2a'}}>{s.nama}</span>
                  {dateLabel&&<span style={{fontSize:10,color:'#94a3b8',fontWeight:600,background:'#f1f5f9',padding:'2px 8px',borderRadius:20}}>📅 {dateLabel}</span>}
                  <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                    background:isActive?'#e0faf5':'#f1f5f9',
                    color:isActive?'#0d9488':'#64748b',
                    border:`1px solid ${isActive?'#a3e9c8':'#e2e8f0'}`}}>
                    {isActive?'🟢 Aktif':'⚫ Tutup'}
                  </span>
                  {!isActive&&s.selisih===0&&<span style={{fontSize:10,fontWeight:700,color:'#16a34a',background:'#ecfdf5',padding:'2px 8px',borderRadius:20}}>✅ Balance</span>}
                  {!isActive&&s.selisih!==null&&s.selisih>0&&<span style={{fontSize:10,fontWeight:700,color:'#ca8a04',background:'#fffbeb',padding:'2px 8px',borderRadius:20}}>📈 +{fmtRp(s.selisih)}</span>}
                  {!isActive&&s.selisih!==null&&s.selisih<0&&<span style={{fontSize:10,fontWeight:700,color:'#dc2626',background:'#fff1f2',padding:'2px 8px',borderRadius:20}}>📉 -{fmtRp(Math.abs(s.selisih))}</span>}
                </div>
                {/* Sub info */}
                <div style={{fontSize:11,color:'#aaa',display:'flex',gap:12,flexWrap:'wrap'}}>
                  <span>🏪 {s.outletNama}</span>
                  <span>💳 {s.trxCount||s.trx?.length||0} transaksi</span>
                  <span style={{color:'#0d9488'}}>⬇ {fmtRp(s.masuk)}</span>
                  <span style={{color:'#e74c3c'}}>⬆ {fmtRp(s.keluar)}</span>
                </div>
                {s.catatan&&(
                  <div style={{marginTop:5,fontSize:10,color:'#b7770d',background:'#fffbe6',
                    borderRadius:6,padding:'2px 8px',border:'1px solid #fde68a',display:'inline-block'}}>
                    📝 {s.catatan.substring(0,50)}{s.catatan.length>50?'...':''}
                  </div>
                )}
              </div>
            </div>

            {/* Nilai kanan */}
            <div style={{textAlign:'right',display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0,marginLeft:12}}>
              <div style={{fontWeight:900,fontSize:16,color:saldo>=0?'#0d9488':'#dc2626'}}>{fmtRp(saldo)}</div>
              <div style={{fontSize:10,color:'#aaa'}}>saldo bersih</div>
              <span style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,
                background:isActive?'#e0faf5':'#f1f5f9',color:isActive?'#0d9488':'#64748b'}}>
                {isActive?'🟢 Aktif':'⚫ Tutup'}
              </span>
            </div>
          </div>
        </div>
        );
      })}

      {/* Modal detail -- komponen BankShiftDetailModal tidak diubah */}
      {selShift&&<BankShiftDetailModal shift={selShift} onClose={()=>setSelShift(null)}/>}
    </div>
  );
}


function LaporanPage({ transactions, outlets, onBack }) {
  const [filterOutlet,  setFilterOutlet]  = useState("all");
  const [filterShift,   setFilterShift]   = useState("all");
  const [selectedShift, setSelectedShift] = useState(null);
  const [mainTab,       setMainTab]       = useState("kasir"); // kasir | bank
  const [detailTab,     setDetailTab]     = useState("kasir");
  const [bankShiftLogs, setBankShiftLogs] = useState({});
  const [bankTrxMap,    setBankTrxMap]    = useState({}); // shiftId -> trx[]

  const calcOmset = list=>list.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);

  // Deklarasi shiftLogs di sini agar bisa dipakai di groupArr di bawah
  const [shiftLogs,        setShiftLogs]        = useState({});
  const [shiftLogsLoading, setShiftLogsLoading] = useState(true);
  const [refreshTrigger,   setRefreshTrigger]   = useState(0);
  const [freshTransactions,setFreshTransactions] = useState(null); // null = belum load
  // -- Filter tanggal di Laporan ---------------------------------------------
  const [laporanDateFrom, setLaporanDateFrom] = useState(()=>{const d=new Date();d.setDate(d.getDate()-29);return d.toISOString().split('T')[0];});
  const [laporanDateTo,   setLaporanDateTo]   = useState(()=>new Date().toISOString().split('T')[0]);
  const applyLaporanPreset = (k) => {
    const n=new Date();
    if(k==='today') {const s=n.toISOString().split('T')[0];setLaporanDateFrom(s);setLaporanDateTo(s);}
    else if(k==='7d')  {const d=new Date(n);d.setDate(n.getDate()-6); setLaporanDateFrom(d.toISOString().split('T')[0]);setLaporanDateTo(n.toISOString().split('T')[0]);}
    else if(k==='30d') {const d=new Date(n);d.setDate(n.getDate()-29);setLaporanDateFrom(d.toISOString().split('T')[0]);setLaporanDateTo(n.toISOString().split('T')[0]);}
    else if(k==='month'){const d=new Date(n.getFullYear(),n.getMonth(),1);setLaporanDateFrom(d.toISOString().split('T')[0]);setLaporanDateTo(n.toISOString().split('T')[0]);}
  };
  // Filter groupArr berdasarkan tanggal
  const isInLaporanRange = (group) => {
    if(!laporanDateFrom||!laporanDateTo) return true;
    const from=new Date(laporanDateFrom); from.setHours(0,0,0,0);
    const to  =new Date(laporanDateTo);   to.setHours(23,59,59,999);
    const log = shiftLogs[group.key];
    // shiftLogs fields: waktuBuka (ISO from start_time), waktuTutup
    // group.items[].date = "DD/MM/YYYY"
    const candidates = [
      log?.waktuBuka,   // ISO datetime dari start_time
      log?.waktuTutup,
      group.items?.[0]?.date,  // "DD/MM/YYYY" dari transaksi
      group.items?.[group.items.length-1]?.date,
    ].filter(Boolean);
    const parseAny = (raw) => {
      const s = String(raw);
      const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if(slash) return new Date(+slash[3], +slash[2]-1, +slash[1]);
      const d = new Date(s);
      return isNaN(d) ? null : d;
    };
    for(const raw of candidates) {
      const d = parseAny(raw);
      if(d) return d>=from && d<=to;
    }
    return true; // tidak bisa tentukan → tampilkan
  };

  const allShifts = [...new Map(transactions.filter(t=>t.shiftId).map(t=>[t.shiftId,{id:t.shiftId,nama:t.shiftNama||t.shiftId}])).values()];

  // Gunakan freshTransactions (dari Supabase realtime) atau fallback ke prop
  const txSource = freshTransactions !== null ? freshTransactions : (transactions||[]);
  const filtered = txSource.filter(t=>
    (filterOutlet==="all"||t.outletId===filterOutlet)&&
    (filterShift==="all"||(filterShift==="noshift"?!t.shiftId:t.shiftId===filterShift))
  );

  const groups = {};
  filtered.forEach(t=>{
    const key=t.shiftId||"no-shift";
    const logEntry=shiftLogs[t.shiftId];
    const label=logEntry?.namaShift||t.shiftNama||t.kasir||"Tanpa Shift";
    const outletNama=outlets.find(o=>o.id===t.outletId)?.nama||t.outletId||"--";
    if(!groups[key]) groups[key]={key,label,outletNama,outletId:t.outletId,items:[]};
    groups[key].items.push(t);
  });
  // KRITIS: Tambahkan shift dari shift_logs yang belum ada di txSource
  // Menangani: shift baru ditutup tapi transactions belum reload
  Object.entries(shiftLogs).forEach(([k,v])=>{
    if(k.length>32) return; // skip outlet_date composite keys
    if(groups[k]) return;   // sudah ada
    if(v.type!=="closed"&&v.type!=="open") return;
    const oId=v.outletId||'';
    if(filterOutlet!=="all"&&oId&&oId!==filterOutlet) return;
    if(filterShift!=="all"&&k!==filterShift) return;
    const outletNama=outlets.find(o=>o.id===oId)?.nama||oId||"--";
    groups[k]={key:k,label:v.namaShift||"Shift",outletNama,outletId:oId,items:[]};
  });
  const groupArr=Object.values(groups).sort((a,b)=>{
    // Sort by waktu tutup/buka terbaru di atas
    const sa=shiftLogs[a.key]; const sb=shiftLogs[b.key];
    const ta=sa?.waktuTutup||sa?.waktuBuka||a.items[0]?.time||'';
    const tb=sb?.waktuTutup||sb?.waktuBuka||b.items[0]?.time||'';
    return tb.localeCompare(ta);
  });

  const omsetTotal=calcOmset(filtered);
  const itemTotal =filtered.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);

  // -- Detail shift: ringkasan produk terjual + saldo ----------------------
  const getShiftDetail = (group) => {
    const prodMap={};
    group.items.forEach(t=>{
      t.items.filter(i=>!i.refunded).forEach(i=>{
        if(!prodMap[i.name]) prodMap[i.name]={name:i.name,qty:0,omset:0};
        prodMap[i.name].qty+=i.qty;
        prodMap[i.name].omset+=i.price*i.qty;
      });
    });
    return Object.values(prodMap).sort((a,b)=>b.qty-a.qty);
  };

  // Ambil info saldo dari shift_logs Supabase atau localStorage fallback
  useEffect(()=>{
    setShiftLogsLoading(true);
    const loadLogs = async () => {
      try {
        // Reload transactions langsung dari Supabase agar selalu fresh
        // (tidak bergantung pada prop transactions yang mungkin stale)
        let freshTx = [];
        try {
          const {data:txData} = await supabase
            .from('transactions')
            .select('id,shift_id,outlet_id,total,date,kasir,items')
            .order('created_at',{ascending:false})
            .limit(2000);
          // Backup transaksi ke localStorage untuk riwayat offline
          if(txData?.length>0) try{localStorage.setItem('laporan_tx_backup',JSON.stringify(txData.slice(0,100)));}catch{}
          freshTx = (txData||[]).map(t=>({
            id:     t.id,
            shiftId:t.shift_id,
            outletId:t.outlet_id,
            total:  t.total||0,
            date:   t.date,
            kasir:  t.kasir,
            items:  typeof t.items==='string'?JSON.parse(t.items||'[]'):t.items||[],
          }));
        } catch(txErr){ freshTx = transactions||[]; }
        setFreshTransactions(freshTx);

        // Load closed shifts dari shift_logs
        const logs = await dbShift.getShiftLogs();
        const m={};
        logs.forEach(l=>{
          const so = l.saldo_open || {};
          const sc = l.saldo_close || {};
          const rekap = l.rekap || {};
          m[l.id]={
            type:"closed",
            namaShift:      l.nama,
            waktuBuka:      l.start_time,
            waktuTutup:     l.end_time,
            saldoApps:      so.saldoApps || so.saldo_apps || {},
            cashKembalian:  so.cashKembalian || so.cash_kembalian || 0,
            totalSaldoApps: so.totalSaldoApps || 0,
            saldoAppsAkhir: sc.saldoAppsAkhir || sc.saldoAppsC || sc.saldo_apps_akhir || {},
            cashKembClose:  sc.cashKembClose   || sc.cashKembC  || 0,
            setorTunai:     rekap.setorTunai    || 0,
            hutang:         rekap.hutang        || 0,
            pending:        rekap.pending       || 0,
            pengeluaran:    rekap.pengeluaran   || 0,
            noteKlr:        rekap.noteKlr       || "",
            kasNyataSystem: rekap.kasNyataSystem || sc.kasNyataSystem || sc.uangSistem || 0,
            kasNyataFisik:  rekap.kasNyataFisik  || sc.kasNyataFisik  || sc.uangLaci   || 0,
            selisih:        rekap.selisih ?? sc.selisih ?? 0,
            notes:          rekap.notes || sc.catatan || "",
          };
          // Juga index by outlet_id+date agar mudah dicari
          const dKey = l.outlet_id+'_'+(l.start_time?.substring(0,10)||'');
          m[dKey] = m[l.id];
        });

        // Backup shift logs ke localStorage
        try{localStorage.setItem('laporan_shift_backup',JSON.stringify(Object.keys(m).slice(0,50)));}catch{}
        // Load active shifts (belum ditutup) dari active_shifts
        let activeShifts = [];
        try {
          const {data:asd} = await supabase.from('active_shifts').select('*');
          activeShifts = asd||[];
        }catch{}
        activeShifts.forEach(s=>{
          const sd = s.saldo_data || {};
          m[s.id] = {
            type:"open",
            namaShift:      s.nama,
            waktuBuka:      s.start_time,
            waktuTutup:     null,
            saldoApps:      sd.saldoApps || {},
            cashKembalian:  sd.cashKembalian || 0,
            totalSaldoApps: sd.totalSaldoApps || 0,
          };
        });

        setShiftLogs(m);

        // Load bank shift logs
        let bankLogs = [];
        try {
          const {data:bld} = await supabase.from('bank_shift_logs').select('*')
            .order('created_at',{ascending:false}).limit(200);
          bankLogs = bld||[];
        }catch{}
        const bm={};
        (bankLogs||[]).forEach(l=>{
          const so = l.saldo_open||{};
          const sc = l.saldo_close||{};
          const hiddenNote = l.hidden_note || '';
          const isHidden   = l.hidden_by_kasir || false;
          // Store by both id and outlet+date for flexible lookup
          const entry = {
            id: l.id, outletId: l.outlet_id, userId: l.user_id,
            nama: l.nama, waktuBuka: l.start_time, waktuTutup: l.end_time,
            saldoAwal:  so.saldoApps||so.saldo_apps||{},
            cashKemb:   so.cashKemb||so.cashKembalian||0,
            saldoAkhir: sc.saldoAppsAkhir||sc.saldoAppsC||sc.saldo_apps_akhir||{},
            uangLaci:   sc.uangLaci||0, uangSistem: sc.uangSistem||0,
            selisih:    sc.selisih??0,  catatan: sc.catatan||'',
            isHidden, hiddenNote,
          };
          bm[l.id] = entry;
          // Also index by outlet+date
          const dateKey = l.outlet_id+'_'+(l.start_time?.substring(0,10)||'');
          bm[dateKey] = entry;
        });
        setBankShiftLogs(bm);

        // Load bank transactions untuk mapping per shift
        const allBankTrx = await dbBank.getTransactions().catch(()=>[]);
        const btm={};
        const normD = (d) => {
          if(!d) return '';
          if(d.includes('-')) return d.substring(0,10);
          const p=d.split('/');
          if(p.length===3) return `${p[2]}-${String(p[1]).padStart(2,'0')}-${String(p[0]).padStart(2,'0')}`;
          return d;
        };
        allBankTrx.forEach(t=>{
          const key    = t.outletId+'_'+(t.tgl||'');
          const keyISO = t.outletId+'_'+normD(t.tgl||'');
          if(!btm[key]) btm[key]=[];
          btm[key].push(t);
          if(keyISO!==key){ if(!btm[keyISO]) btm[keyISO]=[]; btm[keyISO].push(t); }
        });
        setBankTrxMap(btm);

      } catch(e){
        console.warn('[Laporan] loadLogs error -- fallback localStorage:', e.message||e);
        // Jangan kosongkan data yang sudah ada -- pakai yang terakhir berhasil
        // freshTx dari localStorage backup
        try{
          const backupTx = JSON.parse(localStorage.getItem('laporan_tx_backup')||'[]');
          if(backupTx.length>0 && freshTransactions===null){
            const mapped = backupTx.map(t=>({
              id:t.id, shiftId:t.shift_id||t.shiftId, outletId:t.outlet_id||t.outletId,
              total:t.total||0, date:t.date, kasir:t.kasir,
              items:(t.items||[]).map(i=>typeof i==='string'?JSON.parse(i):i),
            }));
            setFreshTransactions(mapped);
            console.log('[Laporan] Loaded', mapped.length, 'trx dari localStorage backup');
          }
        }catch{}
      }
      setShiftLogsLoading(false);
    };
    loadLogs();
    // Reload setiap 5 detik -- lebih responsif
    const iv = setInterval(loadLogs, 5000);

    // Realtime komprehensif -- semua event yang bisa mengubah laporan shift
    const ch = supabase.channel('laporan-shift-rt-v2')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'shift_logs'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'shift_logs'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'shift_logs'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'active_shifts'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'active_shifts'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'active_shifts'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'transactions'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bank_transactions'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'bank_transactions'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bank_shift_logs'},()=>{ loadLogs(); })
      .subscribe();
    return ()=>{ clearInterval(iv); supabase.removeChannel(ch); };
  },[refreshTrigger]);const getShiftSaldo = (shiftId) => {
    // Prioritas 1: Supabase shift_logs by shift ID
    if(shiftLogs[shiftId]) return shiftLogs[shiftId];

    // Prioritas 2: Cari di shift_logs by outletId+date (jika shiftId tidak match)
    const tx = transactions.find(t=>t.shiftId===shiftId);
    if(tx){
      const outletId = tx.outletId;
      const date = tx.date||'';
      const normD = (d) => {
        if(!d) return '';
        if(d.includes('-')) return d.substring(0,10);
        const p=d.split('/');
        if(p.length===3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
        return d;
      };
      const dateKey = outletId+'_'+normD(date);
      if(shiftLogs[dateKey]) return shiftLogs[dateKey];
    }

    // Prioritas 3: localStorage dengan type closed
    try{
      const s = localStorage.getItem(`ammar_shift_saldo_${shiftId}`);
      if(s){
        const parsed = JSON.parse(s);
        return parsed;
      }
    }catch{}
    return null;
  };

  // -- Modal detail shift ----------------------------------------------------
  if(selectedShift){
    const group=selectedShift;
    const detail=getShiftDetail(group);
    const gOmset=calcOmset(group.items);
    const gItems=group.items.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
    const saldo=getShiftSaldo(group.key);

    // Shift dianggap CLOSED jika:
    // 1. Ada di shift_logs dengan type closed / waktuTutup
    // 2. ATAU: tidak ada di shiftLogs sama sekali (shift lama sebelum sistem ini)
    // 3. ATAU: ada di shiftLogs tapi type open DAN shift ini ada di active_shifts
    const shiftInLogs = shiftLogs[group.key];
    const isInActiveShifts = shiftInLogs?.type === "open"; // masih aktif di active_shifts

    const isClosed = 
      (saldo?.type==="closed") || !!saldo?.waktuTutup ||   // punya data closing
      (shiftInLogs?.type==="closed") || !!shiftInLogs?.waktuTutup || // di shift_logs sebagai closed
      (!shiftInLogs && !saldo);  // tidak ada data sama sekali = shift lama = anggap closed

    const isActive = isInActiveShifts && !saldo?.type; // aktif hanya jika benar di active_shifts

    // Bank data untuk shift ini
    const outletId = group.outletId || group.items[0]?.outletId || '';
    const tglShift = group.items[0]?.date||'';
    // Normalize tanggal: "30/5/2026" → "2026-05-30" agar match dengan bankShiftLogs key
    const normDate = (d) => {
      if(!d) return '';
      if(d.includes('-')) return d.substring(0,10); // sudah ISO
      const parts = d.split('/');
      if(parts.length===3){
        const [day,month,year] = parts;
        return `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      }
      return d;
    };
    const tglISO   = normDate(tglShift);
    const bankKey  = outletId+'_'+tglISO;
    // Also try with id format in case transactions store dates differently
    const bankData = bankShiftLogs[bankKey] || bankShiftLogs[outletId+'_'+tglShift];
    const bankTrx  = bankTrxMap[bankKey] || bankTrxMap[outletId+'_'+tglShift] || [];
    const bankMasuk  = bankTrx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
    const bankKeluar = bankTrx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
    const uangSistemBank = (bankData?.cashKemb||0) + bankMasuk - bankKeluar;

    return (
      <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
        <SubHeader title={`📋 Detail Shift: ${group.label}`} onBack={()=>setSelectedShift(null)}
          badge={group.outletNama}
        />

        {/* Tab kasir / bank */}
        <div style={{background:`linear-gradient(135deg,#0a7a70,#0d9488)`,display:"flex"}}>
          {[{k:"kasir",l:"🧾 Laporan Kasir"},{k:"bank",l:"🏦 Laporan Bank"}].map(t=>(
            <button key={t.k} onClick={()=>setDetailTab(t.k)}
              style={{flex:1,padding:"10px 0",border:"none",borderBottom:`3px solid ${detailTab===t.k?"#fff":"transparent"}`,background:"transparent",color:detailTab===t.k?"#fff":"rgba(255,255,255,.55)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {t.l}
            </button>
          ))}
        </div>

        <div style={{padding:"14px 18px",maxWidth:860,margin:"0 auto"}}>

          {/* -- STATUS SHIFT -- */}
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{background:isActive?"#e8f8f4":"#f0f0f0",border:`2px solid ${isActive?"#2ecc71":"#aaa"}`,borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:800,color:isActive?"#2ecc71":"#888",display:"flex",alignItems:"center",gap:5}}>
              {isActive?"🟢 SHIFT MASIH AKTIF":"⚫ SHIFT SUDAH DITUTUP"}
            </div>
            {saldo?.waktuBuka&&<span style={{fontSize:11,color:"#aaa"}}>Buka: {saldo.waktuBuka}</span>}
            {saldo?.waktuTutup&&<span style={{fontSize:11,color:"#aaa"}}>Tutup: {saldo.waktuTutup}</span>}
            {/* Badge balance */}
            {isClosed&&saldo?.selisih!==undefined&&(
              <div style={{
                background:saldo.selisih===0?"#e8f8f4":saldo.selisih>0?"#fffbe6":"#fff0f0",
                border:`2px solid ${saldo.selisih===0?"#2ecc71":saldo.selisih>0?"#f39c12":"#e74c3c"}`,
                borderRadius:20,padding:"5px 14px",fontSize:12,fontWeight:800,
                color:saldo.selisih===0?"#2ecc71":saldo.selisih>0?"#f39c12":"#e74c3c",
                display:"flex",alignItems:"center",gap:5
              }}>
                {saldo.selisih===0?"✅ KAS BALANCE":saldo.selisih>0?"📈 LEBIH "+fmtRp(saldo.selisih):"📉 KURANG "+fmtRp(Math.abs(saldo.selisih))}
              </div>
            )}
          </div>

          {/* == TAB KASIR == */}
          {detailTab==="kasir"&&(<>

          {/* Ringkasan shift */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            {[
              {l:"Omset Bersih",  v:fmtRp(gOmset),        c:"#0d9488", bg:"linear-gradient(135deg,#0d9488,#14b8a6)", tc:"#fff"},
              {l:"Item Terjual",  v:`${gItems} pcs`,        c:"#8e44ad", bg:"#f5eeff",                                tc:"#8e44ad"},
              {l:"Transaksi",     v:`${group.items.length}`, c:"#2980b9", bg:"#e8f4fd",                                tc:"#2980b9"},
            ].map(k=>(
              <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"12px 15px"}}>
                <div style={{fontWeight:900,fontSize:18,color:k.tc}}>{k.v}</div>
                <div style={{fontSize:11,fontWeight:700,color:k.tc,opacity:.8}}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Info untuk shift lama tanpa data saldo */}
          {!saldo&&isClosed&&(
            <div style={{background:"#fff8e1",border:"1px solid #f39c1233",borderRadius:12,padding:"12px 16px",marginBottom:14,display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:20}}>📋</span>
              <div>
                <div style={{fontWeight:800,fontSize:13,color:"#b7770d"}}>Data Saldo Tidak Tersedia</div>
                <div style={{fontSize:11,color:"#888",marginTop:2,lineHeight:1.5}}>
                  Shift ini terjadi sebelum sistem pencatatan saldo aktif. 
                  Data omset dan transaksi tetap tersedia di bawah.
                </div>
              </div>
            </div>
          )}
          {saldo&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            {/* SALDO AWAL */}
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"14px 16px"}}>
              <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>
                🟢 Saldo Awal (Buka Shift)
                <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:2}}>{saldo?.waktuBuka||"--"}</div>
              </div>
              {saldo?.saldoApps && Object.keys(saldo.saldoApps).length>0 ? (
                <>
                  {Object.entries(saldo.saldoApps).map(([app,val])=>(
                    <div key={app} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0faf8"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#555"}}>{app}</span>
                      <span style={{fontSize:12,fontWeight:800,color:+val>0?"#0d9488":"#ccc"}}>{+val>0?fmtRp(+val):"--"}</span>
                    </div>
                  ))}
                  {saldo.cashKembalian>0&&(
                    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0faf8"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#b7770d"}}>Cash Kembalian</span>
                      <span style={{fontSize:12,fontWeight:800,color:"#b7770d"}}>{fmtRp(saldo.cashKembalian)}</span>
                    </div>
                  )}
                  {(saldo.totalSaldoApps>0)&&(
                    <div style={{marginTop:8,background:"#e0faf5",borderRadius:8,padding:"7px 10px",display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>Total Saldo</span>
                      <span style={{fontWeight:900,fontSize:13,color:"#0d9488"}}>{fmtRp(saldo.totalSaldoApps)}</span>
                    </div>
                  )}
                </>
              ):(
                <div style={{fontSize:12,color:"#ccc",padding:"8px 0",textAlign:"center"}}>Tidak ada catatan saldo awal</div>
              )}
            </div>

            {/* SALDO AKHIR */}
            <div style={{background:"#fff",borderRadius:13,border:`2px solid ${isClosed?"#ffe0e0":"#e0faf5"}`,padding:"14px 16px"}}>
              <div style={{fontWeight:800,fontSize:13,color:isClosed?"#e74c3c":"#aaa",marginBottom:10}}>
                {isClosed?"🔴 Saldo Akhir (Tutup Shift)":"⏳ Shift Belum Ditutup"}
                <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:2}}>{saldo?.waktuTutup||"--"}</div>
              </div>
              {isClosed&&saldo?.saldoAppsAkhir&&Object.keys(saldo.saldoAppsAkhir).length>0?(
                <>
                  {Object.entries(saldo.saldoAppsAkhir).map(([app,val])=>(
                    <div key={app} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0faf8"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#555"}}>{app}</span>
                      <span style={{fontSize:12,fontWeight:800,color:+val>0?"#e74c3c":"#ccc"}}>{+val>0?fmtRp(+val):"--"}</span>
                    </div>
                  ))}
                  {saldo.cashKembClose>0&&(
                    <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#b7770d"}}>Cash Kembalian</span>
                      <span style={{fontSize:12,fontWeight:800,color:"#b7770d"}}>{fmtRp(saldo.cashKembClose)}</span>
                    </div>
                  )}
                </>
              ):(
                <div style={{fontSize:12,color:"#ccc",padding:"8px 0",textAlign:"center"}}>{isClosed?"Tidak ada catatan saldo akhir":"Shift masih berjalan"}</div>
              )}
            </div>
          </div>)}

          {/* Rekap Kas Akhir Shift */}
          {isClosed&&(
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"14px 16px",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:12}}>💰 Rekap Kas Akhir Shift</div>

              {/* Estimasi kas sistem dari omset */}
              <div style={{background:"#f0faf8",borderRadius:10,padding:"10px 14px",marginBottom:10}}>
                <div style={{fontWeight:700,fontSize:11,color:"#6b7280",marginBottom:6}}>📊 Estimasi Uang Masuk</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  {[
                    {l:"Omset Shift",       v:gOmset,               c:"#0d9488"},
                    {l:"Saldo Awal (Apps)", v:saldo?.totalSaldoApps||Object.values(saldo?.saldoApps||{}).reduce((s,v)=>s+(+v||0),0)+(saldo?.cashKembalian||0), c:"#2980b9"},
                    {l:"Setor Tunai",       v:saldo?.setorTunai||0,  c:"#e74c3c"},
                    {l:"Pengeluaran",       v:saldo?.pengeluaran||0, c:"#e74c3c"},
                  ].map(r=>(
                    <div key={r.l} style={{background:"#fff",borderRadius:8,padding:"7px 10px",display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#666",fontWeight:600,fontSize:11}}>{r.l}</span>
                      <span style={{fontWeight:800,color:r.c,fontSize:12}}>{fmtRp(r.v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pengeluaran detail */}
              {(saldo?.hutang>0||saldo?.pending>0)&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10,fontSize:12}}>
                  {[{l:"Hutang Pelanggan",v:saldo?.hutang},{l:"Transaksi Pending",v:saldo?.pending}].filter(r=>r.v>0).map(r=>(
                    <div key={r.l} style={{background:"#fff0f0",borderRadius:8,padding:"8px 12px",display:"flex",justifyContent:"space-between"}}>
                      <span style={{color:"#666",fontWeight:600}}>{r.l}</span>
                      <span style={{fontWeight:800,color:"#e74c3c"}}>{fmtRp(r.v)}</span>
                    </div>
                  ))}
                </div>
              )}
              {saldo?.noteKlr&&<div style={{fontSize:11,color:"#aaa",marginBottom:8,background:"#f8f8f8",borderRadius:7,padding:"5px 10px"}}>📝 Catatan: {saldo.noteKlr}</div>}

              {/* Kas Sistem vs Fisik */}
              {(saldo?.kasNyataSystem>0||saldo?.kasNyataFisik>0)&&(
                <div style={{marginTop:4,display:"flex",gap:8}}>
                  {[{l:"Kas Sistem (Estimasi)",v:saldo.kasNyataSystem,c:"#0d9488"},{l:"Kas Fisik (Dihitung)",v:saldo.kasNyataFisik,c:"#2980b9"}].map(r=>(
                    <div key={r.l} style={{flex:1,background:"#f0faf8",borderRadius:9,padding:"9px 12px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:11,fontWeight:700,color:"#555"}}>{r.l}</span>
                      <span style={{fontWeight:900,fontSize:15,color:r.c}}>{fmtRp(r.v)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Balance BOX */}
              {saldo?.selisih!==undefined&&(
                <div style={{marginTop:10,background:saldo.selisih===0?"#e8f8f4":saldo.selisih>0?"#fffbe6":"#fff0f0",border:`2px solid ${saldo.selisih===0?"#2ecc71":saldo.selisih>0?"#f39c12":"#ff4757"}`,borderRadius:12,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:saldo.selisih!==0?8:0}}>
                    <div>
                      <div style={{fontWeight:800,fontSize:14,color:saldo.selisih===0?"#2ecc71":saldo.selisih>0?"#f39c12":"#ff4757"}}>
                        {saldo.selisih===0?"✅ Kas Sesuai / Balance!":saldo.selisih>0?"📈 Kas Lebih":"📉 Kas Kurang"}
                      </div>
                      <div style={{fontSize:11,color:"#888",marginTop:2}}>
                        Sistem: {fmtRp(saldo.kasNyataSystem||0)} . Fisik: {fmtRp(saldo.kasNyataFisik||0)}
                      </div>
                    </div>
                    <span style={{fontWeight:900,fontSize:28,color:saldo.selisih===0?"#2ecc71":saldo.selisih>0?"#f39c12":"#ff4757"}}>
                      {saldo.selisih===0?"✓":(saldo.selisih>0?"+":"")+fmtRp(saldo.selisih)}
                    </span>
                  </div>
                  {saldo.selisih!==0&&(
                    <div style={{fontSize:11,color:saldo.selisih>0?"#b7770d":"#c0392b",fontWeight:600,background:"rgba(0,0,0,.04)",borderRadius:7,padding:"6px 10px"}}>
                      {saldo.selisih>0
                        ?"Uang fisik lebih dari sistem -- ada kelebihan kas atau input kurang tepat"
                        :"Uang fisik kurang dari sistem -- ada selisih yang perlu diperiksa"}
                    </div>
                  )}
                </div>
              )}
              {saldo?.notes&&<div style={{marginTop:8,background:"#f8f8f8",borderRadius:8,padding:"8px 12px",fontSize:12,color:"#666",fontStyle:"italic"}}>📝 {saldo.notes}</div>}
            </div>
          )}

          {/* Produk terjual */}
          <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",overflow:"hidden",marginBottom:14}}>
            <div style={{padding:"12px 16px",borderBottom:"1px solid #f0faf8",fontWeight:800,fontSize:13,color:"#0d9488"}}>
              🏷️ Produk Terjual ({detail.length} jenis)
            </div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#e0faf5"}}>
                {["#","Produk","Qty Terjual","Omset"].map(h=>(
                  <th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:800,color:"#0d9488"}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {detail.map((p,i)=>(
                  <tr key={p.name} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                    <td style={{padding:"8px 12px",color:"#ccc"}}>{i+1}</td>
                    <td style={{padding:"8px 12px",fontWeight:700}}>{p.name}</td>
                    <td style={{padding:"8px 12px",fontWeight:900,color:"#0d9488"}}>{p.qty} pcs</td>
                    <td style={{padding:"8px 12px",fontWeight:800,color:"#555"}}>{fmtRp(p.omset)}</td>
                  </tr>
                ))}
                {detail.length===0&&<tr><td colSpan={4} style={{padding:24,textAlign:"center",color:"#ccc"}}>Tidak ada produk terjual</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Transaksi detail */}
          <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:8}}>🧾 Detail Transaksi</div>
          {group.items.map((t,ti)=>{
            const rt=t.items.filter(i=>i.refunded).reduce((s,i)=>s+i.price*i.qty,0);
            return (
              <div key={t.id} style={{background:"#fff",borderRadius:11,padding:"10px 13px",marginBottom:8,border:"1px solid #e0f5f1"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <div style={{display:"flex",gap:7,alignItems:"center"}}>
                    <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>#{t.id}</span>
                    <span style={{fontSize:11,color:"#aaa"}}>{t.time}</span>
                    {t.kasir&&<span style={{fontSize:10,color:"#888"}}>({t.kasir})</span>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:900,fontSize:13}}>{fmtRp(t.total)}</div>
                    {rt>0&&<div style={{fontSize:10,color:"#ff4757"}}>bersih:{fmtRp(t.total-rt)}</div>}
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {t.items.filter(i=>!i.refunded).map(item=>(
                    <span key={item.cartId} style={{background:"#f0faf8",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,color:"#0d9488"}}>
                      {item.name} ×{item.qty}
                    </span>
                  ))}
                  {t.items.filter(i=>i.refunded).map(item=>(
                    <span key={item.cartId} style={{background:"#fff0f0",borderRadius:6,padding:"3px 8px",fontSize:11,fontWeight:700,color:"#ff4757",textDecoration:"line-through"}}>
                      {item.name} ×{item.qty}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          </>)}

          {/* == TAB BANK == */}
          {detailTab==="bank"&&(<>

          {/* KPI Bank */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            {[
              {l:"Uang Sistem",  v:fmtRp(uangSistemBank), c:"#fff",  bg:"linear-gradient(135deg,#1a2e2a,#2d4a44)"},
              {l:"Total Masuk",  v:fmtRp(bankMasuk),       c:"#27ae60",bg:"#e8f8f0"},
              {l:"Total Keluar", v:fmtRp(bankKeluar),      c:"#e74c3c",bg:"#fff0f0"},
            ].map(k=>(
              <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"12px 15px"}}>
                <div style={{fontWeight:900,fontSize:18,color:k.c}}>{k.v}</div>
                <div style={{fontSize:11,fontWeight:700,color:k.c,opacity:.8,marginTop:2}}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Saldo Bank Awal & Akhir */}
          {bankData&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <div style={{background:"#fff",borderRadius:13,border:"2px solid #0d948833",padding:"13px 15px"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:8}}>🟢 Saldo Aplikasi Awal</div>
                {Object.entries(bankData.saldoAwal||{}).map(([app,val])=>(
                  <div key={app} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f5faf8",fontSize:12}}>
                    <span style={{color:"#555",fontWeight:600}}>{app}</span>
                    <span style={{fontWeight:800,color:+val>0?"#0d9488":"#ccc"}}>{+val>0?fmtRp(+val):"--"}</span>
                  </div>
                ))}
                {bankData.cashKemb>0&&(
                  <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f5faf8",fontSize:12}}>
                    <span style={{color:"#b7770d",fontWeight:600}}>Cash Kembalian</span>
                    <span style={{fontWeight:800,color:"#b7770d"}}>{fmtRp(bankData.cashKemb)}</span>
                  </div>
                )}
              </div>
              <div style={{background:"#fff",borderRadius:13,border:"2px solid #e74c3c33",padding:"13px 15px"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#e74c3c",marginBottom:8}}>🔴 Saldo Aplikasi Akhir</div>
                {Object.entries(bankData.saldoAkhir||{}).map(([app,val])=>(
                  <div key={app} style={{display:"flex",justifyContent:"space-between",padding:"4px 0",borderBottom:"1px solid #f5faf8",fontSize:12}}>
                    <span style={{color:"#555",fontWeight:600}}>{app}</span>
                    <span style={{fontWeight:800,color:+val>0?"#e74c3c":"#ccc"}}>{+val>0?fmtRp(+val):"--"}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Rekap Closing Bank */}
          <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"14px 16px",marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:10}}>🏦 Rekap Closing Bank</div>
            {[
              {l:"Cash Kembalian Awal", v:bankData?.cashKemb||0,    c:"#b7770d"},
              {l:"Total Masuk",         v:bankMasuk,                 c:"#27ae60"},
              {l:"Total Keluar",        v:bankKeluar,                c:"#e74c3c"},
            ].map(r=>(
              <div key={r.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f5faf8",fontSize:12}}>
                <span style={{color:"#555",fontWeight:600}}>{r.l}</span>
                <span style={{fontWeight:800,color:r.c}}>{fmtRp(r.v)}</span>
              </div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0 6px",borderTop:"2px solid #e0f5f1",fontSize:14,fontWeight:900,color:"#0d9488"}}>
              <span>Uang Sistem</span><span>{fmtRp(uangSistemBank)}</span>
            </div>
            {bankData?.uangLaci>0&&(
              <div style={{display:"flex",justifyContent:"space-between",padding:"5px 0",fontSize:13,fontWeight:700}}>
                <span style={{color:"#555"}}>Uang Laci Fisik</span><span style={{color:"#2980b9"}}>{fmtRp(bankData.uangLaci)}</span>
              </div>
            )}
            {bankData?.catatan&&<div style={{fontSize:11,color:"#aaa",margin:"6px 0",background:"#f8f8f8",borderRadius:7,padding:"5px 10px"}}>📝 {bankData.catatan}</div>}

            {/* Balance BOX Bank */}
            {bankData?.uangLaci>0&&(()=>{
              const selB = bankData.uangLaci - uangSistemBank;
              return (
                <div style={{marginTop:10,background:selB===0?"#e8f8f4":selB>0?"#fffbe6":"#fff0f0",border:`2px solid ${selB===0?"#2ecc71":selB>0?"#f39c12":"#ff4757"}`,borderRadius:13,padding:"14px 16px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:selB!==0?8:0}}>
                    <div>
                      <div style={{fontWeight:900,fontSize:15,color:selB===0?"#2ecc71":selB>0?"#f39c12":"#ff4757"}}>
                        {selB===0?"✅ Balance!":selB>0?"📈 Uang Lebih":"📉 Uang Kurang"}
                      </div>
                      <div style={{fontSize:11,color:"#888",marginTop:2}}>
                        Sistem: {fmtRp(uangSistemBank)} . Fisik: {fmtRp(bankData.uangLaci)}
                      </div>
                    </div>
                    <span style={{fontWeight:900,fontSize:28,color:selB===0?"#2ecc71":selB>0?"#f39c12":"#ff4757"}}>
                      {selB===0?"✓":(selB>0?"+":"")+fmtRp(selB)}
                    </span>
                  </div>
                  {selB!==0&&(
                    <div style={{fontSize:11,color:selB>0?"#b7770d":"#c0392b",fontWeight:600,background:"rgba(0,0,0,.04)",borderRadius:8,padding:"6px 10px"}}>
                      {selB>0?"Uang laci lebih dari sistem -- ada kelebihan atau input kurang tepat"
                             :"Uang laci kurang dari sistem -- ada selisih yang perlu diperiksa"}
                    </div>
                  )}
                </div>
              );
            })()}
            {/* Jika belum ada data closing bank, tampilkan estimasi */}
            {!bankData?.uangLaci&&bankTrx.length>0&&(
              <div style={{marginTop:10,background:"#e8f4fd",border:"2px solid #2980b933",borderRadius:10,padding:"10px 14px"}}>
                <div style={{fontWeight:800,fontSize:12,color:"#2980b9",marginBottom:4}}>📊 Estimasi Uang Sistem</div>
                <div style={{fontWeight:900,fontSize:18,color:"#2980b9"}}>{fmtRp(uangSistemBank)}</div>
                <div style={{fontSize:11,color:"#888",marginTop:2}}>Cash kembalian + masuk − keluar (belum ada data closing)</div>
              </div>
            )}
          </div>

          {/* Riwayat Transaksi Bank */}
          <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",overflow:"hidden"}}>
            <div style={{padding:"11px 15px",borderBottom:"1px solid #f0faf8",fontWeight:800,fontSize:13,color:"#1a2e2a"}}>
              📋 Riwayat Transaksi Bank ({bankTrx.length})
            </div>
            {bankTrx.length===0?(
              <div style={{textAlign:"center",color:"#ccc",padding:24,fontSize:13}}>Belum ada transaksi bank hari ini</div>
            ):bankTrx.map((t,i)=>{
              const isIn=t.netNominal>0;
              return(
                <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 15px",borderTop:i>0?"1px solid #f0faf8":"none",background:i%2===0?"#fff":"#fafffe"}}>
                  <div style={{width:32,height:32,borderRadius:8,background:isIn?"#e0faf5":"#fff0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
                    {isIn?"⬇":"⬆"}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nama}</div>
                    <div style={{fontSize:10,color:"#aaa",marginTop:1}}>
                      {t.waktu}
                      {t.feeType==="fee"&&t.fee>0&&<span style={{color:"#0d9488",fontWeight:700,marginLeft:5}}>+fee {fmtRp(t.fee)}</span>}
                      {t.feeType==="dipotong"&&t.fee>0&&<span style={{color:"#e74c3c",fontWeight:700,marginLeft:5}}>−{fmtRp(t.fee)}</span>}
                    </div>
                  </div>
                  <div style={{fontWeight:900,fontSize:13,color:isIn?"#0d9488":"#e74c3c",flexShrink:0}}>
                    {isIn?"+":""}{fmtRp(Math.abs(t.netNominal))}
                  </div>
                </div>
              );
            })}
          </div>

          </>)}

        </div>
      </div>
    );
  } // end if(selectedShift)

  // -- MAIN LAPORAN LIST ------------------------------------------------------
  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(13,148,136,.3)"}}>
        <div style={{padding:"0 20px",minHeight:50,display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Kembali</button>
          <div style={{fontWeight:900,fontSize:15,color:"#fff",flex:1}}>📋 Laporan Shift</div>
        </div>
        {/* Tab Kasir / Bank */}
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.15)"}}>
          {[{k:"kasir",l:"🧾 Laporan Kasir"},{k:"bank",l:"🏦 Laporan Bank"}].map(t=>(
            <button key={t.k} onClick={()=>setMainTab(t.k)}
              style={{flex:1,padding:"10px 0",border:"none",borderBottom:`3px solid ${mainTab===t.k?"#fff":"transparent"}`,background:"transparent",color:mainTab===t.k?"#fff":"rgba(255,255,255,.55)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 18px",maxWidth:960,margin:"0 auto"}}>

        {/* Date filter bar */}
        <div style={{background:"#fff",borderRadius:12,padding:"10px 14px",marginBottom:10,border:"2px solid #e0f5f1",display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <span style={{fontSize:11,fontWeight:700,color:"#0d9488",flexShrink:0}}>📅 Rentang</span>
          <div style={{display:"flex",alignItems:"center",gap:5,background:"#f8fafc",borderRadius:9,padding:"5px 10px",border:"1px solid #e2e8f0"}}>
            <input type="date" value={laporanDateFrom} onChange={e=>setLaporanDateFrom(e.target.value)}
              style={{border:"none",background:"none",outline:"none",fontSize:11,fontFamily:"inherit",color:"#1e293b",cursor:"pointer"}}/>
            <span style={{color:"#cbd5e1",fontWeight:700}}>--</span>
            <input type="date" value={laporanDateTo} onChange={e=>setLaporanDateTo(e.target.value)}
              style={{border:"none",background:"none",outline:"none",fontSize:11,fontFamily:"inherit",color:"#1e293b",cursor:"pointer"}}/>
          </div>
          <div style={{display:"flex",gap:4}}>
            {[{l:"Hari Ini",k:"today"},{l:"7 Hari",k:"7d"},{l:"30 Hari",k:"30d"},{l:"Bulan Ini",k:"month"}].map(p=>(
              <button key={p.k} onClick={()=>applyLaporanPreset(p.k)}
                style={{padding:"5px 10px",borderRadius:9,border:"1px solid #e0f5f1",background:"#fff",color:"#0d9488",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"background .15s"}}
                onMouseEnter={e=>e.currentTarget.style.background="#e0faf5"}
                onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
                {p.l}
              </button>
            ))}
          </div>
        </div>
        {/* Filter */}
        <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
          <select value={filterOutlet} onChange={e=>setFilterOutlet(e.target.value)}
            style={{padding:"7px 11px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",background:"#fff",fontWeight:600}}>
            <option value="all">Semua Outlet</option>
            {outlets.map(o=><option key={o.id} value={o.id}>{o.nama}</option>)}
          </select>
          {mainTab==="kasir"&&(
            <select value={filterShift} onChange={e=>setFilterShift(e.target.value)}
              style={{padding:"7px 11px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",background:"#fff",fontWeight:600}}>
              <option value="all">Semua Shift</option>
              {allShifts.map(s=>(
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
          )}
          {mainTab==="kasir"&&(
            <button onClick={()=>{ setFreshTransactions(null); setShiftLogsLoading(true); setRefreshTrigger(p=>p+1); }}
              style={{background:"#f0faf8",border:"2px solid #b2ede6",borderRadius:9,padding:"5px 12px",fontSize:11,fontWeight:700,color:"#0d9488",cursor:"pointer",fontFamily:"inherit",marginLeft:"auto"}}>
              🔄 Refresh
            </button>
          )}
        </div>

        {/* -- TAB KASIR -- */}
        {mainTab==="kasir"&&(<>
          {shiftLogsLoading&&<div style={{textAlign:"center",color:"#0d9488",padding:20,fontSize:13,fontWeight:700}}>⏳ Memuat data shift...</div>}
          {!shiftLogsLoading&&groupArr.filter(isInLaporanRange).map(group=>{
            const saldoCard = getShiftSaldo(group.key);
            const shiftCardInLogs = shiftLogs[group.key];
            const isClosedCard = 
              (saldoCard?.type==="closed") || !!saldoCard?.waktuTutup ||
              (shiftCardInLogs?.type==="closed") || !!shiftCardInLogs?.waktuTutup ||
              (!shiftCardInLogs && !saldoCard); // shift lama = anggap closed
            const selisihCard = isClosedCard && saldoCard?.selisih!==undefined ? saldoCard.selisih : null;
            return (
            <div key={group.key} onClick={()=>{setSelectedShift(group);setDetailTab("kasir");}}
              style={{background:"#fff",borderRadius:13,padding:"13px 16px",marginBottom:10,border:`2px solid ${selisihCard!==null&&selisihCard!==0?"#f39c1255":"#e0f5f1"}`,cursor:"pointer",transition:"all .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#0d9488";e.currentTarget.style.boxShadow="0 2px 12px rgba(13,148,136,.12)";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=selisihCard!==null&&selisihCard!==0?"#f39c1255":"#e0f5f1";e.currentTarget.style.boxShadow="none";}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:14,color:"#1a2e2a"}}>{group.label}</span>
                    {(()=>{
                      const log=shiftLogs[group.key];
                      const raw=log?.created_at||log?.start_time||'';
                      if(!raw) return null;
                      try{
                        const parts=String(raw).split('/');
                        const d=parts.length===3?new Date(parts[2],parts[1]-1,parts[0]):new Date(raw);
                        if(isNaN(d)) return null;
                        return <span style={{fontSize:10,color:"#94a3b8",fontWeight:600,background:"#f1f5f9",padding:"2px 8px",borderRadius:20}}>📅 {d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}</span>;
                      }catch{return null;}
                    })()}
                  </div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{group.outletNama} . {group.items.length} transaksi</div>
                </div>
                <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                  <div style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{fmtRp(calcOmset(group.items))}</div>
                  <div style={{fontSize:10,color:"#aaa"}}>omset bersih</div>
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:isClosedCard?"#f0f0f0":"#e8f8f4",
                    color:isClosedCard?"#888":"#2ecc71"}}>
                    {isClosedCard?"⚫ Ditutup":"🟢 Aktif"}
                  </span>
                </div>
              </div>
              {/* Balance badge */}
              {selisihCard!==null&&(
                <div style={{marginTop:8,display:"inline-flex",alignItems:"center",gap:5,background:selisihCard===0?"#e8f8f4":selisihCard>0?"#fffbe6":"#fff0f0",borderRadius:20,padding:"3px 11px",border:`1px solid ${selisihCard===0?"#2ecc71":selisihCard>0?"#f39c12":"#ff4757"}`}}>
                  <span style={{fontSize:11,fontWeight:800,color:selisihCard===0?"#2ecc71":selisihCard>0?"#f39c12":"#ff4757"}}>
                    {selisihCard===0?"✅ Balance":(selisihCard>0?"📈 Lebih ":"📉 Kurang ")+fmtRp(Math.abs(selisihCard))}
                  </span>
                </div>
              )}
            </div>
            );
          })}
          {!shiftLogsLoading&&groupArr.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:32,fontSize:13}}>
            {filterOutlet!=="all"||filterShift!=="all"?"Tidak ada shift sesuai filter":"Belum ada data shift"}
          </div>}
        </>)}

        {/* -- TAB BANK -- */}
        {mainTab==="bank"&&(
          <LaporanBankList
            bankTrxMap={bankTrxMap}
            bankShiftLogs={bankShiftLogs}
            shiftLogs={shiftLogs}
            outlets={outlets}
            filterOutlet={filterOutlet}
            dateFrom={laporanDateFrom}
            dateTo={laporanDateTo}
            onSelectShift={(group)=>{setSelectedShift(group);setDetailTab("bank");}}
          />
        )}
      </div>
    </div>
  );
}
function KasirStokPage({ products, outletStock, outletNama, selectedOutlet, stocks, setStocks, prodOrder }) {
  const [realStocks,  setRealStocks]  = useState(()=>{ const m={}; products.forEach(p=>{m[p.id]=outletStock[p.id]??0;}); return m; });
  const [opnameSaved, setOpnameSaved] = useState(false);
  const [srch,        setSrch]        = useState("");
  const [sortK,       setSortK]       = useState("habis");
  const [stokOrder,   setStokOrder]   = useState(null);
  const dragStokIdx  = useRef(null);
  const [draggingStok, setDraggingStok] = useState(null);
  const [dragOverStok, setDragOverStok] = useState(null);
  const saveOrderTmr = useRef(null);

  // Load urutan stok dari Supabase + realtime
  useEffect(()=>{
    if(!selectedOutlet) return;
    dbStokOrder.getOrder(selectedOutlet).then(ord=>{
      if(ord && ord.length>0) setStokOrder(ord.map(x=>x.productId));
    }).catch(()=>{});
    const ch = supabase.channel(`stok-order-${selectedOutlet}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'stok_order',filter:`outlet_id=eq.${selectedOutlet}`},()=>{
        dbStokOrder.getOrder(selectedOutlet).then(ord=>{
          if(ord && ord.length>0) setStokOrder(ord.map(x=>x.productId));
        }).catch(()=>{});
      }).subscribe();
    return ()=>supabase.removeChannel(ch);
  },[selectedOutlet]);

  const saveStokOrder = (newOrder) => {
    setStokOrder(newOrder);
    if(saveOrderTmr.current) clearTimeout(saveOrderTmr.current);
    saveOrderTmr.current = setTimeout(()=>{
      dbStokOrder.saveOrder(selectedOutlet, newOrder).catch(e=>console.warn('saveStokOrder:',e));
    }, 800);
  };

  const saveOpname = async () => {
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],...realStocks}}));
    await Promise.all(Object.entries(realStocks).map(([pid,qty])=>db.upsertStock(selectedOutlet,+pid,qty).catch(()=>{})));
    setOpnameSaved(true); setTimeout(()=>setOpnameSaved(false),2500);
  };

  // baseFP: filter + sort (hanya jika bukan default urutan produk)
  const baseFP = products.filter(p=>p.name.toLowerCase().includes(srch.toLowerCase()));
  // Urutan: prodOrder global → stokOrder lokal → sort user
  const effectiveOrder = prodOrder || stokOrder;
  const filteredP = (() => {
    if(effectiveOrder && sortK==="habis") {
      // Pakai global/local order
      return [
        ...effectiveOrder.map(id=>baseFP.find(p=>String(p.id)===String(id))).filter(Boolean),
        ...baseFP.filter(p=>!effectiveOrder.map(String).includes(String(p.id)))
      ];
    }
    // Sort eksplisit
    const sorted = [...baseFP].sort((a,b)=>{
      const qa=outletStock[a.id]??0,qb=outletStock[b.id]??0;
      if(sortK==="habis") return (qa===0?-1:qa<=2?0:1)-(qb===0?-1:qb<=2?0:1);
      if(sortK==="nama")  return a.name.localeCompare(b.name);
      if(sortK==="kat")   return a.category.localeCompare(b.category);
      if(sortK==="stok_asc") return qa-qb;
      return qb-qa;
    });
    return sorted;
  })();
  const getStatus = s => s===0?"habis":s<=2?"menipis":s>=20?"over":"aman";
  const ss = {
    habis:  {bg:"#ffe5e5",c:"#c0392b",l:"✗ Habis"},
    menipis:{bg:"#fff0f0",c:"#ff4757",l:"⚠ Menipis"},
    over:   {bg:"#fffbe6",c:"#f39c12",l:"▲ Over"},
    aman:   {bg:"#e8f8f4",c:"#0d9488",l:"✓ Aman"},
  };

  return (
    <div style={{padding:"14px 18px",maxWidth:820,margin:"0 auto",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <div style={{fontWeight:800,fontSize:15,color:"#0d9488"}}>📦 Stok Opname -- {outletNama}</div>
        <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Search()}</span>
            <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Cari produk..."
              style={{padding:"7px 10px 7px 27px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",width:130}}/>
          </div>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {[...(effectiveOrder?[{k:"habis",l:"✅ Urutan Produk"}]:[]),{k:"nama",l:"A-Z"},{k:"kat",l:"Kategori"},{k:"habis_stok",l:"Habis↑"},{k:"stok_asc",l:"Stok ↑"},{k:"stok_dsc",l:"Stok ↓"}].map(s=>(
              <button key={s.k} onClick={()=>setSortK(s.k)} style={{padding:"4px 9px",borderRadius:7,border:`1px solid ${sortK===s.k?"#0d9488":"#b2ede6"}`,background:sortK===s.k?"#0d9488":"#fff",color:sortK===s.k?"#fff":"#0d9488",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{s.l}</button>
            ))}
          </div>
          <button onClick={saveOpname} style={{background:opnameSaved?"#2ecc71":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:"8px 14px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {opnameSaved?"✓ Tersimpan!":"💾 Simpan Opname"}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{display:"flex",gap:8,marginBottom:11}}>
        {[
          {l:"Habis",     v:products.filter(p=>(realStocks[p.id]??0)===0).length,                              c:"#c0392b",bg:"#ffe5e5"},
          {l:"Menipis ≤2",v:products.filter(p=>{const s=realStocks[p.id]??0;return s>0&&s<=2;}).length,        c:"#ff4757",bg:"#fff0f0"},
          {l:"Over ≥20",  v:products.filter(p=>(realStocks[p.id]??0)>=20).length,                              c:"#f39c12",bg:"#fffbe6"},
          {l:"Aman",      v:products.filter(p=>{const s=realStocks[p.id]??0;return s>2&&s<20;}).length,        c:"#2ecc71",bg:"#e8f8f4"},
        ].map(s=>(
          <div key={s.l} style={{flex:1,background:s.bg,borderRadius:9,padding:"7px 10px",textAlign:"center",border:`1px solid ${s.c}22`}}>
            <div style={{fontWeight:900,fontSize:16,color:s.c}}>{s.v}</div>
            <div style={{fontSize:10,fontWeight:700,color:s.c,opacity:.8}}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"#e0faf5"}}>
            {["#","⠿","Produk","Kategori","Status","Stok Sistem","Stok Nyata","Selisih"].map(h=>(
              <th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filteredP.map((p,i)=>{
              const sysQty  = outletStock[p.id]??0;
              const realQty = realStocks[p.id]??sysQty;
              const diff    = realQty - sysQty;
              const st      = getStatus(realQty);
              return (
                <tr key={p.id}
                  draggable
                  onDragStart={(e)=>{
                    dragStokIdx.current=i; setDraggingStok(i); setDragOverStok(null);
                    e.dataTransfer.effectAllowed="move";
                  }}
                  onDragOver={(e)=>{
                    e.preventDefault(); e.dataTransfer.dropEffect="move";
                    if(dragStokIdx.current===null||dragStokIdx.current===i) return;
                    setDragOverStok(i);
                  }}
                  onDragEnter={(e)=>{
                    e.preventDefault();
                    if(dragStokIdx.current===null||dragStokIdx.current===i) return;
                    setDragOverStok(i);
                  }}
                  onDragLeave={()=>setDragOverStok(null)}
                  onDrop={(e)=>{
                    e.preventDefault();
                    if(dragStokIdx.current===null||dragStokIdx.current===i){setDragOverStok(null);return;}
                    const ord=filteredP.map(x=>String(x.id));
                    const [mv]=ord.splice(dragStokIdx.current,1);
                    const rect=e.currentTarget.getBoundingClientRect();
                    const ins = e.clientY<rect.top+rect.height/2 ? i : i+1;
                    const adj = dragStokIdx.current<ins ? ins-1 : ins;
                    ord.splice(adj,0,mv);
                    dragStokIdx.current=adj;
                    saveStokOrder(ord);
                    setDragOverStok(null);
                  }}
                  onDragEnd={()=>{ dragStokIdx.current=null; setDraggingStok(null); setDragOverStok(null); }}
                  style={{
                    borderTop: dragOverStok===i?"3px solid #0d9488":"1px solid #f0faf8",
                    background: draggingStok===i?"#d0f5ee":dragOverStok===i?"#e8fdf8":i%2===0?"#fff":"#fafffe",
                    cursor: draggingStok===i?"grabbing":"grab",
                    opacity: draggingStok===i?0.5:1,
                    transform: draggingStok===i?"scale(1.01)":"none",
                    boxShadow: draggingStok===i?"0 4px 14px rgba(13,148,136,.2)":"none",
                    transition:"background .08s,opacity .08s,transform .08s",
                  }}>
                  <td style={{padding:"7px 11px",color:"#ccc"}}>{i+1}</td>
                  <td style={{padding:"7px 6px",color:draggingStok===i?"#0d9488":"#b2ede6",fontSize:18,userSelect:"none",textAlign:"center",cursor:draggingStok===i?"grabbing":"grab"}} title="Drag untuk atur urutan">⠿</td>
                  <td style={{padding:"7px 11px",fontWeight:700}}>{p.name}</td>
                  <td style={{padding:"7px 11px"}}><span style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"2px 7px",borderRadius:6}}>{p.category}</span></td>
                  <td style={{padding:"7px 11px"}}><span style={{background:ss[st].bg,color:ss[st].c,fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>{ss[st].l}</span></td>
                  <td style={{padding:"7px 11px",fontWeight:800,color:sysQty<=2?"#ff4757":"#1a2e2a"}}>{sysQty}</td>
                  <td style={{padding:"7px 11px"}}>
                    <input type="number" min="0" value={realQty}
                      onChange={e=>setRealStocks(prev=>({...prev,[p.id]:Number(e.target.value)}))}
                      onClick={e=>e.stopPropagation()}
                      style={{width:64,padding:"4px 7px",borderRadius:7,border:"2px solid #b2ede6",fontWeight:700,fontSize:13,textAlign:"center",outline:"none",fontFamily:"inherit"}}/>
                  </td>
                  <td style={{padding:"7px 11px",fontWeight:800,fontSize:13,color:diff===0?"#2ecc71":diff>0?"#f39c12":"#ff4757"}}>
                    {diff>0?`+${diff}`:diff===0?"✓":diff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filteredP.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:24,fontSize:13}}>Tidak ada produk</div>}
      </div>
      <div style={{fontSize:10,color:"#aaa",marginTop:7,fontWeight:600}}>* Isi "Stok Nyata" sesuai hitungan fisik → klik Simpan Opname</div>
    </div>
  );
}

// ==============================================================================
// KASIR APP (per outlet)
// ==============================================================================
// ==============================================================================
// GABUNGAN — Kasir + Bank dalam 1 laci (menu tambahan, khusus outlet tertentu)
// Tidak mengubah KasirApp/BankPage sama sekali — hanya membungkus & menampilkan
// ringkasan kas gabungan dari data yang sudah ada (transactions + bank trx hari ini)
// ==============================================================================
function GabunganPage(props) {
  const { user, outlets, transactions=[], notify } = props;
  const [tab,setTab] = useState("kasir"); // kasir | bank
  const [bankTrxHariIni,setBankTrxHariIni] = useState([]);

  const selectedOutlet = user.outletId || outlets[0]?.id || "";
  const todayStr = today(); // "DD/MM/YYYY"

  // Load transaksi bank hari ini untuk outlet ini (read-only, tidak ganggu BankPage) — realtime
  const loadBankToday = async () => {
    try{
      const all = await dbBank.getTransactions();
      const list = (all||[]).filter(t=>t.outletId===selectedOutlet && t.tgl===todayStr);
      setBankTrxHariIni(list);
    }catch(e){ console.warn('gabungan bank load:',e); }
  };
  useEffect(()=>{
    loadBankToday();
    const ch = supabase.channel(`gabungan-bank-${selectedOutlet}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_transactions'},(payload)=>{
        const row = payload.new||payload.old;
        if(row?.outlet_id===selectedOutlet) loadBankToday();
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[selectedOutlet]);

  // Omset kasir hari ini (dari transactions yang sudah ada di App root, realtime)
  const txHariIni = transactions.filter(t=>t.outletId===selectedOutlet && t.date===todayStr);
  const omsetKasir = txHariIni.reduce((s,t)=>{
    const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);
    return s+t.total-rv;
  },0);

  // Kas dari bank hari ini = sum netNominal (sudah termasuk efek TARIK 2-baris)
  const kasMasukBank = bankTrxHariIni.reduce((s,t)=>s+(t.netNominal||0),0);

  const totalLaci = omsetKasir + kasMasukBank;
  const fmtRpG = (n) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      {/* Header ringkasan gabungan */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)",padding:"12px 18px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:160}}>
          <div style={{fontWeight:900,fontSize:15,color:"#fff"}}>🧾 Kasir + Bank — 1 Laci</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.7)"}}>{outlets.find(o=>o.id===selectedOutlet)?.nama||"Outlet"} · {user.nama}</div>
        </div>
        <div style={{display:"flex",gap:16,background:"rgba(255,255,255,.12)",borderRadius:12,padding:"8px 18px",flexWrap:"wrap"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>Omset Kasir</div>
            <div style={{fontWeight:900,fontSize:14,color:"#fff"}}>{fmtRpG(omsetKasir)}</div>
          </div>
          <div style={{textAlign:"center",borderLeft:"1px solid rgba(255,255,255,.2)",paddingLeft:16}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>Kas dari Bank</div>
            <div style={{fontWeight:900,fontSize:14,color:kasMasukBank>=0?"#86efac":"#fca5a5"}}>{kasMasukBank>=0?"+":""}{fmtRpG(kasMasukBank)}</div>
          </div>
          <div style={{textAlign:"center",borderLeft:"1px solid rgba(255,255,255,.2)",paddingLeft:16}}>
            <div style={{fontSize:9,color:"rgba(255,255,255,.7)"}}>Total Laci Hari Ini</div>
            <div style={{fontWeight:900,fontSize:16,color:"#fbbf24"}}>{fmtRpG(totalLaci)}</div>
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div style={{display:"flex",gap:8,padding:"12px 18px 0"}}>
        {[["kasir","🛒 Kasir"],["bank","🏦 Bank"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            style={{padding:"9px 22px",borderRadius:11,border:`2px solid ${tab===k?"#0d9488":"#e0f5f1"}`,background:tab===k?"#0d9488":"#fff",color:tab===k?"#fff":"#888",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {l}
          </button>
        ))}
      </div>
      <div style={{fontSize:10,color:"#aaa",padding:"6px 18px 0"}}>💡 Kasir & Bank di bawah ini sama persis dengan menu biasa — hanya total kas laci di atas yang menggabungkan keduanya.</div>

      {/* Render Kasir / Bank asli tanpa diubah, tanpa header/onBack masing-masing */}
      <div style={{display: tab==="kasir"?"block":"none"}}>
        <KasirApp {...props} onBack={()=>{}} embedded/>
      </div>
      <div style={{display: tab==="bank"?"block":"none"}}>
        <BankPage user={props.user} outlets={props.outlets} saldoApps={props.saldoBank} onBack={()=>{}} notify={props.notify} embedded portalMisi={props.portalMisi} portalMisiProgress={props.portalMisiProgress} products={props.products}/>
      </div>
    </div>
  );
}

function KasirApp({ user, products, stocks, setStocks, transactions, setTx, outlets, saldoApps, onBack, notify, prodOrder, aktifProds={}, connStatus="online", offlineQueue=[], setOfflineQueue=()=>{}, portalMisi=[], portalMisiProgress={}, strukConfig={}, embedded=false }) {
  // Admin bisa pilih outlet; karyawan sudah terkunci ke outletnya
  const [selectedOutlet, setSelectedOutlet] = useState(user.outletId||outlets[0]?.id||"");
  const outlet = outlets.find(o=>o.id===selectedOutlet);
  const outletStock = stocks[selectedOutlet]||{};

  // Produk aktif untuk outlet ini — jika belum ada setting, semua aktif
  const aktifList = aktifProds[selectedOutlet];
  const activeProducts = aktifList && aktifList.length > 0
    ? products.filter(p => aktifList.includes(String(p.id)))
    : products;

  // -- Persist shift & cart ke localStorage DAN Supabase --------------------
  const shiftKey = `ammar_shift_${selectedOutlet}`;
  const cartKey  = `ammar_cart_${selectedOutlet}`;

  const [page,        setPage]        = useState("kasir");
  const [cart,        setCart]        = useState(()=>{ try{ const s=localStorage.getItem(cartKey); return s?JSON.parse(s):[]; }catch{return [];} });
  const [search,      setSearch]      = useState("");
  const [activeCat,   setActiveCat]   = useState("Semua");
  const [showPayment, setShowPayment] = useState(false);
  const [cashInput,   setCashInput]   = useState("");
  const [showManual,  setShowManual]  = useState(false);
  const [manualForm,  setManualForm]  = useState({name:"",modal:"",price:"",qty:1});
  const [shift,       setShiftState]  = useState(null); // selalu null dulu, load dari Supabase
  const [shiftLoading,setShiftLoading]= useState(true); // loading sampai Supabase dicek
  const [showShift,   setShowShift]   = useState(false);
  const [shiftMode,   setShiftMode]   = useState("open");
  const [barcode,     setBarcode]     = useState("");
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason,setRefundReason]= useState("");
  const [lastTrx,     setLastTrx]     = useState(null); // trx terakhir untuk dicetak
  const [showStruk,   setShowStruk]   = useState(false);
  const [btDevice,    setBtDevice]    = useState(null); // printer Bluetooth tersambung
  const [btConnecting,setBtConnecting]= useState(false);

  // -- Periodic shift heartbeat: cek tiap 30 detik (bukan dari DELETE realtime) -
  useEffect(()=>{
    if(!shift?.id) return;
    const verifyShift = async () => {
      // Skip jika offline atau sinyal buruk
      if(!navigator.onLine || connStatus==="offline" || connStatus==="reconnecting") return;
      try{
        // Timeout 5 detik agar tidak menggantung
        const timeoutPromise = new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),5000));
        const s = await Promise.race([
          dbShift.getActiveShift(selectedOutlet, user.username),
          timeoutPromise
        ]);
        if(!s || s.id !== shift.id){
          console.warn('[ShiftVerify] Shift tidak ditemukan di DB:', shift.id);
          // Verifikasi GANDA: cek shift_logs
          const {data:log}=await supabase.from('shift_logs').select('id').eq('id',shift.id)
            .limit(1).catch(()=>({data:null}));
          if(log && log.length>0){
            // Terkonfirmasi sudah tutup -- baru null
            setShiftState(null);
            try{localStorage.removeItem(shiftKey);}catch{}
            notify("⚠ Shift telah ditutup dari perangkat lain","warn");
          }
          // Jika tidak ada di shift_logs = false alarm, pertahankan shift
        }
        // Update localStorage dengan data terbaru
        if(s) try{localStorage.setItem(shiftKey, JSON.stringify(s));}catch{}
      }catch(e){
        // Timeout atau error koneksi -- SKIP, jangan null shift
        console.log('[ShiftVerify] Skip -- koneksi bermasalah:', e.message);
      }
    };
    const iv = setInterval(verifyShift, 30000);
    return ()=>clearInterval(iv);
  },[shift?.id, selectedOutlet]);

  // -- Load shift dari Supabase -- cross-check dengan shift_logs --------------
  useEffect(()=>{
    setShiftLoading(true);
    const loadShift = async () => {
      try{
        const s = await dbShift.getActiveShift(selectedOutlet, user.username);
        if(s){
          // Verifikasi: cek apakah shift ini sudah ada di shift_logs
          const { data: logCheck } = await supabase
            .from('shift_logs').select('id').eq('id', s.id).limit(1);
          if(logCheck && logCheck.length > 0){
            // Shift sudah ditutup tapi active_shifts belum bersih -- hapus
            console.warn('[Shift] Stale shift ditemukan, membersihkan:', s.id);
            await supabase.from('active_shifts').delete().eq('outlet_id', selectedOutlet);
            setShiftState(null);
            try{ localStorage.removeItem(shiftKey); }catch{}
          } else {
            // Aktif -- simpan juga ke localStorage sebagai backup
            setShiftState(s);
            try{ localStorage.setItem(shiftKey, JSON.stringify(s)); }catch{}
          }
        } else {
          // Tidak ada shift aktif di DB
          // Cek localStorage -- mungkin shift baru dibuka tapi belum sync
          const localShift = (() => { try{ const v=localStorage.getItem(shiftKey); return v?JSON.parse(v):null; }catch{return null;} })();
          if(localShift && navigator.onLine){
            // Ada di lokal tapi tidak di DB -- kemungkinan koneksi putus saat openShift
            // Coba re-sync ke Supabase
            console.warn('[Shift] Shift lokal tidak ada di DB, re-sync...');
            try{
              await dbShift.openShift({...localShift, id:localShift.id}, selectedOutlet, user.username);
              setShiftState(localShift);
              console.log('[Shift] Re-sync berhasil:', localShift.id);
            }catch(e2){
              console.warn('[Shift] Re-sync gagal:', e2);
              setShiftState(localShift); // pakai lokal saja dulu
            }
          } else if(localShift && !navigator.onLine){
            // Offline -- pakai shift dari localStorage, jangan null
            console.log('[Shift] Offline -- pakai shift dari localStorage');
            setShiftState(localShift);
          } else {
            setShiftState(null);
            try{ localStorage.removeItem(shiftKey); }catch{}
          }
        }
      }catch(e){
        // -- KRITIS: JANGAN null shift karena error koneksi ------------------
        // Coba fallback ke localStorage
        console.warn('[Shift] loadShift error -- fallback localStorage:', e.message||e);
        const localShift = (() => { try{ const v=localStorage.getItem(shiftKey); return v?JSON.parse(v):null; }catch{return null;} })();
        if(localShift){
          console.log('[Shift] Pakai shift dari localStorage:', localShift.id);
          setShiftState(localShift); // JANGAN null! pakai lokal
        }
        // Jika tidak ada lokal pun, jangan set null -- biarkan state sebelumnya
        // setShiftState(null) DIHAPUS dari sini
      } finally {
        setShiftLoading(false);
      }
    };
    loadShift();
  },[selectedOutlet]);

  // Wrapper setShift -- TIDAK simpan ke localStorage (Supabase = source of truth)
  const setShift = (val) => {
    setShiftState(val);
    // Hanya hapus localStorage kalau null (tutup shift)
    if(!val) try{ localStorage.removeItem(shiftKey); }catch{}
  };

  // Wrapper setCart -- auto simpan ke localStorage
  const setCartPersist = (fn) => {
    setCart(prev=>{
      const next = typeof fn==="function" ? fn(prev) : fn;
      try{ localStorage.setItem(cartKey, JSON.stringify(next)); }catch{}
      return next;
    });
  };

  const CATEGORIES = ["Semua",...Array.from(new Set(activeProducts.map(p=>p.category)))];
  const filteredProds = activeProducts.filter(p=>
    (activeCat==="Semua"||p.category===activeCat)&&
    (p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search))
  );

  // Misi auto_produk yang aktif & punya produk match di outlet ini -- untuk quick-log chip
  const misiAutoProdukActive = (portalMisi||[]).filter(m=>m.tipe==="auto_produk"&&m.produk_id).map(m=>{
    const prod = activeProducts.find(p=>String(p.id)===String(m.produk_id)||p.name===m.produk_id);
    if(!prod) return null;
    const periodeKey = getPeriodeKey(m.periode||"harian");
    const rec = portalMisiProgress[m.id]?.[user.username||user.id]?.[periodeKey];
    return {...m, prod, progress:rec?.progress||0, selesai:rec?.selesai||false};
  }).filter(Boolean);

  const addToCart = product=>{
    if(!shift) return notify("⚠ Buka shift dulu sebelum transaksi!","err");
    setCartPersist(prev=>{
      const ex=prev.find(i=>i.id===product.id&&!i.isManual);
      if(ex) return prev.map(i=>i.id===product.id&&!i.isManual?{...i,qty:i.qty+1}:i);
      return [...prev,{...product,qty:1,cartId:uid()}];
    });
    notify(`+ ${product.name}`,"ok");
  };
  const addManual=()=>{
    if(!manualForm.name||!manualForm.price) return notify("Isi nama & harga jual!","err");
    if(!manualForm.modal||+manualForm.modal<=0) return notify("Harga modal wajib diisi!","err");
    if(!shift) return notify("⚠ Buka shift dulu sebelum transaksi!","err");
    setCartPersist(prev=>[...prev,{id:`m-${uid()}`,cartId:uid(),isManual:true,stock:null,name:manualForm.name,modal:+manualForm.modal||0,price:+manualForm.price,qty:+manualForm.qty||1}]);
    setManualForm({name:"",modal:"",price:"",qty:1});setShowManual(false);
    notify("Item manual ditambahkan","ok");
  };
  const updQty=(cid,d)=>setCartPersist(prev=>prev.map(i=>i.cartId===cid?{...i,qty:Math.max(1,i.qty+d)}:i));
  const remItem=cid=>setCartPersist(prev=>prev.filter(i=>i.cartId!==cid));
  const total  =cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cashNum=Number(cashInput.replace(/\D/g,""))||0;
  const change =cashNum-total;

  const handleBarcode=e=>{
    if(e.key!=="Enter") return;
    if(!shift) return notify("⚠ Buka shift dulu sebelum transaksi!","err");
    const p=products.find(x=>x.barcode===barcode);
    if(p){addToCart(p);setBarcode("");}else notify("Produk tidak ditemukan!","err");
  };

  // Update progress misi auto_produk & auto_transaksi saat transaksi tersimpan
  const updateMisiProgress = (trx) => {
    if(!portalMisi.length) return;
    const activeMisi = portalMisi.filter(m=>m.tipe==="auto_produk"||m.tipe==="auto_transaksi");
    if(!activeMisi.length) return;
    activeMisi.forEach(m=>{
      let increment = 0;
      if(m.tipe==="auto_transaksi"){
        increment = 1; // 1 transaksi = +1
      } else if(m.tipe==="auto_produk"&&m.produk_id){
        // hitung qty produk yang match di transaksi ini
        increment = (trx.items||[]).filter(it=>
          (it.id===m.produk_id) || (it.name===m.produk_id) || (it.stock?.id===m.produk_id)
        ).reduce((s,it)=>s+(it.qty||1),0);
      }
      if(increment<=0) return;
      const periodeKey = getPeriodeKey(m.periode||"harian");
      const username = user.username||user.id;
      const existing = portalMisiProgress[m.id]?.[username]?.[periodeKey]?.progress||0;
      const newProgress = existing+increment;
      const selesai = newProgress>=(m.target||1);
      try{
        supabase.from('portal_misi_progress').upsert({
          misi_id:m.id, username, periode_key:periodeKey,
          progress:newProgress, selesai, updated_at:new Date().toISOString()
        },{onConflict:'misi_id,username,periode_key'});
      }catch(e){ console.warn('misi progress upsert:',e); }
    });
  };

  // ── Misi Auto Produk: quick-log button (kasir) ──
  // Klik = catat 1 "penjualan" produk misi (price:0, tidak pengaruhi total/kas/stok)
  // tapi tetap masuk riwayat transaksi (audit) & update progress misi otomatis
  const quickLogMisi = async (m, prodName) => {
    if(!shift) return notify("⚠ Buka shift dulu sebelum mencatat misi!","err");
    const trx = {
      id:uid(), time:now(), date:today(), shiftId:shift?.id, shiftNama:shift?.nama, kasir:user.nama, outletId:selectedOutlet,
      items:[{id:m.produk_id, cartId:uid(), name:prodName||m.judul||"Misi", price:0, qty:1, modal:0, isMisiLog:true, refunded:false, refundReason:""}],
      total:0, cash:0, kembalian:0,
    };
    setTx(prev=>[trx,...prev]);
    updateMisiProgress(trx);
    try{ await db.addTransaction(trx); }catch(e){ console.warn('quickLogMisi save:',e); }
    notify(`✓ ${prodName||m.judul} dicatat untuk misi`,"ok");
  };

  // ── Printer Bluetooth (ESC/POS) ──────────────────────────────────────
  const ESC = '\x1B', GS = '\x1D';
  const escposEncode = (str) => {
    const bytes = [];
    for (let i=0;i<str.length;i++) {
      const code = str.charCodeAt(i);
      bytes.push(code>255?63:code);
    }
    return new Uint8Array(bytes);
  };
  const connectPrinter = async () => {
    if(!navigator.bluetooth){ notify("Browser tidak mendukung Bluetooth. Gunakan Chrome Android.","err"); return; }
    setBtConnecting(true);
    try{
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb']
      });
      const server = await device.gatt.connect();
      setBtDevice({device,server});
      notify(`✓ Printer "${device.name||'Bluetooth'}" tersambung`,"ok");
      device.addEventListener('gattserverdisconnected',()=>{ setBtDevice(null); notify("Printer terputus","warn"); });
    }catch(e){
      if(e.name!=="NotFoundError") notify("Gagal sambung printer: "+e.message,"err");
    }
    setBtConnecting(false);
  };
  const disconnectPrinter = () => {
    try{ btDevice?.device?.gatt?.disconnect(); }catch{}
    setBtDevice(null);
  };
  const getPrintCharacteristic = async () => {
    if(!btDevice?.server) throw new Error("Printer belum tersambung");
    const knownServices = ['000018f0-0000-1000-8000-00805f9b34fb','0000ffe0-0000-1000-8000-00805f9b34fb','0000ff00-0000-1000-8000-00805f9b34fb'];
    for(const svcUuid of knownServices){
      try{
        const service = await btDevice.server.getPrimaryService(svcUuid);
        const chars = await service.getCharacteristics();
        const writable = chars.find(c=>c.properties.write||c.properties.writeWithoutResponse);
        if(writable) return writable;
      }catch{}
    }
    const services = await btDevice.server.getPrimaryServices();
    for(const service of services){
      try{
        const chars = await service.getCharacteristics();
        const writable = chars.find(c=>c.properties.write||c.properties.writeWithoutResponse);
        if(writable) return writable;
      }catch{}
    }
    throw new Error("Karakteristik printer tidak ditemukan");
  };
  const sendToPrinter = async (bytes) => {
    const char = await getPrintCharacteristic();
    const CHUNK = 100;
    for(let i=0;i<bytes.length;i+=CHUNK){
      const chunk = bytes.slice(i,i+CHUNK);
      try{ await char.writeValueWithoutResponse(chunk); }
      catch{ await char.writeValue(chunk); }
      await new Promise(r=>setTimeout(r,30));
    }
  };
  const buildStrukBytes = (trx) => {
    const W = 32;
    const line = (ch="-") => ch.repeat(W)+"\n";
    const row = (l,r) => { const space=Math.max(1,W-l.length-r.length); return l+" ".repeat(space)+r+"\n"; };
    const outletNamaTrx = outlets.find(o=>o.id===trx.outletId)?.nama||"Outlet";
    const cfg = strukConfig||{};

    let s = "";
    s += ESC+"@";
    s += ESC+"a"+"\x01";
    s += ESC+"!"+"\x18";
    s += (cfg.namaToko||"AMMAR CELL")+"\n";
    s += ESC+"!"+"\x00";
    if(cfg.headerExtra) s += cfg.headerExtra+"\n";
    if(cfg.showOutlet!==false) s += outletNamaTrx+"\n";
    s += ESC+"a"+"\x00";
    s += line("=");
    s += `${trx.date} ${trx.time}\n`;
    if(cfg.showKasir!==false) s += `Kasir : ${trx.kasir}\n`;
    if(cfg.showNoTrx!==false) s += `No    : ${(trx.id||"").toString().slice(-8)}\n`;
    s += line("-");
    (trx.items||[]).filter(i=>!i.refunded).forEach(it=>{
      s += `${it.name}\n`;
      s += row(`  ${it.qty} x ${it.price.toLocaleString("id-ID")}`, (it.price*it.qty).toLocaleString("id-ID"));
    });
    s += line("-");
    s += row("TOTAL", `Rp ${trx.total.toLocaleString("id-ID")}`);
    s += row("Tunai", `Rp ${trx.cash.toLocaleString("id-ID")}`);
    s += row("Kembali", `Rp ${trx.kembalian.toLocaleString("id-ID")}`);
    s += line("=");
    s += ESC+"a"+"\x01";
    if(cfg.footer1) s += cfg.footer1+"\n";
    if(cfg.footer2) s += cfg.footer2+"\n";
    s += "\n\n\n";
    s += GS+"V"+"\x00";
    return escposEncode(s);
  };
  const printStruk = async (trx) => {
    if(!trx) return notify("Tidak ada transaksi untuk dicetak","err");
    if(!btDevice){ notify("⚠ Printer belum tersambung. Klik 'Hubungkan Printer' dulu.","err"); return; }
    try{
      const bytes = buildStrukBytes(trx);
      await sendToPrinter(bytes);
      notify("🖨️ Struk dikirim ke printer","ok");
    }catch(e){
      notify("Gagal cetak: "+e.message,"err");
    }
  };

  const pay=()=>{
    if(!cart.length) return notify("Keranjang kosong!","err");
    const cashFinal=cashNum>=total?cashNum:total;
    const trx={id:uid(),time:now(),date:today(),shiftId:shift?.id,shiftNama:shift?.nama,kasir:user.nama,outletId:selectedOutlet,
      items:cart.map(i=>({...i,refunded:false,refundReason:""})),total,cash:cashFinal,kembalian:cashFinal-total};
    // -- Offline: simpan ke antrian lokal ----------------------------------
    if(!navigator.onLine || connStatus==="offline"){
      try{
        const qKey=`offline_queue_${selectedOutlet}`;
        const existing=JSON.parse(localStorage.getItem(qKey)||"[]");
        localStorage.setItem(qKey, JSON.stringify([...existing,{type:"transaction",data:trx}]));
      }catch{}
      setOfflineQueue(prev=>[...prev,{type:"transaction",data:trx}]);
      setTx(prev=>[trx,...prev]); // tetap tampilkan di UI
      updateMisiProgress(trx);
      setCartPersist([]);setCashInput("");setShowPayment(false);
      setLastTrx(trx);
      notify("📵 Offline -- Transaksi tersimpan lokal, dikirim saat online","warn");
      return;
    }
    // Simpan ke localStorage dulu sebagai backup
    try{
      const txBackupKey=`trx_backup_${selectedOutlet}`;
      const existing=JSON.parse(localStorage.getItem(txBackupKey)||"[]");
      localStorage.setItem(txBackupKey, JSON.stringify([trx,...existing].slice(0,200)));
    }catch{}
    // Update UI langsung
    setTx(prev=>[trx,...prev]);
    updateMisiProgress(trx);
    // Simpan ke Supabase dengan retry
    const syncTrx = async (retries=3) => {
      for(let i=0;i<retries;i++){
        try{
          await db.addTransaction(trx);
          console.log('[Trx] Saved to Supabase:', trx.id);
          return;
        }catch(e){
          console.warn(`[Trx] Sync attempt ${i+1} gagal:`, e.message||e);
          if(i<retries-1) await new Promise(r=>setTimeout(r,1500*(i+1)));
        }
      }
      // Simpan ke offline queue untuk retry nanti
      try{
        const qKey=`offline_queue_${selectedOutlet}`;
        const existing=JSON.parse(localStorage.getItem(qKey)||"[]");
        if(!existing.find(x=>x.data?.id===trx.id)){
          localStorage.setItem(qKey, JSON.stringify([...existing,{type:"transaction",data:trx}]));
        }
      }catch{}
      setOfflineQueue(prev=>prev.find(x=>x.data?.id===trx.id)?prev:[...prev,{type:"transaction",data:trx}]);
      notify("⚠ Koneksi lemah -- transaksi tersimpan, akan sync otomatis","warn");
    };
    syncTrx();
    setStocks(prev=>{
      const s={...prev,[selectedOutlet]:{...prev[selectedOutlet]}};
      cart.forEach(i=>{if(!i.isManual) s[selectedOutlet][i.id]=Math.max(0,(s[selectedOutlet][i.id]||0)-i.qty);});
      return s;
    });
    setCartPersist([]);setCashInput("");setShowPayment(false);
    setLastTrx(trx);
    notify("✓ Transaksi berhasil!","ok");
  };

  const doRefund=()=>{
    if(!refundReason.trim()) return notify("Isi alasan refund!","err");
    setTx(prev=>prev.map(t=>{
      if(t.id!==refundModal.trxId) return t;
      const updated={...t,items:t.items.map(i=>i.cartId!==refundModal.cartId?i:{...i,refunded:true,refundReason})};
      // Sync ke Supabase
      db.updateTransactionItems(t.id, updated.items).catch(e=>console.error("Gagal sync refund:",e));
      return updated;
    }));
    notify("Item direfund","ok");setRefundModal(null);setRefundReason("");
  };

  const openShift = async (data) => {
    // -- Cek apakah outlet sudah ada shift aktif dari user lain --
    try {
      const {data:activeRows} = await supabase.from('active_shifts').select('*').eq('outlet_id', selectedOutlet);
      if(activeRows && activeRows.length > 0) {
        const existing = activeRows[0];
        const shiftUser = existing.kasir || existing.nama_shift || "kasir lain";
        if(shiftUser !== user.username && shiftUser !== user.nama) {
          notify(`⚠️ Outlet ini masih ada shift aktif milik "${shiftUser}". Shift harus ditutup dulu sebelum bisa buka shift baru!`, "err");
          return;
        }
      }
    } catch(e){ console.warn('cek active_shifts gagal:', e); }

    const s={id:uid(),nama:data.namaShift,start:now(),...data};
    const saldoData = {
      namaShift: data.namaShift,
      saldoApps: data.saldoApps||{},
      cashKembalian: data.cashKembalian||0,
      cashKemb: data.cashKembalian||0,
      totalSaldoApps: data.totalSaldoApps||0,
      waktuBuka: now(),
    };
    // -- Simpan ke localStorage DULU (sebelum Supabase) ------------------
    // Jadi kalau koneksi putus, shift tetap ada
    try{ localStorage.setItem(shiftKey, JSON.stringify(s)); }catch{}
    try{ localStorage.setItem(`ammar_shift_saldo_${s.id}`, JSON.stringify({type:"open",...saldoData})); }catch{}
    
    // Set state UI dulu -- tidak perlu tunggu Supabase
    setShift(s);
    setShowShift(false);
    notify("Shift dibuka!","ok");
    
    // Simpan ke Supabase (async, dengan retry)
    const syncToSupabase = async (retries=3) => {
      for(let i=0;i<retries;i++){
        try{
          await dbShift.openShift({...s, saldo_data: saldoData}, selectedOutlet, user.username);
          console.log('[Shift] openShift synced ke Supabase:', s.id);
          return;
        }catch(e){
          console.warn(`[Shift] openShift sync attempt ${i+1} gagal:`, e.message||e);
          if(i<retries-1) await new Promise(r=>setTimeout(r,2000*(i+1)));
        }
      }
      // Semua retry gagal -- shift tetap ada di lokal, akan sync saat koneksi balik
      notify("⚠ Shift tersimpan lokal, belum sync ke server","warn");
    };
    syncToSupabase();
  };

  const closeShift = async (data) => {
    // -- Guard: jangan tutup shift saat offline -----------------------------
    if(!navigator.onLine || connStatus==="offline"){
      notify("📵 Tidak bisa tutup shift -- tidak ada koneksi internet. Pastikan tersambung dulu.","err");
      return;
    }
    const closeData={...data, waktuTutup:now()};
    const shiftRef = shift; // simpan referensi SEBELUM di-null

    // Simpan ke localStorage untuk laporan
    try{
      const shiftSaldoKey=`ammar_shift_saldo_${shiftRef?.id}`;
      const existing=JSON.parse(localStorage.getItem(shiftSaldoKey)||"{}");
      localStorage.setItem(shiftSaldoKey, JSON.stringify({
        ...existing, type:"closed", waktuTutup:closeData.waktuTutup,
        saldoAppsAkhir:data.saldoAppsClose||{}, cashKembClose:data.cashKembC||0,
        setorTunai:data.setorTunai||0, hutang:data.hutang||0,
        pending:data.pending||0, pengeluaran:data.pengeluaran||0,
        noteKlr:data.noteKlr||"",
        kasNyataSystem:data.kasNyataSystem||0, kasNyataFisik:data.kasNyataFisik||0,
        selisih:data.selisih||0, notes:data.notes||"",
      }));
    }catch{}

    // Simpan ke Supabase DULU (pakai shiftRef bukan shift)
    try{
      await dbShift.closeShift(shiftRef, selectedOutlet, user.username, closeData);
    }catch(e){ console.error("closeShift error:", e); }

    // Paksa hapus active_shifts
    try{ await supabase.from('active_shifts').delete().eq('outlet_id', selectedOutlet); }catch{}

    // Baru set null UI
    setShiftState(null);
    try{ localStorage.removeItem(shiftKey); }catch{}
    setShowShift(false);

    notify(`Shift ditutup. Selisih: ${fmtRp(data.selisih)}`, data.selisih===0?"ok":"warn");
  };

  const calcOmset=list=>list.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
  const txOutlet    = transactions.filter(t=>t.outletId===selectedOutlet);
  const shiftTrxList= shift?txOutlet.filter(t=>t.shiftId===shift.id):[];
  const omsetShift  = calcOmset(shiftTrxList);
  const omsetHari   = calcOmset(txOutlet.filter(t=>t.date===today()));
  const itemHari    = txOutlet.filter(t=>t.date===today()).reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);

  const groupByShift=()=>{
    const g={};
    txOutlet.forEach(t=>{const k=t.shiftId||"ns";const l=t.shiftNama||"Tanpa Shift";if(!g[k])g[k]={key:k,label:l,items:[]};g[k].items.push(t);});
    return Object.values(g);
  };

  const QUICK=[5000,10000,20000,50000,100000];

  return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#f0faf8",minHeight:"100vh"}}>
      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",alignItems:"center",padding:"0 16px",boxShadow:"0 2px 14px rgba(13,148,136,.35)",position:"sticky",top:0,zIndex:100}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 12px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",marginRight:8,fontFamily:"inherit"}}>← Menu</button>
        <div style={{marginRight:"auto"}}>
          <div style={{fontWeight:900,fontSize:14,color:"#fff",lineHeight:1.1}}>{outlet?.nama||"Kasir"}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600}}>{user.nama}</div>
        </div>
        {/* -- Conn dot -- satu-satunya tambahan visual -- */}
        {(()=>{
          const dc=connStatus==="offline"?"#f87171":connStatus==="online"?"#4ade80":"#fbbf24";
          const dp=connStatus!=="online";
          return(<div title={connStatus==="offline"?"📵 Tidak ada koneksi":connStatus==="reconnecting"?"🔄 Menghubungkan...":connStatus==="slow"?"⚠ Koneksi lambat":connStatus==="warn"?"⚡ Sinyal lemah":"🟢 Online"}
            style={{width:9,height:9,borderRadius:"50%",background:dc,marginRight:8,flexShrink:0,
              boxShadow:`0 0 0 3px ${dc}44`,
              animation:dp?"kdot 1.2s ease-in-out infinite":"none",cursor:"default"}}/>);
        })()}
        <style>{`@keyframes kdot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.45)}}`}</style>
        {/* Pilih outlet (hanya admin) */}
        {user.role==="admin"&&(
          <select value={selectedOutlet} onChange={e=>{setSelectedOutlet(e.target.value);setCartPersist([]);}}
            style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 12px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",marginRight:8,fontFamily:"inherit",outline:"none"}}>
            {outlets.map(o=><option key={o.id} value={o.id} style={{color:"#000"}}>{o.nama}</option>)}
          </select>
        )}
        <div onClick={()=>{setShiftMode(shift?"close":"open");setShowShift(true);}} style={{background:shift?"rgba(255,255,255,.18)":"rgba(255,100,100,.3)",border:`1px solid ${shift?"rgba(255,255,255,.35)":"rgba(255,100,100,.6)"}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",marginRight:8,fontSize:11,fontWeight:800,color:"#fff"}}>
          {shift?`⏱ ${shift.nama}`:"⚠ Buka Shift"}
        </div>
        {[{id:"kasir",l:"Kasir"},{id:"riwayat",l:"Riwayat"},{id:"stok",l:"Stok"}].map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{background:page===n.id?"rgba(255,255,255,.16)":"transparent",border:"none",color:"#fff",fontWeight:page===n.id?800:600,fontSize:12,padding:"14px 11px",borderBottom:page===n.id?"3px solid #fff":"3px solid transparent",cursor:"pointer",fontFamily:"inherit"}}>{n.l}</button>
        ))}
      </div>

      {/* KASIR */}
      {page==="kasir"&&(
        <div className="kasir-layout" style={{position:"relative"}}>

          {/* -- OVERLAY: Loading shift / Shift belum dibuka -- */}
          {(shiftLoading||!shift)&&(
            <div style={{position:"fixed",inset:0,zIndex:200,background:"linear-gradient(135deg,rgba(10,122,112,.96),rgba(13,148,136,.96))",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,backdropFilter:"blur(6px)",fontFamily:"'Nunito',sans-serif"}}>
              {shiftLoading?(
                <>
                  <div style={{fontSize:48,lineHeight:1,animation:"spin 1s linear infinite"}}>⏳</div>
                  <div style={{fontWeight:800,fontSize:18,color:"#fff"}}>Memeriksa shift...</div>
                </>
              ):(
                <>
                  <div style={{fontSize:64,lineHeight:1}}>🔒</div>
                  <div style={{fontWeight:900,fontSize:24,color:"#fff",textAlign:"center",letterSpacing:"-0.5px"}}>Shift Belum Dibuka</div>
                  <div style={{fontSize:14,color:"rgba(255,255,255,.85)",textAlign:"center",maxWidth:320,lineHeight:1.7,padding:"0 24px"}}>
                    Kamu harus membuka shift terlebih dahulu sebelum bisa melakukan transaksi
                  </div>
                  <button
                    onClick={()=>{setShiftMode("open");setShowShift(true);}}
                    style={{background:"#fff",border:"none",borderRadius:16,padding:"16px 36px",color:"#0d9488",fontWeight:900,fontSize:17,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 8px 30px rgba(0,0,0,.25)",marginTop:8,transition:"transform .15s"}}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.04)"}
                    onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"}
                  >
                    🟢 Buka Shift Sekarang
                  </button>
                  <div style={{fontSize:12,color:"rgba(255,255,255,.5)",marginTop:4}}>
                    {outlets.find(o=>o.id===selectedOutlet)?.nama}
                  </div>
                </>
              )}
            </div>
          )}
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",padding:"10px 10px 10px 14px"}}>
            <div style={{display:"flex",gap:6,marginBottom:7}}>
              <div style={{flex:1,position:"relative"}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Search()}</span>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama / kode..."
                  style={{width:"100%",padding:"7px 10px 7px 26px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",background:"#fff"}}/>
              </div>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Barcode()}</span>
                <input value={barcode} onChange={e=>setBarcode(e.target.value)} onKeyDown={handleBarcode} placeholder="Scan barcode…"
                  style={{width:145,padding:"7px 10px 7px 26px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",background:"#fff"}}/>
              </div>
              <button onClick={()=>setShowManual(true)} style={{background:"#0d9488",border:"none",borderRadius:9,padding:"7px 12px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>＋ Manual</button>
            </div>
            {misiAutoProdukActive.length>0&&(
              <div style={{display:"flex",gap:6,marginBottom:7,flexWrap:"wrap",alignItems:"center"}}>
                <span style={{fontSize:10,fontWeight:700,color:"#8e44ad"}}>🎯 Misi:</span>
                {misiAutoProdukActive.map(m=>(
                  <button key={m.id} onClick={()=>quickLogMisi(m,m.prod.name)} disabled={m.selesai}
                    title={`Catat 1x "${m.prod.name}" untuk misi "${m.judul}" (${m.progress}/${m.target})`}
                    style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,border:`2px solid ${m.selesai?"#bbf7d0":"#e0d4f7"}`,background:m.selesai?"#f0fdf4":"#f5eeff",color:m.selesai?"#16a34a":"#8e44ad",fontWeight:700,fontSize:10,cursor:m.selesai?"default":"pointer",fontFamily:"inherit"}}>
                    {m.selesai?"✅":"➕"} {m.prod.name} <span style={{opacity:.7}}>({m.progress}/{m.target})</span>
                  </button>
                ))}
              </div>
            )}
            <div style={{display:"flex",gap:5,marginBottom:7,flexWrap:"wrap"}}>
              {CATEGORIES.map(c=>(
                <button key={c} onClick={()=>setActiveCat(c)} style={{padding:"3px 10px",borderRadius:20,border:"2px solid",borderColor:activeCat===c?"#0d9488":"#b2ede6",background:activeCat===c?"#0d9488":"#fff",color:activeCat===c?"#fff":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{c}</button>
              ))}
            </div>
            <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:3}}>
              {filteredProds.map(p=>{
                const stok=outletStock[p.id]??0;
                return (
                  <button key={p.id} onClick={()=>addToCart(p)} style={{display:"flex",alignItems:"center",background:"#fff",border:"2px solid #e8f8f5",borderRadius:10,padding:"7px 11px",textAlign:"left",transition:"all .12s",gap:8,cursor:"pointer",fontFamily:"inherit"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#0d9488";e.currentTarget.style.background="#f0fdfb";}}
                    onMouseLeave={e=>{e.currentTarget.style.borderColor="#e8f8f5";e.currentTarget.style.background="#fff";}}>
                    <span style={{fontSize:9,background:"#e0faf5",color:"#0d9488",fontWeight:700,padding:"2px 6px",borderRadius:5,whiteSpace:"nowrap"}}>{p.category}</span>
                    <span style={{flex:1,fontWeight:700,fontSize:12,color:"#1a2e2a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</span>
                    <span style={{fontWeight:900,fontSize:13,color:"#0d9488",whiteSpace:"nowrap"}}>{fmtRp(p.price)}</span>
                    <span style={{fontSize:10,color:stok<=2?"#ff4757":"#bbb",fontWeight:600,minWidth:40,textAlign:"right"}}>stk:{stok}</span>
                  </button>
                );
              })}
              {filteredProds.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:30,fontSize:13}}>Produk tidak ditemukan</div>}
            </div>
          </div>

          {/* KERANJANG */}
          <div className="kasir-cart" style={{background:"#fff",borderLeft:"2px solid #e0f5f1",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"10px 13px",borderBottom:"2px solid #e0f5f1",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>{Ic.Cart(17)} Keranjang {cart.length>0&&<span style={{background:"#0d9488",color:"#fff",borderRadius:20,fontSize:10,padding:"1px 7px",marginLeft:5}}>{cart.length}</span>}</span>
              {cart.length>0&&<button onClick={()=>setCartPersist([])} style={{background:"#fff0f0",border:"none",color:"#ff4757",borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Kosongkan</button>}
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"7px 10px"}}>
              {cart.length===0?(
                <div style={{textAlign:"center",color:"#ccc",padding:"28px 0",fontSize:12}}><div style={{fontSize:28,marginBottom:5}}>🛒</div>Keranjang kosong</div>
              ):cart.map(item=>(
                <div key={item.cartId} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 0",borderBottom:"1px solid #f0faf8"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                    <div style={{fontSize:10,color:"#0d9488",fontWeight:700}}>{fmtRp(item.price)}{item.isManual&&<span style={{color:"#ffa502",marginLeft:4}}>●M</span>}</div>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:3}}>
                    <button onClick={()=>updQty(item.cartId,-1)} style={{width:21,height:21,borderRadius:5,border:"2px solid #b2ede6",background:"#fff",color:"#0d9488",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{Ic.Minus()}</button>
                    <span style={{width:20,textAlign:"center",fontWeight:800,fontSize:13}}>{item.qty}</span>
                    <button onClick={()=>updQty(item.cartId,+1)} style={{width:21,height:21,borderRadius:5,border:"2px solid #b2ede6",background:"#fff",color:"#0d9488",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>{Ic.Plus()}</button>
                  </div>
                  <div style={{fontWeight:800,fontSize:12,minWidth:50,textAlign:"right"}}>{fmtRp(item.price*item.qty)}</div>
                  <button onClick={()=>remItem(item.cartId)} style={{background:"none",border:"none",color:"#ff6b81",padding:2,cursor:"pointer"}}>{Ic.Trash()}</button>
                </div>
              ))}
            </div>
            <div style={{padding:"10px 13px",borderTop:"2px solid #e0f5f1"}}>
              <button onClick={btDevice?disconnectPrinter:connectPrinter} disabled={btConnecting}
                style={{width:"100%",marginBottom:8,padding:"7px",borderRadius:9,border:`2px solid ${btDevice?"#16a34a":"#e0f5f1"}`,
                  background:btDevice?"#f0fdf4":"#fff",color:btDevice?"#16a34a":"#888",fontWeight:700,fontSize:11,cursor:btConnecting?"wait":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {btConnecting?"⏳ Menyambungkan...":btDevice?`🖨️ Printer Tersambung (${btDevice.device?.name||"BT"}) — Putuskan`:"🔗 Hubungkan Printer Bluetooth"}
              </button>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
                <span style={{fontWeight:700,color:"#666",fontSize:13}}>Total</span>
                <span style={{fontWeight:900,fontSize:20,color:"#0d9488"}}>{fmtRp(total)}</span>
              </div>
              {!showPayment?(
                <button onClick={()=>{if(!cart.length)return notify("Keranjang kosong!","err");setShowPayment(true);}} style={{width:"100%",background:cart.length?"linear-gradient(135deg,#0d9488,#14b8a6)":"#ccc",border:"none",borderRadius:11,padding:11,color:"#fff",fontWeight:800,fontSize:14,display:"flex",alignItems:"center",justifyContent:"center",gap:7,cursor:"pointer",fontFamily:"inherit"}}>
                  {Ic.Cash()} Bayar Sekarang
                </button>
              ):(
                <div style={{animation:"fadeUp .2s ease"}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#0d9488",marginBottom:5}}>💵 Cash</div>
                  <input value={cashInput?`Rp ${fmt(Number(cashInput.replace(/\D/g,"")))}`:""} onChange={e=>setCashInput(e.target.value.replace(/\D/g,""))} placeholder="Nominal bayar (opsional)"
                    style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,fontWeight:700,marginBottom:6,outline:"none",fontFamily:"inherit"}}/>
                  <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:7}}>
                    {QUICK.map(a=><button key={a} onClick={()=>setCashInput(String(a))} style={{flex:1,minWidth:42,background:"#e0faf5",border:"2px solid #b2ede6",borderRadius:7,color:"#0d9488",fontWeight:700,fontSize:10,padding:"4px 2px",cursor:"pointer",fontFamily:"inherit"}}>{fmt(a)}</button>)}
                    <button onClick={()=>setCashInput(String(total))} style={{flex:1,minWidth:42,background:"#0d9488",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:10,padding:"4px 2px",cursor:"pointer",fontFamily:"inherit"}}>Pas</button>
                  </div>
                  {cashNum>0&&cashNum>=total&&<div style={{background:"#e0faf5",borderRadius:9,padding:"6px 10px",marginBottom:7,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:12,color:"#555"}}>Kembalian</span><span style={{fontWeight:900,fontSize:14,color:"#0d9488"}}>{fmtRp(change)}</span></div>}
                  <div style={{display:"flex",gap:7}}>
                    <button onClick={()=>{setShowPayment(false);setCashInput("");}} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:9,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
                    <button onClick={pay} style={{flex:2,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:9,color:"#fff",fontWeight:800,fontSize:13,display:"flex",alignItems:"center",justifyContent:"center",gap:5,cursor:"pointer",fontFamily:"inherit"}}>{Ic.Check()} Proses Bayar</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RIWAYAT */}
      {page==="riwayat"&&(
        <div style={{padding:"14px 18px",maxWidth:920,margin:"0 auto"}}>
          <div style={{display:"flex",gap:9,marginBottom:14}}>
            <div style={{flex:1,background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:12,padding:"11px 15px",color:"#fff"}}>
              <div style={{fontSize:11,fontWeight:700,opacity:.8}}>Omset Shift Ini</div>
              <div style={{fontWeight:900,fontSize:20}}>{fmtRp(omsetShift)}</div>
              <div style={{fontSize:10,opacity:.7}}>{shift?shift.nama:"Belum ada shift"}</div>
            </div>
            <div style={{flex:1,background:"#fff",border:"2px solid #e0f5f1",borderRadius:12,padding:"11px 15px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#888"}}>Omset Hari Ini</div>
              <div style={{fontWeight:900,fontSize:20,color:"#0d9488"}}>{fmtRp(omsetHari)}</div>
              <div style={{fontSize:10,color:"#aaa"}}>{outlet?.nama}</div>
            </div>
            <div style={{flex:1,background:"#fff",border:"2px solid #e0f5f1",borderRadius:12,padding:"11px 15px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#888"}}>Item Terjual</div>
              <div style={{fontWeight:900,fontSize:20,color:"#0d9488"}}>{itemHari}</div>
              <div style={{fontSize:10,color:"#aaa"}}>pcs hari ini</div>
            </div>
          </div>
          {txOutlet.length===0?(
            <div style={{textAlign:"center",color:"#bbb",padding:50,fontSize:14}}>Belum ada transaksi</div>
          ):groupByShift().map(group=>{
            const gO=calcOmset(group.items);
            const gI=group.items.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
            return (
              <div key={group.key} style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:"12px 12px 0 0",padding:"10px 15px",color:"#fff"}}>
                  <div><span style={{fontWeight:900,fontSize:14}}>⏱ {group.label}</span><span style={{fontSize:11,opacity:.8,marginLeft:8}}>{group.items.length} trx . {gI} item</span></div>
                  <div style={{textAlign:"right"}}><div style={{fontWeight:900,fontSize:16}}>{fmtRp(gO)}</div><div style={{fontSize:10,opacity:.75}}>omset bersih</div></div>
                </div>
                <div style={{background:"#fff",border:"2px solid #e0f5f1",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
                  {group.items.map((t,ti)=>{
                    const rt=t.items.filter(i=>i.refunded).reduce((s,i)=>s+i.price*i.qty,0);
                    return (
                      <div key={t.id} style={{padding:"10px 13px",borderTop:ti>0?"1px solid #f0faf8":"none"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                          <div style={{display:"flex",gap:7,alignItems:"center"}}>
                            <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>#{t.id}</span>
                            <span style={{fontSize:11,color:"#aaa"}}>{t.time}</span>
                            <button onClick={()=>{setLastTrx(t);setShowStruk(true);}} style={{background:"#f0faf8",border:"1px solid #b2ede6",borderRadius:6,color:"#0d9488",fontWeight:700,fontSize:10,padding:"2px 7px",cursor:"pointer",fontFamily:"inherit"}}>🖨️ Cetak</button>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontWeight:900,fontSize:14}}>{fmtRp(t.total)}</div>
                            {rt>0&&<div style={{fontSize:10,color:"#ff4757",fontWeight:700}}>bersih:{fmtRp(t.total-rt)}</div>}
                          </div>
                        </div>
                        {t.items.map(item=>(
                          <div key={item.cartId} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px",borderRadius:7,marginBottom:3,background:item.refunded?"#fff5f5":"#f8fffe",border:`1px solid ${item.refunded?"#ffd6d6":"#e0f5f1"}`}}>
                            <div style={{flex:1,minWidth:0}}>
                              <span style={{fontWeight:700,fontSize:12,color:item.refunded?"#bbb":"#1a2e2a",textDecoration:item.refunded?"line-through":"none"}}>{item.name}</span>
                              <span style={{fontSize:11,color:"#aaa",marginLeft:6}}>×{item.qty}</span>
                              {item.refunded&&<span style={{fontSize:10,color:"#ff4757",fontWeight:600,marginLeft:6,fontStyle:"italic"}}>"{item.refundReason}"</span>}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
                              <span style={{fontWeight:700,fontSize:12,color:item.refunded?"#ccc":"#0d9488"}}>{fmtRp(item.price*item.qty)}</span>
                              {!item.refunded?(
                                <button onClick={()=>{setRefundModal({trxId:t.id,cartId:item.cartId,itemName:item.name});setRefundReason("");}} style={{background:"#fff0f0",border:"1px solid #ffd6d6",borderRadius:6,color:"#ff4757",fontWeight:700,fontSize:10,padding:"2px 7px",cursor:"pointer",fontFamily:"inherit"}}>{Ic.Refund()} Refund</button>
                              ):(
                                <span style={{fontSize:10,color:"#ff4757",fontWeight:700,background:"#fff0f0",padding:"2px 7px",borderRadius:6}}>✗ REFUND</span>
                              )}
                            </div>
                          </div>
                        ))}
                        <div style={{fontSize:11,color:"#aaa",marginTop:5,display:"flex",gap:12}}>
                          <span>Bayar: <b style={{color:"#555"}}>{fmtRp(t.cash)}</b></span>
                          <span>Kembalian: <b style={{color:"#555"}}>{fmtRp(t.kembalian)}</b></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STOK OUTLET -- opname lengkap untuk karyawan */}
      {page==="stok"&&(
        <KasirStokPage
          products={activeProducts}
          outletStock={outletStock}
          outletNama={outlet?.nama}
          selectedOutlet={selectedOutlet}
          stocks={stocks}
          setStocks={setStocks}
          prodOrder={prodOrder}
        />
      )}

      {/* MODAL STRUK SETELAH BAYAR */}
      {showStruk&&lastTrx&&(
        <Modal onClose={()=>setShowStruk(false)} title="✓ Transaksi Berhasil">
          <div style={{background:"#f8fafc",borderRadius:10,padding:"12px",fontFamily:"monospace",fontSize:11,lineHeight:1.6,marginBottom:12,maxHeight:280,overflowY:"auto"}}>
            <div style={{textAlign:"center",fontWeight:900}}>{strukConfig.namaToko||"AMMAR CELL"}</div>
            {strukConfig.headerExtra&&<div style={{textAlign:"center"}}>{strukConfig.headerExtra}</div>}
            {strukConfig.showOutlet!==false&&<div style={{textAlign:"center"}}>{outlets.find(o=>o.id===lastTrx.outletId)?.nama||"Outlet"}</div>}
            <div>{"=".repeat(28)}</div>
            <div>{lastTrx.date} {lastTrx.time}</div>
            {strukConfig.showKasir!==false&&<div>Kasir: {lastTrx.kasir}</div>}
            {strukConfig.showNoTrx!==false&&<div>No    : {(lastTrx.id||"").toString().slice(-8)}</div>}
            <div>{"-".repeat(28)}</div>
            {(lastTrx.items||[]).filter(i=>!i.refunded).map((it,idx)=>(
              <div key={idx}>
                <div>{it.name}</div>
                <div style={{display:"flex",justifyContent:"space-between"}}><span>  {it.qty} x {it.price.toLocaleString("id-ID")}</span><span>{(it.price*it.qty).toLocaleString("id-ID")}</span></div>
              </div>
            ))}
            <div>{"-".repeat(28)}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:900}}><span>TOTAL</span><span>Rp {lastTrx.total.toLocaleString("id-ID")}</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Tunai</span><span>Rp {lastTrx.cash.toLocaleString("id-ID")}</span></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Kembali</span><span>Rp {lastTrx.kembalian.toLocaleString("id-ID")}</span></div>
            {(strukConfig.footer1||strukConfig.footer2)&&<div style={{textAlign:"center",marginTop:8}}>{"=".repeat(28)}</div>}
            {strukConfig.footer1&&<div style={{textAlign:"center"}}>{strukConfig.footer1}</div>}
            {strukConfig.footer2&&<div style={{textAlign:"center",fontSize:9,whiteSpace:"pre-line"}}>{strukConfig.footer2}</div>}
          </div>
          {!btDevice&&(
            <div style={{fontSize:10,color:"#d97706",fontWeight:700,marginBottom:10,background:"#fffbeb",padding:"8px 10px",borderRadius:8}}>
              ⚠ Printer Bluetooth belum tersambung. Hubungkan dulu lewat tombol di sisi kasir untuk mencetak struk.
            </div>
          )}
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setShowStruk(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:9,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Tutup</button>
            <button onClick={()=>printStruk(lastTrx)} disabled={!btDevice} style={{flex:2,background:btDevice?"linear-gradient(135deg,#0d9488,#14b8a6)":"#ccc",border:"none",borderRadius:9,padding:9,color:"#fff",fontWeight:800,fontSize:13,cursor:btDevice?"pointer":"not-allowed",fontFamily:"inherit"}}>🖨️ Cetak Struk</button>
          </div>
        </Modal>
      )}

      {/* MODALS */}
      {showManual&&(
        <Modal onClose={()=>setShowManual(false)} title="➕ Input Manual">
          {[{l:"Nama *",k:"name",t:"text",p:"Nama item..."},{l:"Harga Modal *",k:"modal",t:"number",p:"0"},{l:"Harga Jual *",k:"price",t:"number",p:"0"},{l:"Qty",k:"qty",t:"number",p:"1"}].map(f=>(
            <div key={f.k} style={{marginBottom:8}}>
              <label style={{...lbl}}>{f.l}</label>
              <input type={f.t} value={manualForm[f.k]} onChange={e=>setManualForm(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={inp}/>
            </div>
          ))}
          <div style={{fontSize:10,color:"#ffa502",fontWeight:700,marginBottom:12,background:"#fff8e1",padding:"5px 9px",borderRadius:7}}>⚠ Item manual tidak terhubung ke stok</div>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setShowManual(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:9,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
            <button onClick={addManual} style={{flex:2,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:9,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Tambah</button>
          </div>
        </Modal>
      )}
      {refundModal&&(
        <Modal onClose={()=>setRefundModal(null)} title="↩ Refund Item">
          <div style={{fontSize:12,color:"#555",marginBottom:12}}>Produk: <b>{refundModal.itemName}</b></div>
          <label style={{...lbl}}>Alasan Refund *</label>
          <textarea value={refundReason} onChange={e=>setRefundReason(e.target.value)} placeholder="Contoh: salah scan, produk rusak..."
            style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,resize:"vertical",minHeight:75,marginBottom:12,outline:"none",fontFamily:"inherit"}}/>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setRefundModal(null)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:9,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
            <button onClick={doRefund} style={{flex:2,background:"linear-gradient(135deg,#ff4757,#ff6b6b)",border:"none",borderRadius:9,padding:9,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Konfirmasi Refund</button>
          </div>
        </Modal>
      )}
      {showShift&&<ShiftModal mode={shiftMode} shift={shift} transactions={txOutlet} saldoApps={saldoApps||DEFAULT_SALDO_APPS} onOpen={openShift} onClose={closeShift} onCancel={()=>setShowShift(false)} userName={user.nama} userUsername={user.username||user.id}/>}
    </div>
  );
}

// ==============================================================================
// SALDO APPS PAGE -- kelola list saldo aplikasi (Admin only)
// ==============================================================================
function SaldoAppsPage({ saldoApps, setSaldoApps, saldoBank, setSaldoBank, title, onBack, notify }) {
  const [kasirList, setKasirList] = useState([...(saldoApps||[])]);
  const [bankList,  setBankList]  = useState([...(saldoBank||[])]);
  const [activeTab, setActiveTab] = useState("kasir");
  const [saving,    setSaving]    = useState(false);
  const [newName,   setNewName]   = useState("");
  const dragIdxRef = useRef(null);

  const list    = activeTab==="kasir" ? kasirList : bankList;
  const setList = activeTab==="kasir" ? setKasirList : setBankList;
  const tabColor= activeTab==="kasir" ? "#0d9488" : "#2980b9";

  const add = () => {
    const n = newName.trim().toUpperCase();
    if(!n) return notify("Isi nama aplikasi!","err");
    if(list.includes(n)) return notify("Sudah ada!","err");
    setList(prev=>[...prev, n]);
    setNewName("");
  };
  const remove   = (i)  => setList(prev=>prev.filter((_,idx)=>idx!==i));
  const moveUp   = (i)  => { if(i===0) return; const l=[...list]; [l[i-1],l[i]]=[l[i],l[i-1]]; setList(l); };
  const moveDown = (i)  => { if(i===list.length-1) return; const l=[...list]; [l[i],l[i+1]]=[l[i+1],l[i]]; setList(l); };

  const save = async () => {
    setSaving(true);
    try {
      await dbSaldo.saveSaldoApps(kasirList);
      await dbSaldoBank.saveSaldoBankApps(bankList);
      setSaldoApps(kasirList);
      if(setSaldoBank) setSaldoBank(bankList);
      notify("Saldo aplikasi disimpan ✓","ok");
      onBack();
    } catch {
      setSaldoApps(kasirList);
      if(setSaldoBank) setSaldoBank(bankList);
      notify("Disimpan lokal","warn");
      onBack();
    }
    setSaving(false);
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="📱 Saldo Aplikasi" onBack={onBack}
        right={
          <button onClick={save} disabled={saving}
            style={{background:saving?"#ccc":"linear-gradient(135deg,#fff,#e0faf5)",border:"none",borderRadius:9,padding:"7px 16px",color:"#0d9488",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {saving?"⏳...":"💾 Simpan Semua"}
          </button>
        }
      />

      {/* Tabs */}
      <div style={{background:`linear-gradient(135deg,#0a7a70,#0d9488)`,display:"flex"}}>
        {[{k:"kasir",l:"🧾 Setting Saldo Kasir",n:kasirList.length},{k:"bank",l:"🏦 Setting Saldo Bank",n:bankList.length}].map(t=>(
          <button key={t.k} onClick={()=>{setActiveTab(t.k);setNewName("");}}
            style={{flex:1,padding:"11px 0",border:"none",borderBottom:`3px solid ${activeTab===t.k?"#fff":"transparent"}`,background:"transparent",color:activeTab===t.k?"#fff":"rgba(255,255,255,.55)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
            {t.l} <span style={{background:"rgba(255,255,255,.2)",borderRadius:20,padding:"1px 7px",fontSize:11}}>{t.n}</span>
          </button>
        ))}
      </div>

      <div style={{padding:"16px 20px",maxWidth:560,margin:"0 auto"}}>
        <div style={{background:"#fff8e1",border:"2px solid #f39c1233",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:11,color:"#b7770d",fontWeight:600,lineHeight:1.6}}>
          💡 List berlaku <b>semua outlet</b> -- tampil saat buka/tutup shift.
          Drag <b>⠿</b> atau ↑↓ untuk atur urutan.
        </div>

        {/* Tambah */}
        <div style={{background:"#fff",borderRadius:13,padding:"12px 14px",marginBottom:12,border:`2px solid ${tabColor}33`}}>
          <div style={{fontWeight:800,fontSize:12,color:tabColor,marginBottom:8}}>➕ Tambah Aplikasi {activeTab==="kasir"?"Kasir":"Bank"}</div>
          <div style={{display:"flex",gap:8}}>
            <input value={newName} onChange={e=>setNewName(e.target.value.toUpperCase())}
              onKeyDown={e=>e.key==="Enter"&&add()}
              placeholder={activeTab==="kasir"?"Digipos, Dana, OVO...":"BRI 530, Mitra, Seabank..."}
              style={{flex:1,padding:"8px 11px",borderRadius:9,border:`2px solid ${tabColor}44`,fontSize:13,outline:"none",fontFamily:"inherit"}}/>
            <button onClick={add}
              style={{background:`linear-gradient(135deg,${tabColor},${tabColor}cc)`,border:"none",borderRadius:9,padding:"8px 14px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              + Tambah
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{background:"#fff",borderRadius:13,border:`2px solid #e0f5f1`,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:"1px solid #f0faf8",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:800,fontSize:13,color:tabColor}}>Daftar {activeTab==="kasir"?"Saldo Kasir":"Saldo Bank"}</span>
            <span style={{fontSize:11,color:"#aaa"}}>{list.length} aplikasi</span>
          </div>
          {list.length===0 ? (
            <div style={{textAlign:"center",color:"#ccc",padding:24,fontSize:13}}>Belum ada -- tambah di atas</div>
          ) : list.map((app,i)=>(
            <div key={i}
              draggable
              onDragStart={()=>{dragIdxRef.current=i;}}
              onDragEnter={()=>{
                if(dragIdxRef.current===null||dragIdxRef.current===i) return;
                const l=[...list];
                const [mv]=l.splice(dragIdxRef.current,1);
                l.splice(i,0,mv);
                dragIdxRef.current=i;
                setList(l);
              }}
              onDragOver={e=>e.preventDefault()}
              onDragEnd={()=>{dragIdxRef.current=null;}}
              style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",borderTop:i>0?"1px solid #f0faf8":"none",background:i%2===0?"#fff":"#fafffe",cursor:"grab"}}>
              <span style={{color:"#ccc",fontSize:16,userSelect:"none"}}>⠿</span>
              <span style={{background:`${tabColor}15`,color:tabColor,fontWeight:800,fontSize:10,padding:"1px 7px",borderRadius:20,flexShrink:0}}>{i+1}</span>
              <span style={{flex:1,fontWeight:700,fontSize:13,color:"#1a2e2a"}}>{app}</span>
              <div style={{display:"flex",gap:4}}>
                <button onClick={()=>moveUp(i)} disabled={i===0} style={{background:"#f0f0f0",border:"none",borderRadius:6,padding:"3px 7px",fontSize:11,cursor:i===0?"not-allowed":"pointer",color:i===0?"#ccc":"#555",fontFamily:"inherit"}}>↑</button>
                <button onClick={()=>moveDown(i)} disabled={i===list.length-1} style={{background:"#f0f0f0",border:"none",borderRadius:6,padding:"3px 7px",fontSize:11,cursor:i===list.length-1?"not-allowed":"pointer",color:i===list.length-1?"#ccc":"#555",fontFamily:"inherit"}}>↓</button>
                <button onClick={()=>remove(i)} style={{background:"#fff0f0",border:"none",borderRadius:6,padding:"3px 8px",color:"#e74c3c",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕</button>
              </div>
            </div>
          ))}
        </div>

        {/* Preview */}
        <div style={{marginTop:12,background:"#fff",borderRadius:12,border:`2px solid ${tabColor}22`,padding:"12px 14px"}}>
          <div style={{fontWeight:700,fontSize:11,color:"#aaa",marginBottom:8}}>👁 Preview tampilan di form shift</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {list.slice(0,6).map(app=>(
              <div key={app} style={{background:"#f0faf8",borderRadius:8,padding:"6px 10px",border:"1px solid #e0f5f1"}}>
                <div style={{fontSize:10,color:"#aaa",fontWeight:600}}>{app}</div>
                <div style={{fontSize:12,fontWeight:800,color:tabColor}}>Rp 0</div>
              </div>
            ))}
            {list.length>6&&<div style={{fontSize:11,color:"#aaa",fontWeight:600,padding:"6px 10px"}}>+{list.length-6} lagi...</div>}
          </div>
        </div>
      </div>
    </div>
  );
}


// ==============================================================================
// SHIFT MODAL
// ==============================================================================
function ShiftModal({ mode, shift, transactions, saldoApps, onOpen, onClose, onCancel, userName="", userUsername="" }) {
  const APPS = saldoApps || DEFAULT_SALDO_APPS;
  const blank=()=>{const m={};APPS.forEach(a=>{m[a]="";});return m;};
  // Nama shift SELALU dari username — tidak bisa diubah manual
  const namaShift = userUsername||userName||"Kasir";
  const [cashKemb,setCashKemb]=useState("");
  const [saldoOpen,setSaldoOpen]=useState(blank());
  const [saldoClose,setSaldoClose]=useState(blank());
  const [cashKembC,setCashKembC]=useState("");
  const [setor,setSetor]=useState("");
  const [hutang,setHutang]=useState("");
  const [pending,setPending]=useState("");
  const [klr,setKlr]=useState("");
  const [noteKlr,setNoteKlr]=useState("");
  const [kasNyata,setKasNyata]=useState("");
  const [notes,setNotes]=useState("");

  const tAppO=Object.values(saldoOpen).reduce((s,v)=>s+(+v||0),0);
  const tAppC=Object.values(saldoClose).reduce((s,v)=>s+(+v||0),0);
  const shiftTrx=transactions.filter(t=>t.shiftId===shift?.id);
  const totalP=shiftTrx.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
  const st=+setor||0,htg=+hutang||0,pnd=+pending||0,pk=+klr||0;
  const kasSystem=totalP-st-htg-pnd-pk;
  const kasFisik=+kasNyata||0;
  const selisih=kasFisik-kasSystem;

  const iS={width:"100%",padding:"7px 10px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"};
  const lS={fontSize:11,fontWeight:700,color:"#444",marginBottom:3,display:"block"};
  const Sh=({t,c="#0d9488"})=><div style={{fontWeight:800,fontSize:11,color:c,background:c==="#0d9488"?"#e0faf5":"#fff4e6",borderRadius:7,padding:"4px 10px",margin:"11px 0 7px"}}>{t}</div>;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{background:"#fff",borderRadius:18,padding:20,width:420,boxShadow:"0 20px 55px rgba(0,0,0,.25)",maxHeight:"92vh",overflowY:"auto",animation:"fadeUp .2s ease",fontFamily:"'Nunito',sans-serif"}}>
        <div style={{fontWeight:900,fontSize:15,color:mode==="open"?"#0d9488":"#e74c3c",marginBottom:12}}>
          {mode==="open"?"🟢 Buka Shift":"🔴 Tutup Shift"}
        </div>
        {mode==="open"&&(
          <>
            <div style={{background:"#e0faf5",borderRadius:9,padding:"8px 12px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:14}}>👤</span>
              <div style={{flex:1}}>
                <div style={{fontSize:10,color:"#0d9488",fontWeight:700}}>Nama Shift (otomatis dari username)</div>
                <div style={{fontWeight:900,fontSize:14,color:"#1a2e2a"}}>{namaShift}</div>
              </div>
            </div>
            <Sh t="💵 Cash Kembalian (Catatan)"/>
            <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:6}}>* Hanya catatan, tidak masuk perhitungan</div>
            <label style={lS}>Cash Kembalian</label>
            <input type="number" value={cashKemb} onChange={e=>setCashKemb(e.target.value)} placeholder="0" style={{...iS,marginBottom:4}}/>
            <Sh t="📱 Saldo Aplikasi (Catatan)"/>
            <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:7}}>* Hanya catatan</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {APPS.map(app=>(
                <div key={app}><label style={{...lS,color:"#555"}}>Saldo {app}</label><input type="number" value={saldoOpen[app]||""} onChange={e=>setSaldoOpen(p=>({...p,[app]:e.target.value}))} placeholder="0" style={iS}/></div>
              ))}
            </div>
            <div style={{background:"#e0faf5",borderRadius:9,padding:"9px 12px",marginTop:10,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:12,color:"#0d9488"}}>Total Saldo Aplikasi</span><span style={{fontWeight:900,fontSize:15,color:"#0d9488"}}>{fmtRp(tAppO)}</span></div>
          </>
        )}
        {mode==="close"&&(
          <>
            <div style={{background:"#f0faf8",borderRadius:9,padding:"7px 11px",marginBottom:10,fontSize:12,color:"#555"}}>Shift: <b style={{color:"#0d9488"}}>{shift?.nama}</b> | Mulai: <b>{shift?.start}</b></div>
            <Sh t="📱 Saldo Aplikasi Akhir (Catatan)"/>
            <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:7}}>* Hanya catatan</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
              {APPS.map(app=>(
                <div key={app}><label style={{...lS,color:"#555"}}>Saldo {app}</label><input type="number" value={saldoClose[app]||""} onChange={e=>setSaldoClose(p=>({...p,[app]:e.target.value}))} placeholder="0" style={iS}/></div>
              ))}
            </div>
            <div style={{background:"#e0faf5",borderRadius:9,padding:"9px 12px",marginTop:8,marginBottom:2,display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:12,color:"#0d9488"}}>Total Saldo Aplikasi</span><span style={{fontWeight:900,fontSize:15,color:"#0d9488"}}>{fmtRp(tAppC)}</span></div>
            <Sh t="💵 Cash Kembalian (Catatan)" c="#f39c12"/>
            <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginBottom:6}}>* Hanya catatan, tidak masuk perhitungan</div>
            <label style={lS}>Cash Kembalian</label>
            <input type="number" value={cashKembC} onChange={e=>setCashKembC(e.target.value)} placeholder="0" style={{...iS,marginBottom:4}}/>
            <Sh t="🧾 Rekap Penjualan"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {[{l:"Setor Tunai Cash",v:setor,fn:setSetor},{l:"Hutang Pelanggan",v:hutang,fn:setHutang},{l:"Transaksi Pending",v:pending,fn:setPending},{l:"Pengeluaran",v:klr,fn:setKlr}].map(f=>(
                <div key={f.l}><label style={lS}>{f.l}</label><input type="number" value={f.v} onChange={e=>f.fn(e.target.value)} placeholder="0" style={iS}/></div>
              ))}
            </div>
            <div style={{marginBottom:10}}><label style={{...lS,color:"#aaa"}}>Note Pengeluaran</label><input type="text" value={noteKlr} onChange={e=>setNoteKlr(e.target.value)} placeholder="Contoh: beli plastik..." style={iS}/></div>
            <div style={{background:"#f8fffe",border:"2px solid #e0f5f1",borderRadius:10,padding:"10px 13px",marginBottom:10,fontSize:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#0d9488",fontWeight:700}}>Total Penjualan Bersih</span><b style={{color:"#0d9488"}}>{fmtRp(totalP)}</b></div>
              <div style={{fontSize:10,color:"#aaa",marginBottom:5}}>({shiftTrx.length} transaksi . sudah dikurangi refund)</div>
              {st>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( - ) Setor Tunai</span><b style={{color:"#e74c3c"}}>{fmtRp(st)}</b></div>}
              {htg>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( - ) Hutang</span><b style={{color:"#e74c3c"}}>{fmtRp(htg)}</b></div>}
              {pnd>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( - ) Pending</span><b style={{color:"#e74c3c"}}>{fmtRp(pnd)}</b></div>}
              {pk>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( - ) Pengeluaran {noteKlr&&<span style={{fontSize:10,color:"#aaa",fontStyle:"italic"}}>({noteKlr})</span>}</span><b style={{color:"#e74c3c"}}>{fmtRp(pk)}</b></div>}
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:7,borderTop:"2px solid #b2ede6",marginTop:4}}><span style={{fontWeight:900,fontSize:13}}>= Kas Nyata di Laci (Sistem)</span><b style={{fontSize:16,color:"#0d9488"}}>{fmtRp(kasSystem)}</b></div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={{...lS,fontSize:12,color:"#1a2e2a"}}>Kas Nyata di Laci (Hitung Fisik) *</label>
              <input type="number" value={kasNyata} onChange={e=>setKasNyata(e.target.value)} placeholder="Hitung uang di laci..."
                style={{...iS,border:`2px solid ${kasNyata?"#0d9488":"#b2ede6"}`,fontWeight:700,fontSize:13}}/>
            </div>
            {kasNyata!==""&&(
              <div style={{background:selisih===0?"#e8f8f4":selisih>0?"#fffbe6":"#fff0f0",border:`2px solid ${selisih===0?"#2ecc71":selisih>0?"#f39c12":"#ff4757"}`,borderRadius:11,padding:"11px 13px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:800,fontSize:13}}>{selisih===0?"✅ Sesuai!":selisih>0?"📈 Lebih":"📉 Kurang"}</span>
                  <span style={{fontWeight:900,fontSize:22,color:selisih===0?"#2ecc71":selisih>0?"#f39c12":"#ff4757"}}>{selisih>0?"+":""}{fmtRp(selisih)}</span>
                </div>
                <div style={{fontSize:11,color:"#888",marginTop:3}}>Sistem: {fmtRp(kasSystem)} → Fisik: {fmtRp(kasFisik)}</div>
              </div>
            )}
            <label style={lS}>Catatan Shift</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Catatan closing..." style={{...iS,resize:"vertical",minHeight:50}}/>
          </>
        )}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={onCancel} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:10,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
          <button onClick={mode==="open"
            ?()=>{if(!namaShift.trim())return alert("Isi nama shift!");onOpen({namaShift,cashKembalian:+cashKemb||0,saldoApps:saldoOpen,totalSaldoApps:tAppO});}
            :()=>onClose({saldoAppsClose:saldoClose,cashKembC:+cashKembC||0,setorTunai:st,hutang:htg,pending:pnd,pengeluaran:pk,noteKlr,kasNyataSystem:kasSystem,kasNyataFisik:kasFisik,selisih,notes})}
            style={{flex:2,background:`linear-gradient(135deg,${mode==="open"?"#0d9488,#14b8a6":"#e74c3c,#ff6b6b"})`,border:"none",borderRadius:9,padding:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {mode==="open"?"Buka Shift":"Tutup & Simpan Shift"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Running text motivasi untuk BankPage
function BankMotivasi() {
  const texts = [
    "🌟 Kejujuran adalah fondasi kepercayaan -- jaga setiap transaksi dengan integritas",
    "💪 Bersama kita tumbuh -- setiap rupiah yang tercatat adalah bukti kerja keras kita",
    "🎯 Transparansi bukan pilihan, tapi komitmen kita untuk bisnis yang sehat",
    "🤝 Kepercayaan dibangun dari hal kecil -- catat dengan jujur, laporkan dengan tepat",
    "✨ Ammar Cell berkembang karena tim yang solid dan penuh integritas",
  ];
  const [idx, setIdx] = useState(0);
  const [vis, setVis]  = useState(true);
  useEffect(()=>{
    const iv=setInterval(()=>{setVis(false);setTimeout(()=>{setIdx(i=>(i+1)%texts.length);setVis(true);},300);},4000);
    return ()=>clearInterval(iv);
  },[]);
  return (
    <div style={{fontSize:11,fontWeight:600,color:"rgba(255,255,255,.85)",textAlign:"center",transition:"opacity .3s",opacity:vis?1:0,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",padding:"4px 0"}}>
      {texts[idx]}
    </div>
  );
}

// ==============================================================================
// BANK PAGE -- Pencatatan Bank (terintegrasi Supabase Realtime)
// ==============================================================================
function BankPage({ user, outlets, saldoApps, onBack, notify, embedded=false, portalMisi=[], portalMisiProgress={}, products=[] }) {
  const selectedOutlet = user.outletId || outlets[0]?.id || "";
  const outletNama     = outlets.find(o=>o.id===selectedOutlet)?.nama || "Ammar Cell";

  const [trxList,      setTrxList]    = useState([]);
  const [shift,        setShiftState] = useState(null);
  const [shiftHistory, setShiftHistory] = useState([]); // riwayat dari bank_shift_logs
  const [showShift,    setShowShift]  = useState(false);
  const [shiftMode,    setShiftMode]  = useState("open");
  const [showForm,     setShowForm]   = useState(false);
  const [editTrx,      setEditTrx]    = useState(null);
  const [showSetor,    setShowSetor]  = useState(false);
  const [showPinjam,   setShowPinjam] = useState(false);
  const [setorNom,     setSetorNom]   = useState("");
  const [setorNama,    setSetorNama]  = useState("SETOR TUNAI");
  const [pinjamNom,    setPinjamNom]  = useState("");
  const [pinjamNama,   setPinjamNama] = useState("BANK PINJAM VOUCHER");
  const [filterJenis,  setFilterJenis]= useState("semua");
  const [showBalance,  setShowBalance]= useState(false);
  const [balanceVal,   setBalanceVal] = useState("");
  const [lastBalance,  setLastBalance]= useState(null);
  const [loading,      setLoading]    = useState(true);
  const [histExpanded, setHistExpanded] = useState({});
  const [histSelected, setHistSelected] = useState(null); // untuk modal konfirmasi

  // -- Load semua data --------------------------------------------------------
  const loadAll = async (showLoading=false) => {
    if(showLoading) setLoading(true);
    try {
      // Tampilkan localStorage dulu agar tidak blank
      try {
        const sLocal = localStorage.getItem(`bank_shift_${selectedOutlet}`);
        if(sLocal) setShiftState(JSON.parse(sLocal));
      } catch{}

      const [trxs, activeShift] = await Promise.all([
        dbBank.getTransactions(),
        dbBank.getActiveShift(selectedOutlet, user.username),
      ]);
      setTrxList(trxs.filter(t=>t.outletId===selectedOutlet));

      // Supabase = sumber kebenaran untuk shift aktif
      if(activeShift) {
        setShiftState(activeShift);
        try{ localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(activeShift)); }catch{}
      } else {
        setShiftState(null);
        try{ localStorage.removeItem(`bank_shift_${selectedOutlet}`); }catch{}
      }

      // Load riwayat shift: bank_shift_logs (tutup) + bank_shifts lain (aktif selain shift kita)
      try {
        const allTrxOutlet = trxs.filter(t=>t.outletId===selectedOutlet);

        // Helper format tanggal aman
        const safeFmt = (v) => {
          if(!v) return null;
          // Coba berbagai format
          const d = new Date(v);
          if(!isNaN(d.getTime())) return d.toISOString();
          // format dd/mm/yyyy HH:MM
          const m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
          if(m) {
            const d2 = new Date(`${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}${m[4]||'T00:00:00'}`);
            if(!isNaN(d2.getTime())) return d2.toISOString();
          }
          return null;
        };

        // Load closed shifts dari bank_shift_logs
        const { data: logs } = await supabase
          .from('bank_shift_logs')
          .select('*')
          .eq('outlet_id', selectedOutlet)
          .order('created_at', { ascending: false })
          .limit(50);

        const mapped = (logs||[]).map(l => {
          const so = l.saldo_open  || {};
          const sc = l.saldo_close || {};
          // nama: coba dari saldo_open, lalu user_id, lalu nama field
          const nama = so.namaShift || l.nama || l.user_id || "Shift";
          return {
            id:         l.id,
            nama,
            userId:     l.user_id || "",
            outletId:   l.outlet_id,
            start_time: safeFmt(l.start_time),
            end_time:   safeFmt(l.end_time || l.created_at),
            saldo_data: so,
            saldo_close: {
              uangLaci:   sc.uangLaci   || sc.uang_laci   || 0,
              uangSistem: sc.uangSistem || sc.uang_sistem || 0,
              selisih:    sc.selisih    ?? sc.selisih_kas ?? null,
              catatan:    sc.catatan    || sc.notes       || "",
              saldoAppsC: sc.saldoAppsC || sc.saldo_apps_akhir || {},
            },
            status:    "closed",
            isHidden:  (l.hidden_by_kasir || l.saldo_close?.disembunyikan || false),
            trx:       allTrxOutlet.filter(t=>t.shiftId===l.id),
          };
        });

        // Load juga dari bank_shifts (semua shift aktif di outlet ini -- bukan hanya milik user ini)
        // Ini untuk menampilkan shift orang lain yang mungkin overlap
        const { data: activeAll } = await supabase
          .from('bank_shifts')
          .select('*')
          .eq('outlet_id', selectedOutlet);
        const activeHistory = (activeAll||[])
          .filter(s=>s.id !== activeShift?.id) // exclude shift kita sendiri
          .map(s=>{
            const sd = s.saldo_data||{};
            return {
              id:         s.id,
              nama:       sd.namaShift || s.nama || s.user_id || "Shift Aktif",
              userId:     s.user_id || "",
              outletId:   s.outlet_id,
              start_time: safeFmt(s.start_time),
              end_time:   null,
              saldo_data: sd,
              saldo_close:{},
              status:     "active",
              trx:        allTrxOutlet.filter(t=>t.shiftId===s.id),
            };
          });

        // Gabung: aktif di atas, tutup di bawah, sorted by start_time desc
        // Filter: sembunyikan yang sudah ditandai hidden_by_kasir dari tampilan karyawan
        const all = [...activeHistory, ...mapped]
          .filter(s=>!s.isHidden && !s.saldo_close?.disembunyikan)
          .sort((a,b)=>{
            const ta = a.start_time||'', tb = b.start_time||'';
            return tb.localeCompare(ta);
          });
        setShiftHistory(all);
      } catch(e){ console.warn('shiftHistory load error:', e); }

      try{ const b=localStorage.getItem(`bank_balance_${selectedOutlet}`); if(b) setLastBalance(JSON.parse(b)); }catch{}
    } catch(e){
      console.error('BankPage loadAll error:', e);
    }
    setLoading(false);
  };

  useEffect(()=>{ loadAll(true); },[selectedOutlet]);

  // -- Realtime --------------------------------------------------------------
  useEffect(()=>{
    const chTrx = supabase.channel(`bank-trx-${selectedOutlet}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_transactions'},(payload)=>{
        const row=payload.new;
        if(payload.eventType==='INSERT'&&row?.outlet_id===selectedOutlet){
          const t={id:row.id,waktu:row.waktu,tgl:row.tgl,shiftId:row.shift_id,nama:row.nama,
            jenis:row.jenis,feeType:row.fee_type,fee:row.fee,nominal:row.nominal,
            netNominal:row.net_nominal,outletId:row.outlet_id};
          setTrxList(prev=>prev.find(x=>x.id===t.id)?prev:[t,...prev]);
        } else if(payload.eventType==='UPDATE'&&row){
          setTrxList(prev=>prev.map(t=>t.id===row.id?
            {...t,nama:row.nama,jenis:row.jenis,feeType:row.fee_type,
             fee:row.fee,nominal:row.nominal,netNominal:row.net_nominal}:t));
        } else if(payload.eventType==='DELETE'){
          setTrxList(prev=>prev.filter(t=>t.id!==payload.old?.id));
        }
      }).subscribe();

    const chShift = supabase.channel(`bank-shift-${selectedOutlet}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_shifts'},(payload)=>{
        if(payload.eventType==='DELETE'){
          // Verifikasi dulu ke Supabase -- jangan langsung null
          const deletedId     = payload.old?.id;
          const deletedOutlet = payload.old?.outlet_id;
          setShiftState(prev=>{
            if(!prev) return null;
            if(deletedOutlet && deletedOutlet!==selectedOutlet) return prev;
            if(deletedId && deletedId!==prev.id) return prev;
            // Cek ke Supabase dulu
            dbBank.getActiveShift(selectedOutlet,user.username).then(active=>{
              if(!active){
                setShiftState(null);
                try{localStorage.removeItem(`bank_shift_${selectedOutlet}`);}catch{}
              }
            }).catch(()=>{});
            return prev; // pertahankan sementara
          });
          // Reload riwayat karena kemungkinan shift baru ditutup
          setTimeout(()=>loadAll(false), 800);
        } else if(payload.new?.outlet_id===selectedOutlet){
          const s=payload.new;
          const sd={id:s.id,nama:s.nama,start:s.start_time,...(s.saldo_data||{})};
          setShiftState(sd);
          try{localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(sd));}catch{}
        }
      }).subscribe();

    const chLog = supabase.channel(`bank-shiftlog-${selectedOutlet}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bank_shift_logs'},()=>{
        setTimeout(()=>loadAll(false), 500);
      }).subscribe();

    return ()=>{
      supabase.removeChannel(chTrx);
      supabase.removeChannel(chShift);
      supabase.removeChannel(chLog);
    };
  },[selectedOutlet]);

  const cashKembShift = shift?.cashKemb||0;
  const uangSistem    = cashKembShift + trxList.filter(t=>t.shiftId===shift?.id).reduce((s,t)=>s+t.netNominal,0);
  const totalMasuk    = trxList.filter(t=>t.shiftId===shift?.id&&t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
  const totalKeluar   = trxList.filter(t=>t.shiftId===shift?.id&&t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
  const shiftTrxList  = shift ? trxList.filter(t=>t.shiftId===shift.id) : [];
  const filtered      = filterJenis==="semua"?shiftTrxList:filterJenis==="masuk"?shiftTrxList.filter(t=>t.netNominal>0):shiftTrxList.filter(t=>t.netNominal<0);
  const totalSaldo    = shift?.saldoApps?Object.values(shift.saldoApps).reduce((s,v)=>s+(+v||0),0):0;

  const setShift = (val) => {
    setShiftState(val);
    if(!val) try{ localStorage.removeItem(`bank_shift_${selectedOutlet}`); }catch{}
  };

  const saveBalance = () => {
    if(!balanceVal) return;
    const b={waktu:now(),jam:new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}),uang:+balanceVal,selisih:+balanceVal-uangSistem};
    setLastBalance(b);
    try{localStorage.setItem(`bank_balance_${selectedOutlet}`,JSON.stringify(b));}catch{}
    setBalanceVal(""); setShowBalance(false);
    notify(`Balance dicatat: ${fmtRp(+balanceVal)}`,+balanceVal===uangSistem?"ok":"warn");
  };

  const openShift = async (data) => {
    const s={id:uid(),nama:data.namaShift,start:now(),outletId:selectedOutlet,...data};
    setShift(s);
    try{ localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(s)); }catch{}
    setShowShift(false);
    notify("Shift bank dibuka! ✓","ok");
    dbBank.openShift(s,selectedOutlet,user.username).catch(e=>console.warn("openShift:",e));
  };

  const closeShift = async (data) => {
    try{
      await dbBank.closeShift(shift,selectedOutlet,user.username,{...data,waktuTutup:now()});
    }catch(e){ console.error("closeShift error:",e); }
    setShift(null); setShowShift(false);
    notify(`Shift ditutup. Selisih: ${fmtRp(data.selisih||0)}`,data.selisih===0?"ok":"warn");
    setTimeout(()=>loadAll(false), 600);
  };

  // -- Lanjutkan shift dari riwayat (baru) ------------------------------------
  // -- ▶️ Lanjutkan Shift ----------------------------------------------------
  // Pakai ID shift LAMA, tidak buat baru → semua transaksi lama ikut otomatis
  const lanjutkanShift = async (histShift) => {
    setHistSelected(null);
    try {
      const s = {
        id:        histShift.id,                         // ID LAMA -- transaksi lama tetap linked
        nama:      histShift.nama,
        start:     histShift.start_time || now(),        // pertahankan waktu buka asli
        outletId:  selectedOutlet,
        cashKemb:  histShift.saldo_data?.cashKemb  || 0,
        saldoApps: histShift.saldo_data?.saldoApps || {},
      };
      // Jika shift sudah closed → hapus dari bank_shift_logs dulu
      if(histShift.status==="closed"){
        try{ await supabase.from('bank_shift_logs').delete().eq('id', histShift.id); }catch(e2){ console.warn('del log:',e2); }
      }
      // Re-open di bank_shifts dengan ID yang sama
      await dbBank.openShift(s, selectedOutlet, user.username);
      setShift(s);
      try{ localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(s)); }catch{}
      setShiftHistory(prev=>prev.filter(x=>x.id!==histShift.id));
      notify(`✅ Shift dilanjutkan: ${s.nama}`,"ok");
    } catch(e){
      console.error("lanjutkanShift error:", e);
      notify("Gagal melanjutkan shift!","err");
    }
  };

  // -- 🔗 Gabung dengan Shift Aktif -----------------------------------------
  const lanjutGabung = async (histShift) => {
    setHistSelected(null);
    if(!shift) {
      notify("Tidak ada shift aktif. Buka shift dulu sebelum menggabung.","err");
      return;
    }
    try {
      // 1. Ambil FRESH transaksi shift lama langsung dari Supabase (bukan dari state)
      const { data: trxRaw } = await supabase
        .from('bank_transactions')
        .select('id')
        .eq('shift_id', histShift.id);
      const trxIds = (trxRaw||[]).map(t=>t.id);

      // 2. Update shift_id semua transaksi lama → shift aktif sekarang
      let berhasil = 0;
      for(const id of trxIds) {
        try{
          const { error } = await supabase
            .from('bank_transactions')
            .update({ shift_id: shift.id })
            .eq('id', id);
          if(!error) berhasil++;
        }catch(e2){ console.warn('update trx:',e2); }
      }

      // 3. Sembunyikan shift lama dari karyawan
      // Simpan ke saldo_close.catatan (kolom yang sudah ada) agar tidak 400 error
      const catatanGabung = `[DIGABUNG] ke shift ${shift.nama||shift.id} oleh ${user.username} pada ${new Date().toLocaleString('id-ID')}`;
      if(histShift.status==="closed") {
        // Update saldo_close.catatan saja -- tidak butuh kolom baru
        const existing = histShift.saldo_close || {};
        try{
          await supabase.from('bank_shift_logs')
            .update({ saldo_close: { ...existing, catatan: catatanGabung, digabung: true } })
            .eq('id', histShift.id);
        }catch(e2){ console.warn('update log catatan:',e2); }
      } else {
        // Shift masih aktif di bank_shifts -- hapus dari sana
        try{ await supabase.from('bank_shifts').delete().eq('id', histShift.id); }catch(e2){ console.warn('del shift:',e2); }
        // Insert ke bank_shift_logs dengan catatan gabung (tanpa kolom hidden yang mungkin belum ada)
        try{
          await supabase.from('bank_shift_logs').insert({
            id:          histShift.id,
            outlet_id:   selectedOutlet,
            user_id:     histShift.userId || user.username,
            nama:        histShift.nama,
            start_time:  histShift.start_time,
            end_time:    new Date().toISOString(),
            saldo_open:  histShift.saldo_data || {},
            saldo_close: { catatan: catatanGabung, digabung: true },
          });
        }catch(e2){ console.warn('insert gabung log:',e2); }
      }

      // 4. Update state lokal LANGSUNG (tanpa tunggu Supabase reload)
      // Ubah shiftId semua transaksi lama di state → shift aktif
      setTrxList(prev => prev.map(t =>
        trxIds.includes(t.id) ? { ...t, shiftId: shift.id } : t
      ));

      // 5. Reload fresh dari Supabase sebagai verifikasi (async, tidak blocking UI)
      setTimeout(async () => {
        try {
          const freshTrx = await dbBank.getTransactions();
          setTrxList(freshTrx.filter(t=>t.outletId===selectedOutlet));
        } catch(e2) { console.warn('reload after gabung:', e2); }
      }, 800);

      // 6. Hapus dari tampilan riwayat
      setShiftHistory(prev=>prev.filter(x=>x.id!==histShift.id));

      notify(`🔗 ${berhasil} transaksi digabung ke shift "${shift.nama}" ✓`,"ok");
    } catch(e){
      console.error("lanjutGabung error:", e);
      notify("Gagal menggabung transaksi!","err");
    }
  };

  // -- 🙈 Sembunyikan dari Karyawan -----------------------------------------
  // Data TETAP ada di database untuk admin. Tandai di saldo_close.catatan.
  const hapusRiwayat = async (histShift) => {
    setHistSelected(null);
    const catatanHidden = `[DISEMBUNYIKAN] oleh ${user.username} pada ${new Date().toLocaleString('id-ID')}`;
    try {
      if(histShift.status==="active") {
        // Shift aktif di bank_shifts -- pindah ke bank_shift_logs dengan catatan
        try{ await supabase.from('bank_shifts').delete().eq('id', histShift.id); }catch(e2){ console.warn(e2); }
        try{
          await supabase.from('bank_shift_logs').insert({
            id:          histShift.id,
            outlet_id:   selectedOutlet,
            user_id:     histShift.userId || user.username,
            nama:        histShift.nama,
            start_time:  histShift.start_time,
            end_time:    new Date().toISOString(),
            saldo_open:  histShift.saldo_data || {},
            saldo_close: { catatan: catatanHidden, disembunyikan: true },
          });
        }catch(e2){ console.warn('insert hidden log:',e2); }
      } else {
        // Shift sudah closed -- update saldo_close.catatan saja (kolom yang sudah ada)
        const existing = histShift.saldo_close || {};
        try{
          await supabase.from('bank_shift_logs')
            .update({ saldo_close: { ...existing, catatan: catatanHidden, disembunyikan: true } })
            .eq('id', histShift.id);
        }catch(e2){ console.warn('update catatan hidden:',e2); }
      }
      // Hapus dari tampilan karyawan (filter lokal)
      setShiftHistory(prev=>prev.filter(s=>s.id!==histShift.id));
      notify("🙈 Riwayat disembunyikan -- masih ada di laporan admin","ok");
    } catch(e){
      console.error("hapusRiwayat error:", e);
      // Fallback: sembunyikan dari tampilan walau Supabase error
      setShiftHistory(prev=>prev.filter(s=>s.id!==histShift.id));
      notify("Disembunyikan dari tampilan","ok");
    }
  };

  // Misi auto_produk yang aktif & punya produk match -- untuk quick-log chip di Bank
  const misiAutoProdukActiveBank = (portalMisi||[]).filter(m=>m.tipe==="auto_produk"&&m.produk_id).map(m=>{
    const prod = products.find(p=>String(p.id)===String(m.produk_id)||p.name===m.produk_id);
    if(!prod) return null;
    const periodeKey = getPeriodeKey(m.periode||"harian");
    const rec = portalMisiProgress[m.id]?.[user.username||user.id]?.[periodeKey];
    return {...m, prod, progress:rec?.progress||0, selesai:rec?.selesai||false};
  }).filter(Boolean);

  // Klik = catat 1x progress misi + transaksi bank netNominal:0 (tidak pengaruhi total masuk/keluar)
  // tapi tetap masuk riwayat bank (audit) & terintegrasi ke portal karyawan
  const quickLogMisiBank = async (m) => {
    if(!shift) return notify("⚠ Buka shift dulu sebelum mencatat misi!","err");
    const username = user.username||user.id;
    const periodeKey = getPeriodeKey(m.periode||"harian");
    const existing = portalMisiProgress[m.id]?.[username]?.[periodeKey]?.progress||0;
    const newProgress = existing+1;
    const selesai = newProgress>=(m.target||1);
    try{
      await supabase.from('portal_misi_progress').upsert({
        misi_id:m.id, username, periode_key:periodeKey,
        progress:newProgress, selesai, updated_at:new Date().toISOString()
      },{onConflict:'misi_id,username,periode_key'});
    }catch(e){ console.warn('misi progress upsert (bank):',e); }
    try{
      await dbBank.addTransaction({
        id:uid(), waktu:now(), tgl:today(), outletId:selectedOutlet, shiftId:shift?.id,
        nama:`[Misi] ${m.prod.name}`, jenis:"masuk", feeType:"include", fee:0, nominal:0, netNominal:0,
      });
    }catch(e){ console.warn('quickLogMisiBank save:',e); }
    notify(`✓ ${m.prod.name} dicatat untuk misi`,"ok");
  };

  const saveTrx = async (trx) => {
    const makeRow = (data) => ({
      id:uid(), waktu:now(), tgl:today(),
      outletId:selectedOutlet, shiftId:shift?.id, ...data,
    });
    if(editTrx){
      try{ await dbBank.updateTransaction(editTrx.id, makeRow(trx)); notify("Diperbarui ✓","ok"); }
      catch{ notify("Gagal update!","err"); }
    } else if(trx.feeType==="tarik"&&(+trx.fee||0)>0){
      try{
        await dbBank.addTransaction(makeRow({nama:trx.nama+" (TARIK)",    jenis:"keluar",feeType:"tarik",fee:0,nominal:trx.nominal,netNominal:-(trx.nominal)}));
        await dbBank.addTransaction(makeRow({nama:trx.nama+" (FEE TARIK)",jenis:"masuk", feeType:"tarik",fee:0,nominal:trx.fee,    netNominal:+(trx.fee)}));
        notify("Tersimpan ✓","ok");
      }catch(e){ console.error(e); notify("Gagal simpan!","err"); }
    } else {
      try{ await dbBank.addTransaction(makeRow(trx)); notify("Tersimpan ✓","ok"); }
      catch(e){ console.error(e); notify("Gagal simpan!","err"); }
    }
    setShowForm(false); setEditTrx(null);
  };

  const deleteTrx = async (id) => {
    try{ await dbBank.deleteTransaction(id); notify("Dihapus","warn"); }
    catch{ notify("Gagal hapus!","err"); }
  };

  if(loading) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{fontSize:14,color:"#0d9488",fontWeight:700}}>⏳ Memuat data bank...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(13,148,136,.35)"}}>
        <div style={{padding:"0 16px",display:"flex",alignItems:"center",minHeight:50}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 12px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",marginRight:10,fontFamily:"inherit"}}>← Menu</button>
          <div style={{marginRight:"auto"}}>
            <div style={{fontWeight:900,fontSize:14,color:"#fff"}}>{outletNama} <span style={{opacity:.7,fontWeight:600,fontSize:12}}>. Bank</span></div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600}}>{user.nama}</div>
          </div>
          <button onClick={()=>loadAll(false)} style={{background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.2)",borderRadius:20,padding:"4px 10px",color:"#fff",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",marginRight:6}}>🔄</button>
          <div onClick={()=>{setShiftMode(shift?"close":"open");setShowShift(true);}}
            style={{background:shift?"rgba(255,255,255,.18)":"rgba(255,100,100,.3)",border:`1px solid ${shift?"rgba(255,255,255,.35)":"rgba(255,100,100,.6)"}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:800,color:"#fff"}}>
            {shift?`⏱ ${shift.nama}`:"⚠ Buka Shift"}
          </div>
        </div>
        <div style={{background:"rgba(0,0,0,.12)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"4px 16px"}}>
          <BankMotivasi/>
        </div>
      </div>

      {!shift&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"linear-gradient(135deg,rgba(10,122,112,.96),rgba(13,148,136,.96))",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,fontFamily:"'Nunito',sans-serif",padding:20}}>
          <div style={{fontSize:60}}>🔒</div>
          <div style={{fontWeight:900,fontSize:22,color:"#fff",textAlign:"center"}}>Shift Bank Belum Dibuka</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.8)",textAlign:"center",maxWidth:300,lineHeight:1.7}}>Buka shift terlebih dahulu untuk mulai mencatat transaksi keuangan</div>
          <button onClick={()=>{setShiftMode("open");setShowShift(true);}}
            style={{background:"#fff",border:"none",borderRadius:14,padding:"14px 32px",color:"#0d9488",fontWeight:900,fontSize:16,cursor:"pointer",fontFamily:"inherit",marginTop:6,boxShadow:"0 8px 28px rgba(0,0,0,.2)"}}>
            🟢 Buka Shift Sekarang
          </button>
          {/* Riwayat shift di layar lock -- bisa langsung lanjutkan */}
          {shiftHistory.length>0&&(
            <div style={{marginTop:10,width:"100%",maxWidth:400}}>
              <div style={{fontWeight:700,fontSize:12,color:"rgba(255,255,255,.7)",textAlign:"center",marginBottom:8}}>-- atau lanjutkan shift sebelumnya --</div>
              {shiftHistory.slice(0,3).map(s=>{
                const sel = s.saldo_close?.selisih??null;
                return (
                  <div key={s.id} style={{background:"rgba(255,255,255,.12)",borderRadius:12,padding:"10px 14px",marginBottom:8,border:"1px solid rgba(255,255,255,.2)"}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:13,color:"#fff"}}>{s.nama}</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:2}}>
                          {(()=>{
                            const dt=s.end_time?new Date(s.end_time):s.start_time?new Date(s.start_time):null;
                            if(!dt||isNaN(dt)) return s.status==="active"?"🟢 Shift Aktif":"--";
                            return (s.status==="active"?"🟢 Aktif . ":"") + dt.toLocaleDateString("id-ID",{day:"2-digit",month:"short"})+" "+dt.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
                          })()}
                          {sel===0&&<span style={{marginLeft:6,color:"#4ade80",fontWeight:700}}>✅ Balance</span>}
                          {sel!==null&&sel<0&&<span style={{marginLeft:6,color:"#fca5a5",fontWeight:700}}>📉 {fmtRp(Math.abs(sel))}</span>}
                        </div>
                      </div>
                      <button onClick={()=>setHistSelected(s)}
                        style={{background:"rgba(255,255,255,.2)",border:"1px solid rgba(255,255,255,.35)",borderRadius:9,padding:"6px 12px",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                        ▶️ Pilih
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>
        {/* KPI cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
          <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:14,padding:"16px 18px",boxShadow:"0 4px 16px rgba(13,148,136,.25)"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.5px"}}>UANG SISTEM</div>
            <div style={{fontWeight:900,fontSize:24,color:"#fff"}}>{fmtRp(uangSistem)}</div>
            {cashKembShift>0&&<div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:2}}>Termasuk cash kembalian {fmtRp(cashKembShift)}</div>}
            <button onClick={()=>setShowBalance(true)} style={{marginTop:9,background:"rgba(255,255,255,.18)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"4px 12px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"inline-flex",alignItems:"center",gap:5}}>
              🔄 Cek Balance {lastBalance&&<span style={{opacity:.6}}>{lastBalance.jam}</span>}
            </button>
            {lastBalance&&<div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:5}}>Laci: {fmtRp(lastBalance.uang)} . <span style={{color:lastBalance.selisih===0?"#a7f3d0":lastBalance.selisih>0?"#fcd34d":"#fca5a5",fontWeight:700}}>{lastBalance.selisih===0?"✓ Balance":(lastBalance.selisih>0?"+":"")+fmtRp(lastBalance.selisih)}</span></div>}
            {totalSaldo>0&&<div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:4}}>Saldo Aplikasi: {fmtRp(totalSaldo)}</div>}
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",border:"2px solid #e0faf5"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#0d9488",marginBottom:4}}>TOTAL MASUK</div>
            <div style={{fontWeight:900,fontSize:24,color:"#0d9488"}}>{fmtRp(totalMasuk)}</div>
            <div style={{fontSize:11,color:"#aaa",marginTop:8}}>{shiftTrxList.filter(t=>t.netNominal>0).length} transaksi ⬇</div>
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",border:"2px solid #ffe0e0"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#e74c3c",marginBottom:4}}>TOTAL KELUAR</div>
            <div style={{fontWeight:900,fontSize:24,color:"#e74c3c"}}>{fmtRp(totalKeluar)}</div>
            <div style={{fontSize:11,color:"#aaa",marginTop:8}}>{shiftTrxList.filter(t=>t.netNominal<0).length} transaksi ⬆</div>
          </div>
        </div>

        {misiAutoProdukActiveBank.length>0&&(
          <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:10,fontWeight:700,color:"#8e44ad"}}>🎯 Misi:</span>
            {misiAutoProdukActiveBank.map(m=>(
              <button key={m.id} onClick={()=>quickLogMisiBank(m)} disabled={m.selesai}
                title={`Catat 1x "${m.prod.name}" untuk misi "${m.judul}" (${m.progress}/${m.target})`}
                style={{display:"flex",alignItems:"center",gap:5,padding:"5px 12px",borderRadius:20,border:`2px solid ${m.selesai?"#bbf7d0":"#e0d4f7"}`,background:m.selesai?"#f0fdf4":"#f5eeff",color:m.selesai?"#16a34a":"#8e44ad",fontWeight:700,fontSize:11,cursor:m.selesai?"default":"pointer",fontFamily:"inherit"}}>
                {m.selesai?"✅":"➕"} {m.prod.name} <span style={{opacity:.7}}>({m.progress}/{m.target})</span>
              </button>
            ))}
          </div>
        )}

        {/* Tombol aksi */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>setShowSetor(true)} style={{background:"#fff",border:"2px solid #e74c3c",borderRadius:12,padding:"11px 20px",color:"#e74c3c",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>⬆ Setor Tunai</button>
          <button onClick={()=>{setEditTrx(null);setShowForm(true);}} style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:12,padding:"11px 32px",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(13,148,136,.3)",display:"flex",alignItems:"center",gap:6}}>＋ Catat Transaksi</button>
          <button onClick={()=>setShowPinjam(true)} style={{background:"#fff",border:"2px solid #0d9488",borderRadius:12,padding:"11px 20px",color:"#0d9488",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>⬇ Bank Pinjam Voucher</button>
        </div>

        {/* Transaksi shift aktif */}
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
          <div style={{padding:"12px 16px",borderBottom:"2px solid #e0f5f1",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:"#0d9488"}}>📋 Transaksi Shift Ini</div>
              {shift&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>Shift: {shift.nama} . {shiftTrxList.length} transaksi</div>}
            </div>
            <div style={{display:"flex",gap:6}}>
              {[{k:"semua",l:"Semua"},{k:"masuk",l:"⬇ Masuk"},{k:"keluar",l:"⬆ Keluar"}].map(f=>(
                <button key={f.k} onClick={()=>setFilterJenis(f.k)} style={{padding:"5px 12px",borderRadius:20,border:"2px solid",borderColor:filterJenis===f.k?"#0d9488":"#b2ede6",background:filterJenis===f.k?"#0d9488":"#fff",color:filterJenis===f.k?"#fff":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{f.l}</button>
              ))}
            </div>
          </div>
          {filtered.length===0
            ?<div style={{textAlign:"center",color:"#ccc",padding:40,fontSize:13}}>Belum ada transaksi</div>
            :filtered.map((t,i)=>(
              <div key={t.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderTop:i>0?"1px solid #f0faf8":"none",background:i%2===0?"#fff":"#fafffe"}}>
                <div style={{width:38,height:38,borderRadius:11,background:t.netNominal>0?"#e0faf5":"#fff0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{t.netNominal>0?"⬇":"⬆"}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nama}</div>
                  <div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                    {t.waktu}
                    {t.feeType==="fee"&&<span style={{color:"#0d9488",fontWeight:700,marginLeft:6}}>+fee {fmtRp(t.fee)}</span>}
                    {t.feeType==="dipotong"&&t.fee>0&&<span style={{color:"#e74c3c",fontWeight:700,marginLeft:6}}>−potong {fmtRp(t.fee)}</span>}
                  </div>
                </div>
                <div style={{fontWeight:900,fontSize:15,color:t.netNominal>0?"#0d9488":"#e74c3c",flexShrink:0}}>{t.netNominal>0?"+":""}{fmtRp(Math.abs(t.netNominal))}</div>
                <div style={{display:"flex",gap:4,flexShrink:0}}>
                  <button onClick={()=>{setEditTrx(t);setShowForm(true);}} style={{background:"#e0faf5",border:"none",borderRadius:7,padding:"5px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✏️</button>
                  <button onClick={()=>deleteTrx(t.id)} style={{background:"#fff0f0",border:"none",borderRadius:7,padding:"5px 10px",color:"#e74c3c",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🗑</button>
                </div>
              </div>
            ))
          }
        </div>

        {/* -- RIWAYAT SHIFT -- */}
        {shiftHistory.length>0&&(
          <div style={{marginTop:20}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{flex:1,height:1,background:"linear-gradient(90deg,#e0f5f1,transparent)"}}/>
              <span style={{fontWeight:800,fontSize:12,color:"#0d9488",letterSpacing:".5px",textTransform:"uppercase",background:"#e0faf5",padding:"4px 14px",borderRadius:20,border:"1px solid #b2f5ea"}}>
                📂 Riwayat Shift Sebelumnya
              </span>
              <div style={{flex:1,height:1,background:"linear-gradient(270deg,#e0f5f1,transparent)"}}/>
            </div>

            {shiftHistory.map((s,idx)=>{
              const masuk   = s.trx.filter(t=>t.netNominal>0).reduce((a,t)=>a+t.netNominal,0);
              const keluar  = s.trx.filter(t=>t.netNominal<0).reduce((a,t)=>a+Math.abs(t.netNominal),0);
              const selisih = s.saldo_close?.selisih??null;
              const isOpen  = histExpanded[s.id];
              const borderC = selisih===0?"#b2f5ea":selisih!==null&&selisih<0?"#fca5a5":"#e0f5f1";
              return (
                <div key={s.id} style={{background:"#fff",borderRadius:14,border:`2px solid ${borderC}`,marginBottom:10,overflow:"hidden",boxShadow:"0 2px 10px rgba(0,0,0,.04)"}}>
                  {/* Header */}
                  <div style={{padding:"12px 14px",cursor:"pointer",userSelect:"none"}}
                    onClick={()=>setHistExpanded(p=>({...p,[s.id]:!p[s.id]}))}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:"linear-gradient(135deg,#e0faf5,#b2f5ea)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,color:"#0d9488"}}>{idx+1}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                          <span style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>{s.nama}</span>
                          {selisih===0&&<span style={{fontSize:10,fontWeight:700,color:"#27ae60",background:"#e8f8f4",padding:"1px 7px",borderRadius:20,border:"1px solid #a3e9c8"}}>✅ Balance</span>}
                          {selisih!==null&&selisih>0&&<span style={{fontSize:10,fontWeight:700,color:"#d97706",background:"#fffbe6",padding:"1px 7px",borderRadius:20}}>📈 +{fmtRp(selisih)}</span>}
                          {selisih!==null&&selisih<0&&<span style={{fontSize:10,fontWeight:700,color:"#dc2626",background:"#fff0f0",padding:"1px 7px",borderRadius:20}}>📉 -{fmtRp(Math.abs(selisih))}</span>}
                        </div>
                        <div style={{fontSize:10,color:"#aaa",marginTop:2}}>
                          {(()=>{
                            if(s.status==="active") return <span style={{color:"#22c55e",fontWeight:700}}>🟢 Shift Aktif</span>;
                            const dt = s.end_time?new Date(s.end_time):null;
                            if(!dt||isNaN(dt)) {
                              const ds = s.start_time?new Date(s.start_time):null;
                              if(ds&&!isNaN(ds)) return "Dibuka "+ds.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"});
                              return "--";
                            }
                            return "Tutup "+dt.toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"})+" "+dt.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
                          })()}
                        </div>
                        <div style={{display:"flex",gap:10,marginTop:4,fontSize:11,fontWeight:700}}>
                          <span style={{color:"#0d9488"}}>+{fmtRp(masuk)}</span>
                          <span style={{color:"#e74c3c"}}>-{fmtRp(keluar)}</span>
                          <span style={{color:"#888"}}>{s.trx.length} trx</span>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();setHistSelected(s);}}
                          style={{background:"#e0faf5",border:"none",borderRadius:9,padding:"6px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                          ⋯ Aksi
                        </button>
                        <div style={{color:"#ccc",fontSize:18,transition:"transform .2s",transform:isOpen?"rotate(180deg)":"none"}}>▾</div>
                      </div>
                    </div>
                  </div>

                  {/* Detail collapse */}
                  {isOpen&&(
                    <div style={{borderTop:"1px solid #f0faf8"}}>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:0,borderBottom:"1px solid #f0fal8"}}>
                        {[
                          {l:"Cash Kemb.", v:fmtRp(s.saldo_data?.cashKemb||0), c:"#0d9488", bg:"#e0faf5"},
                          {l:"Uang Sistem",v:fmtRp(s.saldo_close?.uangSistem||0), c:"#555", bg:"#f9fafb"},
                          {l:"Uang Laci",  v:fmtRp(s.saldo_close?.uangLaci||0),  c:"#555", bg:"#f9fafb"},
                        ].map(k=>(
                          <div key={k.l} style={{padding:"8px 12px",background:k.bg,textAlign:"center",borderRight:"1px solid #f0faf8"}}>
                            <div style={{fontSize:9,color:"#aaa",fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k.l}</div>
                            <div style={{fontWeight:800,fontSize:12,color:k.c}}>{k.v}</div>
                          </div>
                        ))}
                      </div>
                      {s.saldo_close?.catatan&&(
                        <div style={{padding:"7px 14px",background:"#fffbe6",borderBottom:"1px solid #fde68a"}}>
                          <span style={{fontSize:11,color:"#b7770d",fontWeight:600}}>📝 {s.saldo_close.catatan}</span>
                        </div>
                      )}
                      <div>
                        {s.trx.length===0
                          ?<div style={{textAlign:"center",color:"#ccc",padding:"16px 0",fontSize:12}}>Tidak ada transaksi tercatat</div>
                          :s.trx.map((t,ti)=>(
                            <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",borderTop:ti>0?"1px solid #f5fffe":"none",background:ti%2===0?"#fff":"#fafffe"}}>
                              <div style={{width:28,height:28,borderRadius:7,flexShrink:0,background:t.netNominal>0?"#e0faf5":"#fff0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{t.netNominal>0?"⬇":"⬆"}</div>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nama}</div>
                                <div style={{fontSize:10,color:"#aaa"}}>{t.waktu}</div>
                              </div>
                              <div style={{fontWeight:800,fontSize:12,color:t.netNominal>0?"#0d9488":"#e74c3c",flexShrink:0}}>{t.netNominal>0?"+":""}{fmtRp(Math.abs(t.netNominal))}</div>
                            </div>
                          ))
                        }
                      </div>
                      <div style={{display:"flex",gap:6,padding:"10px 14px",borderTop:"1px solid #f0faf8",background:"#f8fffe",flexWrap:"wrap"}}>
                        <button onClick={()=>lanjutkanShift(s)} style={{flex:1,minWidth:100,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:10,padding:"9px 6px",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3px 10px rgba(13,148,136,.25)"}}>▶️ Lanjutkan</button>
                        <button onClick={()=>lanjutGabung(s)} style={{flex:1,minWidth:100,background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",border:"none",borderRadius:10,padding:"9px 6px",color:"#fff",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 3b10px rgba(59,130,246,.25)"}}>🔗 Gabung</button>
                        <button onClick={()=>hapusRiwayat(s)} style={{background:"#fff5f5",border:"2px solid #fca5a5",borderRadius:10,padding:"9px 10px",color:"#dc2626",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}} title="Sembunyikan dari tampilan">🙈</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal konfirmasi aksi shift */}
      {histSelected&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:900,fontFamily:"'Nunito',sans-serif"}}>
          <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,boxShadow:"0 -8px 40px rgba(0,0,0,.25)",overflow:"hidden",animation:"slideUp .2s ease"}}>
            <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",padding:"16px 20px"}}>
              <div style={{fontWeight:900,fontSize:15,color:"#fff"}}>📋 {histSelected.nama}</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.75)",marginTop:2}}>
                {(()=>{
                  if(histSelected.status==="active") return "🟢 Sedang Aktif";
                  const dt=histSelected.end_time?new Date(histSelected.end_time):histSelected.start_time?new Date(histSelected.start_time):null;
                  if(!dt||isNaN(dt)) return "--";
                  return dt.toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})+" "+dt.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
                })()}
              </div>
            </div>
            <div style={{padding:"14px 18px"}}>
              {(()=>{
                const sel=histSelected.saldo_close?.selisih??null;
                return (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                    {[
                      {l:"Total Masuk", v:fmtRp(histSelected.trx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0)), c:"#0d9488"},
                      {l:"Total Keluar",v:fmtRp(histSelected.trx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0)), c:"#e74c3c"},
                      {l:"Uang Sistem", v:fmtRp(histSelected.saldo_close?.uangSistem||0), c:"#555"},
                      {l:"Uang Laci",   v:fmtRp(histSelected.saldo_close?.uangLaci||0),   c:"#555"},
                    ].map(k=>(
                      <div key={k.l} style={{background:"#f0faf8",borderRadius:9,padding:"9px 11px"}}>
                        <div style={{fontSize:9,color:"#aaa",fontWeight:700}}>{k.l}</div>
                        <div style={{fontWeight:800,fontSize:14,color:k.c,marginTop:2}}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
              {histSelected.saldo_close?.catatan&&(
                <div style={{background:"#fffbe6",borderRadius:9,padding:"8px 11px",marginBottom:12,fontSize:11,color:"#b7770d",fontWeight:600}}>📝 {histSelected.saldo_close.catatan}</div>
              )}
              {/* Info status */}
              <div style={{background:"#f0faf8",borderRadius:9,padding:"8px 12px",marginBottom:12,fontSize:11,color:"#0d9488",fontWeight:600,textAlign:"center"}}>
                {histSelected.status==="active"?"🟢 Shift ini masih aktif":"⚫ Shift sudah ditutup"}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {/* Pilihan 1: Lanjutkan shift -- pakai ID lama */}
                <button onClick={()=>lanjutkanShift(histSelected)}
                  style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:12,padding:"12px 14px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(13,148,136,.3)",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22,flexShrink:0}}>▶️</span>
                  <div>
                    <div>Lanjutkan Shift Ini</div>
                    <div style={{fontSize:10,fontWeight:600,opacity:.8}}>
                      Pakai ID shift lama -- cocok saat shift baru belum ada transaksi
                    </div>
                  </div>
                </button>
                {/* Pilihan 2: Gabung transaksi ke shift aktif */}
                <button onClick={()=>lanjutGabung(histSelected)}
                  style={{background:"linear-gradient(135deg,#1d4ed8,#3b82f6)",border:"none",borderRadius:12,padding:"12px 14px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(59,130,246,.3)",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22,flexShrink:0}}>🔗</span>
                  <div>
                    <div>Gabung ke Shift Aktif</div>
                    <div style={{fontSize:10,fontWeight:600,opacity:.8}}>
                      {shift
                        ? `Transaksi lama pindah ke "${shift.nama}" -- total masuk/keluar ikut terjumlah`
                        : "⚠ Buka shift dulu sebelum menggabung"}
                    </div>
                  </div>
                </button>
                {/* Pilihan 3: Sembunyikan dari karyawan */}
                <button onClick={()=>hapusRiwayat(histSelected)}
                  style={{background:"#fff5f5",border:"2px solid #fca5a5",borderRadius:12,padding:"11px 14px",color:"#dc2626",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20,flexShrink:0}}>🙈</span>
                  <div>
                    <div>Sembunyikan dari Tampilan</div>
                    <div style={{fontSize:10,fontWeight:600,opacity:.7}}>Data tetap ada di laporan admin -- hanya disembunyikan dari karyawan</div>
                  </div>
                </button>
                <button onClick={()=>setHistSelected(null)}
                  style={{background:"#f9fafb",border:"2px solid #e5e7eb",borderRadius:12,padding:"10px",color:"#6b7280",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  ✕ Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShift&&<BankShiftModal mode={shiftMode} shift={shift} trxList={trxList} saldoApps={saldoApps} onOpen={openShift} onClose={closeShift} onCancel={()=>setShowShift(false)}/>}
      {showForm&&<BankTrxForm editData={editTrx} onSave={saveTrx} onCancel={()=>{setShowForm(false);setEditTrx(null);}}/>}

      {/* Modal Setor Tunai */}
      {showSetor&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
          <div style={{background:"#fff",borderRadius:18,padding:22,width:360,fontFamily:"'Nunito',sans-serif",boxShadow:"0 20px 55px rgba(0,0,0,.25)"}}>
            <div style={{fontWeight:900,fontSize:15,color:"#e74c3c",marginBottom:3}}>⬆ Setor Tunai</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Uang keluar dari laci -- disetor ke pusat/bank</div>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>KETERANGAN</label>
            <input value={setorNama} onChange={e=>setSetorNama(e.target.value.toUpperCase())}
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,fontWeight:700,outline:"none",fontFamily:"inherit",marginBottom:10,boxSizing:"border-box"}}/>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>NOMINAL</label>
            <div style={{position:"relative",marginBottom:14}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontWeight:800,fontSize:16,color:"#e74c3c"}}>Rp</span>
              <input type="number" value={setorNom} onChange={e=>setSetorNom(e.target.value)} placeholder="0" autoFocus
                style={{width:"100%",padding:"9px 12px 9px 42px",borderRadius:9,border:`2px solid ${setorNom?"#e74c3c":"#b2ede6"}`,fontSize:22,fontWeight:900,textAlign:"right",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowSetor(false);setSetorNom("");setSetorNama("SETOR TUNAI");}}
                style={{width:44,height:44,borderRadius:9,border:"2px solid #b2ede6",background:"#fff",color:"#aaa",fontSize:18,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              <button onClick={async()=>{
                if(!setorNom) return;
                const t={nama:setorNama,jenis:"keluar",feeType:"include",fee:0,nominal:+setorNom,netNominal:-(+setorNom)};
                await saveTrx(t);
                setShowSetor(false);setSetorNom("");setSetorNama("SETOR TUNAI");
              }} style={{flex:1,background:"linear-gradient(135deg,#e74c3c,#ff6b6b)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bank Pinjam Voucher */}

      {showPinjam&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
          <div style={{background:"#fff",borderRadius:18,padding:22,width:360,fontFamily:"'Nunito',sans-serif",boxShadow:"0 20px 55px rgba(0,0,0,.25)"}}>
            <div style={{fontWeight:900,fontSize:15,color:"#0d9488",marginBottom:3}}>⬇ Bank Pinjam Voucher</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Uang masuk ke laci -- bank meminjam dari voucher/kasir</div>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>KETERANGAN</label>
            <input value={pinjamNama} onChange={e=>setPinjamNama(e.target.value.toUpperCase())}
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,fontWeight:700,outline:"none",fontFamily:"inherit",marginBottom:10,boxSizing:"border-box"}}/>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>NOMINAL</label>
            <div style={{position:"relative",marginBottom:14}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontWeight:800,fontSize:16,color:"#0d9488"}}>Rp</span>
              <input type="number" value={pinjamNom} onChange={e=>setPinjamNom(e.target.value)} placeholder="0" autoFocus
                style={{width:"100%",padding:"9px 12px 9px 42px",borderRadius:9,border:`2px solid ${pinjamNom?"#0d9488":"#b2ede6"}`,fontSize:22,fontWeight:900,textAlign:"right",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowPinjam(false);setPinjamNom("");setPinjamNama("BANK PINJAM VOUCHER");}}
                style={{width:44,height:44,borderRadius:9,border:"2px solid #b2ede6",background:"#fff",color:"#aaa",fontSize:18,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              <button onClick={async()=>{
                if(!pinjamNom) return;
                const t={nama:pinjamNama,jenis:"masuk",feeType:"include",fee:0,nominal:+pinjamNom,netNominal:+(+pinjamNom)};
                await saveTrx(t);
                setShowPinjam(false);setPinjamNom("");setPinjamNama("BANK PINJAM VOUCHER");
              }} style={{flex:1,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cek Balance */}
      {showBalance&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
          <div style={{background:"#fff",borderRadius:18,padding:22,width:340,fontFamily:"'Nunito',sans-serif",boxShadow:"0 20px 55px rgba(0,0,0,.25)"}}>
            <div style={{fontWeight:900,fontSize:15,color:"#0d9488",marginBottom:3}}>🔄 Cek Balance</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:4}}>Uang Sistem saat ini: <b style={{color:"#0d9488"}}>{fmtRp(uangSistem)}</b></div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Masukkan jumlah uang fisik di laci:</div>
            <div style={{position:"relative",marginBottom:14}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontWeight:800,fontSize:16,color:"#0d9488"}}>Rp</span>
              <input type="number" value={balanceVal} onChange={e=>setBalanceVal(e.target.value)} placeholder="0" autoFocus
                style={{width:"100%",padding:"9px 12px 9px 42px",borderRadius:9,border:`2px solid ${balanceVal?"#0d9488":"#b2ede6"}`,fontSize:22,fontWeight:900,textAlign:"right",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>
            {balanceVal&&(
              <div style={{padding:"8px 12px",borderRadius:9,marginBottom:12,background:+balanceVal===uangSistem?"#e8f8f4":+balanceVal>uangSistem?"#fffbe6":"#fff0f0",fontWeight:700,fontSize:13,color:+balanceVal===uangSistem?"#27ae60":+balanceVal>uangSistem?"#d97706":"#e74c3c"}}>
                {+balanceVal===uangSistem?"✅ Pas / Balance":+balanceVal>uangSistem?"📈 Lebih "+fmtRp(+balanceVal-uangSistem):"📉 Kurang "+fmtRp(uangSistem-(+balanceVal))}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>{setShowBalance(false);setBalanceVal("");}}
                style={{width:44,height:44,borderRadius:9,border:"2px solid #b2ede6",background:"#fff",color:"#aaa",fontSize:18,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
              <button onClick={saveBalance}
                style={{flex:1,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                💾 Catat Balance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BankShiftModal({mode, shift, trxList, saldoApps, onOpen, onClose, onCancel}) {
  const APPS = (saldoApps && saldoApps.length > 0) ? saldoApps : ["Digipos","Sidiva","Rita","OK","Dana","OVO","GoPay","ShopeePay"];
  const blank = ()=>Object.fromEntries(APPS.map(a=>[a,""]));

  // -- State Buka Shift ------------------------------------------------------
  const [namaShift, setNamaShift] = useState("");
  const [cashKemb,  setCashKemb]  = useState("");
  const [saldoForm, setSaldoForm] = useState(blank());

  // -- State Tutup Shift -- load draft dari localStorage ----------------------
  const draftKey = `bank_saldo_draft_${shift?.id||"x"}`;
  const [saldoClose, setSaldoClose] = useState(()=>{
    try{ const d=localStorage.getItem(draftKey); return d?JSON.parse(d):blank(); }catch{ return blank(); }
  });
  const [uangLaci,   setUangLaci]   = useState("");
  const [catatan,    setCatatan]    = useState("");
  const [draftSaved, setDraftSaved] = useState(false);

  // Auto-save saldo close ke localStorage
  useEffect(()=>{
    if(mode!=="close") return;
    const hasInput = Object.values(saldoClose).some(v=>+v>0);
    if(hasInput){
      try{ localStorage.setItem(draftKey, JSON.stringify(saldoClose)); }catch{}
      setDraftSaved(true);
      const t=setTimeout(()=>setDraftSaved(false),1500);
      return()=>clearTimeout(t);
    }
  },[saldoClose]);

  // Hitung
  const shiftTrx    = trxList.filter(t=>t.shiftId===shift?.id);
  const sMasuk      = shiftTrx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
  const sKeluar     = shiftTrx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
  // Uang sistem = cash kembalian + transaksi shift (saldo aplikasi TIDAK ikut)
  const cashKembAwal  = shift?.cashKemb||0;
  const uangSistemS   = cashKembAwal + sMasuk - sKeluar;
  const uangLaciNum   = +uangLaci||0;
  const selisih       = uangLaciNum - uangSistemS;
  const totalSaldoF   = Object.values(saldoForm).reduce((s,v)=>s+(+v||0),0);
  const totalSaldoC   = Object.values(saldoClose).reduce((s,v)=>s+(+v||0),0);
  const cashKembNum   = +cashKemb||0;
  // Uang sistem awal = cash kembalian SAJA (saldo aplikasi hanya catatan)
  const totalSistemBuka = cashKembNum;

  const inp = {width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit",background:"#fff",marginBottom:10};
  const lbl = {fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4};
  const SH  = ({t,c})=><div style={{fontWeight:800,fontSize:11,color:c||"#0d9488",background:(c||"#0d9488")+"15",borderRadius:7,padding:"5px 12px",margin:"12px 0 8px"}}>{t}</div>;

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{background:"#fff",borderRadius:18,padding:22,width:460,boxShadow:"0 24px 60px rgba(0,0,0,.25)",maxHeight:"92vh",overflowY:"auto",fontFamily:"'Nunito',sans-serif"}}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontWeight:900,fontSize:15,color:mode==="open"?"#0d9488":"#e74c3c"}}>
            {mode==="open"?"🟢 Buka Shift Bank":"🔴 Tutup Shift Bank"}
          </div>
          {mode==="close"&&(
            <div style={{fontSize:10,fontWeight:700,color:draftSaved?"#27ae60":"#aaa",transition:"color .3s"}}>
              {draftSaved?"💾 Tersimpan!":"🔄 Auto-save aktif"}
            </div>
          )}
        </div>

        {/* -- BUKA SHIFT -- */}
        {mode==="open"&&(
          <>
            <label style={lbl}>Nama Shift *</label>
            <input value={namaShift} onChange={e=>setNamaShift(e.target.value)} placeholder="Pagi / Siang / Malam..."
              style={{...inp,fontWeight:700}}/>

            <SH t="💵 Cash Kembalian -- Otomatis Masuk Saldo Sistem"/>
            <div style={{background:"#e0faf512",border:"1px solid #0d948822",borderRadius:9,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#555",lineHeight:1.6}}>
              ✅ <b>Cash kembalian langsung tercatat sebagai saldo awal.</b> Tidak perlu input manual saat closing.
            </div>
            <label style={lbl}>Jumlah Cash Kembalian (Rp)</label>
            <div style={{position:"relative",marginBottom:10}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontWeight:700,color:"#0d9488"}}>Rp</span>
              <input type="number" value={cashKemb} onChange={e=>setCashKemb(e.target.value)} placeholder="0"
                style={{...inp,paddingLeft:38,fontSize:18,fontWeight:900,textAlign:"right",border:`2px solid ${cashKembNum>0?"#0d9488":"#b2ede6"}`,marginBottom:0}}/>
            </div>

            <SH t="📱 Saldo Aplikasi Awal (Catatan -- tidak masuk uang sistem)"/>
            <div style={{background:"#fffbe6",border:"1px solid #f39c1222",borderRadius:9,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#b7770d",lineHeight:1.5}}>
              📌 Saldo aplikasi hanya untuk <b>pengecekan Anda</b> -- tidak mempengaruhi uang sistem.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
              {APPS.map(app=>(
                <div key={app}>
                  <label style={{...lbl,fontSize:10}}>{app}</label>
                  <input type="number" value={saldoForm[app]||""} onChange={e=>setSaldoForm(p=>({...p,[app]:e.target.value}))} placeholder="0"
                    style={{...inp,padding:"7px 10px",fontSize:12,marginBottom:0}}/>
                </div>
              ))}
            </div>

            {/* Total saldo aplikasi -- TERPISAH dari uang sistem */}
            <div style={{background:"#e0faf5",borderRadius:10,padding:"11px 14px",border:"2px solid #0d948833",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>📱 Total Saldo Aplikasi</span>
                <span style={{fontWeight:900,fontSize:18,color:"#0d9488"}}>{fmtRp(totalSaldoF)}</span>
              </div>
              <div style={{fontSize:10,color:"#aaa",marginTop:4}}>* Hanya catatan -- tidak masuk perhitungan uang sistem</div>
            </div>

            {/* Uang sistem awal = cash kembalian saja */}
            {cashKembNum>0&&(
              <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:10,padding:"11px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.75)",marginBottom:4}}>💵 UANG SISTEM AWAL</div>
                <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(totalSistemBuka)}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:3}}>= Cash Kembalian saja . Saldo aplikasi tidak dihitung</div>
              </div>
            )}
          </>
        )}

        {/* -- TUTUP SHIFT -- */}
        {mode==="close"&&(
          <>
            <div style={{background:"#f0faf8",borderRadius:9,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#555"}}>
              Shift: <b style={{color:"#0d9488"}}>{shift?.nama}</b> . {shift?.start}
            </div>

            {/* Rekap sistem */}
            <div style={{background:"#f8fffe",border:"2px solid #e0f5f1",borderRadius:10,padding:"11px 14px",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a",marginBottom:8}}>📊 Rekap Shift</div>
              {cashKembAwal>0&&(
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                  <span style={{color:"#555"}}>Cash Kembalian Awal</span>
                  <span style={{fontWeight:700,color:"#0d9488"}}>{fmtRp(cashKembAwal)}</span>
                </div>
              )}
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}>
                <span style={{color:"#555"}}>+ Total Masuk</span>
                <span style={{fontWeight:700,color:"#27ae60"}}>{fmtRp(sMasuk)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8,fontSize:12}}>
                <span style={{color:"#555"}}>− Total Keluar</span>
                <span style={{fontWeight:700,color:"#e74c3c"}}>{fmtRp(sKeluar)}</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"2px solid #e0f5f1"}}>
                <span style={{fontWeight:800,fontSize:13}}>💵 Uang Sistem</span>
                <span style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{fmtRp(uangSistemS)}</span>
              </div>
              <div style={{fontSize:10,color:"#aaa",marginTop:3}}>{shiftTrx.length} transaksi dalam shift ini</div>
            </div>

            {/* Saldo Aplikasi Akhir -- auto-save */}
            <SH t="📱 Saldo Aplikasi Akhir -- Auto Tersimpan"/>
            <div style={{background:"#fffbe6",border:"1px solid #f39c1233",borderRadius:9,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#b7770d",lineHeight:1.6}}>
              💡 <b>Input saldo sekarang, lanjutkan nanti.</b> Data tidak hilang meski modal ditutup. Tap ✕ untuk hapus jika salah.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
              {APPS.map(app=>(
                <div key={app}>
                  <label style={{...lbl,fontSize:10,display:"flex",justifyContent:"space-between"}}>
                    <span>{app}</span>
                    {+saldoClose[app]>0&&<span style={{color:"#0d9488",fontWeight:700}}>✓</span>}
                  </label>
                  <div style={{display:"flex",gap:4}}>
                    <input type="number" value={saldoClose[app]||""} onChange={e=>setSaldoClose(p=>({...p,[app]:e.target.value}))} placeholder="0"
                      style={{...inp,padding:"7px 10px",fontSize:12,marginBottom:0,border:`2px solid ${+saldoClose[app]>0?"#0d9488":"#b2ede6"}`,flex:1}}/>
                    {+saldoClose[app]>0&&(
                      <button onClick={()=>setSaldoClose(p=>({...p,[app]:""}))}
                        style={{background:"#fff0f0",border:"1px solid #e74c3c33",borderRadius:8,padding:"0 8px",color:"#e74c3c",fontSize:14,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Total saldo akhir SELALU tampil */}
            <div style={{background:"#e0faf5",borderRadius:10,padding:"11px 14px",marginBottom:10,border:"2px solid #0d948833"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:totalSaldoC>0?8:0}}>
                <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>💰 Total Saldo Aplikasi Akhir</span>
                <span style={{fontWeight:900,fontSize:18,color:"#0d9488"}}>{fmtRp(totalSaldoC)}</span>
              </div>
              {totalSaldoC>0&&(
                <div style={{borderTop:"1px dashed #0d948833",paddingTop:8}}>
                  {APPS.filter(a=>+saldoClose[a]>0).map(a=>(
                    <div key={a} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:3}}>
                      <span style={{color:"#555"}}>{a}</span>
                      <span style={{fontWeight:700,color:"#0d9488"}}>{fmtRp(+saldoClose[a])}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Uang Laci Fisik */}
            <SH t="💰 Uang Laci Fisik"/>
            <div style={{position:"relative",marginBottom:10}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontWeight:900,fontSize:16,color:"#0d9488"}}>Rp</span>
              <input type="number" value={uangLaci} onChange={e=>setUangLaci(e.target.value)} placeholder="0"
                style={{...inp,paddingLeft:42,fontSize:24,fontWeight:900,textAlign:"right",border:`2px solid ${uangLaciNum>0?"#0d9488":"#b2ede6"}`,marginBottom:0}}/>
            </div>

            {uangLaci&&(
              <div style={{background:selisih===0?"#e8f8f4":selisih>0?"#fffbe6":"#fff0f0",border:`2px solid ${selisih===0?"#2ecc71":selisih>0?"#f39c12":"#ff4757"}`,borderRadius:11,padding:"11px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4,fontSize:12}}><span style={{color:"#555"}}>Uang Sistem</span><span style={{fontWeight:700}}>{fmtRp(uangSistemS)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,fontSize:12}}><span style={{color:"#555"}}>Uang Laci Fisik</span><span style={{fontWeight:700}}>{fmtRp(uangLaciNum)}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontWeight:800,fontSize:13}}>{selisih===0?"✅ Balance!":selisih>0?"📈 Lebih":"📉 Kurang"}</span>
                  <span style={{fontWeight:900,fontSize:20,color:selisih===0?"#2ecc71":selisih>0?"#f39c12":"#ff4757"}}>{selisih!==0?(selisih>0?"+":"")+fmtRp(Math.abs(selisih)):"✓ Sesuai"}</span>
                </div>
              </div>
            )}

            <label style={lbl}>Catatan / Kendala</label>
            <textarea value={catatan} onChange={e=>setCatatan(e.target.value)} placeholder="Tulis jika ada kendala..."
              style={{...inp,resize:"vertical",minHeight:60}}/>
          </>
        )}

        <div style={{display:"flex",gap:8,marginTop:6}}>
          <button onClick={onCancel} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:11,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
          <button onClick={()=>{
            if(mode==="open"){
              if(!namaShift.trim()) return;
              onOpen({namaShift,cashKemb:cashKembNum,saldoApps:saldoForm,totalSaldo:totalSaldoF,totalSistemBuka});
            } else {
              // Hapus draft setelah tutup
              try{ localStorage.removeItem(draftKey); }catch{}
              onClose({saldoAppsC:saldoClose,totalSaldoC,uangLaci:uangLaciNum,uangSistem:uangSistemS,selisih,catatan,totalMasuk:sMasuk,totalKeluar:sKeluar});
            }
          }} style={{flex:2,background:`linear-gradient(135deg,${mode==="open"?"#0d9488,#14b8a6":"#e74c3c,#ff6b6b"})`,border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {mode==="open"?"🟢 Buka Shift":"🔴 Tutup & Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- BankTrxForm (komponen terpisah) -------------------------------------------
function BankTrxForm({editData, onSave, onCancel}) {
  const [nama,    setNama]    = useState(editData?.nama||"");
  const [jenis,   setJenis]   = useState(editData?.jenis||"masuk");
  const [nomStr,  setNomStr]  = useState(editData?.nominal?fmt(editData.nominal):"");
  const [feeType, setFeeType] = useState(editData?.feeType||"include");
  const [feeStr,  setFeeStr]  = useState(editData?.fee?fmt(editData.fee):"");

  const toNum = s => +String(s).replace(/\./g,"")||0;
  const nomNum = toNum(nomStr);
  const feeNum = toNum(feeStr);

  const handleNom  = e => { const r=e.target.value.replace(/\D/g,""); setNomStr(r?fmt(+r):""); };
  const handleFee  = e => { const r=e.target.value.replace(/\D/g,""); setFeeStr(r?fmt(+r):""); };
  const handleNama = e => setNama(e.target.value.toUpperCase());

  const calcNet = () => {
    if(feeType==="tarik") return { main:-nomNum, fee:feeNum }; // 2 rows
    if(jenis==="masuk") {
      if(feeType==="fee")      return nomNum+feeNum;
      if(feeType==="dipotong") return nomNum-feeNum;
      return nomNum;
    } else {
      if(feeType==="fee")      return -(nomNum+feeNum);
      if(feeType==="dipotong") return -(nomNum-feeNum);
      return -nomNum;
    }
  };

  const FEE_TYPES = [
    {k:"include",  l:"INCLUDE",    d:"Sudah all-in",             c:"#0d9488", showFee:false},
    {k:"fee",      l:"+ FEE",      d:"Fee ditambah ke nominal",  c:"#27ae60", showFee:true},
    {k:"dipotong", l:"− DIPOTONG", d:"Fee dipotong dari nominal",c:"#e74c3c", showFee:true},
    {k:"tarik",    l:"💸 TARIK",   d:"Keluar laci, fee masuk",   c:"#8e44ad", showFee:true},
  ];
  const QUICK_FEE = [2000,3000,5000,8000,10000];
  const activeType = FEE_TYPES.find(f=>f.k===feeType);

  const handleSave = () => {
    if(!nama.trim()||!nomNum) return;
    // Kirim semua data ke onSave -- parent (saveTrx) yang handle TARIK 2 baris
    const net = feeType==="tarik" ? -nomNum :
                feeType==="include" ? (jenis==="masuk"?nomNum:-nomNum) :
                feeType==="fee"     ? (jenis==="masuk"?nomNum+feeNum:-(nomNum+feeNum)) :
                                      (jenis==="masuk"?nomNum-feeNum:-(nomNum-feeNum));
    onSave({nama, jenis, feeType, fee:feeNum, nominal:nomNum, netNominal:net});
  };

  const inp={width:"100%",padding:"10px 13px",borderRadius:10,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit",background:"#fff",marginBottom:10,boxSizing:"border-box"};

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
      <div style={{background:"#fff",borderRadius:20,padding:24,width:420,boxShadow:"0 24px 60px rgba(0,0,0,.25)",fontFamily:"'Nunito',sans-serif",maxHeight:"92vh",overflowY:"auto"}}>

        <div style={{fontWeight:900,fontSize:16,color:"#0d9488",marginBottom:18}}>
          {editData?"✏️ Edit Transaksi":"➕ Catat Transaksi"}
        </div>

        {/* Nama */}
        <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:5}}>NAMA TRANSAKSI *</label>
        <input value={nama} onChange={handleNama} placeholder="CONTOH: SETORAN PENJUALAN PUSAT"
          style={{...inp,fontSize:14,fontWeight:700}} autoFocus/>

        {/* Masuk / Keluar */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          {[{k:"masuk",l:"⬇ MASUK",c:"#0d9488",bg:"#e0faf5"},{k:"keluar",l:"⬆ KELUAR",c:"#e74c3c",bg:"#fff0f0"}].map(j=>(
            <button key={j.k} onClick={()=>{setJenis(j.k);if(feeType==="tarik"&&j.k==="masuk")setFeeType("include");}}
              style={{padding:13,borderRadius:11,border:`2px solid ${jenis===j.k?j.c:"#b2ede6"}`,background:jenis===j.k?j.bg:"#fff",color:jenis===j.k?j.c:"#aaa",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:"inherit"}}>
              {j.l}
            </button>
          ))}
        </div>

        {/* Nominal */}
        <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:5}}>NOMINAL *</label>
        <div style={{position:"relative",marginBottom:10}}>
          <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontWeight:800,fontSize:16,color:"#0d9488"}}>Rp</span>
          <input value={nomStr} onChange={handleNom} placeholder="0"
            style={{...inp,fontSize:24,fontWeight:900,textAlign:"right",border:`2px solid ${nomNum>0?"#0d9488":"#b2ede6"}`,paddingLeft:40,marginBottom:0}}/>
        </div>

        {/* Tipe Fee -- 4 pilihan saat KELUAR, 3 saat MASUK */}
        <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:7,marginTop:10}}>TIPE FEE</label>
        <div style={{display:"grid",gridTemplateColumns:`repeat(${jenis==="keluar"?4:3},1fr)`,gap:7,marginBottom:12}}>
          {FEE_TYPES.map(f=>(
            (f.k==="tarik"&&jenis==="masuk") ? null :
            <button key={f.k} onClick={()=>setFeeType(f.k)}
              style={{padding:"9px 4px",borderRadius:10,border:`2px solid ${feeType===f.k?f.c:"#b2ede6"}`,background:feeType===f.k?`${f.c}12`:"#fff",color:feeType===f.k?f.c:"#aaa",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",lineHeight:1.4,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:11}}>{f.l}</div>
              <div style={{fontSize:9,marginTop:2,opacity:.75}}>{f.d}</div>
            </button>
          ))}
        </div>

        {/* Info TARIK */}
        {feeType==="tarik"&&(
          <div style={{background:"#f5eeff",border:"1px solid #8e44ad33",borderRadius:9,padding:"8px 12px",marginBottom:10,fontSize:11,color:"#8e44ad",lineHeight:1.6}}>
            💸 Uang <b>keluar laci</b> = nominal. Fee dari pelanggan <b>masuk ke laci</b>.<br/>
            Di riwayat muncul <b>2 baris terpisah</b>: nominal tarik & fee masuk.
          </div>
        )}

        {/* Input fee + quick buttons */}
        {activeType?.showFee&&(
          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:6}}>NOMINAL FEE</label>
            <div style={{display:"flex",gap:5,marginBottom:7,flexWrap:"wrap"}}>
              {QUICK_FEE.map(v=>(
                <button key={v} onClick={()=>setFeeStr(fmt(v))}
                  style={{padding:"4px 11px",borderRadius:20,border:`2px solid ${toNum(feeStr)===v?activeType.c:"#b2ede6"}`,background:toNum(feeStr)===v?`${activeType.c}15`:"#fff",color:toNum(feeStr)===v?activeType.c:"#555",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                  {fmt(v)}
                </button>
              ))}
            </div>
            <div style={{position:"relative"}}>
              <span style={{position:"absolute",left:13,top:"50%",transform:"translateY(-50%)",fontWeight:700,fontSize:14,color:activeType.c}}>Rp</span>
              <input value={feeStr} onChange={handleFee} placeholder="0"
                style={{...inp,fontSize:16,fontWeight:800,textAlign:"right",paddingLeft:40,marginBottom:0,border:`2px solid ${feeNum>0?activeType.c:"#b2ede6"}`}}/>
            </div>
          </div>
        )}

        {/* Tombol -- X kecil + Simpan */}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={onCancel}
            style={{width:44,height:44,borderRadius:10,border:"2px solid #b2ede6",background:"#fff",color:"#aaa",fontSize:18,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
            ✕
          </button>
          <button onClick={handleSave} disabled={!nama.trim()||!nomNum}
            style={{flex:1,background:!nama.trim()||!nomNum?"#ccc":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:900,fontSize:14,cursor:!nama.trim()||!nomNum?"not-allowed":"pointer",fontFamily:"inherit"}}>
            💾 Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FAST MOVING -- helpers & tab components
// ============================================================================

// -- Fast Moving helpers (shared by OutletFmPanel, ComparisonBar, MonthlyHistoryTab) --
const FM_PERIOD_OPTS = [
  {k:"3d",  l:"3 Hari",   days:3},
  {k:"7d",  l:"1 Minggu", days:7},
  {k:"14d", l:"14 Hari",  days:14},
  {k:"30d", l:"1 Bulan",  days:30},
];
const getFmStatus = (qty, days) => {
  const s = days>0 ? qty/days : 0;
  if(s>=1)   return {label:"Fast",   icon:"🔥", color:"#f59e0b", bg:"#fffbeb"};
  if(s>=0.3) return {label:"Normal", icon:"✅", color:"#10b981", bg:"#ecfdf5"};
  if(s>=0.1) return {label:"Lambat", icon:"🐢", color:"#94a3b8", bg:"#f1f5f9"};
  return           {label:"Mati",   icon:"💀", color:"#f43f5e", bg:"#fff1f2"};
};


function OutletFmPanel({outlet,data,globalMax,selectedProduct,onHover}){
  const [page,setPage]=useState(1);
  const PER=8,pages=Math.ceil((data||[]).length/PER);
  const shown=(data||[]).slice((page-1)*PER,page*PER);
  const topQty=(data||[])[0]?.qty||1;
  return(
    <div style={{background:"#fff",borderRadius:16,border:`2px solid ${outlet.color}18`,overflow:"hidden",flex:1,minWidth:0,boxShadow:`0 4px 16px ${outlet.color}15`,display:"flex",flexDirection:"column"}}>
      {/* Gradient header */}
      <div style={{background:`linear-gradient(135deg,${outlet.color},${outlet.color}cc)`,padding:"11px 14px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:"clamp(11px,1vw,13px)",color:"#fff"}}>{outlet.nama.replace("Ammar Cell ","")}</div>
          <div style={{fontSize:10,color:"rgba(255,255,255,.7)",marginTop:1}}>{(data||[]).filter(d=>d.qty>0).length} produk . hal {page}/{pages||1}</div>
        </div>
        <div style={{background:"rgba(255,255,255,.2)",borderRadius:10,padding:"4px 10px",textAlign:"center"}}>
          <div style={{fontWeight:900,fontSize:16,color:"#fff"}}>{(data||[]).reduce((s,d)=>s+d.qty,0)}</div>
          <div style={{fontSize:8,color:"rgba(255,255,255,.7)",fontWeight:600}}>TOTAL PCS</div>
        </div>
      </div>
      {/* List */}
      <div style={{flex:1,padding:"5px 0"}}>
        {(data||[]).length===0&&<div style={{textAlign:"center",color:"#cbd5e1",padding:"20px 0",fontSize:10}}>Tidak ada data</div>}
        {shown.map((p,i)=>{
          const hl=selectedProduct===p.name;
          const noSale=p.qty===0;
          const barW=Math.round(p.qty/topQty*100);
          return(
            <div key={p.name}
              onMouseEnter={()=>onHover&&onHover(p.name)}
              onMouseLeave={()=>onHover&&onHover(null)}
              style={{padding:"6px 12px",cursor:"pointer",transition:"background .1s",
                background:hl?`${outlet.color}0e`:"transparent",
                borderLeft:`3px solid ${hl?outlet.color:"transparent"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <div style={{width:19,height:19,borderRadius:5,flexShrink:0,
                  background:i===0&&page===1?`${outlet.color}20`:"#f8fafc",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontWeight:900,fontSize:9,color:i===0&&page===1?outlet.color:"#94a3b8"}}>
                  {(page-1)*PER+i+1}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:"clamp(9px,0.85vw,11px)",fontWeight:hl?800:noSale?400:700,
                    color:noSale?"#cbd5e1":"#1e293b",
                    overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{p.name}</div>
                  <div style={{height:4,background:"#f1f5f9",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${barW}%`,borderRadius:20,
                      background:noSale?"#e2e8f0":barW>=80?outlet.color:barW>=50?`${outlet.color}bb`:`${outlet.color}77`,
                      transition:"width .5s ease"}}/>
                  </div>
                </div>
                <div style={{flexShrink:0,fontWeight:900,fontSize:"clamp(10px,0.95vw,12px)",
                  color:noSale?"#e2e8f0":outlet.color,minWidth:28,textAlign:"right"}}>
                  {noSale?"--":p.qty}<span style={{fontSize:8,opacity:.65,fontWeight:600}}>{noSale?"":" pcs"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Pagination */}
      {pages>1&&(
        <div style={{padding:"5px 8px",borderTop:"1px solid #f1f5f9",display:"flex",justifyContent:"center",gap:3,background:"#fafbff",flexShrink:0}}>
          <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
            style={{width:22,height:22,borderRadius:6,border:"1px solid #e2e8f0",background:page===1?"#f8fafc":"#fff",color:page===1?"#cbd5e1":outlet.color,fontWeight:900,fontSize:12,cursor:page===1?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
          {Array.from({length:Math.min(pages,5)},(_,i)=>{
            if(pages<=5) return i+1;
            if(page<=3) return i+1;
            if(page>=pages-2) return pages-4+i;
            return page-2+i;
          }).map(p=>(
            <button key={p} onClick={()=>setPage(p)}
              style={{width:22,height:22,borderRadius:6,border:"1px solid",borderColor:page===p?outlet.color:"#e2e8f0",background:page===p?outlet.color:"#fff",color:page===p?"#fff":"#64748b",fontWeight:700,fontSize:9,cursor:"pointer"}}>
              {p}
            </button>
          ))}
          <button onClick={()=>setPage(p=>Math.min(pages,p+1))} disabled={page===pages}
            style={{width:22,height:22,borderRadius:6,border:"1px solid #e2e8f0",background:page===pages?"#f8fafc":"#fff",color:page===pages?"#cbd5e1":outlet.color,fontWeight:900,fontSize:12,cursor:page===pages?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
        </div>
      )}
    </div>
  );
}

function ComparisonBar({product,outlets,fmPerOutlet}){
  return(
    <div style={{display:"flex",padding:"7px 12px",borderBottom:"1px solid #f8fafc",alignItems:"center",gap:10}}>
      <div style={{width:150,fontSize:10,fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flexShrink:0}}>{product.name}</div>
      {outlets.map(o=>{
        const d=fmPerOutlet[o.id]?.find(x=>x.name===product.name);
        const qty=d?.qty||0;
        const pct=Math.round(qty/Math.max(product.qty,1)*100);
        return(
          <div key={o.id} style={{flex:1,display:"flex",alignItems:"center",gap:5}}>
            <div style={{flex:1,height:7,background:"#f1f5f9",borderRadius:20,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${pct}%`,background:qty===0?"#e2e8f0":o.color,borderRadius:20,transition:"width .5s"}}/>
            </div>
            <span style={{width:24,textAlign:"right",fontSize:10,fontWeight:800,color:qty===0?"#cbd5e1":o.color,flexShrink:0}}>{qty||"--"}</span>
          </div>
        );
      })}
    </div>
  );
}

function MonthlyHistoryTab({transactions,outlets}){
  // Build history months dynamically from the last 6 months
  const MONTHLY_HISTORY_OPTS = (() => {
    const opts = [];
    const now  = new Date();
    for(let i=1;i<=6;i++){
      const dt   = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const from = new Date(dt.getFullYear(), dt.getMonth(), 1);
      const to   = new Date(dt.getFullYear(), dt.getMonth()+1, 0, 23,59,59);
      opts.push({
        key:   `m${dt.getFullYear()}${dt.getMonth()}`,
        label: dt.toLocaleDateString("id-ID",{month:"long",year:"numeric"}),
        days:  to.getDate(),
        from, to,
      });
    }
    return opts;
  })();
  const [selMonth, setSelMonth] = useState(()=>{
    const now=new Date();
    const dt=new Date(now.getFullYear(),now.getMonth()-1,1);
    return `m${dt.getFullYear()}${dt.getMonth()}`;
  });
  const [selOutlet, setSelOutlet] = useState("all");
  const [search, setSearch] = useState("");

  const monthData = MONTHLY_HISTORY_OPTS.find(m=>m.key===selMonth);
  // Build real item data for selected month from transactions prop
  const buildMonthItems = (from, to) => {
    const imap = {};
    (transactions||[]).forEach(t=>{
      const d = (() => { try{ const p=t.date.split('/'); return p.length===3?new Date(p[2],p[1]-1,p[0]):new Date(t.date); }catch{return null;} })();
      if(!d||d<from||d>to) return;
      (t.items||[]).filter(i=>!i.refunded).forEach(i=>{
        if(!imap[i.name]) imap[i.name]={name:i.name,qty:0,omset:0,profit:0,trx:0};
        imap[i.name].qty   += i.qty;
        imap[i.name].omset += i.price*i.qty;
        imap[i.name].profit+= (i.price-(i.modal||0))*i.qty;
        imap[i.name].trx   += 1;
      });
    });
    return Object.values(imap).sort((a,b)=>b.qty-a.qty).map((x,i)=>({...x,rank:i+1}));
  };
  const data = monthData ? buildMonthItems(monthData.from, monthData.to) : [];
  const filtered = data.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));

  // Compare bulan: current vs previous
  const curIdx  = MONTHLY_HISTORY_OPTS.findIndex(m=>m.key===selMonth);
  const prevMonth = MONTHLY_HISTORY_OPTS[curIdx+1];
  const prevData  = prevMonth ? buildMonthItems(prevMonth.from, prevMonth.to) : null;

  return(
    <div>
      {/* Pilih bulan */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,fontWeight:700,color:"#64748b",flexShrink:0}}>📅 Pilih Bulan:</span>
        {MONTHLY_HISTORY_OPTS.map(m=>(
          <button key={m.key} onClick={()=>setSelMonth(m.key)}
            style={{padding:"clamp(4px,0.5vw,7px) clamp(10px,1vw,15px)",borderRadius:20,border:"2px solid",
              borderColor:selMonth===m.key?"#0d9488":"#e2e8f0",
              background:selMonth===m.key?"#0d9488":"#fff",
              color:selMonth===m.key?"#fff":"#64748b",
              fontWeight:700,fontSize:"clamp(11px,0.9vw,13px)",cursor:"pointer",fontFamily:"inherit",
              transition:"all .15s",position:"relative"}}>
            {m.label}
            {m.note&&<span style={{position:"absolute",top:-6,right:-4,background:"#f59e0b",borderRadius:20,padding:"1px 5px",fontSize:7,color:"#fff",fontWeight:900}}>{m.note}</span>}
          </button>
        ))}
      </div>

      {/* Header bulan yang dipilih */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:14,padding:"clamp(12px,1.2vw,18px)",marginBottom:12,display:"flex",alignItems:"center",gap:14}}>
        <div style={{fontSize:"clamp(24px,2.5vw,36px)"}}>📅</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:"clamp(14px,1.4vw,18px)",color:"#fff"}}>{monthData?.label}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.65)",marginTop:2}}>
            {monthData?.days} hari . {filtered.filter(p=>p.qty>0).length} produk terjual
            {monthData?.note&&<span style={{marginLeft:8,background:"#f59e0b",borderRadius:20,padding:"1px 7px",fontSize:9,color:"#1e293b",fontWeight:800}}>{monthData.note}</span>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[
            {l:"Total Qty",    v:filtered.reduce((s,p)=>s+p.qty,0)+" pcs",  c:"#a5b4fc"},
            {l:"Total Omset",  v:fmtRp(filtered.reduce((s,p)=>s+p.omset,0)),c:"#fcd34d"},
            {l:"Total Profit", v:fmtRp(filtered.reduce((s,p)=>s+p.profit,0)),c:"#6ee7b7"},
          ].map(k=>(
            <div key={k.l} style={{background:"rgba(255,255,255,.1)",borderRadius:10,padding:"clamp(6px,0.8vw,10px)",textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:"clamp(11px,1.1vw,15px)",color:k.c}}>{k.v}</div>
              <div style={{fontSize:"clamp(9px,0.75vw,11px)",color:"rgba(255,255,255,.5)",marginTop:1,fontWeight:600}}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr clamp(240px,28%,340px)",gap:"clamp(8px,1vw,14px)"}}>
        {/* Tabel produk bulan ini */}
        <div>
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Cari produk..."
              style={{flex:1,padding:"7px 11px",borderRadius:9,border:"2px solid #e2e8f0",fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff"}}
              onFocus={e=>e.currentTarget.style.borderColor="#0d9488"}
              onBlur={e=>e.currentTarget.style.borderColor="#e2e8f0"}/>
            <span style={{fontSize:10,color:"#94a3b8",fontWeight:600,flexShrink:0}}>{filtered.length} produk</span>
          </div>
          <div style={{background:"#fff",borderRadius:12,border:"2px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{padding:"9px 12px",borderBottom:"2px solid #f1f5f9",fontWeight:800,fontSize:12,color:"#1e293b",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>📦 {monthData?.label}</span>
              {prevMonth&&<span style={{fontSize:10,color:"#94a3b8"}}>vs {prevMonth.label}</span>}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 54px 54px 70px 70px 54px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
              {["#","Produk","Status","Qty","Omset","Profit","vs Bln Lalu"].map(h=>(
                <div key={h} style={{padding:"clamp(5px,0.6vw,8px) 6px",fontSize:"clamp(9px,0.75vw,11px)",fontWeight:700,color:"#64748b",textTransform:"uppercase",whiteSpace:"nowrap"}}>{h}</div>
              ))}
            </div>
            {filtered.slice(0,15).map((p,i)=>{
              const st = getFmStatus(p.qty, monthData?.days||30);
              const prev = prevData?.find(x=>x.name===p.name);
              const diff = prev ? p.qty - prev.qty : null;
              const diffPct = prev&&prev.qty>0 ? ((p.qty-prev.qty)/prev.qty*100).toFixed(0) : null;
              const rankC = p.rank<=5?"#f59e0b":p.rank<=10?"#10b981":"#6366f1";
              const rankBg= p.rank<=5?"#fffbeb":p.rank<=10?"#ecfdf5":"#eef2ff";
              return(
                <div key={p.name} style={{display:"grid",gridTemplateColumns:"28px 1fr 54px 54px 70px 70px 54px",borderTop:"1px solid #f8fafc",background:i%2===0?"#fff":"#fafbff"}}>
                  <div style={{padding:"6px 6px",display:"flex",alignItems:"center"}}>
                    <span style={{width:18,height:18,borderRadius:4,background:rankBg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:8,color:rankC}}>{p.rank}</span>
                  </div>
                  <div style={{padding:"6px 6px",fontWeight:700,fontSize:10,color:p.qty===0?"#94a3b8":"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",alignSelf:"center"}}>{p.name}</div>
                  <div style={{padding:"6px 5px",alignSelf:"center"}}>
                    <span style={{fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:20,background:st.bg,color:st.color,whiteSpace:"nowrap"}}>{st.icon} {st.label}</span>
                  </div>
                  <div style={{padding:"6px 6px",fontWeight:900,fontSize:10,color:rankC,alignSelf:"center"}}>{p.qty} <span style={{fontSize:8,opacity:.7}}>pcs</span></div>
                  <div style={{padding:"6px 6px",fontSize:9,fontWeight:700,color:"#1e293b",alignSelf:"center"}}>{fmtRp(p.omset)}</div>
                  <div style={{padding:"6px 6px",fontSize:9,fontWeight:700,color:"#10b981",alignSelf:"center"}}>{fmtRp(p.profit)}</div>
                  <div style={{padding:"6px 6px",alignSelf:"center"}}>
                    {diff===null?<span style={{fontSize:8,color:"#cbd5e1"}}>--</span>:
                    <span style={{fontSize:9,fontWeight:800,color:diff>0?"#10b981":diff<0?"#f43f5e":"#94a3b8"}}>
                      {diff>0?"▲":diff<0?"▼":"="}{Math.abs(diff)}
                      {diffPct&&<span style={{fontSize:7,opacity:.8}}> ({diffPct}%)</span>}
                    </span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 & bottom 5 bulan ini */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Top 5 */}
          <div style={{background:"#fff",borderRadius:12,border:"2px solid #e0f5f1",overflow:"hidden"}}>
            <div style={{padding:"9px 12px",background:"#f0fdfb",borderBottom:"2px solid #e0f5f1",fontWeight:800,fontSize:11,color:"#0d9488",display:"flex",gap:6,alignItems:"center"}}>
              🏆 Top 5 Terlaris -- {monthData?.label}
            </div>
            {filtered.slice(0,5).map((p,i)=>(
              <div key={p.name} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",borderTop:i>0?"1px solid #f0faf8":"none"}}>
                <span style={{width:20,height:20,borderRadius:6,background:["#fffbeb","#fff7ed","#f0fdf4","#eff6ff","#f5f3ff"][i],display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:10,color:["#f59e0b","#ea580c","#10b981","#6366f1","#8b5cf6"][i],flexShrink:0}}>
                  {["🥇","🥈","🥉","4","5"][i]}
                </span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:10,fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                  <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>{fmtRp(p.profit)} profit</div>
                </div>
                <span style={{fontWeight:900,fontSize:12,color:"#0d9488",flexShrink:0}}>{p.qty}<span style={{fontSize:8,opacity:.7}}>pcs</span></span>
              </div>
            ))}
          </div>

          {/* Trend vs bulan lalu */}
          {prevMonth&&(
          <div style={{background:"#fff",borderRadius:12,border:"2px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{padding:"9px 12px",background:"#f8fafc",borderBottom:"2px solid #f1f5f9",fontWeight:800,fontSize:11,color:"#1e293b",display:"flex",gap:6,alignItems:"center"}}>
              📊 Tren vs {prevMonth.label}
            </div>
            {[
              {l:"Naik paling tinggi",  icon:"🚀", items:filtered.filter(p=>{const prev=prevData?.find(x=>x.name===p.name);return prev&&p.qty>prev.qty;}).sort((a,b)=>{const pa=prevData?.find(x=>x.name===a.name)||{qty:0};const pb=prevData?.find(x=>x.name===b.name)||{qty:0};return(b.qty-pb.qty)-(a.qty-pa.qty);}).slice(0,2), c:"#10b981"},
              {l:"Turun paling banyak", icon:"📉", items:filtered.filter(p=>{const prev=prevData?.find(x=>x.name===p.name);return prev&&p.qty<prev.qty;}).sort((a,b)=>{const pa=prevData?.find(x=>x.name===a.name)||{qty:0};const pb=prevData?.find(x=>x.name===b.name)||{qty:0};return(a.qty-pa.qty)-(b.qty-pb.qty);}).slice(0,2), c:"#f43f5e"},
            ].map(section=>(
              <div key={section.l} style={{padding:"8px 12px",borderTop:"1px solid #f1f5f9"}}>
                <div style={{fontSize:9,fontWeight:700,color:"#94a3b8",marginBottom:5,textTransform:"uppercase"}}>{section.icon} {section.l}</div>
                {section.items.length===0?<div style={{fontSize:9,color:"#cbd5e1"}}>Tidak ada data</div>
                :section.items.map(p=>{
                  const prev=prevData?.find(x=>x.name===p.name)||{qty:0};
                  const d=p.qty-prev.qty;
                  return(
                    <div key={p.name} style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                      <span style={{color:"#1e293b",fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0}}>{p.name}</span>
                      <span style={{fontWeight:800,color:section.c,flexShrink:0,marginLeft:6}}>
                        {d>0?"+":""}{d} pcs
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}


function FastMovingTab({transactions, outlets, fmData, fmDataByPeriod}){
  const [mainTab,        setMainTab]        = useState("split");
  const [comparePeriod,  setComparePeriod]  = useState("14d");
  const [hoveredProduct, setHoveredProduct] = useState(null);
  const [fmSearch,       setFmSearch]       = useState("");
  const [fmPage,         setFmPage]         = useState(1);
  const FM_PER  = 10;
  const DAYS    = fmData.days||6;
  const FM_LIST = fmData.items||[];

  const filtered  = FM_LIST.filter(p=>p.name.toLowerCase().includes(fmSearch.toLowerCase()));
  const pages     = Math.ceil(filtered.length/FM_PER);
  const shown     = filtered.slice((fmPage-1)*FM_PER, fmPage*FM_PER);
  const globalMax = FM_LIST[0]?.qty||1;
  const curPeriod = FM_PERIOD_OPTS.find(p=>p.k===comparePeriod)||FM_PERIOD_OPTS[2];

  // Build per-outlet data for current period
  const buildOutletData = (periodKey) => {
    const pOpt  = FM_PERIOD_OPTS.find(x=>x.k===periodKey)||FM_PERIOD_OPTS[2];
    const now   = new Date();
    const from  = new Date(now); from.setDate(now.getDate()-pOpt.days+1); from.setHours(0,0,0,0);
    const to    = new Date(); to.setHours(23,59,59,999);
    const res   = {};
    (outlets||[]).forEach(o=>{
      const imap = {};
      (transactions||[]).forEach(t=>{
        const d = (() => { try{ const p=t.date.split('/'); return p.length===3?new Date(p[2],p[1]-1,p[0]):new Date(t.date); }catch{return null;} })();
        if(!d||d<from||d>to||t.outletId!==o.id) return;
        (t.items||[]).filter(i=>!i.refunded).forEach(i=>{
          if(!imap[i.name]) imap[i.name]={name:i.name,qty:0};
          imap[i.name].qty += i.qty;
        });
      });
      res[o.id] = Object.values(imap).sort((a,b)=>b.qty-a.qty);
    });
    return res;
  };

  const fmOutlet = buildOutletData(comparePeriod);
  // Also build for split view (using current period selection)
  const fmOutletSplit = buildOutletData(comparePeriod);

  const MAIN_TABS = [
    {k:"split",   l:"◫ Split View"},
    {k:"compare", l:"⇔ Perbandingan"},
    {k:"history", l:"📅 Riwayat Bulanan"},
  ];

  // Outlet colors
  const OUTLET_COLORS = ["#6366f1","#06b6d4","#f59e0b","#10b981","#f43f5e"];
  const OUTLET_LIST   = (outlets||[]).map((o,i)=>({...o,color:OUTLET_COLORS[i%OUTLET_COLORS.length]}));

  return (
    <div>
      {/* Sub-nav tabs */}
      <div style={{display:"flex",gap:2,background:"rgba(255,255,255,.1)",borderRadius:10,padding:3,marginBottom:14,width:"fit-content"}}>
        {MAIN_TABS.map(t=>(
          <button key={t.k} onClick={()=>setMainTab(t.k)}
            style={{padding:"clamp(5px,0.6vw,8px) clamp(10px,1.2vw,16px)",borderRadius:8,border:"none",fontWeight:700,fontSize:"clamp(11px,0.9vw,13px)",cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
              background:mainTab===t.k?"#0d9488":"transparent",
              color:mainTab===t.k?"#fff":"#64748b",
              boxShadow:mainTab===t.k?"0 2px 8px rgba(13,148,136,.25)":"none"}}>
            {t.l}
          </button>
        ))}
        {mainTab==="compare"&&(
          <div style={{display:"flex",gap:3,marginLeft:8,alignItems:"center"}}>
            {FM_PERIOD_OPTS.map(p=>(
              <button key={p.k} onClick={()=>setComparePeriod(p.k)}
                style={{padding:"clamp(4px,0.5vw,6px) clamp(9px,0.9vw,13px)",borderRadius:20,border:"2px solid",
                  borderColor:comparePeriod===p.k?"#0d9488":"#e2e8f0",
                  background:comparePeriod===p.k?"#e0faf5":"#fff",
                  color:comparePeriod===p.k?"#0d9488":"#64748b",
                  fontWeight:700,fontSize:"clamp(11px,0.9vw,13px)",cursor:"pointer",fontFamily:"inherit"}}>
                {p.l}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* == SPLIT VIEW == */}
      {mainTab==="split"&&(
      <div style={{display:"grid",gridTemplateColumns:"clamp(320px,38%,500px) 1fr",gap:"clamp(8px,1vw,16px)"}}>
        {/* Kiri: Daftar global */}
        <div>
          <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
            <input value={fmSearch} onChange={e=>{setFmSearch(e.target.value);setFmPage(1);}} placeholder="🔍 Cari produk..."
              style={{flex:1,padding:"8px 12px",borderRadius:10,border:"2px solid #e2e8f0",fontSize:11,fontFamily:"inherit",outline:"none",background:"#fff"}}
              onFocus={e=>e.currentTarget.style.borderColor="#0d9488"}
              onBlur={e=>e.currentTarget.style.borderColor="#e2e8f0"}/>
            <span style={{fontSize:10,color:"#94a3b8",fontWeight:600,flexShrink:0}}>{filtered.length} produk . {DAYS} hari</span>
          </div>
          {/* KPI status */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7,marginBottom:10}}>
            {[
              {label:"Fast Moving",icon:"🔥",count:FM_LIST.filter(p=>p.qty/DAYS>=1).length,   sub:"≥1 pcs/hari",c:"#f59e0b",bg:"#fffbeb"},
              {label:"Normal",     icon:"✅",count:FM_LIST.filter(p=>{const s=p.qty/DAYS;return s>=0.3&&s<1;}).length,sub:"0.3-1/hari",c:"#10b981",bg:"#ecfdf5"},
              {label:"Lambat",     icon:"🐢",count:FM_LIST.filter(p=>{const s=p.qty/DAYS;return s>=0.1&&s<0.3;}).length,sub:"0.1-0.3/hari",c:"#94a3b8",bg:"#f1f5f9"},
              {label:"Stok Mati",  icon:"💀",count:FM_LIST.filter(p=>p.qty/DAYS<0.1).length,  sub:"<0.1/hari",c:"#f43f5e",bg:"#fff1f2"},
            ].map(k=>(
              <div key={k.label} style={{background:k.bg,borderRadius:11,padding:"9px 10px",border:`1px solid ${k.c}22`}}>
                <div style={{fontWeight:900,fontSize:"clamp(16px,2vw,24px)",color:k.c}}>{k.count}</div>
                <div style={{fontSize:"clamp(10px,0.85vw,13px)",fontWeight:700,color:k.c,marginTop:1}}>{k.icon} {k.label}</div>
                <div style={{fontSize:"clamp(9px,0.72vw,11px)",color:k.c,opacity:.7,marginTop:1}}>{k.sub}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e2e8f0",overflow:"hidden"}}>
            <div style={{padding:"9px 12px",borderBottom:"2px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:800,fontSize:12,color:"#1e293b"}}>🌐 Semua Outlet</span>
              <span style={{fontSize:10,color:"#94a3b8"}}>Hal {fmPage}/{pages}</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 58px 48px 70px 68px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9"}}>
              {["#","Produk","Status","Terjual","Omset","Profit"].map(h=>(
                <div key={h} style={{padding:"clamp(5px,0.6vw,8px) 6px",fontSize:"clamp(9px,0.75vw,11px)",fontWeight:700,color:"#64748b",textTransform:"uppercase"}}>{h}</div>
              ))}
            </div>
            {shown.map((p,i)=>{
              const st    = getFmStatus(p.qty, DAYS);
              const rankC = p.rank<=10?"#f59e0b":p.rank<=30?"#10b981":"#6366f1";
              const rankBg= p.rank<=10?"#fffbeb":p.rank<=30?"#ecfdf5":"#eef2ff";
              const isHov = hoveredProduct===p.name;
              return(
                <div key={p.name}
                  style={{display:"grid",gridTemplateColumns:"28px 1fr 58px 48px 70px 68px",
                    borderTop:"1px solid #f8fafc",
                    background:isHov?"#f0fdfb":p.qty===0?"#fff8f8":i%2===0?"#fff":"#fafbff",
                    cursor:"pointer",transition:"background .1s"}}
                  onMouseEnter={()=>setHoveredProduct(p.name)}
                  onMouseLeave={()=>setHoveredProduct(null)}>
                  <div style={{padding:"7px 6px",display:"flex",alignItems:"center"}}>
                    <span style={{width:19,height:19,borderRadius:5,background:rankBg,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:8,color:rankC}}>{p.rank}</span>
                  </div>
                  <div style={{padding:"7px 6px",fontWeight:700,fontSize:10,color:p.qty===0?"#94a3b8":"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",alignSelf:"center"}}>
                    {p.name}{isHov&&<span style={{fontSize:8,color:"#0d9488",marginLeft:3}}>←</span>}
                  </div>
                  <div style={{padding:"7px 4px",alignSelf:"center"}}>
                    <span style={{fontSize:8,fontWeight:700,padding:"2px 5px",borderRadius:20,background:st.bg,color:st.color,whiteSpace:"nowrap"}}>{st.icon} {st.label}</span>
                  </div>
                  <div style={{padding:"7px 6px",fontWeight:900,fontSize:10,color:rankC,alignSelf:"center"}}>{p.qty}<span style={{fontSize:8,opacity:.7}}>pcs</span></div>
                  <div style={{padding:"7px 6px",fontSize:9,fontWeight:700,color:"#1e293b",alignSelf:"center"}}>{fmtRp(p.omset)}</div>
                  <div style={{padding:"7px 6px",fontSize:9,fontWeight:800,color:"#10b981",alignSelf:"center"}}>{fmtRp(p.profit)}</div>
                </div>
              );
            })}
          </div>
          <div style={{display:"flex",justifyContent:"center",gap:4,marginTop:10}}>
            <button onClick={()=>setFmPage(p=>Math.max(1,p-1))} disabled={fmPage===1}
              style={{padding:"4px 10px",borderRadius:8,border:"2px solid #e2e8f0",background:"#fff",color:fmPage===1?"#cbd5e1":"#1e293b",fontWeight:700,fontSize:9,cursor:fmPage===1?"default":"pointer",fontFamily:"inherit"}}>← Prev</button>
            {Array.from({length:pages},(_,i)=>i+1).filter(p=>Math.abs(p-fmPage)<=1||p===1||p===pages).map((p,i,arr)=>(
              <span key={p} style={{display:"flex",alignItems:"center",gap:2}}>
                {i>0&&arr[i-1]!==p-1&&<span style={{color:"#94a3b8",fontSize:9}}>…</span>}
                <button onClick={()=>setFmPage(p)} style={{padding:"4px 8px",borderRadius:8,border:"2px solid",borderColor:fmPage===p?"#0d9488":"#e2e8f0",background:fmPage===p?"#0d9488":"#fff",color:fmPage===p?"#fff":"#1e293b",fontWeight:700,fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>{p}</button>
              </span>
            ))}
            <button onClick={()=>setFmPage(p=>Math.min(pages,p+1))} disabled={fmPage===pages}
              style={{padding:"4px 10px",borderRadius:8,border:"2px solid #e2e8f0",background:"#fff",color:fmPage===pages?"#cbd5e1":"#1e293b",fontWeight:700,fontSize:9,cursor:fmPage===pages?"default":"pointer",fontFamily:"inherit"}}>Next →</button>
          </div>
        </div>
        {/* Kanan: Per Outlet */}
        <div>
          <div style={{background:"#fff",borderRadius:12,border:"2px solid #e0f5f1",padding:"9px 14px",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14}}>💡</span>
            <div style={{flex:1}}>
              <span style={{fontWeight:700,fontSize:11,color:"#0d9488"}}>Fast Moving Per Outlet</span>
              <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>Hover produk di kiri → highlight otomatis di panel outlet</div>
            </div>
            {OUTLET_LIST.map(o=>(
              <div key={o.id} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:"#64748b"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:o.color}}/>
                {o.nama}
              </div>
            ))}
          </div>
          <div style={{display:"flex",gap:10}}>
            {OUTLET_LIST.map(o=>(
              <OutletFmPanel key={o.id} outlet={o} data={fmOutletSplit[o.id]||[]} globalMax={globalMax} selectedProduct={hoveredProduct} onHover={setHoveredProduct}/>
            ))}
          </div>
          {hoveredProduct&&(()=>{
            const p=FM_LIST.find(x=>x.name===hoveredProduct);
            if(!p) return null;
            const perO=OUTLET_LIST.map(o=>{const d=fmOutletSplit[o.id]?.find(x=>x.name===hoveredProduct);return{...o,qty:d?.qty||0};});
            const best=perO.reduce((a,b)=>b.qty>a.qty?b:a,perO[0]);
            const missing=perO.filter(o=>o.qty===0);
            const st=getFmStatus(p.qty,DAYS);
            return(
              <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:14,padding:"11px 16px",marginTop:10,display:"flex",alignItems:"center",gap:12}}>
                <div style={{fontSize:24}}>{st.icon}</div>
                <div style={{flex:1}}>
                  <div style={{fontWeight:800,fontSize:11,color:"#fff",marginBottom:2}}>{p.name} -- <span style={{color:"#fcd34d"}}>{st.label}</span></div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.85)",display:"flex",gap:10,flexWrap:"wrap"}}>
                    <span>📍 Terlaris di <b style={{color:"#fcd34d"}}>{best.nama}</b> ({best.qty} pcs)</span>
                    {missing.length>0&&<span>⚠ Belum terjual: <b style={{color:"#fca5a5"}}>{missing.map(o=>o.nama).join(", ")}</b></span>}
                    <span>📦 Total: <b style={{color:"#a7f3d0"}}>{p.qty} pcs</b></span>
                  </div>
                </div>
              </div>
            );
          })()}
          {!hoveredProduct&&(
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"11px 16px",marginTop:10}}>
              <div style={{fontWeight:700,fontSize:11,color:"#0d9488",marginBottom:7}}>📋 Panduan Strategi Stok</div>
              {[
                {icon:"🔥",text:"Fast (≥1/hari) → Min 7-10 pcs per outlet",c:"#f59e0b"},
                {icon:"✅",text:"Normal (0.3-1/hari) → 3-5 pcs, reorder saat ≤2",c:"#10b981"},
                {icon:"🐢",text:"Lambat → Tahan stok, fokus outlet terlaris",c:"#94a3b8"},
                {icon:"💡",text:"Hover produk untuk lihat distribusi outlet",c:"#6366f1"},
              ].map((r,i)=>(
                <div key={i} style={{display:"flex",gap:7,fontSize:10,marginBottom:5}}>
                  <span>{r.icon}</span><span style={{color:r.c,fontWeight:600}}>{r.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* == COMPARE VIEW == */}
      {mainTab==="compare"&&(
      <div style={{background:"#fff",borderRadius:14,border:"2px solid #e2e8f0",overflow:"hidden"}}>
        <div style={{padding:"10px 16px",borderBottom:"2px solid #f1f5f9",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontWeight:800,fontSize:13,color:"#1e293b"}}>⇔ Perbandingan Antar Outlet</span>
          <span style={{background:"#e0f5f1",color:"#0d9488",fontWeight:700,fontSize:10,padding:"3px 10px",borderRadius:20}}>{curPeriod.l}</span>
          <span style={{fontSize:10,color:"#94a3b8",marginLeft:"auto"}}>qty per outlet</span>
        </div>
        <div style={{display:"flex",padding:"7px 12px",background:"#f8fafc",borderBottom:"1px solid #f1f5f9",alignItems:"center",gap:10}}>
          <div style={{width:150,fontSize:9,fontWeight:700,color:"#64748b",textTransform:"uppercase",flexShrink:0}}>Produk</div>
          {OUTLET_LIST.map(o=>(
            <div key={o.id} style={{flex:1,display:"flex",alignItems:"center",gap:4,fontSize:10,fontWeight:700,color:o.color}}>
              <div style={{width:7,height:7,borderRadius:"50%",background:o.color}}/>
              {o.nama.replace("Ammar Cell ","")}<span style={{marginLeft:"auto",fontSize:9,color:"#94a3b8",fontWeight:600}}>qty</span>
            </div>
          ))}
        </div>
        {FM_LIST.slice(0,20).map(p=>(
          <ComparisonBar key={p.name} product={p} outlets={OUTLET_LIST} fmPerOutlet={fmOutlet}/>
        ))}
        <div style={{padding:"12px 16px",background:"#f8fffe",borderTop:"2px solid #e0f5f1"}}>
          <div style={{fontWeight:700,fontSize:11,color:"#0d9488",marginBottom:8}}>💡 Insight Strategi Stok -- {curPeriod.l}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[
              {icon:"📊",title:"Top Produk Periode Ini",desc:`${FM_LIST.filter(p=>p.qty>0).slice(0,3).map(p=>p.name).join(", ")} -- paling banyak terjual`,c:"#6366f1"},
              {icon:"🔑",title:"Distribusi Antar Outlet",desc:"Lihat bar mana yang paling panjang untuk keputusan stok per lokasi",c:"#06b6d4"},
              {icon:"💡",title:"Produk Belum Terjual",desc:`${FM_LIST.filter(p=>p.qty===0).length} produk belum ada penjualan -- pertimbangkan reposisi stok`,c:"#f59e0b"},
            ].map(k=>(
              <div key={k.title} style={{background:`${k.c}08`,borderRadius:11,padding:"10px 12px",border:`1px solid ${k.c}22`}}>
                <div style={{fontSize:13,marginBottom:3}}>{k.icon}</div>
                <div style={{fontWeight:700,fontSize:11,color:k.c,marginBottom:2}}>{k.title}</div>
                <div style={{fontSize:10,color:"#64748b",lineHeight:1.5}}>{k.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* == RIWAYAT BULANAN == */}
      {mainTab==="history"&&(
        <MonthlyHistoryTab transactions={transactions} outlets={outlets}/>
      )}
    </div>
  );
}


// ============================================================================
// DASHBOARD OVERALL -- v2 (CRM style, realtime)
// ============================================================================

function QBarChart({data,keys,colors,labels}){
  const [hover,setHover]=useState(null);
  const W=540,H=180,pL=52,pR=12,pT=16,pB=36;
  const iW=W-pL-pR,iH=H-pT-pB,n=data.length;
  const maxV=Math.max(...data.flatMap(d=>keys.map(k=>d[k])),1);
  const bW=Math.floor(iW/n*0.55/keys.length);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",display:"block"}} onMouseLeave={()=>setHover(null)}>
      {[0,.25,.5,.75,1].map((f,i)=>{
        const y=pT+iH*(1-f);
        return <g key={i}>
          <line x1={pL} y1={y} x2={W-pR} y2={y} stroke={i===0?"#cbd5e1":"#f1f5f9"} strokeWidth="1" strokeDasharray={i>0?"4,4":"none"}/>
          <text x={pL-5} y={y+4} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="Nunito">{fmtS(maxV*f)}</text>
        </g>;
      })}
      {data.map((d,i)=>{
        const cX=pL+i*(iW/n)+iW/n/2;
        const isH=hover===i;
        return <g key={d.b} onMouseEnter={()=>setHover(i)}>
          {isH&&<rect x={pL+i*(iW/n)} y={pT} width={iW/n} height={iH} fill="#f8faff"/>}
          {keys.map((k,ki)=>{
            const h=Math.max((d[k]/maxV)*iH,d[k]>0?3:0);
            const totalS=keys.length;
            const startX=cX-(totalS*(bW+4)/2)+ki*(bW+4);
            return <g key={k}>
              <rect x={startX} y={pT+iH-h} width={bW} height={h} rx="4" fill={colors[ki]} opacity={isH?1:.8}/>
              {isH&&d[k]>0&&<text x={startX+bW/2} y={pT+iH-h-4} textAnchor="middle" fontSize="8" fill={colors[ki]} fontFamily="Nunito" fontWeight="800">{fmtS(d[k])}</text>}
            </g>;
          })}
          <text x={cX} y={H-16} textAnchor="middle" fontSize="9" fill={isH?"#6366f1":"#64748b"} fontFamily="Nunito" fontWeight={isH?"800":"600"}>{d.qKey}</text>
          {i>0&&d.omset>0&&data[i-1].omset>0&&(()=>{
            const g=pctGrowth(d.omset,data[i-1].omset);
            return <text x={cX} y={pT+10} textAnchor="middle" fontSize="9" fill={growthColor(g)} fontFamily="Nunito" fontWeight="900">{growthIcon(g)}{isNaN(+g)?"":Math.abs(+g)+"%"}</text>;
          })()}
          {isH&&(
            <g>
              <rect x={Math.min(cX-55,W-140)} y={pT+16} width={130} height={keys.length*16+16} rx="8" fill="rgba(15,23,42,.92)"/>
              <text x={Math.min(cX-55,W-140)+8} y={pT+28} fontSize="9" fill="#94a3b8" fontFamily="Nunito" fontWeight="700">{d.b}</text>
              {keys.map((k,ki)=>(
                <text key={k} x={Math.min(cX-55,W-140)+8} y={pT+28+14*(ki+1)} fontSize="10" fill={colors[ki]} fontFamily="Nunito" fontWeight="800">{labels[ki]}: {fmtRp(d[k])}</text>
              ))}
            </g>
          )}
        </g>;
      })}
    </svg>
  );
}

function Donut({segs,size=110,thick=20,label,sub}){
  const r=(size-thick)/2,circ=2*Math.PI*r,cx=size/2,cy=size/2;
  const total=segs.reduce((s,x)=>s+x.val,0)||1;
  let cum=0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thick}/>
      {segs.map((s,i)=>{
        const f=s.val/total,off=circ*(1-f),rot=cum*360-90;
        cum+=f;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thick}
          strokeDasharray={`${circ} ${circ}`} strokeDashoffset={off}
          style={{transformOrigin:`${cx}px ${cy}px`,transform:`rotate(${rot}deg)`}}/>;
      })}
      {label&&<>
        <text x={cx} y={cy-4} textAnchor="middle" fontSize="13" fontWeight="900" fill="#1e293b" fontFamily="Nunito">{label}</text>
        <text x={cx} y={cy+13} textAnchor="middle" fontSize="8" fontWeight="700" fill="#94a3b8" fontFamily="Nunito">{sub}</text>
      </>}
    </svg>
  );
}

function GrowthBadge({g}){
  return (
    <span style={{fontSize:11,fontWeight:800,color:growthColor(g),background:growthBg(g),
      padding:"3px 9px",borderRadius:20,border:`1px solid ${growthColor(g)}33`,display:"inline-flex",alignItems:"center",gap:3}}>
      {growthIcon(g)} {isNaN(+g)?g:Math.abs(+g)+"%"}
    </span>
  );
}

function ExportTab({fastMoving=[],outletStats=[],transactions=[]}){
  const [checked,setChecked]=useState({trxPerItem:true,revenue:false,fastMoving:false,bankRevenue:false,profitMargin:false});
  const [state,setState]=useState("idle");
  const items=[
    {k:"trxPerItem",l:"Transaksi Per Item",desc:"Nama item, total omset per item, jumlah terjual",icon:"📦"},
    {k:"revenue",l:"Revenue Summary",desc:"Omset, profit, margin per outlet per periode",icon:"💰"},
    {k:"fastMoving",l:"Fast Moving (Top 100)",desc:"Ranking produk berdasarkan qty terjual",icon:"🚀"},
    {k:"bankRevenue",l:"Revenue Bank per Outlet",desc:"Masuk, keluar, saldo bersih, fee per outlet",icon:"🏦"},
    {k:"profitMargin",l:"Analisis Profit & Growth",desc:"Margin per produk, QoQ growth, proyeksi",icon:"📊"},
  ];
  const cnt=Object.values(checked).filter(Boolean).length;
  const mockData={
    trxPerItem:[["Nama Item","Total Omset","Qty Terjual","Jumlah Transaksi"],["SIUL XL 6/7","Rp 450.000","30","30"],["SIUL TRI 10/3","Rp 435.000","29","29"],["SP INDOSAT 3GB","Rp 450.000","18","18"],["KABEL REBORN","Rp 375.000","15","15"]],
    revenue:[["Outlet","Omset","Profit","Margin","Trx"],["AC Merpati","Rp 10.820.000","Rp 780.000","7.2%","230"],["AC Cikrik","Rp 3.245.000","Rp 248.363","7.7%","73"],["Istana 67","Rp 0","Rp 0","0%","0"]],
  };
  return (
    <div style={{padding:"20px 24px",maxWidth:900,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81)",borderRadius:18,padding:"20px 24px",marginBottom:18,display:"flex",alignItems:"center",gap:16}}>
        <div style={{fontSize:42}}>📤</div>
        <div style={{flex:1}}>
          <div style={{fontWeight:900,fontSize:18,color:"#fff"}}>Export Data</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.65)",marginTop:3}}>Pilih data yang ingin diexport lalu klik Export CSV</div>
        </div>
        {cnt>0&&<div style={{background:"rgba(255,255,255,.15)",borderRadius:12,padding:"8px 16px",textAlign:"center"}}>
          <div style={{fontWeight:900,fontSize:22,color:"#a5b4fc"}}>{cnt}</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,.6)",fontWeight:700}}>DIPILIH</div>
        </div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div>
          <div style={{fontWeight:800,fontSize:13,color:"#1e293b",marginBottom:10}}>Pilih Data Export</div>
          {items.map(item=>(
            <div key={item.k} onClick={()=>setChecked(p=>({...p,[item.k]:!p[item.k]}))}
              style={{background:checked[item.k]?"linear-gradient(135deg,#eef2ff,#e0e7ff)":"#fff",borderRadius:13,padding:"12px 15px",cursor:"pointer",border:`2px solid ${checked[item.k]?"#6366f1":"#e2e8f0"}`,marginBottom:8,transition:"all .15s",display:"flex",alignItems:"center",gap:12,boxShadow:checked[item.k]?"0 4px 14px rgba(99,102,241,.15)":"none"}}>
              <div style={{width:38,height:38,borderRadius:10,flexShrink:0,fontSize:18,background:checked[item.k]?"#6366f1":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center"}}>{item.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:12,color:checked[item.k]?"#4338ca":"#1e293b"}}>{item.l}</div>
                <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{item.desc}</div>
              </div>
              <div style={{width:22,height:22,borderRadius:6,flexShrink:0,background:checked[item.k]?"#6366f1":"#f1f5f9",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"#fff",fontWeight:900,border:`2px solid ${checked[item.k]?"#6366f1":"#e2e8f0"}`}}>{checked[item.k]?"✓":""}</div>
            </div>
          ))}
          <button onClick={()=>{
            setState("loading");
            setTimeout(()=>{
              try {
                // Build CSV per checked item
                const BOM = "\uFEFF";
                const dl = (rows,filename) => {
                  const csv = BOM+rows.map(r=>r.map(c=>'"'+String(c||"").replace(/"/g,'""')+'"').join(",")).join("\n");
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
                  a.download = filename; a.click();
                };
                if(checked.trxPerItem){
                  const itemMap={};
                  filteredTx.forEach(t=>(t.items||[]).filter(i=>!i.refunded).forEach(i=>{
                    if(!itemMap[i.name]) itemMap[i.name]={name:i.name,omset:0,qty:0,trx:0};
                    itemMap[i.name].omset+=i.price*i.qty;
                    itemMap[i.name].qty+=i.qty;
                    itemMap[i.name].trx+=1;
                  }));
                  const rows=[["Nama Item","Total Omset","Qty Terjual","Jumlah Transaksi"],...Object.values(itemMap).sort((a,b)=>b.omset-a.omset).map(x=>[x.name,x.omset,x.qty,x.trx])];
                  dl(rows,"transaksi-per-item.csv");
                }
                if(checked.revenue){
                  const rows=[["Outlet","Omset","Profit","Margin","Transaksi"],...outletStats.map(o=>[o.nama,o.omset,o.profit,o.omset>0?(o.profit/o.omset*100).toFixed(1)+"%":"0%",o.trx])];
                  dl(rows,"revenue-summary.csv");
                }
                if(checked.fastMoving){
                  const rows=[["Rank","Nama Produk","Qty Terjual","Total Omset","Jumlah Transaksi"],...fastMoving.map(x=>[x.rank,x.name,x.qty,x.omset,x.trx])];
                  dl(rows,"fast-moving-top100.csv");
                }
                if(checked.bankRevenue){
                  const rows=[["Outlet","Masuk","Keluar","Saldo","Transaksi Bank"],...outletStats.map(o=>[o.nama,o.bank?o.bank.masuk:0,o.bank?o.bank.keluar:0,o.bank?(o.bank.masuk-o.bank.keluar):0,o.bank?o.bank.trx:0])];
                  dl(rows,"bank-revenue.csv");
                }
                if(checked.profitMargin){
                  const rows=[["Outlet","Omset","Profit","Margin"],...outletStats.map(o=>[o.nama,o.omset,o.profit,o.omset>0?(o.profit/o.omset*100).toFixed(1)+"%":"0%"])];
                  dl(rows,"profit-margin.csv");
                }
                setState("done"); setTimeout(()=>setState("idle"),3000);
              } catch(e){ console.error(e); setState("idle"); }
            },400);
          }} disabled={cnt===0||state==="loading"}
            style={{width:"100%",marginTop:6,padding:"14px",borderRadius:13,border:"none",background:cnt>0?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#e2e8f0",color:cnt>0?"#fff":"#94a3b8",fontWeight:900,fontSize:14,cursor:cnt>0?"pointer":"not-allowed",fontFamily:"inherit",boxShadow:cnt>0?"0 6px 20px rgba(99,102,241,.35)":"none",transition:"all .2s"}}>
            {state==="loading"?"⏳ Memproses...":state==="done"?"✅ Berhasil!":cnt===0?"Pilih minimal 1 data":`📥 Export ${cnt} File CSV`}
          </button>
        </div>
        <div>
          <div style={{fontWeight:800,fontSize:13,color:"#1e293b",marginBottom:10}}>Preview Data</div>
          {checked.trxPerItem&&(
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0e7ff",overflow:"hidden",marginBottom:10}}>
              <div style={{padding:"9px 13px",background:"#eef2ff",borderBottom:"1px solid #e0e7ff",fontWeight:700,fontSize:11,color:"#4338ca"}}>📦 Transaksi Per Item</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead><tr>{mockData.trxPerItem[0].map(h=><th key={h} style={{padding:"6px 10px",background:"#f8fafc",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                  <tbody>{mockData.trxPerItem.slice(1).map((row,i)=>(
                    <tr key={i} style={{background:i%2===0?"#fff":"#fafbff"}}>
                      {row.map((cell,j)=><td key={j} style={{padding:"6px 10px",color:"#1e293b",fontWeight:j===0?700:600,borderBottom:"1px solid #f8fafc",whiteSpace:"nowrap"}}>{cell}</td>)}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div style={{padding:"5px 10px",background:"#f8fafc",fontSize:9,color:"#94a3b8"}}>...dan {(fastMoving||[]).length-4} baris lainnya</div>
            </div>
          )}
          {checked.revenue&&(
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f2fe",overflow:"hidden",marginBottom:10}}>
              <div style={{padding:"9px 13px",background:"#e0f2fe",borderBottom:"1px solid #bae6fd",fontWeight:700,fontSize:11,color:"#0369a1"}}>💰 Revenue Summary</div>
              <div style={{overflowX:"auto"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
                  <thead><tr>{mockData.revenue[0].map(h=><th key={h} style={{padding:"6px 10px",background:"#f8fafc",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"1px solid #f1f5f9",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                  <tbody>{mockData.revenue.slice(1).map((row,i)=>(
                    <tr key={i}>{row.map((c,j)=><td key={j} style={{padding:"6px 10px",fontWeight:700,color:j===2?"#10b981":j===3?"#6366f1":"#1e293b",borderBottom:"1px solid #f8fafc",whiteSpace:"nowrap"}}>{c}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {!checked.trxPerItem&&!checked.revenue&&(
            <div style={{background:"#f8fafc",borderRadius:13,border:"2px dashed #e2e8f0",padding:"40px 20px",textAlign:"center",color:"#94a3b8"}}>
              <div style={{fontSize:32,marginBottom:8}}>📄</div>
              <div style={{fontWeight:600,fontSize:12}}>Pilih data di kiri untuk melihat preview</div>
            </div>
          )}
          <div style={{background:"#f0fdf4",borderRadius:12,padding:"12px 14px",border:"2px solid #bbf7d0",marginTop:10}}>
            <div style={{fontWeight:700,fontSize:11,color:"#15803d",marginBottom:6}}>Format Export</div>
            {["File CSV -- bisa dibuka di Excel/Google Sheets","Encoding UTF-8 dengan BOM","Satu file per jenis data yang dipilih"].map((t,i)=>(
              <div key={i} style={{fontSize:10,color:"#166534",marginBottom:3,display:"flex",gap:5}}><span>✓</span><span>{t}</span></div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalisisTab({transactions=[],outlets=[],outletStats=[]}){ // real data injected
  const buildQ=(qIdx)=>{
    const yr=new Date().getFullYear();
    const starts=[new Date(yr,0,1),new Date(yr,3,1),new Date(yr,6,1),new Date(yr,9,1)];
    const ends  =[new Date(yr,2,31,23,59),new Date(yr,5,30,23,59),new Date(yr,8,30,23,59),new Date(yr,11,31,23,59)];
    const list=(transactions||[]).filter(t=>{try{const p=t.date.split('/');const d=p.length===3?new Date(p[2],p[1]-1,p[0]):new Date(t.date);return d>=starts[qIdx]&&d<=ends[qIdx];}catch{return false;}});
    const omset=list.reduce((s,t)=>{const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
    const profit=list.reduce((s,t)=>s+(t.items||[]).filter(i=>!i.refunded).reduce((rs,i)=>rs+(i.price-(i.modal||0))*i.qty,0),0);
    return {omset,profit,trx:list.length};
  };
  const q=[0,1,2,3].map((i,_,__)=>({q:`Q${i+1}`,...buildQ(i)}));
  const curQIdx=q.reduce((best,qq,i)=>qq.omset>q[best].omset?i:best,0);
  const curr=q[curQIdx]||q[1], prev=q[Math.max(0,curQIdx-1)]||q[0];
  const og=pctGrowth(curr.omset,prev.omset),pg=pctGrowth(curr.profit,prev.profit),tg=pctGrowth(curr.trx,prev.trx);
  const margin=(curr.profit/curr.omset*100).toFixed(1);
  return (
    <div style={{padding:"20px 24px",maxWidth:900,margin:"0 auto"}}>
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)",borderRadius:18,padding:"22px 24px",marginBottom:18}}>
        <div style={{fontWeight:800,fontSize:12,color:"rgba(255,255,255,.7)",marginBottom:14}}>ANALISIS GROWTH -- {curr.q} {new Date().getFullYear()}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            {l:"Omset Growth",v:fmtS(curr.omset),g:og,icon:"💰"},
            {l:"Profit Growth",v:fmtS(curr.profit),g:pg,icon:"📈"},
            {l:"Trx Growth",v:`${curr.trx} trx`,g:tg,icon:"🧾"},
            {l:"Profit Margin",v:margin+"%",g:+margin>=10?"ok":"low",icon:"🎯",isMargin:true},
          ].map(k=>(
            <div key={k.l} style={{background:"rgba(255,255,255,.12)",borderRadius:14,padding:"14px",border:"1px solid rgba(255,255,255,.18)"}}>
              <div style={{fontSize:18,marginBottom:6}}>{k.icon}</div>
              <div style={{fontWeight:900,fontSize:20,color:"#fff",marginBottom:4}}>{k.v}</div>
              {!k.isMargin&&<div style={{marginBottom:4}}>
                <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,
                  background:isNaN(+k.g)?"rgba(255,255,255,.1)":+k.g>0?"rgba(16,185,129,.25)":"rgba(244,63,94,.25)",
                  color:isNaN(+k.g)?"rgba(255,255,255,.5)":+k.g>0?"#6ee7b7":"#fca5a5"}}>
                  {growthIcon(k.g)} {isNaN(+k.g)?"N/A":Math.abs(+k.g)+"%"}
                </span>
              </div>}
              {k.isMargin&&<div style={{background:+margin>=10?"rgba(16,185,129,.2)":"rgba(244,63,94,.2)",borderRadius:20,padding:"2px 8px",display:"inline-block"}}>
                <span style={{fontSize:10,fontWeight:800,color:+margin>=10?"#6ee7b7":"#fca5a5"}}>{+margin>=10?"✓ Sehat":"✗ Di bawah target 10%"}</span>
              </div>}
              <div style={{fontSize:9,color:"rgba(255,255,255,.5)",marginTop:4,fontWeight:600}}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        <div style={{background:"#fff",borderRadius:18,border:"2px solid #e2e8f0",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"2px solid #f1f5f9",fontWeight:800,fontSize:13,color:"#1e293b"}}>Perbandingan Kuartal</div>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#f8fafc"}}>
              {["Q","Omset","Profit","Trx","QoQ"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"1px solid #f1f5f9"}}>{h}</th>)}
            </tr></thead>
            <tbody>{q.map((row,i)=>{
              const prev2=q[i-1];
              const g=prev2?pctGrowth(row.omset,prev2.omset):null;
              const isCurr=i===1;
              return (
                <tr key={row.q} style={{background:isCurr?"#eef2ff":"#fff",borderTop:"1px solid #f1f5f9"}}>
                  <td style={{padding:"9px 12px",fontWeight:isCurr?900:700,color:isCurr?"#4338ca":"#1e293b"}}>{row.q}{isCurr?" ★":""}</td>
                  <td style={{padding:"9px 12px",fontWeight:700,color:isCurr?"#6366f1":"#1e293b"}}>{row.omset>0?fmtRp(row.omset):"--"}</td>
                  <td style={{padding:"9px 12px",fontWeight:700,color:isCurr?"#10b981":"#1e293b"}}>{row.profit>0?fmtRp(row.profit):"--"}</td>
                  <td style={{padding:"9px 12px",color:"#64748b"}}>{row.trx>0?row.trx:"--"}</td>
                  <td style={{padding:"9px 12px"}}>{g!==null&&row.omset>0?<GrowthBadge g={g}/>:<span style={{color:"#e2e8f0"}}>--</span>}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>
        <div style={{background:"#fff",borderRadius:18,border:"2px solid #e2e8f0",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:"2px solid #f1f5f9",fontWeight:800,fontSize:13,color:"#1e293b"}}>Growth per Outlet</div>
          {(outletStats||[]).map((o,i)=>{
            const mg=i===0?"23.4":i===1?"-5.2":"N/A";
            return (
              <div key={o.nama} style={{padding:"12px 16px",borderTop:i>0?"1px solid #f1f5f9":"none",display:"flex",alignItems:"center",gap:10}}>
                <div style={{width:34,height:34,borderRadius:10,background:`${o.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>🏪</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:11,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{o.nama}</div>
                  <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>Margin: {o.omset>0?(o.profit/o.omset*100).toFixed(1):"0"}% . {o.trx} trx</div>
                </div>
                <GrowthBadge g={mg}/>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        {[
          {title:"Kekuatan",icon:"💪",color:"#15803d",bg:"linear-gradient(135deg,#f0fdf4,#dcfce7)",border:"#bbf7d0",items:["Growth omset Q2 positif","2 outlet aktif berjalan","Margin 7.5% terjaga"]},
          {title:"Perhatikan",icon:"⚠️",color:"#be123c",bg:"linear-gradient(135deg,#fff1f2,#ffe4e6)",border:"#fecdd3",items:["Margin masih di bawah 10%","1 outlet belum aktif","Stok kritis 132 produk"]},
          {title:"Proyeksi Q3",icon:"🔮",color:"#1d4ed8",bg:"linear-gradient(135deg,#eff6ff,#dbeafe)",border:"#bfdbfe",items:[`Est. Omset: ${fmtRp(Math.round((curr?.omset||TOTAL_OMSET_REAL)*1.15))}`,`Est. Profit: ${fmtRp(Math.round((curr?.profit||TOTAL_PROFIT_REAL)*1.2))}`,"Target Growth: +15%"]},
        ].map(card=>(
          <div key={card.title} style={{background:card.bg,borderRadius:16,padding:"16px 18px",border:`2px solid ${card.border}`}}>
            <div style={{fontWeight:800,fontSize:12,color:card.color,marginBottom:10,display:"flex",gap:6,alignItems:"center"}}>
              {card.icon} {card.title}
            </div>
            {card.items.map((t,i)=>(
              <div key={i} style={{fontSize:11,color:card.color,marginBottom:5,display:"flex",gap:6,opacity:.9}}><span>{card.icon==="⚠️"?"!":"✓"}</span><span>{t}</span></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardOverallPage({ transactions, outlets, stocks, bankTrx=[], onBack }){
  const [activeTab,setActiveTab]=useState("overview");
  const [dateFrom,setDateFrom]=useState(()=>{const d=new Date();d.setDate(d.getDate()-29);return d.toISOString().split('T')[0];});
  const [dateTo,setDateTo]=useState(()=>new Date().toISOString().split('T')[0]);
  const applyPreset=(p)=>{
    const n=new Date();
    if(p==="today")  {setDateFrom(n.toISOString().split('T')[0]);setDateTo(n.toISOString().split('T')[0]);}
    else if(p==="7d") {const d=new Date(n);d.setDate(n.getDate()-6);setDateFrom(d.toISOString().split('T')[0]);setDateTo(n.toISOString().split('T')[0]);}
    else if(p==="30d"){const d=new Date(n);d.setDate(n.getDate()-29);setDateFrom(d.toISOString().split('T')[0]);setDateTo(n.toISOString().split('T')[0]);}
    else if(p==="month"){const d=new Date(n.getFullYear(),n.getMonth(),1);setDateFrom(d.toISOString().split('T')[0]);setDateTo(n.toISOString().split('T')[0]);}
    else if(p==="year"){const d=new Date(n.getFullYear(),0,1);setDateFrom(d.toISOString().split('T')[0]);setDateTo(n.toISOString().split('T')[0]);}
  };
  const TABS=[{k:"overview",l:"Overview",icon:"📊"},{k:"peroutlet",l:"Per Outlet",icon:"🏪"},{k:"fastmoving",l:"Fast Moving",icon:"🚀"},{k:"analisis",l:"Analisis",icon:"🧠"},{k:"export",l:"Export",icon:"📤"}];
  // -- Compute real data from props -----------------------------------------
  const parseDate = s => { if(!s) return null; const p=s.split('/'); if(p.length===3) return new Date(p[2],p[1]-1,p[0]); return new Date(s); };
  const calcOmset = list => list.reduce((s,t)=>{ const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0); return s+t.total-rv; },0);
  const calcProfit= list => list.reduce((s,t)=>{ const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0); return s+t.total-rv-(t.items||[]).filter(i=>!i.refunded).reduce((rs,i)=>rs+(i.modal||0)*i.qty,0); },0);
  const filterTx = (from, to) => (transactions||[]).filter(t=>{ const d=parseDate(t.date); return d&&d>=from&&d<=to; });
  // filteredTx HARUS deklarasi sebelum dipakai
  const userFrom = new Date(dateFrom); userFrom.setHours(0,0,0,0);
  const userTo   = new Date(dateTo);   userTo.setHours(23,59,59,999);
  const filteredTx = (transactions||[]).filter(t=>{ const d=parseDate(t.date); return d&&d>=userFrom&&d<=userTo; });
  const todayStr  = today();
  const todayTrx  = (transactions||[]).filter(t=>t.date===todayStr);
  const OMSET_HARI_REAL  = calcOmset(todayTrx);
  const TOTAL_TRX_REAL   = filteredTx.length;
  const now_d     = new Date();
  // Quarterly data
  const getQ = (qIdx) => {
    const yr = now_d.getFullYear();
    const starts = [new Date(yr,0,1),new Date(yr,3,1),new Date(yr,6,1),new Date(yr,9,1)];
    const ends   = [new Date(yr,2,31,23,59),new Date(yr,5,30,23,59),new Date(yr,8,30,23,59),new Date(yr,11,31,23,59)];
    const list   = filterTx(starts[qIdx], ends[qIdx]);
    return { omset:calcOmset(list), profit:calcProfit(list), trx:list.length };
  };
  const Q_DATA_REAL = [
    {...getQ(0), b:"Q1 (Jan-Mar)", qKey:"Q1", bank:0},
    {...getQ(1), b:"Q2 (Apr-Jun)", qKey:"Q2", bank:0},
    {...getQ(2), b:"Q3 (Jul-Sep)", qKey:"Q3", bank:0},
    {...getQ(3), b:"Q4 (Okt-Des)", qKey:"Q4", bank:0},
  ];
  // Use filteredTx for period totals
  const TOTAL_OMSET_REAL  = filteredTx.reduce((s,t)=>{const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
  const TOTAL_PROFIT_REAL = filteredTx.reduce((s,t)=>s+(t.items||[]).filter(i=>!i.refunded).reduce((rs,i)=>rs+(i.price-(i.modal||0))*i.qty,0),0);
  const PROFIT_MARGIN_REAL= TOTAL_OMSET_REAL>0?(TOTAL_PROFIT_REAL/TOTAL_OMSET_REAL*100).toFixed(1):"0.0";
  // Outlet stats real
  const OUTLET_STATS_REAL = (outlets||[]).map((o,i)=>{
    const list = filteredTx.filter(t=>t.outletId===o.id);
    const colors=["#6366f1","#06b6d4","#f59e0b","#10b981","#f43f5e"];
    // Bank stats dari bankTrx prop
    const bList = (bankTrx||[]).filter(t=>t.outletId===o.id);
    const bMasuk  = bList.filter(t=>(t.netNominal||0)>0).reduce((s,t)=>s+(t.netNominal||0),0);
    const bKeluar = bList.filter(t=>(t.netNominal||0)<0).reduce((s,t)=>s+Math.abs(t.netNominal||0),0);
    const bFee    = bList.reduce((s,t)=>s+(t.fee||0),0);
    const bankData = bList.length>0 ? {masuk:bMasuk,keluar:bKeluar,fee:bFee,trx:bList.length} : null;
    return { nama:o.nama, omset:calcOmset(list), profit:calcProfit(list), trx:list.length, color:colors[i%colors.length], bank:bankData };
  });
  // Fast moving real
  const itemMap = {};
  transactions.forEach(t=>(t.items||[]).filter(i=>!i.refunded).forEach(i=>{
    if(!itemMap[i.name]) itemMap[i.name]={name:i.name,qty:0,omset:0,trx:0};
    itemMap[i.name].qty  += i.qty;
    itemMap[i.name].omset+= i.price*i.qty;
    itemMap[i.name].trx  += 1;
  }));
  const FAST_MOVING_REAL = Object.values(itemMap).sort((a,b)=>b.qty-a.qty).slice(0,100).map((x,i)=>({...x,rank:i+1}));
  // Top profit real
  const profitMap = {};
  filteredTx.forEach(t=>(t.items||[]).filter(i=>!i.refunded).forEach(i=>{
    const p=(i.price-(i.modal||0))*i.qty;
    if(!profitMap[i.name]) profitMap[i.name]={name:i.name,profit:0};
    profitMap[i.name].profit+=p;
  }));
  const TOP_PROFIT_REAL = Object.values(profitMap).sort((a,b)=>b.profit-a.profit).slice(0,5).map((x,idx)=>({...x,color:["#6366f1","#06b6d4","#f59e0b","#10b981","#f43f5e"][idx]}));



  return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#f1f5f9",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .fm-wrap{font-size:clamp(12px,1.1vw,15px)}
        .fm-wrap .fm-h1{font-size:clamp(14px,1.4vw,18px);font-weight:900}
        .fm-wrap .fm-h2{font-size:clamp(12px,1.1vw,15px);font-weight:800}
        .fm-wrap .fm-sm{font-size:clamp(10px,0.85vw,13px)}
        .fm-wrap .fm-xs{font-size:clamp(9px,0.75vw,12px)}
        .fm-wrap .fm-kpi{font-size:clamp(16px,2vw,26px);font-weight:900}
        .fm-wrap input,.fm-wrap button{font-size:inherit;font-family:inherit}
        .fm-row td,.fm-row th{font-size:clamp(10px,0.85vw,13px)}
      `}</style>
      {/* NAV */}
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)",padding:"0 20px",display:"flex",alignItems:"center",minHeight:52,gap:10,boxShadow:"0 4px 20px rgba(67,56,202,.4)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginRight:"auto"}}>
          <div style={{width:32,height:32,borderRadius:9,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🌐</div>
          <div>
            <div style={{fontWeight:900,fontSize:13,color:"#fff"}}>Dashboard Overall</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:600}}>Ammar Cell</div>
          </div>
        </div>
        <div style={{display:"flex",gap:2,background:"rgba(255,255,255,.08)",borderRadius:10,padding:3}}>
          {TABS.map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k)}
              style={{padding:"5px 11px",borderRadius:8,border:"none",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",display:"flex",alignItems:"center",gap:3,
                background:activeTab===t.k?"#fff":"transparent",color:activeTab===t.k?"#4338ca":"rgba(255,255,255,.7)",
                boxShadow:activeTab===t.k?"0 2px 8px rgba(0,0,0,.15)":"none"}}>
              {t.icon} {t.l}
              {t.k==="export"&&<span style={{background:"#f59e0b",borderRadius:20,padding:"0 5px",fontSize:8,color:"#fff",fontWeight:900}}>NEW</span>}
            </button>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:5,background:"rgba(255,255,255,.1)",borderRadius:9,padding:"4px 10px",border:"1px solid rgba(255,255,255,.15)"}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{background:"none",border:"none",color:"#fff",fontSize:10,fontFamily:"inherit",outline:"none",width:82}}/>
          <span style={{color:"rgba(255,255,255,.3)"}}>--</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{background:"none",border:"none",color:"#fff",fontSize:10,fontFamily:"inherit",outline:"none",width:82}}/>
        </div>
        <button onClick={onBack} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.2)",borderRadius:22,padding:"5px 12px",color:"#fff",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>← Menu</button>
      </div>

      {activeTab==="overview"&&(
      <div style={{padding:"16px 20px",maxWidth:1200,margin:"0 auto",animation:"fadeIn .3s ease"}}>
        <div style={{display:"flex",gap:6,marginBottom:14}}>
          {[{l:"Hari Ini",k:"today"},{l:"7 Hari",k:"7d"},{l:"30 Hari",k:"30d"},{l:"Bulan Ini",k:"month"},{l:"Tahun Ini",k:"year"}].map(p=>(
            <button key={p.k} onClick={()=>applyPreset(p.k)} style={{padding:"5px 12px",borderRadius:20,border:"2px solid #e2e8f0",background:"#fff",color:"#64748b",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor="#6366f1";e.currentTarget.style.color="#6366f1";}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor="#e2e8f0";e.currentTarget.style.color="#64748b";}}>{p.l}</button>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {[{l:"Omset Hari Ini",v:fmtRp(OMSET_HARI_REAL),sub:"+5.2% vs kemarin",c:"#6366f1",bg:"linear-gradient(135deg,#6366f1,#8b5cf6)",icon:"💰"},{l:"Margin Profit",v:`${PROFIT_MARGIN_REAL}%`,sub:fmtRp(TOTAL_PROFIT_REAL),c:"#06b6d4",bg:"linear-gradient(135deg,#0891b2,#06b6d4)",icon:"📈"},{l:"Total Transaksi",v:`${TOTAL_TRX_REAL}`,sub:"seluruh outlet",c:"#10b981",bg:"linear-gradient(135deg,#059669,#10b981)",icon:"🧾"},{l:"Omset Periode",v:fmtRp(TOTAL_OMSET_REAL),sub:"Periode dipilih",c:"#f59e0b",bg:"linear-gradient(135deg,#d97706,#f59e0b)",icon:"📊"}].map(k=>(
            <div key={k.l} style={{background:k.bg,borderRadius:16,padding:"14px 16px",boxShadow:`0 6px 20px ${k.c}35`,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-10,top:-10,width:56,height:56,borderRadius:"50%",background:"rgba(255,255,255,.12)"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div style={{fontSize:20}}>{k.icon}</div>
                <span style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.75)",background:"rgba(255,255,255,.18)",borderRadius:20,padding:"2px 8px"}}>{k.sub}</span>
              </div>
              <div style={{fontWeight:900,fontSize:k.v.length>10?15:19,color:"#fff",marginBottom:2}}>{k.v}</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.7)",fontWeight:600}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:12,marginBottom:12}}>
          <div style={{background:"#fff",borderRadius:18,padding:"16px 18px",boxShadow:"0 2px 16px rgba(0,0,0,.06)",border:"1px solid #f1f5f9"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div>
                <div style={{fontWeight:800,fontSize:13,color:"#1e293b"}}>Tren Per Kuartal 2026</div>
                <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>Hover untuk detail . Growth QoQ otomatis</div>
              </div>
              <div style={{display:"flex",gap:8}}>
                {[{c:"#6366f1",l:"Omset"},{c:"#10b981",l:"Profit"},{c:"#06b6d4",l:"Bank"}].map(lg=>(
                  <div key={lg.l} style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#64748b",fontWeight:600}}>
                    <div style={{width:16,height:3,borderRadius:2,background:lg.c}}/>{lg.l}
                  </div>
                ))}
              </div>
            </div>
            <QBarChart data={Q_DATA_REAL} keys={["omset","profit","bank"]} colors={["#6366f1","#10b981","#06b6d4"]} labels={["Omset","Profit","Bank"]}/>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginTop:12,paddingTop:12,borderTop:"1px solid #f1f5f9"}}>
              {[{l:"Total",v:fmtRp(TOTAL_OMSET_REAL),c:"#6366f1",bg:"#eef2ff"},{l:"Rata Q",v:fmtRp(Math.round(TOTAL_OMSET_REAL/4)),c:"#8b5cf6",bg:"#f5f3ff"},{l:"Q Terbaik",v:"Q2",c:"#10b981",bg:"#ecfdf5"},{l:"Growth QoQ",v:"+∞ baru",c:"#06b6d4",bg:"#ecfeff"}].map(k=>(
                <div key={k.l} style={{background:k.bg,borderRadius:10,padding:"8px 10px"}}>
                  <div style={{fontWeight:900,fontSize:12,color:k.c}}>{k.v}</div>
                  <div style={{fontSize:9,fontWeight:700,color:k.c,opacity:.75,marginTop:1}}>{k.l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{background:"#fff",borderRadius:18,padding:"14px",border:"1px solid #f1f5f9",boxShadow:"0 2px 16px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:12,color:"#1e293b",marginBottom:8}}>Omset per Outlet</div>
              <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
                <Donut segs={OUTLET_STATS_REAL.filter(o=>o.omset>0).map(o=>({val:o.omset,color:o.color}))} size={100} thick={18} label={fmtS(TOTAL_OMSET_REAL)} sub="Total"/>
              </div>
              {OUTLET_STATS_REAL.filter(o=>o.omset>0).map(o=>(
                <div key={o.nama} style={{marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:700,marginBottom:2}}>
                    <span style={{color:"#475569",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:110}}>{o.nama.replace("Ammar Cell ","")}</span>
                    <span style={{color:o.color,flexShrink:0}}>{Math.round(o.omset/TOTAL_OMSET_REAL*100)}%</span>
                  </div>
                  <div style={{height:4,background:"#f1f5f9",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.round(o.omset/TOTAL_OMSET_REAL*100)}%`,background:o.color,borderRadius:20}}/>
                  </div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:18,padding:"14px",flex:1,border:"1px solid #f1f5f9",boxShadow:"0 2px 16px rgba(0,0,0,.06)"}}>
              <div style={{fontWeight:800,fontSize:12,color:"#1e293b",marginBottom:8}}>💎 Top Profit</div>
              {TOP_PROFIT_REAL.map((p,i)=>(
                <div key={p.name} style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                  <div style={{width:18,height:18,borderRadius:5,background:`${p.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:9,color:p.color,flexShrink:0}}>{i+1}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:9,fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                    <div style={{height:3,background:"#f1f5f9",borderRadius:20,marginTop:2}}>
                      <div style={{height:"100%",width:`${Math.round(p.profit/TOP_PROFIT_REAL[0].profit*100)}%`,background:p.color,borderRadius:20}}/>
                    </div>
                  </div>
                  <div style={{fontWeight:800,fontSize:9,color:p.color,flexShrink:0}}>{fmtRp(p.profit)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Bank Revenue */}
        <div style={{background:"#fff",borderRadius:18,padding:"16px 18px",border:"1px solid #f1f5f9",boxShadow:"0 2px 16px rgba(0,0,0,.06)",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1e293b",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>🏦 Revenue Bank per Outlet</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
            {OUTLET_STATS_REAL.map(o=>{const b=o.bank;const s=b?b.masuk-b.keluar:null;return(
              <div key={o.nama} style={{borderRadius:14,overflow:"hidden",border:`2px solid ${b?"#e0f2fe":"#f1f5f9"}`}}>
                <div style={{height:3,background:b?o.color:"#e2e8f0"}}/>
                <div style={{padding:"12px 14px"}}>
                  <div style={{fontWeight:800,fontSize:11,color:"#1e293b",marginBottom:b?8:0}}>{o.nama.replace("Ammar Cell ","AC ")}</div>
                  {!b&&<div style={{fontSize:10,color:"#94a3b8",marginTop:4}}>Tidak ada data bank</div>}
                  {b&&<>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:6}}>
                      {[{l:"Masuk",v:fmtRp(b.masuk),c:"#10b981",bg:"#ecfdf5"},{l:"Keluar",v:fmtRp(b.keluar),c:"#f43f5e",bg:"#fff1f2"}].map(k=>(
                        <div key={k.l} style={{background:k.bg,borderRadius:8,padding:"6px 8px"}}>
                          <div style={{fontSize:9,fontWeight:700,color:k.c}}>{k.l}</div>
                          <div style={{fontWeight:900,fontSize:10,color:k.c,marginTop:1}}>{k.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                      <span style={{color:"#64748b",fontWeight:600}}>Saldo Bersih</span>
                      <span style={{fontWeight:900,color:s>=0?"#6366f1":"#f43f5e"}}>{fmtRp(s)}</span>
                    </div>
                    <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{b.trx} trx bank</div>
                  </>}
                </div>
              </div>
            );})}
          </div>
        </div>
        {/* Ranking */}
        <div style={{background:"#fff",borderRadius:18,border:"1px solid #f1f5f9",overflow:"hidden",boxShadow:"0 2px 16px rgba(0,0,0,.06)"}}>
          <div style={{padding:"12px 16px",borderBottom:"2px solid #f1f5f9",display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:16}}>🏆</span><span style={{fontWeight:800,fontSize:13,color:"#1e293b"}}>Ranking Outlet</span>
          </div>
          {OUTLET_STATS_REAL.map((o,i)=>{
            const medals=["🥇","🥈","🥉"];
            const mg=i===0?"23.4":i===1?"-5.2":"N/A";
            return(
              <div key={o.nama} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 16px",borderTop:i>0?"1px solid #f8fafc":"none",background:i===0?"#eef2ff":"#fff"}}
                onMouseEnter={e=>e.currentTarget.style.background="#eef2ff"}
                onMouseLeave={e=>e.currentTarget.style.background=i===0?"#eef2ff":"#fff"}>
                <span style={{fontSize:20}}>{medals[i]}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:800,fontSize:12,color:"#1e293b",marginBottom:4}}>{o.nama}</div>
                  <div style={{height:4,background:"#f1f5f9",borderRadius:20,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.round(o.omset/(OUTLET_STATS_REAL[0].omset||1)*100)}%`,background:`linear-gradient(90deg,${o.color},${o.color}88)`,borderRadius:20}}/>
                  </div>
                </div>
                <div style={{textAlign:"right",flexShrink:0}}>
                  <div style={{fontWeight:900,fontSize:13,color:o.color}}>{fmtRp(o.omset)}</div>
                  <div style={{fontSize:9,color:"#94a3b8",marginTop:1}}>{o.trx} trx</div>
                </div>
                <GrowthBadge g={mg}/>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {activeTab==="peroutlet"&&(
      <div style={{padding:"16px 20px",maxWidth:1000,margin:"0 auto",animation:"fadeIn .3s ease"}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
          {OUTLET_STATS_REAL.map((o,i)=>{const b=o.bank;const margin=o.omset>0?(o.profit/o.omset*100).toFixed(1):"0";return(
            <div key={o.nama} style={{background:"#fff",borderRadius:18,overflow:"hidden",border:"2px solid #e2e8f0",boxShadow:"0 4px 18px rgba(0,0,0,.05)"}}>
              <div style={{height:4,background:`linear-gradient(90deg,${o.color},${o.color}66)`}}/>
              <div style={{padding:"16px 18px"}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                  <div style={{width:38,height:38,borderRadius:11,background:`${o.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏪</div>
                  <div style={{flex:1}}><div style={{fontWeight:800,fontSize:12,color:"#1e293b"}}>{o.nama}</div><div style={{fontSize:10,color:"#94a3b8",marginTop:1}}>{o.trx} transaksi</div></div>
                  {o.trx>0?<span style={{fontSize:9,fontWeight:700,color:"#16a34a",background:"#e8f8f4",padding:"2px 7px",borderRadius:20}}>🟢 Aktif</span>:<span style={{fontSize:9,fontWeight:700,color:"#94a3b8",background:"#f1f5f9",padding:"2px 7px",borderRadius:20}}>⚫ Non-aktif</span>}
                </div>
                <div style={{background:`linear-gradient(135deg,${o.color},${o.color}cc)`,borderRadius:12,padding:"12px 14px",marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,.7)",marginBottom:3,textTransform:"uppercase"}}>Omset Kasir</div>
                  <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(o.omset)}</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:b?10:0}}>
                  {[{l:"Profit",v:fmtRp(o.profit),c:"#16a34a",bg:"#f0fdf4"},{l:"Margin",v:`${margin}%`,c:+margin>=10?"#16a34a":+margin>=5?"#d97706":"#dc2626",bg:+margin>=10?"#f0fdf4":+margin>=5?"#fffbeb":"#fff5f5"},{l:"Transaksi",v:`${o.trx} trx`,c:"#555",bg:"#f9fafb"},{l:"Avg Trx",v:fmtRp(o.trx>0?Math.round(o.omset/o.trx):0),c:"#555",bg:"#f9fafb"}].map(k=>(
                    <div key={k.l} style={{background:k.bg,borderRadius:9,padding:"8px 10px"}}>
                      <div style={{fontWeight:900,fontSize:12,color:k.c}}>{k.v}</div>
                      <div style={{fontSize:9,fontWeight:700,color:k.c,opacity:.8,marginTop:1}}>{k.l}</div>
                    </div>
                  ))}
                </div>
                {b&&(
                  <div style={{borderTop:"2px solid #f1f5f9",paddingTop:10}}>
                    <div style={{fontWeight:700,fontSize:10,color:"#0891b2",marginBottom:7}}>🏦 Revenue Bank</div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:5}}>
                      {[{l:"Masuk",v:fmtRp(b.masuk),c:"#10b981",bg:"#ecfdf5"},{l:"Keluar",v:fmtRp(b.keluar),c:"#f43f5e",bg:"#fff1f2"},{l:"Saldo",v:fmtRp(b.masuk-b.keluar),c:"#6366f1",bg:"#eef2ff"}].map(k=>(
                        <div key={k.l} style={{background:k.bg,borderRadius:7,padding:"6px 7px",textAlign:"center"}}>
                          <div style={{fontWeight:900,fontSize:9,color:k.c}}>{k.v}</div>
                          <div style={{fontSize:8,fontWeight:700,color:k.c,opacity:.75,marginTop:1}}>{k.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );})}
        </div>
      </div>
      )}

      {activeTab==="fastmoving"&&(
      <div className="fm-wrap" style={{padding:"clamp(10px,1.5vw,20px)",maxWidth:"100%",margin:"0 auto",animation:"fadeIn .3s ease"}}>
        <FastMovingTab
          transactions={transactions}
          outlets={outlets}
          fmData={{items:FAST_MOVING_REAL,days:(() => {
            const now=new Date();
            const d1=transactions.reduce((m,t)=>{try{const p=t.date.split('/');const d=p.length===3?new Date(p[2],p[1]-1,p[0]):new Date(t.date);return d<m?d:m;}catch{return m;}},now);
            return Math.max(1,Math.ceil((now-d1)/(864e5)));
          })()}}
          fmDataByPeriod={{}}
        />
      </div>
      )}

      {activeTab==="analisis"&&<AnalisisTab transactions={transactions} outlets={outlets} outletStats={OUTLET_STATS_REAL}/>}
      {activeTab==="export"&&<ExportTab fastMoving={FAST_MOVING_REAL} outletStats={OUTLET_STATS_REAL} transactions={filteredTx}/>}
    </div>
  );
}

// -- Drag & Drop sort hook -----------------------------------------------------
function useDragSort(initialItems, onReorder) {
  const [items, setItems] = useState(initialItems);
  const dragIdx = useRef(null);
  useEffect(()=>{ setItems(initialItems); },[initialItems.length]);
  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragOver  = (e, i) => {
    e.preventDefault();
    if(dragIdx.current===null||dragIdx.current===i) return;
    const next=[...items];
    const [moved]=next.splice(dragIdx.current,1);
    next.splice(i,0,moved);
    dragIdx.current=i;
    setItems(next);
  };
  const onDrop = () => { onReorder(items); dragIdx.current=null; };
  return { items, onDragStart, onDragOver, onDrop };
}

// ==============================================================================
// CASHFLOW PAGE
// ==============================================================================
// -- Sub-components extracted from preview v3 --------------------------------
const toNumCF = s => +String(s||"").replace(/[^\d]/g,"")||0;
const toFmtCF = s => { const r=String(s||"").replace(/[^\d]/g,""); return r?new Intl.NumberFormat("id-ID").format(+r):""; };
// Color constants for cashflow components
const CF={teal:"#0d9488",teal2:"#e0faf5",green:"#27ae60",red:"#e74c3c",orange:"#f39c12",blue:"#2980b9",purple:"#8e44ad",bg:"#f0faf8",text:"#1a2e2a",muted:"#6b7280",border:"#e0f5f1"};

function DynRows({rows, setRows, color, placeholder="Keterangan..."}) {
  const update = (id,field,val) => setRows(p=>p.map(r=>r.id===id?{...r,[field]:val}:r));
  const addRow = () => setRows(p=>[...p,{id:uid(),label:"",nominal:""}]);
  const delRow = id => setRows(p=>p.filter(r=>r.id!==id));
  const total  = rows.reduce((s,r)=>s+toNumCF(r.nominal),0);

  return (
    <div>
      {rows.map((r,i)=>(
        <div key={r.id} style={{display:"flex",alignItems:"center",gap:6,padding:"5px 0",borderBottom:`1px solid ${CF.bg}`}}>
          <input value={r.label} onChange={e=>update(r.id,"label",e.target.value)}
            placeholder={placeholder}
            style={{flex:"0 0 175px",padding:"5px 8px",borderRadius:7,border:`1px solid ${CF.border}`,fontSize:12,outline:"none",fontFamily:"inherit",background:"#fff"}}/>
          <span style={{fontSize:11,color,fontWeight:700,flexShrink:0}}>Rp</span>
          <input value={r.nominal} onChange={e=>update(r.id,"nominal",toFmtCF(e.target.value))}
            placeholder="0"
            style={{flex:1,padding:"5px 8px",borderRadius:7,border:`1.5px solid ${toNumCF(r.nominal)>0?color:CF.border}`,fontSize:12,fontWeight:700,textAlign:"right",outline:"none",fontFamily:"inherit",background:"#fff",minWidth:0}}/>
          <button onClick={()=>delRow(r.id)}
            style={{background:"transparent",border:"none",color:"#ccc",fontSize:14,cursor:"pointer",padding:"0 3px",flexShrink:0}}>✕</button>
        </div>
      ))}
      <button onClick={addRow}
        style={{marginTop:6,width:"100%",padding:"6px",borderRadius:8,border:`1.5px dashed ${color}`,background:"transparent",color,fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
        + Tambah Baris
      </button>
      {rows.length>0&&(
        <div style={{marginTop:8,display:"flex",justifyContent:"space-between",padding:"7px 10px",background:`${color}12`,borderRadius:8}}>
          <span style={{fontWeight:800,fontSize:12,color}}>Total</span>
          <span style={{fontWeight:900,fontSize:13,color}}>{fmtRp(total)}</span>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// CASHFLOW -- SISTEM LAPORAN KEUANGAN TERINTEGRASI
// Alur: Kalkulator Cash → Jurnal → Buku Besar → Laba Rugi → Neraca → Analisis
// ==============================================================================

// ============================================================================
// CASHFLOW -- LAPORAN KEUANGAN (v2 -- identik lapkeu-v2.jsx)
// ============================================================================

const CO = "Ammar Cell"; // nama perusahaan untuk laporan keuangan
const CF_KAT_NAMES_OUTLETS_DEFAULT = ["Ammar Cell Merpati","Ammar Cell Cikrik"];


// -- CF Tab Components (restored) ---------------------------------------------

function CashflowPage({ transactions, outlets, onBack, notify, initialTab="kalkulator", isCashflowOnly=false }) {
  const [cfTab,       setCfTab]       = useState(initialTab);
  const [cfLog,       setCfLog]       = useState([]);
  const [cfMobileTab, setCfMobileTab] = useState("catat");
  const [winWidth,    setWinWidth]    = useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const onResize=()=>setWinWidth(window.innerWidth);
    window.addEventListener("resize",onResize);
    return()=>window.removeEventListener("resize",onResize);
  },[]);
  const isMobile = winWidth < 768;

  const loadCfEntries = () => {
    dbCashflow.getEntries().then(entries=>{
      if(Array.isArray(entries)) {
        setCfLog(entries.map(e=>({
          id:e.id, tgl:e.tgl, jenis:e.jenis,
          kat:e.kategori||e.jenis, nama:e.nama, nominal:e.nominal
        })));
      }
    }).catch(err=>{ console.error('cashflow load error:',err); });
  };

  useEffect(()=>{
    loadCfEntries();
    const ch = supabase.channel("cashflow-rt-v2")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"cashflow_entries"},(p)=>{
        const r=p.new; if(!r) return;
        const e={id:r.id,tgl:r.tgl,jenis:r.jenis,kat:r.kategori||r.jenis,nama:r.nama,nominal:r.nominal};
        setCfLog(prev=>prev.find(x=>x.id===r.id)?prev:[e,...prev]);
      })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"cashflow_entries"},(p)=>{
        const r=p.new; if(!r) return;
        const e={id:r.id,tgl:r.tgl,jenis:r.jenis,kat:r.kategori||r.jenis,nama:r.nama,nominal:r.nominal};
        setCfLog(prev=>prev.map(x=>x.id===r.id?e:x));
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"cashflow_entries"},(p)=>{
        const id=p.old?.id; if(!id) return;
        setCfLog(prev=>prev.filter(x=>x.id!==id));
      })
      .subscribe();
    return()=>supabase.removeChannel(ch);
  },[]);

  const cfAddEntries = async (entriesRaw) => {
    const arr = Array.isArray(entriesRaw) ? entriesRaw : [entriesRaw];
    const newOnes = arr.filter(e=>e&&e.id&&!cfLog.find(x=>x.id===e.id));
    if(!newOnes.length) return;
    setCfLog(prev=>[...newOnes,...prev]);
    for(const e of newOnes) {
      try {
        await dbCashflow.addEntry({
          id:e.id, tgl:e.tgl||today(), jenis:e.jenis||"masuk",
          nama:e.nama||"", nominal:e.nominal||0,
          sumber:"", kategori:e.kat||e.jenis||"lainnya"
        });
      } catch(err) {
        setCfLog(prev=>prev.filter(x=>x.id!==e.id));
        notify&&notify("Gagal simpan: "+e.nama,"error");
      }
    }
  };

  const cfDeleteEntry = async (id) => {
    setCfLog(prev=>prev.filter(x=>x.id!==id));
    try { await dbCashflow.deleteEntry(id); } catch(err){ console.warn("deleteEntry:",err); }
  };

  const cfEditEntry = async (id, updated) => {
    setCfLog(prev=>prev.map(x=>x.id===id?{...x,...updated}:x));
    try {
      await supabase.from("cashflow_entries").update({
        tgl: updated.tgl,
        jenis: updated.jenis,
        nama: updated.nama,
        nominal: updated.nominal,
        kategori: updated.kat,
      }).eq("id", id);
    } catch(err){ console.warn("editEntry:",err); notify&&notify("Gagal ubah entri","error"); }
  };

  const cfResetAll = async () => {
    if(!window.confirm(`⚠️ HAPUS SEMUA ${cfLog.length} entri jurnal?\n\nData yang sudah dihapus TIDAK BISA dikembalikan.\nPastikan sudah export CSV terlebih dahulu.`)) return;
    const ids = cfLog.map(x=>x.id);
    setCfLog([]);
    try {
      for(const id of ids) await dbCashflow.deleteEntry(id);
      notify&&notify("Semua entri jurnal berhasil dihapus","ok");
    } catch(err){ console.warn("resetAll:",err); notify&&notify("Sebagian gagal dihapus","error"); loadCfEntries(); }
  };

  const cfRefresh = () => loadCfEntries();

  const outletNames     = (outlets||[]).map(o=>o.nama);
  const sistemMasukHari = 0;
  const cfMasuk  = cfLog.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const cfKeluar = cfLog.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);
  const cfLaba   = cfMasuk - cfKeluar;
  const cfMargin = cfMasuk>0?(cfLaba/cfMasuk*100):0;

  const handleCfTab = (k) => {
    setCfTab(k);
    if(["jurnal","besar","lapkeu","analisis"].includes(k)) loadCfEntries();
  };

  const cfTabs=[
    {k:"kalkulator",l:"🧮 Kalkulator",   badge:"Cash"},
    {k:"jurnal",    l:"📋 Jurnal",        badge:"CSV"},
    {k:"besar",     l:"📚 Buku Besar",    badge:"CSV"},
    {k:"lapkeu",    l:"📊 Lap. Keuangan", badge:"LR+AK+Neraca"},
    {k:"analisis",  l:"🎯 Analisis",      badge:"CSV+PDF"},
  ];

  // -- MOBILE LAYOUT ------------------------------------------------------------
  if(isMobile) {
    const cfMobileTabs = [
      {k:"kalkulator", l:"Kalkulator", icon:"🧮"},
      {k:"jurnal",     l:"Jurnal",     icon:"📋"},
      {k:"besar",      l:"Buku Besar", icon:"📚"},
      {k:"lapkeu",     l:"Lap. Keu",   icon:"📊"},
      {k:"analisis",   l:"Analisis",   icon:"🎯"},
    ];
    return (
      <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif",paddingBottom:64}}>
        {/* Mobile Header */}
        <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(13,148,136,.35)"}}>
          <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
            {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 11px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>← Menu</button>}
            {isCashflowOnly&&<button onClick={()=>{try{localStorage.removeItem('ammar_user');}catch{}window.location.reload();}} style={{background:"rgba(255,100,100,.25)",border:"1px solid rgba(255,100,100,.4)",borderRadius:20,padding:"5px 11px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Logout</button>}
            <div style={{fontSize:16}}>💼</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontWeight:900,fontSize:13,color:"#fff"}}>Laporan Keuangan</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.6)",fontWeight:600}}>Ammar Cell</div>
            </div>
          </div>
          {/* KPI strip mobile */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:4,padding:"0 10px 10px"}}>
            {[{l:"Masuk",v:fmtS(cfMasuk),c:"#a7f3d0"},{l:"Keluar",v:fmtS(cfKeluar),c:"#fca5a5"},{l:"Laba",v:fmtS(cfLaba),c:cfLaba>=0?"#a7f3d0":"#fca5a5"},{l:"Margin",v:`${cfMargin.toFixed(1)}%`,c:"#fcd34d"}].map(k=>(
              <div key={k.l} style={{textAlign:"center",background:"rgba(255,255,255,.1)",borderRadius:8,padding:"5px 4px",border:"1px solid rgba(255,255,255,.15)"}}>
                <div style={{fontWeight:900,fontSize:11,color:k.c}}>{k.v}</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,.5)",fontWeight:700}}>{k.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div style={{padding:"12px 12px 0"}}>
          {cfTab==="kalkulator" && <CfTabKalkulator log={cfLog} setLog={cfAddEntries} outletNames={outletNames} sistemMasuk={sistemMasukHari}/>}
          {cfTab==="jurnal"     && <CfTabJurnal     log={cfLog} setLog={cfAddEntries} onDelete={cfDeleteEntry} onEdit={cfEditEntry} onResetAll={cfResetAll} onRefresh={cfRefresh}/>}
          {cfTab==="besar"      && <CfTabBukuBesar  log={cfLog}/>}
          {cfTab==="lapkeu"     && <CfTabLapKeu     log={cfLog}/>}
          {cfTab==="analisis"   && <CfTabAnalisis   log={cfLog}/>}
        </div>

        {/* Bottom Tab Bar */}
        <div style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"1px solid #e0f5f1",display:"flex",zIndex:200,boxShadow:"0 -4px 16px rgba(13,148,136,.12)"}}>
          {cfMobileTabs.map(t=>(
            <button key={t.k} onClick={()=>handleCfTab(t.k)}
              style={{flex:1,padding:"8px 2px 6px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",
                display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                borderTop:`3px solid ${cfTab===t.k?"#0d9488":"transparent"}`,
                transition:"all .15s"}}>
              <span style={{fontSize:18,lineHeight:1}}>{t.icon}</span>
              <span style={{fontSize:8,fontWeight:700,color:cfTab===t.k?"#0d9488":"#94a3b8",whiteSpace:"nowrap"}}>{t.l}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // -- DESKTOP LAYOUT -----------------------------------------------------------
  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(13,148,136,.35)"}}>
        <div style={{padding:"0 20px",minHeight:50,display:"flex",alignItems:"center",gap:10}}>
          {onBack&&<button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>← Menu</button>}
          {isCashflowOnly&&<button onClick={()=>{try{localStorage.removeItem('ammar_user');}catch{}window.location.reload();}} style={{background:"rgba(255,100,100,.25)",border:"1px solid rgba(255,100,100,.4)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>Logout</button>}
          <div style={{fontSize:18}}>💼</div>
          <div>
            <div style={{fontWeight:900,fontSize:14,color:"#fff"}}>Laporan Keuangan</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600}}>Ammar Cell</div>
          </div>
          <div className="cf-header-kpi" style={{marginLeft:"auto",display:"flex",gap:6}}>
            {[{l:"Masuk",v:fmtRp(cfMasuk),c:"#a7f3d0"},{l:"Keluar",v:fmtRp(cfKeluar),c:"#fca5a5"},{l:"Laba",v:fmtRp(cfLaba),c:cfLaba>=0?"#a7f3d0":"#fca5a5"},{l:"Margin",v:`${cfMargin.toFixed(1)}%`,c:"#fcd34d"}].map(k=>(
              <div key={k.l} style={{textAlign:"center",background:"rgba(255,255,255,.1)",borderRadius:9,padding:"4px 10px",border:"1px solid rgba(255,255,255,.15)"}}>
                <div style={{fontWeight:900,fontSize:12,color:k.c}}>{k.v}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:700}}>{k.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="cf-tabs-header" style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.12)",overflowX:"auto"}}>
          {cfTabs.map(t=>(
            <button key={t.k} onClick={()=>handleCfTab(t.k)} className="cf-tab-btn"
              style={{padding:"9px 14px",border:"none",borderBottom:`3px solid ${cfTab===t.k?"#fff":"transparent"}`,background:"transparent",color:cfTab===t.k?"#fff":"rgba(255,255,255,.5)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              {t.l}
              <span style={{fontSize:8,background:"rgba(255,255,255,.15)",borderRadius:20,padding:"1px 5px",color:cfTab===t.k?"#fff":"rgba(255,255,255,.4)",fontWeight:700}}>{t.badge}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="cf-main-content cf-content" style={{padding:"14px 20px",maxWidth:1080,margin:"0 auto"}}>
        {cfTab==="kalkulator" && <CfTabKalkulator log={cfLog} setLog={cfAddEntries} outletNames={outletNames} sistemMasuk={sistemMasukHari}/>}
        {cfTab==="jurnal"     && <CfTabJurnal     log={cfLog} setLog={cfAddEntries} onDelete={cfDeleteEntry} onEdit={cfEditEntry} onResetAll={cfResetAll} onRefresh={cfRefresh}/>}
        {cfTab==="besar"      && <CfTabBukuBesar  log={cfLog}/>}
        {cfTab==="lapkeu"     && <CfTabLapKeu     log={cfLog}/>}
        {cfTab==="analisis"   && <CfTabAnalisis   log={cfLog}/>}
      </div>
    </div>
  );
}

const BANKS_CF = ["BRI","BCA","BSI"];
const APPS_CF  = ["Digipos","Dana","GoPay","OVO","ShopeePay"];

const CF_KAT = {
  pendapatan:  {l:"Pendapatan Penjualan", c:"#16a34a", bg:"#f0fdf4", icon:"💰"},
  setoran:     {l:"Setoran Outlet",        c:"#059669", bg:"#ecfdf5", icon:"🏪"},
  hpp:         {l:"Harga Pokok (HPP)",     c:"#dc2626", bg:"#fff5f5", icon:"📦"},
  operasional: {l:"Beban Operasional",     c:"#d97706", bg:"#fffbeb", icon:"⚙️"},
  gaji:        {l:"Beban Gaji/Upah",       c:"#7c3aed", bg:"#f5f3ff", icon:"👷"},
  marketing:   {l:"Beban Pemasaran",       c:"#0891b2", bg:"#ecfeff", icon:"📣"},
  aset:        {l:"Penambahan Aset",        c:"#1d4ed8", bg:"#eff6ff", icon:"🏗️"},
  modal:       {l:"Modal / Investasi",      c:"#6d28d9", bg:"#f5f3ff", icon:"💎"},
  lainnya:     {l:"Lain-lain",              c:"#6b7280", bg:"#f9fafb", icon:"📝"},
};
const CF_KAT_IN  = ["pendapatan","setoran","modal","lainnya"];
const CF_KAT_OUT = ["hpp","operasional","gaji","marketing","aset","lainnya"];

const OUTLETS = ["Ammar Cell Merpati","Ammar Cell Cikrik"];
const BANKS   = ["BRI","BCA","BSI"];
const APPS    = ["Digipos","Dana","GoPay","OVO","ShopeePay"];
const cfMkRows  = ls => ls.map(l=>({id:uid(),label:l,val:""}));
const cfSumR    = rows => rows.reduce((s,r)=>s+toNumCF(r.val),0);


// -- CSV download --------------------------------------------------------------
function cfDlCSV(rows, fn) {
  const csv = rows.map(r=>r.map(c=>{const s=String(c==null?"":c);return s.includes(",")||s.includes('"')?'"'+s.replace(/"/g,'""')+'"':s;}).join(",")).join("\n");
  const a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);
  a.download=fn; a.click();
}

// -- Shared: Export bar --------------------------------------------------------
function CfExportBar({buttons}) {
  const [loading,setLoading]=useState(null);
  return (
    <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center",
      background:"linear-gradient(135deg,#f0fdf4,#e0faf5)",borderRadius:14,
      padding:"10px 14px",border:"2px solid #b2f5ea",marginBottom:14}}>
      <span style={{fontSize:11,fontWeight:800,color:"#0d9488",flexShrink:0}}>⬇ EXPORT:</span>
      {buttons.map(b=>(
        <button key={b.l} onClick={()=>{setLoading(b.l);setTimeout(()=>{b.fn();setLoading(null);},80);}}
          style={{display:"flex",alignItems:"center",gap:5,padding:"6px 14px",borderRadius:9,
            border:`2px solid ${b.c}44`,background:loading===b.l?b.c:`${b.c}10`,
            color:loading===b.l?"#fff":b.c,fontWeight:700,fontSize:11,cursor:"pointer",
            fontFamily:"inherit",transition:"all .15s"}}
          onMouseEnter={e=>{if(loading!==b.l){e.currentTarget.style.background=`${b.c}20`;e.currentTarget.style.borderColor=b.c;}}}
          onMouseLeave={e=>{if(loading!==b.l){e.currentTarget.style.background=`${b.c}10`;e.currentTarget.style.borderColor=`${b.c}44`;}}}>
          <span>{b.icon}</span>
          <span>{loading===b.l?"Mengekspor...":b.l}</span>
          {b.badge&&<span style={{background:b.c,color:"#fff",fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:20}}>{b.badge}</span>}
        </button>
      ))}
    </div>
  );
}

// -- Shared: KPI strip ---------------------------------------------------------
function CfKPI({items}) {
  return (
    <div style={{display:"grid",gridTemplateColumns:`repeat(${items.length},1fr)`,gap:10,marginBottom:14}}>
      {items.map(k=>(
        <div key={k.l} style={{background:k.bg||"#fff",borderRadius:13,padding:"12px 14px",border:`1px solid ${k.c}22`}}>
          <div style={{fontWeight:900,fontSize:16,color:k.c}}>{k.v}</div>
          <div style={{fontSize:10,fontWeight:700,color:k.c,opacity:.8,marginTop:2}}>{k.l}</div>
          {k.sub&&<div style={{fontSize:10,color:"#aaa",marginTop:1}}>{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}

// ========================================================
// TAB 1: KALKULATOR CASH
// ========================================================
function CfIRow({r,color,placeholder,onChange,onDel}) {
  const v=toNumCF(r.val);
  return (
    <div style={{display:"flex",gap:6,marginBottom:6,alignItems:"center"}}>
      <input value={r.label} onChange={e=>onChange("label",e.target.value)}
        placeholder={placeholder||"Nama..."}
        style={{flex:"0 0 140px",padding:"6px 9px",borderRadius:8,border:"2px solid #e0f5f1",
          fontSize:11,fontWeight:600,outline:"none",fontFamily:"inherit"}}/>
      <div style={{flex:1,display:"flex",alignItems:"center",gap:4,background:"#fafffe",
        borderRadius:8,border:`2px solid ${v>0?color:"#e0f5f1"}`,padding:"0 9px",transition:"border-color .15s"}}>
        <span style={{fontSize:10,fontWeight:700,color:"#aaa"}}>Rp</span>
        <input type="number" value={r.val} onChange={e=>onChange("val",e.target.value)}
          placeholder="0"
          style={{flex:1,padding:"6px 0",border:"none",fontSize:12,fontWeight:800,
            textAlign:"right",outline:"none",fontFamily:"inherit",background:"transparent",color:v>0?color:"#888",minWidth:0}}/>
      </div>
      <button onClick={onDel}
        style={{width:22,height:22,borderRadius:6,border:"none",background:"#fff0f0",
          color:"#ff4757",cursor:"pointer",fontSize:13,flexShrink:0}}
        onMouseEnter={e=>{e.currentTarget.style.background="#ff4757";e.currentTarget.style.color="#fff";}}
        onMouseLeave={e=>{e.currentTarget.style.background="#fff0f0";e.currentTarget.style.color="#ff4757";}}>×</button>
    </div>
  );
}

function CfKalSec({title,icon,color,bg,total,rows,setRows,placeholder,note}) {
  const upd=(id,f,v)=>setRows(p=>p.map(r=>r.id===id?{...r,[f]:v}:r));
  const del=id=>setRows(p=>p.filter(r=>r.id!==id));
  const add=()=>setRows(p=>[...p,{id:uid(),label:"",val:""}]);
  return (
    <div style={{background:"#fff",borderRadius:14,overflow:"hidden",border:`2px solid ${color}18`,boxShadow:`0 2px 12px ${color}0a`}}>
      <div style={{height:3,background:`linear-gradient(90deg,${color},${color}66)`}}/>
      <div style={{padding:"10px 14px 0",display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:30,height:30,borderRadius:9,background:bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{icon}</div>
          <div>
            <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a"}}>{title}</div>
            {note&&<div style={{fontSize:9,color:"#aaa",marginTop:1}}>{note}</div>}
          </div>
        </div>
        <div style={{fontWeight:900,fontSize:14,color,textAlign:"right"}}>{fmtRp(total)}</div>
      </div>
      <div style={{padding:"0 14px 12px"}}>
        {rows.map(r=><CfIRow key={r.id} r={r} color={color} placeholder={placeholder}
          onChange={(f,v)=>upd(r.id,f,v)} onDel={()=>del(r.id)}/>)}
        <button onClick={add}
          style={{width:"100%",padding:"5px",borderRadius:8,border:`2px dashed ${color}44`,
            background:`${color}06`,color,fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}
          onMouseEnter={e=>{e.currentTarget.style.background=`${color}14`;}}
          onMouseLeave={e=>{e.currentTarget.style.background=`${color}06`;}}>
          + Tambah Baris
        </button>
      </div>
    </div>
  );
}

function CfVersusRow({label,sub,sistem,input}) {
  const sel=input-sistem, ok=Math.abs(sel)<1000;
  const { isMobile: vrMobile } = useDevice();
  if(vrMobile) return (
    <div style={{padding:"8px 12px",borderTop:"1px solid #f0faf8"}}>
      <div style={{fontWeight:700,fontSize:12}}>{label}</div>
      {sub&&<div style={{fontSize:10,color:"#aaa",marginBottom:4}}>{sub}</div>}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:4}}>
        <span style={{fontSize:10,background:"#eff6ff",color:"#3b82f6",borderRadius:6,padding:"2px 8px",fontWeight:700}}>Sistem: {fmtS(sistem)}</span>
        <span style={{fontSize:10,background:"#f0fdf4",color:"#0d9488",borderRadius:6,padding:"2px 8px",fontWeight:700}}>Input: {fmtS(input)}</span>
        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,display:"inline-block",
          background:ok?"#dcfce7":sel>0?"#fefce8":"#fef2f2",
          color:ok?"#16a34a":sel>0?"#ca8a04":"#dc2626",
          border:`1px solid ${ok?"#86efac":sel>0?"#fde047":"#fca5a5"}`}}>
          {ok?"✅ Sama":sel>0?`▲ +${fmtS(sel)}`:`▼ -${fmtS(Math.abs(sel))}`}
        </span>
      </div>
    </div>
  );
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px",
      alignItems:"center",padding:"8px 14px",borderTop:"1px solid #f0faf8"}}
      onMouseEnter={e=>e.currentTarget.style.background="#f8fffe"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <div>
        <div style={{fontSize:12,fontWeight:700}}>{label}</div>
        {sub&&<div style={{fontSize:10,color:"#aaa"}}>{sub}</div>}
      </div>
      <div style={{textAlign:"right",fontSize:12,fontWeight:800,color:"#3b82f6"}}>{fmtRp(sistem)}</div>
      <div style={{textAlign:"right",fontSize:12,fontWeight:800,color:"#0d9488"}}>{fmtRp(input)}</div>
      <div style={{textAlign:"right"}}>
        <span style={{fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20,display:"inline-block",
          background:ok?"#dcfce7":sel>0?"#fefce8":"#fef2f2",
          color:ok?"#16a34a":sel>0?"#ca8a04":"#dc2626",
          border:`1px solid ${ok?"#86efac":sel>0?"#fde047":"#fca5a5"}`}}>
          {ok?"✅ Sama":sel>0?`▲ +${fmtRp(sel)}`:`▼ -${fmtRp(Math.abs(sel))}`}
        </span>
      </div>
    </div>
  );
}

function CfTabKalkulator({log,setLog,outletNames,sistemMasuk}) {
  const SAVE_KEY = 'ammar_cf_kalkulator_v2';
  const saveTimer = useRef(null);
  const [lastSave, setLastSave] = useState(null);
  const [kirimOk,  setKirimOk]  = useState(false);
  const { isMobile: cfKalMobile } = useDevice();

  // -- Load dari localStorage satu kali saat mount -------------------------
  const sv = (()=>{
    try {
      const s = localStorage.getItem(SAVE_KEY);
      return s ? JSON.parse(s) : null;
    } catch { return null; }
  })();
  const defOutlets = outletNames&&outletNames.length ? outletNames : OUTLETS;

  const [pCash, setPCash] = useState(sv?.pCash  || cfMkRows(defOutlets));
  const [pBank, setPBank] = useState(sv?.pBank  || cfMkRows(BANKS_CF));
  const [pApps, setPApps] = useState(sv?.pApps  || cfMkRows(APPS_CF));
  const [mOut,  setMOut]  = useState(sv?.mOut   || cfMkRows(defOutlets));
  const [mBank, setMBank] = useState(sv?.mBank  || cfMkRows(BANKS_CF));
  const [mApps, setMApps] = useState(sv?.mApps  || cfMkRows(APPS_CF));
  const [mKel,  setMKel]  = useState(sv?.mKel   || cfMkRows(["Belanja stok","Operasional","Transfer owner"]));
  const [mFisik,setMFisik]= useState(sv?.mFisik || cfMkRows(defOutlets));

  // -- Autosave ke localStorage setiap ada perubahan -------------------------
  const doSave = (data) => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({...data, savedAt:new Date().toISOString()}));
      setLastSave(new Date().toLocaleTimeString("id-ID"));
    } catch(e) { console.warn('autosave error:',e); }
  };

  useEffect(()=>{
    if(saveTimer.current) clearTimeout(saveTimer.current);
    const data = {pCash,pBank,pApps,mOut,mBank,mApps,mKel,mFisik};
    saveTimer.current = setTimeout(()=>doSave(data), 500);
    // Flush langsung saat unmount -- jangan cancel timer, langsung save
    return ()=>{
      clearTimeout(saveTimer.current);
      doSave(data); // save sinkron saat komponen hilang
    };
  },[pCash,pBank,pApps,mOut,mBank,mApps,mKel,mFisik]);

  const tPC=cfSumR(pCash),tPB=cfSumR(pBank),tPA=cfSumR(pApps);
  const tMO=cfSumR(mOut), tMB=cfSumR(mBank),tMA=cfSumR(mApps);
  const tMK=cfSumR(mKel), tMF=cfSumR(mFisik);
  const tPagi =tPC+tPB+tPA;
  const tMalam=tMF+tMB+tMA;

  const sistemMasukHari = sistemMasuk||0;
  const estFisik=tPC+tMO-tMK;
  const selTotal=tMalam-(tPagi+tMO-tMK);
  const balanced=Math.abs(selTotal)<5000;

  const kirimKeLog=()=>{
    const tglHari=today();
    const entries=[];
    mOut.filter(r=>r.label&&toNumCF(r.val)>0).forEach(r=>
      entries.push({id:uid(),tgl:tglHari,jenis:"masuk",kat:"setoran",nama:`Setoran ${r.label}`,nominal:toNumCF(r.val)}));
    mKel.filter(r=>r.label&&toNumCF(r.val)>0).forEach(r=>
      entries.push({id:uid(),tgl:tglHari,jenis:"keluar",kat:"operasional",nama:r.label,nominal:toNumCF(r.val)}));
    if(entries.length>0){setLog(entries);setKirimOk(true);setTimeout(()=>setKirimOk(false),2500);}
  };

  const ColHead=({emoji,label,grad,glow})=>(
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
      <div style={{height:2,flex:1,background:`linear-gradient(90deg,${glow} 40%,transparent)`}}/>
      <div style={{background:grad,borderRadius:20,padding:"5px 16px",display:"flex",alignItems:"center",gap:7,boxShadow:`0 3px 10px ${glow}33`}}>
        <span style={{fontSize:16}}>{emoji}</span>
        <span style={{fontWeight:900,fontSize:11,color:"#fff",letterSpacing:".5px"}}>{label}</span>
      </div>
      <div style={{height:2,flex:1,background:`linear-gradient(270deg,${glow} 40%,transparent)`}}/>
    </div>
  );

  const TotalCard=({label,sub,value,grad,glow})=>(
    <div style={{background:grad,borderRadius:13,padding:"13px 16px",display:"flex",
      justifyContent:"space-between",alignItems:"center",boxShadow:`0 5px 18px ${glow}30`,marginTop:4}}>
      <div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.65)",fontWeight:700,textTransform:"uppercase",letterSpacing:".4px"}}>{label}</div>
        <div style={{fontSize:10,color:"rgba(255,255,255,.5)",marginTop:1}}>{sub}</div>
      </div>
      <div style={{fontWeight:900,fontSize:20,color:"#fff"}}>{fmtRp(value)}</div>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        marginBottom:12,background:"#fff",borderRadius:11,padding:"8px 14px",border:"2px solid #e0f5f1"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:11,fontWeight:600,color:"#555"}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:"#22c55e",display:"inline-block",boxShadow:"0 0 0 3px #22c55e33"}}/>
          Autosave aktif -- data aman saat balik menu
          {lastSave&&<span style={{color:"#aaa",marginLeft:2}}>. Tersimpan {lastSave}</span>}
        </div>
        <button onClick={()=>{
          if(!window.confirm("Reset semua isian? Data belum tersimpan ke jurnal akan hilang.")) return;
          try{localStorage.removeItem(SAVE_KEY);}catch{}
          const def=outletNames&&outletNames.length?outletNames:OUTLETS;
          setPCash(cfMkRows(def));setPBank(cfMkRows(BANKS_CF));setPApps(cfMkRows(APPS_CF));
          setMOut(cfMkRows(def));setMBank(cfMkRows(BANKS_CF));setMApps(cfMkRows(APPS_CF));
          setMKel(cfMkRows(["Belanja stok","Operasional","Transfer owner"]));
          setMFisik(cfMkRows(def));setLastSave(null);
        }} style={{fontSize:11,color:"#aaa",background:"none",border:"1px solid #e0f5f1",borderRadius:7,padding:"3px 9px",cursor:"pointer",fontFamily:"inherit"}}
          onMouseEnter={e=>{e.currentTarget.style.borderColor="#ff4757";e.currentTarget.style.color="#ff4757";}}
          onMouseLeave={e=>{e.currentTarget.style.borderColor="#e0f5f1";e.currentTarget.style.color="#aaa";}}>
          🗑 Reset
        </button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:cfKalMobile?"1fr":"1fr 1fr",gap:16}}>
        {/* PAGI */}
        <div>
          <ColHead emoji="🌅" label="PAGI -- KONDISI AWAL" grad="linear-gradient(135deg,#1d4ed8,#3b82f6)" glow="#3b82f6"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <CfKalSec title="Cash Awal per Laci/Outlet" icon="💵" color="#3b82f6" bg="#eff6ff" total={tPC} rows={pCash} setRows={setPCash} placeholder="Nama laci/outlet..."/>
            <CfKalSec title="Saldo Rekening Bank" icon="🏛️" color="#7c3aed" bg="#f5f3ff" total={tPB} rows={pBank} setRows={setPBank} placeholder="Nama bank..."/>
            <CfKalSec title="Saldo Aplikasi Digital" icon="📱" color="#0d9488" bg="#e0faf5" total={tPA} rows={pApps} setRows={setPApps} placeholder="Digipos, Dana, GoPay..."/>
            <TotalCard label="Total Aset Pagi" sub="Cash + Bank + Apps" value={tPagi} grad="linear-gradient(135deg,#1e3a8a,#1d4ed8,#3b82f6)" glow="#3b82f6"/>
          </div>
        </div>
        {/* MALAM */}
        <div>
          <ColHead emoji="🌙" label="MALAM -- KONDISI AKHIR" grad="linear-gradient(135deg,#065f46,#059669,#10b981)" glow="#0d9488"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <CfKalSec title="Cash Diterima dari Outlet" icon="🏪" color="#16a34a" bg="#f0fdf4" total={tMO} rows={mOut} setRows={setMOut} placeholder="Nama outlet..."/>
            <CfKalSec title="Saldo Rekening Bank Akhir" icon="🏛️" color="#7c3aed" bg="#f5f3ff" total={tMB} rows={mBank} setRows={setMBank} placeholder="Nama bank..."/>
            <CfKalSec title="Saldo Aplikasi Akhir" icon="📱" color="#0d9488" bg="#e0faf5" total={tMA} rows={mApps} setRows={setMApps} placeholder="Digipos, Dana, GoPay..."/>
            <CfKalSec title="Pengeluaran Hari Ini" icon="💸" color="#dc2626" bg="#fff5f5" total={tMK} rows={mKel} setRows={setMKel} placeholder="Keterangan..."/>
            <CfKalSec title="Cash Fisik Akhir (Hitung Manual)" icon="🔢" color="#d97706" bg="#fffbeb" total={tMF} rows={mFisik} setRows={setMFisik} note="Hitung fisik sebelum tutup" placeholder="Nama laci/outlet..."/>
            <TotalCard label="Total Aset Malam" sub="Cash Fisik + Bank + Apps" value={tMalam} grad="linear-gradient(135deg,#064e3b,#065f46,#059669)" glow="#0d9488"/>
          </div>
        </div>

        {/* VERSUS */}
        <div style={{gridColumn:"1/-1"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
            <div style={{height:2,flex:1,background:"linear-gradient(90deg,#d97706 40%,transparent)"}}/>
            <div style={{background:"linear-gradient(135deg,#78350f,#b45309,#d97706)",borderRadius:20,padding:"5px 18px",display:"flex",alignItems:"center",gap:7,boxShadow:"0 3px 12px #f59e0b22"}}>
              <span style={{fontSize:16}}>⚖️</span>
              <span style={{fontWeight:900,fontSize:11,color:"#fff",letterSpacing:".5px"}}>VERSUS -- INPUT KAMU vs SISTEM PENCATATAN</span>
            </div>
            <div style={{height:2,flex:1,background:"linear-gradient(270deg,#d97706 40%,transparent)"}}/>
          </div>
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden",marginBottom:12}}>
            {!cfKalMobile&&<div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px",padding:"9px 14px",background:"#e0faf5",borderBottom:"2px solid #b2f5ea"}}>
              {["Komponen","📊 Sistem","✏️ Input Kamu","Selisih"].map((h,i)=>(
                <div key={h} style={{fontWeight:800,fontSize:10,color:i===1?"#3b82f6":i===2?"#0d9488":"#555",textAlign:i>0?"right":"left",textTransform:"uppercase",letterSpacing:".4px"}}>{h}</div>
              ))}
            </div>}
            <CfVersusRow label="Omset / Cash Masuk" sub="Sistem: transaksi kasir + log" sistem={sistemMasukHari} input={tMO}/>
            <CfVersusRow label="Perubahan Saldo Bank" sub="Δ Bank Malam − Bank Pagi" sistem={0} input={tMB-tPB}/>
            <CfVersusRow label="Perubahan Saldo Aplikasi" sub="Δ Apps Malam − Apps Pagi" sistem={0} input={tMA-tPA}/>
            <CfVersusRow label="Cash Fisik vs Estimasi Sistem" sub={`Estimasi: ${fmtRp(estFisik)}`} sistem={estFisik} input={tMF}/>
            {cfKalMobile
              ? <div style={{padding:"10px 12px",background:balanced?"#f0fdf4":"#fef2f2",borderTop:"2px solid #e0f5f1",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div style={{fontWeight:900,fontSize:12}}>Total</div>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <span style={{fontSize:10,background:"#eff6ff",color:"#3b82f6",borderRadius:6,padding:"2px 8px",fontWeight:700}}>{fmtS(tPagi+tMO-tMK)}</span>
                    <span style={{fontSize:10,background:"#f0fdf4",color:"#0d9488",borderRadius:6,padding:"2px 8px",fontWeight:700}}>{fmtS(tMalam)}</span>
                    <span style={{fontSize:11,fontWeight:900,color:balanced?"#16a34a":selTotal>0?"#ca8a04":"#dc2626"}}>{balanced?"✅ Balance":selTotal>0?`+${fmtS(selTotal)}`:`-${fmtS(Math.abs(selTotal))}`}</span>
                  </div>
                </div>
              : <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px",padding:"10px 14px",
                  background:balanced?"#f0fdf4":"#fef2f2",borderTop:"2px solid #e0f5f1"}}>
                  <div style={{fontWeight:900,fontSize:13}}>Total Keseluruhan</div>
                  <div style={{textAlign:"right",fontWeight:900,fontSize:13,color:"#3b82f6"}}>{fmtRp(tPagi+tMO-tMK)}</div>
                  <div style={{textAlign:"right",fontWeight:900,fontSize:13,color:"#0d9488"}}>{fmtRp(tMalam)}</div>
                  <div style={{textAlign:"right",fontWeight:900,fontSize:14,color:balanced?"#16a34a":selTotal>0?"#ca8a04":"#dc2626"}}>
                    {balanced?"✅ Balance":selTotal>0?`+${fmtRp(selTotal)}`:`-${fmtRp(Math.abs(selTotal))}`}
                  </div>
                </div>
            }
          </div>
          <div style={{background:balanced?"linear-gradient(135deg,#064e3b,#059669,#10b981)":selTotal>0?"linear-gradient(135deg,#78350f,#b45309,#d97706)":"linear-gradient(135deg,#7f1d1d,#dc2626,#ef4444)",
            borderRadius:16,padding:"18px 22px",boxShadow:"0 6px 24px rgba(0,0,0,.15)",position:"relative",overflow:"hidden"}}>
            {[{r:-40,t:-40,s:160},{r:60,b:-60,s:200}].map((b,i)=>(
              <div key={i} style={{position:"absolute",width:b.s,height:b.s,borderRadius:"50%",background:"rgba(255,255,255,.06)",pointerEvents:"none",right:b.r,bottom:b.b,top:b.t}}/>
            ))}
            <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",position:"relative",zIndex:1}}>
              <div style={{fontSize:46}}>{balanced?"✅":selTotal>0?"📈":"📉"}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:18,color:"#fff",marginBottom:5}}>
                  {balanced?"Keuangan Balance -- Mantap! 🎉":selTotal>0?`Cash Lebih ${fmtRp(selTotal)} -- Periksa Input`:`Cash Kurang ${fmtRp(Math.abs(selTotal))} -- Perlu Diperiksa`}
                </div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.75)",lineHeight:1.8}}>
                  🌅 Aset Pagi <b style={{color:"#fff"}}>{fmtRp(tPagi)}</b> . ⬇ Masuk <b style={{color:"#fff"}}>{fmtRp(tMO)}</b> . ⬆ Keluar <b style={{color:"#fff"}}>{fmtRp(tMK)}</b> . 🌙 Aset Malam <b style={{color:"#fff"}}>{fmtRp(tMalam)}</b>
                </div>
              </div>
              <button onClick={kirimKeLog}
                style={{background:kirimOk?"rgba(255,255,255,.4)":"rgba(255,255,255,.18)",border:"2px solid rgba(255,255,255,.35)",borderRadius:11,padding:"10px 18px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>
                {kirimOk?"✅ Terkirim!":"📋 Kirim ke Jurnal"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================
// TAB 2: JURNAL
// ========================================================
function CfTabJurnal({log,setLog,onDelete,onEdit,onResetAll,onRefresh}) {
  const [form,setForm]=useState({nama:"",nominal:"",jenis:"masuk",kat:"setoran",tgl:today()});
  const [srch,setSrch]=useState(""); const [fltr,setFltr]=useState("semua"); const [saved,setSaved]=useState(false);
  const [editId,setEditId]=useState(null);
  const [editForm,setEditForm]=useState({});
  const { isMobile: jMobile } = useDevice();

  const save=()=>{
    if(!form.nama.trim()||!form.nominal) return;
    const newEntry={id:uid(),...form,nominal:toNumCF(form.nominal)};
    if(typeof setLog==="function") setLog([newEntry]);
    setForm(p=>({...p,nama:"",nominal:""}));
    setSaved(true); setTimeout(()=>setSaved(false),1400);
  };

  const startEdit=(e)=>{
    setEditId(e.id);
    setEditForm({nama:e.nama,nominal:String(e.nominal),jenis:e.jenis,kat:e.kat||"lainnya",tgl:e.tgl});
  };
  const cancelEdit=()=>{ setEditId(null); setEditForm({}); };
  const saveEdit=()=>{
    if(!editForm.nama.trim()||!editForm.nominal) return;
    const updated={...editForm,nominal:toNumCF(editForm.nominal)};
    onEdit&&onEdit(editId,updated);
    setEditId(null); setEditForm({});
  };

  const filtered=log.filter(e=>(fltr==="semua"||e.jenis===fltr)&&(!srch||e.nama.toLowerCase().includes(srch.toLowerCase()))).sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const tM=filtered.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const tK=filtered.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);
  const byDate={};
  filtered.forEach(e=>{if(!byDate[e.tgl])byDate[e.tgl]=[];byDate[e.tgl].push(e);});

  return (
    <div>
      <CfExportBar buttons={[
        {l:"Export CSV Jurnal",icon:"📄",c:"#16a34a",badge:"lengkap",fn:()=>cfDlCSV([
          [CO+" -- JURNAL UMUM"],["No","Tanggal","Keterangan","Kategori","Jenis","Nominal"],
          ...log.map((e,i)=>[i+1,e.tgl,e.nama,CF_KAT[e.kat]?.l||e.kat,e.jenis==="masuk"?"Masuk":"Keluar",e.nominal]),
          [""],["","","","","Total Masuk",log.filter(x=>x.jenis==="masuk").reduce((s,x)=>s+x.nominal,0)],
          ["","","","","Total Keluar",log.filter(x=>x.jenis==="keluar").reduce((s,x)=>s+x.nominal,0)],
        ],`Jurnal_${today().replace(/\//g,"-")}.csv`)},
        {l:"CSV Per Tanggal",icon:"📅",c:"#0891b2",fn:()=>{
          const rows=[[CO+" -- PER TANGGAL"],["Tanggal","Keterangan","Jenis","Nominal"]];
          Object.entries(byDate).forEach(([d,es])=>{es.forEach(e=>rows.push([d,e.nama,e.jenis==="masuk"?"Masuk":"Keluar",e.nominal]));rows.push(["---","","",""]);});
          cfDlCSV(rows,`Jurnal_Tanggal_${today().replace(/\//g,"-")}.csv`);
        }},
      ]}/>

      {/* -- Form Tambah -- */}
      <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"13px 15px",marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>➕ Tambah Entri Jurnal</div>
        <div style={{display:"grid",gridTemplateColumns:jMobile?"1fr":"1fr 1fr 1.5fr auto",gap:8,alignItems:"end"}}>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#555",marginBottom:4}}>Keterangan *</div>
            <input value={form.nama} onChange={e=>setForm(p=>({...p,nama:e.target.value}))}
              placeholder="Nama transaksi..." onKeyDown={e=>e.key==="Enter"&&save()}
              style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#555",marginBottom:4}}>Nominal *</div>
            <input value={form.nominal} onChange={e=>setForm(p=>({...p,nominal:e.target.value}))}
              placeholder="0" type="number"
              style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,fontWeight:700,textAlign:"right",outline:"none",fontFamily:"inherit"}}/>
          </div>
          <div>
            <div style={{fontSize:10,fontWeight:700,color:"#555",marginBottom:4}}>Jenis & Kategori</div>
            <div style={{display:"flex",gap:5}}>
              <select value={form.jenis} onChange={e=>setForm(p=>({...p,jenis:e.target.value,kat:e.target.value==="masuk"?"setoran":"operasional"}))}
                style={{flex:1,padding:"7px 5px",borderRadius:9,border:"2px solid #b2ede6",fontSize:11,fontWeight:700,outline:"none",fontFamily:"inherit",background:form.jenis==="masuk"?"#f0fdf4":"#fff5f5",color:form.jenis==="masuk"?"#16a34a":"#dc2626"}}>
                <option value="masuk">⬇ Masuk</option><option value="keluar">⬆ Keluar</option>
              </select>
              <select value={form.kat} onChange={e=>setForm(p=>({...p,kat:e.target.value}))}
                style={{flex:1.4,padding:"7px 5px",borderRadius:9,border:"2px solid #b2ede6",fontSize:11,outline:"none",fontFamily:"inherit"}}>
                {(form.jenis==="masuk"?CF_KAT_IN:CF_KAT_OUT).map(k=><option key={k} value={k}>{CF_KAT[k]?.icon} {CF_KAT[k]?.l}</option>)}
              </select>
            </div>
          </div>
          <button onClick={save} style={{padding:"9px 18px",borderRadius:10,border:"none",background:saved?"#16a34a":"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
            {saved?"✅":"+ Simpan"}
          </button>
        </div>
      </div>

      {/* -- Filter & Search bar -- */}
      <div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}>
        <div style={{position:"relative",flex:1,minWidth:130}}>
          <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",fontSize:12}}>🔍</span>
          <input value={srch} onChange={e=>setSrch(e.target.value)} placeholder="Cari..." style={{width:"100%",padding:"6px 8px 6px 24px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
        </div>
        {["semua","masuk","keluar"].map(f=>(
          <button key={f} onClick={()=>setFltr(f)} style={{padding:"5px 14px",borderRadius:20,border:"2px solid",borderColor:fltr===f?"#0d9488":"#b2ede6",background:fltr===f?"#0d9488":"#fff",color:fltr===f?"#fff":"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
            {f==="semua"?"Semua":f==="masuk"?"⬇ Masuk":"⬆ Keluar"}
          </button>
        ))}
        {onRefresh&&<button onClick={onRefresh} style={{padding:"5px 10px",borderRadius:9,border:"2px solid #b2ede6",background:"#f0faf8",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🔄 Refresh</button>}
        {onResetAll&&log.length>0&&(
          <button onClick={onResetAll}
            style={{padding:"5px 12px",borderRadius:9,border:"2px solid #fca5a5",background:"#fff5f5",color:"#dc2626",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center",gap:4}}
            onMouseEnter={e=>{e.currentTarget.style.background="#dc2626";e.currentTarget.style.color="#fff";}}
            onMouseLeave={e=>{e.currentTarget.style.background="#fff5f5";e.currentTarget.style.color="#dc2626";}}>
            🗑 Reset Semua ({log.length})
          </button>
        )}
        <div style={{marginLeft:"auto",display:"flex",gap:10,fontSize:12,fontWeight:700}}>
          <span style={{color:"#16a34a"}}>+{fmtRp(tM)}</span>
          <span style={{color:"#dc2626"}}>-{fmtRp(tK)}</span>
        </div>
      </div>

      <CfKPI items={[
        {l:"Total Masuk",  v:fmtRp(tM), c:"#16a34a",bg:"#f0fdf4"},
        {l:"Total Keluar", v:fmtRp(tK), c:"#dc2626", bg:"#fff5f5"},
        {l:"Saldo Bersih", v:fmtRp(tM-tK), c:(tM-tK)>=0?"#0d9488":"#dc2626",bg:(tM-tK)>=0?"#e0faf5":"#fff5f5"},
        {l:"Entri",        v:`${filtered.length}`, c:"#6b7280",bg:"#f9fafb",sub:"transaksi"},
      ]}/>

      {/* -- List per tanggal -- */}
      {Object.entries(byDate).map(([d,entries])=>{
        const dM=entries.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
        const dK=entries.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);
        return (
          <div key={d} style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",overflow:"hidden",marginBottom:10}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"8px 13px",background:"linear-gradient(90deg,#e0faf5,#f0fdfb)",borderBottom:"1px solid #b2f5ea"}}>
              <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>📅 {d}</span>
              <div style={{display:"flex",gap:10,fontSize:11,fontWeight:700}}>
                <span style={{color:"#16a34a"}}>+{fmtRp(dM)}</span>
                <span style={{color:"#dc2626"}}>-{fmtRp(dK)}</span>
                <span style={{background:(dM-dK)>=0?"#e0faf5":"#fff5f5",color:(dM-dK)>=0?"#0d9488":"#dc2626",padding:"1px 8px",borderRadius:20,fontWeight:900}}>={fmtRp(Math.abs(dM-dK))}</span>
              </div>
            </div>
            {entries.map((e,i)=>{
              const kat=CF_KAT[e.kat]||CF_KAT.lainnya;
              const isEditing = editId===e.id;
              if(isEditing) return (
                <div key={e.id} style={{padding:"10px 13px",borderTop:i>0?"1px solid #f5fffe":"none",background:"#fffbeb",borderLeft:"3px solid #f59e0b"}}>
                  <div style={{fontWeight:700,fontSize:11,color:"#92400e",marginBottom:8}}>✏️ Edit Entri</div>
                  <div style={{display:"grid",gridTemplateColumns:jMobile?"1fr":"2fr 1fr 1fr 1fr",gap:6,marginBottom:8}}>
                    <input value={editForm.nama} onChange={ev=>setEditForm(p=>({...p,nama:ev.target.value}))}
                      placeholder="Keterangan..."
                      style={{padding:"6px 9px",borderRadius:8,border:"2px solid #fcd34d",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                    <input value={editForm.nominal} onChange={ev=>setEditForm(p=>({...p,nominal:ev.target.value}))}
                      type="number" placeholder="Nominal"
                      style={{padding:"6px 9px",borderRadius:8,border:"2px solid #fcd34d",fontSize:12,fontWeight:700,textAlign:"right",outline:"none",fontFamily:"inherit"}}/>
                    <select value={editForm.jenis} onChange={ev=>setEditForm(p=>({...p,jenis:ev.target.value,kat:ev.target.value==="masuk"?"setoran":"operasional"}))}
                      style={{padding:"6px 5px",borderRadius:8,border:"2px solid #fcd34d",fontSize:11,fontWeight:700,outline:"none",fontFamily:"inherit",background:editForm.jenis==="masuk"?"#f0fdf4":"#fff5f5",color:editForm.jenis==="masuk"?"#16a34a":"#dc2626"}}>
                      <option value="masuk">⬇ Masuk</option><option value="keluar">⬆ Keluar</option>
                    </select>
                    <select value={editForm.kat} onChange={ev=>setEditForm(p=>({...p,kat:ev.target.value}))}
                      style={{padding:"6px 5px",borderRadius:8,border:"2px solid #fcd34d",fontSize:11,outline:"none",fontFamily:"inherit"}}>
                      {(editForm.jenis==="masuk"?CF_KAT_IN:CF_KAT_OUT).map(k=><option key={k} value={k}>{CF_KAT[k]?.icon} {CF_KAT[k]?.l}</option>)}
                    </select>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={saveEdit} style={{padding:"6px 16px",borderRadius:8,border:"none",background:"#16a34a",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✅ Simpan Perubahan</button>
                    <button onClick={cancelEdit} style={{padding:"6px 14px",borderRadius:8,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✕ Batal</button>
                  </div>
                </div>
              );
              return (
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 13px",borderTop:i>0?"1px solid #f5fffe":"none",background:i%2===0?"#fff":"#fafffe"}}
                  onMouseEnter={ev=>ev.currentTarget.style.background="#f0fdfb"} onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"#fff":"#fafffe"}>
                  <div style={{width:28,height:28,borderRadius:8,background:kat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{kat.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nama}</div>
                    <span style={{fontSize:9,fontWeight:700,color:kat.c,background:kat.bg,padding:"1px 6px",borderRadius:20,display:"inline-block",marginTop:1}}>{kat.l}</span>
                  </div>
                  <div style={{fontWeight:900,fontSize:13,color:e.jenis==="masuk"?"#16a34a":"#dc2626",flexShrink:0}}>{e.jenis==="masuk"?"+":"-"}{fmtRp(e.nominal)}</div>
                  {/* Tombol Edit */}
                  <button onClick={()=>startEdit(e)}
                    style={{background:"none",border:"none",color:"#b2ede6",cursor:"pointer",fontSize:13,padding:"2px 4px"}}
                    title="Edit entri"
                    onMouseEnter={ev=>ev.currentTarget.style.color="#0d9488"} onMouseLeave={ev=>ev.currentTarget.style.color="#b2ede6"}>✏️</button>
                  {/* Tombol Hapus */}
                  <button onClick={()=>{if(window.confirm(`Hapus entri "${e.nama}"?`)) onDelete&&onDelete(e.id);}}
                    style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:13,padding:"2px 4px"}}
                    title="Hapus entri"
                    onMouseEnter={ev=>ev.currentTarget.style.color="#ff4757"} onMouseLeave={ev=>ev.currentTarget.style.color="#ddd"}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}

      {filtered.length===0&&(
        <div style={{textAlign:"center",padding:"40px 20px",color:"#aaa",fontSize:13}}>
          <div style={{fontSize:40,marginBottom:8}}>📋</div>
          <div style={{fontWeight:700}}>Belum ada entri jurnal</div>
          <div style={{fontSize:11,marginTop:4}}>Tambah entri di form di atas, atau kirim dari tab Kalkulator</div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// TAB 3: BUKU BESAR
// ========================================================
function CfTabBukuBesar({log}) {
  const [open,setOpen]=useState({});
  const akunMap={};
  log.forEach(e=>{const k=e.kat||"lainnya";if(!akunMap[k])akunMap[k]={kat:k,entries:[],d:0,k:0};akunMap[k].entries.push(e);if(e.jenis==="masuk")akunMap[k].k+=e.nominal;else akunMap[k].d+=e.nominal;});
  const akuns=Object.values(akunMap);
  const totK=akuns.reduce((s,a)=>s+a.k,0), totD=akuns.reduce((s,a)=>s+a.d,0);
  return (
    <div>
      <CfExportBar buttons={[
        {l:"Export CSV Buku Besar",icon:"📊",c:"#1d4ed8",badge:"per akun",fn:()=>{
          const rows=[[CO+" -- BUKU BESAR"],["Akun","Tanggal","Keterangan","Debit","Kredit","Saldo Running"]];
          akuns.forEach(a=>{let run=0;a.entries.forEach((e,i)=>{if(e.jenis==="masuk")run+=e.nominal;else run-=e.nominal;rows.push([i===0?(CF_KAT[a.kat]?.l||a.kat):"",e.tgl,e.nama,e.jenis==="keluar"?e.nominal:0,e.jenis==="masuk"?e.nominal:0,run]);});});
          cfDlCSV(rows,`BukuBesar_${today().replace(/\//g,"-")}.csv`);
        }},
        {l:"Export CSV Rekap",icon:"📋",c:"#7c3aed",fn:()=>cfDlCSV([
          [CO+" -- REKAP BUKU BESAR"],["Akun","Debit","Kredit","Saldo"],
          ...akuns.map(a=>[CF_KAT[a.kat]?.l||a.kat,a.d,a.k,a.k-a.d]),
          ["TOTAL",totD,totK,totK-totD],
        ],`Rekap_${today().replace(/\//g,"-")}.csv`)},
      ]}/>
      <CfKPI items={[
        {l:"Total Kredit (Masuk)",v:fmtRp(totK),c:"#16a34a",bg:"#f0fdf4"},
        {l:"Total Debit (Keluar)",v:fmtRp(totD),c:"#dc2626",bg:"#fff5f5"},
        {l:"Saldo Bersih",v:fmtRp(totK-totD),c:(totK-totD)>=0?"#0d9488":"#dc2626",bg:(totK-totD)>=0?"#e0faf5":"#fff5f5"},
        {l:"Akun Aktif",v:`${akuns.length} akun`,c:"#6b7280",bg:"#f9fafb"},
      ]}/>
      {akuns.map(a=>{
        const kat=CF_KAT[a.kat]||CF_KAT.lainnya; const isOpen=open[a.kat]; let run=0;
        return (
          <div key={a.kat} style={{background:"#fff",borderRadius:14,border:`2px solid ${kat.c}18`,overflow:"hidden",marginBottom:10}}>
            <div style={{height:3,background:`linear-gradient(90deg,${kat.c},${kat.c}55)`}}/>
            <div style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer"}}
              onClick={()=>setOpen(p=>({...p,[a.kat]:!p[a.kat]}))}
              onMouseEnter={e=>e.currentTarget.style.background=kat.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <div style={{width:34,height:34,borderRadius:10,background:kat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0}}>{kat.icon}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:13,color:kat.c}}>{kat.l}</div>
                <div style={{fontSize:10,color:"#aaa"}}>{a.entries.length} transaksi</div>
              </div>
              <div style={{textAlign:"right",marginRight:8}}>
                {a.k>0&&<div style={{fontSize:12,fontWeight:700,color:"#16a34a"}}>+{fmtRp(a.k)}</div>}
                {a.d>0&&<div style={{fontSize:12,fontWeight:700,color:"#dc2626"}}>-{fmtRp(a.d)}</div>}
              </div>
              <span style={{color:"#ccc",transition:"transform .2s",display:"inline-block",transform:isOpen?"rotate(180deg)":"none"}}>▾</span>
            </div>
            {isOpen&&(
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,borderTop:`1px solid ${kat.c}18`}}>
                <thead><tr style={{background:kat.bg}}>
                  {["Tanggal","Keterangan","Debit","Kredit","Saldo Running"].map(h=><th key={h} style={{padding:"7px 12px",textAlign:"left",fontWeight:700,color:kat.c,fontSize:11}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {a.entries.map((e,i)=>{if(e.jenis==="masuk")run+=e.nominal;else run-=e.nominal;return(
                    <tr key={e.id} style={{borderTop:"1px solid #f5f5f5",background:i%2===0?"#fff":"#fafffe"}}>
                      <td style={{padding:"6px 12px",color:"#888",fontSize:11}}>{e.tgl}</td>
                      <td style={{padding:"6px 12px",fontWeight:600}}>{e.nama}</td>
                      <td style={{padding:"6px 12px",color:"#dc2626",fontWeight:700}}>{e.jenis==="keluar"?fmtRp(e.nominal):"--"}</td>
                      <td style={{padding:"6px 12px",color:"#16a34a",fontWeight:700}}>{e.jenis==="masuk"?fmtRp(e.nominal):"--"}</td>
                      <td style={{padding:"6px 12px",fontWeight:800,color:run>=0?"#0d9488":"#dc2626"}}>{run>=0?"+":""}{fmtRp(run)}</td>
                    </tr>);
                  })}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ========================================================
// TAB 4: LAPORAN KEUANGAN
// ========================================================
function CfTabLapKeu({log}) {
  const [sub,setSub]=useState("lr");
  const masuk=log.filter(e=>e.jenis==="masuk"), keluar=log.filter(e=>e.jenis==="keluar");
  const pend=masuk.filter(e=>["pendapatan","setoran"].includes(e.kat)).reduce((s,e)=>s+e.nominal,0);
  const pLain=masuk.filter(e=>!["pendapatan","setoran"].includes(e.kat)).reduce((s,e)=>s+e.nominal,0);
  const hpp=keluar.filter(e=>e.kat==="hpp").reduce((s,e)=>s+e.nominal,0);
  const labaKotor=pend-hpp;
  const opEx=keluar.filter(e=>["operasional","gaji","marketing"].includes(e.kat)).reduce((s,e)=>s+e.nominal,0);
  const labaOp=labaKotor-opEx;
  const bLain=keluar.filter(e=>["aset","lainnya"].includes(e.kat)).reduce((s,e)=>s+e.nominal,0);
  const ebt=labaOp-bLain+pLain;
  const pajak=ebt>0?Math.floor(ebt*.01):0;
  const labaBersih=ebt-pajak;
  const margin=pend>0?(labaBersih/pend*100).toFixed(1):"0.0";
  const kasOp=masuk.filter(e=>["pendapatan","setoran"].includes(e.kat)).reduce((s,e)=>s+e.nominal,0)-keluar.filter(e=>["operasional","gaji","hpp"].includes(e.kat)).reduce((s,e)=>s+e.nominal,0);
  const kasInv=-keluar.filter(e=>e.kat==="aset").reduce((s,e)=>s+e.nominal,0);
  const kasFin=masuk.filter(e=>e.kat==="modal").reduce((s,e)=>s+e.nominal,0);
  const kasNet=kasOp+kasInv+kasFin;

  const LR=({l,v,i=false,c="#1a2e2a"})=>(<div style={{display:"flex",justifyContent:"space-between",padding:i?"4px 0 4px 20px":"5px 0",borderBottom:"1px dotted #f0f0f0",fontSize:i?12:13}}><span style={{color:i?"#555":"#1a2e2a",fontWeight:i?600:700}}>{l}</span><span style={{fontWeight:i?700:800,color:c}}>{v}</span></div>);
  const TR=({l,v,c="#0d9488"})=>(<div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderTop:"2px solid #1a2e2a",marginTop:4}}><span style={{fontWeight:800,fontSize:13}}>{l}</span><span style={{fontWeight:900,fontSize:15,color:c}}>{v}</span></div>);

  const csvLapKeu=()=>cfDlCSV([
    [CO+" -- LAPORAN KEUANGAN"],[""],
    ["=== LABA RUGI ==="],["Pendapatan Penjualan",pend],["HPP","("+hpp+")"],["Laba Kotor",labaKotor],
    ["Beban Operasional","("+opEx+")"],["Laba Operasional",labaOp],["Pajak",pajak],["LABA BERSIH",labaBersih],["Net Margin",margin+"%"],[""],
    ["=== ARUS KAS ==="],["Kas Operasi",kasOp],["Kas Investasi",kasInv],["Kas Pendanaan",kasFin],["Kenaikan Bersih",kasNet],[""],
    ["=== NERACA ==="],["Total Aktiva",masuk.reduce((s,e)=>s+e.nominal,0)],["Total Kewajiban+Modal",keluar.reduce((s,e)=>s+e.nominal,0)+Math.max(labaBersih,0)],
  ],`LapKeuangan_${today().replace(/\//g,"-")}.csv`);

  return (
    <div>
      <CfExportBar buttons={[
        {l:"Export CSV Laporan Keuangan",icon:"📊",c:"#7c3aed",badge:"LR+AK+Neraca",fn:csvLapKeu},
        {l:"Cetak / PDF",icon:"🖨️",c:"#dc2626",fn:()=>{
          const w=window.open("","_blank");
          w.document.write(`<html><head><title>Laporan Keuangan ${CO}</title><style>body{font-family:Arial;padding:40px;max-width:600px;margin:auto}@media print{@page{size:A4;margin:15mm}}</style></head><body><h1 style="text-align:center">${CO}</h1><h2 style="text-align:center">Laporan Keuangan</h2><p style="text-align:center">${today()}</p><hr><h3>Laba Rugi</h3><p>Pendapatan: ${fmtRp(pend)}</p><p>HPP: (${fmtRp(hpp)})</p><p>Laba Kotor: ${fmtRp(labaKotor)}</p><p>Beban Operasional: (${fmtRp(opEx)})</p><p><b>Laba Bersih: ${fmtRp(labaBersih)}</b></p><p>Net Margin: ${margin}%</p><hr><h3>Arus Kas</h3><p>Kas Operasi: ${fmtRp(kasOp)}</p><p>Kas Investasi: ${fmtRp(kasInv)}</p><p>Kas Pendanaan: ${fmtRp(kasFin)}</p><p><b>Kenaikan Bersih: ${fmtRp(kasNet)}</b></p><script>setTimeout(()=>window.print(),400)</script></body></html>`);
          w.document.close();
        }},
      ]}/>
      <div style={{display:"flex",gap:4,background:"#fff",borderRadius:12,padding:4,border:"2px solid #e0f5f1",marginBottom:14,width:"fit-content"}}>
        {[{k:"lr",l:"📊 Laba Rugi"},{k:"ak",l:"💧 Arus Kas"},{k:"nr",l:"⚖️ Neraca"}].map(t=>(
          <button key={t.k} onClick={()=>setSub(t.k)} style={{padding:"7px 18px",borderRadius:9,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:sub===t.k?"linear-gradient(135deg,#0d9488,#14b8a6)":"transparent",color:sub===t.k?"#fff":"#888",transition:"all .15s"}}>{t.l}</button>
        ))}
      </div>
      {sub==="lr"&&(
        <div style={{maxWidth:580,margin:"0 auto"}}>
          <div style={{background:"#fff",borderRadius:16,border:"2px solid #ddd",overflow:"hidden",boxShadow:"0 6px 24px rgba(0,0,0,.07)"}}>
            <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488)",padding:"20px 26px",textAlign:"center",position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-30,top:-30,width:110,height:110,borderRadius:"50%",background:"rgba(255,255,255,.07)"}}/>
              <div style={{fontWeight:900,fontSize:20,color:"#fff"}}>{CO}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:3,fontWeight:700}}>LAPORAN LABA RUGI</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,.55)",marginTop:1}}>{today()}</div>
            </div>
            <div style={{padding:"18px 24px"}}>
              <div style={{fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:".6px",borderBottom:"2px solid #1a2e2a",paddingBottom:4,marginBottom:8}}>I. Pendapatan</div>
              <LR l="Pendapatan Penjualan & Setoran" v={fmtRp(pend)} i c="#16a34a"/>
              {pLain>0&&<LR l="Pendapatan Lain-lain" v={fmtRp(pLain)} i c="#059669"/>}
              <TR l="Total Pendapatan" v={fmtRp(pend+pLain)} c="#16a34a"/>
              <div style={{fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:".6px",borderBottom:"2px solid #1a2e2a",paddingBottom:4,margin:"14px 0 8px"}}>II. HPP</div>
              <LR l="Pembelian / HPP" v={`(${fmtRp(hpp)})`} i c="#dc2626"/>
              <TR l="Laba Kotor" v={fmtRp(labaKotor)} c={labaKotor>=0?"#ca8a04":"#dc2626"}/>
              <div style={{fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:".6px",borderBottom:"2px solid #1a2e2a",paddingBottom:4,margin:"14px 0 8px"}}>III. Beban Operasional</div>
              {keluar.filter(e=>["operasional","gaji","marketing"].includes(e.kat)).map((e,i)=><LR key={i} l={e.nama} v={`(${fmtRp(e.nominal)})`} i c="#d97706"/>)}
              <TR l="Laba Operasional" v={fmtRp(labaOp)} c={labaOp>=0?"#d97706":"#dc2626"}/>
              <div style={{padding:"8px 0",borderTop:"1px solid #eee",marginTop:6}}>
                {bLain>0&&<LR l="Beban lain-lain" v={`(${fmtRp(bLain)})`} c="#dc2626"/>}
                <LR l="Laba sebelum pajak" v={fmtRp(ebt)} c="#1a2e2a"/>
                <LR l="Pajak 1% UMKM" v={`(${fmtRp(pajak)})`} c="#6b7280"/>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"13px 10px",marginTop:5,borderTop:"3px double #1a2e2a",borderBottom:"3px double #1a2e2a",background:labaBersih>=0?"#f0fdf4":"#fff5f5",borderRadius:5}}>
                <span style={{fontWeight:900,fontSize:17}}>LABA BERSIH</span>
                <span style={{fontWeight:900,fontSize:24,color:labaBersih>=0?"#16a34a":"#dc2626"}}>{fmtRp(labaBersih)}</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
                {[{l:"Net Margin",v:`${margin}%`,c:"#16a34a",bg:"#f0fdf4"},{l:"Laba Kotor",v:fmtRp(labaKotor),c:"#ca8a04",bg:"#fefce8"},{l:"Laba Operasi",v:fmtRp(labaOp),c:"#d97706",bg:"#fffbeb"},{l:"Total HPP",v:fmtRp(hpp),c:"#dc2626",bg:"#fff5f5"}].map(k=>(
                  <div key={k.l} style={{background:k.bg,borderRadius:9,padding:"9px 11px",border:`1px solid ${k.c}22`}}>
                    <div style={{fontSize:9,color:k.c,fontWeight:700,textTransform:"uppercase",marginBottom:2}}>{k.l}</div>
                    <div style={{fontWeight:900,fontSize:14,color:k.c}}>{k.v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      {sub==="ak"&&(
        <div style={{maxWidth:520,margin:"0 auto"}}>
          <div style={{background:"#fff",borderRadius:16,border:"2px solid #ddd",overflow:"hidden",boxShadow:"0 6px 24px rgba(0,0,0,.07)"}}>
            <div style={{background:"linear-gradient(135deg,#1e3a8a,#3b82f6)",padding:"18px 24px",textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18,color:"#fff"}}>{CO}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:2,fontWeight:700}}>LAPORAN ARUS KAS</div>
            </div>
            <div style={{padding:"16px 22px"}}>
              {[{l:"A. Aktivitas Operasi",c:"#0d9488",v:kasOp,icon:"⚙️"},{l:"B. Aktivitas Investasi",c:"#3b82f6",v:kasInv,icon:"📈"},{l:"C. Aktivitas Pendanaan",c:"#7c3aed",v:kasFin,icon:"💎"}].map(s=>(
                <div key={s.l} style={{marginBottom:14}}>
                  <div style={{fontWeight:800,fontSize:11,color:s.c,borderBottom:`2px solid ${s.c}33`,paddingBottom:4,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><span>{s.icon}</span>{s.l}</div>
                  <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderTop:"1px solid #e0f5f1",fontWeight:800,fontSize:13,color:s.c}}>
                    <span>Total Arus Kas</span><span>{s.v>=0?"+":""}{fmtRp(s.v)}</span>
                  </div>
                </div>
              ))}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 8px",borderTop:"3px double #1a2e2a",borderBottom:"3px double #1a2e2a",background:kasNet>=0?"#f0fdf4":"#fff5f5",borderRadius:4}}>
                <span style={{fontWeight:900,fontSize:15}}>KENAIKAN BERSIH KAS</span>
                <span style={{fontWeight:900,fontSize:20,color:kasNet>=0?"#16a34a":"#dc2626"}}>{kasNet>=0?"+":""}{fmtRp(kasNet)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      {sub==="nr"&&(
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{background:"#fff",borderRadius:16,border:"2px solid #ddd",overflow:"hidden",boxShadow:"0 6px 24px rgba(0,0,0,.07)"}}>
            <div style={{background:"linear-gradient(135deg,#78350f,#b45309,#d97706)",padding:"18px 24px",textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18,color:"#fff"}}>{CO}</div>
              <div style={{fontSize:12,color:"rgba(255,255,255,.8)",marginTop:2,fontWeight:700}}>NERACA (BALANCE SHEET)</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,.55)",marginTop:1}}>{today()}</div>
            </div>
            <div style={{padding:"16px 22px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div>
                <div style={{fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:".5px",borderBottom:"2px solid #1a2e2a",paddingBottom:3,marginBottom:8}}>AKTIVA</div>
                <LR l="Kas & Setara Kas" v={fmtRp(kasNet>0?kasNet:0)} i c="#16a34a"/>
                <LR l="Pendapatan Usaha" v={fmtRp(pend+pLain)} i c="#0d9488"/>
                <LR l="Aset Peralatan" v={fmtRp(keluar.filter(e=>e.kat==="aset").reduce((s,e)=>s+e.nominal,0))} i c="#3b82f6"/>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:"2px solid #1a2e2a",fontWeight:900,fontSize:12,marginTop:5}}>
                  <span>TOTAL AKTIVA</span><span style={{color:"#0d9488"}}>{fmtRp(masuk.reduce((s,e)=>s+e.nominal,0))}</span>
                </div>
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:10,textTransform:"uppercase",letterSpacing:".5px",borderBottom:"2px solid #1a2e2a",paddingBottom:3,marginBottom:8}}>KEWAJIBAN & MODAL</div>
                <LR l="Beban Operasional" v={fmtRp(opEx)} i c="#d97706"/>
                <LR l="HPP Terutang" v={fmtRp(hpp)} i c="#dc2626"/>
                <LR l="Laba Periode" v={fmtRp(Math.max(labaBersih,0))} i c="#16a34a"/>
                <LR l="Modal Investasi" v={fmtRp(masuk.filter(e=>e.kat==="modal").reduce((s,e)=>s+e.nominal,0))} i c="#7c3aed"/>
                <div style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderTop:"2px solid #1a2e2a",fontWeight:900,fontSize:12,marginTop:5}}>
                  <span>TOTAL PASIVA</span><span style={{color:"#dc2626"}}>{fmtRp(keluar.reduce((s,e)=>s+e.nominal,0)+Math.max(labaBersih,0)+masuk.filter(e=>e.kat==="modal").reduce((s,e)=>s+e.nominal,0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ========================================================
// TAB 5: ANALISIS
// ========================================================
function CfTabAnalisis({log}) {
  const analRef=useRef(null);
  const masuk=log.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const keluar=log.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);
  const laba=masuk-keluar, margin=masuk>0?(laba/masuk*100):0;
  const days=[...new Set(log.map(e=>e.tgl))].length||1;
  const rata=masuk/days;
  const kondisi=margin>=20?"sehat":margin>=10?"cukup":"perhatian";
  const kC=kondisi==="sehat"?"#16a34a":kondisi==="cukup"?"#d97706":"#dc2626";
  const katK={}; log.filter(e=>e.jenis==="keluar").forEach(e=>{const k=e.kat||"lainnya";katK[k]=(katK[k]||0)+e.nominal;});
  const topKat=Object.entries(katK).sort((a,b)=>b[1]-a[1]);
  const last7=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-(6-i));const tgl=d.toLocaleDateString("id-ID");return {l:d.toLocaleDateString("id-ID",{day:"2-digit",month:"short"}),m:log.filter(e=>e.tgl===tgl&&e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0),k:log.filter(e=>e.tgl===tgl&&e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0)};});
  const maxC=Math.max(...last7.map(d=>d.m),1);
  return (
    <div>
      <CfExportBar buttons={[
        {l:"Export CSV Analisis",icon:"📊",c:"#d97706",fn:()=>cfDlCSV([
          [CO+" -- ANALISIS KEUANGAN"],["Tanggal: "+today()],[""],
          ["Kondisi",kondisi.toUpperCase()],["Total Masuk",masuk],["Total Keluar",keluar],["Laba Bersih",laba],["Net Margin",margin.toFixed(2)+"%"],["Rata Harian",rata.toFixed(0)],["Hari Aktif",days],[""],
          ["TOP KATEGORI KELUAR","Nominal","Persen"],
          ...topKat.map(([k,v])=>[CF_KAT[k]?.l||k,v,(v/keluar*100).toFixed(1)+"%"]),[""],
          ["TREN 7 HARI","","",""],["Tanggal","Masuk","Keluar","Selisih"],
          ...last7.map(d=>[d.l,d.m,d.k,d.m-d.k]),[""],
          ["ALOKASI LABA",""],["Tabungan 30%",Math.floor(laba*.3/10000)*10000],["Modal 40%",Math.floor(laba*.4/10000)*10000],["Stok 20%",Math.floor(laba*.2/10000)*10000],["Darurat 10%",Math.floor(laba*.1/10000)*10000],
        ],`Analisis_${today().replace(/\//g,"-")}.csv`)},
        {l:"Cetak / PDF",icon:"🖨️",c:"#dc2626",fn:()=>{
          if(!analRef.current)return;
          const w=window.open("","_blank");
          w.document.write(`<html><head><title>Analisis ${CO}</title><style>@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;800;900&display=swap');body{font-family:Nunito,Arial;background:#f0faf8;padding:20px}@media print{body{background:white}@page{size:A4;margin:12mm}}</style></head><body>${analRef.current.outerHTML}<script>setTimeout(()=>window.print(),500)</script></body></html>`);
          w.document.close();
        }},
      ]}/>
      <div ref={analRef}>
        <div style={{background:`linear-gradient(135deg,${kC}ee,${kC}bb)`,borderRadius:14,padding:"16px 20px",marginBottom:14,display:"flex",gap:12,alignItems:"center",boxShadow:`0 5px 18px ${kC}30`}}>
          <div style={{fontSize:40}}>{kondisi==="sehat"?"🚀":kondisi==="cukup"?"⚠️":"🚨"}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:17,color:"#fff"}}>{kondisi==="sehat"?"SEHAT & TUMBUH 💪":kondisi==="cukup"?"CUKUP STABIL":"PERLU PERHATIAN"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.8)",marginTop:3}}>Margin {margin.toFixed(1)}% . Rata-rata {fmtRp(rata)}/hari . {days} hari aktif</div>
          </div>
          <div style={{textAlign:"center",background:"rgba(255,255,255,.15)",borderRadius:11,padding:"9px 16px"}}>
            <div style={{fontWeight:900,fontSize:26,color:"#fff"}}>{margin.toFixed(1)}%</div>
            <div style={{fontSize:9,color:"rgba(255,255,255,.7)",fontWeight:700}}>NET MARGIN</div>
          </div>
        </div>
        <CfKPI items={[
          {l:"Total Masuk",  v:fmtRp(masuk),  c:"#16a34a",bg:"#f0fdf4"},
          {l:"Total Keluar", v:fmtRp(keluar), c:"#dc2626", bg:"#fff5f5"},
          {l:"Laba Bersih",  v:fmtRp(laba),  c:laba>=0?"#0d9488":"#dc2626",bg:laba>=0?"#e0faf5":"#fff5f5"},
          {l:"Rata Harian",  v:fmtRp(rata),  c:"#d97706",bg:"#fffbeb"},
        ]}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"13px 15px"}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:11,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span>📈 Tren 7 Hari</span>
              <div style={{display:"flex",gap:10,fontSize:10,fontWeight:600}}>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:8,height:8,borderRadius:2,background:"#22c55e",display:"inline-block"}}/>Masuk</span>
                <span style={{display:"flex",alignItems:"center",gap:3}}><span style={{width:8,height:8,borderRadius:2,background:"#f87171",display:"inline-block"}}/>Keluar</span>
              </div>
            </div>
            <div style={{display:"flex",gap:5,alignItems:"flex-end",height:84}}>
              {last7.map((d,i)=>{const hm=Math.round((d.m/maxC)*80),hk=Math.round((d.k/maxC)*80),isT=i===6;return(
                <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                  <div style={{display:"flex",gap:2,alignItems:"flex-end",height:80}}>
                    <div style={{width:"45%",background:isT?"#16a34a":"#86efac",borderRadius:"3px 3px 0 0",height:Math.max(hm,2)}}/>
                    <div style={{width:"45%",background:isT?"#dc2626":"#fca5a5",borderRadius:"3px 3px 0 0",height:Math.max(hk,2)}}/>
                  </div>
                  <div style={{fontSize:9,color:isT?"#0d9488":"#aaa",fontWeight:isT?800:600,textAlign:"center",lineHeight:1.1}}>{d.l}</div>
                </div>
              );})}
            </div>
          </div>
          <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"13px 15px"}}>
            <div style={{fontWeight:800,fontSize:13,marginBottom:11}}>💸 Top Kategori Keluar</div>
            {topKat.map(([k,v])=>{const kat=CF_KAT[k]||CF_KAT.lainnya;const pct=Math.round(v/keluar*100);return(
              <div key={k} style={{marginBottom:9}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:11,fontWeight:700}}>{kat.icon} {kat.l}</span>
                  <span style={{fontSize:11,fontWeight:800,color:kat.c}}>{pct}%</span>
                </div>
                <div style={{background:"#f0f0f0",borderRadius:20,height:5}}>
                  <div style={{background:`linear-gradient(90deg,${kat.c},${kat.c}88)`,height:"100%",width:`${pct}%`,borderRadius:20}}/>
                </div>
              </div>
            );})}
          </div>
        </div>
        {laba>0&&(
          <div style={{background:"linear-gradient(135deg,#fffbeb,#fef3c7)",borderRadius:13,border:"2px solid #fde68a",padding:"13px 15px",marginBottom:12}}>
            <div style={{fontWeight:800,fontSize:13,color:"#b45309",marginBottom:9}}>💡 Saran Alokasi Laba {fmtRp(laba)}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[{l:"💰 Tabungan 30%",p:.3,c:"#0d9488"},{l:"🔄 Modal 40%",p:.4,c:"#3b82f6"},{l:"📦 Stok 20%",p:.2,c:"#7c3aed"},{l:"🎯 Darurat 10%",p:.1,c:"#d97706"}].map(s=>(
                <div key={s.l} style={{background:`${s.c}10`,borderRadius:9,padding:"9px 11px",border:`1px solid ${s.c}33`,textAlign:"center"}}>
                  <div style={{fontSize:10,fontWeight:700,color:s.c,marginBottom:3}}>{s.l}</div>
                  <div style={{fontWeight:900,fontSize:14,color:s.c}}>{fmtRp(Math.floor(laba*s.p/10000)*10000)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"13px 15px"}}>
          <div style={{fontWeight:800,fontSize:13,marginBottom:11}}>🔮 Proyeksi 3 Bulan</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            {[{b:"Bulan 1",m:1.0,c:"#0d9488"},{b:"Bulan 2",m:1.05,c:"#059669"},{b:"Bulan 3",m:1.1,c:"#16a34a"}].map(p=>{const pm=masuk*p.m*30/days,pl=pm-(keluar*30/days);return(
              <div key={p.b} style={{background:`${p.c}08`,borderRadius:10,padding:"11px 13px",border:`2px solid ${p.c}22`}}>
                <div style={{fontWeight:800,fontSize:12,color:p.c,marginBottom:4}}>{p.b}</div>
                <div style={{fontWeight:900,fontSize:14,color:p.c}}>{fmtRp(pm)}</div>
                <div style={{fontSize:10,color:"#aaa",marginBottom:3}}>est. masuk</div>
                <div style={{fontWeight:800,fontSize:13,color:pl>=0?"#0d9488":"#dc2626"}}>{pl>=0?"+":""}{fmtRp(pl)}</div>
                <div style={{fontSize:10,color:"#aaa"}}>est. laba</div>
              </div>
            );})}
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================================



// --- Chart component ----------------------------------------------------------

// ============================================================================
// BANK DASHBOARD -- sama persis dengan dashboard penjualan
// ============================================================================
// --- Chart component ----------------------------------------------------------
function BankChart({ data, metric, color }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const vals = data.map(p=>p[metric]);
  const maxVal = Math.max(...vals,1);
  const cW=640,cH=200,pL=52,pR=16,pT=16,pB=32;
  const iW=cW-pL-pR, iH=cH-pT-pB, n=data.length;
  const pts = data.map((p,i)=>({
    x:pL+(i/((n-1)||1))*iW,
    y:pT+(1-p[metric]/maxVal)*iH,
    val:p[metric], label:p.label
  }));
  const linePath = pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath = pts.length>1?`${linePath} L${pts[pts.length-1].x},${pT+iH} L${pts[0].x},${pT+iH} Z`:"";
  const yLabels = [0,.25,.5,.75,1].map(f=>({y:pT+iH*(1-f),val:maxVal*f}));
  const gId = `bg${metric}`;
  const lastTwo = pts.slice(-2);
  const trend = lastTwo.length===2?(lastTwo[1].val>=lastTwo[0].val?"up":"down"):"up";
  const tC = color||(trend==="up"?"#0d9488":"#ff4757");

  return (
    <div style={{overflowX:"auto",position:"relative"}}>
      {hoverIdx!==null&&pts[hoverIdx]&&(()=>{
        const p=pts[hoverIdx];
        const prev=hoverIdx>0?pts[hoverIdx-1]:null;
        const diff=prev?p.val-prev.val:null;
        const diffPct=prev&&prev.val>0?((diff/prev.val)*100).toFixed(1):null;
        const tipLeft=(p.x/cW)>0.7?`calc(${(p.x/cW*100).toFixed(1)}% - 168px)`:`calc(${(p.x/cW*100).toFixed(1)}% + 10px)`;
        return(
          <div style={{position:"absolute",top:0,left:tipLeft,background:"#fff",borderRadius:12,
            padding:"10px 14px",boxShadow:"0 4px 20px rgba(0,0,0,.18)",
            border:`2px solid ${tC}33`,pointerEvents:"none",zIndex:10,width:160}}>
            <div style={{fontSize:11,fontWeight:800,color:"#555",marginBottom:3}}>{p.label}</div>
            <div style={{fontSize:15,fontWeight:900,color:tC}}>{fmtRp(p.val)}</div>
            {diff!==null&&<div style={{fontSize:11,fontWeight:700,color:diff>=0?"#27ae60":"#e74c3c",marginTop:3}}>
              {diff>=0?"▲":"▼"} {fmtRp(Math.abs(diff))} ({diff>=0?"+":""}{diffPct}%)
            </div>}
          </div>
        );
      })()}
      <svg width="100%" viewBox={`0 0 ${cW} ${cH}`} style={{display:"block",minWidth:320,cursor:"crosshair"}}
        onMouseLeave={()=>setHoverIdx(null)}
        onMouseMove={e=>{
          const r=e.currentTarget.getBoundingClientRect();
          const mx=(e.clientX-r.left)*(cW/r.width);
          let best=0,bestD=Infinity;
          pts.forEach((p,i)=>{const d=Math.abs(p.x-mx);if(d<bestD){bestD=d;best=i;}});
          setHoverIdx(best);
        }}>
        <defs>
          <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tC} stopOpacity="0.28"/>
            <stop offset="100%" stopColor={tC} stopOpacity="0.02"/>
          </linearGradient>
          <filter id="cs"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={tC} floodOpacity="0.18"/></filter>
        </defs>
        {yLabels.map((yl,i)=>(
          <g key={i}>
            <line x1={pL} y1={yl.y} x2={cW-pR} y2={yl.y} stroke={i===0?"#e0f5f1":"#f0faf8"} strokeWidth={i===0?"1.5":"1"} strokeDasharray={i===0?"none":"4,4"}/>
            <text x={pL-6} y={yl.y+4} textAnchor="end" fontSize="11" fill="#aaa" fontFamily="Nunito,sans-serif" fontWeight="700">{fmtS(yl.val)}</text>
          </g>
        ))}
        {pts.length>1&&<path d={areaPath} fill={`url(#${gId})`}/>}
        {pts.length>1&&<path d={linePath} fill="none" stroke={tC} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" filter="url(#cs)"/>}
        {hoverIdx!==null&&pts[hoverIdx]&&(()=>{
          const p=pts[hoverIdx];
          return(<g>
            <line x1={p.x} y1={pT} x2={p.x} y2={pT+iH} stroke={tC} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.6"/>
            <line x1={pL} y1={p.y} x2={cW-pR} y2={p.y} stroke={tC} strokeWidth="1" strokeDasharray="3,3" opacity="0.4"/>
            <rect x={0} y={p.y-9} width={pL-2} height={18} rx="4" fill={tC}/>
            <text x={pL-5} y={p.y+4} textAnchor="end" fontSize="10" fill="#fff" fontFamily="Nunito,sans-serif" fontWeight="800">{fmtS(p.val)}</text>
          </g>);
        })()}
        {pts.map((p,i)=>{
          const isH=hoverIdx===i;
          const showX=n<=14||i===0||i===n-1||i%Math.ceil(n/10)===0||isH;
          return(<g key={i}>
            {isH&&<circle cx={p.x} cy={p.y} r="10" fill={tC} opacity="0.12"/>}
            {isH&&<circle cx={p.x} cy={p.y} r="6.5" fill={tC} opacity="0.2"/>}
            <circle cx={p.x} cy={p.y} r={isH?5.5:3.5} fill={isH?tC:"#fff"} stroke={tC} strokeWidth={isH?0:2.5}/>
            {showX&&<text x={p.x} y={pT+iH+16} textAnchor="middle" fontSize="10" fill={isH?tC:"#999"} fontFamily="Nunito,sans-serif" fontWeight={isH?"800":"600"}>{p.label}</text>}
            {(isH&&p.val>0)&&<text x={p.x} y={p.y-10} textAnchor="middle" fontSize="11" fill={tC} fontWeight="800" fontFamily="Nunito,sans-serif">{fmtS(p.val)}</text>}
          </g>);
        })}
      </svg>
    </div>
  );
}


function BankDashboardPage({ bankTrx: rawBankTrx, outlets, onBack }) {
  const [metric,      setMetric]      = useState("masuk");
  const [period,      setPeriod]      = useState("daily");
  const [dateFrom,    setDateFrom]    = useState(()=>{const d=new Date();d.setDate(d.getDate()-13);return d.toISOString().split("T")[0];});
  const [dateTo,      setDateTo]      = useState(()=>new Date().toISOString().split("T")[0]);
  const [filterOutlet,setFilterOutlet]= useState("semua");
  const [tab,         setTab]         = useState("grafik");
  const [localTrx,    setLocalTrx]    = useState(null); // null = belum load
  const [loading,     setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // -- Load langsung dari Supabase -----------------------------------------
  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('bank_transactions')
        .select('id,tgl,waktu,shift_id,nama,jenis,fee,nominal,net_nominal,outlet_id,created_at')
        .order('created_at', { ascending: false })
        .limit(5000);
      const mapped = (data||[]).map(r => ({
        id:         r.id,
        tgl:        r.tgl || (r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : ''),
        waktu:      r.waktu || r.created_at,
        shiftId:    r.shift_id,
        nama:       r.nama,
        jenis:      r.jenis,
        fee:        r.fee   || 0,
        nominal:    r.nominal || 0,
        netNominal: r.net_nominal || 0,
        outletId:   r.outlet_id,
      }));
      setLocalTrx(mapped);
      setLastRefresh(new Date().toLocaleTimeString('id-ID'));
    } catch(e) { console.error('BankDashboard load:', e); }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(loadData, 30000); // reload tiap 30 detik
    const ch = supabase.channel('bankdash-rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bank_transactions'},(p) => {
        const r = p.new;
        if(!r) return;
        const t = {
          id:r.id, tgl:r.tgl||(r.created_at?new Date(r.created_at).toLocaleDateString('id-ID'):''),
          waktu:r.waktu||r.created_at, shiftId:r.shift_id, nama:r.nama, jenis:r.jenis,
          fee:r.fee||0, nominal:r.nominal||0, netNominal:r.net_nominal||0, outletId:r.outlet_id,
        };
        setLocalTrx(prev => (prev||[]).find(x=>x.id===t.id) ? (prev||[]) : [t,...(prev||[])]);
        setLastRefresh(new Date().toLocaleTimeString('id-ID'));
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'bank_transactions'},(p) => {
        setLocalTrx(prev => (prev||[]).filter(x=>x.id!==p.old?.id));
      })
      .subscribe();
    return () => { clearInterval(iv); supabase.removeChannel(ch); };
  }, []);

  // Gunakan localTrx (fresh dari Supabase) atau fallback ke prop
  const bankTrx = localTrx !== null ? localTrx : (rawBankTrx || []);
  const outletNames = (outlets||[]).map(o=>o.nama);

  // Filter by outlet
  const filtered = filterOutlet==="semua" ? bankTrx : bankTrx.filter(t=>t.outletId===filterOutlet);

  // KPI hari ini -- match format tgl dari Supabase
  const todayStr = today();
  const todayISO = new Date().toISOString().split('T')[0]; // 2026-06-04
  const todayTrx = filtered.filter(t => {
    if(!t.tgl) return false;
    // Cek berbagai format: "04/06/2026" atau "2026-06-04" atau "4/6/2026"
    if(t.tgl === todayStr) return true;
    if(t.tgl === todayISO) return true;
    // Normalize: jika format d/m/yyyy
    const parts = t.tgl.split('/');
    if(parts.length===3) {
      const iso = `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
      return iso === todayISO;
    }
    return false;
  });
  const masukHari  = todayTrx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
  const keluarHari = todayTrx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
  const saldoHari  = masukHari - keluarHari;
  const feeHari    = todayTrx.reduce((s,t)=>s+t.fee,0);

  // -- Normalize tgl dari berbagai format ----------------------------------
  const normTglBD = tgl => {
    if(!tgl) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
      // ISO: 2026-06-04 → convert ke id-ID format
      const [y,m,d] = tgl.split('-');
      return `${+d}/${+m}/${y}`;
    }
    // Sudah dalam format d/m/yyyy
    return tgl;
  };
  const tglToISO = tgl => {
    const n = normTglBD(tgl);
    const p = n.split('/');
    if(p.length===3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
    return tgl;
  };
  const matchTgl = (t, dateStr) => {
    // dateStr bisa berupa id-ID string atau ISO
    const tNorm = normTglBD(t.tgl);
    const dNorm = normTglBD(dateStr);
    return tNorm === dNorm || t.tgl === dateStr || tglToISO(t.tgl) === dateStr;
  };

  // Chart data builder
  const parseISO = s => new Date(s);
  const getChartData = () => {
    const now=new Date(); const pts=[];
    const addPt = (label, list) => {
      const m=list.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
      const k=list.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
      const f=list.reduce((s,t)=>s+t.fee,0);
      pts.push({label, masuk:m, keluar:k, saldo:m-k, trx:list.length, fee:f});
    };
    if(period==="custom"){
      const from=parseISO(dateFrom), to=parseISO(dateTo);
      to.setHours(23,59,59);
      const diff=Math.round((to-from)/(864e5))+1;
      if(diff<=31){
        for(let d=0;d<diff;d++){
          const dt=new Date(from); dt.setDate(from.getDate()+d);
          const str=dt.toLocaleDateString("id-ID");
          const lbl=dt.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"});
          const isoStr=dt.toISOString().split("T")[0];
          addPt(lbl, filtered.filter(t=>t.tgl===str||t.tgl===isoStr||normTglBD(t.tgl)===str));
        }
      } else {
        const cur=new Date(from.getFullYear(),from.getMonth(),1);
        while(cur<=to){
          const yr=cur.getFullYear(),mo=cur.getMonth();
          const lbl=cur.toLocaleDateString("id-ID",{month:"short",year:"2-digit"});
          addPt(lbl, filtered.filter(t=>{const d=new Date(t.tgl.split("/").reverse().join("-"));return d.getFullYear()===yr&&d.getMonth()===mo;}));
          cur.setMonth(mo+1);
        }
      }
    } else if(period==="daily"){
      for(let d=13;d>=0;d--){
        const dt=new Date(now);dt.setDate(now.getDate()-d);
        const str=dt.toLocaleDateString("id-ID");
        const iso=dt.toISOString().split("T")[0];
        addPt(dt.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"}), filtered.filter(t=>t.tgl===str||t.tgl===iso||normTglBD(t.tgl)===str));
      }
    } else {
      for(let m=11;m>=0;m--){
        const dt=new Date(now.getFullYear(),now.getMonth()-m,1);
        const yr=dt.getFullYear(),mo=dt.getMonth();
        addPt(dt.toLocaleDateString("id-ID",{month:"short",year:"2-digit"}),
          filtered.filter(t=>{const d=new Date(t.tgl.split("/").reverse().join("-"));return d.getFullYear()===yr&&d.getMonth()===mo;}));
      }
    }
    return pts;
  };

  const chartData = getChartData();
  const vals = chartData.map(p=>p[metric]);
  const total = filtered.reduce((s,t)=>s+(t.netNominal>0?t.netNominal:0),0);
  const totalK= filtered.reduce((s,t)=>s+(t.netNominal<0?Math.abs(t.netNominal):0),0);
  const totalFee = filtered.reduce((s,t)=>s+t.fee,0);

  // Top nama transaksi (hari ini)
  const namaMap = {};
  filtered.filter(t=>t.netNominal>0).forEach(t=>{
    if(!namaMap[t.nama]) namaMap[t.nama]={nama:t.nama,total:0,count:0};
    namaMap[t.nama].total+=t.netNominal; namaMap[t.nama].count++;
  });
  const topMasuk = Object.values(namaMap).sort((a,b)=>b.total-a.total).slice(0,5);
  const maxTop = topMasuk[0]?.total||1;

  const keluarMap = {};
  filtered.filter(t=>t.netNominal<0).forEach(t=>{
    if(!keluarMap[t.nama]) keluarMap[t.nama]={nama:t.nama,total:0,count:0};
    keluarMap[t.nama].total+=Math.abs(t.netNominal); keluarMap[t.nama].count++;
  });
  const topKeluar = Object.values(keluarMap).sort((a,b)=>b.total-a.total).slice(0,5);
  const maxTopK = topKeluar[0]?.total||1;

  // Outlet breakdown
  const outletData = outletNames.map(o=>{
    const list = bankTrx.filter(t=>t.outletId===o);
    return {nama:o, masuk:list.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0),
      keluar:list.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0),
      trx:list.length};
  });
  const maxOutlet = Math.max(...outletData.map(o=>o.masuk),1);

  const metrics = [
    {k:"masuk",  l:"Masuk",      c:"#0d9488"},
    {k:"keluar", l:"Keluar",     c:"#e74c3c"},
    {k:"saldo",  l:"Saldo",      c:"#8e44ad"},
    {k:"trx",    l:"Transaksi",  c:"#2980b9"},
    {k:"fee",    l:"Fee/Admin",  c:"#d97706"},
  ];
  const applyPreset = p => {
    const n=new Date();
    if(p==="today") {setDateFrom(n.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0]);}
    else if(p==="7d") {const d=new Date(n);d.setDate(n.getDate()-6);setDateFrom(d.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0]);}
    else if(p==="30d") {const d=new Date(n);d.setDate(n.getDate()-29);setDateFrom(d.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0]);}
    else if(p==="month") {const d=new Date(n.getFullYear(),n.getMonth(),1);setDateFrom(d.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0]);}
    else if(p==="year") {const d=new Date(n.getFullYear(),0,1);setDateFrom(d.toISOString().split("T")[0]);setDateTo(n.toISOString().split("T")[0]);}
    setPeriod("custom");
  };

  const curMetric = metrics.find(m=>m.k===metric)||metrics[0];
  const lastTwo = chartData.slice(-2);
  const trend = lastTwo.length===2?(lastTwo[1][metric]>=lastTwo[0][metric]?"up":"down"):"up";

  return (
    <div style={{fontFamily:"'Nunito',sans-serif",background:"#f0faf8",minHeight:"100vh"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box}@keyframes fadeUp{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}`}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",padding:"0 20px",minHeight:50,display:"flex",alignItems:"center",gap:12,position:"sticky",top:0,zIndex:100,boxShadow:"0 3px 16px rgba(13,148,136,.35)"}}>
        <><button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",marginRight:8}}>← Menu</button><div style={{fontWeight:900,fontSize:16,color:"#fff"}}>🏦 Dashboard Bank</div></>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
<button onClick={loadData} style={{background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.25)",borderRadius:20,padding:"5px 11px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}} title="Refresh">{loading?"⏳":"🔄"}</button>
          {lastRefresh&&<span style={{fontSize:10,color:"rgba(255,255,255,.5)",fontWeight:600}}>{lastRefresh}</span>}
          <select value={filterOutlet} onChange={e=>setFilterOutlet(e.target.value)}
            style={{padding:"5px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:700,fontSize:11,outline:"none",fontFamily:"inherit"}}>
            <option value="semua" style={{color:"#000"}}>Semua Outlet</option>
            {outletNames.map(o=><option key={o} value={o} style={{color:"#000"}}>{o}</option>)}
          </select>
        </div>
      </div>

      <div style={{padding:"16px 20px",maxWidth:1100,margin:"0 auto"}}>

        {/* KPI Cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16,animation:"fadeUp .3s ease"}}>
          {[
            {l:"Masuk Hari Ini",   v:fmtRp(masukHari),  c:"#0d9488",bg:"linear-gradient(135deg,#0a7a70,#0d9488)",txt:"#fff",icon:"⬇"},
            {l:"Keluar Hari Ini",  v:fmtRp(keluarHari), c:"#fff",   bg:"linear-gradient(135deg,#c0392b,#e74c3c)",txt:"#fff",icon:"⬆"},
            {l:"Saldo Hari Ini",   v:fmtRp(saldoHari),  c:"#fff",   bg:saldoHari>=0?"linear-gradient(135deg,#27ae60,#2ecc71)":"linear-gradient(135deg,#c0392b,#e74c3c)",txt:"#fff",icon:"💰"},
            {l:"Fee Hari Ini",     v:fmtRp(feeHari),    c:"#8e44ad",bg:"#fff",txt:"#8e44ad",icon:"💎",border:true},
          ].map(k=>(
            <div key={k.l} style={{background:k.bg,borderRadius:16,padding:"16px 18px",
              boxShadow:k.border?"none":"0 4px 18px rgba(0,0,0,.12)",
              border:k.border?"2px solid #e8d5f5":"none"}}>
              <div style={{fontSize:10,color:k.border?"#aaa":"rgba(255,255,255,.7)",fontWeight:700,
                textTransform:"uppercase",letterSpacing:".5px",marginBottom:4}}>
                {k.icon} {k.l}
              </div>
              <div style={{fontWeight:900,fontSize:22,color:k.border?k.txt:"#fff"}}>
                {k.v}
              </div>
              <div style={{fontSize:10,color:k.border?"#bbb":"rgba(255,255,255,.6)",marginTop:4}}>
                {todayTrx.filter(t=>t.netNominal>0).length} / {todayTrx.filter(t=>t.netNominal<0).length} trx
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,marginBottom:14,background:"#fff",borderRadius:12,padding:4,
          border:"2px solid #e0f5f1",width:"fit-content"}}>
          {[{k:"grafik",l:"📈 Grafik"},{k:"outlet",l:"🏪 Per Outlet"},{k:"transaksi",l:"💳 Top Transaksi"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{padding:"7px 18px",borderRadius:9,border:"none",fontWeight:700,fontSize:12,
                cursor:"pointer",fontFamily:"inherit",transition:"all .15s",
                background:tab===t.k?"linear-gradient(135deg,#0d9488,#14b8a6)":"transparent",
                color:tab===t.k?"#fff":"#888",
                boxShadow:tab===t.k?"0 3px 10px rgba(13,148,136,.3)":"none"}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* -- TAB GRAFIK -- */}
        {tab==="grafik"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{background:"#fff",borderRadius:16,padding:"20px 22px",
              border:"2px solid #e0f5f1",marginBottom:14,
              boxShadow:"0 2px 16px rgba(0,0,0,.04)"}}>
              {/* Chart header */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontWeight:900,fontSize:15,color:"#1a2e2a"}}>
                      {trend==="up"?"📈":"📉"} Grafik {curMetric.l}
                    </span>
                    <span style={{fontSize:11,fontWeight:700,color:trend==="up"?"#27ae60":"#e74c3c",
                      background:trend==="up"?"#e8f8f4":"#fff0f0",padding:"2px 9px",borderRadius:20}}>
                      {trend==="up"?"▲ Naik":"▼ Turun"}
                    </span>
                  </div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:3}}>
                    {period==="daily"?"14 Hari Terakhir":period==="monthly"?"12 Bulan Terakhir":"Periode Kustom"}
                  </div>
                </div>
                {/* Metric selector */}
                <div style={{display:"flex",gap:4,background:"#f0faf8",borderRadius:9,padding:4}}>
                  {metrics.map(m=>(
                    <button key={m.k} onClick={()=>setMetric(m.k)}
                      style={{padding:"5px 12px",borderRadius:7,border:"none",fontWeight:700,fontSize:11,
                        cursor:"pointer",fontFamily:"inherit",
                        background:metric===m.k?m.c:"transparent",
                        color:metric===m.k?"#fff":"#888",transition:"all .15s"}}>
                      {m.l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Period selector */}
              <div style={{marginBottom:16,background:"#f8fffe",borderRadius:12,padding:"14px 16px",border:"1px solid #e0f5f1"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:10}}>
                  <span style={{fontSize:11,fontWeight:700,color:"#555"}}>📅 Rentang:</span>
                  {[{k:"today",l:"Hari Ini"},{k:"7d",l:"7 Hari"},{k:"30d",l:"30 Hari"},{k:"month",l:"Bulan Ini"},{k:"year",l:"Tahun Ini"}].map(p=>(
                    <button key={p.k} onClick={()=>applyPreset(p.k)}
                      style={{padding:"4px 11px",borderRadius:20,border:"2px solid",
                        borderColor:"#b2ede6",background:"#fff",color:"#0d9488",
                        fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                      {p.l}
                    </button>
                  ))}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#555"}}>Dari:</span>
                    <input type="date" value={dateFrom} onChange={e=>{setDateFrom(e.target.value);setPeriod("custom");}}
                      style={{padding:"5px 9px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                  <span style={{fontSize:11,color:"#aaa"}}>s/d</span>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:11,fontWeight:700,color:"#555"}}>Sampai:</span>
                    <input type="date" value={dateTo} onChange={e=>{setDateTo(e.target.value);setPeriod("custom");}}
                      style={{padding:"5px 9px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                  </div>
                </div>
              </div>

              {/* Chart */}
              <BankChart data={chartData} metric={metric} color={curMetric.c}/>

              {/* Stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginTop:14}}>
                {[
                  {l:"Total Masuk",  v:fmtRp(total),        c:"#0d9488"},
                  {l:"Total Keluar", v:fmtRp(totalK),       c:"#e74c3c"},
                  {l:"Saldo Bersih", v:fmtRp(total-totalK), c:(total-totalK)>=0?"#27ae60":"#e74c3c"},
                  {l:"Total Fee",    v:fmtRp(totalFee),      c:"#d97706"},
                  {l:"Transaksi",    v:`${filtered.length} trx`, c:"#2980b9"},
                ].map(k=>(
                  <div key={k.l} style={{background:"#f8fffe",borderRadius:10,padding:"10px 13px",border:"1px solid #e0f5f1"}}>
                    <div style={{fontWeight:900,fontSize:15,color:k.c}}>{k.v}</div>
                    <div style={{fontSize:10,fontWeight:700,color:"#aaa",marginTop:2}}>{k.l}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -- TAB PER OUTLET -- */}
        {tab==="outlet"&&(
          <div style={{animation:"fadeUp .3s ease"}}>
            <div style={{background:"#fff",borderRadius:16,padding:"18px 20px",
              border:"2px solid #e0f5f1",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a2e2a",marginBottom:14}}>🏪 Perbandingan Outlet</div>
              {outletData.map((o,i)=>(
                <div key={o.nama} style={{marginBottom:18}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:6,alignItems:"center"}}>
                    <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>{o.nama}</div>
                    <div style={{fontSize:11,fontWeight:700,color:"#888"}}>{o.trx} transaksi</div>
                  </div>
                  {/* Masuk bar */}
                  <div style={{marginBottom:4}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:700,color:"#0d9488",marginBottom:3}}>
                      <span>⬇ Masuk</span><span>{fmtRp(o.masuk)}</span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:20,height:10,overflow:"hidden"}}>
                      <div style={{background:"linear-gradient(90deg,#0d9488,#14b8a6)",height:"100%",
                        width:`${Math.round(o.masuk/maxOutlet*100)}%`,borderRadius:20,
                        transition:"width .6s ease"}}/>
                    </div>
                  </div>
                  {/* Keluar bar */}
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontWeight:700,color:"#e74c3c",marginBottom:3}}>
                      <span>⬆ Keluar</span><span>{fmtRp(o.keluar)}</span>
                    </div>
                    <div style={{background:"#f0f0f0",borderRadius:20,height:10,overflow:"hidden"}}>
                      <div style={{background:"linear-gradient(90deg,#e74c3c,#ff6b6b)",height:"100%",
                        width:`${Math.round(o.keluar/maxOutlet*100)}%`,borderRadius:20,
                        transition:"width .6s ease"}}/>
                    </div>
                  </div>
                  {/* Saldo */}
                  <div style={{marginTop:6,display:"flex",gap:10}}>
                    <div style={{background:(o.masuk-o.keluar)>=0?"#e8f8f4":"#fff0f0",borderRadius:8,
                      padding:"4px 10px",fontSize:11,fontWeight:800,
                      color:(o.masuk-o.keluar)>=0?"#0d9488":"#e74c3c"}}>
                      Saldo: {fmtRp(o.masuk-o.keluar)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* -- TAB TOP TRANSAKSI -- */}
        {tab==="transaksi"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,animation:"fadeUp .3s ease"}}>
            {/* Top Masuk */}
            <div style={{background:"#fff",borderRadius:16,border:"2px solid #e0f5f1",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:"2px solid #e0f5f1",
                background:"linear-gradient(135deg,#e0faf5,#f0fdfb)"}}>
                <div style={{fontWeight:800,fontSize:14,color:"#0d9488"}}>⬇ Top Sumber Masuk</div>
                <div style={{fontSize:10,color:"#aaa",marginTop:2}}>Periode yang dipilih</div>
              </div>
              {topMasuk.map((t,i)=>(
                <div key={t.nama} style={{padding:"10px 16px",borderTop:i>0?"1px solid #f0faf8":"none",
                  background:i%2===0?"#fff":"#fafffe"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:26,height:26,borderRadius:8,background:"#e0faf5",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:900,fontSize:12,color:"#0d9488",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nama}</div>
                      <div style={{background:"#f0f0f0",borderRadius:20,height:4,marginTop:4,overflow:"hidden"}}>
                        <div style={{background:"linear-gradient(90deg,#0d9488,#14b8a6)",height:"100%",
                          width:`${Math.round(t.total/maxTop*100)}%`,borderRadius:20}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:900,fontSize:12,color:"#0d9488"}}>{fmtRp(t.total)}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>{t.count}x</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top Keluar */}
            <div style={{background:"#fff",borderRadius:16,border:"2px solid #ffe0e0",overflow:"hidden"}}>
              <div style={{padding:"14px 16px",borderBottom:"2px solid #ffe0e0",
                background:"linear-gradient(135deg,#fff5f5,#fffafa)"}}>
                <div style={{fontWeight:800,fontSize:14,color:"#e74c3c"}}>⬆ Top Sumber Keluar</div>
                <div style={{fontSize:10,color:"#aaa",marginTop:2}}>Periode yang dipilih</div>
              </div>
              {topKeluar.map((t,i)=>(
                <div key={t.nama} style={{padding:"10px 16px",borderTop:i>0?"1px solid #fff5f5":"none",
                  background:i%2===0?"#fff":"#fffafa"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:26,height:26,borderRadius:8,background:"#fff0f0",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontWeight:900,fontSize:12,color:"#e74c3c",flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nama}</div>
                      <div style={{background:"#f0f0f0",borderRadius:20,height:4,marginTop:4,overflow:"hidden"}}>
                        <div style={{background:"linear-gradient(90deg,#e74c3c,#ff6b6b)",height:"100%",
                          width:`${Math.round(t.total/maxTopK*100)}%`,borderRadius:20}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontWeight:900,fontSize:12,color:"#e74c3c"}}>{fmtRp(t.total)}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>{t.count}x</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// -- Connection Status Bar -----------------------------------------------------
function ConnStatusBar({ status, lastPing, offlineQueue }) {
  if(status==="online") return null; // Tidak tampil saat normal

  const cfg = {
    offline:      { bg:"#dc2626", icon:"📵", text:"Tidak Ada Koneksi -- Transaksi tersimpan lokal, akan dikirim saat online",  pulse:true  },
    reconnecting: { bg:"#d97706", icon:"🔄", text:"Menghubungkan kembali...",                                                  pulse:true  },
    slow:         { bg:"#b45309", icon:"⚠️",  text:`Koneksi Lambat (${lastPing||"..."}ms) -- Data mungkin tertunda`,          pulse:false },
    warn:         { bg:"#ca8a04", icon:"⚡",  text:`Sinyal Lemah (${lastPing||"..."}ms)`,                                      pulse:false },
  }[status]||{ bg:"#dc2626", icon:"📵", text:"Koneksi Bermasalah", pulse:true };

  return (
    <div style={{
      position:"fixed", top:0, left:0, right:0, zIndex:99999,
      background:cfg.bg, padding:"7px 16px",
      display:"flex", alignItems:"center", gap:10,
      boxShadow:"0 3px 12px rgba(0,0,0,.3)",
      animation: cfg.pulse?"pulse-bar 1.5s infinite":"none",
    }}>
      <style>{`@keyframes pulse-bar{0%,100%{opacity:1}50%{opacity:.75}}`}</style>
      <span style={{fontSize:16}}>{cfg.icon}</span>
      <span style={{fontWeight:700, fontSize:12, color:"#fff", flex:1}}>{cfg.text}</span>
      {offlineQueue?.length>0&&(
        <span style={{background:"rgba(255,255,255,.2)", borderRadius:20, padding:"2px 10px",
          fontSize:11, fontWeight:800, color:"#fff"}}>
          {offlineQueue.length} antrian
        </span>
      )}
      {lastPing&&status==="slow"&&(
        <span style={{fontSize:10, color:"rgba(255,255,255,.7)"}}>{lastPing}ms</span>
      )}
    </div>
  );
}

function PulseDotM({color="#27ae60",size=8}){
  return(
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",width:size+6,height:size+6}}>
      <span style={{position:"absolute",width:size+6,height:size+6,borderRadius:"50%",background:color,opacity:.3,animation:"pulseM 1.5s infinite"}}/>
      <span style={{width:size,height:size,borderRadius:"50%",background:color,display:"block"}}/>
      <style>{`@keyframes pulseM{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.6);opacity:0}}`}</style>
    </span>
  );
}

function MonitorPage({ user, outlets, transactions, stocks: stocksProp, products: productsProp, prodOrder: prodOrderProp, onBack, notify }) {
  const isMonitorRole = user?.role==="monitor";
  const monitorOutletIds = user?.outletIds||[];
  const visibleOutlets = isMonitorRole && monitorOutletIds.length>0
    ? outlets.filter(o=>monitorOutletIds.includes(o.id))
    : outlets;

  const [clock,       setClock]      = useState(now());
  const [kasirShifts, setKasirShifts]= useState([]);
  const [bankShifts,  setBankShifts] = useState([]);
  const [bankTrxList, setBankTrxList]= useState([]);
  const [resetLog,    setResetLog]   = useState([]);
  const [filterOutlet,setFilterOutlet]= useState("semua");
  const [filterBank,  setFilterBank] = useState("semua");
  const [expandLog,   setExpandLog]  = useState(null);
  const [loading,     setLoading]    = useState(true);

  // -- Tab monitor --
  const [monitorTab,   setMonitorTab]  = useState("live"); // live|stok|compare

  // -- Live Stok state --
  const [liveStocks,   setLiveStocks]  = useState(stocksProp||{});
  const [liveProducts, setLiveProducts]= useState(productsProp||[]);
  const [liveProdOrder,setLiveProdOrder]= useState(prodOrderProp||null);
  const [stokOutlet,   setStokOutlet]  = useState("semua");
  const [stokSearch,   setStokSearch]  = useState("");
  const [stokSort,     setStokSort]    = useState("urutan"); // urutan|nama|stok_asc|stok_desc|modal
  const [stokFilter,   setStokFilter]  = useState("semua");

  // Sync props kalau berubah dari parent (termasuk prodOrder)
  useEffect(()=>{ if(stocksProp)        setLiveStocks(stocksProp); },[stocksProp]);
  useEffect(()=>{ if(productsProp?.length) setLiveProducts(productsProp); },[productsProp]);
  useEffect(()=>{ if(prodOrderProp)     setLiveProdOrder(prodOrderProp); },[prodOrderProp]);

  useEffect(()=>{ const iv=setInterval(()=>setClock(now()),1000); return()=>clearInterval(iv); },[]);

  useEffect(()=>{
    const load = async () => {
      try {
        // Load active shifts -- ambil semua, filter di frontend
        const {data:shifts,error} = await supabase.from('active_shifts').select('*');
        if(!error) setKasirShifts(shifts||[]);
        const allBankTrx = await dbBank.getTransactions();
        setBankTrxList(allBankTrx);
        // Load active bank shifts
        const {data:bShifts} = await supabase.from('bank_shifts').select('*');
        setBankShifts(bShifts||[]);
        // Load reset logs
        try {
          const {data:rlogs} = await supabase.from('reset_logs').select('*')
            .order('created_at',{ascending:false}).limit(30);
          setResetLog(rlogs||[]);
        }catch{}
      } catch(e){ console.error('MonitorPage load error:',e); }
      setLoading(false);
    };
    load();

    const chShift = supabase.channel('monitor-shifts')
      .on('postgres_changes',{event:'*',schema:'public',table:'active_shifts'},async()=>{
        try{ const {data} = await supabase.from('active_shifts').select('*'); setKasirShifts(data||[]); }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_shifts'},async()=>{
        try{ const {data} = await supabase.from('bank_shifts').select('*'); setBankShifts(data||[]); }catch{}
      })
      .subscribe();

    const chTrx = supabase.channel('monitor-trx')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'transactions'},()=>{
        supabase.from('active_shifts').select('*').then(({data})=>{ if(data) setKasirShifts(data); });
      }).subscribe();

    // Realtime bank transactions
    const chBank = supabase.channel('monitor-bank')
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_transactions'},(payload)=>{
        if(payload.eventType==='INSERT'&&payload.new){
          const r=payload.new;
          const t={id:r.id,waktu:r.waktu,tgl:r.tgl,shiftId:r.shift_id,nama:r.nama,jenis:r.jenis,feeType:r.fee_type,fee:r.fee,nominal:r.nominal,netNominal:r.net_nominal,outletId:r.outlet_id};
          setBankTrxList(prev=>prev.find(x=>x.id===t.id)?prev:[t,...prev]);
        } else if(payload.eventType==='DELETE'){
          setBankTrxList(prev=>prev.filter(t=>t.id!==payload.old?.id));
        }
      }).subscribe();

    return()=>{ supabase.removeChannel(chShift); supabase.removeChannel(chTrx); supabase.removeChannel(chBank); };
  },[]);

  // -- Realtime stok listener --
  useEffect(()=>{
    // Load fresh stok dari DB
    const loadStok = async () => {
      try {
        const { data:stokRows } = await supabase.from('stocks').select('*');
        if(stokRows) {
          const map = {};
          stokRows.forEach(r=>{ if(!map[r.outlet_id]) map[r.outlet_id]={}; map[r.outlet_id][r.product_id]=r.qty??0; });
          setLiveStocks(map);
        }
        const { data:prodRows } = await supabase.from('products').select('*');
        if(prodRows) setLiveProducts(prodRows);
        // Load urutan produk
        const ord = await dbProductOrder.getOrder().catch(()=>[]);
        if(ord&&ord.length) setLiveProdOrder(ord.map(String));
      } catch(e){ console.warn('loadStok monitor:',e); }
    };
    loadStok();

    const chStok = supabase.channel('monitor-stok-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'stocks'},(p)=>{
        const r = p.new||p.old;
        if(!r) return;
        if(p.eventType==='DELETE'){
          setLiveStocks(prev=>{ const n={...prev}; if(n[r.outlet_id]) { n[r.outlet_id]={...n[r.outlet_id]}; delete n[r.outlet_id][r.product_id]; } return n; });
        } else {
          setLiveStocks(prev=>({ ...prev, [r.outlet_id]:{ ...(prev[r.outlet_id]||{}), [r.product_id]:r.qty??0 } }));
        }
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},(p)=>{
        const r=p.new||p.old;
        if(!r) return;
        if(p.eventType==='DELETE') setLiveProducts(prev=>prev.filter(x=>x.id!==r.id));
        else if(p.eventType==='INSERT') setLiveProducts(prev=>[...prev.filter(x=>x.id!==r.id),r]);
        else setLiveProducts(prev=>prev.map(x=>x.id===r.id?{...x,...r}:x));
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'product_order'},()=>{
        // Urutan produk diubah dari menu Produk & Stok — sync ke monitor
        dbProductOrder.getOrder().then(ord=>{
          if(ord&&ord.length) setLiveProdOrder(ord.map(String));
        }).catch(()=>{});
      })
      .subscribe();
    return()=>supabase.removeChannel(chStok);
  },[]);

  // Hitung cash laci per kasir dari transaksi hari ini
  const calcOmsetShift = (shiftId) => {
    return transactions
      .filter(t=>t.shiftId===shiftId)
      .reduce((s,t)=>{ const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0); return s+t.total-rv; },0);
  };
  const calcTrxShift = (shiftId) => transactions.filter(t=>t.shiftId===shiftId).length;

  // Hitung uang sistem bank per outlet -- hanya dari shift yang AKTIF sekarang
  const getBankStats = (outletId) => {
    // Ambil semua shift aktif di outlet ini
    const activeShiftIds = bankShifts
      .filter(s=>s.outlet_id===outletId)
      .map(s=>s.id);
    // Kalau ada shift aktif, filter transaksi dari shift itu saja
    // Kalau tidak ada shift aktif, tampilkan 0 (bukan semua history)
    const list = activeShiftIds.length>0
      ? bankTrxList.filter(t=>t.outletId===outletId && activeShiftIds.includes(t.shiftId))
      : [];
    const masuk  = list.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
    const keluar = list.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
    // Tambahkan cashKemb dari setiap shift aktif
    const cashKemb = bankShifts
      .filter(s=>s.outlet_id===outletId)
      .reduce((s,sh)=>s+(sh.saldo_data?.cashKemb||sh.saldo_data?.cashKembalian||0),0);
    return {
      uangSistem: cashKemb+masuk-keluar,
      cashKemb, totalMasuk:masuk, totalKeluar:keluar,
      trx:list.length, list,
      activeShifts: bankShifts.filter(s=>s.outlet_id===outletId),
      activeShiftCount: activeShiftIds.length,
    };
  };

  // Transaksi kasir hari ini terurut terbaru
  const todayTrx = transactions.filter(t=>t.date===today())
    .sort((a,b)=>(b.time||"").localeCompare(a.time||""))
    .slice(0,50);

  const filteredTrx  = filterOutlet==="semua" ? todayTrx  : todayTrx.filter(t=>String(t.outletId)===String(filterOutlet));
  const filteredBank = filterBank==="semua"   ? bankTrxList : bankTrxList.filter(t=>String(t.outletId)===String(filterBank));

  // Grand totals -- dari visibleOutlets saja
  const totalOmset      = todayTrx.reduce((s,t)=>{ const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0); return s+t.total-rv; },0);
  const totalBankSistem = visibleOutlets.reduce((s,o)=>s+getBankStats(o.id).uangSistem,0);

  const outletColor = (id) => {
    const colors={};
    outlets.forEach((o,i)=>{ colors[String(o.id)]=["#0d9488","#2980b9","#8e44ad","#27ae60","#e67e22"][i]||"#0d9488"; });
    return colors[String(id)]||"#0d9488";
  };

  // -- Stok helpers --
  // Produk diurutkan sesuai prodOrder (identik dengan menu Produk & Stok)
  const orderedProducts = liveProdOrder && liveProdOrder.length
    ? [...liveProdOrder.map(id=>liveProducts.find(p=>String(p.id)===String(id))).filter(Boolean),
       ...liveProducts.filter(p=>!liveProdOrder.map(String).includes(String(p.id)))]
    : liveProducts;

  const getStokStats = (outletId) => {
    const s = liveStocks[outletId]||{};
    const items = liveProducts.map(p=>({ ...p, qty:s[p.id]??0, nilai:(s[p.id]??0)*(p.modal||0) }));
    return {
      total:   items.reduce((a,p)=>a+p.qty,0),
      modal:   items.reduce((a,p)=>a+p.nilai,0),
      habis:   items.filter(p=>p.qty===0).length,
      menipis: items.filter(p=>p.qty>0&&p.qty<=5).length,
      items,
    };
  };

  const getStokFiltered = (outletId) => {
    const s = liveStocks[outletId]||{};
    // Mulai dari orderedProducts agar urutan sama persis dengan menu Produk & Stok
    let list = orderedProducts.map(p=>({ ...p, qty:s[p.id]??0, nilai:(s[p.id]??0)*(p.modal||0) }));
    if(stokFilter==="habis")   list = list.filter(p=>p.qty===0);
    if(stokFilter==="menipis") list = list.filter(p=>p.qty>0&&p.qty<=5);
    if(stokSearch) list = list.filter(p=>p.name?.toLowerCase().includes(stokSearch.toLowerCase())||p.category?.toLowerCase().includes(stokSearch.toLowerCase()));
    // "urutan" = urutan prodOrder, tidak di-sort ulang
    if(stokSort==="stok_asc")  list.sort((a,b)=>a.qty-b.qty);
    else if(stokSort==="stok_desc") list.sort((a,b)=>b.qty-a.qty);
    else if(stokSort==="modal") list.sort((a,b)=>b.nilai-a.nilai);
    else if(stokSort==="nama") list.sort((a,b)=>(a.name||"").localeCompare(b.name||""));
    // stokSort==="urutan" -> tidak diapa-apakan, urutan prodOrder dipertahankan
    return list;
  };

  // Total stok semua outlet untuk KPI
  const totalStokAll  = visibleOutlets.reduce((s,o)=>s+getStokStats(o.id).total,0);
  const totalModalAll = visibleOutlets.reduce((s,o)=>s+getStokStats(o.id).modal,0);
  const totalHabis    = visibleOutlets.reduce((s,o)=>s+getStokStats(o.id).habis,0);

  if(loading) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <PulseDotM color="#0d9488" size={16}/>
        <div style={{fontWeight:700,fontSize:14,color:"#0d9488",marginTop:12}}>Menghubungkan ke server...</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif",color:"#1a2e2a"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 16px rgba(13,148,136,.3)"}}>
        <div style={{padding:"0 20px",display:"flex",alignItems:"center",gap:12,minHeight:52}}>
          {!isMonitorRole&&(
            <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Menu</button>
          )}
          <div style={{flex:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <PulseDotM color="#2ecc71" size={7}/>
              <span style={{fontWeight:900,fontSize:15,color:"#fff"}}>Monitor Penjualan Live</span>
              {isMonitorRole&&<span style={{fontSize:10,color:"rgba(255,255,255,.6)",background:"rgba(255,255,255,.1)",padding:"2px 8px",borderRadius:20}}>👁 Monitor</span>}
            </div>
          </div>
          {isMonitorRole&&(
            <button onClick={()=>{try{localStorage.removeItem('ammar_user');}catch{}window.location.reload();}}
              style={{background:"rgba(255,100,100,.25)",border:"1px solid rgba(255,100,100,.4)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
              Logout
            </button>
          )}
          <div style={{fontFamily:"monospace",fontWeight:900,fontSize:17,color:"#fff",background:"rgba(0,0,0,.2)",padding:"5px 14px",borderRadius:20,letterSpacing:"1px"}}>{clock}</div>
        </div>

        {/* KPI bar */}
        <div style={{background:"rgba(0,0,0,.12)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"7px 20px",display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
          {[
            {l:"Kasir Aktif",        v:`${kasirShifts.filter(s=>visibleOutlets.some(o=>String(o.id)===String(s.outlet_id))).length} shift`,    c:"#a7f3d0"},
            {l:"Omset Kasir Hari Ini", v:fmtRp(totalOmset),           c:"#fcd34d"},
            {l:"Transaksi Hari Ini",   v:`${todayTrx.length} trx`,    c:"#fff"},
            {l:"Uang Sistem Bank",     v:fmtRp(totalBankSistem),       c:"#bfdbfe"},
            {l:"Grand Total",          v:fmtRp(totalOmset+totalBankSistem), c:"#fca5a5"},
          ].map(k=>(
            <div key={k.l} style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:13,color:k.c}}>{k.v}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.6)",fontWeight:600,marginTop:1}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* ── Tab bar ── */}
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.1)"}}>
          {[
            {k:"live",   icon:"🔴", label:"Live Kasir & Bank"},
            {k:"stok",   icon:"📦", label:"Stok per Outlet",  badge:totalHabis>0?`${totalHabis} habis`:null, badgeColor:"#fca5a5"},
            {k:"compare",icon:"⚖️", label:"Compare Outlet"},
          ].map(t=>(
            <button key={t.k} onClick={()=>setMonitorTab(t.k)}
              style={{flex:1,padding:"9px 8px",border:"none",background:"transparent",
                color:monitorTab===t.k?"#fff":"rgba(255,255,255,.5)",fontWeight:700,fontSize:11,
                cursor:"pointer",fontFamily:"inherit",
                borderBottom:`3px solid ${monitorTab===t.k?"#fff":"transparent"}`,
                transition:"all .15s",display:"flex",alignItems:"center",justifyContent:"center",gap:5,whiteSpace:"nowrap"}}>
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.badge&&<span style={{fontSize:9,background:"rgba(255,100,100,.4)",borderRadius:20,padding:"1px 6px",fontWeight:800,color:"#fff"}}>{t.badge}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"14px 20px",maxWidth:1300,margin:"0 auto"}}>

        {/* ══════════════════════════════════════════════════
            TAB: LIVE KASIR & BANK (tampilan tidak diubah)
        ══════════════════════════════════════════════════ */}
        {monitorTab==="live" && (<>

        {/* -- KASIR AKTIF -- */}
        <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <PulseDotM color="#0d9488" size={7}/>
          <div style={{fontWeight:800,fontSize:14,color:"#0d9488"}}>Kasir & Bank Aktif -- Semua Outlet</div>
        </div>

        {visibleOutlets.map((outlet,oi)=>{
          // Bandingkan sebagai string agar tidak gagal karena type mismatch int vs string
          const shifts = kasirShifts.filter(s=>String(s.outlet_id)===String(outlet.id));
          const bank   = getBankStats(outlet.id);
          const oc     = outletColor(outlet.id);
          if(shifts.length===0&&bank.activeShiftCount===0&&bank.trx===0) return null;
          return (
            <div key={outlet.id} style={{marginBottom:16}}>
              {/* Outlet header */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"7px 14px",background:oc+"12",borderRadius:10,border:`1px solid ${oc}25`}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:oc}}/>
                <div style={{fontWeight:800,fontSize:13,color:oc}}>{outlet.nama}</div>
                <div style={{fontSize:11,color:"#888",marginLeft:"auto",display:"flex",gap:10}}>
                  <span>{shifts.length} kasir aktif</span>
                  {bank.activeShiftCount>0&&<span style={{color:"#2980b9",fontWeight:700}}>. {bank.activeShiftCount} shift bank aktif</span>}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:`repeat(${Math.min(shifts.length+1,4)},1fr)`,gap:12}}>
                {/* Kasir cards */}
                {shifts.map(sh=>{
                  const omset = calcOmsetShift(sh.id);
                  const trxCount = calcTrxShift(sh.id);
                  const sd = sh.saldo_data||{};
                  return (
                    <div key={sh.id} style={{background:"#fff",borderRadius:14,padding:"14px 16px",border:`2px solid #e0f5f1`,position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${oc},${oc}88)`}}/>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                        <PulseDotM color="#27ae60" size={6}/>
                        <div>
                          <div style={{fontWeight:900,fontSize:14,color:"#1a2e2a"}}>{sh.user_id}</div>
                          <div style={{fontSize:10,color:"#aaa"}}>Shift {sh.nama} . Buka {sh.start_time?.substring(11,16)||"--"}</div>
                        </div>
                      </div>

                      {/* Cash laci -- fokus utama */}
                      <div style={{background:`linear-gradient(135deg,#0d9488,#14b8a6)`,borderRadius:11,padding:"11px 14px",marginBottom:10}}>
                        <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.7)",marginBottom:3}}>💵 CASH DI LACI</div>
                        <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(omset)}</div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,.6)",marginTop:2}}>*estimasi dari omset shift</div>
                      </div>

                      {/* Saldo aplikasi awal */}
                      {sd.totalSaldoApps>0&&(
                        <div style={{background:"#f0faf8",borderRadius:9,padding:"8px 11px",marginBottom:8,display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:11,color:"#555",fontWeight:600}}>Saldo Apl Awal</span>
                          <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>{fmtRp(sd.totalSaldoApps)}</span>
                        </div>
                      )}

                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
                        <div style={{background:"#f0faf8",borderRadius:9,padding:"8px 10px"}}>
                          <div style={{fontSize:9,color:"#aaa",fontWeight:600}}>OMSET</div>
                          <div style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>{fmtRp(omset)}</div>
                        </div>
                        <div style={{background:"#f0faf8",borderRadius:9,padding:"8px 10px"}}>
                          <div style={{fontSize:9,color:"#aaa",fontWeight:600}}>TRANSAKSI</div>
                          <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a"}}>{trxCount} trx</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Bank cards -- per shift aktif */}
                {bank.activeShifts.map(bsh=>{
                  const sd    = bsh.saldo_data||{};
                  const shTrx = bankTrxList.filter(t=>t.shiftId===bsh.id);
                  const sMasuk  = shTrx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
                  const sKeluar = shTrx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
                  const cashKemb = sd.cashKemb||sd.cashKembalian||0;
                  const uangSistemShift = cashKemb + sMasuk - sKeluar;
                  return (
                  <div key={bsh.id} style={{background:"#fff",borderRadius:14,padding:"14px 16px",border:`2px solid #dde8f0`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#1a2e2a,#2980b9)"}}/>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}>
                      <PulseDotM color="#2980b9" size={6}/>
                      <div>
                        <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>🏦 Bank -- {sd.namaShift||bsh.nama||bsh.user_id||"Shift"}</div>
                        <div style={{fontSize:10,color:"#aaa"}}>Buka {fmtT(bsh.start_time)} . {shTrx.length} trx</div>
                      </div>
                    </div>
                    <div style={{background:"linear-gradient(135deg,#1a2e2a,#2d4a44)",borderRadius:11,padding:"11px 14px",marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",marginBottom:3}}>UANG SISTEM</div>
                      <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(uangSistemShift)}</div>
                      {cashKemb>0&&<div style={{fontSize:9,color:"rgba(255,255,255,.5)",marginTop:2}}>Cash kemb {fmtRp(cashKemb)} + net trx</div>}
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                      <div style={{background:"#e8f8f0",borderRadius:9,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#27ae60",fontWeight:700}}>MASUK</div>
                        <div style={{fontWeight:800,fontSize:11,color:"#27ae60"}}>{fmtRp(sMasuk)}</div>
                      </div>
                      <div style={{background:"#fff0f0",borderRadius:9,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#e74c3c",fontWeight:700}}>KELUAR</div>
                        <div style={{fontWeight:800,fontSize:11,color:"#e74c3c"}}>{fmtRp(sKeluar)}</div>
                      </div>
                      <div style={{background:"#f0faf8",borderRadius:9,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#aaa",fontWeight:700}}>TRX</div>
                        <div style={{fontWeight:800,fontSize:11,color:"#1a2e2a"}}>{shTrx.length}</div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* -- TRANSAKSI KASIR + RIWAYAT BANK berdampingan -- */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,marginTop:4}}>

          {/* Transaksi Kasir */}
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"12px 16px",borderBottom:"2px solid #e0f5f1",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <PulseDotM color="#0d9488" size={7}/>
                <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>Transaksi Kasir Berjalan</span>
                <span style={{background:"#e0faf5",color:"#0d9488",fontWeight:800,fontSize:11,padding:"1px 8px",borderRadius:20}}>{filteredTrx.length}</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[{k:"semua",l:"Semua"},...visibleOutlets.map(o=>({k:o.id,l:o.nama.replace("Ammar Cell ","")}))].map(f=>(
                  <button key={f.k} onClick={()=>setFilterOutlet(f.k)}
                    style={{padding:"3px 10px",borderRadius:20,border:`2px solid ${filterOutlet===f.k?"#0d9488":"#b2ede6"}`,background:filterOutlet===f.k?"#0d9488":"transparent",color:filterOutlet===f.k?"#fff":"#0d9488",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{overflowY:"auto",flex:1,maxHeight:400}}>
              {filteredTrx.length===0 ? (
                <div style={{textAlign:"center",color:"#ccc",padding:32,fontSize:13}}>Belum ada transaksi hari ini</div>
              ):filteredTrx.map((t,i)=>{
                const oc = outletColor(t.outletId);
                const outletNama = outlets.find(o=>o.id===t.outletId)?.nama?.replace("Ammar Cell ","") || t.outletId;
                const items = t.items||[];
                return (
                  <div key={t.id} style={{padding:"9px 14px",borderTop:i>0?"1px solid #f0faf8":"none",background:i%2===0?"#fff":"#fafffe",display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:oc+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:800,color:oc,flexShrink:0}}>
                      {String(i+1).padStart(2,"0")}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                        <div>
                          <div style={{fontWeight:700,fontSize:12,color:"#1a2e2a"}}>{items.map(it=>it.name).join(", ").substring(0,35)||"--"}</div>
                          <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{t.kasir||t.shiftNama} . {t.time||"--"}</div>
                        </div>
                        <div style={{textAlign:"right",flexShrink:0}}>
                          <div style={{fontWeight:900,fontSize:13,color:"#0d9488"}}>{fmtRp(t.total)}</div>
                          <div style={{fontSize:9,fontWeight:700,color:oc,background:oc+"15",padding:"1px 6px",borderRadius:20,marginTop:2,display:"inline-block"}}>{outletNama}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Riwayat Bank */}
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"12px 16px",borderBottom:"2px solid #e0f5f1",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,flexShrink:0}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <PulseDotM color="#1a2e2a" size={7}/>
                <span style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>Riwayat Transaksi Bank</span>
                <span style={{background:"#f0f0f0",color:"#555",fontWeight:800,fontSize:11,padding:"1px 8px",borderRadius:20}}>{filteredBank.length}</span>
              </div>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[{k:"semua",l:"Semua"},...visibleOutlets.map(o=>({k:o.id,l:o.nama.replace("Ammar Cell ","")}))].map(f=>(
                  <button key={f.k} onClick={()=>setFilterBank(f.k)}
                    style={{padding:"3px 10px",borderRadius:20,border:`2px solid ${filterBank===f.k?"#1a2e2a":"#b2ede6"}`,background:filterBank===f.k?"#1a2e2a":"transparent",color:filterBank===f.k?"#fff":"#555",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>
                    {f.l}
                  </button>
                ))}
              </div>
            </div>
            <div style={{overflowY:"auto",flex:1,maxHeight:400}}>
              {filteredBank.length===0 ? (
                <div style={{textAlign:"center",color:"#ccc",padding:32,fontSize:13}}>Belum ada transaksi bank</div>
              ):filteredBank.map((t,i)=>{
                const isIn = t.netNominal>0;
                const oc = outletColor(t.outletId);
                const outletNama = outlets.find(o=>o.id===t.outletId)?.nama?.replace("Ammar Cell ","") || t.outletId;
                return (
                  <div key={t.id} style={{padding:"9px 14px",borderTop:i>0?"1px solid #f0faf8":"none",background:i%2===0?"#fff":"#fafffe",display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:32,height:32,borderRadius:9,background:isIn?"#e0faf5":"#fff0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>
                      {isIn?"⬇":"⬆"}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nama}</div>
                      <div style={{fontSize:10,color:"#aaa",marginTop:1}}>
                        {t.waktu}
                        {t.feeType==="fee"&&<span style={{color:"#0d9488",fontWeight:700,marginLeft:5}}>+fee {fmtRp(t.fee)}</span>}
                        {t.feeType==="dipotong"&&t.fee>0&&<span style={{color:"#e74c3c",fontWeight:700,marginLeft:5}}>−{fmtRp(t.fee)}</span>}
                      </div>
                    </div>
                    <div style={{flexShrink:0,textAlign:"right"}}>
                      <div style={{fontWeight:900,fontSize:13,color:isIn?"#0d9488":"#e74c3c"}}>{isIn?"+":""}{fmtRp(Math.abs(t.netNominal))}</div>
                      <div style={{fontSize:9,fontWeight:700,color:oc,background:oc+"15",padding:"1px 6px",borderRadius:20,marginTop:2,display:"inline-block"}}>{outletNama}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel 3: Log Auto Reset 23:00 */}
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"12px 16px",borderBottom:"2px solid #e0f5f1",display:"flex",alignItems:"center",gap:7,flexShrink:0}}>
              <span style={{fontSize:14}}>⏰</span>
              <span style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>Log Auto Reset 23:00</span>
              <span style={{background:"#f0f0f0",color:"#555",fontWeight:800,fontSize:11,padding:"1px 8px",borderRadius:20,marginLeft:"auto"}}>{resetLog.length} hari</span>
            </div>
            <div style={{overflowY:"auto",flex:1,maxHeight:400}}>
              {resetLog.length===0?(
                <div style={{textAlign:"center",color:"#ccc",padding:32,fontSize:13}}>Belum ada log reset otomatis</div>
              ):resetLog.map((r,i)=>{
                const detail = r.detail||{};
                const kasirShiftList = detail.kasir||[];
                const bankShiftList  = detail.bank||[];
                const allShifts = [...kasirShiftList,...bankShiftList];
                return(
                  <div key={r.id} style={{borderTop:i>0?"1px solid #f0faf8":"none"}}>
                    <div onClick={()=>setExpandLog(expandLog===r.id?null:r.id)}
                      style={{display:"flex",alignItems:"center",gap:8,padding:"9px 14px",cursor:"pointer",background:expandLog===r.id?"#f0fdf9":"#fff",transition:"background .2s"}}>
                      <div style={{width:30,height:30,borderRadius:8,background:"#e8f8f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✓</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:12,color:"#1a2e2a"}}>{r.tgl}</div>
                        <div style={{fontSize:10,color:"#aaa"}}>Jam {r.waktu} . {r.jumlah_shift||allShifts.length} shift ditutup</div>
                      </div>
                      <div style={{fontSize:11,color:"#aaa"}}>{expandLog===r.id?"▲":"▼"}</div>
                    </div>
                    {expandLog===r.id&&(
                      <div style={{background:"#f8fffe",borderTop:"1px solid #e0f5f1",padding:"8px 14px 10px"}}>
                        {allShifts.length===0?(
                          <div style={{fontSize:11,color:"#aaa"}}>Detail tidak tersedia</div>
                        ):allShifts.map((s,si)=>(
                          <div key={si} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:si<allShifts.length-1?"1px dashed #e0f5f1":"none"}}>
                            <span style={{color:"#555",fontWeight:600}}>{s.user_id||s.user} . {outlets.find(o=>o.id===s.outlet_id)?.nama?.replace("Ammar Cell ","")||s.outlet||s.outlet_id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        <div style={{textAlign:"center",marginTop:12,fontSize:10,color:"#aaa",fontWeight:600}}>
          🔴 LIVE -- Supabase Realtime . Auto reset jam 23:00 setiap hari
        </div>

        </>)} {/* END monitorTab==="live" */}

        {/* ══════════════════════════════════════════════════
            TAB: STOK PER OUTLET
        ══════════════════════════════════════════════════ */}
        {monitorTab==="stok" && (
          <div>
            {/* Filter bar */}
            <div style={{background:"#fff",borderRadius:12,border:"2px solid #e0f5f1",padding:"10px 14px",marginBottom:14,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              {/* Outlet pills */}
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                {[{k:"semua",l:"Semua",c:"#0d9488"},...visibleOutlets.map((o,i)=>({k:String(o.id),l:o.nama.replace("Ammar Cell ",""),c:["#0d9488","#2980b9","#8e44ad","#27ae60","#e67e22"][i]||"#0d9488"}))].map(f=>(
                  <button key={f.k} onClick={()=>setStokOutlet(f.k)}
                    style={{padding:"4px 13px",borderRadius:20,border:`2px solid ${stokOutlet===f.k?f.c:"#e0f5f1"}`,
                      background:stokOutlet===f.k?f.c:"transparent",color:stokOutlet===f.k?"#fff":f.c,
                      fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                    {f.l}
                  </button>
                ))}
              </div>
              <div style={{width:1,height:20,background:"#e0f5f1",flexShrink:0}}/>
              {/* Status filter */}
              {[{k:"semua",l:"Semua"},{k:"menipis",l:"⚠️ Menipis"},{k:"habis",l:"🔴 Habis"}].map(f=>(
                <button key={f.k} onClick={()=>setStokFilter(f.k)}
                  style={{padding:"4px 12px",borderRadius:20,border:`2px solid ${stokFilter===f.k?"#e74c3c":"#e0f5f1"}`,
                    background:stokFilter===f.k?"#e74c3c":"transparent",color:stokFilter===f.k?"#fff":"#555",
                    fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                  {f.l}
                </button>
              ))}
              <div style={{width:1,height:20,background:"#e0f5f1",flexShrink:0}}/>
              {/* Sort */}
              <select value={stokSort} onChange={e=>setStokSort(e.target.value)}
                style={{padding:"5px 10px",borderRadius:9,border:"2px solid #e0f5f1",fontSize:10,fontWeight:700,outline:"none",fontFamily:"inherit",background:"#fff",color:"#0d9488"}}>
                <option value="urutan">Urutan Produk ✓</option>
                <option value="nama">A-Z</option>
                <option value="stok_asc">Stok ↑</option>
                <option value="stok_desc">Stok ↓</option>
                <option value="modal">Modal ↓</option>
              </select>
              {/* Search */}
              <div style={{position:"relative",flex:1,minWidth:140}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:11}}>🔍</span>
                <input value={stokSearch} onChange={e=>setStokSearch(e.target.value)} placeholder="Cari produk / kategori..."
                  style={{width:"100%",padding:"5px 8px 5px 26px",borderRadius:9,border:"2px solid #e0f5f1",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>

            {/* Stok per outlet card */}
            {(stokOutlet==="semua"?visibleOutlets:visibleOutlets.filter(o=>String(o.id)===stokOutlet)).map((outlet,oi)=>{
              const oc    = outletColor(outlet.id);
              const stats = getStokStats(outlet.id);
              const prods = getStokFiltered(outlet.id);
              return (
                <div key={outlet.id} style={{background:"#fff",borderRadius:14,border:`2px solid ${oc}22`,marginBottom:14,overflow:"hidden"}}>
                  {/* Outlet header */}
                  <div style={{background:`linear-gradient(90deg,${oc}15,transparent)`,borderBottom:`1px solid ${oc}20`,padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:oc,flexShrink:0}}/>
                    <span style={{fontWeight:800,fontSize:13,color:oc,flex:1}}>{outlet.nama}</span>
                    <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                      {[
                        {l:"Stok",   v:`${stats.total} pcs`, c:oc,       bg:oc+"15"},
                        {l:"Modal",  v:fmtRp(stats.modal),   c:"#7c3aed",bg:"#f5f3ff"},
                        {l:"SKU",    v:`${prods.length}`,     c:"#555",   bg:"#f9fafb"},
                        ...(stats.menipis>0?[{l:"Menipis",v:`${stats.menipis}`,c:"#d97706",bg:"#fffbeb"}]:[]),
                        ...(stats.habis>0?[{l:"Habis",v:`${stats.habis}`,c:"#dc2626",bg:"#fff5f5"}]:[]),
                      ].map(k=>(
                        <div key={k.l} style={{background:k.bg,borderRadius:8,padding:"4px 10px",textAlign:"center"}}>
                          <div style={{fontWeight:900,fontSize:12,color:k.c}}>{k.v}</div>
                          <div style={{fontSize:8,color:k.c,opacity:.7,fontWeight:700}}>{k.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid produk */}
                  {prods.length===0 ? (
                    <div style={{textAlign:"center",padding:"24px",color:"#aaa",fontSize:12}}>
                      {stokFilter==="habis"?"Semua produk tersedia ✓":stokFilter==="menipis"?"Tidak ada produk menipis":"Belum ada data stok"}
                    </div>
                  ) : (
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))"}}>
                      {prods.map(p=>{
                        const isHabis   = p.qty===0;
                        const isMenipis = p.qty>0&&p.qty<=5;
                        const qtyColor  = isHabis?"#dc2626":isMenipis?"#d97706":"#0d9488";
                        const bgCard    = isHabis?"#fff5f5":isMenipis?"#fffbeb":"#fff";
                        return (
                          <div key={p.id} style={{
                            padding:"10px 12px",background:bgCard,
                            borderRight:`1px solid ${oc}12`,borderBottom:`1px solid ${oc}12`,
                            borderLeft:`3px solid ${isHabis?"#fca5a5":isMenipis?"#fcd34d":"transparent"}`,
                            transition:"background .15s"}}
                            onMouseEnter={ev=>ev.currentTarget.style.background=isHabis?"#ffe4e6":isMenipis?"#fef9c3":"#f0fdfb"}
                            onMouseLeave={ev=>ev.currentTarget.style.background=bgCard}>
                            <div style={{fontWeight:700,fontSize:11,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}} title={p.name}>{p.name}</div>
                            <div style={{fontSize:9,color:"#aaa",marginBottom:7,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.category||"--"}</div>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
                              <div style={{display:"flex",alignItems:"center",gap:3}}>
                                <span style={{fontWeight:900,fontSize:18,color:qtyColor,lineHeight:1}}>{p.qty}</span>
                                <span style={{fontSize:9,color:qtyColor,fontWeight:700}}>pcs</span>
                              </div>
                              {p.modal>0&&(
                                <div style={{textAlign:"right"}}>
                                  <div style={{fontSize:9,color:"#7c3aed",fontWeight:700}}>{fmtRp(p.nilai)}</div>
                                  <div style={{fontSize:8,color:"#bbb"}}>@ {fmtRp(p.modal)}</div>
                                </div>
                              )}
                            </div>
                            {(isHabis||isMenipis)&&(
                              <div style={{marginTop:4}}>
                                <span style={{fontSize:8,background:isHabis?"#dc2626":"#d97706",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:800}}>
                                  {isHabis?"HABIS":"TIPIS"}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB: COMPARE OUTLET
        ══════════════════════════════════════════════════ */}
        {monitorTab==="compare" && (
          <div>
            {/* Filter bar */}
            <div style={{background:"#fff",borderRadius:12,border:"2px solid #e0f5f1",padding:"10px 14px",marginBottom:14,display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
              <span style={{fontSize:11,fontWeight:700,color:"#555",flexShrink:0}}>Filter:</span>
              {[{k:"semua",l:"Semua"},{k:"menipis",l:"⚠️ Menipis"},{k:"habis",l:"🔴 Habis"}].map(f=>(
                <button key={f.k} onClick={()=>setStokFilter(f.k)}
                  style={{padding:"4px 12px",borderRadius:20,border:`2px solid ${stokFilter===f.k?"#7c3aed":"#e0f5f1"}`,
                    background:stokFilter===f.k?"#7c3aed":"transparent",color:stokFilter===f.k?"#fff":"#555",
                    fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>
                  {f.l}
                </button>
              ))}
              <div style={{width:1,height:20,background:"#e0f5f1",flexShrink:0}}/>
              <select value={stokSort} onChange={e=>setStokSort(e.target.value)}
                style={{padding:"5px 10px",borderRadius:9,border:"2px solid #e0f5f1",fontSize:10,fontWeight:700,outline:"none",fontFamily:"inherit",background:"#fff"}}>
                <option value="urutan">Urutan Produk ✓</option>
                <option value="nama">A-Z</option>
                <option value="stok_asc">Stok ↑</option>
                <option value="stok_desc">Stok ↓</option>
              </select>
              <div style={{position:"relative",flex:1,minWidth:140}}>
                <span style={{position:"absolute",left:9,top:"50%",transform:"translateY(-50%)",fontSize:11}}>🔍</span>
                <input value={stokSearch} onChange={e=>setStokSearch(e.target.value)} placeholder="Cari produk..."
                  style={{width:"100%",padding:"5px 8px 5px 26px",borderRadius:9,border:"2px solid #e0f5f1",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>

            {/* Compare table */}
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
              {/* Header */}
              <div style={{display:"grid",gridTemplateColumns:`2fr repeat(${visibleOutlets.length},1fr)`,borderBottom:"2px solid #e0f5f1"}}>
                <div style={{padding:"10px 14px",background:"#f0faf8",fontWeight:800,fontSize:11,color:"#555"}}>Produk</div>
                {visibleOutlets.map(o=>{
                  const oc=outletColor(o.id); const s=getStokStats(o.id);
                  return (
                    <div key={o.id} style={{padding:"10px 10px",background:oc+"12",borderLeft:`1px solid ${oc}20`,textAlign:"center"}}>
                      <div style={{fontWeight:800,fontSize:11,color:oc}}>{o.nama.replace("Ammar Cell ","")}</div>
                      <div style={{fontSize:9,color:oc,opacity:.8,marginTop:1}}>
                        {s.total} pcs · {fmtRp(s.modal)}
                      </div>
                      {(s.habis>0||s.menipis>0)&&(
                        <div style={{display:"flex",gap:3,justifyContent:"center",marginTop:3,flexWrap:"wrap"}}>
                          {s.habis>0&&<span style={{fontSize:8,background:"#dc2626",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:800}}>{s.habis} habis</span>}
                          {s.menipis>0&&<span style={{fontSize:8,background:"#d97706",color:"#fff",borderRadius:4,padding:"1px 5px",fontWeight:800}}>{s.menipis} tipis</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rows */}
              <div style={{maxHeight:520,overflowY:"auto"}}>
                {orderedProducts
                  .filter(p=>{
                    if(stokFilter==="habis")   return visibleOutlets.some(o=>(liveStocks[o.id]?.[p.id]??0)===0);
                    if(stokFilter==="menipis") return visibleOutlets.some(o=>{ const q=liveStocks[o.id]?.[p.id]??0; return q>0&&q<=5; });
                    return true;
                  })
                  .filter(p=>!stokSearch||p.name?.toLowerCase().includes(stokSearch.toLowerCase())||p.category?.toLowerCase().includes(stokSearch.toLowerCase()))
                  .sort((a,b)=>{
                    if(stokSort==="stok_asc"){
                      const qa=visibleOutlets.reduce((s,o)=>s+(liveStocks[o.id]?.[a.id]??0),0);
                      const qb=visibleOutlets.reduce((s,o)=>s+(liveStocks[o.id]?.[b.id]??0),0);
                      return qa-qb;
                    }
                    if(stokSort==="stok_desc"){
                      const qa=visibleOutlets.reduce((s,o)=>s+(liveStocks[o.id]?.[a.id]??0),0);
                      const qb=visibleOutlets.reduce((s,o)=>s+(liveStocks[o.id]?.[b.id]??0),0);
                      return qb-qa;
                    }
                    if(stokSort==="nama") return (a.name||"").localeCompare(b.name||"");
                    return 0; // "urutan" -> orderedProducts sudah terurut
                  })
                  .map((p,i)=>{
                    const qtys   = visibleOutlets.map(o=>liveStocks[o.id]?.[p.id]??0);
                    const maxQ   = Math.max(...qtys);
                    const minQ   = Math.min(...qtys);
                    const hasAny = qtys.some(q=>q>0);
                    return (
                      <div key={p.id} style={{display:"grid",gridTemplateColumns:`2fr repeat(${visibleOutlets.length},1fr)`,borderTop:i>0?"1px solid #f0faf8":"none"}}
                        onMouseEnter={ev=>ev.currentTarget.style.background="#f8fffe"}
                        onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
                        <div style={{padding:"9px 14px"}}>
                          <div style={{fontWeight:700,fontSize:12}}>{p.name}</div>
                          <div style={{fontSize:9,color:"#aaa"}}>{p.category} · @{fmtRp(p.modal||0)}</div>
                        </div>
                        {visibleOutlets.map(o=>{
                          const q       = liveStocks[o.id]?.[p.id]??0;
                          const oc      = outletColor(o.id);
                          const isHabis = q===0;
                          const isTipis = q>0&&q<=5;
                          const isMax   = q===maxQ&&maxQ>0&&hasAny;
                          const isMin   = q===minQ&&minQ<maxQ&&hasAny;
                          return (
                            <div key={o.id} style={{padding:"9px 10px",borderLeft:`1px solid ${oc}15`,textAlign:"center",
                              background:isHabis?"#fff5f5":isTipis?"#fffbeb":"transparent"}}>
                              <div style={{fontWeight:900,fontSize:16,color:isHabis?"#dc2626":isTipis?"#d97706":isMax?"#16a34a":"#1a2e2a",lineHeight:1}}>{q}</div>
                              <div style={{fontSize:8,fontWeight:700,marginTop:3}}>
                                {isHabis&&<span style={{color:"#dc2626"}}>HABIS</span>}
                                {isTipis&&<span style={{color:"#d97706"}}>TIPIS</span>}
                                {!isHabis&&!isTipis&&isMax&&<span style={{color:"#16a34a"}}>▲ MAX</span>}
                                {!isHabis&&!isTipis&&isMin&&<span style={{color:"#0d9488"}}>▼ MIN</span>}
                              </div>
                              {p.modal>0&&<div style={{fontSize:8,color:"#bbb",marginTop:2}}>{fmtRp(q*(p.modal||0))}</div>}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                }
              </div>

              {/* Footer totals */}
              <div style={{display:"grid",gridTemplateColumns:`2fr repeat(${visibleOutlets.length},1fr)`,borderTop:"2px solid #e0f5f1",background:"#f0faf8"}}>
                <div style={{padding:"10px 14px",fontWeight:800,fontSize:11,color:"#555"}}>TOTAL SEMUA</div>
                {visibleOutlets.map(o=>{
                  const oc=outletColor(o.id); const s=getStokStats(o.id);
                  return (
                    <div key={o.id} style={{padding:"10px 10px",borderLeft:`1px solid ${oc}20`,textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:14,color:oc}}>{s.total} pcs</div>
                      <div style={{fontSize:9,color:"#7c3aed",fontWeight:700}}>{fmtRp(s.modal)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ==============================================================================
// ROOT
// ==============================================================================
// ==============================================================================
// PORTAL KARYAWAN
// ==============================================================================
function PortalKaryawan({ user, outlets, transactions, misi, note, shift, absensiMap, izinMap, setAbsensiMap, setIzinMap, onLogout, onKembali, notify, todos=[], todoStatus={}, poinRate=1000, misiProgress={}, misiFoto=[], setMisiFoto=()=>{}, users={} }) {
  const [tab,setTab]           = useState("beranda");
  const [clock,setClock]       = useState(new Date().toLocaleTimeString("id-ID"));
  const [absenMasuk,setAbsenM] = useState(()=>{ const t=today(); return (absensiMap[user.username]||[]).find(a=>a.tgl===t&&a.masuk)?absensiMap[user.username].find(a=>a.tgl===t):null; });
  const [absenPulang,setAbsenP]= useState(()=>{ const t=today(); return (absensiMap[user.username]||[]).find(a=>a.tgl===t&&a.pulang)?absensiMap[user.username].find(a=>a.tgl===t):null; });
  const [kameraMode,setKamMode]= useState(null);
  const [lokasiStr,setLokasiStr]=useState("Mengambil lokasi...");
  const [gpsOk,setGpsOk]       = useState(null); // null=loading, true=di outlet, false=di luar
  const [loadGPS,setLoadGPS]   = useState(false);
  const [stream,setStream]     = useState(null);
  const videoRef=useRef(null), canvasRef=useRef(null);
  const fotoVideoRef=useRef(null), fotoCanvasRef=useRef(null);
  const [misiFotoTarget,setMisiFotoTarget]=useState(null); // misi object
  const [fotoStep,setFotoStep]=useState("before"); // before|after|done
  const [fotoData,setFotoData]=useState({}); // {foto_before,foto_after,waktu_before,waktu_after}
  const [fotoStream,setFotoStream]=useState(null);
  const [showSheet,setShowSheet]=useState(false);
  const [sheetMode,setSheetMode]=useState("pilih");
  const [selJenis,setSelJenis] = useState(null);
  const [formAjuan,setFormAjuan]=useState({tgl:"",jam:"",ket:""});
  const [submitOk,setSubmitOk] = useState(false);

  const myIzin = izinMap[user.username]||[];
  const myAbsensi = absensiMap[user.username]||[];

  useEffect(()=>{ const iv=setInterval(()=>setClock(new Date().toLocaleTimeString("id-ID")),1000); return()=>clearInterval(iv); },[]);

  const startKamera = async (mode) => {
    setKamMode(mode); setLoadGPS(true); setGpsOk(null);
    // Coba kamera belakang (environment) dulu, fallback ke kamera apapun
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:"environment"}},audio:false});
      setStream(s);
    } catch {
      try { const s2 = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false}); setStream(s2); }
      catch { try{ const s3 = await navigator.mediaDevices.getUserMedia({video:true,audio:false}); setStream(s3); }catch{} }
    }
    // Cek GPS terhadap lokasi outlet
    const outlet = outlets.find(o=>o.id===user.outletId);
    navigator.geolocation?.getCurrentPosition(p=>{
      const {latitude:lat,longitude:lng,accuracy:acc} = p.coords;
      if(outlet?.lat&&outlet?.lng){
        const R=6371000,dLat=(outlet.lat-lat)*Math.PI/180,dLng=(outlet.lng-lng)*Math.PI/180;
        const a=Math.sin(dLat/2)**2+Math.cos(lat*Math.PI/180)*Math.cos(outlet.lat*Math.PI/180)*Math.sin(dLng/2)**2;
        const jarak=R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
        const isMock=acc===0||acc<1;
        const dalamRadius=jarak<=(outlet.radius||100)&&!isMock;
        setGpsOk(dalamRadius);
        setLokasiStr(dalamRadius?outlet.nama:(isMock?"⚠️ GPS Palsu":`📍 ${jarak<1000?Math.round(jarak)+'m':((jarak/1000).toFixed(1)+'km')} dari outlet`));
      } else {
        // Outlet belum punya GPS — izinkan tapi tetap catat koordinat
        setGpsOk(true);
        setLokasiStr(outlet?.nama||"Outlet");
      }
      setLoadGPS(false);
    },()=>{ setGpsOk(true); setLokasiStr(outlets.find(o=>o.id===user.outletId)?.nama||"Outlet"); setLoadGPS(false); },
    {enableHighAccuracy:true,timeout:8000,maximumAge:5000});
  };

  useEffect(()=>{ if(stream&&videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play().catch(()=>{});} },[stream,kameraMode]);

  const ambilFoto = () => {
    if(gpsOk===false) return; // diblokir jika di luar area outlet
    const v=videoRef.current, c=canvasRef.current;
    if(v&&c){c.width=v.videoWidth||320;c.height=v.videoHeight||240;c.getContext("2d").drawImage(v,0,0);}
    const foto=c?.toDataURL("image/jpeg",.7)||null;
    const jam=new Date().toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"}).replace(".",":"),tglStr=today();
    const entry={tgl:tglStr,foto,lokasi:lokasiStr};
    if(kameraMode==="masuk"){
      const rec={...entry,masuk:jam,pulang:null};
      setAbsenM(rec);
      setAbsensiMap(prev=>({...prev,[user.username]:[...(prev[user.id]||[]).filter(a=>a.tgl!==tglStr),rec]}));
      (async()=>{ try{ await supabase.from('portal_absensi').upsert({user_id:user.username,tgl:tglStr,masuk:jam,foto_masuk:foto,lokasi:lokasiStr},{onConflict:'user_id,tgl'}); }catch{} })();
    } else {
      const existing=(absensiMap[user.username]||[]).find(a=>a.tgl===tglStr)||{};
      const rec={...existing,tgl:tglStr,pulang:jam,foto_pulang:foto};
      setAbsenP(rec);
      setAbsensiMap(prev=>({...prev,[user.username]:[...(prev[user.id]||[]).filter(a=>a.tgl!==tglStr),rec]}));
      (async()=>{ try{ await supabase.from('portal_absensi').upsert({user_id:user.username,tgl:tglStr,pulang:jam,foto_pulang:foto},{onConflict:'user_id,tgl'}); }catch{} })();
    }
    stream?.getTracks().forEach(t=>t.stop()); setStream(null); setKamMode(null);
  };
  const stopKam=()=>{stream?.getTracks().forEach(t=>t.stop());setStream(null);setKamMode(null);};

  // ── Upload foto misi (before/after) ──
  const openMisiFoto = async (m) => {
    setMisiFotoTarget(m); setFotoStep("before"); setFotoData({});
    try {
      const s = await navigator.mediaDevices.getUserMedia({video:{facingMode:{exact:"environment"}},audio:false});
      setFotoStream(s);
    } catch {
      try { const s2 = await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false}); setFotoStream(s2); }
      catch { try{ const s3 = await navigator.mediaDevices.getUserMedia({video:true,audio:false}); setFotoStream(s3); }catch{} }
    }
  };
  useEffect(()=>{ if(fotoStream&&fotoVideoRef.current){fotoVideoRef.current.srcObject=fotoStream;fotoVideoRef.current.play().catch(()=>{});} },[fotoStream,fotoStep]);
  const stopFotoKam = () => { fotoStream?.getTracks().forEach(t=>t.stop()); setFotoStream(null); };

  const ambilFotoMisi = async () => {
    const v=fotoVideoRef.current, c=fotoCanvasRef.current;
    if(v&&c){c.width=v.videoWidth||320;c.height=v.videoHeight||240;c.getContext("2d").drawImage(v,0,0);}
    const foto=c?.toDataURL("image/jpeg",.7)||null;
    const now=new Date().toISOString();
    const m = misiFotoTarget;
    const periodeKey = getPeriodeKey(m.periode||"harian");

    if(fotoStep==="before"){
      setFotoData(prev=>({...prev,foto_before:foto,waktu_before:now}));
      setFotoStep("after");
    } else {
      const finalData = {...fotoData,foto_after:foto,waktu_after:now};
      setFotoData(finalData);
      stopFotoKam();
      // Simpan ke portal_misi_foto
      try{
        await supabase.from('portal_misi_foto').insert({
          misi_id:m.id, username:user.username||user.id, user_nama:user.nama,
          foto_before:finalData.foto_before, foto_after:finalData.foto_after,
          lokasi:lokasiStr!=="Mengambil lokasi..."?lokasiStr:outletNama,
          waktu_before:finalData.waktu_before, waktu_after:finalData.waktu_after,
          status:'menunggu', periode_key:periodeKey,
        });
      }catch(e){ console.warn('misi foto insert:',e); }
      setFotoStep("done");
      notify("Foto terkirim, menunggu verifikasi admin","ok");
    }
  };


  // Kalkulasi misi (per-user, per-periode dari portalMisiProgress)
  const username = user.username||user.id;
  const getMisiProgress = (m) => {
    const periodeKey = getPeriodeKey(m.periode||"harian");
    const rec = misiProgress[m.id]?.[username]?.[periodeKey];
    return {progress: rec?.progress||0, selesai: rec?.selesai||false, periodeKey};
  };
  const misiWithProgress = misi.map(m=>({...m, ...getMisiProgress(m)}));
  const misiSelesai = misiWithProgress.filter(m=>m.selesai);
  const totalPoin   = misiSelesai.reduce((s,m)=>s+m.poin,0);
  const maxPoin     = misiWithProgress.reduce((s,m)=>s+m.poin,0);
  const bonus       = totalPoin * (poinRate||1000);
  const gajiEst     = (user.gajiPokok||2800000)+bonus;
  const hadirRows   = myAbsensi.filter(a=>a.masuk&&a.masuk!=="--");

  // ── Peringkat Poin: ranking total poin semua karyawan untuk periode masing-masing misi ──
  const allKaryawanUsernames = Object.entries(users||{})
    .filter(([k,u])=>["karyawan","kasir","bank","staff"].includes(u.role))
    .map(([k])=>k);
  const computeTotalPoin = (uname) => misi.reduce((s,m)=>{
    const periodeKey = getPeriodeKey(m.periode||"harian");
    const rec = misiProgress[m.id]?.[uname]?.[periodeKey];
    return s + (rec?.selesai ? (m.poin||0) : 0);
  },0);
  const leaderboard = (allKaryawanUsernames.includes(username)?allKaryawanUsernames:[...allKaryawanUsernames,username])
    .map(uname=>({ username:uname, nama:users?.[uname]?.nama||uname, poin:computeTotalPoin(uname) }))
    .sort((a,b)=>b.poin-a.poin);
  const myRank = leaderboard.findIndex(l=>l.username===username)+1;
  const totalKaryawanRank = leaderboard.length;

  // ── Rekap Tugas Wajib berdasarkan konfirmasi admin ──
  const tugasDikonfirmasiCount = Object.values(todoStatus[username]||{}).reduce((s,byTgl)=>
    s + Object.values(byTgl||{}).filter(rec=>rec?.status==="dikonfirmasi").length, 0);
  const tugasMenungguCount = Object.values(todoStatus[username]||{}).reduce((s,byTgl)=>
    s + Object.values(byTgl||{}).filter(rec=>rec?.status==="menunggu").length, 0);

  // Kalkulasi to-do wajib hari ini
  const tglHariIni = isoDate();
  const todosHariIni = todos.filter(t=>{
    if((t.periode||"harian")==="harian") return true;
    if(t.periode==="mingguan") return getPeriodeKey("mingguan")===getPeriodeKey("mingguan",new Date());
    return true; // bulanan selalu tampil
  });
  const isTodoDone = (todoId) => !!(todoStatus[username]?.[todoId]?.[tglHariIni]?.done);
  const getTodoStatus = (todoId) => todoStatus[username]?.[todoId]?.[tglHariIni]?.status; // 'menunggu'|'dikonfirmasi'|undefined
  const todoDoneCount = todosHariIni.filter(t=>isTodoDone(t.id)).length;

  // Hitung countdown reset bulanan (asumsi tanggal 1 = gajian/reset)
  const nextResetDate = (()=>{
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth()+1, 1);
    return next;
  })();
  const daysToReset = Math.ceil((nextResetDate - new Date())/86400000);

  // Toggle status tugas harian -- saat dicentang, status="menunggu" (kirim ke admin untuk konfirmasi)
  const toggleTodo = async (todoId) => {
    const newDone = !isTodoDone(todoId);
    try{
      await supabase.from('portal_todo_status').upsert({
        todo_id:todoId, username, tgl:tglHariIni, done:newDone,
        status: newDone?'menunggu':null,
        done_at:newDone?new Date().toISOString():null,
        confirmed_at:null, confirmed_by:null,
      },{onConflict:'todo_id,username,tgl'});
    }catch(e){ console.warn('toggle todo:',e); }
  };

  // Hitung jam
  const hitungDur=(m,p)=>{if(!m||!p||m==="--"||p==="--")return null;const[mh,mm]=m.split(":").map(Number);const[ph,pm]=p.split(":").map(Number);return(ph*60+pm-mh*60-mm)/60;};
  const fmtJam=j=>{if(!j||j<0)return"0j 0m";const h=Math.floor(j),mn=Math.round((j-h)*60);return`${h}j ${mn}m`;};
  const pctN=(v,t)=>t>0?Math.min(100,Math.round(v/t*100)):0;

  const absensiDenganDur = myAbsensi.map(a=>({...a,dur:hitungDur(a.masuk,a.pulang),kurang:Math.max(0,shift.totalJam-(hitungDur(a.masuk,a.pulang)||0))}));
  const totalKurang = absensiDenganDur.filter(a=>a.masuk&&a.masuk!=="--"&&a.kurang>0).reduce((s,a)=>s+a.kurang,0);
  const misiPct = pctN(misiSelesai.length,misiWithProgress.length);
  const poinPct = pctN(totalPoin,maxPoin||1);

  const BarP=({v,m,c="#0d9488",h=8})=>(
    <div style={{width:"100%",height:h,borderRadius:99,background:"#e8f5f0",overflow:"hidden"}}>
      <div style={{width:`${pctN(v,m)}%`,height:"100%",background:c,borderRadius:99,transition:"width .7s ease"}}/>
    </div>
  );

  const submitIzin=()=>{
    if(!formAjuan.tgl||!formAjuan.ket.trim()) return;
    const tglFmt=new Date(formAjuan.tgl).toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit",year:"numeric"});
    const entry={id:Date.now(),tgl:tglFmt,jenis:selJenis.k,jam:formAjuan.jam,ket:formAjuan.ket,status:"menunggu",userId:user.id,userName:user.nama};
    setIzinMap(prev=>({...prev,[user.id]:[entry,...(prev[user.id]||[])]}));
    (async()=>{ try{ await supabase.from('portal_izin').insert({user_id:user.username,user_nama:user.nama,tgl:tglFmt,jenis:selJenis.k,jam:formAjuan.jam,ket:formAjuan.ket,status:"menunggu"}); }catch{} })();
    setSubmitOk(true);
    setTimeout(()=>{setSubmitOk(false);setShowSheet(false);setSheetMode("pilih");setSelJenis(null);setFormAjuan({tgl:"",jam:"",ket:""});},1800);
  };

  const openSheet=()=>{setShowSheet(true);setSheetMode("pilih");setSelJenis(null);setFormAjuan({tgl:"",jam:"",ket:""});setSubmitOk(false);};
  const JENIS=[{k:"Izin",icon:"📝",color:"#d97706",bg:"#fffbeb",desc:"Keperluan pribadi"},{k:"Sakit",icon:"🤒",color:"#dc2626",bg:"#fff5f5",desc:"Tidak masuk sakit"},{k:"Lembur",icon:"🌙",color:"#7c3aed",bg:"#f5f3ff",desc:"Kerja di luar jam"}];
  const TABS_P=[{k:"beranda",icon:"🏠",label:"Beranda"},{k:"kinerja",icon:"📊",label:"Kinerja"},{k:"absensi",icon:"📅",label:"Absensi"},{k:"misi",icon:"🎯",label:"Misi"},{k:"profil",icon:"👤",label:"Profil"}];
  const todayStr=new Date().toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
  const outletNama=outlets.find(o=>o.id===user.outletId)?.nama||"Outlet";

  return (
    <div style={{maxWidth:430,margin:"0 auto",minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif",paddingBottom:76,position:"relative"}}>
      <style>{`*{box-sizing:border-box}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.pk-card{animation:fadeUp .25s ease}::-webkit-scrollbar{display:none}@keyframes blk{0%,100%{opacity:1}50%{opacity:.4}}.blk{animation:blk 1.4s infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",padding:"14px 18px 16px",position:"sticky",top:0,zIndex:50,boxShadow:"0 4px 16px rgba(13,148,136,.3)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          {/* Tombol kembali untuk kasir/bank/staff */}
          {onKembali&&(user.role==="kasir"||user.role==="bank"||user.role==="staff")&&(
            <button onClick={onKembali} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 11px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>←</button>
          )}
          <div style={{width:44,height:44,borderRadius:14,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:17,color:"#fff",border:"2px solid rgba(255,255,255,.3)",flexShrink:0}}>{user.nama?.slice(0,2).toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontWeight:900,fontSize:15,color:"#fff"}}>{user.nama}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.7)",display:"flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:"50%",background:"#2ecc71",display:"inline-block"}}/>{outletNama}</div>
          </div>
          <div style={{textAlign:"right"}}><div style={{fontFamily:"monospace",fontWeight:900,fontSize:14,color:"#fff"}}>{clock}</div><div style={{fontSize:9,color:"rgba(255,255,255,.6)"}}>{new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"short"})}</div></div>
        </div>
      </div>

      <div style={{padding:"14px 16px"}}>
      {/* ═══ BERANDA ═══ */}
      {tab==="beranda"&&(
      <div className="pk-card">
        {/* Note admin */}
        {note&&<div style={{background:"linear-gradient(135deg,#fffbeb,#fef9c3)",border:"2px solid #fcd34d",borderRadius:14,padding:"11px 13px",marginBottom:12,display:"flex",gap:10}}><span style={{fontSize:20,flexShrink:0}}>📌</span><div><div style={{fontWeight:800,fontSize:10,color:"#92400e",marginBottom:2}}>PESAN DARI PIMPINAN</div><div style={{fontSize:11,color:"#78350f",lineHeight:1.5}}>{note}</div></div></div>}
        {/* Absen */}
        {kameraMode?(
          <div style={{background:"#000",borderRadius:18,marginBottom:12,overflow:"hidden",boxShadow:"0 8px 28px rgba(0,0,0,.25)",position:"relative"}}>
            {/* Header overlay */}
            <div style={{position:"absolute",top:0,left:0,right:0,zIndex:10,padding:"12px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(rgba(0,0,0,.6),transparent)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:18}}>{kameraMode==="masuk"?"📸":"📸"}</span>
                <span style={{color:"#fff",fontWeight:800,fontSize:13}}>{kameraMode==="masuk"?"Absen Masuk":"Absen Pulang"}</span>
              </div>
              <button onClick={stopKam} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:"50%",width:30,height:30,color:"#fff",fontSize:14,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>

            {/* Video full */}
            <div style={{position:"relative",minHeight:340,background:"#111",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <video ref={videoRef} autoPlay playsInline muted style={{width:"100%",height:340,objectFit:"cover",display:"block"}}/>

              {/* GPS status overlay */}
              <div style={{position:"absolute",top:54,left:14,right:14}}>
                {loadGPS?(
                  <div style={{background:"rgba(0,0,0,.55)",borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:14,height:14,border:"2px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>
                    <span style={{color:"#fff",fontSize:11,fontWeight:700}}>Memeriksa lokasi GPS...</span>
                  </div>
                ):gpsOk===false?(
                  <div style={{background:"rgba(220,38,38,.85)",borderRadius:12,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:18}}>🚫</span>
                    <div>
                      <div style={{color:"#fff",fontSize:11,fontWeight:800}}>Di Luar Area Outlet</div>
                      <div style={{color:"rgba(255,255,255,.85)",fontSize:10}}>{lokasiStr} — absen tidak bisa dilakukan</div>
                    </div>
                  </div>
                ):gpsOk===true?(
                  <div style={{background:"rgba(22,163,74,.85)",borderRadius:12,padding:"8px 12px",display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:16}}>✅</span>
                    <span style={{color:"#fff",fontSize:11,fontWeight:800}}>Lokasi Terverifikasi — {lokasiStr}</span>
                  </div>
                ):null}
              </div>

              {/* Bottom info bar */}
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,.75))",padding:"30px 14px 14px",display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                <div>
                  <div style={{color:"#fff",fontWeight:900,fontSize:18,fontFamily:"monospace"}}>{clock}</div>
                  <div style={{color:"rgba(255,255,255,.7)",fontSize:10,marginTop:2}}>{new Date().toLocaleDateString("id-ID",{weekday:"short",day:"2-digit",month:"short"})}</div>
                </div>
                <div style={{background:"rgba(255,255,255,.12)",borderRadius:20,padding:"4px 10px",fontSize:9,color:"#fff",fontWeight:700}}>📷 Kamera Belakang</div>
              </div>
            </div>

            <canvas ref={canvasRef} style={{display:"none"}}/>

            {/* Capture button area */}
            <div style={{padding:"18px 0",display:"flex",justifyContent:"center",background:"#0a0a0a"}}>
              <button onClick={ambilFoto} disabled={gpsOk===false||loadGPS}
                style={{
                  width:74,height:74,borderRadius:"50%",
                  border:`4px solid ${gpsOk===false?"#666":"#fff"}`,
                  background:gpsOk===false?"#444":(kameraMode==="masuk"?"linear-gradient(135deg,#0d9488,#14b8a6)":"linear-gradient(135deg,#e74c3c,#ff6b6b)"),
                  cursor:gpsOk===false||loadGPS?"not-allowed":"pointer",
                  display:"flex",alignItems:"center",justifyContent:"center",
                  boxShadow:gpsOk===false?"none":"0 0 0 6px rgba(255,255,255,.12)",
                  transition:"all .2s",opacity:gpsOk===false||loadGPS?0.5:1,
                }}>
                <span style={{fontSize:28}}>{gpsOk===false?"🔒":"📷"}</span>
              </button>
            </div>
            {gpsOk===false&&(
              <div style={{padding:"0 14px 14px",textAlign:"center"}}>
                <div style={{fontSize:11,color:"#fca5a5",fontWeight:700}}>⚠️ Absen hanya bisa dilakukan di lokasi outlet</div>
              </div>
            )}
          </div>
        ):(
          <div style={{background:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:"2px solid #e0f5f1",boxShadow:"0 2px 12px rgba(13,148,136,.06)"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:1}}>Absensi Hari Ini</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>{todayStr}</div>
            {!absenMasuk?(
              <button onClick={()=>startKamera("masuk")} style={{width:"100%",padding:"13px",borderRadius:13,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 14px rgba(13,148,136,.3)"}}>📸 Absen Masuk</button>
            ):(
              <div style={{background:"#f0fdf4",borderRadius:12,padding:"10px 12px",marginBottom:8,border:"2px solid #86efac",display:"flex",gap:10,alignItems:"center"}}>
                {absenMasuk.foto?<img src={absenMasuk.foto} alt="" style={{width:52,height:52,borderRadius:9,objectFit:"cover",border:"2px solid #16a34a",flexShrink:0}}/>:<div style={{width:52,height:52,borderRadius:9,background:"#dcfce7",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📷</div>}
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:12,color:"#16a34a"}}>✅ Absen Masuk</div><div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}><span style={{background:"#dcfce7",color:"#16a34a",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20}}>🕐 {absenMasuk.masuk}</span><span style={{fontSize:9,color:"#aaa"}}>📍 {absenMasuk.lokasi}</span></div></div>
              </div>
            )}
            {!absenPulang?(
              <button onClick={()=>startKamera("pulang")} disabled={!absenMasuk} style={{width:"100%",padding:"13px",borderRadius:13,border:absenMasuk?"none":"2px dashed #b2ede6",background:absenMasuk?"linear-gradient(135deg,#e74c3c,#ff6b6b)":"#f9fafb",color:absenMasuk?"#fff":"#b2ede6",fontWeight:900,fontSize:14,cursor:absenMasuk?"pointer":"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:absenMasuk?"0 4px 14px rgba(231,76,60,.25)":"none"}}>
                {absenMasuk?"📸 Absen Pulang":"🔒 Absen Masuk dulu"}
              </button>
            ):(
              <div style={{background:"#fff5f5",borderRadius:12,padding:"10px 12px",border:"2px solid #fca5a5",display:"flex",gap:10,alignItems:"center"}}>
                {absenPulang.foto_pulang?<img src={absenPulang.foto_pulang} alt="" style={{width:52,height:52,borderRadius:9,objectFit:"cover",border:"2px solid #dc2626",flexShrink:0}}/>:<div style={{width:52,height:52,borderRadius:9,background:"#ffe4e6",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>📷</div>}
                <div style={{flex:1}}><div style={{fontWeight:800,fontSize:12,color:"#dc2626"}}>✅ Absen Pulang</div><div style={{display:"flex",gap:6,marginTop:3,flexWrap:"wrap"}}><span style={{background:"#ffe4e6",color:"#dc2626",fontSize:10,fontWeight:800,padding:"2px 8px",borderRadius:20}}>🕔 {absenPulang.pulang}</span><span style={{fontSize:9,color:"#aaa"}}>📍 {absenPulang.lokasi}</span></div></div>
              </div>
            )}
          </div>
        )}
        {/* ═══ TO-DO WAJIB (DI ATAS MISI) ═══ */}
        {todosHariIni.length>0&&(
          <div style={{background:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:"2px solid #e0f5f1"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:12,color:"#8e44ad"}}>✅ Tugas Wajib Hari Ini</div>
              <span style={{fontSize:10,background:"#f5eeff",color:"#8e44ad",fontWeight:700,padding:"2px 10px",borderRadius:20}}>{todoDoneCount}/{todosHariIni.length}</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {todosHariIni.map(t=>{
                const done = isTodoDone(t.id);
                const st = getTodoStatus(t.id);
                return (
                  <button key={t.id} onClick={()=>toggleTodo(t.id)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:11,border:`2px solid ${done?"#8e44ad":"#e0d4f7"}`,background:done?"#f5eeff":"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                    <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${done?"#8e44ad":"#e0d4f7"}`,background:done?"#8e44ad":"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,flexShrink:0,transition:"all .2s"}}>{done?"✓":""}</div>
                    <div style={{flex:1,fontSize:12,fontWeight:600,color:done?"#8e44ad":"#1a2e2a",textDecoration:done?"line-through":"none"}}>{t.judul}</div>
                    {done&&(st==="dikonfirmasi"
                      ?<span style={{fontSize:8,fontWeight:800,background:"#dcfce7",color:"#16a34a",padding:"2px 7px",borderRadius:20,flexShrink:0}}>✅ Dikonfirmasi</span>
                      :<span style={{fontSize:8,fontWeight:800,background:"#fef3c7",color:"#d97706",padding:"2px 7px",borderRadius:20,flexShrink:0}}>⏳ Menunggu</span>)}
                  </button>
                );
              })}
            </div>
            <div style={{marginTop:6,fontSize:9,color:"#aaa",textAlign:"center"}}>Tidak memberi poin — wajib dikerjakan</div>
          </div>
        )}

        {/* Countdown reset periode bulanan */}
        <div style={{background:"linear-gradient(135deg,#8e44ad,#a855f7)",borderRadius:14,padding:"12px 16px",marginBottom:12,color:"#fff",display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🗓️</span>
          <div>
            <div style={{fontWeight:800,fontSize:12}}>Reset & Hitung Bonus: {daysToReset} Hari Lagi</div>
            <div style={{fontSize:10,opacity:.85}}>Progress misi & absensi akan direset awal bulan</div>
          </div>
        </div>

        {/* Target dari misi */}
        <div style={{background:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:"2px solid #e0f5f1"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a"}}>🎯 Target Bulan Ini</div>
            <span style={{fontSize:10,background:"#e0faf5",color:"#0d9488",fontWeight:700,padding:"2px 10px",borderRadius:20}}>{misiSelesai.length}/{misiWithProgress.length} misi</span>
          </div>
          {[{l:"🎯 Misi Selesai",v:misiSelesai.length,m:misiWithProgress.length||1,p:misiPct,c:misiPct>=80?"#16a34a":misiPct>=50?"#d97706":"#e74c3c",sub:`${misiSelesai.length} selesai dari ${misiWithProgress.length}`},{l:"🏅 Total Poin",v:totalPoin,m:maxPoin||1,p:poinPct,c:"#f59e0b",sub:`${totalPoin} dari ${maxPoin} poin`}].map(x=>(
            <div key={x.l} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:10,fontWeight:700,color:"#555"}}>{x.l}</span><span style={{fontSize:10,fontWeight:900,color:x.c}}>{x.p}%</span></div>
              <BarP v={x.v} m={x.m} c={x.c} h={8}/>
              <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:9,color:"#aaa"}}>{x.sub}</span></div>
            </div>
          ))}
          {misiWithProgress.length===0&&<div style={{textAlign:"center",padding:"12px",color:"#aaa",fontSize:11}}>Belum ada misi dari admin</div>}
          {misiWithProgress.slice(0,3).map(m=>(
            <div key={m.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",borderRadius:9,background:m.selesai?"#f0fdf4":"#f9fafb",border:`1px solid ${m.selesai?"#86efac":"#e0e0e0"}`,marginTop:5}}>
              <span style={{fontSize:14,flexShrink:0}}>{m.selesai?"✅":m.icon||"🎯"}</span>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:10,fontWeight:700,color:m.selesai?"#16a34a":"#555",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.judul}</div></div>
              <span style={{fontSize:9,fontWeight:800,color:m.selesai?"#16a34a":"#f59e0b",background:m.selesai?"#dcfce7":"#fef9c3",padding:"1px 7px",borderRadius:20,flexShrink:0}}>{m.selesai?"✓":m.poin+"p"}</span>
            </div>
          ))}
          {misiWithProgress.length>0&&<div onClick={()=>setTab("misi")} style={{textAlign:"center",marginTop:8,fontSize:11,color:"#0d9488",fontWeight:700,cursor:"pointer"}}>Lihat semua →</div>}
        </div>
        {/* Grid rekap */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:9,marginBottom:12}}>
          <div onClick={()=>setTab("absensi")} style={{background:"#e0faf5",borderRadius:14,padding:"11px 10px",textAlign:"center",cursor:"pointer",border:"1px solid #b2f5ea"}}><div style={{fontSize:20,marginBottom:2}}>📅</div><div style={{fontWeight:900,fontSize:20,color:"#0d9488"}}>{hadirRows.length}</div><div style={{fontSize:9,fontWeight:700,color:"#0d9488",opacity:.7}}>Hari Hadir</div></div>
          <div onClick={openSheet} style={{background:"#fffbeb",borderRadius:14,padding:"11px 10px",textAlign:"center",cursor:"pointer",border:"1px solid #fcd34d"}}><div style={{fontSize:20,marginBottom:2}}>📝</div><div style={{fontWeight:900,fontSize:20,color:"#d97706"}}>{myIzin.filter(i=>i.status==="menunggu").length}</div><div style={{fontSize:9,fontWeight:700,color:"#92400e",opacity:.8}}>Proses Izin</div></div>
          <div style={{background:"#f5f3ff",borderRadius:14,padding:"11px 10px",textAlign:"center",border:"1px solid #c4b5fd"}}><div style={{fontSize:20,marginBottom:2}}>💰</div><div style={{fontWeight:900,fontSize:12,color:"#7c3aed"}}>{fmtRp(gajiEst).replace("Rp ","")}</div><div style={{fontSize:9,fontWeight:700,color:"#7c3aed",opacity:.7}}>Est. Gaji</div></div>
        </div>
        {/* Gaji card */}
        <div style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9,#a855f7)",borderRadius:16,padding:"18px",marginBottom:4,color:"#fff",boxShadow:"0 6px 24px rgba(124,58,237,.3)",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,.07)",top:-30,right:-30}}/>
          <div style={{position:"absolute",width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,.05)",bottom:-20,left:-20}}/>
          <div style={{position:"relative"}}><div style={{fontSize:10,color:"rgba(255,255,255,.65)",fontWeight:600,marginBottom:4}}>💰 Estimasi Gaji Bulan Ini</div><div style={{fontWeight:900,fontSize:28,letterSpacing:"-.5px",marginBottom:12}}>{fmtRp(gajiEst)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"rgba(255,255,255,.1)",borderRadius:12,overflow:"hidden",border:"1px solid rgba(255,255,255,.15)"}}>
            {[{l:"Gaji Pokok",v:fmtRp(user.gajiPokok||2800000).replace("Rp ",""),icon:"💼"},{l:"Bonus Misi",v:fmtRp(bonus).replace("Rp ",""),icon:"🎯"},{l:"Potongan",v:"0",icon:"✂️"}].map((x,i)=>(
              <div key={x.l} style={{padding:"10px 8px",textAlign:"center",borderLeft:i>0?"1px solid rgba(255,255,255,.12)":"none"}}><div style={{fontSize:14,marginBottom:3}}>{x.icon}</div><div style={{fontWeight:900,fontSize:12,color:"#e9d5ff"}}>{x.v}</div><div style={{fontSize:8,color:"rgba(255,255,255,.6)",marginTop:2}}>{x.l}</div></div>
            ))}
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:10}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:14}}>🏅</span><div><div style={{fontSize:11,fontWeight:900,color:"#fcd34d"}}>{totalPoin} poin</div><div style={{fontSize:8,color:"rgba(255,255,255,.5)"}}>dari {maxPoin} poin</div></div></div><div style={{background:"rgba(255,255,255,.15)",borderRadius:20,padding:"4px 12px",border:"1px solid rgba(255,255,255,.2)"}}><span style={{fontSize:10,fontWeight:800,color:"#a7f3d0"}}>Belum dibayar</span></div></div>
          </div>
        </div>
      </div>
      )}

      {/* ═══ KINERJA ═══ */}
      {tab==="kinerja"&&(
      <div className="pk-card">
        <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a",marginBottom:14}}>📊 Kinerja Saya</div>

        {/* Peringkat Poin */}
        <div style={{background:"linear-gradient(135deg,#8e44ad,#a855f7)",borderRadius:16,padding:"16px",marginBottom:12,color:"#fff",display:"flex",alignItems:"center",gap:14}}>
          <div style={{fontSize:32}}>🏆</div>
          <div style={{flex:1}}>
            <div style={{fontSize:10,opacity:.75,fontWeight:600}}>Peringkat Poin Bulan Ini</div>
            <div style={{fontWeight:900,fontSize:20}}>
              {totalKaryawanRank>0?`#${myRank} dari ${totalKaryawanRank} karyawan`:"Belum ada data"}
            </div>
          </div>
          <div style={{textAlign:"center",background:"rgba(255,255,255,.15)",borderRadius:12,padding:"8px 14px",border:"1px solid rgba(255,255,255,.2)"}}>
            <div style={{fontWeight:900,fontSize:18,color:"#fcd34d"}}>{totalPoin}</div>
            <div style={{fontSize:8,opacity:.8}}>Poin</div>
          </div>
        </div>

        {/* Rekap Tugas Wajib (berdasarkan konfirmasi admin) */}
        <div style={{background:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:"2px solid #e0f5f1"}}>
          <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a",marginBottom:10}}>✅ Rekap Tugas Wajib</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <div style={{background:"#dcfce7",borderRadius:10,padding:"9px 8px",textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18,color:"#16a34a"}}>{tugasDikonfirmasiCount}</div>
              <div style={{fontSize:8,fontWeight:700,color:"#16a34a",opacity:.8,marginTop:2}}>✅ Dikonfirmasi Admin</div>
            </div>
            <div style={{background:"#fef3c7",borderRadius:10,padding:"9px 8px",textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:18,color:"#d97706"}}>{tugasMenungguCount}</div>
              <div style={{fontSize:8,fontWeight:700,color:"#d97706",opacity:.8,marginTop:2}}>⏳ Menunggu Konfirmasi</div>
            </div>
          </div>
          <div style={{marginTop:8,fontSize:9,color:"#aaa",textAlign:"center"}}>Rekap ini dihitung dari tugas yang sudah dikonfirmasi oleh admin</div>
        </div>
        {/* Jam kerja */}
        <div style={{background:"#fff",borderRadius:16,padding:"14px",marginBottom:12,border:"2px solid #e0f5f1"}}>
          <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a",marginBottom:4}}>⏱ Rekap Jam Kerja</div>
          <div style={{fontSize:10,color:"#aaa",marginBottom:10}}>Shift: {shift.masuk} – {shift.pulang} ({shift.totalJam}j/hari)</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
            {[{l:"Total Jam",v:fmtJam(hadirRows.reduce((s,a)=>s+(hitungDur(a.masuk,a.pulang)||0),0)),c:"#0d9488",bg:"#e0faf5"},{l:"Target",v:fmtJam(hadirRows.length*shift.totalJam),c:"#2980b9",bg:"#e8f4fd"},{l:"Kekurangan",v:totalKurang>0?fmtJam(totalKurang):"✓ Aman",c:totalKurang>0?"#dc2626":"#16a34a",bg:totalKurang>0?"#fff5f5":"#f0fdf4"}].map(s=>(
              <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"9px 8px",textAlign:"center"}}><div style={{fontWeight:900,fontSize:12,color:s.c}}>{s.v}</div><div style={{fontSize:8,fontWeight:700,color:s.c,opacity:.7,marginTop:2}}>{s.l}</div></div>
            ))}
          </div>
          {absensiDenganDur.filter(a=>a.masuk&&a.masuk!=="--").slice(0,5).map((a,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",borderTop:i>0?"1px solid #f0faf8":"none",background:i%2===0?"#fff":"#fafffe"}}>
              <div style={{width:36,textAlign:"center",flexShrink:0}}><div style={{fontWeight:800,fontSize:10}}>{a.tgl}</div></div>
              <div style={{flex:1,display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <span style={{fontSize:9,background:"#f0faf8",padding:"2px 6px",borderRadius:20}}>🕐{a.masuk}</span>
                <span style={{fontSize:9,color:"#ccc"}}>→</span>
                <span style={{fontSize:9,background:"#f0faf8",padding:"2px 6px",borderRadius:20}}>🕔{a.pulang||"--"}</span>
                {a.dur!=null&&<span style={{fontSize:9,fontWeight:700,color:a.kurang>0?"#dc2626":"#0d9488"}}>{fmtJam(a.dur)}</span>}
              </div>
              {a.kurang>0?<span style={{fontSize:9,fontWeight:800,background:"#fff5f5",color:"#dc2626",padding:"2px 6px",borderRadius:20}}>-{fmtJam(a.kurang)}</span>:<span style={{fontSize:9,fontWeight:800,background:"#f0fdf4",color:"#16a34a",padding:"2px 6px",borderRadius:20}}>✓</span>}
            </div>
          ))}
          {totalKurang>0&&<div style={{marginTop:10,padding:"8px 12px",background:"#fff5f5",borderRadius:10,border:"1px solid #fca5a5",display:"flex",gap:8}}><span style={{fontSize:16}}>⚠️</span><div style={{fontSize:11,color:"#dc2626",fontWeight:700}}>Total kekurangan: <b>{fmtJam(totalKurang)}</b></div></div>}
        </div>
        {/* Badge */}
        <div style={{background:"#fff",borderRadius:16,padding:"14px",border:"2px solid #e0f5f1"}}>
          <div style={{fontWeight:800,fontSize:12,marginBottom:10}}>🎖️ Badge Pencapaian</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[{icon:"⭐",l:"Hadir Konsisten",ok:hadirRows.length>=5},{icon:"🏅",l:"Misi 2+ Selesai",ok:misiSelesai.length>=2},{icon:"⏱",l:"Nol Kekurangan Jam",ok:totalKurang===0},{icon:"🔥",l:"Poin 500+",ok:totalPoin>=500}].map(b=>(
              <div key={b.l} style={{display:"flex",alignItems:"center",gap:5,background:b.ok?"#e0faf5":"#f5f5f5",borderRadius:20,padding:"5px 12px",border:`1px solid ${b.ok?"#b2f5ea":"#e0e0e0"}`}}>
                <span style={{fontSize:14,filter:b.ok?"none":"grayscale(1)",opacity:b.ok?1:.4}}>{b.icon}</span>
                <span style={{fontSize:10,fontWeight:700,color:b.ok?"#0d9488":"#bbb"}}>{b.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* ═══ ABSENSI ═══ */}
      {tab==="absensi"&&(
      <div className="pk-card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div><div style={{fontWeight:800,fontSize:15,color:"#1a2e2a"}}>📅 Absensi</div><div style={{fontSize:11,color:"#aaa"}}>Rekap kehadiran bulan ini</div></div>
          <button onClick={openSheet} style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:11,padding:"9px 16px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ Ajukan</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7,marginBottom:12}}>
          {[{l:"Hadir",v:hadirRows.length,c:"#16a34a",bg:"#f0fdf4"},{l:"Izin",v:myIzin.filter(i=>["Izin","Sakit"].includes(i.jenis)&&i.status==="disetujui").length,c:"#d97706",bg:"#fffbeb"},{l:"Lembur",v:myIzin.filter(i=>i.jenis==="Lembur").length,c:"#7c3aed",bg:"#f5f3ff"}].map(s=>(
            <div key={s.l} style={{background:s.bg,borderRadius:11,padding:"9px",textAlign:"center",border:`1px solid ${s.c}20`}}><div style={{fontWeight:900,fontSize:20,color:s.c}}>{s.v}</div><div style={{fontSize:8,fontWeight:700,color:s.c,opacity:.8}}>{s.l}</div></div>
          ))}
        </div>
        {myAbsensi.length===0?<div style={{textAlign:"center",padding:30,color:"#aaa",fontSize:12}}>Belum ada data absensi</div>:(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden",marginBottom:12}}>
            {myAbsensi.slice(0,10).map((a,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderTop:i>0?"1px solid #f0faf8":"none"}}>
                <div style={{width:38,textAlign:"center",flexShrink:0}}><div style={{fontWeight:800,fontSize:10}}>{a.tgl}</div></div>
                <div style={{flex:1}}>
                  {a.masuk&&a.masuk!=="--"?<div style={{display:"flex",gap:5,flexWrap:"wrap"}}><span style={{fontSize:9,background:"#f0faf8",padding:"2px 6px",borderRadius:20}}>🕐{a.masuk}</span><span style={{fontSize:9,color:"#ccc"}}>→</span><span style={{fontSize:9,background:"#f0faf8",padding:"2px 6px",borderRadius:20}}>🕔{a.pulang||"--"}</span></div>:<span style={{fontSize:10,color:"#aaa"}}>Izin / Tidak hadir</span>}
                </div>
                <span style={{fontSize:9,fontWeight:800,background:a.masuk&&a.masuk!=="--"?"#f0fdf4":"#fffbeb",color:a.masuk&&a.masuk!=="--"?"#16a34a":"#d97706",padding:"2px 8px",borderRadius:20}}>{a.masuk&&a.masuk!=="--"?"✓ Hadir":"Izin"}</span>
              </div>
            ))}
          </div>
        )}
        <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a",marginBottom:8}}>📋 Riwayat Pengajuan</div>
        {myIzin.length===0?<div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:11}}>Belum ada pengajuan</div>:(
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {myIzin.map(p=>{
              const sc={disetujui:{c:"#16a34a",bg:"#f0fdf4",l:"✓ Disetujui"},menunggu:{c:"#d97706",bg:"#fffbeb",l:"⏳ Menunggu"},ditolak:{c:"#dc2626",bg:"#fff5f5",l:"✗ Ditolak"}};
              const s=sc[p.status]||sc.menunggu;
              const jn=JENIS.find(j=>j.k===p.jenis)||JENIS[0];
              return <div key={p.id} style={{background:"#fff",borderRadius:12,padding:"12px 14px",border:`1px solid ${jn.color}25`,display:"flex",gap:12}}><div style={{width:38,height:38,borderRadius:10,background:jn.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>{jn.icon}</div><div style={{flex:1}}><div style={{fontWeight:800,fontSize:12}}>{p.jenis}</div><div style={{fontSize:9,color:"#aaa"}}>{p.tgl}{p.jam?" · "+p.jam:""}</div><div style={{fontSize:10,color:"#555",marginTop:2}}>{p.ket}</div></div><span style={{fontSize:9,fontWeight:800,background:s.bg,color:s.c,padding:"3px 9px",borderRadius:20,alignSelf:"flex-start",flexShrink:0}}>{s.l}</span></div>;
            })}
          </div>
        )}
      </div>
      )}

      {/* ═══ MISI ═══ */}
      {tab==="misi"&&(()=>{
        const PERIODE_INFO = {
          harian:  { label:"Harian",   icon:"☀️", warna:"#0d9488" },
          mingguan:{ label:"Mingguan", icon:"📆", warna:"#2980b9" },
          bulanan: { label:"Bulanan / Sampai Gajian", icon:"🗓️", warna:"#8e44ad" },
        };
        return (
        <div className="pk-card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div><div style={{fontWeight:800,fontSize:15,color:"#1a2e2a"}}>🎯 Misi & Tugas</div><div style={{fontSize:11,color:"#aaa"}}>Selesaikan untuk bonus & poin</div></div>
            <div style={{textAlign:"right",background:"linear-gradient(135deg,#f59e0b,#fbbf24)",borderRadius:12,padding:"8px 12px"}}><div style={{fontWeight:900,fontSize:18,color:"#fff"}}>{totalPoin}</div><div style={{fontSize:9,color:"rgba(255,255,255,.85)"}}>Total Poin</div></div>
          </div>

          {/* Estimasi bonus */}
          <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:16,padding:"14px",marginBottom:14,color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div><div style={{fontSize:11,opacity:.85}}>Total Poin Periode Ini</div><div style={{fontWeight:900,fontSize:24}}>{totalPoin}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:11,opacity:.85}}>Estimasi Bonus</div><div style={{fontWeight:900,fontSize:20}}>{fmtRp(bonus)}</div></div>
            </div>
          </div>

          {/* ═══ TO-DO WAJIB (DI ATAS MISI) ═══ */}
          {todosHariIni.length>0&&(
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:800,fontSize:12,color:"#8e44ad"}}>✅ Tugas Wajib Hari Ini</div>
                <span style={{fontSize:10,background:"#f5eeff",color:"#8e44ad",fontWeight:700,padding:"2px 10px",borderRadius:20}}>{todoDoneCount}/{todosHariIni.length}</span>
              </div>
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
                {todosHariIni.map((t,i)=>{
                  const done = isTodoDone(t.id);
                  const st = getTodoStatus(t.id);
                  return (
                    <button key={t.id} onClick={()=>toggleTodo(t.id)}
                      style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderTop:i>0?"1px solid #f0faf8":"none",border:"none",background:done?"#f5eeff":"none",cursor:"pointer",fontFamily:"inherit",textAlign:"left"}}>
                      <div style={{width:24,height:24,borderRadius:8,border:`2px solid ${done?"#8e44ad":"#e0d4f7"}`,background:done?"#8e44ad":"#fff",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:13,flexShrink:0,transition:"all .2s"}}>{done?"✓":""}</div>
                      <div style={{flex:1,fontSize:12,fontWeight:600,color:done?"#8e44ad":"#1a2e2a",textDecoration:done?"line-through":"none"}}>{t.judul}</div>
                      {done&&(st==="dikonfirmasi"
                        ?<span style={{fontSize:8,fontWeight:800,background:"#dcfce7",color:"#16a34a",padding:"2px 7px",borderRadius:20,flexShrink:0}}>✅ Dikonfirmasi</span>
                        :<span style={{fontSize:8,fontWeight:800,background:"#fef3c7",color:"#d97706",padding:"2px 7px",borderRadius:20,flexShrink:0}}>⏳ Menunggu</span>)}
                      <span style={{fontSize:9,fontWeight:700,color:PERIODE_INFO[t.periode||"harian"].warna,flexShrink:0}}>{PERIODE_INFO[t.periode||"harian"].icon}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{marginTop:6,fontSize:9,color:"#aaa",textAlign:"center"}}>Tidak memberi poin — wajib dikerjakan</div>
            </div>
          )}

          {misiWithProgress.length===0?<div style={{textAlign:"center",padding:40,color:"#aaa"}}><div style={{fontSize:40,marginBottom:8}}>🎯</div><div style={{fontWeight:700}}>Belum ada misi dari admin</div></div>:(
            Object.entries(PERIODE_INFO).map(([periodeKey,p])=>{
              const list = misiWithProgress.filter(m=>(m.periode||"harian")===periodeKey);
              if(!list.length) return null;
              return (
                <div key={periodeKey} style={{marginBottom:14}}>
                  <div style={{fontWeight:800,fontSize:11,color:p.warna,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>{p.icon} {p.label}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {list.map(m=>{
                      const fotoMisi = (misiFoto||[]).filter(f=>f.misi_id===m.id&&f.username===username&&f.periode_key===m.periodeKey);
                      const fotoTerakhir = fotoMisi[0];
                      const fotoPending = fotoTerakhir?.status==="menunggu";
                      const fotoDitolak = fotoTerakhir?.status==="ditolak";
                      return (
                      <div key={m.id} style={{background:"#fff",borderRadius:14,padding:"13px 15px",border:`2px solid ${m.selesai?"#16a34a":"#e0f5f1"}`,position:"relative",overflow:"hidden"}}>
                        {m.selesai&&<><div style={{position:"absolute",top:0,right:0,width:0,height:0,borderStyle:"solid",borderWidth:"0 44px 44px 0",borderColor:"transparent #16a34a transparent transparent"}}/><div style={{position:"absolute",top:4,right:5,fontSize:13,color:"#fff"}}>✓</div></>}
                        <div style={{display:"flex",gap:12}}>
                          <div style={{width:42,height:42,borderRadius:12,background:m.selesai?"#f0fdf4":"#f0faf8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:`2px solid ${m.selesai?"#86efac":"#e0f5f1"}`}}>{m.selesai?"✅":m.icon||"🎯"}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:13,color:m.selesai?"#16a34a":"#1a2e2a"}}>{m.judul}</div>
                            <div style={{fontSize:10,color:"#aaa",marginTop:2,marginBottom:8}}>{m.deskripsi}</div>
                            {m.tipe!=="manual_foto"&&<>
                              <BarP v={m.progress||0} m={m.target||1} c={m.selesai?"#16a34a":"#0d9488"} h={6}/>
                              <div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:9,color:"#aaa"}}>{m.progress||0}/{m.target} {m.satuan}</span><span style={{fontSize:9,color:"#aaa"}}>{pctN(m.progress||0,m.target)}%</span></div>
                            </>}
                            <div style={{marginTop:7,display:"flex",gap:6,flexWrap:"wrap"}}>
                              <span style={{background:"#fef9c3",color:"#92400e",fontSize:10,fontWeight:800,padding:"2px 10px",borderRadius:20}}>🏅 {m.poin} poin</span>
                              <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:20}}>≈ {fmtRp(m.poin*poinRate)}</span>
                              {m.selesai&&<span style={{background:"#f0fdf4",color:"#16a34a",fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:20}}>Selesai!</span>}
                              {m.tipe==="auto_produk"||m.tipe==="auto_transaksi"?<span style={{background:"#e0faf5",color:"#0d9488",fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:20}}>⚡ Otomatis</span>:null}
                            </div>
                            {/* Tombol upload untuk manual_foto */}
                            {m.tipe==="manual_foto"&&!m.selesai&&(
                              <button onClick={()=>openMisiFoto(m)}
                                style={{width:"100%",marginTop:10,padding:"10px",borderRadius:10,border:"none",
                                  background:fotoPending?"#fcd34d":"linear-gradient(135deg,#d97706,#f59e0b)",
                                  color:fotoPending?"#92400e":"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit",
                                  display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                                {fotoPending?"⏳ Menunggu Verifikasi Admin":fotoDitolak?"🔄 Upload Ulang (Ditolak)":"📷 Upload Foto Before/After"}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        );
      })()}

      {/* MODAL UPLOAD FOTO MISI */}
      {misiFotoTarget&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#fff",borderRadius:18,padding:"20px",width:"100%",maxWidth:380,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontWeight:900,fontSize:15,color:"#1a2e2a",marginBottom:4}}>📷 {misiFotoTarget.judul}</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:16}}>Upload foto sebagai bukti penyelesaian misi</div>

            <div style={{display:"flex",gap:8,marginBottom:16}}>
              {["before","after"].map((s,i)=>(
                <div key={s} style={{flex:1,textAlign:"center"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",margin:"0 auto 4px",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,
                    background:fotoStep===s?"#0d9488":(fotoStep==="after"&&s==="before")||fotoStep==="done"?"#86efac":"#e0f5f1",
                    color:fotoStep===s||(fotoStep==="after"&&s==="before")||fotoStep==="done"?"#fff":"#aaa"}}>
                    {(fotoStep==="after"&&s==="before")||fotoStep==="done"?"✓":i+1}
                  </div>
                  <div style={{fontSize:10,fontWeight:700,color:fotoStep===s?"#0d9488":"#aaa"}}>{s==="before"?"Sebelum":"Sesudah"}</div>
                </div>
              ))}
            </div>

            {fotoStep!=="done"?(
              <>
                <div style={{borderRadius:14,overflow:"hidden",position:"relative",background:"#111",minHeight:280}}>
                  <video ref={fotoVideoRef} autoPlay playsInline muted style={{width:"100%",height:280,objectFit:"cover",display:"block"}}/>
                  <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,.75))",padding:"20px 12px 10px"}}>
                    <div style={{color:"#fff",fontSize:11,fontWeight:700}}>📍 {outletNama}</div>
                    <div style={{color:"rgba(255,255,255,.6)",fontSize:9}}>{new Date().toLocaleString("id-ID")}</div>
                  </div>
                  <canvas ref={fotoCanvasRef} style={{display:"none"}}/>
                </div>
                <button onClick={ambilFotoMisi}
                  style={{width:"100%",marginTop:12,padding:"12px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  📸 Ambil Foto "{fotoStep==="before"?"Sebelum":"Sesudah"}"
                </button>
              </>
            ):(
              <>
                <div style={{textAlign:"center",padding:"20px 0"}}>
                  <div style={{fontSize:48,marginBottom:10}}>✅</div>
                  <div style={{fontWeight:900,fontSize:15,color:"#16a34a"}}>Foto Terkirim!</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:4}}>Menunggu verifikasi admin</div>
                </div>
                <div style={{background:"#f0faf8",borderRadius:10,padding:"10px 12px",fontSize:10,color:"#666",marginBottom:12}}>
                  📍 Lokasi: {outletNama}<br/>
                  🕐 Sebelum: {fotoData.waktu_before?new Date(fotoData.waktu_before).toLocaleTimeString("id-ID"):"--"}<br/>
                  🕐 Sesudah: {fotoData.waktu_after?new Date(fotoData.waktu_after).toLocaleTimeString("id-ID"):"--"}
                </div>
                <button onClick={()=>{setMisiFotoTarget(null);setFotoStep("before");setFotoData({});}}
                  style={{width:"100%",padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#16a34a,#22c55e)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                  Selesai
                </button>
              </>
            )}

            {fotoStep!=="done"&&<button onClick={()=>{stopFotoKam();setMisiFotoTarget(null);setFotoStep("before");setFotoData({});}} style={{width:"100%",padding:"10px",marginTop:8,borderRadius:10,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Batal</button>}
          </div>
        </div>
      )}

      {/* ═══ PROFIL ═══ */}
      {tab==="profil"&&(
      <div className="pk-card">
        <div style={{textAlign:"center",marginBottom:20}}>
          <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:28,color:"#fff",margin:"0 auto 10px"}}>{user.nama?.slice(0,2).toUpperCase()}</div>
          <div style={{fontWeight:900,fontSize:18,color:"#1a2e2a"}}>{user.nama}</div>
          <div style={{fontSize:11,color:"#aaa",marginTop:2}}>📍 {outletNama}</div>
        </div>
        <div style={{background:"#fff",borderRadius:16,border:"2px solid #e0f5f1",overflow:"hidden",marginBottom:12}}>
          {[{icon:"🎯",l:"Poin Misi",v:`${totalPoin} poin`},{icon:"📅",l:"Kehadiran",v:`${hadirRows.length} hari`},{icon:"⏱",l:"Kekurangan Jam",v:totalKurang>0?fmtJam(totalKurang):"✓ Tidak ada"},{icon:"💰",l:"Est. Gaji",v:fmtRp(gajiEst)}].map((r,i)=>(
            <div key={r.l} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 16px",borderTop:i>0?"1px solid #f0faf8":"none"}}>
              <span style={{fontSize:20,flexShrink:0}}>{r.icon}</span><div style={{flex:1,fontSize:12,color:"#555",fontWeight:600}}>{r.l}</div><div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>{r.v}</div>
            </div>
          ))}
        </div>
        <button onClick={onLogout} style={{width:"100%",padding:"13px",borderRadius:13,border:"2px solid #fca5a5",background:"#fff5f5",color:"#dc2626",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🚪 Keluar / Logout</button>
      </div>
      )}
      </div>

      {/* Bottom Sheet Pengajuan */}
      {showSheet&&(
        <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.45)"}} onClick={()=>setShowSheet(false)}/>
          <div style={{position:"relative",background:"#fff",borderRadius:"24px 24px 0 0",maxHeight:"85vh",display:"flex",flexDirection:"column",animation:"slideUp .3s ease"}}>
            <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>
            <div style={{display:"flex",justifyContent:"center",padding:"12px 0 8px",flexShrink:0}}><div style={{width:40,height:4,borderRadius:99,background:"#e0e0e0"}}/></div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px 12px",borderBottom:"1px solid #f0faf8",flexShrink:0}}>
              <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a"}}>{sheetMode==="form"&&selJenis?`Ajukan ${selJenis.k}`:"Pilih Jenis Pengajuan"}</div>
              <button onClick={()=>setShowSheet(false)} style={{background:"#f0faf8",border:"none",borderRadius:"50%",width:30,height:30,cursor:"pointer",fontSize:16,color:"#888",display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
            </div>
            <div style={{overflowY:"auto",padding:"16px 20px 24px",flex:1}}>
              {submitOk?(
                <div style={{textAlign:"center",padding:"24px 0"}}><div style={{fontSize:52,marginBottom:10}}>✅</div><div style={{fontWeight:900,fontSize:16,color:"#16a34a"}}>Pengajuan Terkirim!</div><div style={{fontSize:12,color:"#aaa",marginTop:4}}>Menunggu persetujuan admin</div></div>
              ):sheetMode==="pilih"?(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {JENIS.map(j=>(
                    <button key={j.k} onClick={()=>{setSelJenis(j);setSheetMode("form");}} style={{background:j.bg,border:`2px solid ${j.color}30`,borderRadius:14,padding:"18px 10px",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                      <div style={{fontSize:28,marginBottom:6}}>{j.icon}</div><div style={{fontWeight:800,fontSize:12,color:j.color}}>{j.k}</div><div style={{fontSize:9,color:"#aaa",marginTop:3}}>{j.desc}</div>
                    </button>
                  ))}
                </div>
              ):(
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:12,background:selJenis?.bg,marginBottom:16,border:`1px solid ${selJenis?.color}30`}}>
                    <span style={{fontSize:22}}>{selJenis?.icon}</span><div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:selJenis?.color}}>{selJenis?.k}</div></div>
                    <button onClick={()=>setSheetMode("pilih")} style={{background:"none",border:"none",color:"#aaa",cursor:"pointer",fontSize:11,fontFamily:"inherit"}}>Ganti</button>
                  </div>
                  <div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:5}}>Tanggal *</label><input type="date" value={formAjuan.tgl} onChange={e=>setFormAjuan(p=>({...p,tgl:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"}}/></div>
                  {selJenis?.k==="Lembur"&&<div style={{marginBottom:12}}><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:5}}>Jam Lembur</label><input type="text" placeholder="18:00 - 21:00" value={formAjuan.jam} onChange={e=>setFormAjuan(p=>({...p,jam:e.target.value}))} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"}}/></div>}
                  <div style={{marginBottom:16}}><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:5}}>Keterangan *</label><textarea value={formAjuan.ket} onChange={e=>setFormAjuan(p=>({...p,ket:e.target.value}))} rows={3} placeholder="Jelaskan alasan..." style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",resize:"none"}}/></div>
                  <button onClick={submitIzin} disabled={!formAjuan.tgl||!formAjuan.ket.trim()} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",background:!formAjuan.tgl||!formAjuan.ket.trim()?"#ccc":`linear-gradient(135deg,${selJenis?.color},${selJenis?.color}cc)`,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>📤 Kirim Pengajuan {selJenis?.k}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"#fff",borderTop:"1px solid #e0f5f1",display:"flex",zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,.08)"}}>
        {TABS_P.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{flex:1,padding:"8px 4px 6px",border:"none",background:"transparent",cursor:"pointer",fontFamily:"inherit",display:"flex",flexDirection:"column",alignItems:"center",gap:2,borderTop:`3px solid ${tab===t.k?"#0d9488":"transparent"}`,transition:"all .15s"}}>
            <span style={{fontSize:20,lineHeight:1}}>{t.icon}</span>
            <span style={{fontSize:9,fontWeight:700,color:tab===t.k?"#0d9488":"#94a3b8"}}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==============================================================================
// ADMIN PORTAL PAGE — kelola misi, note, shift, review izin & absensi
// ==============================================================================
// Komponen pilih waktu format 24 jam (WIB) — hindari AM/PM browser
function Time24Input({value, onChange}) {
  const [h,m] = (value||"08:00").split(":");
  const setH = nh => onChange(`${nh.padStart(2,"0")}:${m||"00"}`);
  const setM = nm => onChange(`${h||"08"}:${nm.padStart(2,"0")}`);
  const selStyle = {flex:1,padding:"8px 6px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit",background:"#fff",cursor:"pointer",textAlign:"center",fontWeight:700};
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <select value={h} onChange={e=>setH(e.target.value)} style={selStyle}>
        {Array.from({length:24},(_,i)=>String(i).padStart(2,"0")).map(v=><option key={v} value={v}>{v}</option>)}
      </select>
      <span style={{fontWeight:900,color:"#aaa"}}>:</span>
      <select value={m} onChange={e=>setM(e.target.value)} style={selStyle}>
        {["00","15","30","45"].map(v=><option key={v} value={v}>{v}</option>)}
      </select>
      <span style={{fontSize:10,color:"#aaa",fontWeight:700,flexShrink:0}}>WIB</span>
    </div>
  );
}

// ==============================================================================
// STRATEGI BULANAN — insight tren penjualan + auto-generate misi (realtime)
// ==============================================================================
function StrategiBulananPage({ transactions=[], outlets=[], products=[], misi=[], setMisi=()=>{}, notify, onBack }) {
  const [tab,setTab] = useState("insight"); // insight | misi
  const [applied,setApplied] = useState({}); // {idx: true} sudah diterapkan

  // ── Hitung rentang tanggal ──
  const now = new Date();
  const hariBerjalan = now.getDate(); // hari ke-N bulan ini
  const bulanLaluStart = new Date(now.getFullYear(), now.getMonth()-1, 1);
  const bulanLaluEnd   = new Date(now.getFullYear(), now.getMonth(), 0);
  const hariTotalBulanLalu = bulanLaluEnd.getDate();
  const bulanIniStart  = new Date(now.getFullYear(), now.getMonth(), 1);

  const parseTglTx = (t) => {
    try{ const p=t.date.split('/'); return p.length===3?new Date(p[2],p[1]-1,p[0]):new Date(t.date); }catch{ return null; }
  };

  const txBulanLalu = transactions.filter(t=>{ const d=parseTglTx(t); return d&&d>=bulanLaluStart&&d<=bulanLaluEnd; });
  const txBulanIni  = transactions.filter(t=>{ const d=parseTglTx(t); return d&&d>=bulanIniStart&&d<=now; });

  // ── Analisis per-produk ──
  const produkMap = {}; // nama -> {terjual, omset, modal}
  txBulanLalu.forEach(t=>(t.items||[]).filter(i=>!i.refunded).forEach(i=>{
    if(!produkMap[i.name]) produkMap[i.name]={nama:i.name,terjual:0,omset:0,modal:0,id:i.id||i.stock?.id||null};
    produkMap[i.name].terjual+=i.qty;
    produkMap[i.name].omset+=i.price*i.qty;
    produkMap[i.name].modal+=(i.modal||0)*i.qty;
  }));
  const produkIniMap = {}; // realisasi bulan ini sofar
  txBulanIni.forEach(t=>(t.items||[]).filter(i=>!i.refunded).forEach(i=>{
    produkIniMap[i.name]=(produkIniMap[i.name]||0)+i.qty;
  }));

  const analisis = Object.values(produkMap).map(p=>{
    const proyeksi = hariTotalBulanLalu>0 ? (p.terjual/hariTotalBulanLalu)*hariBerjalan : 0;
    const realisasi = produkIniMap[p.nama]||0;
    const trend = proyeksi>0.5 ? Math.round(((realisasi-proyeksi)/proyeksi)*100) : 0;
    const margin = p.omset>0 ? Math.round((p.omset-p.modal)/p.omset*100) : 0;
    return {...p, proyeksi:Math.round(proyeksi), realisasi, trend, margin, totalMargin:p.omset-p.modal};
  });

  const naik = analisis.filter(p=>p.trend>15&&p.proyeksi>0).sort((a,b)=>b.trend-a.trend);
  const turun = analisis.filter(p=>p.trend<-15&&p.proyeksi>0).sort((a,b)=>a.trend-b.trend);
  const topMargin = [...analisis].filter(p=>p.totalMargin>0).sort((a,b)=>b.totalMargin-a.totalMargin).slice(0,3);
  const slowMover = [...analisis].filter(p=>p.terjual>0).sort((a,b)=>a.terjual-b.terjual).slice(0,3);

  // ── Jam ramai/sepi (dari transaksi bulan lalu) ──
  const jamMap = {}; // "08-10" -> count
  const jamBuckets = [[8,10],[10,12],[12,14],[14,16],[16,18],[18,20],[20,22]];
  const getJamBucket = (timeStr) => {
    if(!timeStr) return null;
    const h = parseInt(timeStr.split(':')[0],10);
    const b = jamBuckets.find(([s,e])=>h>=s&&h<e);
    return b ? `${String(b[0]).padStart(2,'0')}-${String(b[1]).padStart(2,'0')}` : null;
  };
  txBulanLalu.forEach(t=>{
    const bucket = getJamBucket(t.time);
    if(bucket) jamMap[bucket]=(jamMap[bucket]||0)+1;
  });
  const jamData = jamBuckets.map(([s,e])=>{
    const key = `${String(s).padStart(2,'0')}-${String(e).padStart(2,'0')}`;
    return {jam:key, trx:jamMap[key]||0};
  });
  const adaJamData = jamData.some(j=>j.trx>0);
  const jamPaling = adaJamData ? [...jamData].sort((a,b)=>b.trx-a.trx)[0] : null;
  const jamSepi   = adaJamData ? [...jamData].sort((a,b)=>a.trx-b.trx)[0] : null;

  const TrendBadge = ({trend}) => {
    if(trend>15) return <span style={{fontSize:10,fontWeight:800,color:"#16a34a",background:"#f0fdf4",padding:"2px 8px",borderRadius:20}}>📈 +{trend}%</span>;
    if(trend<-15) return <span style={{fontSize:10,fontWeight:800,color:"#dc2626",background:"#fff5f5",padding:"2px 8px",borderRadius:20}}>📉 {trend}%</span>;
    return <span style={{fontSize:10,fontWeight:800,color:"#888",background:"#f5f5f5",padding:"2px 8px",borderRadius:20}}>➡️ {trend}%</span>;
  };

  // ── Auto-generate misi suggestions ──
  const findProdukId = (nama) => {
    const p = products.find(x=>(x.name||x.nama)===nama);
    return p?.id || nama;
  };
  const generatedMisi = [];
  if(naik[0]) generatedMisi.push({
    icon:"🚀", judul:`Pertahankan Momentum: ${naik[0].nama}`,
    alasan:`Penjualan naik ${naik[0].trend}% dibanding proyeksi bulan lalu — tingkatkan target untuk capitalize tren`,
    produk:naik[0].nama, produkId:findProdukId(naik[0].nama),
    tipe:"auto_produk", target: Math.max(1,Math.round(naik[0].terjual*1.15)), poin:200,
  });
  slowMover.filter(p=>p.terjual>0).slice(0,2).forEach(p=>generatedMisi.push({
    icon:"📣", judul:`Dorong Penjualan: ${p.nama}`,
    alasan:`Hanya terjual ${p.terjual} unit bulan lalu — stok menumpuk, perlu promosi aktif`,
    produk:p.nama, produkId:findProdukId(p.nama),
    tipe:"auto_produk", target: Math.max(p.terjual*2,5), poin:250,
  }));
  if(topMargin[0]) generatedMisi.push({
    icon:"💎", judul:`Fokus Margin Tinggi: ${topMargin[0].nama}`,
    alasan:`Margin ${topMargin[0].margin}% — kontribusi profit terbesar, prioritaskan tawarkan ke pelanggan`,
    produk:topMargin[0].nama, produkId:findProdukId(topMargin[0].nama),
    tipe:"auto_produk", target: Math.max(1,Math.round(topMargin[0].terjual*1.1)), poin:300,
  });
  if(jamSepi&&jamSepi.trx>0) generatedMisi.push({
    icon:"⏰", judul:`Tingkatkan Transaksi Jam Sepi (${jamSepi.jam})`,
    alasan:`Jam ${jamSepi.jam} hanya ${jamSepi.trx} transaksi bulan lalu — jam paling sepi, perlu strategi seperti promo flash sale`,
    produk:null, produkId:null,
    tipe:"auto_transaksi", target: Math.max(jamSepi.trx*2,5), poin:150,
  });

  // ── Terapkan misi ──
  const terapkanMisi = async (m, idx) => {
    const payload = {
      judul:m.judul, deskripsi:m.alasan, icon:m.icon,
      poin:m.poin, target:m.target, satuan:m.tipe==="auto_transaksi"?"transaksi":"pcs",
      periode:"bulanan", tipe:m.tipe, produk_id:m.produkId||null,
      progress:0, selesai:false,
    };
    try{
      const {data} = await supabase.from('portal_misi').insert(payload).select();
      if(data?.[0]) setMisi(prev=>[...prev,data[0]]);
      setApplied(prev=>({...prev,[idx]:true}));
      notify(`✓ Misi "${m.judul}" diterapkan`,"ok");
    }catch(e){ notify("Gagal menerapkan misi: "+e.message,"err"); }
  };
  const terapkanSemua = async () => {
    for(let i=0;i<generatedMisi.length;i++){
      if(!applied[i]) await terapkanMisi(generatedMisi[i],i);
    }
  };

  const css = `*{box-sizing:border-box}@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}.fade{animation:fadeUp .3s ease}`;

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <style>{css}</style>
      <div style={{background:"linear-gradient(135deg,#1e1b4b,#312e81,#4338ca)",padding:"16px 24px",display:"flex",alignItems:"center",gap:12}}>
        <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"6px 14px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Menu</button>
        <div>
          <div style={{fontWeight:900,fontSize:18,color:"#fff"}}>🧠 Strategi Bulanan Otomatis</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,.7)",marginTop:2}}>Analisis penjualan {hariTotalBulanLalu} hari terakhir vs {hariBerjalan} hari bulan ini · realtime</div>
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8}}>
          {[["insight","📊 Insight & Tren"],["misi","🎯 Misi yang Disarankan"]].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              style={{padding:"8px 16px",borderRadius:10,border:"none",background:tab===k?"#fff":"rgba(255,255,255,.12)",color:tab===k?"#312e81":"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"20px 24px",maxWidth:1000,margin:"0 auto"}}>

        {txBulanLalu.length===0&&(
          <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"14px",fontSize:12,color:"#92400e",marginBottom:16}}>
            ⚠️ Belum ada data transaksi bulan lalu yang cukup untuk analisis. Insight akan muncul setelah ada riwayat transaksi.
          </div>
        )}

        {tab==="insight"&&(
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:12,marginBottom:20}}>
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px"}}>
                <div style={{fontSize:22,marginBottom:6}}>📈</div>
                <div style={{fontWeight:900,fontSize:20,color:"#16a34a"}}>{naik.length}</div>
                <div style={{fontSize:11,color:"#888",fontWeight:700}}>Produk Naik (&gt;15%)</div>
              </div>
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px"}}>
                <div style={{fontSize:22,marginBottom:6}}>📉</div>
                <div style={{fontWeight:900,fontSize:20,color:"#dc2626"}}>{turun.length}</div>
                <div style={{fontSize:11,color:"#888",fontWeight:700}}>Produk Turun (&gt;15%)</div>
              </div>
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px"}}>
                <div style={{fontSize:22,marginBottom:6}}>⏰</div>
                <div style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{jamPaling?jamPaling.jam:"--"}</div>
                <div style={{fontSize:11,color:"#888",fontWeight:700}}>Jam Paling Ramai {jamPaling?`(${jamPaling.trx} trx)`:""}</div>
              </div>
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px"}}>
                <div style={{fontSize:22,marginBottom:6}}>💎</div>
                <div style={{fontWeight:900,fontSize:16,color:"#8e44ad"}}>{topMargin[0]?.nama?.slice(0,16)||"--"}</div>
                <div style={{fontSize:11,color:"#888",fontWeight:700}}>Margin Tertinggi {topMargin[0]?`(${topMargin[0].margin}%)`:""}</div>
              </div>
            </div>

            {naik.length>0&&(
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
                <div style={{fontWeight:800,fontSize:13,color:"#16a34a",marginBottom:10}}>📈 Produk dengan Tren Naik</div>
                {naik.map(p=>(
                  <div key={p.nama} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f0faf8"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:12}}>{p.nama}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>Bulan lalu: {p.terjual} unit · Proyeksi {hariBerjalan} hari: {p.proyeksi} · Realisasi: {p.realisasi}</div>
                    </div>
                    <TrendBadge trend={p.trend}/>
                  </div>
                ))}
                <div style={{marginTop:10,background:"#f0fdf4",borderRadius:9,padding:"10px 12px",fontSize:11,color:"#16a34a"}}>
                  💡 Pertahankan stok dan promosi untuk produk ini — momentum sedang baik
                </div>
              </div>
            )}

            {turun.length>0&&(
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
                <div style={{fontWeight:800,fontSize:13,color:"#dc2626",marginBottom:10}}>📉 Produk dengan Tren Turun</div>
                {turun.map(p=>(
                  <div key={p.nama} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:"1px solid #f0faf8"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:12}}>{p.nama}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>Bulan lalu: {p.terjual} unit · Proyeksi: {p.proyeksi} · Realisasi: {p.realisasi}</div>
                    </div>
                    <TrendBadge trend={p.trend}/>
                  </div>
                ))}
                <div style={{marginTop:10,background:"#fff5f5",borderRadius:9,padding:"10px 12px",fontSize:11,color:"#dc2626"}}>
                  ⚠️ Pertimbangkan promo, bundling, atau cek alasan penurunan (stok, harga kompetitor, dll)
                </div>
              </div>
            )}

            {adaJamData&&(
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
                <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:12}}>⏰ Distribusi Transaksi per Jam (Bulan Lalu)</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:8,height:100}}>
                  {jamData.map(j=>{
                    const maxTrx = Math.max(...jamData.map(x=>x.trx),1);
                    const h = (j.trx/maxTrx)*100;
                    const isPaling = jamPaling&&j.jam===jamPaling.jam&&j.trx>0;
                    const isSepi = jamSepi&&j.jam===jamSepi.jam;
                    return (
                      <div key={j.jam} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                        <div style={{width:"100%",height:`${h}%`,borderRadius:"6px 6px 0 0",background:isPaling?"#16a34a":isSepi?"#fca5a5":"#0d9488",minHeight:4}}/>
                        <div style={{fontSize:9,fontWeight:700,color:isPaling?"#16a34a":isSepi?"#dc2626":"#888"}}>{j.jam}</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{marginTop:10,fontSize:11,color:"#888",display:"flex",gap:16}}>
                  <span><span style={{display:"inline-block",width:10,height:10,background:"#16a34a",borderRadius:3,marginRight:4}}/>Paling ramai</span>
                  <span><span style={{display:"inline-block",width:10,height:10,background:"#fca5a5",borderRadius:3,marginRight:4}}/>Paling sepi</span>
                </div>
              </div>
            )}

            {slowMover.length>0&&(
              <div className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px"}}>
                <div style={{fontWeight:800,fontSize:13,color:"#d97706",marginBottom:10}}>🐢 Produk Paling Sedikit Terjual (Restock Perhatian)</div>
                {slowMover.map(p=>(
                  <div key={p.nama} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:"1px solid #f0faf8"}}>
                    <div style={{flex:1,fontWeight:700,fontSize:12}}>{p.nama}</div>
                    <span style={{fontSize:10,fontWeight:800,color:"#d97706",background:"#fffbeb",padding:"2px 10px",borderRadius:20}}>{p.terjual} unit/bulan</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab==="misi"&&(
          <>
            <div className="fade" style={{background:"linear-gradient(135deg,#1e1b4b,#4338ca)",borderRadius:14,padding:"16px",marginBottom:16,color:"#fff"}}>
              <div style={{fontWeight:800,fontSize:13,marginBottom:6}}>🤖 Misi Auto-Generate Berdasarkan Data</div>
              <div style={{fontSize:11,opacity:.85,lineHeight:1.6}}>
                {generatedMisi.length>0
                  ? `Sistem menganalisis tren penjualan dan menyarankan ${generatedMisi.length} misi untuk bulan ini. Klik "Terapkan" untuk menambahkan ke daftar misi karyawan (periode bulanan).`
                  : "Belum cukup data untuk menyarankan misi. Pastikan ada riwayat transaksi bulan lalu."}
              </div>
            </div>

            {generatedMisi.length>0&&(
              <>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
                {generatedMisi.map((m,i)=>(
                  <div key={i} className="fade" style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"14px 16px"}}>
                    <div style={{display:"flex",gap:12}}>
                      <div style={{width:42,height:42,borderRadius:12,background:"#f0faf8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0,border:"2px solid #e0f5f1"}}>{m.icon}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>{m.judul}</div>
                        <div style={{fontSize:10,color:"#888",marginTop:3,lineHeight:1.5}}>{m.alasan}</div>
                        <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                          <span style={{background:"#e0faf5",color:"#0d9488",fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:20}}>🗓️ Bulanan</span>
                          {m.produk&&<span style={{background:"#fef9c3",color:"#92400e",fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:20}}>📱 {m.produk}</span>}
                          <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:9,fontWeight:700,padding:"2px 9px",borderRadius:20}}>🎯 Target: {m.target}</span>
                          <span style={{background:"#fffbeb",color:"#d97706",fontSize:9,fontWeight:800,padding:"2px 9px",borderRadius:20}}>🏅 {m.poin} poin</span>
                        </div>
                      </div>
                      <button onClick={()=>terapkanMisi(m,i)} disabled={applied[i]}
                        style={{padding:"6px 14px",borderRadius:9,border:"none",background:applied[i]?"#86efac":"linear-gradient(135deg,#0d9488,#14b8a6)",color:applied[i]?"#16a34a":"#fff",fontWeight:800,fontSize:11,cursor:applied[i]?"default":"pointer",fontFamily:"inherit",flexShrink:0,alignSelf:"flex-start"}}>
                        {applied[i]?"✓ Diterapkan":"+ Terapkan"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={terapkanSemua}
                style={{width:"100%",padding:"14px",borderRadius:12,border:"none",background:"linear-gradient(135deg,#312e81,#4338ca)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
                ⚡ Terapkan Semua Misi Sekaligus
              </button>

              <div style={{marginTop:14,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"12px",fontSize:11,color:"#92400e",lineHeight:1.7}}>
                💡 <b>Cara kerja:</b> Sistem menganalisis data penjualan {hariTotalBulanLalu} hari bulan lalu dan membuat draft misi bulanan otomatis. Setiap kali halaman ini dibuka, analisis dihitung ulang dari data transaksi terbaru (realtime). Misi yang sudah diterapkan akan langsung muncul di Portal Karyawan.
              </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AdminPortalPage({ outlets, users, misi, setMisi, note, setNote, shift, setShift, absensiMap, setAbsensiMap, izinMap, setIzinMap, onBack, notify, todos, setTodos, todoStatus, poinRate, setPoinRate, misiProgress, misiFoto, products=[], strukConfig={}, setStrukConfig=()=>{}, currentUser=null }) {
  const [tab,setTab]         = useState("overview"); // overview|misi|izin|absensi|settings
  const [editNote,setEditNote]=useState(false);
  const [draftNote,setDraftNote]=useState(note);
  const [draftShift,setDraftShift]=useState(()=>{
    const s = shift||{};
    // Migrasi dari format lama {masuk,pulang,totalJam} ke array shifts
    if(s.shifts) return s;
    return {
      shifts: [
        {nama:"Pagi", masuk: s.masuk||"08:00", pulang: s.pulang||"17:00", totalJam: s.totalJam||9},
        {nama:"Siang", masuk:"13:00", pulang:"21:00", totalJam:8},
      ],
      lemburTipe: "perjam", // "perjam" | "pershift"
      lemburFlat: 25000,    // nominal jika "pershift"
    };
  });
  const [draftPotongan,setDraftPotongan]=useState({
    gajiPokok:2800000, rateLembur:15000,
    potonganIzin:50000, potonganAlpha:100000, potonganSakit:25000, potonganTelat:1000,
  });
  const [draftGajiKaryawan,setDraftGajiKaryawan]=useState({}); // {username:{gajiPokok,kasbon,potonganLain}}
  const [absenDetail,setAbsenDetail]=useState(null); // {tgl,masuk,pulang,foto_masuk,foto_pulang,lokasi,nama,outlet}
  const [slipGajiTarget,setSlipGajiTarget]=useState(null); // username
  const [showMisiForm,setShowMisiForm]=useState(false);
  const [misiForm,setMisiForm]=useState({icon:"🎯",judul:"",deskripsi:"",poin:100,target:1,satuan:"hari",periode:"harian",tipe:"manual_checklist",produk_id:""});
  const [editMisiId,setEditMisiId]=useState(null);
  const [draftPoinRate,setDraftPoinRate]=useState(poinRate||1000);
  const [showResetInfo,setShowResetInfo]=useState(false);
  const [showTodoForm,setShowTodoForm]=useState(false);
  const [todoForm,setTodoForm]=useState({judul:"",periode:"harian"});
  const [editTodoId,setEditTodoId]=useState(null);
  const [fotoDetail,setFotoDetail]=useState(null); // misi foto yang dilihat detail
  const [historyData,setHistoryData]=useState([]); // semua snapshot history
  const [closingPeriod,setClosingPeriod]=useState(false);

  // Load history saat tab dibuka
  useEffect(()=>{
    if(tab!=="history") return;
    (async()=>{
      try{
        const {data} = await supabase.from('portal_history').select('*').order('periode_key',{ascending:false});
        if(data) setHistoryData(data);
      }catch(e){ console.warn('history load:',e); }
    })();
  },[tab]);

  // Tutup periode: snapshot semua karyawan ke history, lalu reset progress/absensi/izin
  const tutupPeriode = async () => {
    if(!window.confirm("Tutup periode bulan ini?\n\nSemua progress misi, absensi, dan izin karyawan akan di-RESET ke 0 untuk siklus baru.\nData bulan ini akan disimpan permanen di History.\n\nLanjutkan?")) return;
    setClosingPeriod(true);
    const now = new Date();
    const periodeKey = getPeriodeKey("bulanan", now);
    const periodeLabel = getPeriodeLabel("bulanan", now);
    const tglMulai = new Date(now.getFullYear(),now.getMonth(),1).toISOString().slice(0,10);
    const tglSelesai = new Date(now.getFullYear(),now.getMonth()+1,0).toISOString().slice(0,10);

    try {
      for (const k of karyawanList) {
        const absList = absensiMap[k.username]||[];
        const hadirN = absList.filter(a=>a.masuk&&a.masuk!=="--").length;
        const izinList = (izinMap[k.username]||[]).filter(i=>i.status==="disetujui");
        const izinN = izinList.filter(i=>i.jenis==="Izin").length;
        const sakitN = izinList.filter(i=>i.jenis==="Sakit").length;

        // Hitung misi selesai bulan ini untuk karyawan ini
        const misiBulanan = misi.filter(m=>(m.periode||"harian")==="bulanan");
        let misiSelesaiN=0, totalPoinN=0;
        misiBulanan.forEach(m=>{
          const rec = misiProgress[m.id]?.[k.username]?.[periodeKey];
          if(rec?.selesai){ misiSelesaiN++; totalPoinN+=m.poin; }
        });
        // Tambahkan poin dari misi harian/mingguan juga (akumulasi seluruh bulan ini tidak tersedia granular,
        // jadi kita hitung total poin dari semua misi yang selesai pada periode key yang relevan)
        misi.filter(m=>(m.periode||"harian")!=="bulanan").forEach(m=>{
          // untuk harian/mingguan, kita tidak punya agregat bulanan otomatis -> skip dari total resmi
          // (poin harian/mingguan sudah "dipakai" saat itu, history fokus pada bulanan + kehadiran)
        });

        const bonusRp = totalPoinN * (poinRate||1000);
        const totalTodo = todos.length * 30; // estimasi hari dalam bulan
        let todoSelesaiN = 0;
        todos.forEach(t=>{
          const statusMap = todoStatus[k.username]?.[t.id]||{};
          todoSelesaiN += Object.values(statusMap).filter(rec=>rec?.status==="dikonfirmasi").length;
        });

        await supabase.from('portal_history').upsert({
          username:k.username, user_nama:k.nama,
          periode_label:periodeLabel, periode_key:periodeKey,
          tgl_mulai:tglMulai, tgl_selesai:tglSelesai,
          misi_selesai:misiSelesaiN, total_misi:misiBulanan.length,
          total_poin:totalPoinN, bonus_rp:bonusRp,
          hadir:hadirN, izin:izinN, sakit:sakitN,
          todo_selesai:todoSelesaiN, total_todo:totalTodo,
        },{onConflict:'username,periode_key'});
      }

      // Reset: hapus absensi, izin, dan progress misi (data lama sudah di history)
      await supabase.from('portal_absensi').delete().neq('user_id','');
      await supabase.from('portal_izin').delete().neq('user_id','');
      await supabase.from('portal_misi_progress').delete().neq('username','');
      await supabase.from('portal_todo_status').delete().neq('username','');
      setAbsensiMap({}); setIzinMap({});

      notify("✓ Periode ditutup, data tersimpan ke History & direset","ok");
      const {data} = await supabase.from('portal_history').select('*').order('periode_key',{ascending:false});
      if(data) setHistoryData(data);
    } catch(e) {
      notify("Gagal tutup periode: "+e.message,"err");
    }
    setClosingPeriod(false);
  };

  const karyawanList = Object.entries(users||{})
    .filter(([k,u])=>["karyawan","kasir","bank","staff"].includes(u.role))
    .map(([k,u])=>({...u,username:k}));
  const allIzin = Object.entries(izinMap||{}).flatMap(([uid,list])=>list.map(i=>({...i,userId:uid,userName:i.userName||users?.[uid]?.nama||uid})));
  const pendingIzin = allIzin.filter(i=>i.status==="menunggu");

  // ── Konfirmasi Tugas Wajib: kumpulkan semua entri status="menunggu" dari semua karyawan ──
  const pendingTugas = [];
  Object.entries(todoStatus||{}).forEach(([username,byTodo])=>{
    Object.entries(byTodo||{}).forEach(([todoId,byTgl])=>{
      Object.entries(byTgl||{}).forEach(([tgl,rec])=>{
        if(rec?.done && rec?.status==="menunggu"){
          const todo = (todos||[]).find(t=>t.id===todoId);
          pendingTugas.push({username, userNama:users?.[username]?.nama||username, todoId, todoJudul:todo?.judul||todoId, tgl});
        }
      });
    });
  });
  const confirmTugas = async (username,todoId,tgl) => {
    try{
      await supabase.from('portal_todo_status').update({
        status:'dikonfirmasi', confirmed_at:new Date().toISOString(), confirmed_by:currentUser?.nama||currentUser?.username||'admin'
      }).eq('username',username).eq('todo_id',todoId).eq('tgl',tgl);
      notify("Tugas dikonfirmasi ✓","ok");
    }catch(e){ console.warn('confirmTugas:',e); notify("Gagal konfirmasi","err"); }
  };

  useEffect(()=>{ setDraftPoinRate(poinRate||1000); },[poinRate]);

  // ── Setting tampilan struk ──
  const [draftStruk,setDraftStruk]=useState(strukConfig);
  useEffect(()=>{ setDraftStruk(strukConfig); },[strukConfig]);
  const saveStrukConfig = async () => {
    setStrukConfig(draftStruk);
    try{ await supabase.from('portal_settings').upsert({key:"struk_config",value:JSON.stringify(draftStruk)},{onConflict:"key"}); }catch(e){ console.warn('save struk_config:',e); }
    notify("Tampilan struk disimpan ✓","ok");
  };

  const savePoinRate = async () => {
    setPoinRate(draftPoinRate);
    try{ await supabase.from('portal_settings').upsert({key:"poin_rate",value:String(draftPoinRate)},{onConflict:"key"}); }catch(e){ console.warn('save poin_rate:',e); }
    notify("Nilai konversi poin disimpan ✓","ok");
  };

  // ── To-Do Wajib handlers ──
  const saveTodo = async () => {
    if(!todoForm.judul.trim()) return notify("Isi judul tugas!","err");
    if(editTodoId){
      setTodos(prev=>prev.map(t=>t.id===editTodoId?{...t,...todoForm}:t));
      try{ await supabase.from('portal_todos').update({judul:todoForm.judul,periode:todoForm.periode}).eq('id',editTodoId); }catch(e){ console.warn('todo update:',e); }
    } else {
      const tempId = Date.now();
      const newT = {id:tempId,judul:todoForm.judul,periode:todoForm.periode,urutan:todos.length};
      setTodos(prev=>[...prev,newT]);
      try{
        const {data} = await supabase.from('portal_todos').insert({judul:todoForm.judul,periode:todoForm.periode,urutan:todos.length}).select();
        if(data?.[0]) setTodos(prev=>prev.map(t=>t.id===tempId?data[0]:t));
      }catch(e){ console.warn('todo insert:',e); }
    }
    notify("Tugas disimpan ✓","ok");
    setShowTodoForm(false); setEditTodoId(null); setTodoForm({judul:"",periode:"harian"});
  };

  const hapusTodo = async (id) => {
    if(!window.confirm("Hapus tugas ini?")) return;
    setTodos(prev=>prev.filter(t=>t.id!==id));
    try{ await supabase.from('portal_todos').delete().eq('id',id); }catch(e){ console.warn('todo delete:',e); }
    notify("Tugas dihapus","ok");
  };

  // ── Misi Foto approval ──
  const responFoto = async (fotoId, status) => {
    try{ await supabase.from('portal_misi_foto').update({status}).eq('id',fotoId); }catch(e){ console.warn('foto status update:',e); }
    if(status==="disetujui"){
      const f = misiFoto.find(x=>x.id===fotoId);
      if(f){
        const m = misi.find(x=>x.id===f.misi_id);
        if(m){
          const periodeKey = f.periode_key||getPeriodeKey(m.periode||"harian");
          const existing = misiProgress[m.id]?.[f.username]?.[periodeKey]?.progress||0;
          const newProgress = existing+1;
          const selesai = newProgress>=(m.target||1);
          try{
            await supabase.from('portal_misi_progress').upsert({
              misi_id:m.id, username:f.username, periode_key:periodeKey,
              progress:newProgress, selesai, updated_at:new Date().toISOString()
            },{onConflict:'misi_id,username,periode_key'});
          }catch(e){ console.warn('misi progress dari foto:',e); }
        }
      }
    }
    setFotoDetail(null);
    notify(status==="disetujui"?"✓ Misi disetujui":"Misi ditolak", status==="disetujui"?"ok":"err");
  };

  const saveNote = async () => {
    setNote(draftNote); setEditNote(false);
    try{ await supabase.from('portal_settings').upsert({key:"note",value:draftNote},{onConflict:"key"}); }catch(e){ console.warn('save note:',e); }
    notify("Note berhasil disimpan","ok");
  };

  const saveShift = async () => {
    setShift(draftShift);
    try{ await supabase.from('portal_settings').upsert({key:"shift",value:JSON.stringify(draftShift)},{onConflict:"key"}); }catch(e){ console.warn('save shift:',e); }
    notify("Jadwal shift disimpan","ok");
  };

  // Load settings gaji & per-karyawan saat mount
  useEffect(()=>{
    (async()=>{
      try{
        const {data} = await supabase.from('portal_settings').select('*').eq('key','potongan').limit(1);
        if(data?.[0]?.value){ try{ setDraftPotongan(JSON.parse(data[0].value)); }catch{} }
      }catch{}
      try{
        const {data} = await supabase.from('portal_settings').select('*').eq('key','gaji_karyawan').limit(1);
        if(data?.[0]?.value){ try{ setDraftGajiKaryawan(JSON.parse(data[0].value)); }catch{} }
      }catch{}
    })();
  },[]);

  const savePotongan = async () => {
    try{ await supabase.from('portal_settings').upsert({key:"potongan",value:JSON.stringify(draftPotongan)},{onConflict:"key"}); }catch(e){ console.warn('save potongan:',e); }
    notify("Pengaturan gaji & potongan disimpan ✓","ok");
  };

  const saveGajiKaryawan = async () => {
    try{ await supabase.from('portal_settings').upsert({key:"gaji_karyawan",value:JSON.stringify(draftGajiKaryawan)},{onConflict:"key"}); }catch(e){ console.warn('save gaji karyawan:',e); }
    notify("Gaji & kasbon karyawan disimpan ✓","ok");
  };

  const saveMisi = async () => {
    if(!misiForm.judul.trim()) return notify("Isi judul misi!","err");
    if((misiForm.tipe==="auto_produk")&&!misiForm.produk_id) return notify("Pilih produk untuk misi auto produk!","err");
    const payload = {
      judul:misiForm.judul, deskripsi:misiForm.deskripsi, icon:misiForm.icon,
      poin:+misiForm.poin, target:+misiForm.target, satuan:misiForm.satuan,
      periode:misiForm.periode, tipe:misiForm.tipe, produk_id:misiForm.produk_id||null,
    };
    if(editMisiId) {
      const updated = misi.map(m=>m.id===editMisiId?{...m,...payload}:m);
      setMisi(updated);
      try{ await supabase.from('portal_misi').update(payload).eq('id',editMisiId); }catch(e){ console.warn('misi update:',e); }
    } else {
      const newM={...payload,id:Date.now(),progress:0,selesai:false};
      setMisi(p=>[...p,newM]);
      try{
        const {data} = await supabase.from('portal_misi').insert({...payload,progress:0,selesai:false}).select();
        if(data?.[0]) setMisi(p=>p.map(m=>m.id===newM.id?data[0]:m));
      }catch(e){ console.warn('misi insert:',e); }
    }
    notify("Misi disimpan ✓","ok"); setShowMisiForm(false); setEditMisiId(null);
    setMisiForm({icon:"🎯",judul:"",deskripsi:"",poin:100,target:1,satuan:"hari",periode:"harian",tipe:"manual_checklist",produk_id:""});
  };

  const hapusMisi = async (id) => {
    if(!window.confirm("Hapus misi ini?")) return;
    setMisi(p=>p.filter(m=>m.id!==id));
    try{ await supabase.from('portal_misi').delete().eq('id',id); }catch(e){ console.warn('misi delete:',e); }
    notify("Misi dihapus","ok");
  };

  const responIzin = async (userId, izinId, status) => {
    setIzinMap(prev=>{
      const list=(prev[userId]||[]).map(i=>i.id===izinId?{...i,status}:i);
      return {...prev,[userId]:list};
    });
    try{ await supabase.from('portal_izin').update({status}).eq('id',izinId); }catch(e){ console.warn('izin update:',e); }
    notify(status==="disetujui"?"✓ Izin disetujui":"Izin ditolak",status==="disetujui"?"ok":"err");
  };

  const TABS_A=[{k:"overview",icon:"📊",l:"Overview"},{k:"misi",icon:"🎯",l:"Misi"},{k:"izin",icon:"📝",l:"Izin"},{k:"absensi",icon:"📅",l:"Absensi"},{k:"history",icon:"📜",l:"History"},{k:"settings",icon:"⚙️",l:"Setting"}];

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      {/* Header */}
      <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(13,148,136,.3)"}}>
        <div style={{padding:"0 20px",minHeight:52,display:"flex",alignItems:"center",gap:12}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Menu</button>
          <div style={{flex:1}}><div style={{fontWeight:900,fontSize:15,color:"#fff"}}>👷 Portal Karyawan</div><div style={{fontSize:10,color:"rgba(255,255,255,.6)"}}>Kelola misi, absensi & izin</div></div>
          <div style={{background:"rgba(255,255,255,.15)",borderRadius:20,padding:"4px 12px",border:"1px solid rgba(255,255,255,.2)"}}><span style={{fontSize:11,fontWeight:800,color:"#fcd34d"}}>{pendingIzin.length} izin pending</span></div>
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.1)",overflowX:"auto"}}>
          {TABS_A.map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"9px 14px",border:"none",borderBottom:`3px solid ${tab===t.k?"#fff":"transparent"}`,background:"transparent",color:tab===t.k?"#fff":"rgba(255,255,255,.5)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>
              {t.icon} {t.l}
              {t.k==="izin"&&pendingIzin.length>0&&<span style={{background:"#ef4444",color:"#fff",borderRadius:"50%",width:16,height:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:900}}>{pendingIzin.length}</span>}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:"16px 20px",maxWidth:1000,margin:"0 auto"}}>

      {/* ═══ OVERVIEW ═══ */}
      {tab==="overview"&&(
      <div>
        {/* KPI cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:12,marginBottom:18}}>
          {[
            {icon:"👷",l:"Total Karyawan",  v:karyawanList.length,  c:"#0d9488", bg:"#e0faf5"},
            {icon:"📅",l:"Absensi Hari Ini",v:Object.values(absensiMap||{}).filter(list=>list.some(a=>a.tgl===today()&&a.masuk)).length, c:"#16a34a",bg:"#f0fdf4"},
            {icon:"⏳",l:"Izin Pending",    v:pendingIzin.length,   c:"#d97706", bg:"#fffbeb"},
            {icon:"🎯",l:"Total Misi",      v:misi.length,          c:"#7c3aed", bg:"#f5f3ff"},
          ].map(k=>(
            <div key={k.l} style={{background:k.bg,borderRadius:14,padding:"16px",border:`1px solid ${k.c}20`}}>
              <div style={{fontSize:24,marginBottom:6}}>{k.icon}</div>
              <div style={{fontWeight:900,fontSize:28,color:k.c}}>{k.v}</div>
              <div style={{fontSize:11,fontWeight:700,color:k.c,opacity:.7,marginTop:2}}>{k.l}</div>
            </div>
          ))}
        </div>

        {/* Absensi hari ini per karyawan */}
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"14px 16px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:12}}>📅 Status Absensi Hari Ini</div>
          {karyawanList.length===0?<div style={{color:"#aaa",fontSize:12}}>Belum ada karyawan</div>:(
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {karyawanList.map(k=>{
                const todayAbsen=(absensiMap[k.username]||[]).find(a=>a.tgl===today());
                const outletName=outlets.find(o=>o.id===k.outletId)?.nama||"--";
                return (
                  <div key={k.username} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:11,background:"#f8fffe",border:"1px solid #e0f5f1"}}>
                    <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",flexShrink:0}}>{k.nama?.slice(0,2).toUpperCase()}</div>
                    <div style={{flex:1}}><div style={{fontWeight:700,fontSize:13}}>{k.nama}</div><div style={{fontSize:10,color:"#aaa"}}>{outletName}</div></div>
                    {todayAbsen?(
                      <div style={{textAlign:"right"}}>
                        {todayAbsen.masuk&&<div style={{fontSize:11,fontWeight:700,color:"#0d9488"}}>🕐 {todayAbsen.masuk}{todayAbsen.pulang?" → 🕔 "+todayAbsen.pulang:""}</div>}
                        <span style={{fontSize:9,background:todayAbsen.pulang?"#e0faf5":"#fffbeb",color:todayAbsen.pulang?"#0d9488":"#d97706",padding:"2px 8px",borderRadius:20,fontWeight:700}}>{todayAbsen.pulang?"✓ Lengkap":"Belum Pulang"}</span>
                      </div>
                    ):<span style={{fontSize:9,background:"#fff5f5",color:"#dc2626",padding:"3px 10px",borderRadius:20,fontWeight:800}}>✗ Belum Absen</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Izin pending */}
        {pendingIzin.length>0&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #fcd34d",padding:"14px 16px"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:12}}>⏳ Izin Menunggu Persetujuan ({pendingIzin.length})</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {pendingIzin.slice(0,3).map(i=>(
                <div key={i.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",borderRadius:11,background:"#fffbeb",border:"1px solid #fcd34d"}}>
                  <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12}}>{i.userName} — {i.jenis}</div><div style={{fontSize:10,color:"#aaa"}}>{i.tgl} · {i.ket}</div></div>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={()=>responIzin(i.userId,i.id,"disetujui")} style={{padding:"5px 12px",borderRadius:8,border:"none",background:"#16a34a",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✓ Setuju</button>
                    <button onClick={()=>responIzin(i.userId,i.id,"ditolak")} style={{padding:"5px 12px",borderRadius:8,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✗ Tolak</button>
                  </div>
                </div>
              ))}
              {pendingIzin.length>3&&<button onClick={()=>setTab("izin")} style={{alignSelf:"center",background:"none",border:"none",color:"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Lihat semua {pendingIzin.length} →</button>}
            </div>
          </div>
        )}
      </div>
      )}

      {/* ═══ MISI ═══ */}
      {tab==="misi"&&(()=>{
        const TIPE_INFO = {
          auto_produk:    { icon:"📱", label:"Auto: Penjualan Produk",   color:"#0d9488", bg:"#e0faf5" },
          auto_transaksi: { icon:"💳", label:"Auto: Jumlah Transaksi",   color:"#2980b9", bg:"#e8f4fd" },
          manual_foto:    { icon:"📷", label:"Manual: Foto Before/After",color:"#d97706", bg:"#fffbeb" },
          manual_checklist:{icon:"✅", label:"Manual: Centang Sendiri",  color:"#8e44ad", bg:"#f5eeff" },
        };
        const PERIODE_INFO = {
          harian:  { label:"Harian",   icon:"☀️", desc:"Reset setiap hari jam 00:00", warna:"#0d9488" },
          mingguan:{ label:"Mingguan", icon:"📆", desc:"Reset setiap awal minggu (Senin)", warna:"#2980b9" },
          bulanan: { label:"Bulanan / Sampai Gajian", icon:"🗓️", desc:"Reset saat tanggal gajian tiba", warna:"#8e44ad" },
        };
        const fotoMenunggu = (misiFoto||[]).filter(f=>f.status==="menunggu");
        return (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a"}}>🎯 Kelola Misi & Tugas</div>
            <button onClick={()=>{setShowMisiForm(true);setEditMisiId(null);setMisiForm({icon:"🎯",judul:"",deskripsi:"",poin:100,target:1,satuan:"hari",periode:"harian",tipe:"manual_checklist",produk_id:""});}}
              style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:10,padding:"8px 16px",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ Tambah Misi</button>
          </div>

          {/* Konversi Poin -> Rp */}
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:4}}>💰 Konversi Poin ke Rupiah</div>
            <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>Bonus misi dihitung otomatis dari total poin × nilai ini</div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <span style={{fontSize:13,fontWeight:700,color:"#555"}}>1 Poin =</span>
              <div style={{position:"relative",flex:1,maxWidth:200,minWidth:140}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPoinRate} onChange={e=>setDraftPoinRate(+e.target.value)}
                  style={{width:"100%",padding:"9px 12px 9px 28px",borderRadius:9,border:"2px solid #b2ede6",fontSize:14,fontWeight:800,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <button onClick={savePoinRate} style={{padding:"9px 18px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan</button>
            </div>
          </div>

          {/* Siklus reset info */}
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>🔄 Siklus Reset Misi</div>
              <button onClick={()=>setShowResetInfo(!showResetInfo)} style={{background:"#f0faf8",border:"none",borderRadius:8,padding:"4px 10px",color:"#0d9488",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{showResetInfo?"Tutup":"Info"}</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10}}>
              {Object.entries(PERIODE_INFO).map(([k,p])=>(
                <div key={k} style={{background:`${p.warna}10`,border:`1px solid ${p.warna}30`,borderRadius:10,padding:"10px"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{p.icon}</div>
                  <div style={{fontWeight:800,fontSize:11,color:p.warna}}>{p.label}</div>
                  <div style={{fontSize:9,color:"#888",marginTop:2}}>{p.desc}</div>
                </div>
              ))}
            </div>
            {showResetInfo&&(
              <div style={{marginTop:12,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"12px",fontSize:11,color:"#92400e",lineHeight:1.7}}>
                ⚠️ <b>Penting:</b> Saat periode "Bulanan/Sampai Gajian" berakhir (tanggal gajian tiba), sistem akan:<br/>
                • Reset progress misi, absensi, dan izin ke <b>0</b> di tampilan karyawan — siklus baru dimulai<br/>
                • Data periode sebelumnya <b>otomatis tersimpan ke History</b> (tidak hilang)<br/>
                • Admin tetap bisa lihat semua history kapan saja
              </div>
            )}
          </div>

          {/* ═══ KONFIRMASI TUGAS WAJIB ═══ */}
          {pendingTugas.length>0&&(
            <div style={{marginBottom:18}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                <div style={{fontWeight:800,fontSize:12,color:"#d97706",display:"flex",alignItems:"center",gap:6}}>🔔 Konfirmasi Tugas Wajib</div>
                <span style={{fontSize:10,background:"#fef3c7",color:"#d97706",fontWeight:700,padding:"2px 10px",borderRadius:20}}>{pendingTugas.length} menunggu</span>
              </div>
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #fef3c7",overflow:"hidden"}}>
                {pendingTugas.map((p,i)=>(
                  <div key={`${p.username}-${p.todoId}-${p.tgl}`} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",borderTop:i>0?"1px solid #fffbeb":"none"}}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:"#1a2e2a"}}>{p.todoJudul}</div>
                      <div style={{fontSize:10,color:"#aaa"}}>{p.userNama} · {p.tgl}</div>
                    </div>
                    <button onClick={()=>confirmTugas(p.username,p.todoId,p.tgl)}
                      style={{background:"#dcfce7",border:"none",borderRadius:8,padding:"6px 14px",color:"#16a34a",fontWeight:800,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✓ Konfirmasi</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ TUGAS WAJIB (DI ATAS, TANPA POIN) ═══ */}
          <div style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontWeight:800,fontSize:12,color:"#8e44ad",display:"flex",alignItems:"center",gap:6}}>✅ Tugas Wajib (Tanpa Poin)</div>
              <button onClick={()=>{setShowTodoForm(!showTodoForm);setEditTodoId(null);setTodoForm({judul:"",periode:"harian"});}}
                style={{background:"#f5eeff",border:"none",borderRadius:8,padding:"5px 12px",color:"#8e44ad",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{showTodoForm?"✕ Tutup":"➕ Tambah"}</button>
            </div>

            {showTodoForm&&(
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #8e44ad",padding:"14px",marginBottom:10}}>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Judul Tugas *</label>
                  <input value={todoForm.judul} onChange={e=>setTodoForm(p=>({...p,judul:e.target.value}))} placeholder="Contoh: Cek & isi ulang stok kantong plastik"
                    style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
                </div>
                <div style={{marginBottom:10}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:6}}>Reset Periode</label>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    {Object.entries(PERIODE_INFO).map(([k,p])=>(
                      <button key={k} onClick={()=>setTodoForm(prev=>({...prev,periode:k}))}
                        style={{padding:"8px",borderRadius:9,border:`2px solid ${todoForm.periode===k?p.warna:"#e0f5f1"}`,background:todoForm.periode===k?`${p.warna}10`:"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                        <div style={{fontSize:14}}>{p.icon}</div>
                        <div style={{fontWeight:700,fontSize:10,color:todoForm.periode===k?p.warna:"#666"}}>{p.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setShowTodoForm(false);setEditTodoId(null);}} style={{flex:1,padding:"9px",borderRadius:9,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
                  <button onClick={saveTodo} style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#8e44ad,#a855f7)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Tugas</button>
                </div>
              </div>
            )}

            {todos.length===0?(
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:20,textAlign:"center",color:"#aaa",fontSize:12}}>Belum ada tugas wajib</div>
            ):(
              <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
                {todos.map((td,i)=>(
                  <div key={td.id} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 16px",borderTop:i>0?"1px solid #f0faf8":"none"}}>
                    <span style={{fontSize:16}}>{PERIODE_INFO[td.periode||"harian"].icon}</span>
                    <div style={{flex:1,fontSize:12,fontWeight:600,color:"#1a2e2a"}}>{td.judul}</div>
                    <span style={{fontSize:9,fontWeight:700,background:"#f5eeff",color:"#8e44ad",padding:"2px 8px",borderRadius:20,flexShrink:0}}>{PERIODE_INFO[td.periode||"harian"].label}</span>
                    <button onClick={()=>{setEditTodoId(td.id);setTodoForm({judul:td.judul,periode:td.periode||"harian"});setShowTodoForm(true);}} style={{padding:"4px 8px",borderRadius:7,border:"2px solid #e0f5f1",background:"#fff",color:"#0d9488",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>✏️</button>
                    <button onClick={()=>hapusTodo(td.id)} style={{padding:"4px 8px",borderRadius:7,border:"2px solid #fca5a5",background:"#fff5f5",color:"#dc2626",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🗑</button>
                  </div>
                ))}
              </div>
            )}
            <div style={{marginTop:6,fontSize:10,color:"#aaa",fontStyle:"italic"}}>💡 To-do wajib tidak memberi poin/bonus, tapi statusnya tercatat untuk evaluasi kedisiplinan karyawan</div>
          </div>

          {/* ═══ APPROVAL FOTO MISI ═══ */}
          {fotoMenunggu.length>0&&(
            <div style={{marginBottom:18}}>
              <div style={{fontWeight:800,fontSize:12,color:"#d97706",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                📷 Menunggu Verifikasi Foto ({fotoMenunggu.length})
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {fotoMenunggu.map(f=>{
                  const m = misi.find(x=>x.id===f.misi_id);
                  const k = users[f.username];
                  return (
                    <div key={f.id} style={{background:"#fff",borderRadius:14,border:"2px solid #fcd34d",padding:"12px 14px"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                        <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:"#fff",flexShrink:0}}>{(k?.nama||f.user_nama||"--").slice(0,2).toUpperCase()}</div>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:800,fontSize:12}}>{k?.nama||f.user_nama}</div>
                          <div style={{fontSize:10,color:"#aaa"}}>{m?.icon} {m?.judul||"Misi"}</div>
                        </div>
                        <button onClick={()=>setFotoDetail(f)} style={{padding:"5px 12px",borderRadius:8,border:"2px solid #fcd34d",background:"#fffbeb",color:"#92400e",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>Lihat</button>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                        {f.foto_before&&<img src={f.foto_before} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:9,border:"2px solid #e0f5f1"}}/>}
                        {f.foto_after&&<img src={f.foto_after} alt="" style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:9,border:"2px solid #e0f5f1"}}/>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form tambah/edit misi */}
          {showMisiForm&&(
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #0d9488",padding:"16px",marginBottom:14}}>
              <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:12}}>{editMisiId?"✏️ Edit Misi":"➕ Misi Baru"}</div>

              {/* Periode */}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:6}}>⏳ Jangka Waktu Misi</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {Object.entries(PERIODE_INFO).map(([k,p])=>(
                    <button key={k} onClick={()=>setMisiForm(prev=>({...prev,periode:k}))}
                      style={{padding:"8px",borderRadius:9,border:`2px solid ${misiForm.periode===k?p.warna:"#e0f5f1"}`,background:misiForm.periode===k?`${p.warna}10`:"#fff",cursor:"pointer",fontFamily:"inherit",textAlign:"center"}}>
                      <div style={{fontSize:14}}>{p.icon}</div>
                      <div style={{fontWeight:700,fontSize:10,color:misiForm.periode===k?p.warna:"#666"}}>{p.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipe */}
              <div style={{marginBottom:12}}>
                <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:6}}>Tipe Misi</label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  {Object.entries(TIPE_INFO).map(([k,t])=>(
                    <button key={k} onClick={()=>setMisiForm(prev=>({...prev,tipe:k}))}
                      style={{textAlign:"left",padding:"8px 10px",borderRadius:9,border:`2px solid ${misiForm.tipe===k?t.color:"#e0f5f1"}`,background:misiForm.tipe===k?t.bg:"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                      <div style={{fontWeight:700,fontSize:11,color:misiForm.tipe===k?t.color:"#666"}}>{t.icon} {t.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pilih produk jika auto_produk */}
              {misiForm.tipe==="auto_produk"&&(
                <div style={{marginBottom:12,background:"#e0faf5",borderRadius:10,padding:"12px"}}>
                  <label style={{fontSize:11,fontWeight:700,color:"#0d9488",display:"block",marginBottom:6}}>🔗 Hubungkan ke Produk</label>
                  <select value={misiForm.produk_id} onChange={e=>setMisiForm(prev=>({...prev,produk_id:e.target.value}))}
                    style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit",background:"#fff"}}>
                    <option value="">Pilih produk...</option>
                    {products.map(p=><option key={p.id} value={p.id}>{p.name||p.nama}</option>)}
                  </select>
                  <div style={{fontSize:10,color:"#0d9488",marginTop:6}}>💡 Setiap kasir mencatat penjualan produk ini, progress misi otomatis bertambah</div>
                </div>
              )}
              {misiForm.tipe==="auto_transaksi"&&(
                <div style={{marginBottom:12,background:"#e8f4fd",borderRadius:10,padding:"12px",fontSize:10,color:"#2980b9"}}>
                  💡 Dihitung otomatis dari jumlah transaksi kasir milik karyawan ini
                </div>
              )}
              {misiForm.tipe==="manual_foto"&&(
                <div style={{marginBottom:12,background:"#fffbeb",borderRadius:10,padding:"12px",fontSize:10,color:"#92400e"}}>
                  💡 Karyawan upload foto sebelum & sesudah. Foto disertai timestamp + lokasi GPS. Admin perlu approve.
                </div>
              )}

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Judul Misi *</label><input value={misiForm.judul} onChange={e=>setMisiForm(p=>({...p,judul:e.target.value}))} placeholder="Contoh: Transaksi 15/hari" style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
                <div><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Icon</label><input value={misiForm.icon} onChange={e=>setMisiForm(p=>({...p,icon:e.target.value}))} placeholder="🎯" style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:20,outline:"none",fontFamily:"inherit",textAlign:"center"}}/></div>
                <div><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Poin</label><input type="number" value={misiForm.poin} onChange={e=>setMisiForm(p=>({...p,poin:e.target.value}))} style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
                <div><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Target</label><input type="number" value={misiForm.target} onChange={e=>setMisiForm(p=>({...p,target:e.target.value}))} style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
                <div><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Satuan</label><input value={misiForm.satuan} onChange={e=>setMisiForm(p=>({...p,satuan:e.target.value}))} placeholder="hari/trx/ulasan" style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
                <div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Deskripsi</label><input value={misiForm.deskripsi} onChange={e=>setMisiForm(p=>({...p,deskripsi:e.target.value}))} placeholder="Jelaskan detail misi..." style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/></div>
              </div>
              <div style={{background:"#f0faf8",borderRadius:8,padding:"8px 12px",fontSize:11,color:"#0d9488",marginBottom:12}}>
                💡 Setara dengan Rp {((+misiForm.poin||0)*draftPoinRate).toLocaleString("id-ID")} jika misi ini selesai
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={()=>{setShowMisiForm(false);setEditMisiId(null);}} style={{flex:1,padding:"9px",borderRadius:9,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
                <button onClick={saveMisi} style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Misi</button>
              </div>
            </div>
          )}

          {/* List misi by periode */}
          {misi.length===0?<div style={{textAlign:"center",padding:40,color:"#aaa"}}><div style={{fontSize:40,marginBottom:8}}>🎯</div><div style={{fontWeight:700}}>Belum ada misi</div><div style={{fontSize:11,marginTop:4}}>Tambah misi baru untuk karyawan</div></div>:(
            Object.entries(PERIODE_INFO).map(([periodeKey,p])=>{
              const list = misi.filter(m=>(m.periode||"harian")===periodeKey);
              if(!list.length) return null;
              return (
                <div key={periodeKey} style={{marginBottom:18}}>
                  <div style={{fontWeight:800,fontSize:12,color:p.warna,marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                    {p.icon} Misi {p.label} ({list.length})
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:10}}>
                    {list.map(m=>{
                      const t = TIPE_INFO[m.tipe||"manual_checklist"];
                      return (
                        <div key={m.id} style={{background:"#fff",borderRadius:14,padding:"14px 16px",border:"2px solid #e0f5f1",display:"flex",gap:12,alignItems:"flex-start"}}>
                          <div style={{width:44,height:44,borderRadius:12,background:t.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0,border:`2px solid ${t.color}30`}}>{m.icon||"🎯"}</div>
                          <div style={{flex:1}}>
                            <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>{m.judul}</div>
                            <div style={{fontSize:10,color:"#aaa",marginTop:2}}>{m.deskripsi}</div>
                            <div style={{display:"flex",gap:8,marginTop:6,flexWrap:"wrap"}}>
                              <span style={{background:t.bg,color:t.color,fontSize:9,fontWeight:800,padding:"2px 9px",borderRadius:20}}>{t.icon} {t.label}</span>
                              <span style={{background:"#fef9c3",color:"#92400e",fontSize:10,fontWeight:800,padding:"2px 10px",borderRadius:20}}>🏅 {m.poin} poin</span>
                              <span style={{background:"#e0faf5",color:"#0d9488",fontSize:10,fontWeight:700,padding:"2px 10px",borderRadius:20}}>Target: {m.target} {m.satuan}</span>
                              <span style={{background:"#f0fdf4",color:"#16a34a",fontSize:9,fontWeight:700,padding:"2px 10px",borderRadius:20}}>≈ Rp {(m.poin*draftPoinRate).toLocaleString("id-ID")}</span>
                            </div>
                          </div>
                          <div style={{display:"flex",gap:6,flexShrink:0}}>
                            <button onClick={()=>{setEditMisiId(m.id);setMisiForm({icon:m.icon||"🎯",judul:m.judul,deskripsi:m.deskripsi||"",poin:m.poin,target:m.target,satuan:m.satuan,periode:m.periode||"harian",tipe:m.tipe||"manual_checklist",produk_id:m.produk_id||""});setShowMisiForm(true);}} style={{padding:"5px 10px",borderRadius:8,border:"2px solid #e0f5f1",background:"#fff",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✏️ Edit</button>
                            <button onClick={()=>hapusMisi(m.id)} style={{padding:"5px 10px",borderRadius:8,border:"2px solid #fca5a5",background:"#fff5f5",color:"#dc2626",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>🗑</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}

          {/* Modal detail foto */}
          {fotoDetail&&(
            <div onClick={()=>setFotoDetail(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
              <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:20,width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto"}}>
                <div style={{fontWeight:900,fontSize:15,marginBottom:4}}>{misi.find(x=>x.id===fotoDetail.misi_id)?.judul}</div>
                <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>{users[fotoDetail.username]?.nama||fotoDetail.user_nama} · 📍{fotoDetail.lokasi}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#16a34a",marginBottom:4}}>Sebelum</div>
                    {fotoDetail.foto_before&&<img src={fotoDetail.foto_before} alt="" style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",borderRadius:10,border:"2px solid #86efac"}}/>}
                    <div style={{fontSize:9,color:"#aaa",marginTop:4}}>{fotoDetail.waktu_before?new Date(fotoDetail.waktu_before).toLocaleString("id-ID"):"--"}</div>
                  </div>
                  <div>
                    <div style={{fontSize:10,fontWeight:700,color:"#dc2626",marginBottom:4}}>Sesudah</div>
                    {fotoDetail.foto_after&&<img src={fotoDetail.foto_after} alt="" style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",borderRadius:10,border:"2px solid #fca5a5"}}/>}
                    <div style={{fontSize:9,color:"#aaa",marginTop:4}}>{fotoDetail.waktu_after?new Date(fotoDetail.waktu_after).toLocaleString("id-ID"):"--"}</div>
                  </div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>responFoto(fotoDetail.id,"ditolak")} style={{flex:1,padding:11,borderRadius:10,border:"2px solid #fca5a5",background:"#fff5f5",color:"#dc2626",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✕ Tolak</button>
                  <button onClick={()=>responFoto(fotoDetail.id,"disetujui")} style={{flex:2,padding:11,borderRadius:10,border:"none",background:"linear-gradient(135deg,#16a34a,#22c55e)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✓ Setujui Misi</button>
                </div>
              </div>
            </div>
          )}
        </div>
      );})()}

      {/* ═══ IZIN ═══ */}
      {tab==="izin"&&(
      <div>
        <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a",marginBottom:14}}>📝 Manajemen Izin & Lembur</div>
        {allIzin.length===0?<div style={{textAlign:"center",padding:40,color:"#aaa"}}><div style={{fontSize:40,marginBottom:8}}>📝</div><div>Belum ada pengajuan izin</div></div>:(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {["menunggu","disetujui","ditolak"].map(status=>{
              const list=allIzin.filter(i=>i.status===status);
              if(list.length===0) return null;
              const sc={menunggu:{c:"#d97706",bg:"#fffbeb",l:"⏳ Menunggu"},disetujui:{c:"#16a34a",bg:"#f0fdf4",l:"✓ Disetujui"},ditolak:{c:"#dc2626",bg:"#fff5f5",l:"✗ Ditolak"}};
              const s=sc[status];
              return (
                <div key={status}>
                  <div style={{fontWeight:800,fontSize:12,color:s.c,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><span style={{background:s.bg,padding:"3px 10px",borderRadius:20,border:`1px solid ${s.c}30`}}>{s.l} ({list.length})</span></div>
                  {list.map(i=>(
                    <div key={i.id} style={{background:"#fff",borderRadius:13,padding:"12px 14px",marginBottom:8,border:`1px solid ${s.c}20`,display:"flex",gap:12,alignItems:"center"}}>
                      <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff",flexShrink:0}}>{i.userName?.slice(0,2).toUpperCase()}</div>
                      <div style={{flex:1}}><div style={{fontWeight:700,fontSize:12}}>{i.userName} — <span style={{color:s.c}}>{i.jenis}</span></div><div style={{fontSize:10,color:"#aaa"}}>{i.tgl}{i.jam?" · "+i.jam:""}</div><div style={{fontSize:10,color:"#555",marginTop:2}}>{i.ket}</div></div>
                      {status==="menunggu"&&(
                        <div style={{display:"flex",gap:6,flexShrink:0}}>
                          <button onClick={()=>responIzin(i.userId,i.id,"disetujui")} style={{padding:"6px 12px",borderRadius:9,border:"none",background:"#16a34a",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✓</button>
                          <button onClick={()=>responIzin(i.userId,i.id,"ditolak")} style={{padding:"6px 12px",borderRadius:9,border:"none",background:"#dc2626",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✗</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}

      {/* ═══ ABSENSI ═══ */}
      {tab==="absensi"&&(
      <div>
        <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a",marginBottom:14}}>📅 Rekap Absensi Semua Karyawan</div>
        {karyawanList.length===0?<div style={{textAlign:"center",padding:40,color:"#aaa"}}>Belum ada karyawan</div>:(
          karyawanList.map(k=>{
            const absList=absensiMap[k.username]||[];
            const hadirN=absList.filter(a=>a.masuk&&a.masuk!=="--").length;
            const outletN=outlets.find(o=>o.id===k.outletId)?.nama||"--";
            return (
              <div key={k.username} style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",marginBottom:12,overflow:"hidden"}}>
                <div style={{padding:"12px 16px",background:"linear-gradient(90deg,#e0faf5,#f0fdfb)",borderBottom:"1px solid #b2f5ea",display:"flex",alignItems:"center",gap:12}}>
                  <div style={{width:38,height:38,borderRadius:11,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",flexShrink:0}}>{k.nama?.slice(0,2).toUpperCase()}</div>
                  <div style={{flex:1}}><div style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>{k.nama}</div><div style={{fontSize:10,color:"#aaa"}}>{outletN}</div></div>
                  <div style={{display:"flex",gap:7}}>
                    <span style={{background:"#e0faf5",color:"#0d9488",fontSize:10,fontWeight:800,padding:"3px 10px",borderRadius:20}}>{hadirN} hadir</span>
                    <span style={{background:"#fffbeb",color:"#d97706",fontSize:10,fontWeight:700,padding:"3px 10px",borderRadius:20}}>{(izinMap[k.username]||[]).filter(i=>i.status==="disetujui").length} izin</span>
                  </div>
                </div>
                {absList.length===0?<div style={{textAlign:"center",padding:16,color:"#aaa",fontSize:11}}>Belum ada data absensi</div>:(
                  absList.slice(0,5).map((a,i)=>(
                    <div key={i} onClick={()=>setAbsenDetail({...a,nama:k.nama,outlet:outletN})}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"9px 16px",borderTop:"1px solid #f0faf8",cursor:"pointer",transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#f8fffe"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <div style={{width:36,textAlign:"center",flexShrink:0}}><div style={{fontWeight:700,fontSize:10}}>{a.tgl}</div></div>
                      <div style={{flex:1,display:"flex",gap:6,alignItems:"center"}}>
                        {a.masuk?<><span style={{fontSize:9,background:"#f0faf8",padding:"2px 6px",borderRadius:20}}>🕐{a.masuk}</span><span style={{fontSize:9,color:"#ccc"}}>→</span><span style={{fontSize:9,background:"#f0faf8",padding:"2px 6px",borderRadius:20}}>🕔{a.pulang||"--"}</span></>:<span style={{fontSize:10,color:"#aaa"}}>Izin</span>}
                      </div>
                      {(a.foto_masuk||a.foto_pulang)&&(
                        <div style={{display:"flex",gap:3}}>
                          {a.foto_masuk&&<img src={a.foto_masuk} alt="" style={{width:32,height:32,borderRadius:8,objectFit:"cover",border:"2px solid #86efac"}}/>}
                          {a.foto_pulang&&<img src={a.foto_pulang} alt="" style={{width:32,height:32,borderRadius:8,objectFit:"cover",border:"2px solid #fca5a5"}}/>}
                        </div>
                      )}
                      <span style={{fontSize:9,fontWeight:800,background:a.masuk?"#f0fdf4":"#fffbeb",color:a.masuk?"#16a34a":"#d97706",padding:"2px 8px",borderRadius:20}}>{a.masuk?"✓":"Izin"}</span>
                      <span style={{color:"#ccc",fontSize:12}}>›</span>
                    </div>
                  ))
                )}
              </div>
            );
          })
        )}
      </div>
      )}

      {/* ═══ SETTINGS ═══ */}
      {/* ═══ HISTORY ═══ */}
      {tab==="history"&&(
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
          <div>
            <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a"}}>📜 History Periode</div>
            <div style={{fontSize:11,color:"#aaa"}}>Riwayat misi, absensi & izin per periode gajian (permanen, tidak hilang)</div>
          </div>
          <button onClick={tutupPeriode} disabled={closingPeriod}
            style={{background:closingPeriod?"#ccc":"linear-gradient(135deg,#8e44ad,#a855f7)",border:"none",borderRadius:10,padding:"10px 18px",color:"#fff",fontWeight:800,fontSize:12,cursor:closingPeriod?"not-allowed":"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
            {closingPeriod?"⏳ Memproses...":"🔒 Tutup Periode & Reset"}
          </button>
        </div>

        <div style={{background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:10,padding:"12px",fontSize:11,color:"#92400e",marginBottom:16,lineHeight:1.6}}>
          ⚠️ <b>Tutup Periode</b> dilakukan saat tanggal gajian tiba. Aksi ini akan menyimpan snapshot data bulan ini ke History (per karyawan), lalu mereset progress misi, absensi, dan izin di tampilan karyawan untuk siklus baru. Data di History <b>tidak akan hilang</b>.
        </div>

        {historyData.length===0?(
          <div style={{textAlign:"center",padding:40,color:"#aaa"}}><div style={{fontSize:40,marginBottom:8}}>📦</div><div style={{fontWeight:700}}>Belum ada history</div><div style={{fontSize:11,marginTop:4}}>History akan muncul setelah periode pertama ditutup</div></div>
        ):(
          // Group by periode_key, lalu tampilkan per karyawan
          Object.entries(
            historyData.reduce((acc,h)=>{ (acc[h.periode_key]=acc[h.periode_key]||[]).push(h); return acc; },{})
          ).sort(([a],[b])=>b.localeCompare(a)).map(([periodeKey,rows])=>(
            <div key={periodeKey} style={{marginBottom:20}}>
              <div style={{fontWeight:900,fontSize:14,color:"#1a2e2a",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                🗓️ {rows[0]?.periode_label||periodeKey}
                <span style={{fontSize:10,fontWeight:700,background:"#e0faf5",color:"#0d9488",padding:"2px 10px",borderRadius:20}}>{rows.length} karyawan</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {rows.map(h=>(
                  <div key={h.username} style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"14px 16px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:13,color:"#fff",flexShrink:0}}>{(h.user_nama||h.username).slice(0,2).toUpperCase()}</div>
                      <div style={{fontWeight:800,fontSize:13}}>{h.user_nama||h.username}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
                      {[
                        {l:"Misi Selesai",v:`${h.misi_selesai}/${h.total_misi}`,c:"#0d9488",bg:"#e0faf5"},
                        {l:"Total Poin",v:h.total_poin,c:"#d97706",bg:"#fffbeb"},
                        {l:"Bonus",v:`Rp${Math.round(h.bonus_rp/1000)}K`,c:"#16a34a",bg:"#f0fdf4"},
                        {l:"Hadir",v:h.hadir,c:"#2980b9",bg:"#e8f4fd"},
                        {l:"Tugas",v:`${h.todo_selesai}/${h.total_todo}`,c:"#8e44ad",bg:"#f5eeff"},
                      ].map(s=>(
                        <div key={s.l} style={{background:s.bg,borderRadius:9,padding:"8px",textAlign:"center"}}>
                          <div style={{fontWeight:900,fontSize:14,color:s.c}}>{s.v}</div>
                          <div style={{fontSize:8,color:s.c,fontWeight:700,marginTop:1}}>{s.l}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{marginTop:8,fontSize:10,color:"#888"}}>📝 Izin: {h.izin}x · 🤒 Sakit: {h.sakit}x</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
        <div style={{textAlign:"center",fontSize:11,color:"#bbb",marginTop:10}}>📦 Semua data periode sebelumnya tersimpan permanen</div>
      </div>
      )}

      {tab==="settings"&&(
      <div>
        <div style={{fontWeight:800,fontSize:15,color:"#1a2e2a",marginBottom:14}}>⚙️ Pengaturan Portal</div>

        {/* Note/Motivasi */}
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a"}}>📌 Note / Motivasi untuk Karyawan</div>
            <button onClick={()=>setEditNote(!editNote)} style={{padding:"5px 12px",borderRadius:8,border:"2px solid #e0f5f1",background:editNote?"#e0faf5":"#fff",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{editNote?"Batal":"✏️ Edit"}</button>
          </div>
          {editNote?(
            <div>
              <textarea value={draftNote} onChange={e=>setDraftNote(e.target.value)} rows={4} style={{width:"100%",padding:"10px 12px",borderRadius:10,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",resize:"none",marginBottom:10}}/>
              <button onClick={saveNote} style={{width:"100%",padding:"9px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Note</button>
            </div>
          ):(
            <div style={{background:"#fffbeb",borderRadius:10,padding:"12px",fontSize:12,color:"#78350f",lineHeight:1.6,border:"1px solid #fcd34d"}}>{note||"Belum ada note"}</div>
          )}
        </div>

        {/* Tampilan Struk */}
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:4}}>🧾 Tampilan Struk Kasir</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>Atur informasi yang dicetak pada struk thermal Bluetooth</div>

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Nama Toko (header besar)</label>
            <input value={draftStruk.namaToko||""} onChange={e=>setDraftStruk(p=>({...p,namaToko:e.target.value}))} placeholder="AMMAR CELL"
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit",fontWeight:800,textAlign:"center"}}/>
          </div>

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Info Tambahan (alamat/no telp - opsional)</label>
            <input value={draftStruk.headerExtra||""} onChange={e=>setDraftStruk(p=>({...p,headerExtra:e.target.value}))} placeholder="Jl. Contoh No. 123, Depok"
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"center"}}/>
          </div>

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:6}}>Tampilkan di Struk</label>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{k:"showOutlet",l:"Nama Outlet"},{k:"showKasir",l:"Nama Kasir"},{k:"showNoTrx",l:"No. Transaksi"}].map(opt=>(
                <button key={opt.k} onClick={()=>setDraftStruk(p=>({...p,[opt.k]:p[opt.k]===false?true:false}))}
                  style={{padding:"7px 12px",borderRadius:9,border:`2px solid ${draftStruk[opt.k]!==false?"#0d9488":"#e0f5f1"}`,background:draftStruk[opt.k]!==false?"#e0faf5":"#fff",color:draftStruk[opt.k]!==false?"#0d9488":"#aaa",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>
                  {draftStruk[opt.k]!==false?"✓ ":"○ "}{opt.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:10}}>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Pesan Penutup (baris 1)</label>
            <input value={draftStruk.footer1||""} onChange={e=>setDraftStruk(p=>({...p,footer1:e.target.value}))} placeholder="Terima kasih!"
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"center"}}/>
          </div>
          <div style={{marginBottom:12}}>
            <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Pesan Penutup (baris 2, opsional)</label>
            <textarea value={draftStruk.footer2||""} onChange={e=>setDraftStruk(p=>({...p,footer2:e.target.value}))} placeholder="Barang sudah dibeli tidak dapat ditukar/dikembalikan" rows={2}
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit",textAlign:"center",resize:"none"}}/>
          </div>

          {/* Preview mini */}
          <div style={{background:"#f8fafc",borderRadius:10,padding:12,fontFamily:"monospace",fontSize:10,lineHeight:1.6,marginBottom:12,border:"1px dashed #d1d5db"}}>
            <div style={{textAlign:"center",fontWeight:900}}>{draftStruk.namaToko||"AMMAR CELL"}</div>
            {draftStruk.headerExtra&&<div style={{textAlign:"center"}}>{draftStruk.headerExtra}</div>}
            {draftStruk.showOutlet!==false&&<div style={{textAlign:"center"}}>{outlets[0]?.nama||"Outlet"}</div>}
            <div>{"=".repeat(28)}</div>
            <div>13/06/2026 14:32</div>
            {draftStruk.showKasir!==false&&<div>Kasir: Via Nurhayati</div>}
            {draftStruk.showNoTrx!==false&&<div>No    : 17186234</div>}
            <div>{"-".repeat(28)}</div>
            <div>SP Indosat 3GB</div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>  2 x 50.000</span><span>100.000</span></div>
            <div>{"-".repeat(28)}</div>
            <div style={{display:"flex",justifyContent:"space-between",fontWeight:900}}><span>TOTAL</span><span>Rp 100.000</span></div>
            {(draftStruk.footer1||draftStruk.footer2)&&<div style={{textAlign:"center",marginTop:6}}>{"=".repeat(28)}</div>}
            {draftStruk.footer1&&<div style={{textAlign:"center"}}>{draftStruk.footer1}</div>}
            {draftStruk.footer2&&<div style={{textAlign:"center",fontSize:9,whiteSpace:"pre-line"}}>{draftStruk.footer2}</div>}
          </div>

          <button onClick={saveStrukConfig} style={{width:"100%",padding:"10px",borderRadius:9,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Tampilan Struk</button>
        </div>


        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:4}}>⏰ Jadwal Shift Karyawan</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>Atur jam kerja untuk setiap shift</div>

          {draftShift.shifts.map((sh,i)=>(
            <div key={i} style={{background:"#f8fffe",borderRadius:12,padding:"12px 14px",border:"1px solid #e0f5f1",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:16}}>{i===0?"🌅":i===1?"☀️":"🌙"}</span>
                <input type="text" value={sh.nama}
                  onChange={e=>setDraftShift(p=>({...p,shifts:p.shifts.map((x,j)=>j===i?{...x,nama:e.target.value}:x)}))}
                  style={{fontWeight:800,fontSize:13,border:"none",borderBottom:"2px solid #e0f5f1",outline:"none",fontFamily:"inherit",background:"transparent",width:120,padding:"2px 4px"}}/>
                {draftShift.shifts.length>1&&(
                  <button onClick={()=>setDraftShift(p=>({...p,shifts:p.shifts.filter((_,j)=>j!==i)}))}
                    style={{marginLeft:"auto",background:"#fff5f5",border:"none",borderRadius:7,padding:"4px 8px",color:"#dc2626",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>🗑 Hapus</button>
                )}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Jam Masuk</label>
                  <Time24Input value={sh.masuk} onChange={v=>setDraftShift(p=>({...p,shifts:p.shifts.map((x,j)=>j===i?{...x,masuk:v}:x)}))}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Jam Pulang</label>
                  <Time24Input value={sh.pulang} onChange={v=>setDraftShift(p=>({...p,shifts:p.shifts.map((x,j)=>j===i?{...x,pulang:v}:x)}))}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Total Jam</label>
                  <input type="number" value={sh.totalJam} onChange={e=>setDraftShift(p=>({...p,shifts:p.shifts.map((x,j)=>j===i?{...x,totalJam:+e.target.value}:x)}))}
                    style={{width:"100%",padding:"8px 10px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
                </div>
              </div>
            </div>
          ))}

          <button onClick={()=>setDraftShift(p=>({...p,shifts:[...p.shifts,{nama:`Shift ${p.shifts.length+1}`,masuk:"08:00",pulang:"17:00",totalJam:9}]}))}
            style={{width:"100%",padding:"8px",borderRadius:9,border:"2px dashed #b2ede6",background:"#f8fffe",color:"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",marginBottom:14}}>
            ➕ Tambah Shift
          </button>

          <div style={{borderTop:"1px solid #f0faf8",margin:"4px 0 14px"}}/>

          {/* Tipe Lembur */}
          <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a",marginBottom:10}}>⏱️ Perhitungan Lembur</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            {[
              {k:"perjam",icon:"⏱️",label:"Per Jam",desc:"Dibayar sesuai jumlah jam lembur × rate/jam"},
              {k:"pershift",icon:"📦",label:"Per Sesi/Shift",desc:"Nominal flat setiap kali lembur (tidak dihitung per jam)"},
            ].map(t=>(
              <button key={t.k} onClick={()=>setDraftShift(p=>({...p,lemburTipe:t.k}))}
                style={{textAlign:"left",padding:"12px",borderRadius:11,border:`2px solid ${draftShift.lemburTipe===t.k?"#0d9488":"#e0f5f1"}`,background:draftShift.lemburTipe===t.k?"#e0faf5":"#fff",cursor:"pointer",fontFamily:"inherit"}}>
                <div style={{fontWeight:800,fontSize:12,color:draftShift.lemburTipe===t.k?"#0d9488":"#555",marginBottom:3}}>{t.icon} {t.label}</div>
                <div style={{fontSize:10,color:"#aaa",lineHeight:1.4}}>{t.desc}</div>
              </button>
            ))}
          </div>

          {draftShift.lemburTipe==="pershift"&&(
            <div style={{marginBottom:10}}>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Nominal Lembur per Sesi</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftShift.lemburFlat} onChange={e=>setDraftShift(p=>({...p,lemburFlat:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{fontSize:9,color:"#aaa",marginTop:3}}>Contoh: karyawan lembur 1x dalam sehari → dapat Rp {(+draftShift.lemburFlat||0).toLocaleString("id-ID")} flat, berapapun jamnya</div>
            </div>
          )}

          <button onClick={saveShift} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Jadwal Shift</button>
        </div>

        {/* Pengaturan Gaji & Lembur (Global) */}
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:4}}>💰 Pengaturan Gaji & Lembur</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>Berlaku untuk semua karyawan (default), bisa di-override per karyawan</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Gaji Pokok / Bulan</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPotongan.gajiPokok} onChange={e=>setDraftPotongan(p=>({...p,gajiPokok:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Rate Lembur / Jam</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPotongan.rateLembur} onChange={e=>setDraftPotongan(p=>({...p,rateLembur:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #b2ede6",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{fontSize:9,color:"#aaa",marginTop:3}}>Dibayar per jam lembur di atas jam shift normal</div>
            </div>
          </div>

          <div style={{borderTop:"1px solid #f0faf8",margin:"12px 0"}}/>

          <div style={{fontWeight:800,fontSize:12,color:"#1a2e2a",marginBottom:10}}>✂️ Potongan Otomatis</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Potongan per Hari Izin</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPotongan.potonganIzin} onChange={e=>setDraftPotongan(p=>({...p,potonganIzin:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #fca5a5",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Potongan per Hari Tanpa Kabar (Alpha)</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPotongan.potonganAlpha} onChange={e=>setDraftPotongan(p=>({...p,potonganAlpha:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #fca5a5",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Potongan Sakit (tanpa surat)</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPotongan.potonganSakit} onChange={e=>setDraftPotongan(p=>({...p,potonganSakit:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #fca5a5",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#555",display:"block",marginBottom:4}}>Potongan per Menit Telat</label>
              <div style={{position:"relative"}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:12,color:"#aaa"}}>Rp</span>
                <input type="number" value={draftPotongan.potonganTelat} onChange={e=>setDraftPotongan(p=>({...p,potonganTelat:+e.target.value}))}
                  style={{width:"100%",padding:"8px 10px 8px 28px",borderRadius:9,border:"2px solid #fca5a5",fontSize:13,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <div style={{fontSize:9,color:"#aaa",marginTop:3}}>Dihitung dari menit keterlambatan x nominal ini</div>
            </div>
          </div>

          <button onClick={savePotongan} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#d97706,#f59e0b)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>💾 Simpan Pengaturan Gaji</button>
        </div>

        {/* Gaji & Kasbon per karyawan */}
        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"16px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:4}}>👤 Gaji & Kasbon per Karyawan</div>
          <div style={{fontSize:11,color:"#aaa",marginBottom:12}}>Override gaji pokok individu & catat kasbon/potongan lain</div>

          {karyawanList.length===0?(
            <div style={{textAlign:"center",padding:20,color:"#aaa",fontSize:12}}>Belum ada karyawan</div>
          ):(
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {karyawanList.map(k=>{
                const gajiInd = (draftGajiKaryawan[k.username]?.gajiPokok ?? k.gajiPokok ?? draftPotongan.gajiPokok);
                const kasbon  = (draftGajiKaryawan[k.username]?.kasbon ?? k.kasbon ?? 0);
                const potonganLain = (draftGajiKaryawan[k.username]?.potonganLain ?? k.potonganLain ?? 0);
                return (
                  <div key={k.username} style={{background:"#f8fffe",borderRadius:12,padding:"12px 14px",border:"1px solid #e0f5f1"}}>
                    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                      <div style={{width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:12,color:"#fff",flexShrink:0}}>{k.nama?.slice(0,2).toUpperCase()}</div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,fontSize:13}}>{k.nama}</div>
                        <div style={{fontSize:10,color:"#aaa"}}>{outlets.find(o=>o.id===k.outletId)?.nama||"--"} · {k.role}</div>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                      <div>
                        <label style={{fontSize:10,fontWeight:700,color:"#555",display:"block",marginBottom:3}}>Gaji Pokok</label>
                        <input type="number" value={gajiInd} placeholder={`${draftPotongan.gajiPokok}`}
                          onChange={e=>setDraftGajiKaryawan(p=>({...p,[k.username]:{...p[k.username],gajiPokok:+e.target.value}}))}
                          style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"2px solid #b2ede6",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:700,color:"#d97706",display:"block",marginBottom:3}}>Kasbon</label>
                        <input type="number" value={kasbon}
                          onChange={e=>setDraftGajiKaryawan(p=>({...p,[k.username]:{...p[k.username],kasbon:+e.target.value}}))}
                          style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"2px solid #fcd34d",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                      </div>
                      <div>
                        <label style={{fontSize:10,fontWeight:700,color:"#dc2626",display:"block",marginBottom:3}}>Potongan Lain</label>
                        <input type="number" value={potonganLain}
                          onChange={e=>setDraftGajiKaryawan(p=>({...p,[k.username]:{...p[k.username],potonganLain:+e.target.value}}))}
                          style={{width:"100%",padding:"6px 8px",borderRadius:8,border:"2px solid #fca5a5",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
                      </div>
                    </div>
                    {/* Preview estimasi gaji bersih */}
                    <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                      <div style={{flex:1,fontSize:10,color:"#16a34a",fontWeight:700,background:"#f0fdf4",borderRadius:8,padding:"4px 8px"}}>
                        💵 Estimasi take-home: Rp {Math.max(0,gajiInd-kasbon-potonganLain).toLocaleString("id-ID")}
                      </div>
                      <button onClick={()=>setSlipGajiTarget(k.username)} style={{flexShrink:0,padding:"5px 12px",borderRadius:8,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:700,fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>🧾 Slip Gaji</button>
                    </div>
                  </div>
                );
              })}
              <button onClick={saveGajiKaryawan} style={{width:"100%",padding:"10px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>💾 Simpan Gaji & Kasbon</button>
            </div>
          )}
        </div>
      </div>
      )}

      </div>

      {/* MODAL DETAIL ABSENSI */}
      {absenDetail&&(
        <div onClick={()=>setAbsenDetail(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:"20px",width:"100%",maxWidth:440,boxShadow:"0 16px 48px rgba(0,0,0,.25)",maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <div style={{width:40,height:40,borderRadius:11,background:"linear-gradient(135deg,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:"#fff",flexShrink:0}}>{absenDetail.nama?.slice(0,2).toUpperCase()}</div>
              <div style={{flex:1}}>
                <div style={{fontWeight:900,fontSize:15,color:"#1a2e2a"}}>{absenDetail.nama}</div>
                <div style={{fontSize:11,color:"#aaa"}}>{absenDetail.tgl} · {absenDetail.outlet}</div>
              </div>
              <button onClick={()=>setAbsenDetail(null)} style={{background:"#f0faf8",border:"none",borderRadius:"50%",width:28,height:28,color:"#888",fontSize:13,cursor:"pointer"}}>✕</button>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <div>
                <div style={{fontWeight:800,fontSize:11,color:"#16a34a",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>🕐 Absen Masuk</div>
                {absenDetail.foto_masuk?(
                  <img src={absenDetail.foto_masuk} alt="" style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",borderRadius:12,border:"2px solid #86efac"}}/>
                ):(
                  <div style={{width:"100%",aspectRatio:"3/4",borderRadius:12,background:"#f0fdf4",border:"2px dashed #86efac",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#86efac"}}>📷</div>
                )}
                <div style={{marginTop:6,background:"#f0fdf4",borderRadius:9,padding:"8px 10px"}}>
                  <div style={{fontWeight:800,fontSize:14,color:"#16a34a"}}>{absenDetail.masuk||"--"}</div>
                  <div style={{fontSize:9,color:"#666",marginTop:2}}>📍 {absenDetail.lokasi||"--"}</div>
                </div>
              </div>
              <div>
                <div style={{fontWeight:800,fontSize:11,color:"#dc2626",marginBottom:6,display:"flex",alignItems:"center",gap:5}}>🕔 Absen Pulang</div>
                {absenDetail.foto_pulang?(
                  <img src={absenDetail.foto_pulang} alt="" style={{width:"100%",aspectRatio:"3/4",objectFit:"cover",borderRadius:12,border:"2px solid #fca5a5"}}/>
                ):(
                  <div style={{width:"100%",aspectRatio:"3/4",borderRadius:12,background:"#fff5f5",border:"2px dashed #fca5a5",display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,color:"#fca5a5"}}>{absenDetail.masuk?"⏳":"📷"}</div>
                )}
                <div style={{marginTop:6,background:"#fff5f5",borderRadius:9,padding:"8px 10px"}}>
                  <div style={{fontWeight:800,fontSize:14,color:"#dc2626"}}>{absenDetail.pulang||(absenDetail.masuk?"Belum pulang":"--")}</div>
                  <div style={{fontSize:9,color:"#666",marginTop:2}}>📍 {absenDetail.lokasi_pulang||absenDetail.lokasi||"--"}</div>
                </div>
              </div>
            </div>

            {absenDetail.masuk&&absenDetail.pulang&&(()=>{
              const [mh,mm]=absenDetail.masuk.split(":").map(Number);
              const [ph,pm]=absenDetail.pulang.split(":").map(Number);
              const dur=(ph*60+pm-mh*60-mm)/60;
              return (
                <div style={{marginTop:12,background:"#e0faf5",borderRadius:10,padding:"10px 12px",textAlign:"center"}}>
                  <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>⏱️ Total Kerja: {Math.floor(dur)}j {Math.round((dur-Math.floor(dur))*60)}m</span>
                </div>
              );
            })()}

            <button onClick={()=>setAbsenDetail(null)} style={{width:"100%",marginTop:14,padding:"10px",borderRadius:10,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Tutup</button>
          </div>
        </div>
      )}

      {/* SLIP GAJI MODAL */}
      {slipGajiTarget&&(()=>{
        const k = karyawanList.find(x=>x.username===slipGajiTarget);
        if(!k) return null;
        const gajiPokok = draftGajiKaryawan[k.username]?.gajiPokok ?? k.gajiPokok ?? draftPotongan.gajiPokok;
        const kasbon    = draftGajiKaryawan[k.username]?.kasbon ?? k.kasbon ?? 0;
        const potLain   = draftGajiKaryawan[k.username]?.potonganLain ?? k.potonganLain ?? 0;
        const absList   = absensiMap[k.username]||[];
        const bulanIni  = new Date().toLocaleDateString("id-ID",{month:"long",year:"numeric"});
        const hadirN    = absList.filter(a=>a.masuk&&a.masuk!=="--").length;
        const izinList  = (izinMap[k.username]||[]).filter(i=>i.status==="disetujui");
        const izinN     = izinList.filter(i=>i.jenis==="Izin").length;
        const sakitN    = izinList.filter(i=>i.jenis==="Sakit").length;
        const lemburN   = izinList.filter(i=>i.jenis==="Lembur").length;

        const potIzin   = izinN  * (draftPotongan.potonganIzin||0);
        const potSakit  = sakitN * (draftPotongan.potonganSakit||0);
        const lemburPay = draftShift.lemburTipe==="pershift"
          ? lemburN * (draftShift.lemburFlat||0)
          : lemburN * (draftPotongan.rateLembur||0);

        const totalPotongan = kasbon + potLain + potIzin + potSakit;
        const totalGaji = Math.max(0, gajiPokok + lemburPay - totalPotongan);

        const printSlip = () => {
          const w = window.open("","_blank");
          if(!w) return;
          const fmtRpL = n => "Rp " + n.toLocaleString("id-ID");
          const rowsHtml = [
            {l:"Gaji Pokok", v:fmtRpL(gajiPokok)},
            {l:`Lembur (${lemburN}x — ${draftShift.lemburTipe==="pershift"?"per sesi":"per jam"})`, v:fmtRpL(lemburPay)},
            {l:"Subtotal", v:fmtRpL(gajiPokok+lemburPay), bold:true},
          ];
          const potHtml = [
            {l:`Izin (${izinN}x)`, v:"- "+fmtRpL(potIzin)},
            {l:`Sakit (${sakitN}x)`, v:"- "+fmtRpL(potSakit)},
            {l:"Kasbon", v:"- "+fmtRpL(kasbon)},
            {l:"Potongan Lain", v:"- "+fmtRpL(potLain)},
            {l:"Total Potongan", v:"- "+fmtRpL(totalPotongan), bold:true},
          ];
          const rowHTML = r => `<div class="row${r.bold?' bold':''}"><span>${r.l}</span><span class="${r.bold?'':''}">${r.v}</span></div>`;
          w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Slip Gaji - ${k.nama}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
            *{box-sizing:border-box;margin:0;padding:0}
            body{font-family:'Nunito',Arial,sans-serif;background:#f0faf8;padding:24px;color:#1a2e2a;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
            .card{max-width:480px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08);border:1px solid #e0f5f1}
            .head{background:linear-gradient(135deg,#064e3b,#0d9488,#14b8a6);color:#fff;padding:28px 26px 22px;position:relative}
            .head .label{font-size:12px;opacity:.85;font-weight:700;letter-spacing:2px}
            .head .company{font-weight:900;font-size:24px;margin-top:4px}
            .head .icon{position:absolute;top:24px;right:24px;font-size:30px}
            .who{display:flex;align-items:center;gap:12px;margin-top:20px}
            .avatar{width:48px;height:48px;border-radius:14px;background:rgba(255,255,255,.22);border:2px solid rgba(255,255,255,.4);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:18px}
            .who .nama{font-weight:900;font-size:18px}
            .who .sub{font-size:12px;opacity:.85;margin-top:2px}
            .periode{margin-top:18px;background:rgba(255,255,255,.15);border-radius:10px;padding:10px 14px;font-size:13px;font-weight:700}
            .body{padding:26px}
            .section-title{font-weight:900;font-size:13px;letter-spacing:2px;margin-bottom:10px}
            .section-title.in{color:#0d9488}
            .section-title.out{color:#dc2626}
            .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0faf8;font-size:14px}
            .row.bold{font-weight:900;font-size:15px}
            .row span:last-child{font-weight:700}
            .row.bold span:last-child{font-weight:900}
            .gap{height:18px}
            .total-box{margin-top:20px;background:linear-gradient(135deg,#e0faf5,#d1fae5);border:2px solid #86efac;border-radius:14px;padding:18px;text-align:center}
            .total-box .l{font-size:13px;font-weight:700;color:#16a34a;margin-bottom:4px;letter-spacing:1px}
            .total-box .v{font-weight:900;font-size:32px;color:#16a34a}
            .stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:18px}
            .stat{border-radius:10px;padding:12px;text-align:center}
            .stat .v{font-weight:900;font-size:20px}
            .stat .l{font-size:11px;font-weight:700;margin-top:2px}
            .footer{margin-top:20px;font-size:11px;color:#aaa;text-align:center;line-height:1.6}
            @media print{
              body{background:#fff;padding:0}
              .card{box-shadow:none;border:none;max-width:100%}
              @page{size:A4;margin:14mm}
            }
          </style></head><body>
            <div class="card">
              <div class="head">
                <div class="icon">🧾</div>
                <div class="label">SLIP GAJI KARYAWAN</div>
                <div class="company">Ammar Cell</div>
                <div class="who">
                  <div class="avatar">${(k.nama||"--").slice(0,2).toUpperCase()}</div>
                  <div>
                    <div class="nama">${k.nama}</div>
                    <div class="sub">${outlets.find(o=>o.id===k.outletId)?.nama||"--"} · ${k.role==="staff"?"Kasir+Bank":k.role}</div>
                  </div>
                </div>
                <div class="periode">📅 Periode: ${bulanIni}</div>
              </div>
              <div class="body">
                <div class="section-title in">💵 PENDAPATAN</div>
                ${rowsHtml.map(rowHTML).join("")}
                <div class="gap"></div>
                <div class="section-title out">✂️ POTONGAN</div>
                ${potHtml.map(rowHTML).join("")}
                <div class="total-box">
                  <div class="l">TOTAL DITERIMA</div>
                  <div class="v">${fmtRpL(totalGaji)}</div>
                </div>
                <div class="stats">
                  <div class="stat" style="background:#f0fdf4"><div class="v" style="color:#16a34a">${hadirN}</div><div class="l" style="color:#16a34a">Hadir</div></div>
                  <div class="stat" style="background:#fffbeb"><div class="v" style="color:#d97706">${izinN}</div><div class="l" style="color:#d97706">Izin</div></div>
                  <div class="stat" style="background:#fff5f5"><div class="v" style="color:#dc2626">${sakitN}</div><div class="l" style="color:#dc2626">Sakit</div></div>
                </div>
                <div class="footer">Slip gaji ini dibuat otomatis oleh sistem Ammar Cell<br>${new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}</div>
              </div>
            </div>
            <script>setTimeout(()=>window.print(),400)</script>
          </body></html>`);
          w.document.close();
        };

        const Row=({label,val,bold,color})=>(
          <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0faf8"}}>
            <span style={{fontSize:12,color:bold?"#1a2e2a":"#666",fontWeight:bold?800:600}}>{label}</span>
            <span style={{fontSize:12,fontWeight:bold?900:700,color:color||(bold?"#1a2e2a":"#1a2e2a")}}>{val}</span>
          </div>
        );

        return (
          <div onClick={()=>setSlipGajiTarget(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
            <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:420,boxShadow:"0 20px 60px rgba(0,0,0,.3)",maxHeight:"92vh",overflowY:"auto"}}>
              <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",borderRadius:"20px 20px 0 0",padding:"24px 24px 20px",color:"#fff",position:"relative",overflow:"hidden"}}>
                <div style={{position:"absolute",width:160,height:160,borderRadius:"50%",background:"rgba(255,255,255,.06)",top:-60,right:-60}}/>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",position:"relative"}}>
                  <div>
                    <div style={{fontSize:11,opacity:.7,fontWeight:700,letterSpacing:1}}>SLIP GAJI KARYAWAN</div>
                    <div style={{fontWeight:900,fontSize:20,marginTop:2}}>Ammar Cell</div>
                  </div>
                  <div style={{fontSize:28}}>🧾</div>
                </div>
                <div style={{marginTop:18,display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:16}}>{k.nama?.slice(0,2).toUpperCase()}</div>
                  <div>
                    <div style={{fontWeight:900,fontSize:16}}>{k.nama}</div>
                    <div style={{fontSize:11,opacity:.8}}>{outlets.find(o=>o.id===k.outletId)?.nama||"--"} · {k.role==="staff"?"Kasir+Bank":k.role}</div>
                  </div>
                </div>
                <div style={{marginTop:14,background:"rgba(255,255,255,.12)",borderRadius:10,padding:"8px 12px",fontSize:11,fontWeight:700}}>
                  📅 Periode: {bulanIni}
                </div>
              </div>

              <div style={{padding:"20px 24px"}}>
                <div style={{fontWeight:800,fontSize:11,color:"#0d9488",marginBottom:6,letterSpacing:1}}>💵 PENDAPATAN</div>
                <Row label="Gaji Pokok" val={`Rp ${gajiPokok.toLocaleString("id-ID")}`}/>
                <Row label={`Lembur (${lemburN}x — ${draftShift.lemburTipe==="pershift"?"per sesi":"per jam"})`} val={`Rp ${lemburPay.toLocaleString("id-ID")}`}/>
                <Row label="Subtotal" val={`Rp ${(gajiPokok+lemburPay).toLocaleString("id-ID")}`} bold/>

                <div style={{height:14}}/>

                <div style={{fontWeight:800,fontSize:11,color:"#dc2626",marginBottom:6,letterSpacing:1}}>✂️ POTONGAN</div>
                <Row label={`Izin (${izinN}x)`} val={`- Rp ${potIzin.toLocaleString("id-ID")}`} color="#dc2626"/>
                <Row label={`Sakit (${sakitN}x)`} val={`- Rp ${potSakit.toLocaleString("id-ID")}`} color="#dc2626"/>
                <Row label="Kasbon" val={`- Rp ${kasbon.toLocaleString("id-ID")}`} color="#dc2626"/>
                <Row label="Potongan Lain" val={`- Rp ${potLain.toLocaleString("id-ID")}`} color="#dc2626"/>
                <Row label="Total Potongan" val={`- Rp ${totalPotongan.toLocaleString("id-ID")}`} bold color="#dc2626"/>

                <div style={{marginTop:16,background:"linear-gradient(135deg,#e0faf5,#d1fae5)",borderRadius:14,padding:"16px",border:"2px solid #86efac"}}>
                  <div style={{fontSize:11,fontWeight:700,color:"#16a34a",marginBottom:4}}>TOTAL DITERIMA</div>
                  <div style={{fontWeight:900,fontSize:26,color:"#16a34a"}}>Rp {totalGaji.toLocaleString("id-ID")}</div>
                </div>

                <div style={{marginTop:14,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {[
                    {l:"Hadir",v:hadirN,c:"#16a34a",bg:"#f0fdf4"},
                    {l:"Izin",v:izinN,c:"#d97706",bg:"#fffbeb"},
                    {l:"Sakit",v:sakitN,c:"#dc2626",bg:"#fff5f5"},
                  ].map(s=>(
                    <div key={s.l} style={{background:s.bg,borderRadius:10,padding:"8px",textAlign:"center"}}>
                      <div style={{fontWeight:900,fontSize:16,color:s.c}}>{s.v}</div>
                      <div style={{fontSize:9,color:s.c,fontWeight:700}}>{s.l}</div>
                    </div>
                  ))}
                </div>

                <div style={{marginTop:16,fontSize:9,color:"#bbb",textAlign:"center"}}>
                  Slip gaji ini dibuat otomatis oleh sistem Ammar Cell · {new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}
                </div>

                <div style={{display:"flex",gap:8,marginTop:16}}>
                  <button onClick={()=>setSlipGajiTarget(null)} style={{flex:1,padding:"11px",borderRadius:11,border:"2px solid #e0f5f1",background:"#fff",color:"#666",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Tutup</button>
                  <button onClick={printSlip} style={{flex:2,padding:"11px",borderRadius:11,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🖨️ Cetak / Simpan PDF</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
function useGpsMonitor({ user, outlets, enabled, onViolation }) {
  const CEK_INTERVAL_MS = 5 * 60 * 1000; // 5 menit
  const WARN_DETIK      = 30;

  const [gpsStatus,  setGpsStatus]  = useState("pending"); // pending|loading|aman|jauh|fake|off
  const [gpsJarak,   setGpsJarak]   = useState(null);
  const [gpsAcc,     setGpsAcc]     = useState(null);
  const [gpsCoords,  setGpsCoords]  = useState(null);
  const [warnCD,     setWarnCD]     = useState(null);
  const [nextCek,    setNextCek]    = useState(CEK_INTERVAL_MS/1000);
  const [gpsLog,     setGpsLog]     = useState([]);
  const warnRef = useRef(null), nextRef = useRef(null);

  const hitungJarak = (lat1,lng1,lat2,lng2) => {
    const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const startWarning = useCallback(()=>{
    clearInterval(warnRef.current);
    setWarnCD(WARN_DETIK);
    warnRef.current = setInterval(()=>{
      setWarnCD(p=>{
        if(p<=1){ clearInterval(warnRef.current); if(onViolation) onViolation(); return 0; }
        return p-1;
      });
    },1000);
  },[onViolation]);

  const cekSekarang = useCallback(()=>{
    if(!enabled||!user) return;
    const outlet = outlets.find(o=>o.id===user.outletId);
    // Kalau outlet belum punya koordinat, skip GPS check
    if(!outlet?.lat||!outlet?.lng) { setGpsStatus("off"); return; }

    setGpsStatus("loading");
    navigator.geolocation?.getCurrentPosition(
      (pos)=>{
        const {latitude:lat,longitude:lng,accuracy:acc} = pos.coords;
        setGpsCoords({lat,lng});
        setGpsAcc(Math.round(acc));
        const isMock  = acc===0||acc<1;
        const jarak   = hitungJarak(lat,lng,outlet.lat,outlet.lng);
        const inArea  = jarak<=(outlet.radius||100) && !isMock;
        const status  = isMock?"fake":inArea?"aman":"jauh";
        const fmtJ    = jarak<1000?`${Math.round(jarak)}m`:`${(jarak/1000).toFixed(1)}km`;
        setGpsStatus(status);
        setGpsJarak(fmtJ);
        setGpsLog(p=>[{waktu:new Date().toLocaleTimeString("id-ID"),status,jarak:fmtJ,acc:Math.round(acc),mock:isMock},...p.slice(0,19)]);
        if(status!=="aman") {
          try{
            supabase.from('portal_absensi_log').insert({user_id:user.username,user_nama:user.nama,tipe:'gps_violation',detail:JSON.stringify({status,jarak:fmtJ,acc,lat,lng,outletId:outlet.id}),waktu:new Date().toISOString()});
          }catch{}
          startWarning();
        } else {
          clearInterval(warnRef.current); setWarnCD(null);
        }
      },
      ()=>{ setGpsStatus("off"); },
      {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
    );
  },[enabled,user,outlets,startWarning]);

  const dismissWarning = useCallback(()=>{
    clearInterval(warnRef.current); setWarnCD(null); cekSekarang();
  },[cekSekarang]);

  // Timer berkala
  useEffect(()=>{
    if(!enabled) return;
    cekSekarang();
    setNextCek(CEK_INTERVAL_MS/1000);
    clearInterval(nextRef.current);
    nextRef.current = setInterval(()=>{
      setNextCek(p=>{
        if(p<=1){ cekSekarang(); return CEK_INTERVAL_MS/1000; }
        return p-1;
      });
    },1000);
    return()=>{ clearInterval(warnRef.current); clearInterval(nextRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[enabled, user?.username, user?.outletId]);

  return { gpsStatus, gpsJarak, gpsAcc, gpsCoords, warnCD, nextCek, gpsLog, cekSekarang, dismissWarning };
}

// ==============================================================================
// HALAMAN PILIH AKSES — full mobile portrait, support multi-outlet
// ==============================================================================
function PilihAksesPage({ user, outlets, onPilih, onLogout }) {
  // Parse outletIds dari semua kemungkinan format
  const parseIds = (u) => {
    const ids = new Set();
    // Dari outletIds array
    if(Array.isArray(u.outletIds)) u.outletIds.forEach(id=>ids.add(id));
    // Dari outletIds string JSON
    else if(typeof u.outletIds==="string"&&u.outletIds.startsWith("[")) {
      try{ JSON.parse(u.outletIds).forEach(id=>ids.add(id)); }catch{}
    }
    // Dari outletId tunggal
    if(u.outletId) ids.add(u.outletId);
    if(u.outlet_id) ids.add(u.outlet_id);
    return [...ids].filter(Boolean);
  };

  const userOutletIds = parseIds(user);
  const userOutlets   = userOutletIds.length>0
    ? outlets.filter(o=>userOutletIds.includes(o.id))
    : (user.outletId?outlets.filter(o=>o.id===user.outletId):[]);
  const multiOutlet   = userOutlets.length>1;

  const [step,         setStep]       = useState(multiOutlet?"outlet":"akses");
  const [activeOutlet, setActiveOutlet]= useState(!multiOutlet&&userOutlets.length===1?userOutlets[0]:null);
  const [lokasiCek,    setLokasiCek]  = useState(null);
  const [loadGps,      setLoadGps]    = useState(false);
  const [clock,        setClock]      = useState(new Date().toLocaleTimeString("id-ID"));

  useEffect(()=>{ const iv=setInterval(()=>setClock(new Date().toLocaleTimeString("id-ID")),1000); return()=>clearInterval(iv); },[]);

  const hitungJarak=(lat1,lng1,lat2,lng2)=>{
    const R=6371000,dLat=(lat2-lat1)*Math.PI/180,dLng=(lng2-lng1)*Math.PI/180;
    const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
    return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
  };

  const cekGps=(ol)=>{
    const target=ol||activeOutlet;
    if(!target?.lat||!target?.lng){ setLokasiCek({inArea:true,jarak:null,isMock:false,acc:0}); return; }
    setLoadGps(true); setLokasiCek(null);
    navigator.geolocation?.getCurrentPosition(
      ({coords:{latitude:lat,longitude:lng,accuracy:acc}})=>{
        const isMock=acc===0||acc<1;
        const jarak=hitungJarak(lat,lng,target.lat,target.lng);
        const inArea=jarak<=(target.radius||100)&&!isMock;
        setLokasiCek({inArea,jarak:jarak<1000?`${Math.round(jarak)}m`:`${(jarak/1000).toFixed(1)}km`,isMock,acc:Math.round(acc)});
        setLoadGps(false);
      },
      ()=>{ setLokasiCek({inArea:true,jarak:null,isMock:false,acc:0}); setLoadGps(false); },
      {enableHighAccuracy:true,timeout:8000,maximumAge:10000}
    );
  };

  const pilihOutlet=(ol)=>{ setActiveOutlet(ol); setLokasiCek(null); setStep("akses"); cekGps(ol); };

  useEffect(()=>{ if(step==="akses"&&activeOutlet) cekGps(activeOutlet); },[]);

  const boleh   = lokasiCek?.inArea===true;
  const hasGps  = !!(activeOutlet?.lat&&activeOutlet?.lng);
  const isKasir = user.role==="kasir"||user.role==="staff"||(user.role==="karyawan"&&userOutletIds.length>0);
  const isBank  = user.role==="bank"||user.role==="staff";
  const outletHasGabungan = !!(activeOutlet?.fitur_gabungan??activeOutlet?.fiturGabungan);

  const MENU = [
    isKasir&&{k:"kasir",icon:"🛒",label:"Kasir",      sub:"Buka transaksi penjualan",     grad:"linear-gradient(135deg,#0d9488,#14b8a6)",glow:"rgba(13,148,136,.35)",locked:!boleh},
    isBank &&{k:"bank", icon:"🏦",label:"Bank",        sub:"Pencatatan transaksi keuangan",grad:"linear-gradient(135deg,#2980b9,#3498db)",glow:"rgba(41,128,185,.35)",locked:!boleh},
    (isKasir&&isBank&&outletHasGabungan)&&{k:"gabungan",icon:"🧾",label:"Kasir + Bank (1 Laci)",sub:"Transaksi gabungan satu laci",grad:"linear-gradient(135deg,#4338ca,#6366f1)",glow:"rgba(67,56,202,.35)",locked:!boleh},
    {k:"portal",icon:"👤",label:"Portal Saya",sub:"Absensi, izin, misi & gaji",grad:"linear-gradient(135deg,#059669,#0d9488)",glow:"rgba(5,150,105,.3)",locked:false,free:true},
  ].filter(Boolean);

  const OC=["#0d9488","#2980b9","#8e44ad","#d97706","#e74c3c"];

  const Header=()=>(
    <div style={{padding:"20px 20px 0",paddingTop:"max(20px,env(safe-area-inset-top,20px))"}}>
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20,animation:"fadeUp .35s ease"}}>
        <div style={{width:52,height:52,borderRadius:16,background:"rgba(255,255,255,.2)",border:"2px solid rgba(255,255,255,.35)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:20,color:"#fff",flexShrink:0}}>{user.nama?.slice(0,2).toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:900,fontSize:17,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{user.nama}</div>
          <div style={{fontSize:11,color:"rgba(255,255,255,.7)",marginTop:2,display:"flex",alignItems:"center",gap:5}}>
            <span style={{width:7,height:7,borderRadius:"50%",background:"#2ecc71",display:"inline-block",flexShrink:0}}/>
            {activeOutlet?.nama||(userOutlets.length>1?`${userOutlets.length} outlet`:"—")}
          </div>
        </div>
        <div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontFamily:"monospace",fontWeight:900,fontSize:15,color:"#fff"}}>{clock}</div>
          <div style={{fontSize:9,color:"rgba(255,255,255,.5)"}}>{new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"short"})}</div>
        </div>
      </div>
    </div>
  );

  const LogoutBtn=()=>(
    <button onClick={onLogout}
      style={{width:"100%",padding:"12px",borderRadius:13,border:"2px solid rgba(255,255,255,.2)",background:"rgba(255,255,255,.08)",color:"rgba(255,255,255,.7)",fontWeight:700,fontSize:13,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}
      onMouseEnter={e=>{e.currentTarget.style.background="rgba(239,68,68,.2)";e.currentTarget.style.color="#fca5a5";}}
      onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.08)";e.currentTarget.style.color="rgba(255,255,255,.7)";}}>
      🚪 Logout
    </button>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#064e3b 0%,#0a6a5e 40%,#0d9488 100%)",fontFamily:"'Nunito',sans-serif",display:"flex",flexDirection:"column",alignItems:"center"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');*{box-sizing:border-box}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}@keyframes spin{to{transform:rotate(360deg)}}.pa-c:active{transform:scale(.97)!important}`}</style>
      <div style={{width:"100%",maxWidth:420,minHeight:"100vh",display:"flex",flexDirection:"column"}}>
        <Header/>

        {/* ══ STEP 1: PILIH OUTLET ══ */}
        {step==="outlet"&&(
          <div style={{flex:1,padding:"0 20px",display:"flex",flexDirection:"column"}}>
            <div style={{marginBottom:24,animation:"fadeUp .35s ease"}}>
              <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>Buka di outlet mana? 🏪</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.65)",marginTop:4}}>Kamu terdaftar di {userOutlets.length} outlet</div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:12,flex:1}}>
              {userOutlets.map((ol,i)=>(
                <button key={ol.id} onClick={()=>pilihOutlet(ol)}
                  className="pa-c"
                  style={{width:"100%",borderRadius:20,padding:"18px 22px",border:"2px solid rgba(255,255,255,.25)",background:"rgba(255,255,255,.12)",cursor:"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:16,transition:"all .2s",animation:`fadeUp .35s ${i*0.1}s ease both`}}
                  onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,.22)";e.currentTarget.style.transform="scale(1.02)";}}
                  onMouseLeave={e=>{e.currentTarget.style.background="rgba(255,255,255,.12)";e.currentTarget.style.transform="";}}>
                  <div style={{width:56,height:56,borderRadius:16,background:`linear-gradient(135deg,${OC[i%OC.length]},${OC[i%OC.length]}cc)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,boxShadow:`0 4px 16px ${OC[i%OC.length]}50`}}>🏪</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:900,fontSize:16,color:"#fff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ol.nama}</div>
                    {ol.alamat&&<div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginTop:2}}>📍 {ol.alamat}</div>}
                    <div style={{fontSize:10,color:"rgba(255,255,255,.45)",marginTop:2}}>{ol.lat?"🛰 GPS aktif":"📡 GPS belum diset"} · Radius {ol.radius||100}m</div>
                  </div>
                  <div style={{color:"rgba(255,255,255,.7)",fontSize:26}}>›</div>
                </button>
              ))}
            </div>
            <div style={{padding:"16px 0",paddingBottom:"max(16px,env(safe-area-inset-bottom,16px))"}}><LogoutBtn/></div>
          </div>
        )}

        {/* ══ STEP 2: PILIH AKSES ══ */}
        {step==="akses"&&(
          <>
          <div style={{padding:"0 20px"}}>
            {multiOutlet&&(
              <button onClick={()=>{setStep("outlet");setLokasiCek(null);}}
                style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,.12)",border:"1px solid rgba(255,255,255,.25)",borderRadius:20,padding:"6px 14px",color:"rgba(255,255,255,.8)",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:14}}>
                ← {activeOutlet?.nama||"Ganti Outlet"}
              </button>
            )}
            <div style={{marginBottom:16,animation:"fadeUp .3s ease"}}>
              <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>Selamat datang! 👋</div>
              <div style={{fontSize:13,color:"rgba(255,255,255,.65)",marginTop:4}}>{activeOutlet?.nama} · Mau buka apa?</div>
            </div>
            {hasGps&&(
              <div style={{background:"rgba(255,255,255,.12)",borderRadius:14,padding:"11px 14px",marginBottom:14,border:"1px solid rgba(255,255,255,.2)",display:"flex",alignItems:"center",gap:10,animation:"fadeUp .3s ease"}}>
                {loadGps?(<><div style={{width:24,height:24,border:"3px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",flexShrink:0}}/><div style={{fontSize:12,fontWeight:700,color:"rgba(255,255,255,.9)"}}>Memeriksa GPS...</div></>)
                :lokasiCek?.isMock?(<><span style={{fontSize:20}}>🚫</span><div style={{flex:1,fontSize:12,fontWeight:800,color:"#fca5a5"}}>GPS Palsu Terdeteksi</div></>)
                :lokasiCek?.inArea?(<><span style={{fontSize:20}}>✅</span><div style={{flex:1,fontSize:12,fontWeight:800,color:"#a7f3d0"}}>Lokasi Terverifikasi{lokasiCek.jarak?` — ${lokasiCek.jarak}`:""}</div></>)
                :lokasiCek?(<><span style={{fontSize:20}}>📍</span><div style={{flex:1}}><div style={{fontSize:12,fontWeight:800,color:"#fcd34d"}}>Di luar area — {lokasiCek.jarak}</div><div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>Radius {activeOutlet?.radius||100}m</div></div><button onClick={()=>cekGps()} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:8,padding:"5px 10px",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>🔄</button></>)
                :null}
              </div>
            )}
          </div>
          <div style={{flex:1,padding:"0 20px",display:"flex",flexDirection:"column",gap:12}}>
            {MENU.map((m,i)=>(
              <button key={m.k} onClick={()=>!m.locked&&onPilih(m.k,activeOutlet)}
                className="pa-c"
                style={{width:"100%",borderRadius:20,padding:"20px 22px",border:"none",background:m.locked?"rgba(255,255,255,.07)":m.grad,cursor:m.locked?"not-allowed":"pointer",fontFamily:"inherit",textAlign:"left",display:"flex",alignItems:"center",gap:16,boxShadow:m.locked?"none":`0 8px 24px ${m.glow}`,opacity:m.locked?0.55:1,transition:"transform .15s,box-shadow .15s",animation:`fadeUp .3s ${i*0.08}s ease both`}}
                onMouseEnter={e=>{if(!m.locked){e.currentTarget.style.transform="scale(1.02)";e.currentTarget.style.boxShadow=`0 12px 32px ${m.glow}`;}}}
                onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=m.locked?"none":`0 8px 24px ${m.glow}`;}}>
                <div style={{width:60,height:60,borderRadius:18,background:"rgba(255,255,255,.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:30,flexShrink:0,border:"2px solid rgba(255,255,255,.25)"}}>{m.locked?"🔒":m.icon}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:900,fontSize:18,color:"#fff",marginBottom:3}}>{m.label}</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,.75)"}}>{m.locked?(lokasiCek?.isMock?"GPS palsu — diblokir":lokasiCek?.jarak?`${lokasiCek.jarak} dari outlet`:hasGps?"Harus di area outlet":m.sub):m.sub}</div>
                  {m.free&&!m.locked&&<div style={{marginTop:5,display:"inline-block",background:"rgba(255,255,255,.25)",borderRadius:20,padding:"2px 10px",fontSize:9,fontWeight:800,color:"#fff"}}>BEBAS AKSES</div>}
                </div>
                {!m.locked&&<div style={{color:"rgba(255,255,255,.7)",fontSize:26}}>›</div>}
              </button>
            ))}
          </div>
          <div style={{padding:"16px 20px",paddingBottom:"max(16px,env(safe-area-inset-bottom,16px))"}}>
            {!hasGps&&<div style={{background:"rgba(255,255,255,.08)",borderRadius:10,padding:"8px 12px",marginBottom:10,fontSize:10,color:"rgba(255,255,255,.5)",textAlign:"center"}}>💡 GPS outlet belum diisi — akses tidak dibatasi lokasi</div>}
            <LogoutBtn/>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

// ==============================================================================
// GPS WARNING OVERLAY — tampil di atas kasir/bank saat keluar area
// ==============================================================================
function GpsWarningOverlay({ warnCD, gpsStatus, gpsJarak, gpsAcc, onVerify, onLock, pilihScene }) {
  if(!warnCD && warnCD !== 0) return null;
  const WARN_TOTAL = 30;
  const isFake = gpsStatus==="fake";
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{background:"#fff",borderRadius:20,padding:"24px",width:"100%",maxWidth:380,border:"3px solid #fca5a5",boxShadow:"0 8px 32px rgba(220,38,38,.25)",textAlign:"center",animation:"slideUp .4s ease"}}>
        <style>{`@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:none;opacity:1}}`}</style>
        {/* Countdown ring */}
        <div style={{position:"relative",width:80,height:80,margin:"0 auto 16px"}}>
          <svg width={80} height={80} style={{transform:"rotate(-90deg)"}}>
            <circle cx={40} cy={40} r={30} fill="none" stroke="#ffe4e6" strokeWidth={6}/>
            <circle cx={40} cy={40} r={30} fill="none" stroke={warnCD>15?"#f59e0b":warnCD>8?"#ef4444":"#dc2626"} strokeWidth={6}
              strokeDasharray={2*Math.PI*30} strokeDashoffset={2*Math.PI*30*(1-warnCD/WARN_TOTAL)}
              strokeLinecap="round" style={{transition:"stroke-dashoffset .9s ease,stroke .3s"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
            <div style={{fontWeight:900,fontSize:20,color:warnCD>15?"#f59e0b":warnCD>8?"#ef4444":"#dc2626",lineHeight:1}}>{warnCD}</div>
            <div style={{fontSize:8,color:"#aaa",fontWeight:700}}>detik</div>
          </div>
        </div>
        <div style={{fontWeight:900,fontSize:17,color:"#dc2626",marginBottom:8}}>{isFake?"GPS Palsu Terdeteksi!":"Kamu Di Luar Area Outlet!"}</div>
        <div style={{fontSize:12,color:"#b91c1c",lineHeight:1.6,marginBottom:16}}>
          {isFake?<>Terdeteksi <b>Mock Location</b>. {pilihScene==="kasir"?"Kasir":"Bank"} akan dikunci otomatis.</>
          :<>Terdeteksi <b>{gpsJarak}</b> dari outlet. {pilihScene==="kasir"?"Kasir":"Bank"} akan dikunci dalam <b>{warnCD} detik</b>.</>}
        </div>
        <div style={{background:"#fff5f5",borderRadius:10,padding:"8px 12px",marginBottom:16,fontSize:10,textAlign:"left",border:"1px solid #fca5a5"}}>
          {[["Jarak",gpsJarak||"--"],["Akurasi GPS",`±${gpsAcc}m${isFake?" ⚠️":""}`],["Status",isFake?"FAKE GPS":"DI LUAR AREA"]].map(r=>(
            <div key={r[0]} style={{display:"flex",justifyContent:"space-between",padding:"2px 0",borderTop:"1px solid #ffe4e6"}}>
              <span style={{color:"#aaa"}}>{r[0]}</span><span style={{fontWeight:700,color:isFake&&r[0]!=="Jarak"?"#dc2626":"#1a2e2a"}}>{r[1]}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {!isFake&&<button onClick={onVerify} style={{width:"100%",padding:12,borderRadius:12,border:"none",background:"linear-gradient(135deg,#0d9488,#14b8a6)",color:"#fff",fontWeight:900,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>📍 Saya Sudah di Outlet — Verifikasi Ulang</button>}
          <button onClick={onLock} style={{width:"100%",padding:10,borderRadius:11,border:"2px solid #fca5a5",background:"#fff",color:"#dc2626",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>🔒 Kunci {pilihScene==="kasir"?"Kasir":"Bank"} Sekarang</button>
        </div>
        <div style={{marginTop:10,fontSize:9,color:"#aaa"}}>⚠️ Aktivitas ini dicatat & dikirim ke admin</div>
      </div>
    </div>
  );
}


// Helper: pastikan outletIds ter-parse dengan benar dari DB
// Handles: {outletIds:[], outletId, outlet_ids:"[...]", outlet_id, data:"{...}"}
const parseUserOutletIds = (usrs) => {
  if(!usrs||typeof usrs!=="object") return usrs;
  const result = {};
  Object.entries(usrs).forEach(([k,u])=>{
    if(!u||typeof u!=="object") return;

    // Coba parse dari field data (JSON string) jika ada
    let base = {...u};
    if(typeof u.data==="string"){
      try{ base={...base,...JSON.parse(u.data)}; }catch{}
    }

    let outletIds = base.outletIds||[];
    // Array sudah benar
    if(!Array.isArray(outletIds)) {
      try{ outletIds=JSON.parse(outletIds); }catch{ outletIds=[]; }
    }
    // Parse dari outlet_ids string
    if(outletIds.length===0&&base.outlet_ids){
      try{ outletIds=JSON.parse(base.outlet_ids); }catch{ outletIds=[]; }
    }
    // Ensure array
    if(!Array.isArray(outletIds)) outletIds=[];

    const outletId = base.outletId||base.outlet_id||outletIds[0]||null;
    // Fallback: kalau masih kosong tapi outletId ada
    if(outletIds.length===0&&outletId) outletIds=[outletId];

    result[k]={
      ...base,
      outletId,
      outletIds,
      role: base.role||"karyawan",
      pass: base.pass||u.pass||"",
      nama: base.nama||u.nama||k,
    };
  });
  return result;
};

export default function App() {
  // -- Session: ambil dari localStorage agar tidak login ulang --------------
  const savedUser = (() => { try { const s=localStorage.getItem('ammar_user'); return s?JSON.parse(s):null; } catch{return null;} })();

  const [user,        setUserState]   = useState(savedUser);

  // -- Deteksi orientasi via JS (bukan CSS orientation media query) ----------
  // Beberapa tablet/PWA terinstall melaporkan CSS `orientation` media feature
  // secara tidak konsisten (tetap "portrait" walau fisik sudah landscape).
  // innerWidth vs innerHeight selalu akurat terhadap viewport aktual.
  const [viewport, setViewport] = useState(()=>({
    w: typeof window!=="undefined"?window.innerWidth:390,
    h: typeof window!=="undefined"?window.innerHeight:844,
  }));
  useEffect(()=>{
    const update = ()=>setViewport({w:window.innerWidth,h:window.innerHeight});
    update();
    window.addEventListener('resize',update);
    window.addEventListener('orientationchange',update);
    // beberapa device butuh delay sebelum innerWidth/innerHeight terupdate setelah rotasi
    const onRotate = ()=>{ update(); setTimeout(update,150); setTimeout(update,400); };
    window.addEventListener('orientationchange',onRotate);
    if(window.screen?.orientation) window.screen.orientation.addEventListener?.('change',onRotate);
    return ()=>{
      window.removeEventListener('resize',update);
      window.removeEventListener('orientationchange',update);
      window.removeEventListener('orientationchange',onRotate);
      if(window.screen?.orientation) window.screen.orientation.removeEventListener?.('change',onRotate);
    };
  },[]);
  const isPortraitNow = viewport.h > viewport.w;
  // Dimensi terkecil (sisi pendek, konstan saat rotasi) — dasar klasifikasi device
  const shortSide = Math.min(viewport.w, viewport.h);

  // -- Deteksi tipe device: smartphone / tablet / desktop ---------------------
  // Touch capability = sinyal device bisa dirotasi fisik (HP/tablet).
  // Desktop/laptop (non-touch) tidak pernah dipaksa rotasi karena tidak bisa diputar.
  const [isTouchDevice] = useState(()=>{
    if(typeof window==="undefined") return false;
    return ('ontouchstart' in window) || (navigator.maxTouchPoints||0) > 0;
  });
  const isTabletDevice = isTouchDevice && shortSide >= 600; // ~7" ke atas
  const isPhoneDevice  = isTouchDevice && shortSide < 600;
  const deviceLabel = isTabletDevice?"Tablet":isPhoneDevice?"HP":"Device";

  const [page,        setPage]        = useState(()=>{
    const u = savedUser;
    if(!u) return "menu";
    if(u.role==="monitor")  return "monitor";
    if(u.role==="cashflow") return "cashflow";
    if(u.role==="admin")    return "menu";
    if(u.role==="kasir"||u.role==="bank"||u.role==="staff") return "pilih";
    // karyawan lama dengan outlet → pilih dulu
    if(u.role==="karyawan"&&(u.outletId||(u.outletIds&&u.outletIds.length>0))) return "pilih";
    return "portal";
  });

  // -- GPS & pilih akses state --
  const [pilihScene,  setPilihScene]  = useState(null); // "kasir"|"bank"|"portal"
  const [kasirLocked, setKasirLocked] = useState(false);

  const handlePilih = (akses, selectedOutlet) => {
    // Update user's active outlet jika dipilih (untuk GPS monitoring)
    if(selectedOutlet && user) {
      setUserState(prev=>({...prev, outletId: selectedOutlet.id, _activeOutlet: selectedOutlet}));
    }
    setPilihScene(akses);
    setPage(akses==="portal"?"portal":akses);
    setKasirLocked(false);
  };

  const handleGpsViolation = () => {
    setKasirLocked(true);
    setPage("pilih");
    setPilihScene(null);
  };

  // PWA dihandle di index.html
  const [products,    setProductsState] = useState([]);
  const [outlets,     setOutletsState]  = useState([]);
  const [stocks,      setStocksState]   = useState({});
  const [transactions,setTx]            = useState([]);
  const [users,       setUsersState]    = useState({});
  const [saldoApps,   setSaldoApps]     = useState(DEFAULT_SALDO_APPS);
  const [saldoBank,   setSaldoBank]     = useState(DEFAULT_SALDO_APPS);
  const [toast,       setToast]         = useState(null);
  const [loading,     setLoading]       = useState(true);
  const [dbError,     setDbError]       = useState(null);
  const [prodOrder,      setProdOrderRoot]   = useState(null); // urutan global produk
  const [aktifProdsRoot, setAktifProdsRoot]  = useState({});   // produk aktif per outlet
  const [allBankTrx,     setAllBankTrx]      = useState([]);   // semua bank transactions
  const [connStatus,     setConnStatus]      = useState("online");  // online|offline|reconnecting
  const [offlineQueue,   setOfflineQueue]    = useState([]);  // transaksi antrian saat offline
  const [lastPing,       setLastPing]        = useState(null);

  // -- Portal Karyawan (dikelola admin, dibaca karyawan) --
  const [portalMisi,    setPortalMisi]    = useState([]);
  const [portalNote,    setPortalNote]    = useState("💪 Semangat pagi! Berikan pelayanan terbaik untuk pelanggan kita. — Pimpinan");
  const [portalShift,   setPortalShift]   = useState({masuk:"08:00",pulang:"17:00",totalJam:9});
  const [portalAbsensi, setPortalAbsensi] = useState({});
  const [portalIzin,    setPortalIzin]    = useState({});
  const [portalTodos,   setPortalTodos]   = useState([]); // [{id,judul,periode,urutan}]
  const [portalTodoStatus, setPortalTodoStatus] = useState({}); // {username: {todoId: {tgl: done}}}
  const [portalPoinRate, setPortalPoinRate] = useState(1000); // 1 poin = Rp ...
  const [portalMisiProgress, setPortalMisiProgress] = useState({}); // {misiId: {username: {periodeKey: {progress,selesai}}}}
  const [portalMisiFoto, setPortalMisiFoto] = useState([]); // [{id,misiId,username,foto_before,foto_after,...}]
  const [strukConfig, setStrukConfig] = useState({
    namaToko:"AMMAR CELL", showOutlet:true, showKasir:true, showNoTrx:true,
    footer1:"Terima kasih!", footer2:"Barang sudah dibeli\ntidak dapat ditukar/dikembalikan",
    headerExtra:"", // misal alamat/no telp
  });

  // Simpan user ke localStorage setiap kali berubah
  const setUser = (u) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem('ammar_user', JSON.stringify(u));
      else    localStorage.removeItem('ammar_user');
    } catch {}
  };

  const notify = (msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  // -- Auto reset shift jam 23.00 setiap hari ----------------------------------
  useEffect(()=>{
    let lastResetDate = null;

    const autoReset = async () => {
      const now = new Date();
      const h = now.getHours();
      const dateStr = now.toLocaleDateString("id-ID");

      // Jam 23:00 - 23:05 dan belum reset hari ini
      if(h === 23 && new Date().getHours() === 23 && lastResetDate !== dateStr) {
        lastResetDate = dateStr;
        try {
          // Ambil semua shift aktif
          const {data: activeShifts} = await supabase.from('active_shifts').select('*');
          const {data: activeBankShifts} = await supabase.from('bank_shifts').select('*');

          // Simpan ke shift_logs sebagai auto-close
          if(activeShifts?.length > 0) {
            for(const s of activeShifts) {
              await supabase.from('shift_logs').insert({
                id: s.id + '_autoreset',
                outlet_id: s.outlet_id,
                user_id: s.user_id,
                nama: s.nama,
                start_time: s.start_time,
                end_time: new Date().toISOString(),
                saldo_open: s.saldo_data || {},
                saldo_close: { catatan: 'Auto-reset sistem jam 23:00' },
                rekap: { autoReset: true, resetDate: dateStr },
              }).catch(()=>{});
            }
            // Hapus semua active_shifts
            await supabase.from('active_shifts').delete().neq('id','__none__');
          }

          // Simpan bank_shifts ke bank_shift_logs lalu hapus
          if(activeBankShifts?.length > 0) {
            for(const s of activeBankShifts) {
              await supabase.from('bank_shift_logs').insert({
                id: s.id + '_autoreset',
                outlet_id: s.outlet_id,
                user_id: s.user_id,
                nama: s.nama,
                start_time: s.start_time,
                end_time: new Date().toISOString(),
                saldo_open: s.saldo_data || {},
                saldo_close: { catatan: 'Auto-reset sistem jam 23:00' },
              }).catch(()=>{});
            }
            await supabase.from('bank_shifts').delete().neq('id','__none__');
          }

          // Simpan log reset ke tabel reset_logs
          const totalShifts = (activeShifts?.length||0) + (activeBankShifts?.length||0);
          if(totalShifts > 0) {
            await supabase.from('reset_logs').insert({
              id: uid(),
              tgl: dateStr,
              waktu: '23:00:00',
              jumlah_shift: totalShifts,
              detail: { kasir: activeShifts||[], bank: activeBankShifts||[] },
            }).catch(()=>{});
            console.log(`[AutoReset] ${dateStr} 23:00 -- ${totalShifts} shift ditutup otomatis`);
          }
        } catch(e) { console.warn('autoReset error:', e); }
      }

      // DISABLED: Cleanup otomatis berdasarkan created_at DIHAPUS
      // karena timezone mismatch bisa hapus shift yang baru dibuka
      // Cleanup hanya dilakukan manual oleh admin atau saat tutup shift
    };

    // Cek setiap menit
    autoReset();
    const iv = setInterval(autoReset, 60*1000);
    return ()=>clearInterval(iv);
  },[]);

  // -- Auto reload saat app kembali ke foreground (tab aktif lagi) ----------
  // -- Connection monitor: ping Supabase tiap 10 detik ---------------------
  useEffect(()=>{
    let wasOffline = false;

    const checkConn = async () => {
      if(!navigator.onLine){
        setConnStatus("offline");
        wasOffline = true;
        return;
      }
      try{
        // Ping ringan ke Supabase
        const t0=Date.now();
        await supabase.from('active_shifts').select('id').limit(1);
        const ms=Date.now()-t0;
        setLastPing(ms);
        if(wasOffline){
          setConnStatus("reconnecting");
          setTimeout(async()=>{
            // Flush offline queue DULU sebelum reload
            setOfflineQueue(prev=>{
              if(prev.length>0){
                flushOfflineQueue(prev).then(ok=>{
                  // Setelah flush, reload data agar admin lihat data terbaru
                  reloadData();
                });
              } else {
                reloadData();
              }
              return [];
            });
            setConnStatus("online");
          },1500);
          wasOffline=false;
        } else {
          setConnStatus(ms>3000?"slow":ms>1500?"warn":"online");
        }
      }catch(e){
        setConnStatus("offline");
        wasOffline=true;
      }
    };

    const pingIv = setInterval(checkConn, 10000);
    checkConn();

    const onOnline = () => {
      setConnStatus("reconnecting");
      wasOffline=true;
      setTimeout(checkConn, 1500);
    };
    const onOffline = () => {
      setConnStatus("offline");
      wasOffline=true;
    };
    const onVisible = () => {
      if(document.visibilityState==='visible'){ checkConn(); reloadData(); }
    };

    // Reload data setiap 90 detik sebagai fallback realtime putus
    const reloadIv = setInterval(()=>{
      if(document.visibilityState==='visible'&&navigator.onLine) reloadData();
    }, 90000);

    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(pingIv);
      clearInterval(reloadIv);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  },[]);

  // -- Flush offline queue setelah kembali online ---------------------------
  const flushOfflineQueue = async (queue) => {
    if(!queue?.length) return;
    console.log('[OfflineQueue] Memproses', queue.length, 'item...');
    const succeeded = [];
    for(const item of queue){
      try{
        if(item.type==='transaction'){
          await db.addTransaction(item.data);
          console.log('[OfflineQueue] ✓ Transaksi disimpan:', item.data.id);
          succeeded.push(item);
          // Hapus dari backup localStorage
          try{
            const qKey=`offline_queue_${item.data.outletId}`;
            const remaining=JSON.parse(localStorage.getItem(qKey)||'[]').filter(x=>x.data?.id!==item.data.id);
            localStorage.setItem(qKey, JSON.stringify(remaining));
          }catch{}
        } else if(item.type==='stock'){
          await db.updateStock(item.productId, item.outletId, item.newQty);
          succeeded.push(item);
        }
      }catch(e){ console.warn('[OfflineQueue] Gagal flush item:', e.message||e); }
    }
    if(succeeded.length>0){
      console.log('[OfflineQueue] Berhasil sync', succeeded.length, 'dari', queue.length);
      notify(`✅ ${succeeded.length} transaksi berhasil dikirim ke server`, "ok");
    }
    return succeeded;
  };

  // -- Reload data dari Supabase (dipanggil setelah update outlet/user) ------
  const reloadData = async () => {
    try {
      const [prods, outs, stks, txs, usrs, prodOrd, aktifMap, bTrx] = await Promise.all([
        db.getProducts(), db.getOutlets(), db.getStocks(),
        db.getTransactions(), db.getUsers(),
        dbProductOrder.getOrder().catch(()=>[]),
        dbAktifProduk.getAllAktif().catch(()=>({})),
        dbBank.getTransactions().catch(()=>[]),
      ]);
      // Update allBankTrx
      setAllBankTrx((bTrx||[]).map(r=>({
        id:r.id, tgl:r.tgl, waktu:r.waktu||r.created_at,
        shiftId:r.shift_id, nama:r.nama, jenis:r.jenis,
        fee:r.fee||0, nominal:r.nominal, netNominal:r.net_nominal,
        outletId:r.outlet_id,
      })));
      setProductsState(prods);
      setOutletsState(outs);
      try{ localStorage.setItem('ammar_outlets', JSON.stringify(outs.map(o=>({id:o.id,nama:o.nama})))); }catch{}
      // Restore offline queue saat app startup
      try{
        const allQ=[];
        outs.forEach(o=>{
          const q=JSON.parse(localStorage.getItem(`offline_queue_${o.id}`)||'[]');
          allQ.push(...q);
        });
        if(allQ.length>0){ setOfflineQueue(allQ); console.log('[OfflineQueue] Restored',allQ.length,'item'); }
      }catch{}
      setStocksState(stks);
      if(Array.isArray(prodOrd)&&prodOrd.length>0) setProdOrderRoot(prodOrd.map(x=>x.productId||x));
      if(Object.keys(aktifMap).length>0) setAktifProdsRoot(aktifMap);
      setTx(txs.map(t=>({
        id:t.id, outletId:t.outlet_id, shiftId:t.shift_id,
        shiftNama:t.shift_nama, kasir:t.kasir,
        date:t.date, time:t.time,
        total:t.total, cash:t.cash, kembalian:t.kembalian,
        items:t.items||[],
      })));
      const parsed=parseUserOutletIds(usrs);
      setUsersState(parsed);
      // Merge user_outlets async (fire-and-forget)
      supabase.from('user_outlets').select('*').then(({data:uoRows})=>{
        if(!uoRows?.length) return;
        const mp={};
        uoRows.forEach(r=>{if(!mp[r.username])mp[r.username]=[];mp[r.username].push(r.outlet_id);});
        setUsersState(prev=>{
          const n={...prev};
          Object.entries(mp).forEach(([u,ids])=>{if(n[u])n[u]={...n[u],outletIds:ids,outletId:ids[0]};});
          return n;
        });
      }).catch(()=>{});
    } catch(e) { console.error("Reload gagal:",e); }
  };

  // -- Load semua data dari Supabase saat pertama buka ----------------------
  useEffect(()=>{
    const load = async () => {
      // Timeout 15 detik -- jika lebih dari itu tampilkan error
      const timeout = setTimeout(()=>{
        setDbError("Koneksi terlalu lambat. Cek internet dan coba lagi.");
        setLoading(false);
      }, 15000);

      try {
        // Load satu per satu dengan fallback -- satu gagal tidak crash semua
        const prods        = await db.getProducts().catch(()=>[]);
        const outs         = await db.getOutlets().catch(()=>[]);
        const stks         = await db.getStocks().catch(()=>({}));
        const txs          = await db.getTransactions().catch(()=>[]);
        const usrs         = await db.getUsers().catch(()=>({}));
        const saldoList    = await dbSaldo.getSaldoApps().catch(()=>[]);
        const saldoBankList= await dbSaldoBank.getSaldoBankApps().catch(()=>[]);
        const prodOrd      = await dbProductOrder.getOrder().catch(()=>[]);
        const aktifMap     = await dbAktifProduk.getAllAktif().catch(()=>({}));

        // Load user_outlets mapping (untuk multi-outlet assignment)
        try {
          const {data:userOutletsRows} = await supabase.from('user_outlets').select('*');
          if(userOutletsRows?.length>0){
            // Merge outletIds ke users
            const mapping = {};
            userOutletsRows.forEach(r=>{
              if(!mapping[r.username]) mapping[r.username]=[];
              mapping[r.username].push(r.outlet_id);
            });
            setUsersState(prev=>{
              const n={...prev};
              Object.entries(mapping).forEach(([uname,ids])=>{
                if(n[uname]) n[uname]={...n[uname],outletIds:ids,outletId:ids[0]};
              });
              return n;
            });
          }
        } catch(e){ console.warn('user_outlets load:',e); }
        try {
          const { data: portalMisiRows } = await supabase.from('portal_misi').select('*').order('created_at');
          if(portalMisiRows?.length) setPortalMisi(portalMisiRows);
        } catch(e){ console.warn('portal_misi load:',e); }
        try {
          const { data: portalNoteRows } = await supabase.from('portal_settings').select('*').eq('key','note').limit(1);
          if(portalNoteRows?.[0]?.value) setPortalNote(portalNoteRows[0].value);
        } catch(e){ console.warn('portal_note load:',e); }
        try {
          const { data: portalShiftRows } = await supabase.from('portal_settings').select('*').eq('key','shift').limit(1);
          if(portalShiftRows?.[0]?.value) setPortalShift(JSON.parse(portalShiftRows[0].value));
        } catch(e){ console.warn('portal_shift load:',e); }
        try {
          const { data: portalAbsensiRows } = await supabase.from('portal_absensi').select('*').order('tgl',{ascending:false});
          if(portalAbsensiRows?.length){
            const m={};
            portalAbsensiRows.forEach(r=>{ if(!m[r.user_id]) m[r.user_id]=[]; m[r.user_id].push(r); });
            setPortalAbsensi(m);
          }
        } catch(e){ console.warn('portal_absensi load:',e); }
        try {
          const { data: portalIzinRows } = await supabase.from('portal_izin').select('*').order('created_at',{ascending:false});
          if(portalIzinRows?.length){
            const m={};
            portalIzinRows.forEach(r=>{ if(!m[r.user_id]) m[r.user_id]=[]; m[r.user_id].push(r); });
            setPortalIzin(m);
          }
        } catch(e){ console.warn('portal_izin load:',e); }
        try {
          const { data: todoRows } = await supabase.from('portal_todos').select('*').order('urutan');
          if(todoRows) setPortalTodos(todoRows);
        } catch(e){ console.warn('portal_todos load:',e); }
        try {
          const { data: todoStatusRows } = await supabase.from('portal_todo_status').select('*');
          if(todoStatusRows?.length){
            const m={};
            todoStatusRows.forEach(r=>{
              if(!m[r.username]) m[r.username]={};
              if(!m[r.username][r.todo_id]) m[r.username][r.todo_id]={};
              m[r.username][r.todo_id][r.tgl]={done:r.done, status:r.status||'menunggu', confirmed_at:r.confirmed_at};
            });
            setPortalTodoStatus(m);
          }
        } catch(e){ console.warn('portal_todo_status load:',e); }
        try {
          const { data: poinRateRows } = await supabase.from('portal_settings').select('*').eq('key','poin_rate').limit(1);
          if(poinRateRows?.[0]?.value) setPortalPoinRate(+poinRateRows[0].value);
        } catch(e){ console.warn('poin_rate load:',e); }
        try {
          const { data: strukRows } = await supabase.from('portal_settings').select('*').eq('key','struk_config').limit(1);
          if(strukRows?.[0]?.value) setStrukConfig(prev=>({...prev,...JSON.parse(strukRows[0].value)}));
        } catch(e){ console.warn('struk_config load:',e); }
        try {
          const { data: progRows } = await supabase.from('portal_misi_progress').select('*');
          if(progRows?.length){
            const m={};
            progRows.forEach(r=>{
              if(!m[r.misi_id]) m[r.misi_id]={};
              if(!m[r.misi_id][r.username]) m[r.misi_id][r.username]={};
              m[r.misi_id][r.username][r.periode_key]={progress:r.progress,selesai:r.selesai};
            });
            setPortalMisiProgress(m);
          }
        } catch(e){ console.warn('portal_misi_progress load:',e); }
        try {
          const { data: fotoRows } = await supabase.from('portal_misi_foto').select('*').order('created_at',{ascending:false});
          if(fotoRows) setPortalMisiFoto(fotoRows);
        } catch(e){ console.warn('portal_misi_foto load:',e); }

        clearTimeout(timeout);

        setProductsState(prods);
        setOutletsState(outs);
        setStocksState(stks);
        if(Array.isArray(prodOrd)&&prodOrd.length>0) setProdOrderRoot(prodOrd.map(x=>x.productId||x));
        if(Object.keys(aktifMap).length>0) setAktifProdsRoot(aktifMap);
        if (Array.isArray(saldoList) && saldoList.length > 0) setSaldoApps(saldoList);
        if (Array.isArray(saldoBankList) && saldoBankList.length > 0) setSaldoBank(saldoBankList);
        setTx(txs.map(t=>({
          id:t.id, outletId:t.outlet_id, shiftId:t.shift_id,
          shiftNama:t.shift_nama, kasir:t.kasir,
          date:t.date, time:t.time,
          total:t.total, cash:t.cash, kembalian:t.kembalian,
          items:t.items||[],
        })));
        const parsed=parseUserOutletIds(usrs);
        setUsersState(parsed);
        // Merge user_outlets async (fire-and-forget)
        supabase.from('user_outlets').select('*').then(({data:uoRows})=>{
          if(!uoRows?.length) return;
          const mp={};
          uoRows.forEach(r=>{if(!mp[r.username])mp[r.username]=[];mp[r.username].push(r.outlet_id);});
          setUsersState(prev=>{
            const n={...prev};
            Object.entries(mp).forEach(([u,ids])=>{if(n[u])n[u]={...n[u],outletIds:ids,outletId:ids[0]};});
            return n;
          });
        }).catch(()=>{});
        setLoading(false);
      } catch(e) {
        console.error('Load error:', e);
        setDbError("Tidak bisa terhubung ke database. Cek koneksi internet.");
        setLoading(false);
      }
    };
    load();
  },[]);

  // -- Realtime listener -- stok & produk update otomatis di semua device -----
  useEffect(()=>{
    // Channel stocks: update stok otomatis di semua kasir
    const stockChannel = supabase
      .channel('realtime-stocks')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'stocks' },
        (payload) => {
          const row = payload.new || payload.old;
          if (!row) return;
          if (payload.eventType === 'DELETE') {
            setStocksState(prev => {
              const s = {...prev};
              if (s[row.outlet_id]) {
                s[row.outlet_id] = {...s[row.outlet_id]};
                delete s[row.outlet_id][row.product_id];
              }
              return s;
            });
          } else {
            setStocksState(prev => ({
              ...prev,
              [row.outlet_id]: {
                ...(prev[row.outlet_id]||{}),
                [row.product_id]: row.qty
              }
            }));
          }
        }
      )
      .subscribe();

    // Channel products: produk baru / edit / hapus otomatis
    const productChannel = supabase
      .channel('realtime-products')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProductsState(prev => {
              if (prev.find(p => p.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setProductsState(prev =>
              prev.map(p => p.id === payload.new.id ? {...p, ...payload.new} : p)
            );
          } else if (payload.eventType === 'DELETE') {
            setProductsState(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Channel outlets: perubahan outlet otomatis sync
    const outletChannel = supabase
      .channel('realtime-outlets')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'outlets' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOutletsState(prev => {
              if (prev.find(o => o.id === payload.new.id)) return prev;
              return [...prev, payload.new];
            });
          } else if (payload.eventType === 'UPDATE') {
            setOutletsState(prev =>
              prev.map(o => o.id === payload.new.id ? {...o, ...payload.new} : o)
            );
          } else if (payload.eventType === 'DELETE') {
            setOutletsState(prev => prev.filter(o => o.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Channel users: perubahan user/kasir otomatis sync
    const userChannel = supabase
      .channel('realtime-users')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        async () => {
          const usrs = await db.getUsers().catch(()=>null);
          if(usrs){
            const parsed=parseUserOutletIds(usrs);
            setUsersState(parsed);
            supabase.from('user_outlets').select('*').then(({data:uoRows})=>{
              if(!uoRows?.length) return;
              const mp={};
              uoRows.forEach(r=>{if(!mp[r.username])mp[r.username]=[];mp[r.username].push(r.outlet_id);});
              setUsersState(prev=>{const n={...prev};Object.entries(mp).forEach(([u,ids])=>{if(n[u])n[u]={...n[u],outletIds:ids,outletId:ids[0]};});return n;});
            }).catch(()=>{});
          }
        }
      )
      .subscribe();

    // Channel transactions: transaksi baru otomatis masuk ke semua device
    const trxChannel = supabase
      .channel('realtime-transactions')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          if (!payload.new) return;
          const t = {...payload.new, items: payload.new.items||[]};
          setTx(prev => {
            if (prev.find(x => x.id === t.id)) return prev;
            return [t, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'transactions' },
        (payload) => {
          if (!payload.new) return;
          setTx(prev =>
            prev.map(t => t.id === payload.new.id ? {...t, ...payload.new, items: payload.new.items||[]} : t)
          );
        }
      )
      .subscribe();

    // Channel aktif_produk: perubahan produk aktif otomatis sync ke kasir
    const aktifChannel = supabase
      .channel('realtime-aktif-produk')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'aktif_produk' },
        async () => {
          // Reload semua aktif produk dan update root state
          const aktifMap = await dbAktifProduk.getAllAktif().catch(()=>({}));
          if(aktifMap && Object.keys(aktifMap).length > 0) setAktifProdsRoot(aktifMap);
        }
      )
      .subscribe();

    // Cleanup saat komponen unmount
    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(productChannel);
      supabase.removeChannel(outletChannel);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(trxChannel);
      supabase.removeChannel(aktifChannel);
    };
  },[]);

  // -- Realtime active_shifts -- laporan admin update otomatis ----------------
  useEffect(()=>{
    const ch = supabase.channel('realtime-shifts')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'active_shifts'},()=>{ reloadData(); })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'active_shifts'},()=>{ reloadData(); })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'shift_logs'},()=>{ reloadData(); })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'bank_transactions'},(p)=>{
        const r=p.new; if(!r) return;
        const t={id:r.id,waktu:r.waktu,tgl:r.tgl,shiftId:r.shift_id,nama:r.nama,
          jenis:r.jenis,feeType:r.fee_type,fee:r.fee||0,nominal:r.nominal,
          netNominal:r.net_nominal,outletId:r.outlet_id};
        setAllBankTrx(prev=>prev.find(x=>x.id===t.id)?prev:[t,...prev]);
      })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'bank_transactions'},(p)=>{
        setAllBankTrx(prev=>prev.filter(x=>x.id!==p.old?.id));
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  // -- Realtime portal: misi, todos, absensi, izin, settings, foto ----------
  useEffect(()=>{
    const ch = supabase.channel('realtime-portal')
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_misi'},async()=>{
        try{ const {data}=await supabase.from('portal_misi').select('*').order('created_at'); if(data) setPortalMisi(data); }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_todos'},async()=>{
        try{ const {data}=await supabase.from('portal_todos').select('*').order('urutan'); if(data) setPortalTodos(data); }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_todo_status'},async()=>{
        try{
          const {data}=await supabase.from('portal_todo_status').select('*');
          if(data){
            const m={};
            data.forEach(r=>{
              if(!m[r.username]) m[r.username]={};
              if(!m[r.username][r.todo_id]) m[r.username][r.todo_id]={};
              m[r.username][r.todo_id][r.tgl]={done:r.done, status:r.status||'menunggu', confirmed_at:r.confirmed_at};
            });
            setPortalTodoStatus(m);
          }
        }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_misi_progress'},async()=>{
        try{
          const {data}=await supabase.from('portal_misi_progress').select('*');
          if(data){
            const m={};
            data.forEach(r=>{
              if(!m[r.misi_id]) m[r.misi_id]={};
              if(!m[r.misi_id][r.username]) m[r.misi_id][r.username]={};
              m[r.misi_id][r.username][r.periode_key]={progress:r.progress,selesai:r.selesai};
            });
            setPortalMisiProgress(m);
          }
        }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_misi_foto'},async()=>{
        try{ const {data}=await supabase.from('portal_misi_foto').select('*').order('created_at',{ascending:false}); if(data) setPortalMisiFoto(data); }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_absensi'},async()=>{
        try{
          const {data}=await supabase.from('portal_absensi').select('*').order('tgl',{ascending:false});
          if(data){ const m={}; data.forEach(r=>{ if(!m[r.user_id]) m[r.user_id]=[]; m[r.user_id].push(r); }); setPortalAbsensi(m); }
        }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_izin'},async()=>{
        try{
          const {data}=await supabase.from('portal_izin').select('*').order('created_at',{ascending:false});
          if(data){ const m={}; data.forEach(r=>{ if(!m[r.user_id]) m[r.user_id]=[]; m[r.user_id].push(r); }); setPortalIzin(m); }
        }catch{}
      })
      .on('postgres_changes',{event:'*',schema:'public',table:'portal_settings'},async(p)=>{
        const row=p.new;
        if(row?.key==="poin_rate"&&row?.value) setPortalPoinRate(+row.value);
        if(row?.key==="note"&&row?.value) setPortalNote(row.value);
        if(row?.key==="shift"&&row?.value) { try{ setPortalShift(JSON.parse(row.value)); }catch{} }
        if(row?.key==="struk_config"&&row?.value) { try{ setStrukConfig(prev=>({...prev,...JSON.parse(row.value)})); }catch{} }
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);


  const setProducts = useCallback((fn) => {
    setProductsState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      return next;
    });
  },[]);

  const setOutlets = useCallback((fn) => {
    setOutletsState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      // Sync outlet baru/update ke Supabase
      next.forEach(o => {
        const old = prev.find(x => x.id === o.id);
        if (!old || JSON.stringify(old) !== JSON.stringify(o)) {
          db.addOutlet ? null : null; // handled in OutletPage directly
        }
      });
      return next;
    });
  },[]);

  const setUsers = useCallback((fn) => {
    setUsersState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      // Sync semua perubahan user ke Supabase
      Object.entries(next).forEach(([username, u]) => {
        const old = prev[username];
        // User baru atau ada perubahan
        if (!old || old.pass !== u.pass || old.nama !== u.nama ||
            old.role !== u.role || old.outletId !== u.outletId) {
          db.upsertUser(username, u).catch(console.error);
        }
      });
      // User yang dihapus
      Object.keys(prev).forEach(username => {
        if (!next[username]) {
          db.deleteUser(username).catch(console.error);
        }
      });
      return next;
    });
  },[]);

  const setStocks = useCallback(async (fn) => {
    setStocksState(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      // Sync perubahan stok ke Supabase
      Object.entries(next).forEach(([outletId, outletStocks]) => {
        const prevOutlet = prev[outletId] || {};
        Object.entries(outletStocks).forEach(([pid, qty]) => {
          if (prevOutlet[pid] !== qty) {
            db.upsertStock(outletId, +pid, qty).catch(console.error);
          }
        });
      });
      return next;
    });
  },[]);

  // setTx: tambah transaksi ke state + Supabase
  const setTxWithSync = useCallback((fn) => {
    setTx(prev => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      // Cari transaksi baru (ada di next tapi tidak di prev)
      const prevIds = new Set(prev.map(t=>t.id));
      const newTrx  = next.filter(t=>!prevIds.has(t.id));
      newTrx.forEach(t => db.addTransaction(t).catch(console.error));
      // Cari transaksi yang itemsnya berubah (refund)
      next.forEach(t => {
        const old = prev.find(x=>x.id===t.id);
        if (old && JSON.stringify(old.items) !== JSON.stringify(t.items)) {
          db.updateTransactionItems(t.id, t.items).catch(console.error);
        }
      });
      return next;
    });
  },[]);

  const calcOmset = list=>list.reduce((s,t)=>{const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);

  // Ambil data bank hari ini dari Supabase untuk cashflow
  const [bankStatsHari, setBankStatsHari] = useState({masuk:0,keluar:0,fee:0});
  useEffect(()=>{
    const loadBankStats = async () => {
      try {
        const allTrx = await dbBank.getTransactions();
        const todayTrx = allTrx.filter(t=>t.tgl===today());
        const masuk  = todayTrx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
        const keluar = todayTrx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
        const fee    = todayTrx.filter(t=>t.feeType==="fee").reduce((s,t)=>s+t.fee,0);
        setBankStatsHari({masuk,keluar,fee});
      } catch{}
    };
    loadBankStats();
    const iv = setInterval(loadBankStats, 60000);
    return ()=>clearInterval(iv);
  },[]);

  const stats = {
    omsetHari:      calcOmset(transactions.filter(t=>t.date===today())),
    txHari:         transactions.filter(t=>t.date===today()).length,
    stokMenipis:    products.filter(p=>outlets.some(o=>(stocks[o.id]?.[p.id]??0)<=2)).length,
    totalProduk:    products.length,
    bankMasukHari:  bankStatsHari.masuk,
    bankKeluarHari: bankStatsHari.keluar,
    feeHari:        bankStatsHari.fee,
  };

  const isAdmin   = user?.role==="admin";
  const isMonitor = user?.role==="monitor";
  const isCashflowOnly = user?.role==="cashflow";

  // -- Aturan orientasi per halaman (hanya berlaku di device sentuh: HP/tablet) --
  // Kasir / Bank / Kasir+Bank Gabungan → WAJIB landscape
  // Portal Saya, Cashflow (akun cashflow-only) → WAJIB portrait
  // Halaman lain (login, pilih, menu admin, dll) → bebas, ikuti posisi device
  const needsLandscape = isTouchDevice && (page==="kasir"||page==="bank"||page==="gabungan");
  const needsPortrait  = isTouchDevice && (page==="portal" || (page==="cashflow" && isCashflowOnly));
  const showLandscapeWarn = needsLandscape && isPortraitNow;
  const showPortraitWarn  = needsPortrait  && !isPortraitNow;

  // GPS monitoring hook untuk kasir/bank
  const kasirGpsHook = useGpsMonitor({
    user,
    outlets,
    enabled: !!(user && (user.role==="kasir"||user.role==="bank"||user.role==="staff"||(user.role==="karyawan"&&(user.outletId||(user.outletIds?.length)))) && (page==="kasir"||page==="bank"||page==="gabungan")),
    onViolation: handleGpsViolation,
  });

  // -- Loading screen --------------------------------------------------------
  if (loading) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');*{box-sizing:border-box;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{fontSize:52,marginBottom:16}}>🏪</div>
      <div style={{fontWeight:900,fontSize:22,color:"#fff",marginBottom:8}}>Ammar Cell</div>
      <div style={{width:36,height:36,border:"4px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",marginTop:12}}/>
      <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:600,marginTop:14}}>Memuat data...</div>
    </div>
  );

  // -- DB Error screen -------------------------------------------------------
  if (dbError) return (
    <div style={{minHeight:"100vh",background:"#f0faf8",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif",padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');*{box-sizing:border-box;}`}</style>
      <div style={{fontSize:48,marginBottom:12}}>⚠️</div>
      <div style={{fontWeight:900,fontSize:18,color:"#ff4757",marginBottom:8}}>Koneksi Database Gagal</div>
      <div style={{color:"#666",fontSize:13,textAlign:"center",maxWidth:380,lineHeight:1.6,marginBottom:16}}>{dbError}</div>
      <div style={{background:"#f8f8f8",borderRadius:10,padding:"12px 16px",fontSize:12,color:"#555",maxWidth:380}}>
        <b>Cek:</b><br/>
        1. File <code>src/supabase.js</code> sudah diisi URL & KEY yang benar<br/>
        2. SQL setup sudah dijalankan di Supabase<br/>
        3. Koneksi internet aktif
      </div>
      <button onClick={()=>window.location.reload()} style={{marginTop:16,background:"#0d9488",border:"none",borderRadius:10,padding:"10px 24px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>🔄 Coba Lagi</button>
    </div>
  );

  // -- Login ----------------------------------------------------------------
  if (!user) return (
    <>
      <style>{css+`@keyframes fadeUp{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <LoginPage users={users} onLogin={u=>{
        setUser(u);
        if(u.role==="monitor") { setPage("monitor"); return; }
        if(u.role==="cashflow") { setPage("cashflow"); return; }
        if(u.role==="admin")   { setPage("menu");    return; }
        if(u.role==="kasir"||u.role==="bank"||u.role==="staff") { setPage("pilih"); return; }
        if(u.role==="karyawan") {
          if(u.outletId||(u.outletIds&&u.outletIds.length>0)) setPage("pilih");
          else setPage("portal");
          return;
        }
        setPage("menu");
      }} onChangePass={async(username,newPass)=>{
        const u=users[username];
        if(!u) throw new Error("User tidak ditemukan");
        const updated={...u,pass:newPass};
        setUsers(prev=>({...prev,[username]:updated}));
        try{ await db.upsertUser(username,updated); }catch(e){ console.warn('changePass:',e); }
      }}/>
    </>
  );

  return (
    <div style={{fontFamily:"'Nunito',sans-serif"}}>
      <style>{css}</style>
      <Toast toast={toast}/>
      <ConnStatusBar status={connStatus} lastPing={lastPing} offlineQueue={offlineQueue}/>

      {/* Orientation warning — Kasir/Bank/Gabungan wajib landscape, Portal/Cashflow wajib portrait */}
      {showLandscapeWarn&&(
        <div className="portrait-warn" style={{display:"flex"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔄</div>
          <div style={{fontWeight:900,fontSize:20,marginBottom:8}}>Putar {deviceLabel} Kamu</div>
          <div style={{fontSize:14,opacity:.85,lineHeight:1.6}}>
            Halaman ini lebih nyaman digunakan dalam mode <b>Landscape</b> (horizontal)
          </div>
          <div style={{marginTop:20,background:"rgba(255,255,255,.15)",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:700}}>
            Putar {deviceLabel} 90° untuk melanjutkan
          </div>
        </div>
      )}
      {showPortraitWarn&&(
        <div className="portrait-warn" style={{display:"flex"}}>
          <div style={{fontSize:48,marginBottom:16}}>🔄</div>
          <div style={{fontWeight:900,fontSize:20,marginBottom:8}}>Putar {deviceLabel} Kamu</div>
          <div style={{fontSize:14,opacity:.85,lineHeight:1.6}}>
            Halaman ini lebih nyaman digunakan dalam mode <b>Portrait</b> (vertikal)
          </div>
          <div style={{marginTop:20,background:"rgba(255,255,255,.15)",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:700}}>
            Putar {deviceLabel} 90° untuk melanjutkan
          </div>
        </div>
      )}

      {page==="menu"      && <MenuUtama    user={user} onNavigate={setPage} onLogout={()=>{setUser(null);setPage("menu");}} stats={stats}/>}
      {page==="pilih"     && (user?.role==="kasir"||user?.role==="bank"||user?.role==="staff"||user?.role==="karyawan") && <PilihAksesPage user={user} outlets={outlets} onPilih={handlePilih} onLogout={()=>{setUser(null);setPage("menu");setPilihScene(null);}}/>}
      {page==="portal"    && user && (user.role==="karyawan"||user.role==="kasir"||user.role==="bank"||user.role==="staff") && <PortalKaryawan user={user} outlets={outlets} transactions={transactions} misi={portalMisi} note={portalNote} shift={portalShift} absensiMap={portalAbsensi} izinMap={portalIzin} setAbsensiMap={setPortalAbsensi} setIzinMap={setPortalIzin} onLogout={()=>{setUser(null);setPage("menu");}} onKembali={()=>setPage("pilih")} notify={notify} todos={portalTodos} todoStatus={portalTodoStatus} poinRate={portalPoinRate} misiProgress={portalMisiProgress} misiFoto={portalMisiFoto} setMisiFoto={setPortalMisiFoto} users={users}/>}
      {page==="strategi" && isAdmin && <StrategiBulananPage transactions={transactions} outlets={outlets} products={products} misi={portalMisi} setMisi={setPortalMisi} notify={notify} onBack={()=>setPage("menu")}/>}
      {page==="portal-admin" && isAdmin && <AdminPortalPage outlets={outlets} users={users} misi={portalMisi} setMisi={setPortalMisi} note={portalNote} setNote={setPortalNote} shift={portalShift} setShift={setPortalShift} absensiMap={portalAbsensi} setAbsensiMap={setPortalAbsensi} izinMap={portalIzin} setIzinMap={setPortalIzin} onBack={()=>setPage("menu")} notify={notify} todos={portalTodos} setTodos={setPortalTodos} todoStatus={portalTodoStatus} poinRate={portalPoinRate} setPoinRate={setPortalPoinRate} misiProgress={portalMisiProgress} misiFoto={portalMisiFoto} products={products} strukConfig={strukConfig} setStrukConfig={setStrukConfig} currentUser={user}/>}
      {page==="kasir"     && (<>
        {kasirGpsHook.warnCD!=null&&<GpsWarningOverlay warnCD={kasirGpsHook.warnCD} gpsStatus={kasirGpsHook.gpsStatus} gpsJarak={kasirGpsHook.gpsJarak} gpsAcc={kasirGpsHook.gpsAcc} onVerify={kasirGpsHook.dismissWarning} onLock={handleGpsViolation} pilihScene="kasir"/>}
        <KasirApp user={user} products={products} stocks={stocks} setStocks={setStocks} transactions={transactions} setTx={setTx} outlets={outlets} saldoApps={saldoApps} onBack={()=>{setPage("pilih");setPilihScene(null);}} notify={notify} prodOrder={prodOrder} aktifProds={aktifProdsRoot} connStatus={connStatus} offlineQueue={offlineQueue} setOfflineQueue={setOfflineQueue} gpsStatus={kasirGpsHook.gpsStatus} gpsJarak={kasirGpsHook.gpsJarak} gpsNextCek={kasirGpsHook.nextCek} onGpsCek={kasirGpsHook.cekSekarang} portalMisi={portalMisi} portalMisiProgress={portalMisiProgress} strukConfig={strukConfig}/>
      </>)}
      {page==="bank"      && (<>
        {kasirGpsHook.warnCD!=null&&<GpsWarningOverlay warnCD={kasirGpsHook.warnCD} gpsStatus={kasirGpsHook.gpsStatus} gpsJarak={kasirGpsHook.gpsJarak} gpsAcc={kasirGpsHook.gpsAcc} onVerify={kasirGpsHook.dismissWarning} onLock={handleGpsViolation} pilihScene="bank"/>}
        <BankPage user={user} outlets={outlets} saldoApps={saldoBank} onBack={()=>{setPage("pilih");setPilihScene(null);}} notify={notify} portalMisi={portalMisi} portalMisiProgress={portalMisiProgress} products={products}/>
      </>)}
      {page==="gabungan"  && (<>
        {kasirGpsHook.warnCD!=null&&<GpsWarningOverlay warnCD={kasirGpsHook.warnCD} gpsStatus={kasirGpsHook.gpsStatus} gpsJarak={kasirGpsHook.gpsJarak} gpsAcc={kasirGpsHook.gpsAcc} onVerify={kasirGpsHook.dismissWarning} onLock={handleGpsViolation} pilihScene="gabungan"/>}
        <div style={{position:"sticky",top:0,zIndex:60,background:"#fff",borderBottom:"2px solid #e0f5f1",padding:"8px 18px"}}>
          <button onClick={()=>{setPage("pilih");setPilihScene(null);}} style={{background:"#f0faf8",border:"2px solid #e0f5f1",borderRadius:20,padding:"6px 16px",color:"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Kembali</button>
        </div>
        <GabunganPage user={user} products={products} stocks={stocks} setStocks={setStocks} transactions={transactions} setTx={setTx} outlets={outlets} saldoApps={saldoApps} saldoBank={saldoBank} notify={notify} prodOrder={prodOrder} aktifProds={aktifProdsRoot} connStatus={connStatus} offlineQueue={offlineQueue} setOfflineQueue={setOfflineQueue} gpsStatus={kasirGpsHook.gpsStatus} gpsJarak={kasirGpsHook.gpsJarak} gpsNextCek={kasirGpsHook.nextCek} onGpsCek={kasirGpsHook.cekSekarang} portalMisi={portalMisi} portalMisiProgress={portalMisiProgress} strukConfig={strukConfig}/>
      </>)}
      {page==="monitor"   && (isAdmin||isMonitor) && <MonitorPage user={user} outlets={outlets} transactions={transactions} stocks={stocks} products={products} prodOrder={prodOrder} onBack={isMonitor?null:()=>setPage("menu")} notify={notify}/>}
      {page==="cashflow"  && (isAdmin||isCashflowOnly) && <CashflowPage  transactions={transactions} outlets={outlets} onBack={isCashflowOnly?null:()=>setPage("menu")} notify={notify} initialTab={isCashflowOnly?"jurnal":"kalkulator"} isCashflowOnly={isCashflowOnly}/>}
      {page==="produk"    && isAdmin && <ProdukPage    products={products} setProducts={setProducts} stocks={stocks} setStocks={setStocks} outlets={outlets} onBack={()=>{reloadData();setPage("menu");}} notify={notify} prodOrderRoot={prodOrder} setProdOrderRoot={setProdOrderRoot} aktifProdsRoot={aktifProdsRoot} setAktifProdsRoot={setAktifProdsRoot}/>}
      {page==="stok"      && isAdmin && <ProdukPage    products={products} setProducts={setProducts} stocks={stocks} setStocks={setStocks} outlets={outlets} onBack={()=>setPage("menu")} notify={notify} prodOrderRoot={prodOrder} setProdOrderRoot={setProdOrderRoot} aktifProdsRoot={aktifProdsRoot} setAktifProdsRoot={setAktifProdsRoot}/>}
      {page==="outlet"    && isAdmin && <OutletPage    outlets={outlets} setOutlets={setOutlets} users={users} setUsers={setUsers} stocks={stocks} setStocks={setStocks} products={products} onBack={()=>{reloadData();setPage("menu");}} notify={notify}/>}
      {page==="saldo"     && isAdmin && <SaldoAppsPage saldoApps={saldoApps} setSaldoApps={setSaldoApps} saldoBank={saldoBank} setSaldoBank={setSaldoBank} onBack={()=>setPage("menu")} notify={notify}/>}


      {page==="dashboard"     && isAdmin && <DashboardPage transactions={transactions} products={products} outlets={outlets} stocks={stocks} onBack={()=>setPage("menu")}/>}
      {page==="dashboardbank"  && isAdmin && <BankDashboardPage bankTrx={allBankTrx} outlets={outlets} onBack={()=>setPage("menu")}/>}
      {page==="overall"   && isAdmin && <DashboardOverallPage transactions={transactions} outlets={outlets} stocks={stocks} bankTrx={allBankTrx} onBack={()=>setPage("menu")}/>}
      {page==="laporan"   && isAdmin && <LaporanPage   transactions={transactions} outlets={outlets} onBack={()=>setPage("menu")}/>}

      {page!=="cashflow"&&isCashflowOnly&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🔒</div>
            <div style={{fontWeight:900,fontSize:18,color:"#27ae60"}}>Akses Terbatas</div>
            <div style={{color:"#888",fontSize:13,marginTop:6}}>Akun ini hanya bisa mengakses Jurnal Cashflow</div>
            <button onClick={()=>setPage("cashflow")} style={{background:"#27ae60",border:"none",borderRadius:10,padding:"10px 24px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginTop:16}}>Kembali ke Jurnal</button>
          </div>
        </div>
      )}
      {["produk","outlet","stok","dashboard","overall","laporan","saldo","saldobank","cashflow","kasir","bank"].includes(page)&&isMonitor&&(
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:48,marginBottom:12}}>🔒</div>
            <div style={{fontWeight:900,fontSize:18,color:"#0d9488"}}>Akses Terbatas</div>
            <div style={{color:"#888",fontSize:13,marginTop:6}}>Akun monitor hanya bisa mengakses halaman Monitor</div>
            <button onClick={()=>setPage("monitor")} style={{background:"#0d9488",border:"none",borderRadius:10,padding:"10px 24px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",marginTop:16}}>Kembali ke Monitor</button>
          </div>
        </div>
      )}
      {["produk","outlet","stok","dashboard","overall","laporan","saldo","saldobank","cashflow","monitor"].includes(page)&&!isAdmin&&!isMonitor&&!isCashflowOnly&&(
        <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f0faf8",flexDirection:"column",gap:12,fontFamily:"'Nunito',sans-serif"}}>
          <div style={{fontSize:48}}>🔒</div>
          <div style={{fontWeight:900,fontSize:18,color:"#ff4757"}}>Akses Ditolak</div>
          <div style={{color:"#888",fontSize:13}}>Halaman ini hanya untuk Admin</div>
          <button onClick={()=>setPage("menu")} style={{background:"#0d9488",border:"none",borderRadius:10,padding:"10px 24px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Kembali ke Menu</button>
        </div>
      )}
    </div>
  );
}
