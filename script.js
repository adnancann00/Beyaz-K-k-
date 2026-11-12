// Salonun WhatsApp numarası (ülke kodu ile, boşluksuz)
const WHATSAPP = '905456610914';
// Supabase: randevu talepleri buraya kaydedilir.
// Bu anahtar herkese açık olacak şekilde tasarlanmıştır; tablo kuralları yalnızca ekleme izni verir.
const SUPABASE_URL = 'https://ftfdgduujohjieenvnnf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_vMhmdMUHdh21Z-Gr90QqYA_3ahxQNY1';
// Çalışma saatleri: her gün 09:00 ile 22:00. Son randevu 21:30.
const OPEN = 9 * 60;
const LAST_SLOT = 21 * 60 + 30;
const STEP = 30;

/* ---------- Mobil menü ---------- */
const toggle = document.querySelector('.menu-toggle');
const nav = document.getElementById('nav');

function setMenu(open) {
  nav.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setMenu(false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

/* ---------- Randevu formu ---------- */
const form = document.getElementById('randevu-form');
const done = document.getElementById('randevu-done');
const statusEl = form.querySelector('.form__status');
const hizmet = document.getElementById('hizmet');
const tarih = document.getElementById('tarih');
const saat = document.getElementById('saat');

// Hizmet listesindeki "Randevu al" bağlantısı, formu o hizmet seçili açar
document.querySelectorAll('[data-service]').forEach((link) => {
  link.addEventListener('click', () => {
    if (!done.hidden) resetForm();
    hizmet.value = link.dataset.service;
    setTimeout(() => document.getElementById('ad').focus({ preventScroll: true }), 600);
  });
});

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// Geçmiş günler seçilemez; bugün son randevu saati geçtiyse en erken yarın
function setMinDate() {
  const now = new Date();
  const first = new Date(now);
  if (now.getHours() * 60 + now.getMinutes() >= LAST_SLOT) first.setDate(first.getDate() + 1);
  tarih.min = isoDate(first);
  const max = new Date(now);
  max.setDate(max.getDate() + 60);
  tarih.max = isoDate(max);
}

// Seçilen güne göre saatleri doldur; bugünse geçmiş saatleri atla
function fillSlots() {
  const previous = saat.value;
  saat.innerHTML = '';
  if (!tarih.value) {
    saat.add(new Option('Önce gün seçin', ''));
    return;
  }
  const now = new Date();
  const isToday = tarih.value === isoDate(now);
  const earliest = isToday ? now.getHours() * 60 + now.getMinutes() + 30 : OPEN;
  saat.add(new Option('Saat seçin', ''));
  for (let m = OPEN; m <= LAST_SLOT; m += STEP) {
    if (m < earliest) continue;
    const label = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    saat.add(new Option(label, label));
  }
  if (saat.options.length === 1) saat.options[0].text = 'Bugün için boş saat kalmadı';
  if ([...saat.options].some((o) => o.value === previous)) saat.value = previous;
}

setMinDate();
fillSlots();
tarih.addEventListener('change', fillSlots);

function readableDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function buildMessage(data) {
  const lines = [
    'Merhaba, web sitenizden randevu almak istiyorum.',
    '',
    `Ad soyad: ${data.ad}`,
    `Telefon: ${data.telefon}`,
    `Hizmet: ${data.hizmet}`,
    `Gün: ${readableDate(data.tarih)}`,
    `Saat: ${data.saat}`,
  ];
  if (data.not) lines.push(`Not: ${data.not}`);
  return lines.join('\n');
}

function showSummary(data) {
  const rows = [
    ['Ad soyad', data.ad],
    ['Hizmet', data.hizmet],
    ['Gün', readableDate(data.tarih)],
    ['Saat', data.saat],
  ];
  const dl = document.getElementById('done-summary');
  dl.innerHTML = '';
  rows.forEach(([k, v]) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = k;
    dd.textContent = v;
    wrap.append(dt, dd);
    dl.append(wrap);
  });
}

function resetForm() {
  form.reset();
  fillSlots();
  done.hidden = true;
  form.hidden = false;
  statusEl.textContent = '';
}
document.getElementById('done-new').addEventListener('click', () => {
  resetForm();
  document.getElementById('ad').focus();
});

// Talebi Supabase'deki "randevular" tablosuna kaydeder
async function saveBooking(data) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/randevular`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ad: data.ad,
        telefon: data.telefon,
        hizmet: data.hizmet,
        tarih: data.tarih,
        saat: data.saat,
        notlar: data.not || null,
      }),
      signal: controller.signal,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

const submitBtn = form.querySelector('button[type="submit"]');
const submitLabel = submitBtn.innerHTML;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const data = Object.fromEntries(['ad', 'telefon', 'hizmet', 'tarih', 'saat', 'not']
    .map((k) => [k, String(formData.get(k) || '').trim()]));
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage(data))}`;

  // Bot tuzağı doluysa kaydetmeden başarı göster
  const isBot = Boolean(formData.get('bot-field'));

  submitBtn.disabled = true;
  submitBtn.textContent = 'Gönderiliyor...';
  statusEl.textContent = '';

  const saved = isBot ? true : await saveBooking(data);

  submitBtn.disabled = false;
  submitBtn.innerHTML = submitLabel;

  if (!saved) {
    statusEl.innerHTML = '';
    statusEl.append('Talebiniz kaydedilemedi. Bağlantınızı kontrol edip tekrar deneyin ya da ');
    const wa = document.createElement('a');
    wa.href = waUrl;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.textContent = 'WhatsApp\'tan yazın';
    statusEl.append(wa, '.');
    return;
  }

  showSummary(data);
  document.getElementById('done-wa').href = waUrl;
  form.hidden = true;
  done.hidden = false;
  done.focus();
});

/* ---------- Mobil çubuk: açılışta ve randevu formundayken gizli ---------- */
const bar = document.getElementById('mobile-bar');
const heroEl = document.querySelector('.hero');
const bookingEl = document.getElementById('randevu');
function updateBar() {
  const vh = window.innerHeight;
  const hero = heroEl.getBoundingClientRect();
  const booking = bookingEl.getBoundingClientRect();
  const heroOnScreen = hero.bottom > vh * 0.3;
  const bookingOnScreen = booking.top < vh * 0.7 && booking.bottom > vh * 0.3;
  bar.classList.toggle('is-hidden', heroOnScreen || bookingOnScreen);
}
window.addEventListener('scroll', updateBar, { passive: true });
window.addEventListener('resize', updateBar);
updateBar();

/* ---------- Telif yılı ---------- */
document.getElementById('yil').textContent = new Date().getFullYear();
