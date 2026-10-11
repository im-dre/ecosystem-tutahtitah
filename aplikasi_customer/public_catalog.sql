-- Public Catalog Boundary
-- Jalankan script ini di Supabase SQL Editor.
-- View sengaja hanya mengekspos kolom yang dibutuhkan aplikasi customer.

create or replace view public.public_catalog_merchants as
select
  id,
  name,
  description,
  address,
  logo_url,
  banner_url,
  operating_hours,
  is_custom_order
from public.merchants
where status = 'approved'
  and is_active = true;

create or replace view public.public_catalog_products as
select
  id,
  merchant_id,
  name,
  description,
  category,
  price,
  image_url,
  variants,
  badge,
  rating_score,
  total_ratings,
  favorite_count
from public.products
where is_available = true
  and exists (
    select 1
    from public.merchants
    where merchants.id = products.merchant_id
      and merchants.status = 'approved'
      and merchants.is_active = true
  );

revoke all on public.public_catalog_merchants from public;
revoke all on public.public_catalog_products from public;
grant select on public.public_catalog_merchants to anon, authenticated;
grant select on public.public_catalog_products to anon, authenticated;