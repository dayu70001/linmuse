create extension if not exists "pgcrypto";

create table if not exists public.site_images (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  label text not null,
  section text not null,
  image_url text,
  alt_text text,
  sort_order integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value text,
  label text,
  section text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  product_code text unique not null,
  slug text unique not null,
  category text not null default 'Apparel',
  subcategory text,
  title_en text not null,
  description_en text,
  source_title_cn text,
  source_description_cn text,
  title_source_cn text,
  description_source_cn text,
  sizes_display text default 'Contact us for current size availability',
  colors_display text default 'Contact us for available color options',
  moq text default 'From 1 piece',
  delivery_time text default '7-12 business days',
  main_image_url text,
  main_thumbnail_url text,
  gallery_image_urls jsonb default '[]'::jsonb,
  gallery_thumbnail_urls jsonb default '[]'::jsonb,
  image_count integer default 0,
  source_url text,
  source_product_url text,
  source_album_url text,
  source_fingerprint text,
  import_batch_id text,
  imported_at timestamp with time zone default now(),
  status text default 'draft',
  is_active boolean default false,
  is_featured boolean default false,
  notes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.products
add column if not exists main_thumbnail_url text;

alter table public.products
add column if not exists gallery_thumbnail_urls jsonb default '[]'::jsonb;

alter table public.products
add column if not exists source_album_url text;

alter table public.products
add column if not exists source_fingerprint text;

alter table public.products
add column if not exists import_batch_id text;

alter table public.products
add column if not exists imported_at timestamp with time zone default now();

create unique index if not exists products_source_fingerprint_unique
on public.products (source_fingerprint)
where source_fingerprint is not null;

create index if not exists products_import_batch_id_idx
on public.products (import_batch_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists site_images_updated_at on public.site_images;
create trigger site_images_updated_at
before update on public.site_images
for each row execute function public.set_updated_at();

drop trigger if exists site_settings_updated_at on public.site_settings;
create trigger site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.site_images enable row level security;
alter table public.site_settings enable row level security;
alter table public.products enable row level security;

drop policy if exists "Public can read site images" on public.site_images;
create policy "Public can read site images"
on public.site_images for select
using (true);

drop policy if exists "Admins can manage site images" on public.site_images;
create policy "Admins can manage site images"
on public.site_images for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
on public.site_settings for select
using (true);

drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings"
on public.site_settings for all
to authenticated
using (true)
with check (true);

drop policy if exists "Public can read active products" on public.products;
create policy "Public can read active products"
on public.products for select
using (is_active = true);

drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all
to authenticated
using (true)
with check (true);

insert into public.site_images (key, label, section, image_url, alt_text, sort_order) values
('hero_main_image', 'Homepage Main Image', 'Homepage', null, 'Neutral fashion product composition for LM Dkbrand', 1),
('category_apparel', 'Apparel Category Image', 'Category Images', null, 'Neutral apparel selection for LM Dkbrand', 10),
('category_shoes', 'Shoes Category Image', 'Category Images', null, 'Curated lifestyle shoes for retail and wholesale', 11),
('category_watches', 'Watches Category Image', 'Category Images', null, 'Minimal fashion watches selection', 12),
('category_bags', 'Bags Category Image', 'Category Images', null, 'Fashion bags selection for retail buyers', 13),
('new_arrival_apparel', 'New Arrival Apparel Image', 'New Arrival Preview Images', null, 'Refined casual apparel preview', 20),
('new_arrival_shoes', 'New Arrival Shoes Image', 'New Arrival Preview Images', null, 'Everyday lifestyle sneaker preview', 21),
('new_arrival_watches', 'New Arrival Watches Image', 'New Arrival Preview Images', null, 'Minimal everyday watch preview', 22),
('new_arrival_bags', 'New Arrival Bags Image', 'New Arrival Preview Images', null, 'Structured daily tote preview', 23),
('factory_01', 'Material Checking Image', 'Factory Direct Images', null, 'Factory preparation update', 30),
('factory_02', 'Production Updates Image', 'Factory Direct Images', null, 'Factory production update', 31),
('factory_03', 'Packing Preparation Image', 'Factory Direct Images', null, 'Factory packing preparation', 32),
('shipping_01', 'Packing Photos Image', 'Shipping Proof Images', null, 'Packing and shipping proof', 40),
('shipping_02', 'Shipping Updates Image', 'Shipping Proof Images', null, 'Packing and shipping update', 41),
('shipping_04', 'Warehouse Updates Image', 'Shipping Proof Images', null, 'Warehouse preparation update', 43),
('customer_feedback_01', 'Feedback 01', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 50),
('customer_feedback_02', 'Feedback 02', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 51),
('customer_feedback_03', 'Feedback 03', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 52),
('customer_feedback_04', 'Feedback 04', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 53),
('customer_feedback_05', 'Feedback 05', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 54),
('customer_feedback_06', 'Feedback 06', 'Customer Feedback Gallery', null, 'Buyer feedback with private details hidden', 55)
on conflict (key) do nothing;

insert into public.site_settings (key, value, label, section) values
('whatsapp_retail', '', 'WhatsApp retail number', 'Contact'),
('whatsapp_wholesale', '', 'WhatsApp wholesale number', 'Contact'),
('whatsapp_after_sales', '', 'WhatsApp after-sales number', 'Contact'),
('telegram_channel', '', 'Telegram channel', 'Social'),
('instagram_url', '', 'Instagram URL', 'Social'),
('facebook_url', '', 'Facebook URL', 'Social'),
('email', 'sales@lmdkbrand.com', 'Email', 'Contact')
on conflict (key) do nothing;

insert into storage.buckets (id, name, public)
values ('site-images', 'site-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view site images" on storage.objects;
create policy "Public can view site images"
on storage.objects for select
using (bucket_id = 'site-images');

drop policy if exists "Admins can upload site images" on storage.objects;
create policy "Admins can upload site images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'site-images');

drop policy if exists "Admins can update site images" on storage.objects;
create policy "Admins can update site images"
on storage.objects for update
to authenticated
using (bucket_id = 'site-images')
with check (bucket_id = 'site-images');

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view product images" on storage.objects;
create policy "Public can view product images"
on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product images" on storage.objects;
create policy "Admins can upload product images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "Admins can update product images" on storage.objects;
create policy "Admins can update product images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images')
with check (bucket_id = 'product-images');
