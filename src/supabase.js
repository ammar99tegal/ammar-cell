import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://acxqzupnlkqvmsitolzj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjeHF6dXBubGtxdm1zaXRvbHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODA4OTAsImV4cCI6MjA5NTM1Njg5MH0.qRZ3HkhMYmFOUk1y6sh0aJujSBNJ-Ov1G8Q5s_h6_qU'


export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── PRODUCTS & CORE ───────────────────────────────────────────────────────────
export const db = {
  getProducts: async () => {
    const { data, error } = await supabase.from('products').select('*').order('id')
    if (error) throw error
    return data
  },
  addProduct: async (p) => {
    const { data, error } = await supabase.from('products').insert([p]).select().single()
    if (error) throw error
    return data
  },
  updateProduct: async (id, p) => {
    const { error } = await supabase.from('products').update(p).eq('id', id)
    if (error) throw error
  },
  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },
  getOutlets: async () => {
    const { data, error } = await supabase.from('outlets').select('*').order('id')
    if (error) throw error
    return data
  },
  addOutlet: async (o) => {
    const { data, error } = await supabase.from('outlets').insert([o]).select().single()
    if (error) throw error
    return data
  },
  updateOutlet: async (id, o) => {
    const { error } = await supabase.from('outlets').update(o).eq('id', id)
    if (error) throw error
  },
  deleteOutlet: async (id) => {
    const { error } = await supabase.from('outlets').delete().eq('id', id)
    if (error) throw error
  },
  getStocks: async () => {
    const { data, error } = await supabase.from('stocks').select('*')
    if (error) throw error
    const result = {}
    data.forEach(row => {
      if (!result[row.outlet_id]) result[row.outlet_id] = {}
      result[row.outlet_id][row.product_id] = row.qty
    })
    return result
  },
  upsertStock: async (outletId, productId, qty) => {
    const { error } = await supabase.from('stocks').upsert(
      { outlet_id: outletId, product_id: productId, qty },
      { onConflict: 'outlet_id,product_id' }
    )
    if (error) throw error
  },
  upsertStocks: async (outletId, stockMap) => {
    const rows = Object.entries(stockMap).map(([pid, qty]) => ({
      outlet_id: outletId, product_id: +pid, qty
    }))
    const { error } = await supabase.from('stocks').upsert(rows, { onConflict: 'outlet_id,product_id' })
    if (error) throw error
  },
  getUsers: async () => {
    const { data, error } = await supabase.from('users').select('*')
    if (error) throw error
    const result = {}
    data.forEach(u => {
      result[u.username] = { pass: u.pass, nama: u.nama, role: u.role, outletId: u.outlet_id }
    })
    return result
  },
  upsertUser: async (username, u) => {
    const { error } = await supabase.from('users').upsert(
      { username, pass: u.pass, nama: u.nama, role: u.role, outlet_id: u.outletId || null },
      { onConflict: 'username' }
    )
    if (error) throw error
  },
  deleteUser: async (username) => {
    const { error } = await supabase.from('users').delete().eq('username', username)
    if (error) throw error
  },
  getTransactions: async () => {
    const { data, error } = await supabase.from('transactions')
      .select('*').order('created_at', { ascending: false }).limit(1000)
    if (error) throw error
    return data.map(t => ({ ...t, items: t.items || [] }))
  },
  addTransaction: async (trx) => {
    const { error } = await supabase.from('transactions').insert([{
      id: trx.id, outlet_id: trx.outletId, shift_id: trx.shiftId,
      shift_nama: trx.shiftNama, kasir: trx.kasir,
      date: trx.date, time: trx.time,
      total: trx.total, cash: trx.cash, kembalian: trx.kembalian,
      items: trx.items
    }])
    if (error) throw error
  },
  updateTransactionItems: async (id, items) => {
    const { error } = await supabase.from('transactions').update({ items }).eq('id', id)
    if (error) throw error
  },
  getStockLogs: async () => {
    const { data, error } = await supabase.from('stock_logs')
      .select('*').order('created_at', { ascending: false }).limit(500)
    if (error) throw error
    return data
  },
  addStockLog: async (log) => {
    const { error } = await supabase.from('stock_logs').insert([{
      id: log.id, time: log.time, type: log.type,
      outlet_nama: log.outletNama, product_name: log.productName,
      qty: log.qty, note: log.note || ''
    }])
    if (error) throw error
  },
  updateStockLog: async (id, updates) => {
    const { error } = await supabase.from('stock_logs').update(updates).eq('id', id)
    if (error) throw error
  },
  deleteStockLog: async (id) => {
    const { error } = await supabase.from('stock_logs').delete().eq('id', id)
    if (error) throw error
  },
}

