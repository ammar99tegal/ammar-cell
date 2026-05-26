import { useState, useEffect, useCallback } from "react";
import { db } from "./supabase.js";

// ══════════════════════════════════════════════════════════════════════════════
// INITIAL DATA
// ══════════════════════════════════════════════════════════════════════════════
const TEMPLATE_PRODUCTS = [
  { id:1,  name:"Indomie Goreng",       barcode:"8991101152", price:3500,  modal:2800,  category:"Mie" },
  { id:2,  name:"Aqua 600ml",           barcode:"8996001100", price:4000,  modal:3000,  category:"Minuman" },
  { id:3,  name:"Teh Botol 350ml",      barcode:"8992388000", price:5000,  modal:3800,  category:"Minuman" },
  { id:4,  name:"Roti Tawar Sari Roti", barcode:"8994350010", price:14000, modal:11000, category:"Roti" },
  { id:5,  name:"Susu Ultra 250ml",     barcode:"8999999010", price:5500,  modal:4200,  category:"Susu" },
  { id:6,  name:"Chitato 68g",          barcode:"8991101200", price:10000, modal:7500,  category:"Snack" },
  { id:7,  name:"Good Day Cappuccino",  barcode:"8998866010", price:3000,  modal:2200,  category:"Minuman" },
  { id:8,  name:"Roma Kelapa",          barcode:"8994350050", price:8000,  modal:6000,  category:"Snack" },
  { id:9,  name:"Minyak Goreng 1L",     barcode:"8992100010", price:18000, modal:15000, category:"Dapur" },
  { id:10, name:"Sabun Lifebuoy",       barcode:"8991101300", price:5000,  modal:3800,  category:"Kebersihan" },
  { id:11, name:"Pocari Sweat 500ml",   barcode:"8997005010", price:8000,  modal:6000,  category:"Minuman" },
  { id:12, name:"Biskuit Oreo",         barcode:"8993272010", price:9000,  modal:7000,  category:"Snack" },
];

const mkStock = (qty=50) => Object.fromEntries(TEMPLATE_PRODUCTS.map(p=>[p.id, qty]));

// Outlet: id, nama, alamat, aktif
// Stok per outlet: { outletId: { productId: qty } }
// Kasir per outlet: satu user per outlet
const INIT_OUTLETS = [
  { id:"o1", nama:"Ammar Cell Pusat",    alamat:"Jl. Utama No.1",   aktif:true },
  { id:"o2", nama:"Ammar Cell Cabang 1", alamat:"Jl. Cabang No.2",  aktif:true },
  { id:"o3", nama:"Ammar Cell Cabang 2", alamat:"Jl. Cabang No.3",  aktif:true },
];

const INIT_STOCKS = {
  o1: mkStock(80),
  o2: mkStock(50),
  o3: mkStock(30),
};

// users: username → { pass, role, nama, outletId }
const INIT_USERS = {
  "admin":  { pass:"admin123", role:"admin",    nama:"Admin",        outletId:null },
  "ammar":  { pass:"boss123",  role:"admin",    nama:"Ammar (Boss)", outletId:null },
  "kasir1": { pass:"kasir123", role:"karyawan", nama:"Kasir Pusat",  outletId:"o1" },
  "kasir2": { pass:"kasir456", role:"karyawan", nama:"Kasir Cabang1",outletId:"o2" },
  "kasir3": { pass:"kasir789", role:"karyawan", nama:"Kasir Cabang2",outletId:"o3" },
};

