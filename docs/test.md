# Test Plan

Rencana test manual untuk dashboard. Path di dokumen ini relatif terhadap root project.

**FE**: `http://localhost:3000`
**Simpan hasil ke**: `test-results/<nama-run>.md`
**Screenshot ke**: `test-results/screenshots/`

Ada dua bagian: **A** untuk sumber JSON endpoint, **B** untuk konektor pihak ketiga dalam mode tes. Keduanya bisa dijalankan terpisah.

---

## Endpoint yang bisa dipakai

Sumber JSON endpoint butuh URL yang mengembalikan JSON. Pakai backend `research-dashboard-express`; daftar lengkap dan bentuk responsnya ada di README repo itu.

| Base URL | Kapan dipakai |
|---|---|
| `https://research-dashboard-express.vercel.app` | Paling mudah: tidak perlu menjalankan backend |
| `http://localhost:<PORT>` | Backend lokal (`cd research-dashboard-express && npm run dev`). Host-nya harus ada di `MOCK_SOURCE_HOSTS` pada `.env.local` dashboard |

| URL sumber | Auth | Isi |
|---|---|---|
| `<base>/api/real/v2/stats/users` | tidak ada | Akun, signup, sesi, tipe user, funnel, retention |
| `<base>/api/real/v2/stats/revenue` | tidak ada | MRR, subscription, revenue |
| `<base>/api/real/v2/stats/content` | tidak ada | Halaman CMS, media, edit |
| `<base>/api/real/v2/stats/cms` | tidak ada | Pemakaian fitur dan kredit |
| `<base>/api/mock/v2/stats/{users\|revenue\|content\|cms}` | Bearer `MOCK_API_KEY` | Data buatan, bentuk sama dengan real |

Catatan:

- Untuk endpoint `real`, field API key dikosongkan.
- Jangan tulis `?range=` di URL sumber, dashboard menambahkannya sendiri per periode.
- Endpoint mock menerima `?simulate=401`, `500`, `rate_limit`, `slow`, `timeout` untuk mencoba tampilan error.

Di langkah-langkah bawah, `<base>` berarti salah satu base URL di atas.

---

## A. Sumber JSON endpoint

### A1. Pastikan backend hidup

```
GET <base>/api/v1/health
GET <base>/api/real/v2/stats/users?range=30d
```

- Kalau backend lokal menolak koneksi: **STOP**, jalankan dulu backend-nya.
- Kalau 200: catat `totals.accounts` untuk dicocokkan di A7.

### A2. Buka home

```
Navigate: http://localhost:3000
```

- Verifikasi: heading "Dashboards" terlihat, tombol "New dashboard" ada.
- Screenshot → `01-home.png`

### A3. Buat dashboard

- Klik **New dashboard**, verifikasi modal berisi Name + Description. Screenshot → `02-new-dashboard-modal.png`
- **Name**: `cms-test-<n>`, **Description**: bebas. Klik **Create dashboard**.
- Verifikasi: pindah ke `/dashboard?d=d_xxxxxxxx` (ID dibuat otomatis, bukan nama dashboard).
- Screenshot → `03-empty-dashboard.png`

### A4. Tambah sumber users

Buka `/sources`, pilih dashboard tadi di filter, klik **Add endpoint**.

| Field | Value |
|---|---|
| Dashboard | dashboard yang baru dibuat |
| Name | `real-users` |
| Endpoint URL | `<base>/api/real/v2/stats/users` |
| API key | kosong |

- Klik **Test connection**. Verifikasi: langkah 2 muncul dengan `200 OK` dan pohon field (`meta`, `totals`, `period`, `series`, `breakdowns`).
- Klik **Save source**. Verifikasi: baris baru di tabel, status `healthy`, snapshots `4/4`.
- Screenshot → `04-source-added.png`

### A5. Tambah sumber revenue

Sama seperti A4 dengan Name `real-revenue` dan URL `<base>/api/real/v2/stats/revenue`.

### A6. Sync

- Klik **Sync these**.
- Verifikasi: kolom "Last attempt" berubah jadi "just now" dan status tetap `healthy`. Kalau `failing`, catat pesannya.
- Screenshot → `05-after-sync.png`

Backend lokal bisa lambat saat beberapa sumber disinkronkan bersamaan (batas 10 detik per panggilan). Kalau satu sumber timeout, sync ulang sumber itu saja lewat ikon sync di barisnya.

### A7. Susun widget dan cocokkan angka

Dashboard baru kosong, jadi widget ditambah manual: buka dashboard, klik **Edit**, **Add widget**, mulai dari kosong, pilih tipe dan sumber, lalu klik field di pohon untuk mengisi slot.

Minimal buat satu widget per tipe:

| Widget | Tipe | Sumber | Binding |
|---|---|---|---|
| Accounts | Stat | real-users | value = `totals.accounts` |
| MRR | Stat | real-revenue | value = `totals.mrr`, format currency |
| Signups | Line | real-users | rows = `series.signups`, x = `date`, y = `count` |
| Signups bar | Bar | real-users | sama dengan di atas |
| Users by type | Breakdown | real-users | rows = `breakdowns.by_user_type`, label = `user_type`, value = `count` |
| Conversion | Funnel | real-users | rows = `breakdowns.conversion_funnel`, label = `step`, value = `count` |
| Users table | Table | real-users | rows = `breakdowns.by_user_type`, kolom `user_type`, `count`, `pct` |

- Verifikasi: angka widget Accounts sama dengan `totals.accounts` dari A1.
- Ganti periode di header (7d, 30d, 90d, 12m). Verifikasi: chart dan angka periode ikut berubah.
- Screenshot → `06-dashboard-with-widgets.png`

