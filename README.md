# Beyaz Köşk Kuaför

Beşiktaş Barbaros Bulvarı'ndaki Beyaz Köşk Kuaför için tek sayfalık, mobil öncelikli web sitesi.

Statik site: HTML, CSS ve JavaScript. Derleme adımı yok.

## Yerelde açmak

```
python3 -m http.server 8000
```

Sonra tarayıcıda http://localhost:8000 adresini açın.

## Özellikler

- WhatsApp ile randevu formu (gün ve saat seçimi, geçmiş saatler kapalı)
- Netlify Forms uyumlu (Netlify'da yayınlanırsa talepler panele de düşer)
- Telefonda tek elle kullanım: 48 px dokunma alanları, alttaki sabit arama ve randevu çubuğu
- SEO: başlık ve açıklama, Open Graph, yerel işletme şeması, sitemap.xml, robots.txt

## Yayından önce

- `index.html`, `sitemap.xml` ve `robots.txt` içindeki `www.beyazkoskkuafor.com` örnek adresini gerçek alan adıyla değiştirin.
- `vercel.json` içindeki `noindex` satırı siteyi Google'dan gizler. İşletme onay verince kaldırın.
- Görseller işletmenin Google Maps fotoğraflarıdır. Yayından önce işletmenin onayı alınmalıdır.

## Görselleri değiştirirken

`vercel.json` görselleri tarayıcıda 30 gün önbellekte tutar. Bir görseli aynı adla değiştirdiğinizde
`index.html` içindeki `?v=` sürüm etiketini de değiştirin; yoksa ziyaretçiler eski görseli görmeye devam eder.