const SALDO_APPS = ["Digipos","Sidiva","Rita","OK","Dana","OVO","GoPay","ShopeePay","LinkAja","M-Kios"];

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
        <div style={{marginTop:16,background:"#f0faf8",borderRadius:10,padding:"10px 12px",fontSize:11}}>
          <div style={{fontWeight:800,color:"#0d9488",marginBottom:5}}>👤 Akun Demo:</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
            {Object.entries(users).map(([u,d])=>(
              <div key={u} onClick={()=>{setUsername(u);setPassword(d.pass);setError("");}}
                style={{background:"#fff",borderRadius:7,padding:"4px 8px",cursor:"pointer",border:"1px solid #e0f5f1"}}>
                <span style={{fontWeight:700,color:"#0d9488"}}>{u}</span>
                <span style={{fontSize:10,color:d.role==="admin"?"#8e44ad":"#888",marginLeft:4}}>{d.role==="admin"?"👑":d.outletId||"👷"}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MENU UTAMA
// ══════════════════════════════════════════════════════════════════════════════
function MenuUtama({ user, onNavigate, onLogout, stats }) {
  const menus = [
    {id:"kasir",    icon:Ic.Cart(),    label:"Kasir",             desc:"Buka transaksi penjualan",    color:"#0d9488", bg:"#e0faf5", roles:["admin","karyawan"]},
    {id:"produk",   icon:Ic.Produk(),  label:"Manajemen Produk",  desc:"Tambah, edit & hapus produk", color:"#8e44ad", bg:"#f5eeff", roles:["admin"]},
    {id:"outlet",   icon:Ic.Outlet(),  label:"Manajemen Outlet",  desc:"Kelola outlet & kasir",       color:"#2980b9", bg:"#e8f4fd", roles:["admin"]},
    {id:"stok",     icon:Ic.Stock(),   label:"Stok",              desc:"Stok masuk, keluar & transfer",color:"#27ae60", bg:"#e8f8f0", roles:["admin"]},
    {id:"dashboard",icon:Ic.Dashboard(),label:"Dashboard",        desc:"Pantau omset & performa",     color:"#e67e22", bg:"#fef5e7", roles:["admin"]},
    {id:"laporan",  icon:Ic.Laporan(), label:"Laporan",           desc:"Riwayat, per outlet & shift",  color:"#c0392b", bg:"#fff0f0", roles:["admin"]},
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
      <div style={{padding:"22px",maxWidth:720,margin:"0 auto"}}>
        {user.role==="admin"&&(
          <div style={{display:"flex",gap:10,marginBottom:22}}>
            {[{label:"Omset Hari Ini",val:fmtRp(stats.omsetHari),color:"#0d9488"},{label:"Transaksi",val:stats.txHari,color:"#2980b9"},{label:"Stok Menipis",val:stats.stokMenipis+" produk",color:"#ff4757"}].map(s=>(
              <div key={s.label} style={{flex:1,background:"#fff",borderRadius:12,padding:"12px 16px",border:"2px solid #e0f5f1"}}>
                <div style={{fontWeight:900,fontSize:18,color:s.color}}>{s.val}</div>
                <div style={{fontSize:11,color:"#aaa",fontWeight:600,marginTop:2}}>{s.label}</div>
              </div>
            ))}
          </div>
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
  const [uForm, setUForm] = useState({username:"",pass:"",nama:"",outletId:"",role:"karyawan"});

  const openAddOutlet = ()=>{ setEditOutlet(null); setOForm({nama:"",alamat:""}); setShowOutletForm(true); };
  const openEditOutlet= o=>{ setEditOutlet(o); setOForm({nama:o.nama,alamat:o.alamat}); setShowOutletForm(true); };
  const saveOutlet = ()=>{
    if (!oForm.nama.trim()) return notify("Isi nama outlet!","err");
    if (editOutlet) {
      setOutlets(prev=>prev.map(o=>o.id===editOutlet.id?{...o,...oForm}:o));
      notify("Outlet diperbarui","ok");
    } else {
      const id="o"+uid();
      setOutlets(prev=>[...prev,{id,nama:oForm.nama.trim(),alamat:oForm.alamat.trim(),aktif:true}]);
      setStocks(prev=>({...prev,[id]:Object.fromEntries(products.map(p=>[p.id,0]))}));
      notify("Outlet ditambahkan","ok");
    }
    setShowOutletForm(false);
  };
  const toggleOutlet = id=>setOutlets(prev=>prev.map(o=>o.id===id?{...o,aktif:!o.aktif}:o));
  const deleteOutlet = id=>{ setOutlets(prev=>prev.filter(o=>o.id!==id)); setStocks(prev=>{const s={...prev};delete s[id];return s;}); setConfirmDel(null); notify("Outlet dihapus","warn"); };

  const openAddUser  = ()=>{ setEditUser(null); setUForm({username:"",pass:"",nama:"",outletId:"",role:"karyawan"}); setShowUserForm(true); };
  const openEditUser = (u,k)=>{ setEditUser(k); setUForm({username:k,pass:u.pass,nama:u.nama,outletId:u.outletId||"",role:u.role}); setShowUserForm(true); };
  const saveUser = ()=>{
    if (!uForm.username.trim()||!uForm.pass||!uForm.nama) return notify("Isi semua field!","err");
    if (!editUser && users[uForm.username.toLowerCase()]) return notify("Username sudah ada!","err");
    const key = editUser||uForm.username.toLowerCase();
    setUsers(prev=>{
      const n={...prev};
      if(editUser&&editUser!==uForm.username.toLowerCase()){delete n[editUser];}
      n[uForm.username.toLowerCase()]={pass:uForm.pass,nama:uForm.nama.trim(),role:uForm.role,outletId:uForm.outletId||null};
      return n;
    });
    notify(editUser?"User diperbarui":"User ditambahkan","ok");
    setShowUserForm(false);
  };
  const deleteUser = k=>{ setUsers(prev=>{const n={...prev};delete n[k];return n;}); setConfirmDel(null); notify("User dihapus","warn"); };

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
                      <td style={{padding:"10px 13px"}}><span style={{background:u.role==="admin"?"#f5eeff":"#e0faf5",color:u.role==="admin"?"#8e44ad":"#0d9488",fontWeight:800,fontSize:10,padding:"2px 8px",borderRadius:6}}>{u.role==="admin"?"👑 Admin":"👷 Karyawan"}</span></td>
                      <td style={{padding:"10px 13px",color:"#555",fontSize:12}}>{outletNama}</td>
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
          <Field label="Username *" value={uForm.username} onChange={e=>setUForm(p=>({...p,username:e.target.value}))} placeholder="username (huruf kecil)..."/>
          <Field label="Password *" value={uForm.pass} onChange={e=>setUForm(p=>({...p,pass:e.target.value}))} placeholder="password..." type="password"/>
          <Field label="Nama Lengkap *" value={uForm.nama} onChange={e=>setUForm(p=>({...p,nama:e.target.value}))} placeholder="Nama tampil..."/>
          <div style={{marginBottom:10}}>
            <label style={{...lbl}}>Role *</label>
            <select value={uForm.role} onChange={e=>setUForm(p=>({...p,role:e.target.value}))} style={{...inp}}>
              <option value="karyawan">👷 Karyawan</option>
              <option value="admin">👑 Admin</option>
            </select>
          </div>
          <div style={{marginBottom:14}}>
            <label style={{...lbl}}>Outlet Tugasan {uForm.role==="admin"&&<span style={{color:"#aaa",fontWeight:500}}>(opsional untuk admin)</span>}</label>
            <select value={uForm.outletId} onChange={e=>setUForm(p=>({...p,outletId:e.target.value}))} style={{...inp}}>
              <option value="">— Tidak ada / Admin —</option>
              {outlets.map(o=><option key={o.id} value={o.id}>{o.nama}</option>)}
            </select>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowUserForm(false)} style={{flex:1,background:"#f0f0f0",border:"none",borderRadius:9,padding:11,fontWeight:700,fontSize:12,color:"#666",cursor:"pointer",fontFamily:"inherit"}}>Batal</button>
            <button onClick={saveUser} style={{flex:2,background:"linear-gradient(135deg,#0d9488,#14b8a6)",border:"none",borderRadius:9,padding:11,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
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

// ══════════════════════════════════════════════════════════════════════════════
// PRODUK (Master Produk — tanpa stok, stok ada di per outlet)
// ══════════════════════════════════════════════════════════════════════════════
function ProdukPage({ products, setProducts, stocks, setStocks, onBack, notify }) {
  const [showModal,  setShowModal]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState({name:"",barcode:"",category:"",price:"",modal:""});
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState("Semua");
  const [confirmDel, setConfirmDel] = useState(null);
  const [editCats,   setEditCats]   = useState(false); // mode edit kategori
  const [catForm,    setCatForm]    = useState(""); // nama kategori baru

  const allCats = ["Semua",...Array.from(new Set(products.map(p=>p.category)))];
  const uniqueCats = Array.from(new Set(products.map(p=>p.category)));
  const fp = products.filter(p=>(catFilter==="Semua"||p.category===catFilter)&&(p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search)));

  const openAdd  = ()=>{ setEditTarget(null); setForm({name:"",barcode:"",category:"",price:"",modal:""}); setShowModal(true); };
  const openEdit = p=>{ setEditTarget(p); setForm({name:p.name,barcode:p.barcode||"",category:p.category,price:String(p.price),modal:String(p.modal)}); setShowModal(true); };

  const save = ()=>{
    if(!form.name.trim())    return notify("Isi nama produk!","err");
    if(!form.price)          return notify("Isi harga jual!","err");
    if(!form.category.trim())return notify("Isi kategori!","err");
    if(editTarget){
      setProducts(prev=>prev.map(p=>p.id===editTarget.id?{...p,name:form.name.trim(),barcode:form.barcode.trim(),category:form.category.trim(),price:+form.price,modal:+form.modal||0}:p));
      notify("Produk diperbarui ✓","ok");
    } else {
      const newId=Math.max(0,...products.map(p=>p.id))+1;
      setProducts(prev=>[...prev,{id:newId,name:form.name.trim(),barcode:form.barcode.trim(),category:form.category.trim(),price:+form.price,modal:+form.modal||0}]);
      // tambah ke semua stok outlet dengan nilai 0
      setStocks(prev=>{ const s={...prev}; Object.keys(s).forEach(oid=>{s[oid]={...s[oid],[newId]:0};}); return s; });
      notify("Produk ditambahkan ✓","ok");
    }
    setShowModal(false);
  };

  const del = id=>{
    setProducts(prev=>prev.filter(p=>p.id!==id));
    setStocks(prev=>{ const s={...prev}; Object.keys(s).forEach(oid=>{const o={...s[oid]};delete o[id];s[oid]=o;}); return s; });
    setConfirmDel(null); notify("Produk dihapus","warn");
  };

  // Rename kategori
  const renameCategory = (oldCat, newCat)=>{
    if(!newCat.trim()||newCat===oldCat) return;
    setProducts(prev=>prev.map(p=>p.category===oldCat?{...p,category:newCat.trim()}:p));
    notify(`Kategori "${oldCat}" → "${newCat}"`, "ok");
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="🛍️ Manajemen Produk" onBack={onBack}
        right={
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>setEditCats(p=>!p)} style={{background:editCats?"#fff":"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,padding:"7px 12px",color:editCats?"#0d9488":"#fff",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>✏️ Kategori</button>
            <button onClick={openAdd} style={{background:"linear-gradient(135deg,#fff,#e0faf5)",border:"none",borderRadius:9,padding:"7px 14px",color:"#0d9488",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontFamily:"inherit"}}>{Ic.PlusCirc()} Tambah Produk</button>
          </div>
        }
      />
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

        <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:"#e0faf5"}}>
              {["#","Nama","Barcode","Kategori","Harga Modal","Harga Jual","Aksi"].map(h=>(
                <th key={h} style={{padding:"9px 12px",textAlign:"left",fontWeight:800,color:"#0d9488",whiteSpace:"nowrap"}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {fp.map((p,i)=>(
                <tr key={p.id} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}
                  onMouseEnter={e=>e.currentTarget.style.background="#f0fdfb"}
                  onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"#fff":"#fafffe"}>
                  <td style={{padding:"9px 12px",color:"#ccc",fontWeight:600}}>{i+1}</td>
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
function StokPage({ products, outlets, stocks, setStocks, onBack, notify }) {
  const [selectedOutlet, setSelectedOutlet] = useState(outlets[0]?.id||"");
  const [tab,            setTab]            = useState("opname"); // opname | masuk | keluar | transfer | log
  const [search,         setSearch]         = useState("");
  const [log,            setLog]            = useState([]); // { time, type, outletNama, productName, qty, note }
  const [showForm,       setShowForm]       = useState(false);
  const [form,           setForm]           = useState({productId:"",qty:"",note:""});
  const [transferTo,     setTransferTo]     = useState("");
  const [realStocks,     setRealStocks]     = useState({});

  const outletStock = stocks[selectedOutlet]||{};
  const outlet      = outlets.find(o=>o.id===selectedOutlet);

  // sync realStocks saat ganti outlet
  const initReal = (oid)=>{
    const s={};
    Object.entries(stocks[oid]||{}).forEach(([pid,qty])=>{s[pid]=qty;});
    setRealStocks(s);
  };

  const addLog = (type,oid,pid,qty,note="")=>{
    const p=products.find(x=>x.id===+pid);
    const o=outlets.find(x=>x.id===oid);
    setLog(prev=>[{id:uid(),time:now(),type,outletNama:o?.nama,productName:p?.name,qty,note},...prev]);
  };

  const doMasuk = ()=>{
    if(!form.productId||!form.qty||+form.qty<=0) return notify("Lengkapi form!","err");
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],[form.productId]:(prev[selectedOutlet]?.[form.productId]||0)+(+form.qty)}}));
    addLog("masuk",selectedOutlet,form.productId,+form.qty,form.note);
    notify(`Stok masuk +${form.qty} berhasil`,"ok");
    setForm({productId:"",qty:"",note:""}); setShowForm(false);
  };

  const doKeluar = ()=>{
    if(!form.productId||!form.qty||+form.qty<=0) return notify("Lengkapi form!","err");
    const cur=stocks[selectedOutlet]?.[form.productId]||0;
    if(+form.qty>cur) return notify("Stok tidak cukup!","err");
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],[form.productId]:cur-(+form.qty)}}));
    addLog("keluar",selectedOutlet,form.productId,+form.qty,form.note);
    notify(`Stok keluar -${form.qty} berhasil`,"ok");
    setForm({productId:"",qty:"",note:""}); setShowForm(false);
  };

  const doTransfer = ()=>{
    if(!form.productId||!form.qty||+form.qty<=0||!transferTo) return notify("Lengkapi semua!","err");
    const cur=stocks[selectedOutlet]?.[form.productId]||0;
    if(+form.qty>cur) return notify("Stok tidak cukup!","err");
    setStocks(prev=>({
      ...prev,
      [selectedOutlet]:{...prev[selectedOutlet],[form.productId]:cur-(+form.qty)},
      [transferTo]:{...prev[transferTo],[form.productId]:(prev[transferTo]?.[form.productId]||0)+(+form.qty)},
    }));
    const oTujuan=outlets.find(o=>o.id===transferTo)?.nama;
    addLog("transfer",selectedOutlet,form.productId,+form.qty,`→ ${oTujuan}`);
    notify(`Transfer berhasil → ${oTujuan}`,"ok");
    setForm({productId:"",qty:"",note:""}); setShowForm(false);
  };

  const saveOpname = ()=>{
    setStocks(prev=>({...prev,[selectedOutlet]:{...prev[selectedOutlet],...realStocks}}));
    notify("Stok opname disimpan ✓","ok");
  };

  const filteredProds = products.filter(p=>p.name.toLowerCase().includes(search.toLowerCase()));
  const getStatus = s=>s===0?"habis":s<=2?"menipis":s>=20?"over":"aman";
  const ss={habis:{bg:"#ffe5e5",c:"#c0392b",l:"✗ Habis"},menipis:{bg:"#fff0f0",c:"#ff4757",l:"⚠ Menipis"},over:{bg:"#fffbe6",c:"#f39c12",l:"▲ Over"},aman:{bg:"#e8f8f4",c:"#0d9488",l:"✓ Aman"}};

  const typeColor={masuk:"#27ae60",keluar:"#e74c3c",transfer:"#2980b9"};
  const typeIcon={masuk:"⬇ Masuk",keluar:"⬆ Keluar",transfer:"⇄ Transfer"};

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="📦 Stok" onBack={onBack}/>
      <div style={{padding:"14px 18px",maxWidth:900,margin:"0 auto"}}>

        {/* Pilih outlet */}
        <div style={{display:"flex",gap:8,marginBottom:14,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:12,fontWeight:700,color:"#555"}}>Outlet:</span>
          {outlets.map(o=>(
            <button key={o.id} onClick={()=>{setSelectedOutlet(o.id);initReal(o.id);}} style={{padding:"6px 14px",borderRadius:20,border:"2px solid",borderColor:selectedOutlet===o.id?"#0d9488":"#b2ede6",background:selectedOutlet===o.id?"#0d9488":"#fff",color:selectedOutlet===o.id?"#fff":"#0d9488",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>{o.nama}</button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:0,marginBottom:14,background:"#fff",borderRadius:12,padding:4,border:"2px solid #e0f5f1",width:"fit-content",flexWrap:"wrap"}}>
          {[{k:"opname",l:"📋 Stok Opname"},{k:"masuk",l:"⬇ Masuk"},{k:"keluar",l:"⬆ Keluar"},{k:"transfer",l:"⇄ Transfer"},{k:"log",l:"📜 Log"}].map(t=>(
            <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:"7px 16px",borderRadius:9,border:"none",fontWeight:700,fontSize:12,cursor:"pointer",fontFamily:"inherit",background:tab===t.k?"#0d9488":"transparent",color:tab===t.k?"#fff":"#888",transition:"all .15s"}}>{t.l}</button>
          ))}
        </div>

        {/* OPNAME TAB */}
        {tab==="opname"&&(
          <>
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
                      <tr key={p.id} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                        <td style={{padding:"7px 11px",color:"#ccc",fontWeight:600}}>{i+1}</td>
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
function LaporanPage({ transactions, outlets, onBack }) {
  const [filterOutlet, setFilterOutlet] = useState("all");
  const [filterShift,  setFilterShift]  = useState("all");

  const calcOmset = list=>list.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);

  // Daftar shift unik
  const allShifts = [...new Map(transactions.filter(t=>t.shiftId).map(t=>[t.shiftId,{id:t.shiftId,nama:t.shiftNama||t.shiftId}])).values()];

  const filtered = transactions.filter(t=>
    (filterOutlet==="all"||t.outletId===filterOutlet)&&
    (filterShift==="all"||(filterShift==="noshift"?!t.shiftId:t.shiftId===filterShift))
  );

  // group per shift
  const groups = {};
  filtered.forEach(t=>{
    const key=t.shiftId||"no-shift";
    const label=t.shiftNama||"Tanpa Shift";
    const outletNama=outlets.find(o=>o.id===t.outletId)?.nama||"—";
    if(!groups[key]) groups[key]={key,label,outletNama,items:[]};
    groups[key].items.push(t);
  });
  const groupArr=Object.values(groups);

  const omsetTotal=calcOmset(filtered);
  const itemTotal =filtered.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);

  const exportCSV=()=>{
    const rows=[["ID","Outlet","Shift","Kasir","Waktu","Produk","Qty","Harga","Subtotal","Status","Alasan Refund"]];
    filtered.forEach(t=>t.items.forEach(i=>
      rows.push([t.id,outlets.find(o=>o.id===t.outletId)?.nama||"—",t.shiftNama||"—",t.kasir||"—",t.time,i.name,i.qty,i.price,i.price*i.qty,i.refunded?"REFUND":"OK",i.refundReason||""])
    ));
    const blob=new Blob([rows.map(r=>r.join(",")).join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`laporan-${today()}.csv`;a.click();
  };

  return (
    <div style={{minHeight:"100vh",background:"#f0faf8",fontFamily:"'Nunito',sans-serif"}}>
      <SubHeader title="📋 Laporan Transaksi" onBack={onBack}
        right={<button onClick={exportCSV} style={{background:"rgba(255,255,255,.15)",border:"1px solid rgba(255,255,255,.3)",borderRadius:9,padding:"7px 14px",color:"#fff",fontWeight:800,fontSize:12,display:"flex",alignItems:"center",gap:5,cursor:"pointer",fontFamily:"inherit"}}>{Ic.Export()} Export CSV</button>}
      />
      <div style={{padding:"14px 18px",maxWidth:940,margin:"0 auto"}}>

        {/* Filter bar */}
        <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"13px 16px",marginBottom:14}}>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"flex-end"}}>
            <div style={{flex:1,minWidth:180}}>
              <label style={{...lbl}}>Filter Outlet</label>
              <select value={filterOutlet} onChange={e=>setFilterOutlet(e.target.value)} style={{...inp,padding:"7px 10px"}}>
                <option value="all">Semua Outlet</option>
                {outlets.map(o=><option key={o.id} value={o.id}>{o.nama}</option>)}
              </select>
            </div>
            <div style={{flex:1,minWidth:180}}>
              <label style={{...lbl}}>Filter Shift</label>
              <select value={filterShift} onChange={e=>setFilterShift(e.target.value)} style={{...inp,padding:"7px 10px"}}>
                <option value="all">Semua Shift</option>
                <option value="noshift">Tanpa Shift</option>
                {allShifts.map(s=><option key={s.id} value={s.id}>{s.nama}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{display:"flex",gap:9,marginBottom:14}}>
          {[
            {l:"Total Omset",v:fmtRp(omsetTotal),c:"#0d9488",bg:"linear-gradient(135deg,#0d9488,#14b8a6)",tc:"#fff"},
            {l:"Item Terjual",v:itemTotal+" pcs",c:"#8e44ad",bg:"#f5eeff",tc:"#8e44ad"},
            {l:"Total Transaksi",v:filtered.length,c:"#2980b9",bg:"#e8f4fd",tc:"#2980b9"},
          ].map(s=>(
            <div key={s.l} style={{flex:1,background:s.bg,borderRadius:12,padding:"11px 15px"}}>
              <div style={{fontWeight:900,fontSize:20,color:s.tc}}>{s.v}</div>
              <div style={{fontSize:11,fontWeight:700,color:s.tc,opacity:.8}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Per outlet summary */}
        {filterOutlet==="all"&&(
          <div style={{background:"#fff",borderRadius:13,border:"2px solid #e0f5f1",padding:"13px 16px",marginBottom:14}}>
            <div style={{fontWeight:800,fontSize:13,color:"#0d9488",marginBottom:10}}>💰 Omset Per Outlet</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
              {outlets.map(o=>{
                const ot=filtered.filter(t=>t.outletId===o.id);
                const om=calcOmset(ot);
                const it=ot.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
                return (
                  <div key={o.id} style={{background:"#f0faf8",borderRadius:10,padding:"10px 13px",border:"2px solid #e0f5f1"}}>
                    <div style={{fontSize:11,fontWeight:700,color:"#888",marginBottom:3}}>{o.nama}</div>
                    <div style={{fontWeight:900,fontSize:16,color:"#0d9488"}}>{fmtRp(om)}</div>
                    <div style={{fontSize:10,color:"#aaa"}}>{ot.length} trx · {it} item</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Transaksi grouped by shift */}
        {filtered.length===0?(
          <div style={{textAlign:"center",color:"#bbb",padding:50,fontSize:14}}>Tidak ada transaksi</div>
        ):groupArr.map(group=>{
          const gOmset=calcOmset(group.items);
          const gItems=group.items.reduce((s,t)=>s+t.items.filter(i=>!i.refunded).reduce((ss,i)=>ss+i.qty,0),0);
          return (
            <div key={group.key} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:"linear-gradient(135deg,#0d9488,#14b8a6)",borderRadius:"12px 12px 0 0",padding:"10px 15px",color:"#fff"}}>
                <div>
                  <span style={{fontWeight:900,fontSize:14}}>⏱ {group.label}</span>
                  {filterOutlet==="all"&&<span style={{fontSize:11,opacity:.8,marginLeft:8}}>({group.outletNama})</span>}
                  <span style={{fontSize:11,opacity:.8,marginLeft:8}}>{group.items.length} trx · {gItems} item</span>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:16}}>{fmtRp(gOmset)}</div>
                  <div style={{fontSize:10,opacity:.75}}>omset bersih</div>
                </div>
              </div>
              <div style={{background:"#fff",border:"2px solid #e0f5f1",borderTop:"none",borderRadius:"0 0 12px 12px",overflow:"hidden"}}>
                {group.items.map((t,ti)=>{
                  const rt=t.items.filter(i=>i.refunded).reduce((s,i)=>s+i.price*i.qty,0);
                  const outletNama=outlets.find(o=>o.id===t.outletId)?.nama;
                  return (
                    <div key={t.id} style={{padding:"10px 13px",borderTop:ti>0?"1px solid #f0faf8":"none"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                        <div style={{display:"flex",gap:7,alignItems:"center"}}>
                          <span style={{fontWeight:800,fontSize:12,color:"#0d9488"}}>#{t.id}</span>
                          <span style={{fontSize:11,color:"#aaa"}}>{t.time}</span>
                          {outletNama&&<span style={{fontSize:10,background:"#e0faf5",color:"#0d9488",padding:"1px 7px",borderRadius:6,fontWeight:700}}>{outletNama}</span>}
                          {t.kasir&&<span style={{fontSize:10,color:"#aaa"}}>({t.kasir})</span>}
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
                          <span style={{fontWeight:700,fontSize:12,color:item.refunded?"#ccc":"#0d9488",flexShrink:0}}>{fmtRp(item.price*item.qty)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// KASIR APP (per outlet)
// ══════════════════════════════════════════════════════════════════════════════
function KasirApp({ user, products, stocks, setStocks, transactions, setTx, outlets, onBack, notify }) {
  // Admin bisa pilih outlet; karyawan sudah terkunci ke outletnya
  const [selectedOutlet, setSelectedOutlet] = useState(user.outletId||outlets[0]?.id||"");
  const outlet = outlets.find(o=>o.id===selectedOutlet);

  const outletStock = stocks[selectedOutlet]||{};

  const [page,        setPage]        = useState("kasir");
  const [cart,        setCart]        = useState([]);
  const [search,      setSearch]      = useState("");
  const [activeCat,   setActiveCat]   = useState("Semua");
  const [showPayment, setShowPayment] = useState(false);
  const [cashInput,   setCashInput]   = useState("");
  const [showManual,  setShowManual]  = useState(false);
  const [manualForm,  setManualForm]  = useState({name:"",modal:"",price:"",qty:1});
  const [shift,       setShift]       = useState(null);
  const [showShift,   setShowShift]   = useState(false);
  const [shiftMode,   setShiftMode]   = useState("open");
  const [barcode,     setBarcode]     = useState("");
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason,setRefundReason]= useState("");

  const CATEGORIES = ["Semua",...Array.from(new Set(products.map(p=>p.category)))];
  const filteredProds = products.filter(p=>
    (activeCat==="Semua"||p.category===activeCat)&&
    (p.name.toLowerCase().includes(search.toLowerCase())||p.barcode?.includes(search))
  );

  const addToCart = product=>{
    setCart(prev=>{
      const ex=prev.find(i=>i.id===product.id&&!i.isManual);
      if(ex) return prev.map(i=>i.id===product.id&&!i.isManual?{...i,qty:i.qty+1}:i);
      return [...prev,{...product,qty:1,cartId:uid()}];
    });
    notify(`+ ${product.name}`,"ok");
  };
  const addManual=()=>{
    if(!manualForm.name||!manualForm.price) return notify("Isi nama & harga!","err");
    setCart(prev=>[...prev,{id:`m-${uid()}`,cartId:uid(),isManual:true,stock:null,name:manualForm.name,modal:+manualForm.modal||0,price:+manualForm.price,qty:+manualForm.qty||1}]);
    setManualForm({name:"",modal:"",price:"",qty:1});setShowManual(false);
    notify("Item manual ditambahkan","ok");
  };
  const updQty=(cid,d)=>setCart(prev=>prev.map(i=>i.cartId===cid?{...i,qty:Math.max(1,i.qty+d)}:i));
  const remItem=cid=>setCart(prev=>prev.filter(i=>i.cartId!==cid));
  const total  =cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cashNum=Number(cashInput.replace(/\D/g,""))||0;
  const change =cashNum-total;

  const handleBarcode=e=>{
    if(e.key!=="Enter") return;
    const p=products.find(x=>x.barcode===barcode);
    if(p){addToCart(p);setBarcode("");}else notify("Produk tidak ditemukan!","err");
  };

  const pay=()=>{
    if(!cart.length) return notify("Keranjang kosong!","err");
    const cashFinal=cashNum>=total?cashNum:total;
    const trx={id:uid(),time:now(),date:today(),shiftId:shift?.id,shiftNama:shift?.nama,kasir:user.nama,outletId:selectedOutlet,
      items:cart.map(i=>({...i,refunded:false,refundReason:""})),total,cash:cashFinal,kembalian:cashFinal-total};
    setTx(prev=>[trx,...prev]);
    setStocks(prev=>{
      const s={...prev,[selectedOutlet]:{...prev[selectedOutlet]}};
      cart.forEach(i=>{if(!i.isManual) s[selectedOutlet][i.id]=Math.max(0,(s[selectedOutlet][i.id]||0)-i.qty);});
      return s;
    });
    setCart([]);setCashInput("");setShowPayment(false);
    notify("✓ Transaksi berhasil!","ok");
  };

  const doRefund=()=>{
    if(!refundReason.trim()) return notify("Isi alasan refund!","err");
    setTx(prev=>prev.map(t=>t.id!==refundModal.trxId?t:{...t,items:t.items.map(i=>i.cartId!==refundModal.cartId?i:{...i,refunded:true,refundReason})}));
    notify("Item direfund","ok");setRefundModal(null);setRefundReason("");
  };

  const openShift =data=>{setShift({id:uid(),nama:data.namaShift,start:now(),...data});setShowShift(false);notify("Shift dibuka!","ok");};
  const closeShift=data=>{setShift(null);setShowShift(false);notify(`Shift ditutup. Selisih: ${fmtRp(data.selisih)}`,data.selisih===0?"ok":"warn");};

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
          <select value={selectedOutlet} onChange={e=>{setSelectedOutlet(e.target.value);setCart([]);}}
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
        <div style={{display:"flex",height:"calc(100vh - 48px)"}}>
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
          <div style={{width:296,background:"#fff",borderLeft:"2px solid #e0f5f1",display:"flex",flexDirection:"column"}}>
            <div style={{padding:"10px 13px",borderBottom:"2px solid #e0f5f1",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontWeight:800,fontSize:13,color:"#0d9488"}}>{Ic.Cart(17)} Keranjang {cart.length>0&&<span style={{background:"#0d9488",color:"#fff",borderRadius:20,fontSize:10,padding:"1px 7px",marginLeft:5}}>{cart.length}</span>}</span>
              {cart.length>0&&<button onClick={()=>setCart([])} style={{background:"#fff0f0",border:"none",color:"#ff4757",borderRadius:7,padding:"3px 9px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>Kosongkan</button>}
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

      {/* STOK OUTLET (view only, opname cepat) */}
      {page==="stok"&&(
        <div style={{padding:"14px 18px",maxWidth:820,margin:"0 auto"}}>
          <div style={{fontWeight:800,fontSize:15,color:"#0d9488",marginBottom:12}}>📦 Stok — {outlet?.nama}</div>
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #e0f5f1",overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:"#e0faf5"}}>{["#","Produk","Kategori","Stok"].map(h=><th key={h} style={{padding:"9px 11px",textAlign:"left",fontWeight:800,color:"#0d9488"}}>{h}</th>)}</tr></thead>
              <tbody>
                {products.map((p,i)=>{
                  const stok=outletStock[p.id]??0;
                  const st=stok===0?"habis":stok<=2?"menipis":"aman";
                  const sc={habis:"#c0392b",menipis:"#ff4757",aman:"#2ecc71"}[st];
                  return (
                    <tr key={p.id} style={{borderTop:"1px solid #f0faf8",background:i%2===0?"#fff":"#fafffe"}}>
                      <td style={{padding:"7px 11px",color:"#ccc"}}>{i+1}</td>
                      <td style={{padding:"7px 11px",fontWeight:700}}>{p.name}</td>
                      <td style={{padding:"7px 11px"}}><span style={{background:"#e0faf5",color:"#0d9488",fontWeight:700,fontSize:10,padding:"2px 7px",borderRadius:6}}>{p.category}</span></td>
                      <td style={{padding:"7px 11px"}}><span style={{fontWeight:900,fontSize:13,color:sc}}>{stok}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
      {showShift&&<ShiftModal mode={shiftMode} shift={shift} transactions={txOutlet} onOpen={openShift} onClose={closeShift} onCancel={()=>setShowShift(false)}/>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHIFT MODAL
// ══════════════════════════════════════════════════════════════════════════════
function ShiftModal({ mode, shift, transactions, onOpen, onClose, onCancel }) {
  const blank=()=>{const m={};SALDO_APPS.forEach(a=>{m[a]="";});return m;};
  const [namaShift,setNamaShift]=useState("");
  const [cashKemb,setCashKemb]=useState("");
  const [saldoApps,setSaldoApps]=useState(blank());
  const [saldoAppsC,setSaldoAppsC]=useState(blank());
  const [cashKembC,setCashKembC]=useState("");
  const [setor,setSetor]=useState("");
  const [hutang,setHutang]=useState("");
  const [pending,setPending]=useState("");
  const [klr,setKlr]=useState("");
  const [noteKlr,setNoteKlr]=useState("");
  const [kasNyata,setKasNyata]=useState("");
  const [notes,setNotes]=useState("");

  const tAppO=Object.values(saldoApps).reduce((s,v)=>s+(+v||0),0);
  const tAppC=Object.values(saldoAppsC).reduce((s,v)=>s+(+v||0),0);
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
              {SALDO_APPS.map(app=>(
                <div key={app}><label style={{...lS,color:"#555"}}>Saldo {app}</label><input type="number" value={saldoApps[app]} onChange={e=>setSaldoApps(p=>({...p,[app]:e.target.value}))} placeholder="0" style={iS}/></div>
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
              {SALDO_APPS.map(app=>(
                <div key={app}><label style={{...lS,color:"#555"}}>Saldo {app}</label><input type="number" value={saldoAppsC[app]} onChange={e=>setSaldoAppsC(p=>({...p,[app]:e.target.value}))} placeholder="0" style={iS}/></div>
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
          <button onClick={mode==="open"?()=>{if(!namaShift.trim())return alert("Isi nama shift!");onOpen({namaShift,cashKembalian:+cashKemb||0,saldoApps,totalSaldoApps:tAppO});}:()=>onClose({saldoAppsC,cashKembC:+cashKembC||0,setorTunai:st,hutang:htg,pending:pnd,pengeluaran:pk,noteKlr,kasNyataSystem:kasSystem,kasNyataFisik:kasFisik,selisih,notes})} style={{flex:2,background:`linear-gradient(135deg,${mode==="open"?"#0d9488,#14b8a6":"#e74c3c,#ff6b6b"})`,border:"none",borderRadius:9,padding:10,color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
            {mode==="open"?"Buka Shift":"Tutup & Simpan Shift"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [user,        setUser]        = useState(null);
  const [page,        setPage]        = useState("menu");
  const [products,    setProductsState] = useState([]);
  const [outlets,     setOutletsState]  = useState([]);
  const [stocks,      setStocksState]   = useState({});
  const [transactions,setTx]            = useState([]);
  const [users,       setUsersState]    = useState({});
  const [toast,       setToast]         = useState(null);
  const [loading,     setLoading]       = useState(true);
  const [dbError,     setDbError]       = useState(null);

  const notify = (msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); };

  // ── Load semua data dari Supabase saat pertama buka ──────────────────────
  useEffect(()=>{
    const load = async () => {
      try {
        const [prods, outs, stks, txs, usrs] = await Promise.all([
          db.getProducts(),
          db.getOutlets(),
          db.getStocks(),
          db.getTransactions(),
          db.getUsers(),
        ]);
        setProductsState(prods);
        setOutletsState(outs);
        setStocksState(stks);
        // Map transaksi ke format lokal
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
        console.error(e);
        setDbError("Tidak bisa terhubung ke database. Cek koneksi internet atau konfigurasi Supabase.");
        setLoading(false);
      }
    };
    load();
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

  const calcOmset = list=>list.reduce((s,t)=>{const rv=t.items.filter(i=>i.refunded).reduce((rs,i)=>rs+i.price*i.qty,0);return s+t.total-rv;},0);
  const stats = {
    omsetHari:   calcOmset(transactions.filter(t=>t.date===today())),
    txHari:      transactions.filter(t=>t.date===today()).length,
    stokMenipis: products.filter(p=>outlets.some(o=>(stocks[o.id]?.[p.id]??0)<=2)).length,
  };

  const isAdmin = user?.role==="admin";

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
      <LoginPage users={users} onLogin={u=>{setUser(u);setPage("menu");}}/>
    </>
  );

  return (
    <div style={{fontFamily:"'Nunito',sans-serif"}}>
      <style>{css}</style>
      <Toast toast={toast}/>

      {page==="menu"      && <MenuUtama    user={user} onNavigate={setPage} onLogout={()=>{setUser(null);setPage("menu");}} stats={stats}/>}
      {page==="kasir"     && <KasirApp     user={user} products={products} stocks={stocks} setStocks={setStocks} transactions={transactions} setTx={setTxWithSync} outlets={outlets} onBack={()=>setPage("menu")} notify={notify}/>}
      {page==="produk"    && isAdmin && <ProdukPage    products={products} setProducts={setProducts} stocks={stocks} setStocks={setStocks} onBack={()=>setPage("menu")} notify={notify}/>}
      {page==="outlet"    && isAdmin && <OutletPage    outlets={outlets} setOutlets={setOutlets} users={users} setUsers={setUsers} stocks={stocks} setStocks={setStocks} products={products} onBack={()=>setPage("menu")} notify={notify}/>}
      {page==="stok"      && isAdmin && <StokPage      products={products} outlets={outlets} stocks={stocks} setStocks={setStocks} onBack={()=>setPage("menu")} notify={notify}/>}
      {page==="dashboard" && isAdmin && <DashboardPage transactions={transactions} products={products} outlets={outlets} stocks={stocks} onBack={()=>setPage("menu")}/>}
      {page==="laporan"   && isAdmin && <LaporanPage   transactions={transactions} outlets={outlets} onBack={()=>setPage("menu")}/>}

      {["produk","outlet","stok","dashboard","laporan"].includes(page)&&!isAdmin&&(
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
