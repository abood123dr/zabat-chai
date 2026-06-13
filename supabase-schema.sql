-- ===== ظبط شاي - Supabase Schema =====
-- Run this in: Supabase Dashboard > SQL Editor

-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  is_active boolean default true,
  sort_order integer default 0,
  created_date timestamptz default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  price numeric not null default 0,
  category text,
  is_available boolean default true,
  is_featured boolean default false,
  is_offer boolean default false,
  image text,
  description text,
  created_date timestamptz default now()
);

-- Dining Tables
create table if not exists dining_tables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text default 'table', -- 'table' or 'room'
  status text default 'available', -- 'available', 'occupied'
  number integer,
  created_date timestamptz default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  table_name text,
  items text, -- JSON string
  total numeric default 0,
  status text default 'received', -- 'received', 'preparing', 'ready', 'delivered'
  notes text,
  customer_action text default 'none', -- 'none', 'call_waiter', 'request_bill'
  created_date timestamptz default now()
);

-- Room Sessions
create table if not exists room_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id text,
  status text default 'active',
  created_date timestamptz default now()
);

-- Enable Row Level Security (allow all for now)
alter table categories enable row level security;
alter table products enable row level security;
alter table dining_tables enable row level security;
alter table orders enable row level security;
alter table room_sessions enable row level security;

-- Allow public read/write (adjust later for production)
create policy "public_all" on categories for all using (true) with check (true);
create policy "public_all" on products for all using (true) with check (true);
create policy "public_all" on dining_tables for all using (true) with check (true);
create policy "public_all" on orders for all using (true) with check (true);
create policy "public_all" on room_sessions for all using (true) with check (true);

-- Enable realtime for orders
alter publication supabase_realtime add table orders;
