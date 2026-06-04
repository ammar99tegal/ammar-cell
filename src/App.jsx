// Ammar Cell App — build 20260602-1043
import { useState, useEffect, useCallback, useRef } from "react";
import { db, dbSaldo, dbSaldoBank, dbShift, dbBank, dbProductOrder, dbStokOrder, dbCashflow, dbAktifProduk, supabase } from "./supabase.js";

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════
const DEFAULT_SALDO_APPS = ["Digipos","Sidiva","Rita","OK","Dana","OVO","GoPay","ShopeePay","LinkAja","M-Kios"];

// ── Responsive helpers ────────────────────────────────────────────────────────
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
const fmtS  = n => n>=1000000?`${(n/1000000).toFixed(1)}jt`:n>=1000?`${(n/1000).toFixed(0)}rb`:String(Math.round(n));
const now   = () => new Date().toLocaleString("id-ID");
const uid   = () => Math.random().toString(36).substr(2,8).toUpperCase();
const today = () => new Date().toLocaleDateString("id-ID");

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
  *{box-sizing:border-box;}
  ::-webkit-scrollbar{width:4px;height:4px;}
  ::-webkit-scrollbar-thumb{background:#a7e5d8;border-radius:10px;}
  @keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
  @keyframes fadeUp{from{transform:translateY(16px);opacity:0}to{transform:none;opacity:1}}
  button,input,textarea,select{font-family:'Nunito',sans-serif;}

  /* ── Responsive base ── */
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
  /* HP portrait — sarankan landscape */
  @media (max-width: 767px) and (orientation: portrait) {
    html { font-size: 13px; }
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

  /* Portrait warning overlay */
  .portrait-warn {
    display: none;
  }
  @media (max-width: 767px) and (orientation: portrait) {
    .portrait-warn {
      display: flex;
      position: fixed; inset: 0; z-index: 9998;
      background: linear-gradient(135deg,#0a7a70,#0d9488);
      flex-direction: column; align-items: center; justify-content: center;
      color: white; text-align: center; padding: 24px;
    }
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

function SubHeader({ title, onBack, right, badge }) {
  return (
    <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",alignItems:"center",padding:"0 16px",boxShadow:"0 2px 14px rgba(13,148,136,.3)",position:"sticky",top:0,zIndex:100,fontFamily:"'Nunito',sans-serif"}}>
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

// ══════════════════════════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════════════════════════
function LoginPage({ users, onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    if (!username||!password) return setError("Isi username dan password!");
    setLoading(true);
    setTimeout(()=>{
      const user = users[username.toLowerCase()];
      if (!user||user.pass!==password) { setError("Username atau password salah!"); setLoading(false); }
      else { setError(""); onLogin({username:username.toLowerCase(),...user}); }
    },600);
  };

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"#fff",borderRadius:24,padding:"36px 32px",width:360,boxShadow:"0 24px 80px rgba(0,0,0,.25)",animation:"fadeUp .4s ease"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:44,marginBottom:8}}>🏪</div>
          <div style={{fontWeight:900,fontSize:22,color:"#0d9488"}}>Ammar Cell</div>
          <div style={{fontSize:12,color:"#aaa",fontWeight:600,marginTop:2}}>Sistem Kasir Terpadu</div>
        </div>
        <div style={{marginBottom:12}}>
          <label style={{...lbl}}>Username</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.User(18)}</span>
            <input type="text" value={username} onChange={e=>{setUsername(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Username..."
              style={{...inp,paddingLeft:38,border:`2px solid ${error?"#ff4757":"#b2ede6"}`}}/>
          </div>
        </div>
        <div style={{marginBottom:6}}>
          <label style={{...lbl}}>Password</label>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",color:"#0d9488"}}>{Ic.Lock(18)}</span>
            <input type={showPass?"text":"password"} value={password} onChange={e=>{setPassword(e.target.value);setError("");}} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="Password..."
              style={{...inp,paddingLeft:38,paddingRight:38,border:`2px solid ${error?"#ff4757":"#b2ede6"}`}}/>
            <button onClick={()=>setShowPass(p=>!p)} style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"#aaa",cursor:"pointer"}}>{showPass?Ic.EyeOff():Ic.Eye()}</button>
          </div>
        </div>
        {error&&<div style={{fontSize:12,color:"#ff4757",fontWeight:700,marginBottom:8,padding:"6px 10px",background:"#fff0f0",borderRadius:8}}>⚠ {error}</div>}
        <button onClick={handleLogin} style={{width:"100%",background:loading?"#ccc":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:800,fontSize:15,cursor:loading?"not-allowed":"pointer",marginTop:8,boxShadow:loading?"none":"0 4px 16px rgba(13,148,136,.4)"}}>
          {loading?"⏳ Masuk...":"Masuk →"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MENU UTAMA
// ══════════════════════════════════════════════════════════════════════════════
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

// ══════════════════════════════════════════════════════════════════════════════
// OUTLET MANAGEMENT
// ══════════════════════════════════════════════════════════════════════════════
function OutletPage({ outlets, setOutlets, users, setUsers, stocks, setStocks, products, onBack, notify }) {
  const [tab,           setTab]           = useState("outlets"); // outlets | users
  const [showOutletForm,setShowOutletForm]= useState(false);
  const [showUserForm,  setShowUserForm]  = useState(false);
  const [editOutlet,    setEditOutlet]    = useState(null);
  const [editUser,      setEditUser]      = useState(null);
  const [confirmDel,    setConfirmDel]    = useState(null);
  const [oForm, setOForm] = useState({nama:"",alamat:""});
  const [uForm, setUForm] = useState({username:"",pass:"",nama:"",outletId:"",outletIds:[],role:"karyawan"});

  const openAddOutlet = ()=>{ setEditOutlet(null); setOForm({nama:"",alamat:""}); setShowOutletForm(true); };
  const openEditOutlet= o=>{ setEditOutlet(o); setOForm({nama:o.nama,alamat:o.alamat}); setShowOutletForm(true); };
  const saveOutlet = async ()=>{
    if (!oForm.nama.trim()) return notify("Isi nama outlet!","err");
    if (editOutlet) {
      try {
        await db.updateOutlet(editOutlet.id, oForm);
        setOutlets(prev=>prev.map(o=>o.id===editOutlet.id?{...o,...oForm}:o));
        notify("Outlet diperbarui","ok");
      } catch(e) { notify("Gagal simpan outlet!","err"); return; }
    } else {
      const id="o"+uid();
      const newOutlet = {id,nama:oForm.nama.trim(),alamat:oForm.alamat.trim(),aktif:true};
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
  const openEditUser = (u,k)=>{ setEditUser(k); setUForm({username:k,pass:u.pass,nama:u.nama,outletId:u.outletId||"",outletIds:u.outletIds||[],role:u.role}); setShowUserForm(true); };
  const saveUser = async ()=>{
    if (!uForm.username.trim()||!uForm.nama.trim()) return notify("Isi username & nama!","err");
    if (!editUser && !uForm.pass) return notify("Isi password!","err");
    if (!editUser && users[uForm.username.toLowerCase()]) return notify("Username sudah ada!","err");
    const outletIds = uForm.outletIds||[];
    const userData = {
      pass:     uForm.pass || (editUser?users[editUser]?.pass:""),
      nama:     uForm.nama.trim(),
      role:     uForm.role,
      outletId: outletIds[0]||null,  // primary outlet = first selected
      outletIds,
    };
    try {
      if(editUser && editUser!==uForm.username.toLowerCase()) {
        await db.deleteUser(editUser);
      }
      await db.upsertUser(uForm.username.toLowerCase(), userData);
      setUsers(prev=>{
        const n={...prev};
        if(editUser&&editUser!==uForm.username.toLowerCase()){delete n[editUser];}
        n[uForm.username.toLowerCase()]=userData;
        return n;
      });
      notify(editUser?"User diperbarui ✓":"User ditambahkan ✓","ok");
      setShowUserForm(false);
    } catch(e) { notify("Gagal simpan user!","err"); }
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
                      <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{o.alamat||"—"}</div>
                    </div>
                    <span style={{background:o.aktif?"#e0faf5":"#f0f0f0",color:o.aktif?"#0d9488":"#aaa",fontWeight:800,fontSize:10,padding:"2px 9px",borderRadius:20}}>{o.aktif?"🟢 Aktif":"⚫ Nonaktif"}</span>
                  </div>
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
                  const outletNama=outlets.find(o=>o.id===u.outletId)?.nama||"—";
                  return (
                    <tr key={key} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                      <td style={{padding:"10px 13px",fontWeight:800,color:"#0d9488",fontFamily:"monospace"}}>{key}</td>
                      <td style={{padding:"10px 13px",fontWeight:700}}>{u.nama}</td>
                      <td style={{padding:"10px 13px"}}><span style={{background:u.role==="admin"?"#f5eeff":u.role==="monitor"?"#fef3c7":"#e0faf5",color:u.role==="admin"?"#8e44ad":u.role==="monitor"?"#d97706":"#0d9488",fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>{u.role==="admin"?"👑 Admin":u.role==="monitor"?"👁 Monitor":"👷 Karyawan"}</span></td>
                      <td style={{padding:"10px 13px"}}>
                        {u.role==="admin"?(
                          <span style={{color:"#aaa",fontSize:11}}>Semua outlet</span>
                        ):(u.outletIds||[]).length>0?(
                          <div style={{display:"flex",flexWrap:"wrap",gap:3}}>
                            {(u.outletIds||[]).map(id=>(
                              <span key={id} style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"1px 7px",borderRadius:20}}>
                                {outlets.find(o=>o.id===id)?.nama?.replace("Ammar Cell ","")||id}
                              </span>
                            ))}
                          </div>
                        ):(
                          <span style={{color:"#ccc",fontSize:11}}>Belum ditugaskan</span>
                        )}
                      </td>
                      <td style={{padding:"10px 13px"}}>
                        <div style={{display:"flex",gap:5}}>
                          <button onClick={()=>openEditUser(u,key)} style={{background:"#e0faf5",border:"none",borderRadius:7,padding:"5px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",gap:3,fontFamily:"inherit"}}>{Ic.Edit()} Edit</button>
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

          {/* Role — tombol visual */}
          <div style={{marginBottom:14}}>
            <label style={{...lbl}}>Role *</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[
                {k:"karyawan",icon:"👷",l:"Karyawan",bg:"#e0faf5",c:"#0d9488"},
                {k:"admin",   icon:"👑",l:"Admin",   bg:"#f5eeff",c:"#8e44ad"},
                {k:"monitor", icon:"👁",l:"Monitor", bg:"#fef3c7",c:"#d97706"},
              ].map(r=>(
                <button key={r.k} onClick={()=>setUForm(p=>({...p,role:r.k}))}
                  style={{padding:"10px 6px",borderRadius:10,border:`2px solid ${uForm.role===r.k?r.c:"#b2ede6"}`,background:uForm.role===r.k?r.bg:"#fff",color:uForm.role===r.k?r.c:"#aaa",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",textAlign:"center",transition:"all .15s"}}>
                  <div style={{fontSize:18,marginBottom:4}}>{r.icon}</div>
                  <div style={{fontWeight:800}}>{r.l}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Outlet checklist — semua role kecuali admin */}
          {uForm.role!=="admin"?(
            <div style={{marginBottom:14}}>
              <label style={{...lbl}}>
                Outlet Tugasan
                <span style={{color:uForm.role==="monitor"?"#d97706":"#0d9488",fontWeight:600,marginLeft:6,fontSize:10}}>
                  {uForm.role==="monitor"?"— outlet yang dipantau":"— bisa pilih beberapa"}
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
            <div style={{background:"#f5eeff",border:"1px solid #8e44ad33",borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:12,color:"#8e44ad",fontWeight:600}}>
              👑 Admin punya akses ke semua outlet otomatis.
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
    </div>
  );
}

// ── Komponen baris edit kategori (useState tidak boleh di dalam .map()) ──────
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

// ── StokPageInner — reuse StokPage body dengan tab dari parent ──────────────
function StokPageInner({ tab, products, outlets, stocks, setStocks, selectedOutlet, notify, prodOrder }) {
  return (
    <StokPage
      products={products} outlets={outlets}
      stocks={stocks} setStocks={setStocks}
      onBack={null} notify={notify}
      _initTab={tab} _initOutlet={selectedOutlet}
      _prodOrder={prodOrder}
    />
  );
}

// ── StokAktifTab — kelola produk aktif per outlet ──────────────────────────────
function StokAktifTab({ products, outlets, selectedOutlet, aktifProds, setAktifProds, notify }) {
  const [saved,  setSaved]  = useState(false);
  const [search, setSearch] = useState("");

  const outletAktif = aktifProds[selectedOutlet] || products.map(p=>String(p.id));
  const isAktif = id => outletAktif.includes(String(id));
  const toggle  = id => {
    setAktifProds(prev=>({
      ...prev,
      [selectedOutlet]: isAktif(id)
        ? outletAktif.filter(x=>x!==String(id))
        : [...outletAktif, String(id)]
    }));
  };
  const filtered = products.filter(p=>p.name?.toLowerCase().includes(search.toLowerCase()));
  const toggleAll = () => {
    const allIds = filtered.map(p=>String(p.id));
    const allOn  = allIds.every(id=>outletAktif.includes(id));
    setAktifProds(prev=>({...prev,[selectedOutlet]: allOn ? outletAktif.filter(id=>!allIds.includes(id)) : [...new Set([...outletAktif,...allIds])]}));
  };

  const aktifCount = outletAktif.length;
  const outlet = outlets?.find(o=>o.id===selectedOutlet);
  const save = async () => {
    setSaved(true);
    // Simpan ke Supabase
    try {
      await dbAktifProduk.saveAktif(selectedOutlet, outletAktif);
      // Sync ke App root
      if(setAktifProds) setAktifProds(prev=>{
        const updated = {...prev, [selectedOutlet]: outletAktif};
        return updated;
      });
      notify("Produk aktif disimpan ✓","ok");
    } catch(e) {
      notify("Gagal simpan: "+e.message,"err");
    }
    setTimeout(()=>setSaved(false),2000);
  };

  return (
    <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:12}}>
        {[
          {l:`Aktif — ${outlet?.nama?.replace("Ammar Cell ","")||""}`,v:`${aktifCount}/${products.length}`,c:"#27ae60",bg:"#e8f8f0"},
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
      <div style={{marginTop:12,display:"flex",justifyContent:"flex-end"}}>
        <button onClick={save} style={{background:saved?"#27ae60":"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:11,padding:"11px 28px",color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit",transition:"background .3s"}}>
          {saved?"✅ Tersimpan!":"💾 Simpan Perubahan"}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUK (Master Produk — tanpa stok, stok ada di per outlet)
// ══════════════════════════════════════════════════════════════════════════════
function ProdukPage({ products, setProducts, stocks, setStocks, outlets, onBack, notify, prodOrderRoot, setProdOrderRoot, aktifProdsRoot, setAktifProdsRoot }) {
  const [mainTab,      setMainTab]     = useState("produk"); // produk|opname|masuk|keluar|transfer|aktif|log
  const [selOutlet,    setSelOutlet]   = useState(outlets?.[0]?.id||"");
  const [aktifProds,   setAktifProds]  = useState(aktifProdsRoot||{});     // {outletId: [productId,...]}
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
  // prodOrder local — init dari prodOrderRoot (App root) agar sudah terisi saat buka
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

  // ── EXPORT MASSAL ──────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows=[["Nama Produk","Barcode","Kategori","Harga Modal","Harga Jual"]];
    products.forEach(p=>rows.push([p.name, p.barcode||"", p.category, p.modal, p.price]));
    const csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob);
    a.download=`produk-ammar-cell.csv`; a.click();
    notify(`Export ${products.length} produk berhasil!`,"ok");
  };

  // ── EDIT MASSAL ────────────────────────────────────────────────────────────
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

  // ── IMPORT MASSAL CSV ──────────────────────────────────────────────────────
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
        {/* Outlet selector — hanya tab stok */}
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

      {/* ── BULK EDIT TABLE ── */}
      {bulkMode&&(
        <div style={{padding:"14px 18px",maxWidth:1000,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontWeight:800,fontSize:14,color:"#0d9488"}}>📝 Edit Massal — {bulkData.length} produk</div>
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

      {/* ── IMPORT MODAL ── */}
      {showImport&&(
        <Modal onClose={()=>setShowImport(false)} title="📥 Import Produk dari CSV">
          <div style={{background:"#f0faf8",borderRadius:9,padding:"10px 13px",marginBottom:12,fontSize:12}}>
            <div style={{fontWeight:700,color:"#0d9488",marginBottom:4}}>Format CSV yang diterima:</div>
            <code style={{fontSize:11,color:"#555",display:"block",lineHeight:1.8}}>
              Nama Produk, Barcode, Kategori, Harga Modal, Harga Jual<br/>
              VC ISAT 6GB, 8991101152, INDOSAT, 9295, 11000<br/>
              Kabel Data, , AKSESORIS, 15000, 25000
            </code>
            <div style={{fontSize:10,color:"#aaa",marginTop:4}}>* Baris pertama (header) boleh ada atau tidak · Barcode boleh kosong</div>
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

      {/* ── NORMAL VIEW (Produk tab) ── */}
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

        {/* ── Action Toolbar ── */}
        <div style={{display:"flex",gap:7,marginBottom:12,flexWrap:"wrap",alignItems:"center",background:"#fff",borderRadius:13,padding:"10px 14px",border:"2px solid #e0f5f1",boxShadow:"0 1px 6px rgba(13,148,136,.06)"}}>
          <button onClick={openAdd}
            style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:"7px 16px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,boxShadow:"0 2px 8px rgba(13,148,136,.3)"}}>
            {Ic.PlusCirc(15)} + Tambah Produk
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
            📥 Import
          </button>
          <button onClick={exportCSV}
            style={{background:"#f8fffe",border:"2px solid #e0f5f1",borderRadius:9,padding:"6px 13px",color:"#555",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4}}>
            📤 Export
          </button>
        </div>

        {/* ── Search + Category Filter ── */}
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

        {/* Stats */}
        <div style={{display:"flex",gap:9,marginBottom:12}}>
          {[{l:"Total Produk",v:products.length,c:"#0d9488"},{l:"Kategori",v:uniqueCats.length,c:"#8e44ad"}].map(s=>(
            <div key={s.l} style={{background:"#fff",borderRadius:11,padding:"10px 14px",border:"2px solid #e0f5f1",minWidth:100,textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:20,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,fontWeight:700,color:s.c,opacity:.8}}>{s.l}</div>
            </div>
          ))}
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
                  <td style={{padding:"9px 12px",color:"#888",fontFamily:"monospace",fontSize:11}}>{p.barcode||"—"}</td>
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

      {/* ── STOK TABS (Opname/Masuk/Keluar/Transfer/Log) ── */}
      {["opname","masuk","keluar","transfer","log"].includes(mainTab)&&(
        <StokPageInner
          tab={mainTab}
          products={products} outlets={outlets}
          stocks={stocks} setStocks={setStocks}
          selectedOutlet={selOutlet} notify={notify}
          prodOrder={prodOrder}
        />
      )}

      {/* ── TAB AKTIF ── */}
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

// ── LogRow: edit & hapus per baris log stok ──────────────────────────────────
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
      <td style={{...cellStyle,color:"#888",fontStyle:"italic"}}>{l.note||"—"}</td>
      <td style={cellStyle}>
        <div style={{display:"flex",gap:5}}>
          <button onClick={()=>setEditing(true)} style={{background:"#e0faf5",border:"none",borderRadius:6,padding:"4px 10px",color:"#0d9488",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:3}}>{Ic.Edit(11)} Edit</button>
          <button onClick={onDelete} style={{background:"#fff0f0",border:"none",borderRadius:6,padding:"4px 9px",color:"#ff4757",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{Ic.Trash(11)}</button>
        </div>
      </td>
    </tr>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STOK (per outlet, stok masuk/keluar/transfer)
// ══════════════════════════════════════════════════════════════════════════════
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

  // ── BULK OPERATIONS ────────────────────────────────────────────────────────
  const startBulk = (type) => {
    setBulkType(type);
    setBulkRows(products.map(p=>({id:p.id, name:p.name, stokSaat:outletStock[p.id]??0, qty:"", note:""})));
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

  // ── BULK TABLE VIEW ────────────────────────────────────────────────────────
  if(bulkMode) return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title={`📦 ${bulkType==="masuk"?"Stok Masuk Massal":bulkType==="keluar"?"Stok Keluar Massal":"Transfer Massal"}`} onBack={()=>setBulkMode(false)}
        right={
          <div style={{display:"flex",gap:7,alignItems:"center"}}>
            {bulkType==="transfer"&&(
              <select value={bulkTransferTo} onChange={e=>setBulkTransferTo(e.target.value)}
                style={{padding:"6px 10px",borderRadius:9,border:"2px solid rgba(255,255,255,.4)",background:"rgba(255,255,255,.15)",color:"#fff",fontWeight:700,fontSize:12,fontFamily:"inherit",outline:"none"}}>
                <option value="" style={{color:"#000"}}>— Outlet Tujuan —</option>
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
          💡 Outlet: <b>{outlet?.nama}</b> · Isi kolom QTY untuk produk yang mau diproses · Kosongkan untuk skip
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

        {/* Pilih outlet — hanya tampil saat standalone */}
        {onBack&&(
        <div style={{display:"flex",gap:8,marginBottom:12,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#555"}}>Outlet:</span>
          {outlets.map(o=>(
            <button key={o.id} onClick={()=>{setSelectedOutlet(o.id);initReal(o.id);}} style={{padding:"6px 14px",borderRadius:20,border:"2px solid",borderColor:selectedOutlet===o.id?"#0d9488":"#b2ede6",background:selectedOutlet===o.id?"#0d9488":"#fff",color:selectedOutlet===o.id?"#fff":"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{o.nama}</button>
          ))}
        </div>
        )}

        {/* Bulk action buttons — hanya di standalone */}
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

        {/* Tabs — hanya di standalone */}
        {onBack&&(
        <div style={{display:"flex",gap:0,marginBottom:14,background:"#fff",borderRadius:12,padding:4,border:"2px solid #e0f5f1",width:"fit-content",flexWrap:"wrap"}}>
          {[{k:"opname",l:"📋 Opname"},{k:"masuk",l:"⬇ Masuk"},{k:"keluar",l:"⬆ Keluar"},{k:"transfer",l:"⇄ Transfer"},{k:"log",l:"📜 Log"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"7px 14px",borderRadius:9,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:tab===t.k?"#0d9488":"transparent",color:tab===t.k?"#fff":"#888",transition:"all .15s"}}>{t.l}</button>
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
        {["masuk","keluar","transfer"].includes(tab)&&(
          <div style={{maxWidth:480}}>
            <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"18px"}}>
              <div style={{fontWeight:800,fontSize:14,color:{masuk:"#27ae60",keluar:"#e74c3c",transfer:"#2980b9"}[tab],marginBottom:14}}>
                {tab==="masuk"?"⬇ Stok Masuk":tab==="keluar"?"⬆ Stok Keluar":"⇄ Transfer Stok"}
              </div>
              <div style={{marginBottom:10}}>
                <label style={{...lbl}}>Produk *</label>
                <select value={form.productId} onChange={e=>setForm(p=>({...p,productId:e.target.value}))} style={{...inp}}>
                  <option value="">— Pilih Produk —</option>
                  {products.map(p=><option key={p.id} value={p.id}>{p.name} (stok: {outletStock[p.id]??0})</option>)}
                </select>
              </div>
              {tab==="transfer"&&(
                <div style={{marginBottom:10}}>
                  <label style={{...lbl}}>Outlet Tujuan *</label>
                  <select value={transferTo} onChange={e=>setTransferTo(e.target.value)} style={{...inp}}>
                    <option value="">— Pilih Outlet —</option>
                    {outlets.filter(o=>o.id!==selectedOutlet).map(o=><option key={o.id} value={o.id}>{o.nama}</option>)}
                  </select>
                </div>
              )}
              <Field label="Jumlah *" value={form.qty} onChange={e=>setForm(p=>({...p,qty:e.target.value}))} type="number" placeholder="0"/>
              <Field label="Catatan" value={form.note} onChange={e=>setForm(p=>({...p,note:e.target.value}))} placeholder="Opsional..."/>
              <button onClick={tab==="masuk"?doMasuk:tab==="keluar"?doKeluar:doTransfer} style={{width:"100%",background:`linear-gradient(135deg,${tab==="masuk"?"#27ae60,#2ecc71":tab==="keluar"?"#e74c3c,#ff6b6b":"#2980b9,#3498db"})`,border:"none",borderRadius:10,padding:12,color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:4}}>
                {tab==="masuk"?"Simpan Stok Masuk":tab==="keluar"?"Simpan Stok Keluar":"Lakukan Transfer"}
              </button>
            </div>
          </div>
        )}

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

// ── helper: parse "dd/mm/yyyy" → Date ────────────────────────────────────────
const parseDate = s => { try { const [d,m,y]=s.split("/"); return new Date(+y,+m-1,+d); } catch { return null; } };
const toInputDate = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
const fromInputDate = s => { const [y,m,d]=s.split("-"); return new Date(+y,+m-1,+d); };

// ══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════════════════
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

  // ── Filter transactions by date range ──────────────────────────────────────
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

  // ── Preset shortcuts ────────────────────────────────────────────────────────
  const applyPreset = preset => {
    const n=new Date();
    if (preset==="today")     { setDateFrom(toInputDate(n)); setDateTo(toInputDate(n)); }
    else if (preset==="7d")   { const d=new Date(n);d.setDate(n.getDate()-6); setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    else if (preset==="30d")  { const d=new Date(n);d.setDate(n.getDate()-29);setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    else if (preset==="month"){ const d=new Date(n.getFullYear(),n.getMonth(),1);setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    else if (preset==="year") { const d=new Date(n.getFullYear(),0,1);setDateFrom(toInputDate(d));setDateTo(toInputDate(n)); }
    setPeriod("custom");
  };

  // ── Chart data ──────────────────────────────────────────────────────────────
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
          {/* ── Interactive Stock-style Chart ── */}
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
                    {/* Value label above dot — always show if few points or on hover */}
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

// ══════════════════════════════════════════════════════════════════════════════
// LAPORAN (per outlet + per shift)
// ══════════════════════════════════════════════════════════════════════════════
// ── Laporan Bank List (realtime) ──────────────────────────────────────────────
function LaporanBankList({ bankTrxMap, bankShiftLogs, shiftLogs, outlets, filterOutlet, onSelectShift }) {
  const [bankTrx, setBankTrx] = useState([]);
  const [loading, setLoading] = useState(true);

  const [lastRefresh, setLastRefresh] = useState(null);

  const loadBankTrx = async () => {
    try {
      const trx = await dbBank.getTransactions();
      setBankTrx(trx||[]);
      setLastRefresh(new Date().toLocaleTimeString("id-ID"));
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  useEffect(()=>{
    loadBankTrx();
    // Auto reload setiap 5 detik
    const iv = setInterval(loadBankTrx, 5000);
    // Realtime komprehensif — bank + shift status
    const ch = supabase.channel("laporan-bank-rt-v2")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"bank_shift_logs"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bank_shift_logs"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"shift_logs"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"active_shifts"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"active_shifts"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"active_shifts"},()=>{ loadBankTrx(); })
      .subscribe();
    return()=>{ clearInterval(iv); supabase.removeChannel(ch); };
  },[]);

  // Normalisasi format tanggal: "30/5/2026" -> "2026-05-30"
  const normTgl = (d) => {
    if(!d) return "";
    if(/^\d{4}-\d{2}-\d{2}/.test(d)) return d.substring(0,10); // sudah ISO
    const p = d.split("/");
    if(p.length===3) return `${p[2]}-${String(p[1]).padStart(2,"0")}-${String(p[0]).padStart(2,"0")}`;
    return d;
  };
  const fmtTgl = (iso) => {
    if(!iso) return "—";
    const [y,m,dd] = iso.split("-");
    return `${dd}/${m}/${y}`;
  };

  // Group by outlet + tanggal (normalisasi dulu)
  const filtered = filterOutlet==="all" ? bankTrx : bankTrx.filter(t=>t.outletId===filterOutlet);

  const groups = {};
  filtered.forEach(t=>{
    const outletNama = outlets.find(o=>o.id===t.outletId)?.nama || t.outletId || "—";
    const tglISO = normTgl(t.tgl || t.waktu?.substring(0,10) || "");
    const key = `${t.outletId}_${tglISO}`;
    if(!groups[key]) groups[key]={key,outletId:t.outletId,outletNama,tgl:tglISO,trx:[],masuk:0,keluar:0};
    groups[key].trx.push(t);
    if(t.netNominal>0) groups[key].masuk+=t.netNominal;
    else groups[key].keluar+=Math.abs(t.netNominal);
  });

  const groupArr = Object.values(groups).sort((a,b)=>b.tgl.localeCompare(a.tgl));

  if(loading) return <div style={{textAlign:"center",padding:32,color:"#aaa",fontSize:13}}>⏳ Memuat data bank...</div>;
  if(groupArr.length===0) return <div style={{textAlign:"center",padding:32,color:"#ccc",fontSize:13}}>Belum ada transaksi bank</div>;

  return (
    <div>
      {/* Info bar refresh */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{display:"flex",alignItems:"center",gap:6,background:"#e0faf5",borderRadius:9,padding:"5px 12px",fontSize:11,color:"#0d9488",fontWeight:700}}>
          🔴 Live — Update realtime
          {lastRefresh&&<span style={{fontWeight:600,opacity:.7}}>· {lastRefresh}</span>}
        </div>
        <button onClick={loadBankTrx} style={{background:"#f0faf8",border:"2px solid #b2ede6",borderRadius:9,padding:"5px 12px",fontSize:11,fontWeight:700,color:"#0d9488",cursor:"pointer",fontFamily:"inherit"}}>
          🔄 Refresh
        </button>
      </div>
      {/* KPI total */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
        {[
          {l:"Total Masuk",  v:filtered.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0),      c:"#27ae60", bg:"#e8f8f0"},
          {l:"Total Keluar", v:filtered.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0), c:"#e74c3c", bg:"#fff0f0"},
          {l:"Transaksi",    v:filtered.length,                                                             c:"#0d9488", bg:"#e0faf5", raw:true},
        ].map(k=>(
          <div key={k.l} style={{background:k.bg,borderRadius:12,padding:"12px 15px"}}>
            <div style={{fontWeight:900,fontSize:18,color:k.c}}>{k.raw?k.v:fmtRp(k.v)}</div>
            <div style={{fontSize:11,color:k.c,fontWeight:700,opacity:.8,marginTop:2}}>{k.l}</div>
          </div>
        ))}
      </div>

      {/* List per outlet per hari */}
      {groupArr.map(g=>{
        const bankLog  = bankShiftLogs[g.key] || bankShiftLogs[g.outletId+"_"+g.tgl];
        // Cari shift kasir yang matching outlet+tanggal untuk status aktif/tutup
        const kasirLog = shiftLogs ? (
          Object.values(shiftLogs).find(s=>
            s.outletId===g.outletId &&
            (s.waktuBuka||"").startsWith(g.tgl)
          ) || Object.values(shiftLogs).find(s=>
            s.outletId===g.outletId &&
            normTgl(s.waktuBuka||"")===g.tgl
          )
        ) : null;
        const isClosed   = kasirLog?.type==="closed" || !!kasirLog?.waktuTutup || !!bankLog?.waktuTutup;
        const uangSistem = g.masuk - g.keluar + (bankLog?.cashKemb||0);
        const uangLaci   = bankLog?.uangLaci ?? null;
        const selisih    = uangLaci!==null ? uangLaci - uangSistem : null;
        const catatan    = bankLog?.catatan || kasirLog?.notes || "";
        const waktuTutup = bankLog?.waktuTutup || kasirLog?.waktuTutup || "";
        const namaShift  = bankLog?.nama || kasirLog?.namaShift || "";
        const borderColor = selisih!==null&&selisih!==0?"#f39c1255":"#e0f5f1";
        return (
          <div key={g.key} onClick={()=>onSelectShift({key:g.key,label:g.outletNama+" "+g.tgl,outletNama:g.outletNama,outletId:g.outletId,items:[],bankKey:g.key})}
            style={{background:"#fff",borderRadius:13,padding:"14px 16px",marginBottom:10,border:`2px solid ${borderColor}`,cursor:"pointer",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#0d9488";e.currentTarget.style.boxShadow="0 2px 12px rgba(13,148,136,.12)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=borderColor;e.currentTarget.style.boxShadow="none";}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}>
                  <div style={{fontWeight:800,fontSize:14,color:"#1a2e2a"}}>{g.outletNama}</div>
                  {/* Status badge */}
                  <span style={{fontSize:10,fontWeight:700,padding:"2px 9px",borderRadius:20,
                    background:isClosed?"#f0f0f0":"#e8f8f4",
                    color:isClosed?"#888":"#2ecc71",border:`1px solid ${isClosed?"#ddd":"#a3e9c8"}`}}>
                    {isClosed?"⚫ Ditutup":"🟢 Aktif"}
                  </span>
                </div>
                <div style={{fontSize:11,color:"#aaa",marginTop:3}}>
                  {fmtTgl(g.tgl)} · {g.trx.length} transaksi bank
                  {namaShift&&<span style={{marginLeft:6,color:"#0d9488",fontWeight:600}}>· {namaShift}</span>}
                  {isClosed&&waktuTutup&&<span style={{marginLeft:6}}> tutup {new Date(waktuTutup).toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"})}</span>}
                </div>
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{fmtRp(uangSistem)}</div>
                <div style={{fontSize:10,color:"#aaa"}}>uang sistem</div>
                {uangLaci!==null&&<div style={{fontSize:11,fontWeight:700,color:"#555",marginTop:2}}>Fisik: {fmtRp(uangLaci)}</div>}
              </div>
            </div>
            {/* Mini rekap + balance + catatan */}
            <div style={{display:"flex",gap:7,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
              <div style={{background:"#e8f8f0",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:"#27ae60"}}>
                ⬇ Masuk {fmtRp(g.masuk)}
              </div>
              <div style={{background:"#fff0f0",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:"#e74c3c"}}>
                ⬆ Keluar {fmtRp(g.keluar)}
              </div>
              {selisih!==null&&(
                <div style={{background:selisih===0?"#e8f8f4":selisih>0?"#fffbe6":"#fff0f0",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:selisih===0?"#27ae60":selisih>0?"#f39c12":"#e74c3c",border:`1px solid ${selisih===0?"#a3e9c8":selisih>0?"#f9d56e":"#ffb3b3"}`}}>
                  {selisih===0?"✅ Balance":selisih>0?"📈 Lebih":"📉 Kurang"}{selisih!==0?" "+fmtRp(Math.abs(selisih)):""}
                </div>
              )}
              {!isClosed&&selisih===null&&(
                <div style={{background:"#e8f8f4",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:"#2ecc71"}}>
                  🟢 Shift Aktif
                </div>
              )}
            </div>
            {catatan&&(
              <div style={{marginTop:8,background:"#fffbe6",borderRadius:8,padding:"6px 11px",fontSize:11,color:"#b7770d",fontWeight:600,border:"1px solid #f9d56e"}}>
                📝 {catatan}
              </div>
            )}
            {(bankLog?.isHidden||bankLog?.saldo_close?.disembunyikan||bankLog?.saldo_close?.digabung)&&(
              <div style={{marginTop:6,background:"#f5f0ff",borderRadius:8,padding:"5px 11px",fontSize:10,color:"#7c3aed",fontWeight:700,border:"1px solid #c4b5fd",display:"flex",alignItems:"center",gap:5}}>
                🙈 <span>Disembunyikan kasir</span>
                {bankLog.hiddenNote&&<span style={{fontWeight:600,opacity:.8}}>· {bankLog.hiddenNote}</span>}
              </div>
            )}
          </div>
        );
      })}
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
    const outletNama=outlets.find(o=>o.id===t.outletId)?.nama||t.outletId||"—";
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
    const outletNama=outlets.find(o=>o.id===oId)?.nama||oId||"—";
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

  // ── Detail shift: ringkasan produk terjual + saldo ──────────────────────
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

      } catch(e){ console.error(e); }
      setShiftLogsLoading(false);
    };
    loadLogs();
    // Reload setiap 5 detik — lebih responsif
    const iv = setInterval(loadLogs, 5000);

    // Realtime komprehensif — semua event yang bisa mengubah laporan shift
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

  // ── Modal detail shift ────────────────────────────────────────────────────
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

          {/* ── STATUS SHIFT ── */}
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

          {/* ══ TAB KASIR ══ */}
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
                <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:2}}>{saldo?.waktuBuka||"—"}</div>
              </div>
              {saldo?.saldoApps && Object.keys(saldo.saldoApps).length>0 ? (
                <>
                  {Object.entries(saldo.saldoApps).map(([app,val])=>(
                    <div key={app} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0faf8"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#555"}}>{app}</span>
                      <span style={{fontSize:12,fontWeight:800,color:+val>0?"#0d9488":"#ccc"}}>{+val>0?fmtRp(+val):"—"}</span>
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
                <div style={{fontSize:10,color:"#aaa",fontWeight:600,marginTop:2}}>{saldo?.waktuTutup||"—"}</div>
              </div>
              {isClosed&&saldo?.saldoAppsAkhir&&Object.keys(saldo.saldoAppsAkhir).length>0?(
                <>
                  {Object.entries(saldo.saldoAppsAkhir).map(([app,val])=>(
                    <div key={app} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid #f0faf8"}}>
                      <span style={{fontSize:12,fontWeight:600,color:"#555"}}>{app}</span>
                      <span style={{fontSize:12,fontWeight:800,color:+val>0?"#e74c3c":"#ccc"}}>{+val>0?fmtRp(+val):"—"}</span>
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
                        Sistem: {fmtRp(saldo.kasNyataSystem||0)} · Fisik: {fmtRp(saldo.kasNyataFisik||0)}
                      </div>
                    </div>
                    <span style={{fontWeight:900,fontSize:28,color:saldo.selisih===0?"#2ecc71":saldo.selisih>0?"#f39c12":"#ff4757"}}>
                      {saldo.selisih===0?"✓":(saldo.selisih>0?"+":"")+fmtRp(saldo.selisih)}
                    </span>
                  </div>
                  {saldo.selisih!==0&&(
                    <div style={{fontSize:11,color:saldo.selisih>0?"#b7770d":"#c0392b",fontWeight:600,background:"rgba(0,0,0,.04)",borderRadius:7,padding:"6px 10px"}}>
                      {saldo.selisih>0
                        ?"Uang fisik lebih dari sistem — ada kelebihan kas atau input kurang tepat"
                        :"Uang fisik kurang dari sistem — ada selisih yang perlu diperiksa"}
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

          {/* ══ TAB BANK ══ */}
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
                    <span style={{fontWeight:800,color:+val>0?"#0d9488":"#ccc"}}>{+val>0?fmtRp(+val):"—"}</span>
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
                    <span style={{fontWeight:800,color:+val>0?"#e74c3c":"#ccc"}}>{+val>0?fmtRp(+val):"—"}</span>
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
                        Sistem: {fmtRp(uangSistemBank)} · Fisik: {fmtRp(bankData.uangLaci)}
                      </div>
                    </div>
                    <span style={{fontWeight:900,fontSize:28,color:selB===0?"#2ecc71":selB>0?"#f39c12":"#ff4757"}}>
                      {selB===0?"✓":(selB>0?"+":"")+fmtRp(selB)}
                    </span>
                  </div>
                  {selB!==0&&(
                    <div style={{fontSize:11,color:selB>0?"#b7770d":"#c0392b",fontWeight:600,background:"rgba(0,0,0,.04)",borderRadius:8,padding:"6px 10px"}}>
                      {selB>0?"Uang laci lebih dari sistem — ada kelebihan atau input kurang tepat"
                             :"Uang laci kurang dari sistem — ada selisih yang perlu diperiksa"}
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

  // ── MAIN LAPORAN LIST ──────────────────────────────────────────────────────
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

        {/* ── TAB KASIR ── */}
        {mainTab==="kasir"&&(<>
          {shiftLogsLoading&&<div style={{textAlign:"center",color:"#0d9488",padding:20,fontSize:13,fontWeight:700}}>⏳ Memuat data shift...</div>}
          {!shiftLogsLoading&&groupArr.map(group=>{
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
                  <div style={{fontWeight:800,fontSize:14,color:"#1a2e2a"}}>{group.label}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{group.outletNama} · {group.items.length} transaksi</div>
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

        {/* ── TAB BANK ── */}
        {mainTab==="bank"&&(
          <LaporanBankList
            bankTrxMap={bankTrxMap}
            bankShiftLogs={bankShiftLogs}
            shiftLogs={shiftLogs}
            outlets={outlets}
            filterOutlet={filterOutlet}
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
        <div style={{fontWeight:800,fontSize:15,color:"#0d9488"}}>📦 Stok Opname — {outletNama}</div>
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

// ══════════════════════════════════════════════════════════════════════════════
// KASIR APP (per outlet)
// ══════════════════════════════════════════════════════════════════════════════
function KasirApp({ user, products, stocks, setStocks, transactions, setTx, outlets, saldoApps, onBack, notify, prodOrder }) {
  // Admin bisa pilih outlet; karyawan sudah terkunci ke outletnya
  const [selectedOutlet, setSelectedOutlet] = useState(user.outletId||outlets[0]?.id||"");
  const outlet = outlets.find(o=>o.id===selectedOutlet);
  const outletStock = stocks[selectedOutlet]||{};

  // ── Persist shift & cart ke localStorage DAN Supabase ────────────────────
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

  // ── Load shift dari Supabase — cross-check dengan shift_logs ──────────────
  useEffect(()=>{
    setShiftLoading(true);
    const loadShift = async () => {
      try{
        // Ambil shift aktif dari active_shifts
        const s = await dbShift.getActiveShift(selectedOutlet, user.username);
        if(s){
          // Verifikasi: cek apakah shift ini sudah ada di shift_logs (sudah ditutup)
          const { data: logCheck } = await supabase
            .from('shift_logs').select('id').eq('id', s.id).limit(1);
          if(logCheck && logCheck.length > 0){
            // Shift ini sudah di-close tapi active_shifts belum terhapus — paksa hapus
            console.warn('Stale active_shift found, cleaning up:', s.id);
            await supabase.from('active_shifts').delete().eq('outlet_id', selectedOutlet);
            setShiftState(null);
            try{ localStorage.removeItem(shiftKey); }catch{}
          } else {
            // Benar-benar aktif
            setShiftState(s);
          }
        } else {
          setShiftState(null);
          try{ localStorage.removeItem(shiftKey); }catch{}
        }
      }catch(e){
        console.log("Shift load error:", e);
        setShiftState(null);
      } finally {
        setShiftLoading(false);
      }
    };
    loadShift();
  },[selectedOutlet]);

  // Wrapper setShift — TIDAK simpan ke localStorage (Supabase = source of truth)
  const setShift = (val) => {
    setShiftState(val);
    // Hanya hapus localStorage kalau null (tutup shift)
    if(!val) try{ localStorage.removeItem(shiftKey); }catch{}
  };

  // Wrapper setCart — auto simpan ke localStorage
  const setCartPersist = (fn) => {
    setCart(prev=>{
      const next = typeof fn==="function" ? fn(prev) : fn;
      try{ localStorage.setItem(cartKey, JSON.stringify(next)); }catch{}
      return next;
    });
  };

  const CATEGORIES = ["Semua",...Array.from(new Set(products.map(p=>p.category)))];
  const filteredProds = products.filter(p=>
    (activeCat==="Semua"||p.category===activeCat)&&
    (p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search))
  );

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
    if(!manualForm.name||!manualForm.price) return notify("Isi nama & harga!","err");
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

  const pay=()=>{
    if(!cart.length) return notify("Keranjang kosong!","err");
    const cashFinal=cashNum>=total?cashNum:total;
    const trx={id:uid(),time:now(),date:today(),shiftId:shift?.id,shiftNama:shift?.nama,kasir:user.nama,outletId:selectedOutlet,
      items:cart.map(i=>({...i,refunded:false,refundReason:""})),total,cash:cashFinal,kembalian:cashFinal-total};
    // Simpan ke Supabase dulu, baru update state
    db.addTransaction(trx).catch(e=>console.error("Gagal simpan transaksi:",e));
    setTx(prev=>[trx,...prev]);
    setStocks(prev=>{
      const s={...prev,[selectedOutlet]:{...prev[selectedOutlet]}};
      cart.forEach(i=>{if(!i.isManual) s[selectedOutlet][i.id]=Math.max(0,(s[selectedOutlet][i.id]||0)-i.qty);});
      return s;
    });
    setCartPersist([]);setCashInput("");setShowPayment(false);
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

  const openShift =data=>{
    const s={id:uid(),nama:data.namaShift,start:now(),...data};
    setShift(s);
    // Simpan ke Supabase dengan data saldo lengkap
    const saldoData = {
      saldoApps: data.saldoApps||{},
      cashKembalian: data.cashKembalian||0,
      totalSaldoApps: data.totalSaldoApps||0,
      waktuBuka: now(),
    };
    dbShift.openShift({...s, saldo_data: saldoData}, selectedOutlet, user.username).catch(()=>{});
    // Juga simpan ke localStorage sebagai backup
    try{
      localStorage.setItem(`ammar_shift_saldo_${s.id}`, JSON.stringify({
        type:"open", namaShift:data.namaShift, waktuBuka:now(),
        saldoApps:data.saldoApps||{}, cashKembalian:data.cashKembalian||0,
        totalSaldoApps:data.totalSaldoApps||0,
      }));
    }catch{}
    setShowShift(false);
    notify("Shift dibuka!","ok");
  };

  const closeShift = async (data) => {
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

          {/* ── OVERLAY: Loading shift / Shift belum dibuka ── */}
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
                  <div><span style={{fontWeight:900,fontSize:14}}>⏱ {group.label}</span><span style={{fontSize:11,opacity:.8,marginLeft:8}}>{group.items.length} trx · {gI} item</span></div>
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

      {/* STOK OUTLET — opname lengkap untuk karyawan */}
      {page==="stok"&&(
        <KasirStokPage
          products={products}
          outletStock={outletStock}
          outletNama={outlet?.nama}
          selectedOutlet={selectedOutlet}
          stocks={stocks}
          setStocks={setStocks}
          prodOrder={prodOrder}
        />
      )}

      {/* MODALS */}
      {showManual&&(
        <Modal onClose={()=>setShowManual(false)} title="➕ Input Manual">
          {[{l:"Nama *",k:"name",t:"text",p:"Nama item..."},{l:"Harga Modal",k:"modal",t:"number",p:"0"},{l:"Harga Jual *",k:"price",t:"number",p:"0"},{l:"Qty",k:"qty",t:"number",p:"1"}].map(f=>(
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
      {showShift&&<ShiftModal mode={shiftMode} shift={shift} transactions={txOutlet} saldoApps={saldoApps||DEFAULT_SALDO_APPS} onOpen={openShift} onClose={closeShift} onCancel={()=>setShowShift(false)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SALDO APPS PAGE — kelola list saldo aplikasi (Admin only)
// ══════════════════════════════════════════════════════════════════════════════
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
          💡 List berlaku <b>semua outlet</b> — tampil saat buka/tutup shift.
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
            <div style={{textAlign:"center",color:"#ccc",padding:24,fontSize:13}}>Belum ada — tambah di atas</div>
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


// ══════════════════════════════════════════════════════════════════════════════
// SHIFT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ShiftModal({ mode, shift, transactions, saldoApps, onOpen, onClose, onCancel }) {
  const APPS = saldoApps || DEFAULT_SALDO_APPS;
  const blank=()=>{const m={};APPS.forEach(a=>{m[a]="";});return m;};
  const [namaShift,setNamaShift]=useState("");
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
            <label style={lS}>Nama Shift *</label>
            <input type="text" value={namaShift} onChange={e=>setNamaShift(e.target.value)} placeholder="Pagi / Siang / Nama kasir..." style={{...iS,marginBottom:6}}/>
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
              <div style={{fontSize:10,color:"#aaa",marginBottom:5}}>({shiftTrx.length} transaksi · sudah dikurangi refund)</div>
              {st>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( – ) Setor Tunai</span><b style={{color:"#e74c3c"}}>{fmtRp(st)}</b></div>}
              {htg>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( – ) Hutang</span><b style={{color:"#e74c3c"}}>{fmtRp(htg)}</b></div>}
              {pnd>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( – ) Pending</span><b style={{color:"#e74c3c"}}>{fmtRp(pnd)}</b></div>}
              {pk>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{color:"#e74c3c"}}>( – ) Pengeluaran {noteKlr&&<span style={{fontSize:10,color:"#aaa",fontStyle:"italic"}}>({noteKlr})</span>}</span><b style={{color:"#e74c3c"}}>{fmtRp(pk)}</b></div>}
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
    "🌟 Kejujuran adalah fondasi kepercayaan — jaga setiap transaksi dengan integritas",
    "💪 Bersama kita tumbuh — setiap rupiah yang tercatat adalah bukti kerja keras kita",
    "🎯 Transparansi bukan pilihan, tapi komitmen kita untuk bisnis yang sehat",
    "🤝 Kepercayaan dibangun dari hal kecil — catat dengan jujur, laporkan dengan tepat",
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

// ══════════════════════════════════════════════════════════════════════════════
// BANK PAGE — Pencatatan Bank (terintegrasi Supabase Realtime)
// ══════════════════════════════════════════════════════════════════════════════
function BankPage({ user, outlets, saldoApps, onBack, notify }) {
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

  // ── Load semua data ────────────────────────────────────────────────────────
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

        // Load juga dari bank_shifts (semua shift aktif di outlet ini — bukan hanya milik user ini)
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

  // ── Realtime ──────────────────────────────────────────────────────────────
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
          // Verifikasi dulu ke Supabase — jangan langsung null
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

  // ── Lanjutkan shift dari riwayat (baru) ────────────────────────────────────
  // ── ▶️ Lanjutkan Shift ────────────────────────────────────────────────────
  // Pakai ID shift LAMA, tidak buat baru → semua transaksi lama ikut otomatis
  const lanjutkanShift = async (histShift) => {
    setHistSelected(null);
    try {
      const s = {
        id:        histShift.id,                         // ID LAMA — transaksi lama tetap linked
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

  // ── 🔗 Gabung dengan Shift Aktif ─────────────────────────────────────────
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
        // Update saldo_close.catatan saja — tidak butuh kolom baru
        const existing = histShift.saldo_close || {};
        try{
          await supabase.from('bank_shift_logs')
            .update({ saldo_close: { ...existing, catatan: catatanGabung, digabung: true } })
            .eq('id', histShift.id);
        }catch(e2){ console.warn('update log catatan:',e2); }
      } else {
        // Shift masih aktif di bank_shifts — hapus dari sana
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

  // ── 🙈 Sembunyikan dari Karyawan ─────────────────────────────────────────
  // Data TETAP ada di database untuk admin. Tandai di saldo_close.catatan.
  const hapusRiwayat = async (histShift) => {
    setHistSelected(null);
    const catatanHidden = `[DISEMBUNYIKAN] oleh ${user.username} pada ${new Date().toLocaleString('id-ID')}`;
    try {
      if(histShift.status==="active") {
        // Shift aktif di bank_shifts — pindah ke bank_shift_logs dengan catatan
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
        // Shift sudah closed — update saldo_close.catatan saja (kolom yang sudah ada)
        const existing = histShift.saldo_close || {};
        try{
          await supabase.from('bank_shift_logs')
            .update({ saldo_close: { ...existing, catatan: catatanHidden, disembunyikan: true } })
            .eq('id', histShift.id);
        }catch(e2){ console.warn('update catatan hidden:',e2); }
      }
      // Hapus dari tampilan karyawan (filter lokal)
      setShiftHistory(prev=>prev.filter(s=>s.id!==histShift.id));
      notify("🙈 Riwayat disembunyikan — masih ada di laporan admin","ok");
    } catch(e){
      console.error("hapusRiwayat error:", e);
      // Fallback: sembunyikan dari tampilan walau Supabase error
      setShiftHistory(prev=>prev.filter(s=>s.id!==histShift.id));
      notify("Disembunyikan dari tampilan","ok");
    }
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
            <div style={{fontWeight:900,fontSize:14,color:"#fff"}}>{outletNama} <span style={{opacity:.7,fontWeight:600,fontSize:12}}>· Bank</span></div>
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
          {/* Riwayat shift di layar lock — bisa langsung lanjutkan */}
          {shiftHistory.length>0&&(
            <div style={{marginTop:10,width:"100%",maxWidth:400}}>
              <div style={{fontWeight:700,fontSize:12,color:"rgba(255,255,255,.7)",textAlign:"center",marginBottom:8}}>— atau lanjutkan shift sebelumnya —</div>
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
                            if(!dt||isNaN(dt)) return s.status==="active"?"🟢 Shift Aktif":"—";
                            return (s.status==="active"?"🟢 Aktif · ":"") + dt.toLocaleDateString("id-ID",{day:"2-digit",month:"short"})+" "+dt.toLocaleTimeString("id-ID",{hour:"2-digit",minute:"2-digit"});
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
            {lastBalance&&<div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:5}}>Laci: {fmtRp(lastBalance.uang)} · <span style={{color:lastBalance.selisih===0?"#a7f3d0":lastBalance.selisih>0?"#fcd34d":"#fca5a5",fontWeight:700}}>{lastBalance.selisih===0?"✓ Balance":(lastBalance.selisih>0?"+":"")+fmtRp(lastBalance.selisih)}</span></div>}
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
              {shift&&<div style={{fontSize:10,color:"#aaa",marginTop:2}}>Shift: {shift.nama} · {shiftTrxList.length} transaksi</div>}
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

        {/* ── RIWAYAT SHIFT ── */}
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
                              return "—";
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
                  if(!dt||isNaN(dt)) return "—";
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
                {/* Pilihan 1: Lanjutkan shift — pakai ID lama */}
                <button onClick={()=>lanjutkanShift(histSelected)}
                  style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:12,padding:"12px 14px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 14px rgba(13,148,136,.3)",textAlign:"left",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:22,flexShrink:0}}>▶️</span>
                  <div>
                    <div>Lanjutkan Shift Ini</div>
                    <div style={{fontSize:10,fontWeight:600,opacity:.8}}>
                      Pakai ID shift lama — cocok saat shift baru belum ada transaksi
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
                        ? `Transaksi lama pindah ke "${shift.nama}" — total masuk/keluar ikut terjumlah`
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
                    <div style={{fontSize:10,fontWeight:600,opacity:.7}}>Data tetap ada di laporan admin — hanya disembunyikan dari karyawan</div>
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
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Uang keluar dari laci — disetor ke pusat/bank</div>
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
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Uang masuk ke laci — bank meminjam dari voucher/kasir</div>
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

  // ── State Buka Shift ──────────────────────────────────────────────────────
  const [namaShift, setNamaShift] = useState("");
  const [cashKemb,  setCashKemb]  = useState("");
  const [saldoForm, setSaldoForm] = useState(blank());

  // ── State Tutup Shift — load draft dari localStorage ──────────────────────
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

        {/* ── BUKA SHIFT ── */}
        {mode==="open"&&(
          <>
            <label style={lbl}>Nama Shift *</label>
            <input value={namaShift} onChange={e=>setNamaShift(e.target.value)} placeholder="Pagi / Siang / Malam..."
              style={{...inp,fontWeight:700}}/>

            <SH t="💵 Cash Kembalian — Otomatis Masuk Saldo Sistem"/>
            <div style={{background:"#e0faf512",border:"1px solid #0d948822",borderRadius:9,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#555",lineHeight:1.6}}>
              ✅ <b>Cash kembalian langsung tercatat sebagai saldo awal.</b> Tidak perlu input manual saat closing.
            </div>
            <label style={lbl}>Jumlah Cash Kembalian (Rp)</label>
            <div style={{position:"relative",marginBottom:10}}>
              <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",fontWeight:700,color:"#0d9488"}}>Rp</span>
              <input type="number" value={cashKemb} onChange={e=>setCashKemb(e.target.value)} placeholder="0"
                style={{...inp,paddingLeft:38,fontSize:18,fontWeight:900,textAlign:"right",border:`2px solid ${cashKembNum>0?"#0d9488":"#b2ede6"}`,marginBottom:0}}/>
            </div>

            <SH t="📱 Saldo Aplikasi Awal (Catatan — tidak masuk uang sistem)"/>
            <div style={{background:"#fffbe6",border:"1px solid #f39c1222",borderRadius:9,padding:"8px 12px",marginBottom:8,fontSize:11,color:"#b7770d",lineHeight:1.5}}>
              📌 Saldo aplikasi hanya untuk <b>pengecekan Anda</b> — tidak mempengaruhi uang sistem.
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

            {/* Total saldo aplikasi — TERPISAH dari uang sistem */}
            <div style={{background:"#e0faf5",borderRadius:10,padding:"11px 14px",border:"2px solid #0d948833",marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>📱 Total Saldo Aplikasi</span>
                <span style={{fontWeight:900,fontSize:18,color:"#0d9488"}}>{fmtRp(totalSaldoF)}</span>
              </div>
              <div style={{fontSize:10,color:"#aaa",marginTop:4}}>* Hanya catatan — tidak masuk perhitungan uang sistem</div>
            </div>

            {/* Uang sistem awal = cash kembalian saja */}
            {cashKembNum>0&&(
              <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:10,padding:"11px 14px"}}>
                <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.75)",marginBottom:4}}>💵 UANG SISTEM AWAL</div>
                <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(totalSistemBuka)}</div>
                <div style={{fontSize:10,color:"rgba(255,255,255,.6)",marginTop:3}}>= Cash Kembalian saja · Saldo aplikasi tidak dihitung</div>
              </div>
            )}
          </>
        )}

        {/* ── TUTUP SHIFT ── */}
        {mode==="close"&&(
          <>
            <div style={{background:"#f0faf8",borderRadius:9,padding:"8px 12px",marginBottom:10,fontSize:12,color:"#555"}}>
              Shift: <b style={{color:"#0d9488"}}>{shift?.nama}</b> · {shift?.start}
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

            {/* Saldo Aplikasi Akhir — auto-save */}
            <SH t="📱 Saldo Aplikasi Akhir — Auto Tersimpan"/>
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

// ── BankTrxForm (komponen terpisah) ───────────────────────────────────────────
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
    // Kirim semua data ke onSave — parent (saveTrx) yang handle TARIK 2 baris
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

        {/* Tipe Fee — 4 pilihan saat KELUAR, 3 saat MASUK */}
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

        {/* Tombol — X kecil + Simpan */}
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
function DashboardOverallPage({ transactions, outlets, onBack }) {
  const [activeTab, setActiveTab] = useState("overview");
  const nowD = new Date();
  const toInputDate = d => { const dt=new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`; };
  const [dateFrom, setDateFrom] = useState(toInputDate(new Date(nowD.getFullYear(),nowD.getMonth(),1)));
  const [dateTo,   setDateTo]   = useState(toInputDate(nowD));
  // Fast Moving tab state — harus di level komponen, tidak bisa di dalam IIFE
  const [fmSort,    setFmSort]    = useState("qty_dsc");
  const [fmSearch,  setFmSearch]  = useState("");
  const [fmCatFlt,  setFmCatFlt]  = useState("Semua");
  const [fmShowAll, setFmShowAll] = useState(false);

  const applyPreset = p => {
    const n=new Date();
    if(p==="today") {setDateFrom(toInputDate(n));setDateTo(toInputDate(n));}
    else if(p==="7d"){const d=new Date(n);d.setDate(n.getDate()-6);setDateFrom(toInputDate(d));setDateTo(toInputDate(n));}
    else if(p==="30d"){const d=new Date(n);d.setDate(n.getDate()-29);setDateFrom(toInputDate(d));setDateTo(toInputDate(n));}
    else if(p==="mon"){setDateFrom(toInputDate(new Date(n.getFullYear(),n.getMonth(),1)));setDateTo(toInputDate(n));}
    else if(p==="yr"){setDateFrom(toInputDate(new Date(n.getFullYear(),0,1)));setDateTo(toInputDate(n));}
  };

  const calcOmset  = list=>list.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
  const calcProfit = list=>list.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+(i.price-(i.modal||0))*i.qty,0),0);
  const parseDate  = s=>{try{const[d,m,y]=s.split("/");return new Date(+y,+m-1,+d);}catch{return null;}};

  const todayStr   = today();
  const todayTrx   = transactions.filter(t=>t.date===todayStr);
  const omsetHari  = calcOmset(todayTrx);
  const profitHari = calcProfit(todayTrx);

  const fromD=new Date(dateFrom); const toD=new Date(dateTo); toD.setHours(23,59,59);
  const filteredTx=transactions.filter(t=>{const td=parseDate(t.date);return td&&td>=fromD&&td<=toD;});
  const totalOmset =calcOmset(filteredTx);
  const totalProfit=calcProfit(filteredTx);

  const outletStats=outlets.map(o=>{
    const list=filteredTx.filter(t=>t.outletId===o.id);
    return{id:o.id,nama:o.nama,omset:calcOmset(list),profit:calcProfit(list),trx:list.length};
  }).sort((a,b)=>b.profit-a.profit);

  const salesMap={};
  filteredTx.forEach(t=>t.items.filter(i=>!i.refunded).forEach(i=>{salesMap[i.name]=(salesMap[i.name]||0)+i.qty;}));
  const fastMoving=Object.entries(salesMap).sort((a,b)=>b[1]-a[1]).slice(0,10);

  const chart6=Array.from({length:6},(_,i)=>{
    const dt=new Date(nowD.getFullYear(),nowD.getMonth()-5+i,1);
    const yr=dt.getFullYear(),mo=dt.getMonth();
    const list=transactions.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr&&td.getMonth()===mo;});
    return{b:dt.toLocaleDateString("id-ID",{month:"short"}),omset:calcOmset(list),profit:calcProfit(list)};
  });
  const maxC=Math.max(...chart6.map(b=>b.omset),1);

  const tabs=[{k:"overview",l:"📊 Overview"},{k:"outlet",l:"🏪 Per Outlet"},{k:"fastmoving",l:"🚀 Fast Moving"},{k:"analisis",l:"🧠 Analisis"}];

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(13,148,136,.35)"}}>
        <div style={{padding:"0 20px",display:"flex",alignItems:"center",minHeight:50}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer",marginRight:12,fontFamily:"inherit"}}>← Menu</button>
          <div style={{fontWeight:900,fontSize:15,color:"#fff",marginRight:"auto"}}>🌐 Dashboard Overall — Ammar Cell</div>
        </div>
        <div style={{background:"rgba(0,0,0,.12)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"7px 20px",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,color:"rgba(255,255,255,.8)"}}>📅 Rentang:</span>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.15)",color:"#fff",fontSize:11,fontFamily:"inherit",outline:"none"}}/>
          <span style={{fontSize:11,color:"rgba(255,255,255,.5)"}}>s/d</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{padding:"4px 8px",borderRadius:7,border:"1px solid rgba(255,255,255,.3)",background:"rgba(255,255,255,.15)",color:"#fff",fontSize:11,fontFamily:"inherit",outline:"none"}}/>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {[{k:"today",l:"Hari Ini"},{k:"7d",l:"7 Hari"},{k:"30d",l:"30 Hari"},{k:"mon",l:"Bulan Ini"},{k:"yr",l:"Tahun Ini"}].map(p=>(
              <button key={p.k} onClick={()=>applyPreset(p.k)} style={{padding:"3px 10px",borderRadius:20,border:"1px solid rgba(255,255,255,.35)",background:"rgba(255,255,255,.15)",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>{p.l}</button>
            ))}
          </div>
        </div>
        <div style={{padding:"0 20px",display:"flex",overflowX:"auto",background:"rgba(0,0,0,.08)"}}>
          {tabs.map(t=>(
            <button key={t.k} onClick={()=>setActiveTab(t.k)} style={{padding:"10px 16px",border:"none",borderBottom:`3px solid ${activeTab===t.k?"#fff":"transparent"}`,background:"transparent",color:activeTab===t.k?"#fff":"rgba(255,255,255,.6)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{t.l}</button>
          ))}
        </div>
      </div>

      <div style={{padding:"16px 20px",maxWidth:960,margin:"0 auto"}}>

        {activeTab==="overview"&&(<>
          {/* Hari ini */}
          <div style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:14,padding:"16px 20px",marginBottom:14,boxShadow:"0 4px 16px rgba(13,148,136,.25)"}}>
            <div style={{fontWeight:800,fontSize:13,color:"rgba(255,255,255,.8)",marginBottom:10}}>🌅 Penjualan Hari Ini — {todayStr}</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:10}}>
              {[{l:"Omset Kasir",v:fmtRp(omsetHari),c:"#fff"},{l:"Profit",v:fmtRp(profitHari),c:"#a7f3d0"},{l:"Transaksi",v:todayTrx.length+" trx",c:"#fcd34d"},{l:"Outlet Aktif",v:outlets.filter(o=>todayTrx.some(t=>t.outletId===o.id)).length+" outlet",c:"#fca5a5"}].map(k=>(
                <div key={k.l} style={{background:"rgba(255,255,255,.12)",borderRadius:10,padding:"10px 13px"}}>
                  <div style={{fontWeight:900,fontSize:16,color:k.c}}>{k.v}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.65)",marginTop:2}}>{k.l}</div>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {outlets.map(o=>{
                const ot=todayTrx.filter(t=>t.outletId===o.id);
                return <div key={o.id} style={{flex:1,minWidth:120,background:"rgba(255,255,255,.1)",borderRadius:9,padding:"8px 11px"}}>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.65)",fontWeight:600}}>{o.nama}</div>
                  <div style={{fontWeight:800,fontSize:14,color:"#fff"}}>{fmtRp(calcOmset(ot))}</div>
                  <div style={{fontSize:10,color:"rgba(255,255,255,.5)"}}>{ot.length} trx</div>
                </div>;
              })}
            </div>
          </div>

          {/* KPI periode */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
            {[{l:"Total Omset",v:fmtRp(totalOmset),bg:"linear-gradient(135deg,#0d9488,#14b8a6)",tc:"#fff",icon:"💰"},{l:"Total Profit",v:fmtRp(totalProfit),bg:"#e8f8f0",tc:"#27ae60",icon:"📈"},{l:"Total Transaksi",v:filteredTx.length+" trx",bg:"#e8f4fd",tc:"#2980b9",icon:"🧾"}].map(k=>(
              <div key={k.l} style={{background:k.bg,borderRadius:14,padding:"14px 16px",border:k.bg.includes("gradient")?"none":"2px solid #e0f5f1"}}>
                <div style={{fontSize:20,marginBottom:6}}>{k.icon}</div>
                <div style={{fontWeight:900,fontSize:20,color:k.tc}}>{k.v}</div>
                <div style={{fontSize:11,fontWeight:700,color:k.tc,opacity:.8,marginTop:2}}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Grafik */}
          <div style={{background:"#fff",borderRadius:14,padding:"16px 20px",border:"2px solid #e0f5f1",marginBottom:14}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontWeight:800,fontSize:14,color:"#1a2e2a"}}>📊 Tren 6 Bulan Terakhir</div>
              <div style={{display:"flex",gap:12,fontSize:11}}>
                {[{c:"#0d9488",l:"Omset"},{c:"#27ae60",l:"Profit"}].map(leg=>(
                  <div key={leg.l} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:10,height:10,borderRadius:2,background:leg.c}}/><span style={{color:"#aaa"}}>{leg.l}</span></div>
                ))}
              </div>
            </div>
            <svg viewBox="0 0 600 120" style={{width:"100%",display:"block"}}>
              {chart6.map((b,i)=>{const x=i*(600/6)+10;const bw=22;const oh=(b.omset/maxC)*90;const ph=(b.profit/maxC)*90;return(
                <g key={b.b}>
                  <rect x={x} y={95-oh} width={bw} height={Math.max(oh,1)} rx="3" fill="#0d9488" opacity=".8"/>
                  <rect x={x+25} y={95-ph} width={bw} height={Math.max(ph,1)} rx="3" fill="#27ae60" opacity=".8"/>
                  <text x={x+22} y={112} textAnchor="middle" fontSize="9" fill="#aaa" fontFamily="Nunito">{b.b}</text>
                </g>
              );})}
            </svg>
          </div>

          {/* Ranking outlet */}
          <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",border:"2px solid #e0f5f1"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#0d9488",marginBottom:12}}>🏅 Ranking Outlet</div>
            {outletStats.map((o,i)=>{
              const pct=Math.round(o.profit/(outletStats[0]?.profit||1)*100);
              return <div key={o.id} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:700}}>{["🥇","🥈","🥉"][i]||`#${i+1}`} {o.nama}</span>
                  <div><span style={{fontSize:12,fontWeight:900,color:"#0d9488"}}>{fmtRp(o.omset)}</span><span style={{fontSize:10,color:"#27ae60",marginLeft:8}}>+{fmtRp(o.profit)}</span></div>
                </div>
                <div style={{background:"#e0faf5",borderRadius:20,height:5}}>
                  <div style={{background:"linear-gradient(90deg,#0d9488,#14b8a6)",height:"100%",width:`${pct}%`,borderRadius:20}}/>
                </div>
              </div>;
            })}
          </div>
        </>)}

        {activeTab==="outlet"&&(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:12}}>
            {outletStats.map((o,i)=>(
              <div key={o.id} style={{background:"#fff",borderRadius:14,padding:"16px 18px",border:`2px solid ${i===0?"#0d9488":"#e0f5f1"}`}}>
                <div style={{fontWeight:800,fontSize:14,color:"#0d9488",marginBottom:10}}>{["🥇","🥈","🥉"][i]||"🏪"} {o.nama}</div>
                {[{l:"Total Omset",v:fmtRp(o.omset),c:"#0d9488"},{l:"Total Profit",v:fmtRp(o.profit),c:"#27ae60"},{l:"Transaksi",v:o.trx+" trx",c:"#2980b9"},{l:"Avg/Trx",v:fmtRp(o.trx?Math.round(o.omset/o.trx):0),c:"#8e44ad"},{l:"Margin",v:`${o.omset?Math.round(o.profit/o.omset*100):0}%`,c:"#e67e22"}].map(s=>(
                  <div key={s.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"1px solid #f0faf8"}}>
                    <span style={{fontSize:12,color:"#888"}}>{s.l}</span>
                    <span style={{fontWeight:800,fontSize:12,color:s.c}}>{s.v}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab==="fastmoving"&&(()=>{
          // ── Semua produk terjual — dikelompokkan & disortir ─────────────────
          // (fmSort, fmSearch, fmCatFlt, fmShowAll states declared at component level above)

          // Build full product sales map with omset + profit
          const fullSalesMap = {};
          filteredTx.forEach(t=>t.items.filter(i=>!i.refunded).forEach(i=>{
            if(!fullSalesMap[i.name]) fullSalesMap[i.name]={name:i.name,qty:0,omset:0,profit:0,category:i.category||"—"};
            fullSalesMap[i.name].qty    += i.qty;
            fullSalesMap[i.name].omset  += i.price*i.qty;
            fullSalesMap[i.name].profit += (i.price-(i.modal||0))*i.qty;
          }));

          // Period days for velocity calculation
          const periodDays = Math.max(1, Math.round((new Date(dateTo)-new Date(dateFrom))/(1000*60*60*24))+1);

          // Classify each product
          const allSalesArr = Object.values(fullSalesMap).map(p=>{
            const vel = p.qty/periodDays; // pcs per day
            let label, labelBg, labelC;
            if(vel >= 1)          { label="🔥 Fast";      labelBg="#fff0e0"; labelC="#e67e22"; }
            else if(vel >= 0.3)   { label="✅ Normal";    labelBg="#e8f8f4"; labelC="#27ae60"; }
            else if(vel >= 0.1)   { label="🐢 Lambat";    labelBg="#fef3c7"; labelC="#d97706"; }
            else                  { label="💀 Mati";      labelBg="#ffe4e4"; labelC="#e74c3c"; }
            return {...p, vel, label, labelBg, labelC};
          });

          // Unique categories from sales
          const fmCats = ["Semua",...new Set(allSalesArr.map(p=>p.category))];

          // Filter + sort
          const fmFiltered = allSalesArr
            .filter(p=>(fmCatFlt==="Semua"||p.category===fmCatFlt)&&p.name.toLowerCase().includes(fmSearch.toLowerCase()))
            .sort((a,b)=>{
              if(fmSort==="qty_dsc")    return b.qty-a.qty;
              if(fmSort==="qty_asc")    return a.qty-b.qty;
              if(fmSort==="omset_dsc")  return b.omset-a.omset;
              if(fmSort==="profit_dsc") return b.profit-a.profit;
              if(fmSort==="vel_dsc")    return b.vel-a.vel;
              if(fmSort==="nama")       return a.name.localeCompare(b.name);
              return 0;
            });

          const maxQty = fmFiltered[0]?.qty||1;
          const displayed = fmShowAll ? fmFiltered : fmFiltered.slice(0,30);

          // Stats summary
          const fastCount   = allSalesArr.filter(p=>p.vel>=1).length;
          const normalCount = allSalesArr.filter(p=>p.vel>=0.3&&p.vel<1).length;
          const slowCount   = allSalesArr.filter(p=>p.vel>=0.1&&p.vel<0.3).length;
          const deadCount   = allSalesArr.filter(p=>p.vel<0.1).length;

          return (
          <div>
            {/* Stats bar */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12}}>
              {[
                {l:"🔥 Fast Moving",  v:fastCount,   bg:"#fff0e0",c:"#e67e22", desc:"≥1 pcs/hari"},
                {l:"✅ Normal",       v:normalCount, bg:"#e8f8f4",c:"#27ae60", desc:"0.3–1 pcs/hari"},
                {l:"🐢 Lambat",       v:slowCount,   bg:"#fef3c7",c:"#d97706", desc:"0.1–0.3 pcs/hari"},
                {l:"💀 Stok Mati",   v:deadCount,   bg:"#ffe4e4",c:"#e74c3c", desc:"<0.1 pcs/hari"},
              ].map(s=>(
                <div key={s.l} style={{background:s.bg,borderRadius:11,padding:"10px 13px",border:`1px solid ${s.c}33`,cursor:"pointer"}}
                  onClick={()=>{
                    if(s.l.includes("Fast")) setFmSort("vel_dsc");
                    else if(s.l.includes("Lambat")) setFmSort("vel_dsc");
                    else if(s.l.includes("Mati")) setFmSort("vel_dsc");
                  }}>
                  <div style={{fontWeight:900,fontSize:22,color:s.c}}>{s.v}</div>
                  <div style={{fontSize:11,fontWeight:700,color:s.c,marginTop:1}}>{s.l}</div>
                  <div style={{fontSize:10,color:s.c,opacity:.7,marginTop:2}}>{s.desc}</div>
                </div>
              ))}
            </div>

            {/* Filter & sort bar */}
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"10px 14px",marginBottom:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:140}}>
                <span style={{position:"absolute",left:8,top:"50%",transform:"translateY(-50%)",color:"#0d9488",fontSize:12}}>🔍</span>
                <input value={fmSearch} onChange={e=>setFmSearch(e.target.value)} placeholder="Cari produk..."
                  style={{width:"100%",padding:"6px 8px 6px 24px",borderRadius:8,border:"2px solid #b2ede6",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
              </div>
              <select value={fmSort} onChange={e=>setFmSort(e.target.value)}
                style={{padding:"6px 10px",borderRadius:8,border:"2px solid #b2ede6",fontSize:11,fontWeight:700,outline:"none",fontFamily:"inherit",background:"#fff",color:"#0d9488"}}>
                <option value="qty_dsc">Terjual Terbanyak ↓</option>
                <option value="qty_asc">Terjual Tersedikit ↑</option>
                <option value="omset_dsc">Omset Tertinggi ↓</option>
                <option value="profit_dsc">Profit Tertinggi ↓</option>
                <option value="vel_dsc">Kecepatan Jual ↓</option>
                <option value="nama">A-Z Nama</option>
              </select>
              <select value={fmCatFlt} onChange={e=>setFmCatFlt(e.target.value)}
                style={{padding:"6px 10px",borderRadius:8,border:"2px solid #b2ede6",fontSize:11,fontWeight:700,outline:"none",fontFamily:"inherit",background:"#fff",color:"#0d9488"}}>
                {fmCats.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
              <div style={{fontSize:11,color:"#aaa",fontWeight:600,whiteSpace:"nowrap"}}>{fmFiltered.length} produk · {periodDays} hari</div>
            </div>

            {/* Table */}
            <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",overflow:"hidden"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:"#e0faf5"}}>
                    {["#","Produk","Kategori","Status","Terjual","Kecepatan","Omset","Profit"].map(h=>(
                      <th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap",fontSize:11}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.map((p,i)=>(
                    <tr key={p.name} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                      <td style={{padding:"8px 11px",color:"#ccc",fontWeight:600,width:30}}>{i+1}</td>
                      <td style={{padding:"8px 11px",fontWeight:700,maxWidth:200}}>
                        <div style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>
                        {/* mini bar */}
                        <div style={{background:"#f0faf8",borderRadius:20,height:3,marginTop:3,width:"100%"}}>
                          <div style={{background:`linear-gradient(90deg,${p.labelC},${p.labelC}88)`,height:"100%",width:`${Math.round((p.qty/maxQty)*100)}%`,borderRadius:20,transition:"width .3s"}}/>
                        </div>
                      </td>
                      <td style={{padding:"8px 11px",color:"#888",fontSize:11}}>{p.category}</td>
                      <td style={{padding:"8px 11px"}}>
                        <span style={{background:p.labelBg,color:p.labelC,fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:20,whiteSpace:"nowrap"}}>{p.label}</span>
                      </td>
                      <td style={{padding:"8px 11px",fontWeight:900,color:"#0d9488"}}>{p.qty} <span style={{fontSize:10,fontWeight:600,color:"#aaa"}}>pcs</span></td>
                      <td style={{padding:"8px 11px",fontWeight:700,color:p.labelC,whiteSpace:"nowrap"}}>
                        {p.vel>=1?`${p.vel.toFixed(1)}/hari`:p.vel>=0.1?`${(p.vel*7).toFixed(1)}/mgg`:`${(p.vel*30).toFixed(1)}/bln`}
                      </td>
                      <td style={{padding:"8px 11px",color:"#555"}}>{fmtRp(p.omset)}</td>
                      <td style={{padding:"8px 11px",fontWeight:700,color:p.profit>0?"#27ae60":"#e74c3c"}}>{fmtRp(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {fmFiltered.length>30&&!fmShowAll&&(
                <div style={{textAlign:"center",padding:"12px",borderTop:"1px solid #f0faf8"}}>
                  <button onClick={()=>setFmShowAll(true)}
                    style={{background:"#f0faf8",border:"2px solid #b2ede6",borderRadius:9,padding:"7px 20px",color:"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
                    Tampilkan semua {fmFiltered.length} produk ↓
                  </button>
                </div>
              )}
              {fmFiltered.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:32,fontSize:13}}>Tidak ada data</div>}
            </div>
          </div>
          );
        })()}

        {activeTab==="analisis"&&(()=>{
          // Rebuild with more detail
          const fullSalesMap2 = {};
          filteredTx.forEach(t=>t.items.filter(i=>!i.refunded).forEach(i=>{
            if(!fullSalesMap2[i.name]) fullSalesMap2[i.name]={name:i.name,qty:0,omset:0,profit:0};
            fullSalesMap2[i.name].qty    += i.qty;
            fullSalesMap2[i.name].omset  += i.price*i.qty;
            fullSalesMap2[i.name].profit += (i.price-(i.modal||0))*i.qty;
          }));
          const periodDays2 = Math.max(1, Math.round((new Date(dateTo)-new Date(dateFrom))/(1000*60*60*24))+1);
          const allProds2 = Object.values(fullSalesMap2).sort((a,b)=>b.qty-a.qty);
          const deadProds = allProds2.filter(p=>p.qty/periodDays2<0.1).sort((a,b)=>a.qty-b.qty);
          const slowProds = allProds2.filter(p=>p.qty/periodDays2>=0.1&&p.qty/periodDays2<0.3);
          const fastProds = allProds2.filter(p=>p.qty/periodDays2>=1);

          const topOutlet = outletStats[0];
          const botOutlet = outletStats[outletStats.length-1];
          const margin    = totalOmset ? Math.round(totalProfit/totalOmset*100) : 0;

          return (<>
          {/* KPI insight cards */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
            {[
              {icon:"📈",t:"Tren Omset",      v:totalOmset>0?"Positif ✓":"Belum ada",  c:"#27ae60",bg:"#e8f8f0", desc:`Total ${fmtRp(totalOmset)} · ${filteredTx.length} transaksi`},
              {icon:"💎",t:"Outlet Terbaik",  v:topOutlet?.nama||"—",                  c:"#e67e22",bg:"#fef5e7", desc:`Profit ${fmtRp(topOutlet?.profit||0)}`},
              {icon:"🏆",t:"Produk Terlaris", v:allProds2[0]?.name||"—",               c:"#0d9488",bg:"#e0faf5", desc:`${allProds2[0]?.qty||0} pcs · ${fmtRp(allProds2[0]?.omset||0)}`},
              {icon:"📊",t:"Margin Rata-rata", v:`${margin}%`,                          c:"#8e44ad",bg:"#f5eeff", desc:`Profit ${fmtRp(totalProfit)} dari omset ${fmtRp(totalOmset)}`},
            ].map(ins=>(
              <div key={ins.t} style={{background:ins.bg,borderRadius:13,padding:"14px 16px",border:`1px solid ${ins.c}22`}}>
                <div style={{fontSize:24,marginBottom:6}}>{ins.icon}</div>
                <div style={{fontWeight:700,fontSize:10,color:ins.c,textTransform:"uppercase",marginBottom:3}}>{ins.t}</div>
                <div style={{fontWeight:900,fontSize:16,color:"#1a2e2a",marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ins.v}</div>
                <div style={{fontSize:11,color:"#888",lineHeight:1.4}}>{ins.desc}</div>
              </div>
            ))}
          </div>

          {/* Stok Mati & Lambat alert */}
          {deadProds.length>0&&(
            <div style={{background:"#fff5f5",border:"2px solid #ff475733",borderRadius:13,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:13,color:"#e74c3c",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                💀 Peringatan: {deadProds.length} Produk Stok Mati
                <span style={{fontSize:10,fontWeight:600,color:"#aaa"}}>(&lt;0.1 pcs/hari dalam {periodDays2} hari)</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {deadProds.slice(0,20).map(p=>(
                  <span key={p.name} style={{background:"#ffe4e4",color:"#c0392b",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,border:"1px solid #ff475733"}}>
                    {p.name} <span style={{opacity:.7}}>({p.qty} pcs)</span>
                  </span>
                ))}
                {deadProds.length>20&&<span style={{fontSize:10,color:"#aaa",padding:"3px 6px"}}>+{deadProds.length-20} lainnya</span>}
              </div>
              <div style={{fontSize:11,color:"#888",marginTop:8,lineHeight:1.5}}>
                ⚠ Produk ini perlu evaluasi: pertimbangkan promo, bundling, atau stop restock untuk hindari modal nganggur.
              </div>
            </div>
          )}
          {slowProds.length>0&&(
            <div style={{background:"#fffbeb",border:"2px solid #f39c1233",borderRadius:13,padding:"14px 16px",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:13,color:"#d97706",marginBottom:8,display:"flex",alignItems:"center",gap:6}}>
                🐢 Perhatian: {slowProds.length} Produk Bergerak Lambat
                <span style={{fontSize:10,fontWeight:600,color:"#aaa"}}>(0.1–0.3 pcs/hari)</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {slowProds.slice(0,15).map(p=>(
                  <span key={p.name} style={{background:"#fef3c7",color:"#b45309",fontSize:10,fontWeight:700,padding:"3px 9px",borderRadius:20,border:"1px solid #f39c1233"}}>
                    {p.name} <span style={{opacity:.7}}>({p.qty} pcs)</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rekomendasi */}
          <div style={{background:"#fff",borderRadius:13,padding:"14px 16px",border:"2px solid #e0f5f1"}}>
            <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>🧠 Rekomendasi Berdasarkan Data Real</div>
            {[
              fastProds.length>0&&{icon:"🔥",pr:"Tinggi",c:"#e74c3c",j:"Prioritaskan Stok Fast Moving",
                isi:`${fastProds.slice(0,3).map(p=>p.name).join(", ")} terjual ≥1 pcs/hari — pastikan stok tidak pernah kosong, ini sumber utama pendapatan.`},
              deadProds.length>0&&{icon:"💀",pr:"Tinggi",c:"#e74c3c",j:`Evaluasi ${deadProds.length} Produk Mati`,
                isi:`Produk ini nyaris tidak terjual dalam ${periodDays2} hari. Coba promo harga, bundling dengan fast moving, atau hentikan restock untuk bebaskan modal.`},
              slowProds.length>0&&{icon:"🐢",pr:"Sedang",c:"#f39c12",j:`Dorong ${slowProds.length} Produk Lambat`,
                isi:`Produk bergerak lambat masih bisa diselamatkan dengan diskon temporer, display lebih menonjol, atau paket combo.`},
              {icon:"💎",pr:"Tinggi",c:"#e74c3c",j:"Fokus Outlet Terbaik",
                isi:`${topOutlet?.nama||"Outlet"} profit ${fmtRp(topOutlet?.profit||0)} — pertahankan stok lengkap dan pelayanan optimal di sini.`},
              botOutlet&&botOutlet.trx>0&&{icon:"🏪",pr:"Sedang",c:"#f39c12",j:`Optimalkan ${botOutlet.nama}`,
                isi:`Outlet ini tertinggal — cek kelengkapan stok, evaluasi kasir, dan pertimbangkan promosi lokal.`},
              {icon:"📊",pr:"Sedang",c:"#f39c12",j:"Tingkatkan Margin",
                isi:`Margin ${margin}%. Target 30%+ dengan review harga jual produk paling laris dan negosiasi supplier untuk produk slow.`},
            ].filter(Boolean).map(r=>(
              <div key={r.j} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:10,background:"#f0faf8",marginBottom:7,border:"1px solid #e0f5f1"}}>
                <span style={{fontSize:18,flexShrink:0}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:12}}>{r.j}</span>
                    <span style={{background:`${r.c}15`,color:r.c,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>Prioritas {r.pr}</span>
                  </div>
                  <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{r.isi}</div>
                </div>
              </div>
            ))}
          </div>
          </>);
        })()}
      </div>
    </div>
  );
}

// ── Drag & Drop sort hook ─────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// CASHFLOW PAGE
// ══════════════════════════════════════════════════════════════════════════════
// ── Sub-components extracted from preview v3 ────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════════════
// CASHFLOW — SISTEM LAPORAN KEUANGAN TERINTEGRASI
// Alur: Kalkulator Cash → Jurnal → Buku Besar → Laba Rugi → Neraca → Analisis
// ══════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// CASHFLOW — LAPORAN KEUANGAN (v2 — identik lapkeu-v2.jsx)
// ════════════════════════════════════════════════════════════════════════════

const CO = "Ammar Cell"; // nama perusahaan untuk laporan keuangan
const CF_KAT_NAMES_OUTLETS_DEFAULT = ["Ammar Cell Merpati","Ammar Cell Cikrik"];
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


// ── CSV download ──────────────────────────────────────────────────────────────
function cfDlCSV(rows, fn) {
  const csv = rows.map(r=>r.map(c=>{const s=String(c==null?"":c);return s.includes(",")||s.includes('"')?'"'+s.replace(/"/g,'""')+'"':s;}).join(",")).join("\n");
  const a=document.createElement("a");
  a.href="data:text/csv;charset=utf-8,\uFEFF"+encodeURIComponent(csv);
  a.download=fn; a.click();
}

// ── Shared: Export bar ────────────────────────────────────────────────────────
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

// ── Shared: KPI strip ─────────────────────────────────────────────────────────
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

// ════════════════════════════════════════════════════════
// TAB 1: KALKULATOR CASH
// ════════════════════════════════════════════════════════
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
  const saveTimer=useRef(null);
  const [lastSave,setLastSave]=useState(null);
  const [kirimOk,setKirimOk]=useState(false);

  const [pCash, setPCash]=useState(cfMkRows(outletNames&&outletNames.length?outletNames:OUTLETS));
  const [pBank, setPBank]=useState(cfMkRows(BANKS));
  const [pApps, setPApps]=useState(cfMkRows(APPS));
  const [mOut,  setMOut] =useState(cfMkRows(outletNames&&outletNames.length?outletNames:OUTLETS));
  const [mBank, setMBank]=useState(cfMkRows(BANKS));
  const [mApps, setMApps]=useState(cfMkRows(APPS));
  const [mKel,  setMKel] =useState(cfMkRows(["Belanja stok","Operasional","Transfer owner"]));
  const [mFisik,setMFisik]=useState(cfMkRows(outletNames&&outletNames.length?outletNames:OUTLETS));

  useEffect(()=>{
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>setLastSave(new Date().toLocaleTimeString("id-ID")),600);
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
    if(entries.length>0){setLog(p=>[...entries,...p]);setKirimOk(true);setTimeout(()=>setKirimOk(false),2500);}
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
          Autosave aktif
          {lastSave&&<span style={{color:"#aaa"}}>· Tersimpan {lastSave}</span>}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* PAGI */}
        <div>
          <ColHead emoji="🌅" label="PAGI — KONDISI AWAL" grad="linear-gradient(135deg,#1d4ed8,#3b82f6)" glow="#3b82f6"/>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <CfKalSec title="Cash Awal per Laci/Outlet" icon="💵" color="#3b82f6" bg="#eff6ff" total={tPC} rows={pCash} setRows={setPCash} placeholder="Nama laci/outlet..."/>
            <CfKalSec title="Saldo Rekening Bank" icon="🏛️" color="#7c3aed" bg="#f5f3ff" total={tPB} rows={pBank} setRows={setPBank} placeholder="Nama bank..."/>
            <CfKalSec title="Saldo Aplikasi Digital" icon="📱" color="#0d9488" bg="#e0faf5" total={tPA} rows={pApps} setRows={setPApps} placeholder="Digipos, Dana, GoPay..."/>
            <TotalCard label="Total Aset Pagi" sub="Cash + Bank + Apps" value={tPagi} grad="linear-gradient(135deg,#1e3a8a,#1d4ed8,#3b82f6)" glow="#3b82f6"/>
          </div>
        </div>
        {/* MALAM */}
        <div>
          <ColHead emoji="🌙" label="MALAM — KONDISI AKHIR" grad="linear-gradient(135deg,#065f46,#059669,#10b981)" glow="#0d9488"/>
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
              <span style={{fontWeight:900,fontSize:11,color:"#fff",letterSpacing:".5px"}}>VERSUS — INPUT KAMU vs SISTEM PENCATATAN</span>
            </div>
            <div style={{height:2,flex:1,background:"linear-gradient(270deg,#d97706 40%,transparent)"}}/>
          </div>
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden",marginBottom:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px",padding:"9px 14px",background:"#e0faf5",borderBottom:"2px solid #b2f5ea"}}>
              {["Komponen","📊 Sistem","✏️ Input Kamu","Selisih"].map((h,i)=>(
                <div key={h} style={{fontWeight:800,fontSize:10,color:i===1?"#3b82f6":i===2?"#0d9488":"#555",textAlign:i>0?"right":"left",textTransform:"uppercase",letterSpacing:".4px"}}>{h}</div>
              ))}
            </div>
            <CfVersusRow label="Omset / Cash Masuk" sub="Sistem: transaksi kasir + log" sistem={sistemMasukHari} input={tMO}/>
            <CfVersusRow label="Perubahan Saldo Bank" sub="Δ Bank Malam − Bank Pagi" sistem={0} input={tMB-tPB}/>
            <CfVersusRow label="Perubahan Saldo Aplikasi" sub="Δ Apps Malam − Apps Pagi" sistem={0} input={tMA-tPA}/>
            <CfVersusRow label="Cash Fisik vs Estimasi Sistem" sub={`Estimasi: ${fmtRp(estFisik)}`} sistem={estFisik} input={tMF}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 120px 120px 100px",padding:"10px 14px",
              background:balanced?"#f0fdf4":"#fef2f2",borderTop:"2px solid #e0f5f1"}}>
              <div style={{fontWeight:900,fontSize:13}}>Total Keseluruhan</div>
              <div style={{textAlign:"right",fontWeight:900,fontSize:13,color:"#3b82f6"}}>{fmtRp(tPagi+tMO-tMK)}</div>
              <div style={{textAlign:"right",fontWeight:900,fontSize:13,color:"#0d9488"}}>{fmtRp(tMalam)}</div>
              <div style={{textAlign:"right",fontWeight:900,fontSize:14,color:balanced?"#16a34a":selTotal>0?"#ca8a04":"#dc2626"}}>
                {balanced?"✅ Balance":selTotal>0?`+${fmtRp(selTotal)}`:`-${fmtRp(Math.abs(selTotal))}`}
              </div>
            </div>
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
                  {balanced?"Keuangan Balance — Mantap! 🎉":selTotal>0?`Cash Lebih ${fmtRp(selTotal)} — Periksa Input`:`Cash Kurang ${fmtRp(Math.abs(selTotal))} — Perlu Diperiksa`}
                </div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.75)",lineHeight:1.8}}>
                  🌅 Aset Pagi <b style={{color:"#fff"}}>{fmtRp(tPagi)}</b> · ⬇ Masuk <b style={{color:"#fff"}}>{fmtRp(tMO)}</b> · ⬆ Keluar <b style={{color:"#fff"}}>{fmtRp(tMK)}</b> · 🌙 Aset Malam <b style={{color:"#fff"}}>{fmtRp(tMalam)}</b>
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

// ════════════════════════════════════════════════════════
// TAB 2: JURNAL
// ════════════════════════════════════════════════════════
function CfTabJurnal({log,setLog,onDelete}) {
  const [form,setForm]=useState({nama:"",nominal:"",jenis:"masuk",kat:"setoran",tgl:today()});
  const [srch,setSrch]=useState(""); const [fltr,setFltr]=useState("semua"); const [saved,setSaved]=useState(false);
  const save=()=>{
    if(!form.nama.trim()||!form.nominal) return;
    const newEntry={id:uid(),...form,nominal:toNumCF(form.nominal)};
    if(typeof setLog==="function") setLog([newEntry]);
    setForm(p=>({...p,nama:"",nominal:""}));
    setSaved(true); setTimeout(()=>setSaved(false),1400);
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
          [CO+" — JURNAL UMUM"],["No","Tanggal","Keterangan","Kategori","Jenis","Nominal"],
          ...log.map((e,i)=>[i+1,e.tgl,e.nama,CF_KAT[e.kat]?.l||e.kat,e.jenis==="masuk"?"Masuk":"Keluar",e.nominal]),
          [""],["","","","","Total Masuk",log.filter(x=>x.jenis==="masuk").reduce((s,x)=>s+x.nominal,0)],
          ["","","","","Total Keluar",log.filter(x=>x.jenis==="keluar").reduce((s,x)=>s+x.nominal,0)],
        ],`Jurnal_${today().replace(/\//g,"-")}.csv`)},
        {l:"CSV Per Tanggal",icon:"📅",c:"#0891b2",fn:()=>{
          const rows=[[CO+" — PER TANGGAL"],["Tanggal","Keterangan","Jenis","Nominal"]];
          Object.entries(byDate).forEach(([d,es])=>{es.forEach(e=>rows.push([d,e.nama,e.jenis==="masuk"?"Masuk":"Keluar",e.nominal]));rows.push(["---","","",""]);});
          cfDlCSV(rows,`Jurnal_Tanggal_${today().replace(/\//g,"-")}.csv`);
        }},
      ]}/>
      <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",padding:"13px 15px",marginBottom:12}}>
        <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>➕ Tambah Entri Jurnal</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1.5fr auto",gap:8,alignItems:"end"}}>
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
              return (
                <div key={e.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 13px",borderTop:i>0?"1px solid #f5fffe":"none",background:i%2===0?"#fff":"#fafffe"}}
                  onMouseEnter={ev=>ev.currentTarget.style.background="#f0fdfb"} onMouseLeave={ev=>ev.currentTarget.style.background=i%2===0?"#fff":"#fafffe"}>
                  <div style={{width:28,height:28,borderRadius:8,background:kat.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{kat.icon}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.nama}</div>
                    <span style={{fontSize:9,fontWeight:700,color:kat.c,background:kat.bg,padding:"1px 6px",borderRadius:20,display:"inline-block",marginTop:1}}>{kat.l}</span>
                  </div>
                  <div style={{fontWeight:900,fontSize:13,color:e.jenis==="masuk"?"#16a34a":"#dc2626",flexShrink:0}}>{e.jenis==="masuk"?"+":"-"}{fmtRp(e.nominal)}</div>
                  <button onClick={()=>onDelete&&onDelete(e.id)||setLog(p=>p.filter(x=>x.id!==e.id))} style={{background:"none",border:"none",color:"#ddd",cursor:"pointer",fontSize:13}}
                    onMouseEnter={ev=>ev.currentTarget.style.color="#ff4757"} onMouseLeave={ev=>ev.currentTarget.style.color="#ddd"}>✕</button>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ════════════════════════════════════════════════════════
// TAB 3: BUKU BESAR
// ════════════════════════════════════════════════════════
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
          const rows=[[CO+" — BUKU BESAR"],["Akun","Tanggal","Keterangan","Debit","Kredit","Saldo Running"]];
          akuns.forEach(a=>{let run=0;a.entries.forEach((e,i)=>{if(e.jenis==="masuk")run+=e.nominal;else run-=e.nominal;rows.push([i===0?(CF_KAT[a.kat]?.l||a.kat):"",e.tgl,e.nama,e.jenis==="keluar"?e.nominal:0,e.jenis==="masuk"?e.nominal:0,run]);});});
          cfDlCSV(rows,`BukuBesar_${today().replace(/\//g,"-")}.csv`);
        }},
        {l:"Export CSV Rekap",icon:"📋",c:"#7c3aed",fn:()=>cfDlCSV([
          [CO+" — REKAP BUKU BESAR"],["Akun","Debit","Kredit","Saldo"],
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
                      <td style={{padding:"6px 12px",color:"#dc2626",fontWeight:700}}>{e.jenis==="keluar"?fmtRp(e.nominal):"—"}</td>
                      <td style={{padding:"6px 12px",color:"#16a34a",fontWeight:700}}>{e.jenis==="masuk"?fmtRp(e.nominal):"—"}</td>
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

// ════════════════════════════════════════════════════════
// TAB 4: LAPORAN KEUANGAN
// ════════════════════════════════════════════════════════
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
    [CO+" — LAPORAN KEUANGAN"],[""],
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

// ════════════════════════════════════════════════════════
// TAB 5: ANALISIS
// ════════════════════════════════════════════════════════
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
          [CO+" — ANALISIS KEUANGAN"],["Tanggal: "+today()],[""],
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
            <div style={{fontSize:11,color:"rgba(255,255,255,.8)",marginTop:3}}>Margin {margin.toFixed(1)}% · Rata-rata {fmtRp(rata)}/hari · {days} hari aktif</div>
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

// ════════════════════════════════════════════════════════

function CashflowPage({ transactions, outlets, onBack, notify }) {
  const [cfTab, setCfTab] = useState("kalkulator");
  const [cfLog, setCfLog] = useState([]);

  // Load from Supabase + realtime
  useEffect(()=>{
    dbCashflow.getEntries().then(entries=>{
      setCfLog((entries||[]).map(e=>({
        id:e.id, tgl:e.tgl, jenis:e.jenis,
        kat:e.kategori||e.jenis, nama:e.nama, nominal:e.nominal
      })));
    }).catch(()=>{});
    const ch = supabase.channel("cashflow-rt-v2")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"cashflow_entries"},(p)=>{
        const r=p.new; if(!r) return;
        const e={id:r.id,tgl:r.tgl,jenis:r.jenis,kat:r.kategori||r.jenis,nama:r.nama,nominal:r.nominal};
        setCfLog(prev=>prev.find(x=>x.id===r.id)?prev:[e,...prev]);
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"cashflow_entries"},(p)=>{
        const id=p.old?.id; if(!id) return;
        setCfLog(prev=>prev.filter(x=>x.id!==id));
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  const cfAddEntries = async (entries) => {
    const newOnes = entries.filter(e=>!cfLog.find(x=>x.id===e.id));
    setCfLog(prev=>[...newOnes,...prev]);
    for(const e of newOnes) {
      try { await dbCashflow.addEntry({id:e.id,tgl:e.tgl,jenis:e.jenis,nama:e.nama,nominal:e.nominal,sumber:"",kategori:e.kat||e.jenis}); }
      catch(err) { console.warn("addEntry:",err); }
    }
  };

  const cfDeleteEntry = async (id) => {
    setCfLog(prev=>prev.filter(x=>x.id!==id));
    try { await dbCashflow.deleteEntry(id); } catch(err) { console.warn("deleteEntry:",err); }
  };

  // Outlets names for kalkulator
  const outletNames = (outlets||[]).map(o=>o.nama);

  // KPI
  const cfMasuk  = cfLog.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const cfKeluar = cfLog.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);
  const cfLaba   = cfMasuk - cfKeluar;
  const cfMargin = cfMasuk>0?(cfLaba/cfMasuk*100):0;

  // Omset hari ini dari transaksi kasir (untuk kalkulator versus)
  const todayStr  = new Date().toLocaleDateString("id-ID");
  const omsetHari = transactions.filter(t=>t.date===todayStr).reduce((s,t)=>{
    const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);
    return s+t.total-rv;
  },0);
  const logMasukHari = cfLog.filter(e=>e.tgl===todayStr&&e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const sistemMasukHari = omsetHari + logMasukHari;

  const cfTabs=[
    {k:"kalkulator",l:"🧮 Kalkulator",   badge:"Cash"},
    {k:"jurnal",    l:"📋 Jurnal",        badge:"CSV"},
    {k:"besar",     l:"📚 Buku Besar",    badge:"CSV"},
    {k:"lapkeu",    l:"📊 Lap. Keuangan", badge:"LR+AK+Neraca"},
    {k:"analisis",  l:"🎯 Analisis",      badge:"CSV+PDF"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#064e3b,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 4px 20px rgba(13,148,136,.35)"}}>
        <div style={{padding:"0 20px",minHeight:50,display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",flexShrink:0}}>← Menu</button>
          <div style={{fontSize:18}}>💼</div>
          <div>
            <div style={{fontWeight:900,fontSize:14,color:"#fff"}}>Laporan Keuangan</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600}}>Ammar Cell</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:6}}>
            {[{l:"Masuk",v:fmtRp(cfMasuk),c:"#a7f3d0"},{l:"Keluar",v:fmtRp(cfKeluar),c:"#fca5a5"},{l:"Laba",v:fmtRp(cfLaba),c:cfLaba>=0?"#a7f3d0":"#fca5a5"},{l:"Margin",v:`${cfMargin.toFixed(1)}%`,c:"#fcd34d"}].map(k=>(
              <div key={k.l} style={{textAlign:"center",background:"rgba(255,255,255,.1)",borderRadius:9,padding:"4px 10px",border:"1px solid rgba(255,255,255,.15)"}}>
                <div style={{fontWeight:900,fontSize:12,color:k.c}}>{k.v}</div>
                <div style={{fontSize:9,color:"rgba(255,255,255,.5)",fontWeight:700}}>{k.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.12)",overflowX:"auto"}}>
          {cfTabs.map(t=>(
            <button key={t.k} onClick={()=>setCfTab(t.k)}
              style={{padding:"9px 14px",border:"none",borderBottom:`3px solid ${cfTab===t.k?"#fff":"transparent"}`,background:"transparent",color:cfTab===t.k?"#fff":"rgba(255,255,255,.5)",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",transition:"all .15s",display:"flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
              {t.l}
              <span style={{fontSize:8,background:"rgba(255,255,255,.15)",borderRadius:20,padding:"1px 5px",color:cfTab===t.k?"#fff":"rgba(255,255,255,.4)",fontWeight:700}}>{t.badge}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 20px",maxWidth:1080,margin:"0 auto"}}>
        {cfTab==="kalkulator" && <CfTabKalkulator log={cfLog} setLog={setCfLog} outletNames={outletNames} sistemMasuk={sistemMasukHari}/>}
        {cfTab==="jurnal"     && <CfTabJurnal     log={cfLog} setLog={cfAddEntries} onDelete={cfDeleteEntry}/>}
        {cfTab==="besar"      && <CfTabBukuBesar  log={cfLog}/>}
        {cfTab==="lapkeu"     && <CfTabLapKeu     log={cfLog}/>}
        {cfTab==="analisis"   && <CfTabAnalisis   log={cfLog}/>}
      </div>
    </div>
  );
}


// ─── Chart component ──────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// BANK DASHBOARD — sama persis dengan dashboard penjualan
// ════════════════════════════════════════════════════════════════════════════
// ─── Chart component ──────────────────────────────────────────────────────────
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
  const [metric,   setMetric]   = useState("masuk");   // masuk|keluar|saldo|trx
  const [period,   setPeriod]   = useState("daily");
  const [dateFrom, setDateFrom] = useState(()=>{const d=new Date();d.setDate(d.getDate()-13);return d.toISOString().split("T")[0];});
  const [dateTo,   setDateTo]   = useState(()=>new Date().toISOString().split("T")[0]);
  const [filterOutlet, setFilterOutlet] = useState("semua");
  const [tab, setTab] = useState("grafik");

  const bankTrx = rawBankTrx || [];
  const outletNames = (outlets||[]).map(o=>o.nama);

  // Filter by outlet
  const filtered = filterOutlet==="semua" ? bankTrx : bankTrx.filter(t=>t.outletId===filterOutlet);

  // KPI hari ini
  const todayStr = today();
  const todayTrx = filtered.filter(t=>t.tgl===todayStr);
  const masukHari  = todayTrx.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
  const keluarHari = todayTrx.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
  const saldoHari  = masukHari - keluarHari;
  const feeHari    = todayTrx.reduce((s,t)=>s+t.fee,0);

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
          addPt(lbl, filtered.filter(t=>t.tgl===str));
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
        addPt(dt.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"}), filtered.filter(t=>t.tgl===dt.toLocaleDateString("id-ID")));
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

        {/* ── TAB GRAFIK ── */}
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

        {/* ── TAB PER OUTLET ── */}
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

        {/* ── TAB TOP TRANSAKSI ── */}
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

function PulseDotM({color="#27ae60",size=8}){
  return(
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",justifyContent:"center",width:size+6,height:size+6}}>
      <span style={{position:"absolute",width:size+6,height:size+6,borderRadius:"50%",background:color,opacity:.3,animation:"pulseM 1.5s infinite"}}/>
      <span style={{width:size,height:size,borderRadius:"50%",background:color,display:"block"}}/>
      <style>{`@keyframes pulseM{0%,100%{transform:scale(1);opacity:.3}50%{transform:scale(1.6);opacity:0}}`}</style>
    </span>
  );
}

function MonitorPage({ user, outlets, transactions, onBack, notify }) {
  const isMonitorRole = user?.role==="monitor";
  // Outlet yang dipantau monitor (kosong = semua)
  const monitorOutletIds = user?.outletIds||[];
  const visibleOutlets = isMonitorRole && monitorOutletIds.length>0
    ? outlets.filter(o=>monitorOutletIds.includes(o.id))
    : outlets;

  const [clock,       setClock]      = useState(now());
  const [kasirShifts, setKasirShifts]= useState([]);
  const [bankTrxList, setBankTrxList]= useState([]);
  const [resetLog,    setResetLog]   = useState([]);
  const [filterOutlet,setFilterOutlet]= useState("semua");
  const [filterBank,  setFilterBank] = useState("semua");
  const [expandLog,   setExpandLog]  = useState(null);
  const [loading,     setLoading]    = useState(true);

  useEffect(()=>{ const iv=setInterval(()=>setClock(now()),1000); return()=>clearInterval(iv); },[]);

  useEffect(()=>{
    const load = async () => {
      try {
        // Load active shifts — ambil semua, filter di frontend
        const {data:shifts,error} = await supabase.from('active_shifts').select('*');
        if(!error) setKasirShifts(shifts||[]);
        const allBankTrx = await dbBank.getTransactions();
        setBankTrxList(allBankTrx);
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
        try{
          const {data} = await supabase.from('active_shifts').select('*');
          setKasirShifts(data||[]);
        }catch{}
      }).subscribe();

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

  // Hitung cash laci per kasir dari transaksi hari ini
  const calcOmsetShift = (shiftId) => {
    return transactions
      .filter(t=>t.shiftId===shiftId)
      .reduce((s,t)=>{ const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0); return s+t.total-rv; },0);
  };
  const calcTrxShift = (shiftId) => transactions.filter(t=>t.shiftId===shiftId).length;

  // Hitung uang sistem bank per outlet (dari semua transaksi, bukan hanya hari ini)
  const getBankStats = (outletId) => {
    const list = bankTrxList.filter(t=>t.outletId===outletId);
    const masuk  = list.filter(t=>t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
    const keluar = list.filter(t=>t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
    return { uangSistem:masuk-keluar, totalMasuk:masuk, totalKeluar:keluar, trx:list.length, list };
  };

  // Transaksi kasir hari ini terurut terbaru
  const todayTrx = transactions.filter(t=>t.date===today())
    .sort((a,b)=>(b.time||"").localeCompare(a.time||""))
    .slice(0,50);

  const filteredTrx  = filterOutlet==="semua" ? todayTrx  : todayTrx.filter(t=>String(t.outletId)===String(filterOutlet));
  const filteredBank = filterBank==="semua"   ? bankTrxList : bankTrxList.filter(t=>String(t.outletId)===String(filterBank));

  // Grand totals — dari visibleOutlets saja
  const totalOmset      = todayTrx.reduce((s,t)=>{ const rv=(t.items||[]).filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0); return s+t.total-rv; },0);
  const totalBankSistem = visibleOutlets.reduce((s,o)=>s+getBankStats(o.id).uangSistem,0);

  const outletColor = (id) => {
    const colors={};
    outlets.forEach((o,i)=>{ colors[String(o.id)]=["#0d9488","#2980b9","#8e44ad","#27ae60","#e67e22"][i]||"#0d9488"; });
    return colors[String(id)]||"#0d9488";
  };

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
      </div>

      <div style={{padding:"14px 20px",maxWidth:1300,margin:"0 auto"}}>

        {/* ── KASIR AKTIF ── */}
        <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
          <PulseDotM color="#0d9488" size={7}/>
          <div style={{fontWeight:800,fontSize:14,color:"#0d9488"}}>Kasir & Bank Aktif — Semua Outlet</div>
        </div>

        {visibleOutlets.map((outlet,oi)=>{
          // Bandingkan sebagai string agar tidak gagal karena type mismatch int vs string
          const shifts = kasirShifts.filter(s=>String(s.outlet_id)===String(outlet.id));
          const bank   = getBankStats(outlet.id);
          const oc     = outletColor(outlet.id);
          if(shifts.length===0&&bank.trx===0) return null;
          return (
            <div key={outlet.id} style={{marginBottom:16}}>
              {/* Outlet header */}
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,padding:"7px 14px",background:oc+"12",borderRadius:10,border:`1px solid ${oc}25`}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:oc}}/>
                <div style={{fontWeight:800,fontSize:13,color:oc}}>{outlet.nama}</div>
                <div style={{fontSize:11,color:"#888",marginLeft:"auto"}}>
                  {shifts.length} kasir aktif
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
                          <div style={{fontSize:10,color:"#aaa"}}>Shift {sh.nama} · Buka {sh.start_time?.substring(11,16)||"—"}</div>
                        </div>
                      </div>

                      {/* Cash laci — fokus utama */}
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

                {/* Bank card */}
                {bank.trx>0&&(
                  <div style={{background:"#fff",borderRadius:14,padding:"14px 16px",border:`2px solid #e0f5f1`,position:"relative",overflow:"hidden"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:3,background:"linear-gradient(90deg,#1a2e2a,#2d4a44)"}}/>
                    <div style={{fontWeight:800,fontSize:13,color:"#1a2e2a",marginBottom:10}}>🏦 Bank — {outlet.nama.replace("Ammar Cell ","")}</div>
                    <div style={{background:"linear-gradient(135deg,#1a2e2a,#2d4a44)",borderRadius:11,padding:"11px 14px",marginBottom:10}}>
                      <div style={{fontSize:10,fontWeight:700,color:"rgba(255,255,255,.6)",marginBottom:3}}>UANG SISTEM</div>
                      <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(bank.uangSistem)}</div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7}}>
                      <div style={{background:"#e8f8f0",borderRadius:9,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#27ae60",fontWeight:700}}>MASUK</div>
                        <div style={{fontWeight:800,fontSize:11,color:"#27ae60"}}>{fmtRp(bank.totalMasuk)}</div>
                      </div>
                      <div style={{background:"#fff0f0",borderRadius:9,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#e74c3c",fontWeight:700}}>KELUAR</div>
                        <div style={{fontWeight:800,fontSize:11,color:"#e74c3c"}}>{fmtRp(bank.totalKeluar)}</div>
                      </div>
                      <div style={{background:"#f0faf8",borderRadius:9,padding:"7px 9px"}}>
                        <div style={{fontSize:9,color:"#aaa",fontWeight:700}}>TRX</div>
                        <div style={{fontWeight:800,fontSize:11,color:"#1a2e2a"}}>{bank.trx}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* ── TRANSAKSI KASIR + RIWAYAT BANK berdampingan ── */}
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
                          <div style={{fontWeight:700,fontSize:12,color:"#1a2e2a"}}>{items.map(it=>it.name).join(", ").substring(0,35)||"—"}</div>
                          <div style={{fontSize:10,color:"#aaa",marginTop:1}}>{t.kasir||t.shiftNama} · {t.time||"—"}</div>
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
                        <div style={{fontSize:10,color:"#aaa"}}>Jam {r.waktu} · {r.jumlah_shift||allShifts.length} shift ditutup</div>
                      </div>
                      <div style={{fontSize:11,color:"#aaa"}}>{expandLog===r.id?"▲":"▼"}</div>
                    </div>
                    {expandLog===r.id&&(
                      <div style={{background:"#f8fffe",borderTop:"1px solid #e0f5f1",padding:"8px 14px 10px"}}>
                        {allShifts.length===0?(
                          <div style={{fontSize:11,color:"#aaa"}}>Detail tidak tersedia</div>
                        ):allShifts.map((s,si)=>(
                          <div key={si} style={{display:"flex",justifyContent:"space-between",fontSize:11,padding:"3px 0",borderBottom:si<allShifts.length-1?"1px dashed #e0f5f1":"none"}}>
                            <span style={{color:"#555",fontWeight:600}}>{s.user_id||s.user} · {outlets.find(o=>o.id===s.outlet_id)?.nama?.replace("Ammar Cell ","")||s.outlet||s.outlet_id}</span>
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
          🔴 LIVE — Supabase Realtime · Auto reset jam 23:00 setiap hari
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  // ── Session: ambil dari localStorage agar tidak login ulang ──────────────
  const savedUser = (() => { try { const s=localStorage.getItem('ammar_user'); return s?JSON.parse(s):null; } catch{return null;} })();

  const [user,        setUserState]   = useState(savedUser);
  const [page,        setPage]        = useState(savedUser?.role==="monitor"?"monitor":"menu");
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

  // Simpan user ke localStorage setiap kali berubah
  const setUser = (u) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem('ammar_user', JSON.stringify(u));
      else    localStorage.removeItem('ammar_user');
    } catch {}
  };

  const notify = (msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  // ── Auto reset shift jam 23.00 setiap hari ──────────────────────────────────
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
            console.log(`[AutoReset] ${dateStr} 23:00 — ${totalShifts} shift ditutup otomatis`);
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

  // ── Auto reload saat app kembali ke foreground (tab aktif lagi) ──────────
  useEffect(()=>{
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        reloadData();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    // Reload data setiap 60 detik sebagai fallback jika realtime putus
    const iv = setInterval(()=>{
      if(document.visibilityState==='visible') reloadData();
    }, 60000);

    // ── Online/offline detection — tablet sering putus wifi ────────────────
    const onOnline = () => {
      console.log('🟢 Koneksi kembali — reload data...');
      setTimeout(()=>reloadData(), 1000); // delay 1 detik biar koneksi stabil dulu
    };
    window.addEventListener('online', onOnline);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      clearInterval(iv);
    };
  },[]);

  // ── Reload data dari Supabase (dipanggil setelah update outlet/user) ──────
  const reloadData = async () => {
    try {
      const [prods, outs, stks, txs, usrs, prodOrd, aktifMap] = await Promise.all([
        db.getProducts(), db.getOutlets(), db.getStocks(),
        db.getTransactions(), db.getUsers(),
        dbProductOrder.getOrder().catch(()=>[]),
        dbAktifProduk.getAllAktif().catch(()=>({})),
      ]);
      setProductsState(prods);
      setOutletsState(outs);
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
      setUsersState(usrs);
    } catch(e) { console.error("Reload gagal:",e); }
  };

  // ── Load semua data dari Supabase saat pertama buka ──────────────────────
  useEffect(()=>{
    const load = async () => {
      // Timeout 15 detik — jika lebih dari itu tampilkan error
      const timeout = setTimeout(()=>{
        setDbError("Koneksi terlalu lambat. Cek internet dan coba lagi.");
        setLoading(false);
      }, 15000);

      try {
        // Load satu per satu dengan fallback — satu gagal tidak crash semua
        const prods        = await db.getProducts().catch(()=>[]);
        const outs         = await db.getOutlets().catch(()=>[]);
        const stks         = await db.getStocks().catch(()=>({}));
        const txs          = await db.getTransactions().catch(()=>[]);
        const usrs         = await db.getUsers().catch(()=>({}));
        const saldoList    = await dbSaldo.getSaldoApps().catch(()=>[]);
        const saldoBankList= await dbSaldoBank.getSaldoBankApps().catch(()=>[]);
        const prodOrd      = await dbProductOrder.getOrder().catch(()=>[]);
        const aktifMap     = await dbAktifProduk.getAllAktif().catch(()=>({}));

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
        setUsersState(usrs);
        setLoading(false);
      } catch(e) {
        clearTimeout(timeout);
        console.error('Load error:', e);
        setDbError("Tidak bisa terhubung ke database. Cek koneksi internet.");
        setLoading(false);
      }
    };
    load();
  },[]);

  // ── Realtime listener — stok & produk update otomatis di semua device ─────
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
          if (usrs) setUsersState(usrs);
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

    // Cleanup saat komponen unmount
    return () => {
      supabase.removeChannel(stockChannel);
      supabase.removeChannel(productChannel);
      supabase.removeChannel(outletChannel);
      supabase.removeChannel(userChannel);
      supabase.removeChannel(trxChannel);
    };
  },[]);

  // ── Realtime active_shifts — laporan admin update otomatis ────────────────
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

  // ── Wrapper setProducts: update state + Supabase ─────────────────────────
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

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",fontFamily:"'Nunito',sans-serif"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;900&display=swap');*{box-sizing:border-box;}@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{fontSize:52,marginBottom:16}}>🏪</div>
      <div style={{fontWeight:900,fontSize:22,color:"#fff",marginBottom:8}}>Ammar Cell</div>
      <div style={{width:36,height:36,border:"4px solid rgba(255,255,255,.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 1s linear infinite",marginTop:12}}/>
      <div style={{color:"rgba(255,255,255,.7)",fontSize:13,fontWeight:600,marginTop:14}}>Memuat data...</div>
    </div>
  );

  // ── DB Error screen ───────────────────────────────────────────────────────
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

  // ── Login ────────────────────────────────────────────────────────────────
  if (!user) return (
    <>
      <style>{css+`@keyframes fadeUp{from{transform:translateY(20px);opacity:0}to{transform:none;opacity:1}}`}</style>
      <LoginPage users={users} onLogin={u=>{
        setUser(u);
        // Monitor role langsung ke halaman monitor
        setPage(u.role==="monitor"?"monitor":"menu");
      }}/>
    </>
  );

  return (
    <div style={{fontFamily:"'Nunito',sans-serif"}}>
      <style>{css}</style>
      <Toast toast={toast}/>

      {/* Portrait warning untuk HP */}
      <div className="portrait-warn">
        <div style={{fontSize:48,marginBottom:16}}>🔄</div>
        <div style={{fontWeight:900,fontSize:20,marginBottom:8}}>Putar HP Kamu</div>
        <div style={{fontSize:14,opacity:.85,lineHeight:1.6}}>
          Aplikasi kasir lebih nyaman digunakan dalam mode <b>Landscape</b> (horizontal)
        </div>
        <div style={{marginTop:20,background:"rgba(255,255,255,.15)",borderRadius:12,padding:"10px 20px",fontSize:13,fontWeight:700}}>
          Putar HP 90° untuk melanjutkan
        </div>
      </div>

      {page==="menu"      && <MenuUtama    user={user} onNavigate={setPage} onLogout={()=>{setUser(null);setPage("menu");}} stats={stats}/>}
      {page==="kasir"     && <KasirApp     user={user} products={products} stocks={stocks} setStocks={setStocks} transactions={transactions} setTx={setTx} outlets={outlets} saldoApps={saldoApps} onBack={()=>setPage("menu")} notify={notify} prodOrder={prodOrder}/>}
      {page==="bank"      && <BankPage     user={user} outlets={outlets} saldoApps={saldoBank} onBack={()=>setPage("menu")} notify={notify}/>}
      {page==="monitor"   && (isAdmin||isMonitor) && <MonitorPage user={user} outlets={outlets} transactions={transactions} onBack={isMonitor?null:()=>setPage("menu")} notify={notify}/>}
      {page==="cashflow"  && isAdmin && <CashflowPage  transactions={transactions} outlets={outlets} onBack={()=>setPage("menu")} notify={notify}/>}
      {page==="produk"    && isAdmin && <ProdukPage    products={products} setProducts={setProducts} stocks={stocks} setStocks={setStocks} outlets={outlets} onBack={()=>{reloadData();setPage("menu");}} notify={notify} prodOrderRoot={prodOrder} setProdOrderRoot={setProdOrderRoot}/>}
      {page==="stok"      && isAdmin && <ProdukPage    products={products} setProducts={setProducts} stocks={stocks} setStocks={setStocks} outlets={outlets} onBack={()=>setPage("menu")} notify={notify} prodOrderRoot={prodOrder} setProdOrderRoot={setProdOrderRoot}/>}
      {page==="outlet"    && isAdmin && <OutletPage    outlets={outlets} setOutlets={setOutlets} users={users} setUsers={setUsers} stocks={stocks} setStocks={setStocks} products={products} onBack={()=>{reloadData();setPage("menu");}} notify={notify}/>}
      {page==="saldo"     && isAdmin && <SaldoAppsPage saldoApps={saldoApps} setSaldoApps={setSaldoApps} saldoBank={saldoBank} setSaldoBank={setSaldoBank} onBack={()=>setPage("menu")} notify={notify}/>}


      {page==="dashboard"     && isAdmin && <DashboardPage transactions={transactions} products={products} outlets={outlets} stocks={stocks} onBack={()=>setPage("menu")}/>}
      {page==="dashboardbank"  && isAdmin && <BankDashboardPage bankTrx={allBankTrx} outlets={outlets} onBack={()=>setPage("menu")}/>}
      {page==="overall"   && isAdmin && <DashboardOverallPage transactions={transactions} outlets={outlets} onBack={()=>setPage("menu")}/>}
      {page==="laporan"   && isAdmin && <LaporanPage   transactions={transactions} outlets={outlets} onBack={()=>setPage("menu")}/>}

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
      {["produk","outlet","stok","dashboard","overall","laporan","saldo","saldobank","cashflow","monitor"].includes(page)&&!isAdmin&&!isMonitor&&(
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
