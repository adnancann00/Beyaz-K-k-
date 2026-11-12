// Salonun WhatsApp numarası (ülke kodu ile, boşluksuz)
const WHATSAPP = '905456610914';
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

// Site Netlify'da yayındaysa talep panelde de kayıt altına alınır
function saveToNetlify(formData) {
  const hosted = location.protocol.startsWith('http') && !['localhost', '127.0.0.1'].includes(location.hostname);
  if (!hosted) return;
  fetch('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(formData).toString(),
  }).catch(() => { /* WhatsApp mesajı zaten hazır; kayıt hatası müşteriyi durdurmaz */ });
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const formData = new FormData(form);
  const data = Object.fromEntries(['ad', 'telefon', 'hizmet', 'tarih', 'saat', 'not']
    .map((k) => [k, String(formData.get(k) || '').trim()]));

  const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage(data))}`;

  // Pencere, tıklamayla aynı anda açılmalı; yoksa tarayıcı engeller
  window.open(url, '_blank', 'noopener');

  saveToNetlify(formData);
  showSummary(data);
  document.getElementById('done-wa').href = url;
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