// ── SALDO APPS KASIR ──────────────────────────────────────────────────────────
export const dbSaldo = {
  getSaldoApps: async () => {
    const { data, error } = await supabase.from('saldo_apps').select('*').order('urutan')
    if (error) { console.warn('saldo_apps:', error.message); return ["Digipos","Sidiva","Rita","OK","Dana","OVO","GoPay","ShopeePay","LinkAja","M-Kios"]; }
    return data.map(d => d.nama)
  },
  saveSaldoApps: async (list) => {
    await supabase.from('saldo_apps').delete().neq('id', 0)
    const { error } = await supabase.from('saldo_apps').insert(list.map((nama, i) => ({ nama, urutan: i })))
    if (error) throw error
  }
}

// ── SALDO BANK APPS ───────────────────────────────────────────────────────────
export const dbSaldoBank = {
  getSaldoBankApps: async () => {
    const { data, error } = await supabase.from('saldo_bank_apps').select('*').order('urutan')
    if (error) { console.warn('saldo_bank_apps:', error.message); return ["Digipos","Sidiva","Rita","OK","Dana","OVO","GoPay","ShopeePay"]; }
    return data.map(d => d.nama)
  },
  saveSaldoBankApps: async (list) => {
    await supabase.from('saldo_bank_apps').delete().neq('id', 0)
    const { error } = await supabase.from('saldo_bank_apps').insert(list.map((nama, i) => ({ nama, urutan: i })))
    if (error) throw error
  }
}

// ── SHIFT KASIR ───────────────────────────────────────────────────────────────
export const dbShift = {
  getActiveShift: async (outletId, userId) => {
    // Cari shift aktif berdasarkan outlet_id saja — 1 shift aktif per outlet
    const { data, error } = await supabase.from('active_shifts').select('*')
      .eq('outlet_id', outletId).limit(1)
    if (error || !data?.length) return null
    const d = data[0];
    return { id: d.id, nama: d.nama, start: d.start_time, outletId: d.outlet_id, ...d.saldo_data }
  },
  openShift: async (shift, outletId, userId) => {
    // Upsert by outlet_id — replace kalau sudah ada, insert kalau belum
    const { error } = await supabase.from('active_shifts').upsert({
      id: shift.id,
      outlet_id: outletId,
      user_id: userId,
      nama: shift.nama,
      start_time: shift.start,
      saldo_data: {
        saldoApps: shift.saldoApps,
        cashKembalian: shift.cashKembalian,
        totalSaldoApps: shift.totalSaldoApps,
        waktuBuka: shift.start
      }
    }, { onConflict: 'outlet_id' })
    if (error) {
      console.error('openShift error:', error.message)
      // Fallback: hapus lama lalu insert baru
      await supabase.from('active_shifts').delete().eq('outlet_id', outletId)
      await supabase.from('active_shifts').insert({
        id: shift.id, outlet_id: outletId, user_id: userId,
        nama: shift.nama, start_time: shift.start,
        saldo_data: { saldoApps: shift.saldoApps, cashKembalian: shift.cashKembalian, totalSaldoApps: shift.totalSaldoApps, waktuBuka: shift.start }
      })
    }
  },
  closeShift: async (shift, outletId, userId, closeData) => {
    // Insert ke shift_logs dengan error handling lengkap
    const insertData = {
      id: shift.id,
      outlet_id: outletId,
      user_id: userId,
      nama: shift.nama,
      start_time: shift.start,
      end_time: closeData.waktuTutup,
      saldo_open: {
        saldoApps: shift.saldoApps || {},
        cashKembalian: shift.cashKembalian || 0,
        totalSaldoApps: shift.totalSaldoApps || 0
      },
      saldo_close: {
        saldoAppsAkhir: closeData.saldoAppsClose || {},
        cashKembClose: closeData.cashKembC || 0,
        waktuTutup: closeData.waktuTutup
      },
      rekap: {
        setorTunai: closeData.setorTunai || 0,
        hutang: closeData.hutang || 0,
        pending: closeData.pending || 0,
        pengeluaran: closeData.pengeluaran || 0,
        noteKlr: closeData.noteKlr || '',
        kasNyataSystem: closeData.kasNyataSystem || 0,
        kasNyataFisik: closeData.kasNyataFisik || 0,
        selisih: closeData.selisih || 0,
        notes: closeData.notes || ''
      }
    };

    const { error: insertError } = await supabase.from('shift_logs').insert(insertData);
    if (insertError) {
      console.error('closeShift INSERT error:', insertError.message, insertError.code, JSON.stringify(insertError));
      // Coba upsert sebagai fallback jika id sudah ada
      const { error: upsertError } = await supabase.from('shift_logs').upsert(insertData);
      if (upsertError) {
        console.error('closeShift UPSERT fallback error:', upsertError.message);
      }
    }
    // Hapus dari active_shifts
    try {
      await supabase.from('active_shifts').delete().eq('outlet_id', outletId);
    } catch(e) { console.error('delete active_shifts error:', e); }
  },
  getShiftLogs: async (outletId = null) => {
    let q = supabase.from('shift_logs').select('*').order('created_at', { ascending: false }).limit(200)
    if (outletId) q = q.eq('outlet_id', outletId)
    const { data, error } = await q
    if (error) return []
    return data
  }
}