### A8. Tampilan error (opsional, pakai endpoint mock)

Tambah sumber dengan URL `<base>/api/mock/v2/stats/users?simulate=500` dan API key `MOCK_API_KEY`.

- Verifikasi: **Test connection** gagal dengan pesan yang sesuai, form tidak lanjut ke langkah 2.
- Ulangi dengan `simulate=401` (pesan key ditolak) dan `simulate=rate_limit`.

---

## B. Konektor pihak ketiga (mode tes)

Tidak butuh akun maupun backend. Syaratnya `ALLOW_MOCK_SOURCES=true` di `.env.local` dashboard.

### B1. Daftar konektor

Buka `/sources`, pilih satu dashboard di filter, gulir ke **Connect a service**.

- Verifikasi: grup Payments, Email, Google, WhatsApp. Stripe, PayPal, Brevo, Google Analytics 4, dan Search Console berstatus "Not connected" dengan tombol **Connect**. Resend dan WhatsApp berstatus "Planned" tanpa tombol.
- Screenshot → `10-connectors.png`

### B2. Validasi form Stripe

Klik **Connect** di baris Stripe.

- Verifikasi: kotak kuning **TESTING** muncul, berisi nilai tes dan daftar endpoint Stripe.
- Isi key `sk_live_abc`, klik **Test connection**. Verifikasi: ditolak dengan pesan bahwa itu full secret key.
- Isi key `hello`. Verifikasi: ditolak, key harus berawalan `rk_live_` atau `rk_test_`.

### B3. Sambungkan dengan nilai tes

- Klik **Fill in test values**, lalu **Test connection**.
- Verifikasi: langkah 2 menampilkan `200 OK`, badge **Test data**, dan pohon field (`meta`, `totals`, `period`, `series`, `breakdowns`).
- Biarkan centang "Add a ready-made “Stripe” page" aktif, klik **Connect Stripe**.
- Verifikasi: pindah ke dashboard pada tab **Stripe** dengan 12 widget terisi, tidak ada widget bertuliskan "field not found".
- Screenshot → `11-stripe-page.png`

### B4. Konektor lain

Ulangi B3 untuk tiap konektor. Tab dan jumlah widget yang diharapkan:

| Konektor | Tab | Widget |
|---|---|---|
| PayPal | PayPal | 10 |
| Brevo | Email | 8 |
| Google Analytics 4 | Traffic | 9 |
| Search Console | Search | 7 |

- Verifikasi tiap tab: semua widget terisi, dan ganti periode mengubah angkanya.

### B5. Status di halaman Sources

Kembali ke `/sources`.

- Verifikasi: tiap konektor yang tersambung berstatus "Connected" dengan badge **Test data**, tombolnya jadi **Edit** dan **Add another**. Di tabel atas, kolom "Reads from" menampilkan nama layanan, bukan URL.
- Klik **Edit** di satu konektor, langsung **Test connection** tanpa mengisi ulang key. Verifikasi: tetap `200 OK` (kredensial tersimpan dipakai).
- Screenshot → `12-sources-connected.png`

### B6. Riwayat sync

Buka `/sync-history`.

- Verifikasi: tiap konektor punya empat baris (satu per periode) berstatus success.

---

## Format hasil (`test-results/<nama-run>.md`)

```md
# Test Results: <nama-run>
**Tanggal**: <isi>
**FE**: http://localhost:3000
**BE**: <base yang dipakai>

## Ringkasan
| Step | Deskripsi | Status | Catatan |
|------|-----------|--------|---------|
| A1 | Backend hidup | PASS/FAIL | accounts=X |
| A2 | Home | PASS/FAIL | |
| A3 | Buat dashboard | PASS/FAIL | /dashboard?d=... |
| A4 | Sumber users | PASS/FAIL | |
| A5 | Sumber revenue | PASS/FAIL | |
| A6 | Sync | PASS/FAIL | status tiap sumber |
| A7 | Widget dan angka | PASS/FAIL | accounts API=X UI=Y |
| A8 | Tampilan error | PASS/FAIL/SKIP | |
| B1 | Daftar konektor | PASS/FAIL | |
| B2 | Validasi Stripe | PASS/FAIL | |
| B3 | Stripe nilai tes | PASS/FAIL | jumlah widget |
| B4 | Konektor lain | PASS/FAIL | per konektor |
| B5 | Status Sources | PASS/FAIL | |
| B6 | Riwayat sync | PASS/FAIL | |

## Data dari API (dicatat saat A1)
- accounts:
- mrr:

## Issues ditemukan
-

## Screenshots
- 01-home.png
- ...
```

---

## Catatan teknis

- Data disimpan di `.data/store.json`. Hapus file itu untuk reset ke data awal.
- Kredensial sumber dienkripsi. Kalau `SOURCES_ENCRYPTION_KEY` atau `.data/secret.key` berganti, sumber lama gagal dengan pesan bahwa kredensial tidak bisa dibuka, dan harus diisi ulang.
- Sync gagal dengan "Endpoint unreachable" berarti backend belum jalan atau host-nya belum ada di `MOCK_SOURCE_HOSTS`.
- URL `http://` hanya diterima untuk host di `MOCK_SOURCE_HOSTS`. Selain itu wajib `https://` dan bukan alamat privat.
- Mode tes konektor memakai data buatan, jadi angkanya tidak bisa dicocokkan dengan layanan asli. Jalur API asli belum pernah dicoba dengan akun sungguhan.
