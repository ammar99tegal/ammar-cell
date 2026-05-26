-- ============================================================
-- AMMAR CELL — Setup Database Supabase
-- Jalankan script ini di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PRODUCTS (master produk, tanpa stok — stok ada di tabel stocks)
create table if not exists products (
  id         serial primary key,
  name       text not null,
  barcode    text default '',
  category   text not null,
  price      integer not null default 0,
  modal      integer not null default 0,
  created_at timestamp with time zone default now()
);

-- 2. OUTLETS
create table if not exists outlets (
  id      text primary key,
  nama    text not null,
  alamat  text default '',
  aktif   boolean default true
);

-- 3. STOCKS (stok per outlet per produk)
create table if not exists stocks (
  outlet_id  text not null,
  product_id integer not null,
  qty        integer not null default 0,
  primary key (outlet_id, product_id)
);

-- 4. USERS (kasir & admin)
create table if not exists users (
  username  text primary key,
  pass      text not null,
  nama      text not null,
  role      text not null default 'karyawan',  -- 'admin' | 'karyawan'
  outlet_id text default null
);

-- 5. TRANSACTIONS
create table if not exists transactions (
  id         text primary key,
  outlet_id  text,
  shift_id   text,
  shift_nama text,
  kasir      text,
  date       text,
  time       text,
  total      integer default 0,
  cash       integer default 0,
  kembalian  integer default 0,
  items      jsonb default '[]',
  created_at timestamp with time zone default now()
);

-- 6. STOCK LOGS
create table if not exists stock_logs (
  id           text primary key,
  time         text,
  type         text,  -- 'masuk' | 'keluar' | 'transfer'
  outlet_nama  text,
  product_name text,
  qty          integer default 0,
  note         text default '',
  created_at   timestamp with time zone default now()
);

-- ============================================================
-- DATA AWAL (seed)
-- ============================================================

-- Outlet awal
insert into outlets (id, nama, alamat, aktif) values
  ('o1', 'Ammar Cell Pusat',    'Jl. Utama No.1',  true),
  ('o2', 'Ammar Cell Cabang 1', 'Jl. Cabang No.2', true),
  ('o3', 'Ammar Cell Cabang 2', 'Jl. Cabang No.3', true)
on conflict (id) do nothing;

-- User awal (GANTI PASSWORD setelah deploy!)
insert into users (username, pass, nama, role, outlet_id) values
  ('admin',  'admin123',  'Admin',          'admin',    null),
  ('ammar',  'boss123',   'Ammar (Boss)',   'admin',    null),
  ('kasir1', 'kasir123',  'Kasir Pusat',    'karyawan', 'o1'),
  ('kasir2', 'kasir456',  'Kasir Cabang1',  'karyawan', 'o2'),
  ('kasir3', 'kasir789',  'Kasir Cabang2',  'karyawan', 'o3')
on conflict (username) do nothing;

-- Produk awal
insert into products (name, barcode, category, price, modal) values
  ('Indomie Goreng',       '8991101152', 'Mie',         3500,  2800),
  ('Aqua 600ml',           '8996001100', 'Minuman',     4000,  3000),
  ('Teh Botol 350ml',      '8992388000', 'Minuman',     5000,  3800),
  ('Roti Tawar Sari Roti', '8994350010', 'Roti',        14000, 11000),
  ('Susu Ultra 250ml',     '8999999010', 'Susu',        5500,  4200),
  ('Chitato 68g',          '8991101200', 'Snack',       10000, 7500),
  ('Good Day Cappuccino',  '8998866010', 'Minuman',     3000,  2200),
  ('Roma Kelapa',          '8994350050', 'Snack',       8000,  6000),
  ('Minyak Goreng 1L',     '8992100010', 'Dapur',       18000, 15000),
  ('Sabun Lifebuoy',       '8991101300', 'Kebersihan',  5000,  3800),
  ('Pocari Sweat 500ml',   '8997005010', 'Minuman',     8000,  6000),
  ('Biskuit Oreo',         '8993272010', 'Snack',       9000,  7000)
on conflict do nothing;

-- Stok awal: semua outlet mulai dengan 50 pcs per produk
-- (akan diisi otomatis oleh trigger di bawah)

-- ============================================================
-- TRIGGER: auto-create stok 0 untuk produk baru di semua outlet
-- ============================================================
create or replace function init_stock_for_new_product()
returns trigger as $$
begin
  insert into stocks (outlet_id, product_id, qty)
  select id, new.id, 0 from outlets
  on conflict (outlet_id, product_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_product_insert on products;
create trigger on_product_insert
  after insert on products
  for each row execute function init_stock_for_new_product();

-- Trigger: auto-create stok 0 untuk outlet baru di semua produk
create or replace function init_stock_for_new_outlet()
returns trigger as $$
begin
  insert into stocks (outlet_id, product_id, qty)
  select new.id, id, 0 from products
  on conflict (outlet_id, product_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_outlet_insert on outlets;
create trigger on_outlet_insert
  after insert on outlets
  for each row execute function init_stock_for_new_outlet();

-- Init stok untuk produk yang sudah ada
insert into stocks (outlet_id, product_id, qty)
select o.id, p.id, 50
from outlets o cross join products p
on conflict (outlet_id, product_id) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — biarkan anon key bisa akses
-- Untuk production: ganti dengan policy yang lebih ketat
-- ============================================================
alter table products    enable row level security;
alter table outlets     enable row level security;
alter table stocks      enable row level security;
alter table users       enable row level security;
alter table transactions enable row level security;
alter table stock_logs  enable row level security;

-- Allow semua operasi dari anon key (cocok untuk app internal)
create policy "allow all products"     on products     for all using (true) with check (true);
create policy "allow all outlets"      on outlets      for all using (true) with check (true);
create policy "allow all stocks"       on stocks       for all using (true) with check (true);
create policy "allow all users"        on users        for all using (true) with check (true);
create policy "allow all transactions" on transactions for all using (true) with check (true);
create policy "allow all stock_logs"   on stock_logs   for all using (true) with check (true);

-- ============================================================
-- SELESAI! 
-- Sekarang kembali ke panduan deploy.
-- ============================================================
