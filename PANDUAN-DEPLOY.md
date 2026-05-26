# 🚀 Panduan Deploy Ammar Cell ke Vercel

## Yang Kamu Butuhkan
- Laptop/PC (Windows/Mac/Linux)
- Koneksi internet
- Akun email (untuk daftar)

---

## STEP 1 — Install Node.js (5 menit)

1. Buka: **https://nodejs.org**
2. Klik tombol hijau **"LTS"** → download → install
3. Setelah install, buka **Terminal** (Mac/Linux) atau **Command Prompt** (Windows)
4. Ketik: `node --version` → harus muncul angka versi

---

## STEP 2 — Setup Database Supabase (10 menit)

1. Buka: **https://supabase.com** → Sign Up (gratis)
2. Klik **"New Project"**
   - Name: `ammar-cell`
   - Password: buat password (simpan!)
   - Region: pilih **Southeast Asia (Singapore)**
3. Tunggu project dibuat (~2 menit)
4. Klik **"SQL Editor"** di menu kiri → **"New Query"**
5. **Copy-paste seluruh isi file `supabase-setup.sql`** ke sana
6. Klik **"Run"** → harus muncul "Success"

### Ambil API Keys:
7. Klik **"Settings"** (ikon gear) → **"API"**
8. Catat 2 nilai ini:
   - **Project URL**: `https://xxxx.supabase.co`
   - **anon/public key**: `eyJxxx...` (yang panjang)

---

## STEP 3 — Isi API Keys ke Aplikasi (2 menit)

Buka file **`src/supabase.js`** dengan Notepad/teks editor, ganti:

```js
const SUPABASE_URL = 'https://XXXX.supabase.co'   // ← isi URL kamu
const SUPABASE_KEY = 'eyJXXXX...'                  // ← isi key kamu
```

Simpan file.

---

## STEP 4 — Daftar GitHub & Upload Kode (10 menit)

1. Buka: **https://github.com** → Sign Up (gratis)
2. Klik **"+"** → **"New repository"**
   - Repository name: `ammar-cell`
   - Pilih **Public**
   - Klik **"Create repository"**

3. Buka Terminal/Command Prompt, navigasi ke folder `ammar-cell`:
```bash
cd path/ke/folder/ammar-cell
```

4. Jalankan perintah ini satu per satu:
```bash
npm install
git init
git add .
git commit -m "Ammar Cell Kasir v1.0"
git branch -M main
git remote add origin https://github.com/USERNAME/ammar-cell.git
git push -u origin main
```
*(Ganti USERNAME dengan username GitHub kamu)*

---

## STEP 5 — Deploy ke Vercel (5 menit)

1. Buka: **https://vercel.com** → **"Sign Up with GitHub"**
2. Klik **"New Project"**
3. Pilih repository **ammar-cell** → klik **"Import"**
4. Biarkan semua setting default
5. Klik **"Deploy"**
6. Tunggu ~1 menit → **SELESAI!** 🎉

Vercel akan kasih URL seperti:
```
https://ammar-cell-xxxx.vercel.app
```

---

## STEP 6 — Bagikan ke Karyawan

Karyawan tinggal buka URL tersebut di browser HP/laptop mereka.

### Login awal:
| Username | Password | Role |
|---|---|---|
| ammar | boss123 | Admin/Boss |
| admin | admin123 | Admin |
| kasir1 | kasir123 | Kasir Pusat |
| kasir2 | kasir456 | Kasir Cabang 1 |
| kasir3 | kasir789 | Kasir Cabang 2 |

⚠️ **GANTI PASSWORD** setelah pertama login! (Menu Outlet → Kasir & User)

### Tambahkan ke Home Screen HP:
- **Android**: Buka Chrome → Menu (⋮) → "Add to Home Screen"
- **iPhone**: Buka Safari → Share (□↑) → "Add to Home Screen"

---

## 🔄 Update Aplikasi (kalau ada perubahan)

```bash
git add .
git commit -m "update"
git push
```

Vercel otomatis deploy ulang dalam ~1 menit.

---

## ❓ Troubleshooting

**"Tidak bisa terhubung ke database"**
→ Cek kembali URL dan KEY di `src/supabase.js`

**"npm install error"**
→ Pastikan Node.js sudah terinstall (`node --version`)

**Karyawan tidak bisa login**
→ Pastikan username dan password benar (case-sensitive)

**Data tidak tersimpan**
→ Cek koneksi internet, cek Supabase dashboard apakah project aktif

---

Butuh bantuan? Hubungi developer atau buka kembali percakapan ini di Claude.