// ── BANK ──────────────────────────────────────────────────────────────────────
export const dbBank = {
  getTransactions: async () => {
    const { data, error } = await supabase.from('bank_transactions').select('*')
      .order('created_at', { ascending: false }).limit(500)
    if (error) { console.warn('bank_transactions:', error.message); return []; }
    return data.map(t => ({
      id: t.id, waktu: t.waktu, tgl: t.tgl, shiftId: t.shift_id, nama: t.nama,
      jenis: t.jenis, feeType: t.fee_type, fee: t.fee, nominal: t.nominal,
      netNominal: t.net_nominal, outletId: t.outlet_id,
    }))
  },
  addTransaction: async (t) => {
    const { error } = await supabase.from('bank_transactions').insert([{
      id: t.id, waktu: t.waktu, tgl: t.tgl, shift_id: t.shiftId, nama: t.nama,
      jenis: t.jenis, fee_type: t.feeType, fee: t.fee, nominal: t.nominal,
      net_nominal: t.netNominal, outlet_id: t.outletId,
    }])
    if (error) throw error
  },
  updateTransaction: async (id, t) => {
    const { error } = await supabase.from('bank_transactions').update({
      nama: t.nama, jenis: t.jenis, fee_type: t.feeType, fee: t.fee,
      nominal: t.nominal, net_nominal: t.netNominal,
    }).eq('id', id)
    if (error) throw error
  },
  deleteTransaction: async (id) => {
    const { error } = await supabase.from('bank_transactions').delete().eq('id', id)
    if (error) throw error
  },
  getActiveShift: async (outletId, userId) => {
    const { data, error } = await supabase.from('bank_shifts').select('*')
      .eq('outlet_id', outletId).limit(1)
    if (error || !data?.length) return null
    const d = data[0];
    return { id: d.id, nama: d.nama, start: d.start_time, outletId: d.outlet_id, ...d.saldo_data }
  },
  openShift: async (shift, outletId, userId) => {
    try {
      await supabase.from('bank_shifts').delete().eq('outlet_id', outletId);
      await supabase.from('bank_shifts').insert({
        id: shift.id, outlet_id: outletId, user_id: userId,
        nama: shift.nama, start_time: shift.start,
        saldo_data: { saldoApps: shift.saldoApps, cashKemb: shift.cashKemb, totalSaldo: shift.totalSaldo }
      });
    } catch(e) { console.error('Bank openShift error:', e.message); }
  },
  closeShift: async (shift, outletId, userId, closeData) => {
    try {
      await supabase.from('bank_shift_logs').insert({
        id: shift.id, outlet_id: outletId, user_id: userId,
        nama: shift.nama, start_time: shift.start, end_time: closeData.waktuTutup,
        saldo_open: { saldoApps: shift.saldoApps, cashKemb: shift.cashKemb },
        saldo_close: { saldoAppsC: closeData.saldoAppsC, uangLaci: closeData.uangLaci, uangSistem: closeData.uangSistem, selisih: closeData.selisih, catatan: closeData.catatan },
      });
    } catch(e) { console.error('Bank closeShift error:', e.message); }
    try { await supabase.from('bank_shifts').delete().eq('outlet_id', outletId); } catch(e) { console.error(e); }
  },
  closeShift: async (shift, outletId, userId, closeData) => {
    await supabase.from('bank_shift_logs').insert({
      id: shift.id, outlet_id: outletId, user_id: userId,
      nama: shift.nama, start_time: shift.start, end_time: closeData.waktuTutup,
      saldo_open: { saldoApps: shift.saldoApps, cashKemb: shift.cashKemb },
      saldo_close: { saldoAppsC: closeData.saldoAppsC, uangLaci: closeData.uangLaci, uangSistem: closeData.uangSistem, selisih: closeData.selisih, catatan: closeData.catatan },
    })
    try{ await supabase.from('bank_shifts').delete().eq('id', shift.id); }catch(e){ console.error(e); }
  },
}

