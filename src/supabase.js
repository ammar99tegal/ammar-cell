import { createClient } from '@supabase/supabase-js'

// ⚠️ GANTI dengan URL dan KEY dari project Supabase kamu
// Cara dapat: Supabase Dashboard → Settings → API
const SUPABASE_URL = 'https://acxqzupnlkqvmsitolzj.supabase.co'// ← ganti ini
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjeHF6dXBubGtxdm1zaXRvbHpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3ODA4OTAsImV4cCI6MjA5NTM1Njg5MH0.qRZ3HkhMYmFOUk1y6sh0aJujSBNJ-Ov1G8Q5s_h6_qU...'// ← ganti ini (anon/public key)

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ── PRODUCTS ──────────────────────────────────────────────────────────────────
export const db = {
  // Ambil semua produk
  getProducts: async () => {
    const { data, error } = await supabase.from('products').select('*').order('id')
    if (error) throw error
    return data
  },
  // Tambah produk
  addProduct: async (p) => {
    const { data, error } = await supabase.from('products').insert([p]).select().single()
    if (error) throw error
    return data
  },
  // Update produk
  updateProduct: async (id, p) => {
    const { error } = await supabase.from('products').update(p).eq('id', id)
    if (error) throw error
  },
  // Hapus produk
  deleteProduct: async (id) => {
    const { error } = await supabase.from('products').delete().eq('id', id)
    if (error) throw error
  },

  // ── OUTLETS ────────────────────────────────────────────────────────────────
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

  // ── STOCKS ─────────────────────────────────────────────────────────────────
  getStocks: async () => {
    const { data, error } = await supabase.from('stocks').select('*')
    if (error) throw error
    // Konversi ke format { outletId: { productId: qty } }
    const result = {}
    data.forEach(row => {
      if (!result[row.outlet_id]) result[row.outlet_id] = {}
      result[row.outlet_id][row.product_id] = row.qty
    })
    return result
  },
  upsertStock: async (outletId, productId, qty) => {
    const { error } = await supabase.from('stocks').upsert({
      outlet_id: outletId, product_id: productId, qty
    }, { onConflict: 'outlet_id,product_id' })
    if (error) throw error
  },
  // Update banyak stok sekaligus (untuk opname/transaksi)
  upsertStocks: async (outletId, stockMap) => {
    const rows = Object.entries(stockMap).map(([pid, qty]) => ({
      outlet_id: outletId, product_id: +pid, qty
    }))
    const { error } = await supabase.from('stocks').upsert(rows, { onConflict: 'outlet_id,product_id' })
    if (error) throw error
  },

  // ── USERS ──────────────────────────────────────────────────────────────────
  getUsers: async () => {
    const { data, error } = await supabase.from('users').select('*')
    if (error) throw error
    // Konversi ke format { username: { pass, nama, role, outletId } }
    const result = {}
    data.forEach(u => {
      result[u.username] = { pass: u.pass, nama: u.nama, role: u.role, outletId: u.outlet_id }
    })
    return result
  },
  upsertUser: async (username, u) => {
    const { error } = await supabase.from('users').upsert({
      username, pass: u.pass, nama: u.nama, role: u.role, outlet_id: u.outletId || null
    }, { onConflict: 'username' })
    if (error) throw error
  },
  deleteUser: async (username) => {
    const { error } = await supabase.from('users').delete().eq('username', username)
    if (error) throw error
  },

  // ── TRANSACTIONS ───────────────────────────────────────────────────────────
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
  // Update items (untuk refund)
  updateTransactionItems: async (id, items) => {
    const { error } = await supabase.from('transactions').update({ items }).eq('id', id)
    if (error) throw error
  },

  // ── STOCK LOGS ─────────────────────────────────────────────────────────────
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
