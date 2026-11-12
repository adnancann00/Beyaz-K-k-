-- Beyaz Köşk: web sitesinden gelen randevu talepleri
-- Supabase panelinde: SQL Editor > New query > bu dosyanın tamamını yapıştırıp Run.
-- (CLI ile: supabase link --project-ref ftfdgduujohjieenvnnf && supabase db push)

create table if not exists public.randevular (
  id          bigint generated always as identity primary key,
  olusturma   timestamptz not null default now(),
  ad          text not null check (char_length(ad) between 2 and 80),
  telefon     text not null check (telefon ~ '^[0-9 +()]{10,17}$'),
  hizmet      text not null check (hizmet in (
                'Renk ve balyaj', 'Kesim', 'Keratin ve bakım', 'Saç kaynak',
                'Fön ve dalga', 'Özel gün', 'Diğer')),
  tarih       date not null,
  saat        text not null check (saat ~ '^(09|1[0-9]|2[01]):(00|30)$'),
  notlar      text check (notlar is null or char_length(notlar) <= 500),
  durum       text not null default 'yeni' check (durum in ('yeni', 'onaylandi', 'iptal'))
);

comment on table public.randevular is 'Web sitesindeki randevu formundan gelen talepler';

-- Satır düzeyinde güvenlik: ziyaretçi yalnızca yeni talep ekleyebilir, hiçbir kaydı okuyamaz.
alter table public.randevular enable row level security;

drop policy if exists "Ziyaretci randevu talebi ekleyebilir" on public.randevular;
create policy "Ziyaretci randevu talebi ekleyebilir"
  on public.randevular
  for insert
  to anon
  with check (durum = 'yeni' and tarih >= current_date and tarih <= current_date + 60);

-- Ziyaretçiye yalnızca ekleme izni (okuma, güncelleme, silme yok)
revoke all on public.randevular from anon;
grant insert (ad, telefon, hizmet, tarih, saat, notlar) on public.randevular to anon;

-- Panelde yeni talepleri hızlı listelemek için
create index if not exists randevular_tarih_idx on public.randevular (tarih, saat);