// ── PRODUCT ORDER (drag urutan produk) ───────────────────────────────────────
export const dbProductOrder = {
  getOrder: async () => {
    const { data, error } = await supabase.from('product_order').select('*').order('urutan')
    if (error) { console.warn('product_order:', error.message); return []; }
    return data.map(d => ({ productId: d.product_id, urutan: d.urutan }))
  },
  saveOrder: async (productIds) => {
    const rows = productIds.map((id, i) => ({ product_id: id, urutan: i }))
    const { error } = await supabase.from('product_order').upsert(rows, { onConflict: 'product_id' })
    if (error) console.error('saveProductOrder error:', error.message)
  },
}

// ── STOK ORDER (drag urutan opname per outlet) ────────────────────────────────
export const dbStokOrder = {
  getOrder: async (outletId) => {
    const { data, error } = await supabase.from('stok_order').select('*')
      .eq('outlet_id', outletId).order('urutan')
    if (error) { console.warn('stok_order:', error.message); return []; }
    return data.map(d => ({ productId: d.product_id, urutan: d.urutan }))
  },
  saveOrder: async (outletId, productIds) => {
    const rows = productIds.map((id, i) => ({ outlet_id: outletId, product_id: id, urutan: i }))
    const { error } = await supabase.from('stok_order').upsert(rows, { onConflict: 'outlet_id,product_id' })
    if (error) console.error('saveStokOrder error:', error.message)
  },
}

// ── PRODUK AKTIF PER OUTLET ───────────────────────────────────────────────────
export const dbAktifProduk = {
  // Load semua produk aktif untuk outlet tertentu
  getAktif: async (outletId) => {
    const { data, error } = await supabase.from('outlet_product_aktif')
      .select('product_id').eq('outlet_id', outletId)
    if (error) { console.warn('getAktif:', error.message); return null; } // null = belum ada setting
    return data.map(r => String(r.product_id))
  },
  // Simpan semua produk aktif untuk outlet (replace semua)
  saveAktif: async (outletId, productIds) => {
    // Hapus semua dulu
    await supabase.from('outlet_product_aktif').delete().eq('outlet_id', outletId)
    if (!productIds.length) return
    const rows = productIds.map(pid => ({ outlet_id: outletId, product_id: String(pid) }))
    const { error } = await supabase.from('outlet_product_aktif').insert(rows)
    if (error) console.error('saveAktif:', error.message)
  },
  // Load semua outlet sekaligus
  getAllAktif: async () => {
    const { data, error } = await supabase.from('outlet_product_aktif').select('*')
    if (error) { console.warn('getAllAktif:', error.message); return {}; }
    const result = {}
    data.forEach(r => {
      const oid = r.outlet_id
      if (!result[oid]) result[oid] = []
      result[oid].push(String(r.product_id))
    })
    return result
  },
}
export const dbCashflow = {
  getEntries: async () => {
    const { data, error } = await supabase.from('cashflow_entries').select('*')
      .order('created_at', { ascending: false }).limit(1000)
    if (error) { console.warn('cashflow_entries:', error.message); return []; }
    return data.map(d => ({
      id: d.id, tgl: d.tgl, nama: d.nama, jenis: d.jenis,
      nominal: d.nominal, sumber: d.sumber || '', kategori: d.kategori || '',
      createdAt: d.created_at,
    }))
  },
  addEntry: async (entry) => {
    const { error } = await supabase.from('cashflow_entries').insert([{
      id: entry.id, tgl: entry.tgl, nama: entry.nama, jenis: entry.jenis,
      nominal: entry.nominal, sumber: entry.sumber || '', kategori: entry.kategori || '',
    }])
    if (error) throw error
  },
  deleteEntry: async (id) => {
    const { error } = await supabase.from('cashflow_entries').delete().eq('id', id)
    if (error) throw error
  },
}
