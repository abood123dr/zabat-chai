-- ===== ظبط شاي - SaaS Schema =====
-- نظام متعدد المستأجرين - كل كافيه له بياناته المعزولة

-- الأعمال
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_en text,
  address text,
  phone text,
  logo_url text,
  currency text default 'ر.س',
  opening_time text default '09:00',
  closing_time text default '24:00',
  is_active boolean default true,
  created_date timestamptz default now()
);

-- مستخدمو الأعمال
create table if not exists business_users (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  user_id uuid,
  email text not null,
  full_name text,
  role text default 'cashier',
  is_active boolean default true,
  created_date timestamptz default now()
);

-- دعوات التسجيل
create table if not exists user_invitations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  email text,
  role text default 'cashier',
  invite_code uuid unique default gen_random_uuid(),
  is_used boolean default false,
  created_date timestamptz default now()
);

-- الفئات
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  name_en text,
  is_active boolean default true,
  sort_order integer default 0,
  created_date timestamptz default now()
);

-- المنتجات
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
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

-- الطاولات والغرف
create table if not exists dining_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  name text not null,
  type text default 'table',
  status text default 'available',
  number integer,
  device_type text,
  hourly_rate numeric default 0,
  capacity integer default 4,
  created_date timestamptz default now()
);

-- الطلبات
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  table_name text,
  items text,
  total numeric default 0,
  status text default 'received',
  notes text,
  customer_action text default 'none',
  created_date timestamptz default now()
);

-- جلسات الغرف
create table if not exists room_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  table_id text,
  status text default 'active',
  start_time timestamptz default now(),
  hours_booked numeric default 1,
  free_hours numeric default 0,
  hourly_rate numeric default 0,
  customer_name text,
  notes text,
  created_date timestamptz default now()
);

-- تفعيل RLS
alter table businesses enable row level security;
alter table business_users enable row level security;
alter table user_invitations enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table dining_tables enable row level security;
alter table orders enable row level security;
alter table room_sessions enable row level security;

-- سياسات مفتوحة (يمكن تضييقها لاحقاً بعد الإطلاق)
create policy "allow_all" on businesses for all using (true) with check (true);
create policy "allow_all" on business_users for all using (true) with check (true);
create policy "allow_all" on user_invitations for all using (true) with check (true);
create policy "allow_all" on categories for all using (true) with check (true);
create policy "allow_all" on products for all using (true) with check (true);
create policy "allow_all" on dining_tables for all using (true) with check (true);
create policy "allow_all" on orders for all using (true) with check (true);
create policy "allow_all" on room_sessions for all using (true) with check (true);

-- Realtime للطلبات
alter publication supabase_realtime add table orders;
