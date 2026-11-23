# research-dashboard

Dashboard statistik yang disusun sendiri oleh user: daftarkan sumber data, pilih tipe widget, lalu tunjuk field mana dari respons JSON yang mengisi widget itu. Dibangun dengan Next.js. Statusnya masih **prototype**: belum ada login, dan data disimpan di satu file JSON.

Backend penyedia data ada di repo terpisah, `research-dashboard-express` (lihat [Endpoint untuk testing](#endpoint-untuk-testing)).

## Menjalankan

```bash
bun install
bun dev        # http://localhost:3000
```

Buat `.env.local`:

| Variable | Keterangan |
|---|---|
| `ALLOW_MOCK_SOURCES` | `true` untuk development. Mengizinkan sumber `http://` ke host di `MOCK_SOURCE_HOSTS`, dan mengaktifkan mode tes konektor pihak ketiga |
| `MOCK_SOURCE_HOSTS` | Host backend lokal yang boleh dipakai sebagai sumber, dipisah koma. Contoh: `localhost:3001` |
| `MOCK_SOURCE_BASE` | Base URL endpoint mock, dipakai untuk sumber bawaan saat store pertama kali dibuat. Contoh: `http://localhost:3001/api/mock/v2/stats` |
| `MOCK_API_KEY` | Bearer key untuk endpoint mock |
| `SOURCES_ENCRYPTION_KEY` | Kunci enkripsi kredensial sumber. Kalau kosong, kunci acak dibuat di `.data/secret.key`. **Wajib diisi di produksi** |

Port di `MOCK_SOURCE_HOSTS` dan `MOCK_SOURCE_BASE` harus sama dengan `PORT` backend (default backend `4000`).

## Cara kerja

1. **Dashboard** berisi beberapa halaman (tab), tiap halaman punya grid 12 kolom berisi widget.
2. **Sumber** milik satu dashboard dan dipakai banyak widget. Ada dua jenis:
   - **JSON endpoint**: URL buatan kita, dipanggil dengan `GET` dan `Authorization: Bearer <key>`, sekali per periode (`?range=7d|30d|90d|12m`).
   - **Konektor pihak ketiga**: Stripe, PayPal, Brevo, Google Analytics 4, Search Console. Konektor membaca layanannya sekali, lalu menurunkan keempat periode dari data itu.
3. **Sync** menyimpan hasilnya sebagai snapshot per sumber per periode. Widget hanya membaca snapshot, tidak pernah memanggil sumber saat halaman dibuka. Kalau sync gagal, snapshot terakhir tetap dipakai dan sumber ditandai error.
4. **Widget** = tipe + sumber + path per slot. Path memakai titik (`totals.accounts`, `plans.0.name`), tanpa rumus. Tipe: `stat`, `bar`, `line`, `breakdown`, `funnel`, `table`.

Sync berjalan saat sumber disimpan dan saat tombol Sync ditekan. Cron harian belum dipasang.

### Halaman

| Path | Isi |
|---|---|
| `/` | Daftar dashboard, buat dashboard baru |
| `/dashboard?d=<id>&page=<id>&range=30d` | Tampilan dashboard |
| `/dashboard/edit` | Mode edit: tambah, atur, hapus widget dan halaman |
| `/dashboard/edit/widget` | Editor satu widget: pohon field di kiri, preview, slot |
| `/sources` | Daftar sumber, tambah endpoint, sambungkan layanan |
| `/sync-history` | Riwayat sync per sumber per periode |

## Konektor pihak ketiga

Disambungkan dari `/sources`, bagian **Connect a service**. Setelah tersambung, konektor bisa langsung menambahkan satu halaman siap pakai ke dashboard.

| Konektor | Yang diisi | Halaman bawaan |
|---|---|---|
| Stripe | Restricted key read-only (`rk_live_…`). Key `sk_live_…` ditolak | Stripe |
| PayPal | Client ID, Secret, environment | PayPal |
| Brevo | API key | Email |
| Google Analytics 4 | Property ID + JSON service account | Traffic |
| Search Console | Properti (`sc-domain:…`) + JSON service account | Search |
| Resend, WhatsApp | Belum dibuat, tampil sebagai "Planned" | |

**Mode tes.** Saat `ALLOW_MOCK_SOURCES=true`, modal Connect menampilkan kotak kuning **TESTING** berisi nilai yang harus diisi dan tombol **Fill in test values**. Dengan nilai itu (`demo` di field rahasia pertama) konektor dijawab dengan data buatan berbentuk respons API aslinya, dan tidak ada yang dikirim ke layanan tersebut. Sumber seperti ini diberi badge **Test data**.

**Jalur API asli belum pernah dicoba dengan akun sungguhan.** Endpoint dan bentuk responsnya ditulis dari dokumentasi masing-masing layanan, jadi anggap belum teruji sampai dicoba dengan key asli.

## Endpoint untuk testing

Untuk mencoba sumber jenis JSON endpoint, pakai backend `research-dashboard-express`. Daftar lengkap dan bentuk responsnya ada di README repo itu.

| Base URL | Keterangan |
|---|---|
| `https://research-dashboard-express.vercel.app` | Produksi. Bisa langsung dipakai sebagai sumber, tanpa menjalankan apa pun |
| `http://localhost:<PORT>` | Lokal (`npm run dev` di repo backend). Host-nya harus ada di `MOCK_SOURCE_HOSTS` |

**Data asli dari Supabase**, tanpa auth, field API key dikosongkan:

| URL sumber | Isi |
|---|---|
| `<base>/api/real/v2/stats/users` | Akun, signup, sesi aktif, tipe user, role, funnel konversi, retention |
| `<base>/api/real/v2/stats/revenue` | MRR, subscription, revenue, per plan |
| `<base>/api/real/v2/stats/content` | Halaman CMS, draft, media, edit, redirect |
| `<base>/api/real/v2/stats/cms` | Pemakaian fitur dan kredit |

**Data mock**, perlu `Authorization: Bearer <MOCK_API_KEY>` (isi di field API key) dan `ALLOW_MOCK_SOURCES=true` di backend:

| URL sumber | Isi |
|---|---|
| `<base>/api/mock/v2/stats/users` | Mock user stats |
| `<base>/api/mock/v2/stats/revenue` | Mock revenue stats |
| `<base>/api/mock/v2/stats/content` | Mock content stats |
| `<base>/api/mock/v2/stats/cms` | Mock pemakaian fitur |

Endpoint mock menerima `?simulate=` di URL sumber untuk mencoba tampilan error: `401`, `500`, `rate_limit`, `slow` (delay 8 detik), `timeout`.

**Mock Stripe API**, format identik dengan [Stripe API](https://stripe.com/docs/api), perlu `Authorization: Bearer <MOCK_API_KEY>` dan `ALLOW_MOCK_SOURCES=true` di backend. Tidak menerima `?range=` — gunakan `created[gte]` / `created[lte]` (Unix timestamp) seperti Stripe aslinya:

| URL | Isi |
|---|---|
| `<base>/api/mock/stripe/v1/balance` | Saldo available & pending |
| `<base>/api/mock/stripe/v1/balance_transactions` | Riwayat transaksi (charge, payment, refund) |
| `<base>/api/mock/stripe/v1/charges` | Daftar charge |
| `<base>/api/mock/stripe/v1/customers` | Daftar customer |
| `<base>/api/mock/stripe/v1/subscriptions` | Daftar subscription (filter: `?status=active\|trialing\|canceled`) |
| `<base>/api/mock/stripe/v1/invoices` | Daftar invoice |

Data ini berguna untuk membangun widget dashboard berbasis data Stripe sebelum konektor Stripe sungguhan tersambung.

Jangan tulis `?range=` di URL sumber. Dashboard menambahkannya sendiri per periode. Health check backend: `GET <base>/api/v1/health`.

## Penyimpanan

Semua data ada di `.data/store.json` (di-gitignore): dashboard, sumber, snapshot, riwayat sync. Hapus file itu untuk kembali ke data awal.

Kredensial sumber dienkripsi (AES-256-GCM) dan tidak pernah dikirim ke browser; UI hanya menerima versi tersamar. Kalau kunci enkripsi berganti, kredensial lama tidak bisa dibuka dan harus diisi ulang.

## Struktur kode

| Path | Isi |
|---|---|
| `src/lib/types.ts` | Model: dashboard, widget, sumber, snapshot |
| `src/lib/store.ts` | Baca-tulis `.data/store.json` dan migrasinya |
| `src/lib/sync.ts` | Validasi URL (SSRF), pemanggilan endpoint, sync |
| `src/lib/actions.ts` | Server action untuk semua perubahan |
| `src/lib/secrets.ts` | Enkripsi kredensial |
| `src/lib/widget-data.ts` | Resolusi path dan format nilai |
| `src/lib/templates.ts` | Halaman dan widget template untuk endpoint v2 |
| `src/lib/connectors/` | Satu file per layanan, `catalog.ts` (daftar, field, nilai tes), `demo.ts` (data buatan) |
| `docs/test.md` | Rencana test manual |

## Batasan prototype

- Belum ada login. Semua server action harus memeriksa sesi super admin sebelum dipakai di luar development.
- Validasi URL tidak me-resolve hostname, jadi nama publik yang menunjuk ke IP privat belum tertangkap.
- Konektor menarik ulang seluruh riwayat (sampai 24 bulan) di tiap sync. Stripe dipotong di 30.000 transaksi.
