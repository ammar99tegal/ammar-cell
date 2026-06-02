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
    {id:"dashboard",icon:Ic.Dashboard(),label:"Dashboard",          desc:"Pantau omset & performa",      color:"#e67e22", bg:"#fef5e7", roles:["admin"]},
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
          {mainTab==="produk"&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button onClick={()=>setEditCats(p=>!p)} style={{background:editCats?"#fff":"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,padding:"5px 10px",color:editCats?"#0d9488":"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>✏️ Kategori</button>
              <button onClick={startBulkEdit} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,padding:"5px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>📝 Edit Massal</button>
              <button onClick={()=>{setShowImport(true);setImportText("");setImportError("");}} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,padding:"5px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>📥 Import</button>
              <button onClick={exportCSV} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,padding:"5px 10px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>📤 Export</button>
              <button onClick={openAdd} style={{background:"linear-gradient(135deg,#fff,#e0faf5)",border:"none",borderRadius:9,padding:"5px 12px",color:"#0d9488",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>+ Tambah</button>
            </div>
          )}
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

        <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
          <div style={{position:"relative",flex:1}}>
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
              {fp.map((p,i)=>(
                <tr key={p.id}
                  draggable
                  onDragStart={()=>{ dragProdIdx.current=i; setDraggingProd(i); }}
                  onDragEnter={()=>{
                    if(dragProdIdx.current===null||dragProdIdx.current===i) return;
                    const next=[...fp];
                    const [moved]=next.splice(dragProdIdx.current,1);
                    next.splice(i,0,moved);
                    dragProdIdx.current=i;
                    setSortProd("default");
                    saveProdOrder(next.map(p=>String(p.id)));
                  }}
                  onDragOver={e=>e.preventDefault()}
                  onDragEnd={()=>{ dragProdIdx.current=null; setDraggingProd(null); }}
                  style={{borderTop:"1px solid #f0faf8",background:draggingProd===i?"#d0f5ee":i%2===0?"#fff":"#fafffe",cursor:"grab",opacity:draggingProd===i?0.7:1,boxShadow:draggingProd===i?"0 4px 12px rgba(13,148,136,.2)":"none",transition:"background .1s"}}
                  onMouseEnter={e=>{ if(draggingProd===null) e.currentTarget.style.background="#f0fdfb"; }}
                  onMouseLeave={e=>{ if(draggingProd===null) e.currentTarget.style.background=i%2===0?"#fff":"#fafffe"; }}>
                  <td style={{padding:"9px 12px",color:"#ccc",fontWeight:600}}>{i+1}</td>
                  <td style={{padding:"9px 6px",color:"#b2ede6",fontSize:16,cursor:"grab",userSelect:"none",textAlign:"center"}}>⠿</td>
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
              ))}
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
                        onDragStart={()=>{dragStokAdminIdx.current=i; setDraggingStokAdmin(i);}}
                        onDragEnter={()=>{
                          if(dragStokAdminIdx.current===null||dragStokAdminIdx.current===i) return;
                          const ord=filteredProds.map(x=>String(x.id));
                          const[mv]=ord.splice(dragStokAdminIdx.current,1);
                          ord.splice(i,0,mv);
                          dragStokAdminIdx.current=i;
                          setStokAdminOrder(ord);
                        }}
                        onDragOver={e=>e.preventDefault()}
                        onDragEnd={()=>{dragStokAdminIdx.current=null; setDraggingStokAdmin(null);}}
                        style={{borderTop:"1px solid #f0faf8",background:draggingStokAdmin===i?"#d0f5ee":i%2===0?"#fff":"#fafffe",cursor:"grab",opacity:draggingStokAdmin===i?0.7:1,transition:"background .1s"}}>
                        <td style={{padding:"7px 11px",color:"#ccc",fontWeight:600}}>{i+1}</td>
                        <td style={{padding:"7px 6px",color:"#b2ede6",fontSize:16,userSelect:"none",textAlign:"center"}}>⠿</td>
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
  const [chartMetric, setChartMetric] = useState("omset");
  const [period,      setPeriod]      = useState("daily");   // daily|monthly|yearly|custom
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

  const filteredTx = period === "custom" ? transactions.filter(isInRange) : transactions;
  const todayTrx   = transactions.filter(t=>t.date===today());
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
          const list=transactions.filter(t=>t.date===dateStr);
          pts.push({label,omset:calcOmset(list),profit:calcProfit(list)});
        }
      } else if(diffDays<=366){
        // monthly
        const cur=new Date(from.getFullYear(),from.getMonth(),1);
        while(cur<=to){
          const yr=cur.getFullYear(),mo=cur.getMonth();
          const label=cur.toLocaleDateString("id-ID",{month:"short",year:"2-digit"});
          const list=transactions.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr&&td.getMonth()===mo&&td>=from&&td<=to;});
          pts.push({label,omset:calcOmset(list),profit:calcProfit(list)});
          cur.setMonth(cur.getMonth()+1);
        }
      } else {
        // yearly
        for(let y=from.getFullYear();y<=to.getFullYear();y++){
          const list=transactions.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===y&&td>=from&&td<=to;});
          pts.push({label:String(y),omset:calcOmset(list),profit:calcProfit(list)});
        }
      }
    } else if(period==="daily"){
      for(let d=13;d>=0;d--){const dt=new Date(now);dt.setDate(now.getDate()-d);const label=dt.toLocaleDateString("id-ID",{day:"2-digit",month:"2-digit"});const dateStr=dt.toLocaleDateString("id-ID");const list=transactions.filter(t=>t.date===dateStr);pts.push({label,omset:calcOmset(list),profit:calcProfit(list)});}
    } else if(period==="monthly"){
      for(let m=11;m>=0;m--){const dt=new Date(now.getFullYear(),now.getMonth()-m,1);const yr=dt.getFullYear(),mo=dt.getMonth();const label=dt.toLocaleDateString("id-ID",{month:"short",year:"2-digit"});const list=transactions.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr&&td.getMonth()===mo;});pts.push({label,omset:calcOmset(list),profit:calcProfit(list)});}
    } else {
      for(let y=4;y>=0;y--){const yr=now.getFullYear()-y;const list=transactions.filter(t=>{const td=parseDate(t.date);return td&&td.getFullYear()===yr;});pts.push({label:String(yr),omset:calcOmset(list),profit:calcProfit(list)});}
    }
    return pts;
  };

  const chartData=getChartData();
  const rangedTx  = period==="custom" ? filteredTx : chartData.reduce((acc,_,i)=>{ /* use all */ return acc; }, filteredTx);
  const vals=chartData.map(p=>p[chartMetric]);
  const maxVal=Math.max(...vals,1);
  const cW=600,cH=160,pL=42,pR=10,pT=10,pB=28,iW=cW-pL-pR,iH=cH-pT-pB,n=chartData.length;
  const pts2=chartData.map((p,i)=>({x:pL+(i/((n-1)||1))*iW,y:pT+(1-p[chartMetric]/maxVal)*iH,val:p[chartMetric],label:p.label}));
  const linePath=pts2.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaPath=pts2.length>1?`${linePath} L${pts2[pts2.length-1].x},${pT+iH} L${pts2[0].x},${pT+iH} Z`:"";
  const lastTwo=pts2.slice(-2);
  const trend=lastTwo.length===2?(lastTwo[1].val>=lastTwo[0].val?"up":"down"):"up";
  const tC=trend==="up"?"#0d9488":"#ff4757";
  const gId=`g${chartMetric}${trend}`;
  const yLabels2=[0,.25,.5,.75,1].map(f=>({y:pT+iH*(1-f),val:maxVal*f}));
  const fmtS=n=>n>=1000000?`${(n/1000000).toFixed(1)}jt`:n>=1000?`${(n/1000).toFixed(0)}rb`:String(Math.round(n));

  const salesMap={},profitMap={};
  filteredTx.forEach(t=>t.items.filter(i=>!i.refunded).forEach(i=>{salesMap[i.name]=(salesMap[i.name]||0)+i.qty;profitMap[i.name]=(profitMap[i.name]||0)+(i.price-(i.modal||0))*i.qty;}));
  const fastMoving=Object.entries(salesMap).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const topProfit=Object.entries(profitMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const outletStats=outlets.map(o=>{const list=filteredTx.filter(t=>t.outletId===o.id);return{nama:o.nama,omset:calcOmset(list),profit:calcProfit(list),trx:list.length};}).sort((a,b)=>b.profit-a.profit);

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="📊 Dashboard" onBack={onBack}/>
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
              <span style={{fontWeight:900,fontSize:15,color:"#1a2e2a"}}>{trend==="up"?"📈":"📉"} Grafik {chartMetric==="omset"?"Omset":"Profit"}</span>
              <span style={{fontSize:12,fontWeight:700,color:tC,marginLeft:8,background:`${tC}18`,padding:"2px 9px",borderRadius:20}}>{trend==="up"?"▲ Naik":"▼ Turun"}</span>
              <div style={{fontSize:11,color:"#aaa",fontWeight:600,marginTop:2}}>
                {period==="custom"?`${dateFrom} s/d ${dateTo}`:period==="daily"?"14 Hari Terakhir":period==="monthly"?"12 Bulan Terakhir":"5 Tahun Terakhir"}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
              {/* Metric */}
              <div style={{display:"flex",gap:0,background:"#f0faf8",borderRadius:9,padding:3}}>
                {[{k:"omset",l:"Omset"},{k:"profit",l:"Profit"}].map(m=>(
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
          <div style={{overflowX:"auto"}}>
            <svg width="100%" viewBox={`0 0 ${cW} ${cH}`} style={{display:"block",minWidth:320}}>
              <defs>
                <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={tC} stopOpacity="0.22"/><stop offset="100%" stopColor={tC} stopOpacity="0.01"/>
                </linearGradient>
              </defs>
              {yLabels2.map((yl,i)=>(
                <g key={i}>
                  <line x1={pL} y1={yl.y} x2={cW-pR} y2={yl.y} stroke="#e8f8f5" strokeWidth="1"/>
                  <text x={pL-4} y={yl.y+4} textAnchor="end" fontSize="9" fill="#bbb" fontFamily="Nunito,sans-serif">{fmtS(yl.val)}</text>
                </g>
              ))}
              {pts2.length>1&&<path d={areaPath} fill={`url(#${gId})`}/>}
              {pts2.length>1&&<path d={linePath} fill="none" stroke={tC} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>}
              {pts2.map((p,i)=>(
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke={tC} strokeWidth="2.5"/>
                  <text x={p.x} y={pT+iH+17} textAnchor="middle" fontSize="9" fill="#999" fontFamily="Nunito,sans-serif">{p.label}</text>
                  {n<=8&&p.val>0&&<text x={p.x} y={p.y-8} textAnchor="middle" fontSize="9" fill={tC} fontWeight="700" fontFamily="Nunito,sans-serif">{fmtS(p.val)}</text>}
                  <title>{p.label}: {fmtRp(p.val)}</title>
                </g>
              ))}
              {pts2.length===0&&<text x={cW/2} y={cH/2} textAnchor="middle" fill="#ccc" fontSize="12">Belum ada data</text>}
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
function LaporanBankList({ bankTrxMap, bankShiftLogs, outlets, filterOutlet, onSelectShift }) {
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
    // Auto reload setiap 10 detik
    const iv = setInterval(loadBankTrx, 10000);
    // Realtime update — reload full saat ada perubahan
    const ch = supabase.channel("laporan-bank-rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"UPDATE",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"bank_transactions"},()=>{ loadBankTrx(); })
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
        const shiftLog = bankShiftLogs[g.key];
        const uangSistem = g.masuk - g.keluar + (shiftLog?.cashKemb||0);
        const selisih = shiftLog ? (shiftLog.uangLaci||0) - uangSistem : null;
        return (
          <div key={g.key} onClick={()=>onSelectShift({key:g.key,label:g.outletNama+" "+g.tgl,outletNama:g.outletNama,outletId:g.outletId,items:[],bankKey:g.key})}
            style={{background:"#fff",borderRadius:13,padding:"14px 16px",marginBottom:10,border:"2px solid #e0f5f1",cursor:"pointer",transition:"all .2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#0d9488";e.currentTarget.style.boxShadow="0 2px 12px rgba(13,148,136,.12)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#e0f5f1";e.currentTarget.style.boxShadow="none";}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:800,fontSize:14,color:"#1a2e2a"}}>{g.outletNama}</div>
                <div style={{fontSize:11,color:"#aaa",marginTop:2}}>{fmtTgl(g.tgl)} · {g.trx.length} transaksi bank</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{fmtRp(uangSistem)}</div>
                <div style={{fontSize:10,color:"#aaa"}}>uang sistem</div>
              </div>
            </div>
            {/* Mini rekap */}
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <div style={{background:"#e8f8f0",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:"#27ae60"}}>
                ⬇ Masuk {fmtRp(g.masuk)}
              </div>
              <div style={{background:"#fff0f0",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:"#e74c3c"}}>
                ⬆ Keluar {fmtRp(g.keluar)}
              </div>
              {selisih!==null&&(
                <div style={{background:selisih===0?"#e8f8f4":selisih>0?"#fffbe6":"#fff0f0",borderRadius:8,padding:"5px 11px",fontSize:11,fontWeight:700,color:selisih===0?"#27ae60":selisih>0?"#f39c12":"#e74c3c"}}>
                  {selisih===0?"✅ Balance":selisih>0?"📈 Lebih":"📉 Kurang"} {selisih!==0?fmtRp(Math.abs(selisih)):""}
                </div>
              )}
            </div>
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const allShifts = [...new Map(transactions.filter(t=>t.shiftId).map(t=>[t.shiftId,{id:t.shiftId,nama:t.shiftNama||t.shiftId}])).values()];

  const filtered = transactions.filter(t=>
    (filterOutlet==="all"||t.outletId===filterOutlet)&&
    (filterShift==="all"||(filterShift==="noshift"?!t.shiftId:t.shiftId===filterShift))
  );

  const groups = {};
  filtered.forEach(t=>{
    const key=t.shiftId||"no-shift";
    const label=t.shiftNama||"Tanpa Shift";
    const outletNama=outlets.find(o=>o.id===t.outletId)?.nama||"—";
    if(!groups[key]) groups[key]={key,label,outletNama,outletId:t.outletId,items:[]};
    groups[key].items.push(t);
  });
  // Tambahkan shift dari shift_logs yang belum ada di transactions (shift 0 transaksi / ditutup tapi belum load)
  Object.entries(shiftLogs).forEach(([k,v])=>{
    // Skip key format outlet_date (bukan shiftId murni)
    if(k.includes('_') && !k.startsWith('S')) return;
    if(groups[k]) return; // sudah ada dari transactions
    if(v.type!=="closed" && v.type!=="open") return;
    const oId = v.outletId || '';
    // Cek filter outlet
    if(filterOutlet!=="all" && oId && oId!==filterOutlet) return;
    // Cek filter shift
    if(filterShift!=="all" && k!==filterShift) return;
    const outletNama=outlets.find(o=>o.id===oId)?.nama||"—";
    groups[k]={key:k,label:v.namaShift||k,outletNama,outletId:oId,items:[]};
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
          // Store by both id and outlet+date for flexible lookup
          const entry = {
            id: l.id, outletId: l.outlet_id, userId: l.user_id,
            nama: l.nama, waktuBuka: l.start_time, waktuTutup: l.end_time,
            saldoAwal:  so.saldoApps||so.saldo_apps||{},
            cashKemb:   so.cashKemb||so.cashKembalian||0,
            saldoAkhir: sc.saldoAppsAkhir||sc.saldoAppsC||sc.saldo_apps_akhir||{},
            uangLaci:   sc.uangLaci||0, uangSistem: sc.uangSistem||0,
            selisih:    sc.selisih??0,  catatan: sc.catatan||'',
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
    // Reload setiap 10 detik — lebih responsif
    const iv = setInterval(loadLogs, 10000);

    // Realtime: reload saat ada perubahan shift atau transaksi bank baru
    const ch = supabase.channel('laporan-shift-rt')
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'shift_logs'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'shift_logs'},()=>{ loadLogs(); })
      .on('postgres_changes',{event:'DELETE',schema:'public',table:'active_shifts'},()=>{ loadLogs(); })
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
            <button onClick={()=>setRefreshTrigger(p=>p+1)}
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
                  onDragStart={()=>{ dragStokIdx.current=i; setDraggingStok(i); }}
                  onDragEnter={()=>{
                    if(dragStokIdx.current===null||dragStokIdx.current===i) return;
                    const ord=filteredP.map(x=>String(x.id));
                    const [mv]=ord.splice(dragStokIdx.current,1);
                    ord.splice(i,0,mv);
                    dragStokIdx.current=i;
                    saveStokOrder(ord);
                  }}
                  onDragOver={e=>e.preventDefault()}
                  onDragEnd={()=>{ dragStokIdx.current=null; setDraggingStok(null); }}
                  style={{borderTop:"1px solid #f0faf8",background:draggingStok===i?"#d0f5ee":i%2===0?"#fff":"#fafffe",cursor:"grab",opacity:draggingStok===i?0.7:1,transition:"background .1s"}}>
                  <td style={{padding:"7px 11px",color:"#ccc"}}>{i+1}</td>
                  <td style={{padding:"7px 6px",color:"#b2ede6",fontSize:16,userSelect:"none",textAlign:"center"}}>⠿</td>
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

  const [trxList,     setTrxList]    = useState([]);
  const [shift,       setShiftState] = useState(null);
  const [showShift,   setShowShift]  = useState(false);
  const [shiftMode,   setShiftMode]  = useState("open");
  const [showForm,    setShowForm]   = useState(false);
  const [editTrx,     setEditTrx]    = useState(null);
  const [showSetor,   setShowSetor]  = useState(false);
  const [showPinjam,  setShowPinjam] = useState(false);
  const [setorNom,    setSetorNom]   = useState("");
  const [setorNama,   setSetorNama]  = useState("SETOR TUNAI");
  const [pinjamNom,   setPinjamNom]  = useState("");
  const [pinjamNama,  setPinjamNama] = useState("BANK PINJAM VOUCHER");
  const [filterJenis, setFilterJenis]= useState("semua");
  const [showBalance, setShowBalance]= useState(false);
  const [balanceVal,  setBalanceVal] = useState("");
  const [lastBalance, setLastBalance]= useState(null);
  const [loading,     setLoading]    = useState(true);

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    const load = async () => {
      try {
        const [trxs, activeShift] = await Promise.all([
          dbBank.getTransactions(),
          dbBank.getActiveShift(selectedOutlet, user.username),
        ]);
        setTrxList(trxs.filter(t=>t.outletId===selectedOutlet));
        if(activeShift) setShiftState(activeShift);
        try{ const b=localStorage.getItem(`bank_balance_${selectedOutlet}`); if(b) setLastBalance(JSON.parse(b)); }catch{}
        // Load shift dari localStorage juga sebagai fallback
        try{ const s=localStorage.getItem(`bank_shift_${selectedOutlet}`); if(s&&!activeShift) setShiftState(JSON.parse(s)); }catch{}
      } catch(e){ console.error(e); }
      setLoading(false);
    };
    load();
  },[selectedOutlet]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(()=>{
    const chTrx = supabase.channel(`bank-trx-${selectedOutlet}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_transactions'},(payload)=>{
        const row=payload.new;
        if(payload.eventType==='INSERT'&&row.outlet_id===selectedOutlet){
          const t={id:row.id,waktu:row.waktu,tgl:row.tgl,shiftId:row.shift_id,nama:row.nama,jenis:row.jenis,feeType:row.fee_type,fee:row.fee,nominal:row.nominal,netNominal:row.net_nominal,outletId:row.outlet_id};
          setTrxList(prev=>prev.find(x=>x.id===t.id)?prev:[t,...prev]);
        } else if(payload.eventType==='UPDATE'){
          setTrxList(prev=>prev.map(t=>t.id===row.id?{...t,nama:row.nama,jenis:row.jenis,feeType:row.fee_type,fee:row.fee,nominal:row.nominal,netNominal:row.net_nominal}:t));
        } else if(payload.eventType==='DELETE'){
          setTrxList(prev=>prev.filter(t=>t.id!==payload.old.id));
        }
      }).subscribe();
    const chShift = supabase.channel(`bank-shift-${selectedOutlet}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'bank_shifts'},(payload)=>{
        if(payload.eventType==='DELETE') { setShiftState(null); try{localStorage.removeItem(`bank_shift_${selectedOutlet}`);}catch{} }
        else if(payload.new?.outlet_id===selectedOutlet){
          const s=payload.new;
          const shiftData={id:s.id,nama:s.nama,start:s.start_time,...(s.saldo_data||{})};
          setShiftState(shiftData);
          try{localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(shiftData));}catch{}
        }
      }).subscribe();
    return ()=>{ supabase.removeChannel(chTrx); supabase.removeChannel(chShift); };
  },[selectedOutlet]);

  // Uang sistem = cash kembalian awal + transaksi shift (saldo aplikasi tidak dihitung)
  const cashKembShift = shift?.cashKemb||0;
  const uangSistem  = cashKembShift + trxList.filter(t=>t.shiftId===shift?.id).reduce((s,t)=>s+t.netNominal,0);
  const totalMasuk  = trxList.filter(t=>t.shiftId===shift?.id&&t.netNominal>0).reduce((s,t)=>s+t.netNominal,0);
  const totalKeluar = trxList.filter(t=>t.shiftId===shift?.id&&t.netNominal<0).reduce((s,t)=>s+Math.abs(t.netNominal),0);
  // Tampilkan hanya transaksi shift aktif saat ini
  const shiftTrxList = shift ? trxList.filter(t=>t.shiftId===shift.id) : [];
  const filtered = filterJenis==="semua"?shiftTrxList:filterJenis==="masuk"?shiftTrxList.filter(t=>t.netNominal>0):shiftTrxList.filter(t=>t.netNominal<0);
  const totalSaldo = shift?.saldoApps?Object.values(shift.saldoApps).reduce((s,v)=>s+(+v||0),0):0;

  const setShift = (val) => {
    setShiftState(val);
    try{ if(val) localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(val)); else localStorage.removeItem(`bank_shift_${selectedOutlet}`); }catch{}
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
    // Set shift dulu — jangan tunggu Supabase
    setShift(s);
    try{ localStorage.setItem(`bank_shift_${selectedOutlet}`,JSON.stringify(s)); }catch{}
    setShowShift(false);
    notify("Shift bank dibuka! ✓","ok");
    // Simpan ke Supabase di background
    dbBank.openShift(s,selectedOutlet,user.username).catch(e=>console.warn("Shift Supabase:",e));
  };

  const closeShift = async (data) => {
    try{
      await dbBank.closeShift(shift,selectedOutlet,user.username,{...data,waktuTutup:now()});
    }catch(e){ console.error("closeShift error:",e); }
    // Selalu tutup shift walau Supabase error
    setShift(null); setShowShift(false);
    notify(`Shift ditutup. Selisih: ${fmtRp(data.selisih||0)}`,data.selisih===0?"ok":"warn");
  };

  const saveTrx = async (trx) => {
    const makeRow = (data) => ({
      id:    uid(),
      waktu: now(),
      tgl:   today(),
      outletId: selectedOutlet,
      shiftId:  shift?.id,
      ...data,
    });

    if(editTrx){
      try{
        await dbBank.updateTransaction(editTrx.id, makeRow(trx));
        notify("Diperbarui ✓","ok");
      } catch{ notify("Gagal update!","err"); }
    } else if(trx.feeType==="tarik" && (+trx.fee||0)>0){
      // TARIK → 2 baris terpisah
      try{
        await dbBank.addTransaction(makeRow({nama:trx.nama+" (TARIK)",    jenis:"keluar",feeType:"tarik",fee:0,nominal:trx.nominal,netNominal:-(trx.nominal)}));
        await dbBank.addTransaction(makeRow({nama:trx.nama+" (FEE TARIK)",jenis:"masuk", feeType:"tarik",fee:0,nominal:trx.fee,    netNominal:+(trx.fee)}));
        notify("Tersimpan ✓","ok");
      } catch(e){ console.error(e); notify("Gagal simpan!","err"); }
    } else {
      try{
        await dbBank.addTransaction(makeRow(trx));
        notify("Tersimpan ✓","ok");
      } catch(e){ console.error(e); notify("Gagal simpan!","err"); }
    }
    setShowForm(false);
    setEditTrx(null);
  };

  const deleteTrx = async (id) => {
    try{ await dbBank.deleteTransaction(id); notify("Dihapus","warn"); }
    catch{ notify("Gagal hapus!","err"); }
  };

  if(loading) return <div style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}><div style={{fontSize:14,color:"#0d9488",fontWeight:700}}>⏳ Memuat data bank...</div></div>;

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488,#14b8a6)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(13,148,136,.35)"}}>
        <div style={{padding:"0 16px",display:"flex",alignItems:"center",minHeight:50}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 12px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",marginRight:10,fontFamily:"inherit"}}>← Menu</button>
          <div style={{marginRight:"auto"}}>
            <div style={{fontWeight:900,fontSize:14,color:"#fff"}}>{outletNama} <span style={{opacity:.7,fontWeight:600,fontSize:12}}>· Bank</span></div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.6)",fontWeight:600}}>{user.nama}</div>
          </div>
          <div onClick={()=>{setShiftMode(shift?"close":"open");setShowShift(true);}} style={{background:shift?"rgba(255,255,255,.18)":"rgba(255,100,100,.3)",border:`1px solid ${shift?"rgba(255,255,255,.35)":"rgba(255,100,100,.6)"}`,borderRadius:20,padding:"5px 12px",cursor:"pointer",marginRight:8,fontSize:11,fontWeight:800,color:"#fff"}}>
            {shift?`⏱ ${shift.nama}`:"⚠ Buka Shift"}
          </div>
        </div>
        <div style={{background:"rgba(0,0,0,.12)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"4px 16px"}}>
          <BankMotivasi/>
        </div>
      </div>

      {!shift&&(
        <div style={{position:"fixed",inset:0,zIndex:200,background:"linear-gradient(135deg,rgba(10,122,112,.96),rgba(13,148,136,.96))",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:14,fontFamily:"'Nunito',sans-serif"}}>
          <div style={{fontSize:60}}>🔒</div>
          <div style={{fontWeight:900,fontSize:22,color:"#fff",textAlign:"center"}}>Shift Bank Belum Dibuka</div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.8)",textAlign:"center",maxWidth:300,lineHeight:1.7}}>Buka shift terlebih dahulu untuk mulai mencatat transaksi keuangan</div>
          <button onClick={()=>{setShiftMode("open");setShowShift(true);}} style={{background:"#fff",border:"none",borderRadius:14,padding:"14px 32px",color:"#0d9488",fontWeight:900,fontSize:16,cursor:"pointer",fontFamily:"inherit",marginTop:6,boxShadow:"0 8px 28px rgba(0,0,0,.2)"}}>🟢 Buka Shift Sekarang</button>
        </div>
      )}

      <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>
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

        {/* Tombol aksi — 3 sejajar di tengah */}
        <div style={{display:"flex",justifyContent:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
          <button onClick={()=>setShowSetor(true)}
            style={{background:"#fff",border:"2px solid #e74c3c",borderRadius:12,padding:"11px 20px",color:"#e74c3c",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            ⬆ Setor Tunai
          </button>
          <button onClick={()=>{setEditTrx(null);setShowForm(true);}}
            style={{background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:12,padding:"11px 32px",color:"#fff",fontWeight:800,fontSize:14,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 16px rgba(13,148,136,.3)",display:"flex",alignItems:"center",gap:6}}>
            ＋ Catat Transaksi
          </button>
          <button onClick={()=>setShowPinjam(true)}
            style={{background:"#fff",border:"2px solid #0d9488",borderRadius:12,padding:"11px 20px",color:"#0d9488",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
            ⬇ Bank Pinjam Voucher
          </button>
        </div>

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
          {filtered.length===0?<div style={{textAlign:"center",color:"#ccc",padding:40,fontSize:13}}>Belum ada transaksi</div>:
          filtered.map((t,i)=>(
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
          ))}
        </div>
      </div>

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
                const t={id:"S"+uid(),waktu:now(),tgl:today(),nama:setorNama,jenis:"keluar",feeType:"include",fee:0,nominal:+setorNom,netNominal:-(+setorNom),outletId:selectedOutlet,shiftId:shift?.id};
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
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>Uang masuk ke laci — bank pinjamkan modal/voucher</div>
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
                const t={id:"P"+uid(),waktu:now(),tgl:today(),nama:pinjamNama,jenis:"masuk",feeType:"include",fee:0,nominal:+pinjamNom,netNominal:+pinjamNom,outletId:selectedOutlet,shiftId:shift?.id};
                await saveTrx(t);
                setShowPinjam(false);setPinjamNom("");setPinjamNama("BANK PINJAM VOUCHER");
              }} style={{flex:1,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:900,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {showBalance&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:900}}>
          <div style={{background:"#fff",borderRadius:18,padding:22,width:340,fontFamily:"'Nunito',sans-serif",boxShadow:"0 20px 55px rgba(0,0,0,.25)"}}>
            <div style={{fontWeight:900,fontSize:15,color:"#0d9488",marginBottom:4}}>🔄 Cek Balance Laci</div>
            <div style={{fontSize:12,color:"#aaa",marginBottom:14}}>Hitung fisik uang di laci sekarang:</div>
            <div style={{background:"#f0faf8",borderRadius:9,padding:"9px 13px",marginBottom:12,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:12,color:"#555"}}>Uang Sistem</span>
              <span style={{fontWeight:800,color:"#0d9488"}}>{fmtRp(uangSistem)}</span>
            </div>
            <input type="number" value={balanceVal} onChange={e=>setBalanceVal(e.target.value)} placeholder="0" autoFocus
              style={{width:"100%",padding:"9px 12px",borderRadius:9,border:"2px solid #0d9488",fontSize:20,fontWeight:900,textAlign:"right",outline:"none",fontFamily:"inherit",marginBottom:10}}/>
            {balanceVal&&(
              <div style={{background:+balanceVal===uangSistem?"#e0faf5":+balanceVal>uangSistem?"#fffbe6":"#fff0f0",border:`2px solid ${+balanceVal===uangSistem?"#0d9488":+balanceVal>uangSistem?"#f39c12":"#e74c3c"}`,borderRadius:9,padding:"8px 12px",marginBottom:10,display:"flex",justifyContent:"space-between"}}>
                <span style={{fontSize:12,fontWeight:700}}>Selisih</span>
                <span style={{fontWeight:900,fontSize:16,color:+balanceVal===uangSistem?"#0d9488":+balanceVal>uangSistem?"#f39c12":"#e74c3c"}}>{+balanceVal===uangSistem?"✓ Balance":(+balanceVal>uangSistem?"+":"")+fmtRp(+balanceVal-uangSistem)}</span>
              </div>
            )}
            <div style={{fontSize:11,color:"#aaa",marginBottom:14}}>🕐 {new Date().toLocaleTimeString("id-ID")}</div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowBalance(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:10,fontWeight:700,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
              <button onClick={saveBalance} style={{flex:2,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:10,color:"#fff",fontWeight:800,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✓ Simpan Cek</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── BankShiftModal (komponen terpisah agar hooks aman) ────────────────────────
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

        {activeTab==="fastmoving"&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
            <div style={{padding:"14px 18px",borderBottom:"2px solid #e0f5f1",fontWeight:800,fontSize:14,color:"#0d9488"}}>🚀 Top 10 Produk Fast Moving</div>
            {fastMoving.length===0?<div style={{textAlign:"center",color:"#ccc",padding:40,fontSize:13}}>Belum ada data</div>:
            fastMoving.map(([name,qty],i)=>{
              const pct=Math.round((qty/(fastMoving[0]?.[1]||1))*100);
              const colors=["#0d9488","#14b8a6","#2dd4bf","#5eead4","#99f6e4","#b2f5ea","#ccfbf1","#e0fdfb","#f0fdfa","#f0faf8"];
              return <div key={name} style={{padding:"11px 18px",borderTop:i>0?"1px solid #f0faf8":"none"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:22,height:22,borderRadius:"50%",background:colors[i],color:i<5?"#fff":"#0d9488",fontWeight:900,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i+1}</div>
                    <span style={{fontSize:13,fontWeight:700}}>{name}</span>
                  </div>
                  <span style={{fontWeight:900,fontSize:13,color:"#0d9488"}}>{qty} pcs</span>
                </div>
                <div style={{background:"#e0faf5",borderRadius:20,height:4}}>
                  <div style={{background:"linear-gradient(90deg,#0d9488,#14b8a6)",height:"100%",width:`${pct}%`,borderRadius:20}}/>
                </div>
              </div>;
            })}
          </div>
        )}

        {activeTab==="analisis"&&(<>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
            {[
              {icon:"📈",t:"Tren Omset",v:totalOmset>0?"Positif ✓":"Belum ada data",c:"#27ae60",bg:"#e8f8f0",desc:`Total omset ${fmtRp(totalOmset)} dalam periode dipilih`},
              {icon:"💎",t:"Outlet Terbaik",v:outletStats[0]?.nama||"—",c:"#e67e22",bg:"#fef5e7",desc:`Profit tertinggi: ${fmtRp(outletStats[0]?.profit||0)}`},
              {icon:"🏆",t:"Produk Terlaris",v:fastMoving[0]?.[0]||"—",c:"#0d9488",bg:"#e0faf5",desc:`Terjual ${fastMoving[0]?.[1]||0} pcs dalam periode ini`},
              {icon:"📊",t:"Margin Rata-rata",v:`${totalOmset?Math.round(totalProfit/totalOmset*100):0}%`,c:"#8e44ad",bg:"#f5eeff",desc:`Profit ${fmtRp(totalProfit)} dari omset ${fmtRp(totalOmset)}`},
            ].map(ins=>(
              <div key={ins.t} style={{background:ins.bg,borderRadius:13,padding:"16px 18px",border:`1px solid ${ins.c}22`}}>
                <div style={{fontSize:28,marginBottom:8}}>{ins.icon}</div>
                <div style={{fontWeight:700,fontSize:11,color:ins.c,textTransform:"uppercase",marginBottom:4}}>{ins.t}</div>
                <div style={{fontWeight:900,fontSize:18,color:"#1a2e2a",marginBottom:5}}>{ins.v}</div>
                <div style={{fontSize:11,color:"#888",lineHeight:1.5}}>{ins.desc}</div>
              </div>
            ))}
          </div>
          <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",border:"2px solid #e0f5f1"}}>
            <div style={{fontWeight:800,fontSize:14,color:"#0d9488",marginBottom:12}}>🧠 Rekomendasi Berdasarkan Data Real</div>
            {[
              {icon:"📍",pr:"Tinggi",c:"#e74c3c",j:"Fokus Outlet Terbaik",isi:`${outletStats[0]?.nama||"Outlet"} adalah yang paling profitable. Pertahankan stok dan pelayanan terbaik di sini.`},
              {icon:"📦",pr:"Tinggi",c:"#e74c3c",j:"Jaga Stok Fast Moving",isi:`${fastMoving.slice(0,3).map(([n])=>n).join(", ")||"Produk terlaris"} — pastikan stok selalu tersedia untuk menghindari kehilangan penjualan.`},
              {icon:"📈",pr:"Sedang",c:"#f39c12",j:"Tingkatkan Margin",isi:`Margin saat ini ${totalOmset?Math.round(totalProfit/totalOmset*100):0}%. Target 30%+ dengan review harga jual dan negosiasi supplier.`},
              {icon:"🏪",pr:"Sedang",c:"#f39c12",j:"Optimalkan Outlet Terlemah",isi:`${outletStats[outletStats.length-1]?.nama||"Outlet"} perlu perhatian khusus — cek stok, kasir, dan promosi lokal.`},
            ].map(r=>(
              <div key={r.j} style={{display:"flex",gap:10,padding:"10px 12px",borderRadius:10,background:"#f0faf8",marginBottom:7,border:"1px solid #e0f5f1"}}>
                <span style={{fontSize:20,flexShrink:0}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:13}}>{r.j}</span>
                    <span style={{background:`${r.c}15`,color:r.c,fontSize:10,fontWeight:700,padding:"1px 7px",borderRadius:20}}>Prioritas {r.pr}</span>
                  </div>
                  <div style={{fontSize:12,color:"#888",lineHeight:1.5}}>{r.isi}</div>
                </div>
              </div>
            ))}
          </div>
        </>)}
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

// ── Tab Log Harian ────────────────────────────────────────────────────────────
function TabLog({log,setLog,onAddEntries,onDelete}) {
  const [tgl,      setTgl]     = useState(today());
  const [rowsIn,   setRowsIn]  = useState([{id:uid(),label:"",nominal:""},{id:uid(),label:"",nominal:""},{id:uid(),label:"",nominal:""}]);
  const [rowsOut,  setRowsOut] = useState([{id:uid(),label:"",nominal:""},{id:uid(),label:"",nominal:""},{id:uid(),label:"",nominal:""}]);
  const [rowsAset, setRowsAset]= useState([{id:uid(),label:"",nominal:""},{id:uid(),label:"",nominal:""}]);
  const [rowsMod,  setRowsMod] = useState([{id:uid(),label:"",nominal:""},{id:uid(),label:"",nominal:""}]);
  const [saved,    setSaved]   = useState(false);

  const totalIn   = rowsIn.reduce((s,r)=>s+toNumCF(r.nominal),0);
  const totalOut  = rowsOut.reduce((s,r)=>s+toNumCF(r.nominal),0);
  const totalAset = rowsAset.reduce((s,r)=>s+toNumCF(r.nominal),0);
  const totalMod  = rowsMod.reduce((s,r)=>s+toNumCF(r.nominal),0);
  const saldo     = totalIn-totalOut;

  const save = async () => {
    const entries=[];
    rowsIn.forEach(r=>{ if(r.label&&toNumCF(r.nominal)>0) entries.push({id:uid(),tgl,jenis:"masuk",kat:"manual",nama:r.label,nominal:toNumCF(r.nominal)}); });
    rowsOut.forEach(r=>{ if(r.label&&toNumCF(r.nominal)>0) entries.push({id:uid(),tgl,jenis:"keluar",kat:"manual",nama:r.label,nominal:toNumCF(r.nominal)}); });
    rowsAset.forEach(r=>{ if(r.label&&toNumCF(r.nominal)>0) entries.push({id:uid(),tgl,jenis:"aset_barang",kat:"aset",nama:r.label,nominal:toNumCF(r.nominal)}); });
    rowsMod.forEach(r=>{ if(r.label&&toNumCF(r.nominal)>0) entries.push({id:uid(),tgl,jenis:"aset_modal",kat:"modal",nama:r.label,nominal:toNumCF(r.nominal)}); });
    if(!entries.length) return;
    setLog(p=>[...entries,...p]); // optimistic
    if(onAddEntries) await onAddEntries(entries);
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };

  const handleDelete = async (id) => {
    setLog(p=>p.filter(x=>x.id!==id));
    if(onDelete) await onDelete(id);
  };

  return (
    <div>
      {/* Tanggal */}
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:12,fontWeight:700,color:CF.muted,flexShrink:0}}>Tanggal:</span>
        <input value={tgl} onChange={e=>setTgl(e.target.value)}
          style={{padding:"6px 11px",borderRadius:9,border:`2px solid ${CF.border}`,fontSize:13,outline:"none",fontFamily:"inherit",fontWeight:600}}/>
      </div>

      {/* Pemasukan & Pengeluaran berdampingan */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* PEMASUKAN */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${CF.green}44`,overflow:"hidden"}}>
          <div style={{background:`${CF.green}12`,padding:"10px 14px",borderBottom:`1px solid ${CF.green}22`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:900,fontSize:13,color:CF.green}}>⬇ PEMASUKAN</span>
            <span style={{fontWeight:800,fontSize:12,color:CF.green}}>{fmtRp(totalIn)}</span>
          </div>
          <div style={{padding:"8px 14px 12px"}}>
            <DynRows rows={rowsIn} setRows={setRowsIn} color={CF.green} placeholder="Sumber pemasukan..."/>
          </div>
        </div>

        {/* PENGELUARAN */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${CF.red}44`,overflow:"hidden"}}>
          <div style={{background:`${CF.red}12`,padding:"10px 14px",borderBottom:`1px solid ${CF.red}22`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontWeight:900,fontSize:13,color:CF.red}}>⬆ PENGELUARAN</span>
            <span style={{fontWeight:800,fontSize:12,color:CF.red}}>{fmtRp(totalOut)}</span>
          </div>
          <div style={{padding:"8px 14px 12px"}}>
            <DynRows rows={rowsOut} setRows={setRowsOut} color={CF.red} placeholder="Jenis pengeluaran..."/>
          </div>
        </div>
      </div>

      {/* HASIL AKHIR GABUNGAN */}
      <div style={{background:"#fff",borderRadius:14,border:`2px solid ${CF.teal}44`,padding:"14px 16px",marginBottom:14}}>
        <div style={{fontWeight:900,fontSize:13,color:CF.teal,marginBottom:12}}>📊 Hasil Akhir Hari Ini</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <div style={{background:`${CF.green}12`,borderRadius:10,padding:"11px 13px",border:`1px solid ${CF.green}33`}}>
            <div style={{fontSize:10,color:CF.green,fontWeight:700,marginBottom:3}}>TOTAL PEMASUKAN</div>
            <div style={{fontWeight:900,fontSize:18,color:CF.green}}>{fmtRp(totalIn)}</div>
          </div>
          <div style={{background:`${CF.red}12`,borderRadius:10,padding:"11px 13px",border:`1px solid ${CF.red}33`}}>
            <div style={{fontSize:10,color:CF.red,fontWeight:700,marginBottom:3}}>TOTAL PENGELUARAN</div>
            <div style={{fontWeight:900,fontSize:18,color:CF.red}}>{fmtRp(totalOut)}</div>
          </div>
          <div style={{background:saldo>=0?`${CF.teal}12`:`${CF.red}12`,borderRadius:10,padding:"11px 13px",border:`1px solid ${saldo>=0?CF.teal:CF.red}33`}}>
            <div style={{fontSize:10,color:saldo>=0?CF.teal:CF.red,fontWeight:700,marginBottom:3}}>SALDO BERSIH</div>
            <div style={{fontWeight:900,fontSize:18,color:saldo>=0?CF.teal:CF.red}}>{saldo>=0?"+":"-"}{fmtRp(saldo)}</div>
          </div>
        </div>
      </div>

      {/* ASET */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
        {/* Aset Barang/Device */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${CF.purple}44`,overflow:"hidden"}}>
          <div style={{background:`${CF.purple}12`,padding:"10px 14px",borderBottom:`1px solid ${CF.purple}22`}}>
            <div style={{fontWeight:900,fontSize:13,color:CF.purple}}>🖥️ Aset Bertambah</div>
            <div style={{fontSize:10,color:CF.purple,marginTop:2,opacity:.8}}>Device, komputer, barang konter, dll</div>
          </div>
          <div style={{padding:"8px 14px 12px"}}>
            <DynRows rows={rowsAset} setRows={setRowsAset} color={CF.purple} placeholder="Nama aset barang..."/>
          </div>
          {totalAset>0&&<div style={{background:`${CF.purple}12`,padding:"8px 14px",borderTop:`1px solid ${CF.purple}22`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:800,fontSize:12,color:CF.purple}}>Total Aset Bertambah</span>
            <span style={{fontWeight:900,fontSize:13,color:CF.purple}}>{fmtRp(totalAset)}</span>
          </div>}
        </div>

        {/* Aset Modal Berputar */}
        <div style={{background:"#fff",borderRadius:14,border:`2px solid ${CF.blue}44`,overflow:"hidden"}}>
          <div style={{background:`${CF.blue}12`,padding:"10px 14px",borderBottom:`1px solid ${CF.blue}22`}}>
            <div style={{fontWeight:900,fontSize:13,color:CF.blue}}>🔄 Aset Modal Diputar</div>
            <div style={{fontSize:10,color:CF.blue,marginTop:2,opacity:.8}}>Voucer, SP, aksesoris, stok diputar</div>
          </div>
          <div style={{padding:"8px 14px 12px"}}>
            <DynRows rows={rowsMod} setRows={setRowsMod} color={CF.blue} placeholder="Nama modal berputar..."/>
          </div>
          {totalMod>0&&<div style={{background:`${CF.blue}12`,padding:"8px 14px",borderTop:`1px solid ${CF.blue}22`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:800,fontSize:12,color:CF.blue}}>Total Modal Diputar</span>
            <span style={{fontWeight:900,fontSize:13,color:CF.blue}}>{fmtRp(totalMod)}</span>
          </div>}
        </div>
      </div>

      {/* Ringkasan aset */}
      {(totalAset>0||totalMod>0)&&(
        <div style={{background:"#fff",borderRadius:13,border:`2px solid ${CF.border}`,padding:"13px 16px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:CF.text,marginBottom:10}}>💼 Ringkasan Aset Hari Ini</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <div style={{background:`${CF.purple}12`,borderRadius:9,padding:"9px 12px"}}>
              <div style={{fontSize:10,color:CF.purple,fontWeight:700}}>ASET BARANG/DEVICE</div>
              <div style={{fontWeight:900,fontSize:16,color:CF.purple,marginTop:2}}>{fmtRp(totalAset)}</div>
            </div>
            <div style={{background:`${CF.blue}12`,borderRadius:9,padding:"9px 12px"}}>
              <div style={{fontSize:10,color:CF.blue,fontWeight:700}}>MODAL BERPUTAR</div>
              <div style={{fontWeight:900,fontSize:16,color:CF.blue,marginTop:2}}>{fmtRp(totalMod)}</div>
            </div>
            <div style={{background:`${CF.orange}12`,borderRadius:9,padding:"9px 12px"}}>
              <div style={{fontSize:10,color:CF.orange,fontWeight:700}}>TOTAL ASET</div>
              <div style={{fontWeight:900,fontSize:16,color:CF.orange,marginTop:2}}>{fmtRp(totalAset+totalMod)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Simpan */}
      <button onClick={save}
        style={{width:"100%",background:saved?"#27ae60":`linear-gradient(135deg,${CF.teal},#14b8a6)`,border:"none",borderRadius:12,padding:13,color:"#fff",fontWeight:900,fontSize:15,cursor:"pointer",fontFamily:"inherit",transition:"background .3s"}}>
        {saved?"✅ Tersimpan!":"💾 Simpan Semua Entri"}
      </button>

      {/* Riwayat */}
      {log.length>0&&(
        <div style={{background:"#fff",borderRadius:13,border:`2px solid ${CF.border}`,overflow:"hidden",marginTop:14}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${CF.border}`,fontWeight:800,fontSize:13,color:CF.text}}>📋 Riwayat Log</div>
          {[...new Set(log.map(e=>e.tgl))].map(tglRow=>(
            <div key={tglRow}>
              <div style={{background:CF.teal2,padding:"4px 14px",fontSize:11,fontWeight:800,color:CF.teal}}>{tglRow}</div>
              {log.filter(e=>e.tgl===tglRow).map((e,i)=>{
                const color=e.jenis==="masuk"?CF.green:e.jenis==="keluar"?CF.red:e.jenis==="aset_barang"?CF.purple:CF.blue;
                const icon=e.jenis==="masuk"?"⬇":e.jenis==="keluar"?"⬆":e.jenis==="aset_barang"?"🖥️":"🔄";
                return(
                  <div key={e.id} style={{display:"flex",gap:8,padding:"7px 14px",borderTop:`1px solid ${CF.bg}`,background:i%2===0?"#fff":"#fafffe",alignItems:"center"}}>
                    <span style={{fontSize:13,flexShrink:0}}>{icon}</span>
                    <span style={{flex:1,fontSize:12,fontWeight:600}}>{e.nama}</span>
                    <span style={{fontWeight:800,fontSize:12,color}}>{e.jenis==="keluar"?"-":"+"}{fmtRp(e.nominal)}</span>
                    <button onClick={()=>handleDelete(e.id)} style={{background:"transparent",border:"none",color:"#ccc",fontSize:13,cursor:"pointer"}}>✕</button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab Analisis (dengan Aset) ────────────────────────────────────────────────
function TabAnalisis({log}) {
  const masuk   = log.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const keluar  = log.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);
  const asetBrg = log.filter(e=>e.jenis==="aset_barang").reduce((s,e)=>s+e.nominal,0);
  const asetMod = log.filter(e=>e.jenis==="aset_modal"||e.jenis==="aset_modal").reduce((s,e)=>s+e.nominal,0);
  const laba    = masuk-keluar;
  const margin  = masuk>0?((laba/masuk)*100):0;
  const days    = [...new Set(log.map(e=>e.tgl))].length||1;
  const rataHari= masuk/days;
  const kondisi = margin>=20?"sehat":margin>=10?"cukup":"perhatian";
  const kColor  = kondisi==="sehat"?CF.green:kondisi==="cukup"?CF.orange:CF.red;

  // Aset per item
  const asetBrgList = log.filter(e=>e.jenis==="aset_barang");
  const asetModList = log.filter(e=>e.jenis==="aset_modal");

  return (
    <div>
      {/* Status */}
      <div style={{background:`${kColor}12`,border:`2px solid ${kColor}`,borderRadius:13,padding:"14px",marginBottom:14,display:"flex",gap:12,alignItems:"center"}}>
        <div style={{width:44,height:44,borderRadius:12,background:kColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
          {kondisi==="sehat"?"✅":kondisi==="cukup"?"⚠️":"❗"}
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:14,color:kColor}}>Kondisi Bisnis: {kondisi.toUpperCase()}</div>
          <div style={{fontSize:11,color:CF.muted}}>Margin {margin.toFixed(1)}% · Rata {fmtRp(rataHari)}/hari</div>
        </div>
      </div>

      {/* Aset Barang/Device */}
      {asetBrgList.length>0&&(
        <div style={{background:"#fff",borderRadius:13,border:`2px solid ${CF.purple}33`,overflow:"hidden",marginBottom:14}}>
          <div style={{background:`${CF.purple}12`,padding:"10px 14px",borderBottom:`1px solid ${CF.purple}22`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:800,fontSize:13,color:CF.purple}}>🖥️ Aset Barang / Device Konter</span>
            <span style={{fontWeight:900,fontSize:13,color:CF.purple}}>{fmtRp(asetBrg)}</span>
          </div>
          {asetBrgList.map((e,i)=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",borderTop:i>0?`1px solid ${CF.bg}`:"none",fontSize:12}}>
              <span style={{fontWeight:600}}>{e.nama}</span>
              <span style={{fontWeight:800,color:CF.purple}}>{fmtRp(e.nominal)}</span>
            </div>
          ))}
          <div style={{background:`${CF.purple}08`,padding:"8px 14px",borderTop:`1px solid ${CF.purple}22`,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:900,color:CF.purple}}>
            <span>Total Aset Barang</span><span>{fmtRp(asetBrg)}</span>
          </div>
        </div>
      )}

      {/* Aset Modal Berputar */}
      {asetModList.length>0&&(
        <div style={{background:"#fff",borderRadius:13,border:`2px solid ${CF.blue}33`,overflow:"hidden",marginBottom:14}}>
          <div style={{background:`${CF.blue}12`,padding:"10px 14px",borderBottom:`1px solid ${CF.blue}22`,display:"flex",justifyContent:"space-between"}}>
            <span style={{fontWeight:800,fontSize:13,color:CF.blue}}>🔄 Aset Modal Diputar (Voucer, SP, dll)</span>
            <span style={{fontWeight:900,fontSize:13,color:CF.blue}}>{fmtRp(asetMod)}</span>
          </div>
          {asetModList.map((e,i)=>(
            <div key={e.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 14px",borderTop:i>0?`1px solid ${CF.bg}`:"none",fontSize:12}}>
              <span style={{fontWeight:600}}>{e.nama}</span>
              <span style={{fontWeight:800,color:CF.blue}}>{fmtRp(e.nominal)}</span>
            </div>
          ))}
          <div style={{background:`${CF.blue}08`,padding:"8px 14px",borderTop:`1px solid ${CF.blue}22`,display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:900,color:CF.blue}}>
            <span>Total Modal Diputar</span><span>{fmtRp(asetMod)}</span>
          </div>
        </div>
      )}

      {/* Total aset gabungan */}
      {(asetBrg+asetMod)>0&&(
        <div style={{background:`linear-gradient(135deg,${CF.purple},${CF.blue})`,borderRadius:13,padding:"13px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontWeight:800,fontSize:12,color:"rgba(255,255,255,.8)"}}>TOTAL ASET KESELURUHAN</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)"}}>Barang {fmtRp(asetBrg)} + Modal {fmtRp(asetMod)}</div>
          </div>
          <div style={{fontWeight:900,fontSize:22,color:"#fff"}}>{fmtRp(asetBrg+asetMod)}</div>
        </div>
      )}

      {/* Saran pisah rekening */}
      {laba>0&&(
        <div style={{background:"#fff8e1",border:`2px solid ${CF.orange}`,borderRadius:13,padding:"13px",marginBottom:14}}>
          <div style={{fontWeight:800,fontSize:13,color:CF.orange,marginBottom:8}}>💡 Saran Pisah Rekening dari Laba {fmtRp(laba)}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[
              {l:"💰 Tabungan (30%)",v:Math.floor(laba*.3/10000)*10000,c:CF.teal},
              {l:"🔄 Modal Usaha (40%)",v:Math.floor(laba*.4/10000)*10000,c:CF.blue},
              {l:"📦 Stok Cadangan (20%)",v:Math.floor(laba*.2/10000)*10000,c:CF.purple},
              {l:"🎯 Dana Darurat (10%)",v:Math.floor(laba*.1/10000)*10000,c:CF.orange},
            ].map(s=>(
              <div key={s.l} style={{background:`${s.c}12`,borderRadius:9,padding:"9px 12px",border:`1px solid ${s.c}33`}}>
                <div style={{fontSize:10,color:s.c,fontWeight:700}}>{s.l}</div>
                <div style={{fontWeight:900,fontSize:15,color:s.c,marginTop:2}}>{fmtRp(s.v)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proyeksi */}
      <div style={{background:"#fff",borderRadius:13,border:`2px solid ${CF.border}`,padding:"13px",marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:13,marginBottom:10}}>📈 Proyeksi 3 Bulan</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          {[{b:"Bulan 1",m:1.0},{b:"Bulan 2",m:1.05},{b:"Bulan 3",m:1.1}].map(p=>{
            const pm=masuk*p.m*30/days, pl=pm-keluar*30/days;
            return(
              <div key={p.b} style={{background:CF.bg,borderRadius:9,padding:"10px 11px",border:`1px solid ${CF.border}`}}>
                <div style={{fontWeight:800,fontSize:12,marginBottom:4}}>{p.b}</div>
                <div style={{fontWeight:800,fontSize:13,color:CF.green}}>{fmtRp(pm)}</div>
                <div style={{fontSize:10,color:CF.muted}}>est. masuk</div>
                <div style={{fontWeight:800,fontSize:12,color:pl>=0?CF.teal:CF.red,marginTop:3}}>{pl>=0?"+":"-"}{fmtRp(pl)}</div>
                <div style={{fontSize:10,color:CF.muted}}>est. laba</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Tab Laba Rugi ─────────────────────────────────────────────────────────────
function TabLabaRugi({log}) {
  const tglNow=today(), co="Ammar Cell";
  const inList=log.filter(e=>e.jenis==="masuk"), outList=log.filter(e=>e.jenis==="keluar");
  const ti=inList.reduce((s,e)=>s+e.nominal,0), to=outList.reduce((s,e)=>s+e.nominal,0);
  const lsb=ti-to, pjk=lsb>0?Math.floor(lsb*.01):0, lb=lsb-pjk;
  const catIn=[...new Set(inList.map(e=>e.nama))], catOut=[...new Set(outList.map(e=>e.nama))];

  const print=()=>{
    const w=window.open("","_blank");
    w.document.write(`<html><head><title>Laba Rugi</title><style>body{font-family:Arial;padding:40px;max-width:580px;margin:auto}h1{font-size:20px;text-align:center}h2,h3{text-align:center;font-weight:normal;color:#555;font-size:13px}.sec-title{font-weight:bold;text-transform:uppercase;font-size:12px;border-bottom:1px solid #ccc;padding-bottom:4px;margin:16px 0 8px}.row{display:flex;justify-content:space-between;font-size:12px;padding:3px 0}.indent{padding-left:20px;color:#444}.total{display:flex;justify-content:space-between;font-weight:bold;font-size:13px;border-top:1px solid #333;padding-top:5px;margin-top:4px}.grand{display:flex;justify-content:space-between;font-weight:bold;font-size:16px;border-top:3px double #333;border-bottom:3px double #333;padding:8px 6px;margin-top:10px;background:#f9f9f9}</style></head><body>
    <h1>${co}</h1><h2>Laporan Laba Rugi</h2><h3>${tglNow}</h3>
    <div class="sec-title">Pendapatan</div>
    ${catIn.map(n=>`<div class="row indent"><span>${n}</span><span>${fmtRp(inList.filter(e=>e.nama===n).reduce((s,e)=>s+e.nominal,0))}</span></div>`).join("")}
    <div class="total"><span>Total Pendapatan</span><span style="color:#27ae60">${fmtRp(ti)}</span></div>
    <div class="sec-title">Beban</div>
    ${catOut.map(n=>`<div class="row indent"><span>${n}</span><span>${fmtRp(outList.filter(e=>e.nama===n).reduce((s,e)=>s+e.nominal,0))}</span></div>`).join("")}
    <div class="total"><span>Total Beban</span><span style="color:#e74c3c">${fmtRp(to)}</span></div>
    <div class="row" style="margin-top:12px"><span>Laba sebelum pajak</span><span>${fmtRp(lsb)}</span></div>
    <div class="row" style="color:#888;font-size:11px"><span>Pajak 1% (estimasi UMKM)</span><span>(${fmtRp(pjk)})</span></div>
    <div class="grand"><span>Laba Bersih</span><span style="color:${lb>=0?"#27ae60":"#e74c3c"}">${fmtRp(lb)}</span></div>
    </body></html>`);
    w.document.close(); setTimeout(()=>w.print(),400);
  };

  return(
    <div>
      <div style={{background:"#fff",borderRadius:16,border:"2px solid #ddd",overflow:"hidden",maxWidth:600,margin:"0 auto",boxShadow:"0 4px 20px rgba(0,0,0,.08)"}}>
        <div style={{padding:"24px 32px 14px",textAlign:"center",borderBottom:"2px solid #1a2e2a"}}>
          <div style={{fontWeight:900,fontSize:20,color:"#1a2e2a"}}>{co}</div>
          <div style={{fontSize:13,fontWeight:600,color:"#555",marginTop:2}}>Laporan Laba Rugi</div>
          <div style={{fontSize:11,color:"#999",marginTop:1}}>{tglNow}</div>
        </div>
        <div style={{padding:"20px 32px"}}>
          <div style={{fontWeight:800,fontSize:12,textTransform:"uppercase",letterSpacing:".5px",borderBottom:"1px solid #ddd",paddingBottom:5,marginBottom:10,color:"#1a2e2a"}}>Pendapatan</div>
          {catIn.map(n=>{ const v=inList.filter(e=>e.nama===n).reduce((s,e)=>s+e.nominal,0); return(
            <div key={n} style={{display:"flex",justifyContent:"space-between",padding:"4px 0 4px 20px",fontSize:13,borderBottom:"1px dotted #f0f0f0"}}>
              <span style={{color:"#333"}}>{n}</span><span style={{fontWeight:600}}>{fmtRp(v)}</span>
            </div>
          );})}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",marginTop:4,borderTop:"1px solid #1a2e2a",fontWeight:800,fontSize:14,color:"#27ae60"}}>
            <span>Total Pendapatan</span><span>{fmtRp(ti)}</span>
          </div>
          <div style={{fontWeight:800,fontSize:12,textTransform:"uppercase",letterSpacing:".5px",borderBottom:"1px solid #ddd",paddingBottom:5,margin:"16px 0 10px",color:"#1a2e2a"}}>Beban</div>
          {catOut.map(n=>{ const v=outList.filter(e=>e.nama===n).reduce((s,e)=>s+e.nominal,0); return(
            <div key={n} style={{display:"flex",justifyContent:"space-between",padding:"4px 0 4px 20px",fontSize:13,borderBottom:"1px dotted #f0f0f0"}}>
              <span style={{color:"#333"}}>{n}</span><span style={{fontWeight:600}}>{fmtRp(v)}</span>
            </div>
          );})}
          <div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",marginTop:4,borderTop:"1px solid #1a2e2a",fontWeight:800,fontSize:14,color:"#e74c3c"}}>
            <span>Total Beban</span><span>{fmtRp(to)}</span>
          </div>
          <div style={{borderTop:"1px solid #ccc",paddingTop:12,marginTop:4}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:13,color:"#333"}}>
              <span>Laba sebelum pajak</span><span style={{fontWeight:700}}>{fmtRp(lsb)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",padding:"4px 0",fontSize:12,color:"#999"}}>
              <span>Pajak (1% — estimasi UMKM)</span><span>({fmtRp(pjk)})</span>
            </div>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 8px",marginTop:8,borderTop:"3px double #1a2e2a",borderBottom:"3px double #1a2e2a",background:"#fafafa",borderRadius:4}}>
            <span style={{fontWeight:900,fontSize:16,color:"#1a2e2a"}}>Laba Bersih</span>
            <span style={{fontWeight:900,fontSize:22,color:lb>=0?"#27ae60":"#e74c3c"}}>{fmtRp(lb)}</span>
          </div>
          <div style={{marginTop:14,fontSize:10,color:"#bbb",textAlign:"center",lineHeight:1.7}}>
            * Laporan otomatis dari data input. Konsultasikan akuntan untuk keperluan perpajakan resmi.
          </div>
        </div>
      </div>
      <div style={{display:"flex",gap:10,justifyContent:"center",marginTop:14}}>
        <button onClick={print} style={{background:"linear-gradient(135deg,#e74c3c,#ff6b6b)",border:"none",borderRadius:11,padding:"10px 22px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>📄 Export & Print PDF</button>
        <button onClick={()=>{
          const rows=[["Tanggal","Jenis","Keterangan","Nominal"]];
          log.forEach(e=>rows.push([e.tgl,e.jenis,e.nama,e.nominal]));
          const a=document.createElement("a");
          a.href="data:text/csv;charset=utf-8,"+encodeURIComponent(rows.map(r=>r.join(",")).join("\n"));
          a.download="laba-rugi.csv"; a.click();
        }} style={{background:"linear-gradient(135deg,#27ae60,#2ecc71)",border:"none",borderRadius:11,padding:"10px 22px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>📥 Export CSV</button>
      </div>
    </div>
  );
}

// ── Tab Buku Besar ─────────────────────────────────────────────────────────────
function TabBukuBesar({log}) {
  const byDate={};
  log.forEach(e=>{
    if(!byDate[e.tgl])byDate[e.tgl]={tgl:e.tgl,masuk:0,keluar:0,entries:[]};
    byDate[e.tgl].entries.push(e);
    if(e.jenis==="masuk")byDate[e.tgl].masuk+=e.nominal;
    else if(e.jenis==="keluar")byDate[e.tgl].keluar+=e.nominal;
  });
  const rows=Object.values(byDate).sort((a,b)=>b.tgl.localeCompare(a.tgl));
  const colorJenis=j=>j==="masuk"?CF.green:j==="keluar"?CF.red:j==="aset_barang"?CF.purple:CF.blue;
  return(
    <div style={{background:"#fff",borderRadius:13,border:`2px solid ${CF.border}`,overflow:"hidden"}}>
      <div style={{padding:"10px 14px",borderBottom:`1px solid ${CF.border}`,fontWeight:800,fontSize:13}}>📚 Buku Besar</div>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{background:CF.teal2}}>
          {["Tgl","Keterangan","Jenis","Masuk","Keluar","Aset"].map(h=>(
            <th key={h} style={{padding:"8px 11px",textAlign:"left",fontWeight:800,color:CF.teal}}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.flatMap((r,ri)=>[
            ...r.entries.map((e,ei)=>(
              <tr key={e.id} style={{borderTop:`1px solid ${CF.bg}`,background:ri%2===0?"#fff":"#fafffe"}}>
                <td style={{padding:"5px 11px",color:CF.muted,fontSize:10}}>{ei===0?e.tgl:""}</td>
                <td style={{padding:"5px 11px",fontWeight:600}}>{e.nama}</td>
                <td style={{padding:"5px 11px"}}><span style={{background:colorJenis(e.jenis)+"15",color:colorJenis(e.jenis),fontSize:9,fontWeight:700,padding:"1px 6px",borderRadius:20}}>{e.jenis}</span></td>
                <td style={{padding:"5px 11px",color:CF.green,fontWeight:700}}>{e.jenis==="masuk"?fmtRp(e.nominal):"—"}</td>
                <td style={{padding:"5px 11px",color:CF.red,fontWeight:700}}>{e.jenis==="keluar"?fmtRp(e.nominal):"—"}</td>
                <td style={{padding:"5px 11px",color:CF.purple,fontWeight:700}}>{(e.jenis==="aset_barang"||e.jenis==="aset_modal")?fmtRp(e.nominal):"—"}</td>
              </tr>
            )),
            <tr key={r.tgl+"s"} style={{borderTop:`2px solid ${CF.border}`,background:`${CF.teal}08`}}>
              <td colSpan={2} style={{padding:"6px 11px",fontWeight:800,color:CF.teal,fontSize:11}}>Subtotal {r.tgl}</td>
              <td style={{padding:"6px 11px"}}></td>
              <td style={{padding:"6px 11px",fontWeight:900,color:CF.green}}>{fmtRp(r.masuk)}</td>
              <td style={{padding:"6px 11px",fontWeight:900,color:CF.red}}>{fmtRp(r.keluar)}</td>
              <td style={{padding:"6px 11px",fontWeight:900,color:(r.masuk-r.keluar)>=0?CF.teal:CF.red}}>{(r.masuk-r.keluar)>=0?"+":"-"}{fmtRp(r.masuk-r.keluar)}</td>
            </tr>
          ])}
        </tbody>
      </table>
      {rows.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:24}}>Belum ada data</div>}
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const INIT=[
  {id:"1",tgl:"29/05/2026",jenis:"masuk",kat:"m",nama:"Pemasukan Merpati",nominal:2800000},
  {id:"2",tgl:"29/05/2026",jenis:"masuk",kat:"c",nama:"Pemasukan Cikrik",nominal:1200000},
  {id:"3",tgl:"29/05/2026",jenis:"keluar",kat:"v",nama:"Pembelian voucer",nominal:1500000},
  {id:"4",tgl:"29/05/2026",jenis:"aset_barang",kat:"a",nama:"Laptop kasir baru",nominal:3500000},
  {id:"5",tgl:"29/05/2026",jenis:"aset_modal",kat:"m",nama:"Stok voucer Telkomsel",nominal:2000000},
];


function CashflowPage({ transactions, outlets, onBack, notify }) {
  const [tab, setTab] = useState("log");
  const [log, setLog] = useState([]);

  // Load from Supabase on mount
  useEffect(()=>{
    dbCashflow.getEntries().then(entries=>{
      setLog(entries.map(e=>({id:e.id,tgl:e.tgl,jenis:e.jenis,kat:e.kategori||e.jenis,nama:e.nama,nominal:e.nominal})));
    }).catch(()=>{});

    // Realtime
    const ch = supabase.channel("cashflow-rt")
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"cashflow_entries"},(payload)=>{
        const r=payload.new; if(!r) return;
        const e={id:r.id,tgl:r.tgl,jenis:r.jenis,kat:r.kategori||r.jenis,nama:r.nama,nominal:r.nominal};
        setLog(prev=>prev.find(x=>x.id===r.id)?prev:[e,...prev]);
      })
      .on("postgres_changes",{event:"DELETE",schema:"public",table:"cashflow_entries"},(payload)=>{
        const id=payload.old?.id; if(!id) return;
        setLog(prev=>prev.filter(x=>x.id!==id));
      })
      .subscribe();
    return ()=>supabase.removeChannel(ch);
  },[]);

  const addEntries = async (entries) => {
    for(const e of entries) {
      try { await dbCashflow.addEntry({id:e.id,tgl:e.tgl,jenis:e.jenis,nama:e.nama,nominal:e.nominal,sumber:"",kategori:e.kat||e.jenis}); }
      catch(err) { console.warn("addEntry:",err); }
    }
  };

  const deleteEntry = async (id) => {
    try { await dbCashflow.deleteEntry(id); } catch(err) { console.warn("deleteEntry:",err); }
  };

  const masuk  = log.filter(e=>e.jenis==="masuk").reduce((s,e)=>s+e.nominal,0);
  const keluar = log.filter(e=>e.jenis==="keluar").reduce((s,e)=>s+e.nominal,0);

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <div style={{background:"linear-gradient(135deg,#0a7a70,#0d9488)",position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 14px rgba(13,148,136,.3)"}}>
        <div style={{padding:"0 20px",minHeight:50,display:"flex",alignItems:"center"}}>
          <button onClick={onBack} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:20,padding:"5px 13px",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",fontFamily:"inherit",marginRight:12}}>← Menu</button>
          <div style={{fontWeight:900,fontSize:15,color:"#fff",flex:1}}>💼 Cashflow Manager</div>
        </div>
        <div style={{background:"rgba(0,0,0,.1)",borderTop:"1px solid rgba(255,255,255,.1)",padding:"6px 20px",display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          {[{l:"Total Masuk",v:`Rp ${new Intl.NumberFormat("id-ID").format(masuk)}`,c:"#a7f3d0"},{l:"Total Keluar",v:`Rp ${new Intl.NumberFormat("id-ID").format(keluar)}`,c:"#fca5a5"},{l:"Saldo",v:`Rp ${new Intl.NumberFormat("id-ID").format(masuk-keluar)}`,c:"#fcd34d"}].map(k=>(
            <div key={k.l} style={{textAlign:"center"}}>
              <div style={{fontWeight:900,fontSize:13,color:k.c}}>{k.v}</div>
              <div style={{fontSize:9,color:"rgba(255,255,255,.6)",fontWeight:600}}>{k.l}</div>
            </div>
          ))}
        </div>
        <div style={{display:"flex",borderTop:"1px solid rgba(255,255,255,.1)",overflowX:"auto"}}>
          {[{k:"log",l:"📋 Log Harian"},{k:"besar",l:"📚 Buku Besar"},{k:"labarugi",l:"📊 Laba Rugi"},{k:"analisis",l:"🎯 Analisis"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)}
              style={{padding:"10px 16px",border:"none",borderBottom:`3px solid ${tab===t.k?"#fff":"transparent"}`,background:"transparent",color:tab===t.k?"#fff":"rgba(255,255,255,.55)",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>
              {t.l}
            </button>
          ))}
        </div>
      </div>
      <div style={{padding:"14px 20px",maxWidth:1000,margin:"0 auto"}}>
        {tab==="log"      && <TabLog       log={log} setLog={setLog} onAddEntries={addEntries} onDelete={deleteEntry}/>}
        {tab==="besar"    && <TabBukuBesar  log={log}/>}
        {tab==="labarugi" && <TabLabaRugi   log={log}/>}
        {tab==="analisis" && <TabAnalisis   log={log}/>}
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
      if(h === 23 && lastResetDate !== dateStr) {
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

      // Cleanup shift > 24 jam sebagai fallback
      try {
        const cutoff = new Date(Date.now() - 24*60*60*1000).toISOString();
        await supabase.from('active_shifts').delete().lt('created_at', cutoff);
        await supabase.from('bank_shifts').delete().lt('created_at', cutoff);
      } catch(e) { console.warn('cleanup:', e); }
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
      .on('postgres_changes',{event:'*',schema:'public',table:'active_shifts'},()=>{
        // Trigger reload data
        reloadData();
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'shift_logs'},()=>{
        reloadData();
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


      {page==="dashboard" && isAdmin && <DashboardPage transactions={transactions} products={products} outlets={outlets} stocks={stocks} onBack={()=>setPage("menu")}/>}
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
