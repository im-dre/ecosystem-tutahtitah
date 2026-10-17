# Current Order Flow — TutahTitah Ecosystem

> Audit read-only atas alur bisnis yang sudah ada di codebase. Dokumen ini menjelaskan perilaku aktual source code, bukan desain target.

## 0. Ringkasan

```text
Customer checkout
  -> INSERT orders (pending)
  -> realtime orders
  -> Admin assign courier + ongkir (processing)
  -> Courier proses tugas
  -> Courier: hold / waiting_customer / kirim tagihan
  -> Admin kirim struk (bill_sent = true)
  -> Courier complete (completed)
```

Temuan utama:

- Lifecycle order tidak memakai RPC khusus order. Mutation aktif memakai direct PostgREST `.from('orders').insert/update(...)`.
- UMKM menerima notifikasi realtime order, tetapi `portal_umkm/src/pages/Orders.jsx` tidak terlihat melakukan accept/reject/prepare mutation.
- `order_items` ada di schema/types, tetapi checkout aktif menyimpan item di `orders.items` JSON dan `raw_order_text`; tidak ditemukan insert ke `order_items`.
- Realtime, state, dan handler bisnis internal dipusatkan di `aplikasi_internal/src/App.jsx`; tab UI menerima data/action via props.

## 1. Skema Database Pesanan

Sumber struktur utama: `C:\tutahtitah-ecosystem\database.types.ts` pada bagian `public.Tables`.

### 1.1 `orders`

| Kolom | Tipe | Peran |
|---|---|---|
| `id` | number | ID order; direferensikan item/chat/rating/report. |
| `customer_id` | string/null | FK `customers.id`; kosong dapat terjadi pada order manual. |
| `customer_name` | string/null | Snapshot nama customer. |
| `customer_wa` | string | Nomor customer; dipakai kirim tagihan WhatsApp. |
| `customer_address` | string/null | Alamat pickup/pengiriman. |
| `merchant_id` | string/null | FK `merchants.id`; filter realtime UMKM; null untuk jasa non-merchant. |
| `tipe_layanan` | string/null | Nilai yang terlihat: `Belanja`, `Antar Jemput`, `Kirim Barang`. |
| `raw_order_text` | string | Teks order terformat untuk admin/kurir dan parsing detail. |
| `items` | Json/null | Snapshot item checkout; jalur aktif menyimpan item di sini. |
| `total_amount` | number/null | Total awal dari customer; jasa custom mengisi 0. |
| `total_price` | number/null | Nilai final yang dihitung/diisi saat proses lapangan. |
| `delivery_fee` | number/null | Ongkir/ongkos jasa. |
| `status` | string/null | State machine order; lihat bagian 2. |
| `assigned_courier_id` | string/null | FK `employees.id`, kurir yang ditugaskan. |
| `dispatched_at` | string/null | Waktu dispatch/reassign oleh admin. |
| `completed_at` | string/null | Waktu order menjadi completed. |
| `bill_details` | string/null | Rincian harga/barang final dari kurir. |
| `bill_sent` | boolean/null | Guard: admin sudah membuat/mengirim struk. |
| `kendala_info` | string/null | Kendala lapangan atau alasan batal. |
| `failed_couriers` | Json/null | Histori kurir yang melepas order. |
| `image_url` | string/null | Gambar order manual dari bucket `order-images`. |
| `is_deleted` | boolean/null | Soft-delete oleh admin. |
| `is_favorite` | boolean/null | Favorit customer. |
| `created_at` | string/null | Waktu dibuat. |

Relasi yang didefinisikan:

```text
orders.customer_id         -> customers.id
orders.merchant_id         -> merchants.id
orders.assigned_courier_id -> employees.id
```

### 1.2 `order_items`

Kolom: `id` (string), `order_id` (number, FK orders), `product_id` (string, FK products), `price_per_item` (number), `quantity` (number), `subtotal` (number).

**Kondisi aktual:** tidak ditemukan insert ke tabel ini dari checkout aktif. `Checkout.jsx`, `AntarJemputOrder.jsx`, dan `KirimBarangOrder.jsx` menyimpan detail di `orders.items` dan `orders.raw_order_text`.

### 1.3 Entitas terkait

#### `customers`

Kolom utama: `id`, `auth_id`, `name`, `phone`, `email`, `address`, `saved_addresses`, `avatar_url`, `created_at`. Dipakai mengambil profil customer saat checkout; order juga menyimpan snapshot nama/telepon/alamat.

#### `merchants`

Kolom utama: `id`, `owner_id`, `name`, `address`, `description`, `logo_url`, `banner_url`, `operating_hours`, `status`, `is_active`, `is_custom_order`, `warning_points`, `rejection_reason`, `created_at`. `orders.merchant_id` dipakai filter order UMKM.

#### `products`

Kolom utama: `id`, `merchant_id`, `name`, `price`, `category`, `image_url`, `is_available`, `badge`, `variants`, `rating_score`, `total_ratings`, `favorite_count`, `created_at`. Item katalog disnapshot ke `orders.items`.

#### `employees` (representasi kurir)

Tidak ada tabel `couriers` di local types. Kurir adalah row `employees` dengan `role = 'courier'`. Kolom utama: `id`, `auth_id`, `full_name`, `role`, `phone`, `email`, `pin`, `is_online`, `is_super_admin`, `warning_points`, `bank_name`, `account_number`, `bank_name_2`, `account_number_2`, `created_at`.

### 1.4 Tabel pendukung

- `cart_items`: `id`, `auth_id`, `merchant_id`, `product_id`, `name`, `price`, `qty`, `image_url`, `selected_variants`, `created_at`; sumber item sebelum checkout.
- `draft_orders`: `id`, `auth_id`, `merchant_id`, `tipe_layanan`, `items`, `created_at`; dihapus setelah checkout berhasil dari draft.
- `chats`: memiliki `order_id`, customer/participant, `chat_type`, `status`, timestamp, dan soft-delete flags; chat ditutup saat order final/batal.
- `ratings`: memiliki referensi order dan target merchant/kurir; dipakai rating setelah order.
- `reports`: migration `add_order_id_to_reports.sql` menambahkan `order_id -> orders.id`.

## 2. State Machine (Status)

### 2.1 Status yang benar-benar ditulis oleh mutation aktif

| Status | Aktor/peristiwa | Makna |
|---|---|---|
| `pending` | Customer checkout atau admin input manual tanpa direct dispatch | Order baru menunggu admin. |
| `processing` | Admin dispatch/reassign; admin lanjut dari kendala | Order aktif ditugaskan ke kurir. |
| `hold` | Kurir `submitKendala` | Ada kendala; `kendala_info` diisi dan admin diberi alarm. |
| `waiting_customer` | Kurir `submitTidakBisaLanjut` | Kurir melepas order; `failed_couriers` ditambah. |
| `delivering` | Kurir mengirim rincian tagihan | `total_price`, `delivery_fee`, `bill_details` sudah dikirim ke admin. |
| `completed` | Kurir complete setelah `bill_sent = true` | Selesai; `completed_at` diisi. |
| `cancelled` | Customer (hanya pending) atau admin | Batal; alasan disimpan di `kendala_info`. |

### 2.2 Status yang masih dikenali UI/filter, tetapi tidak terbukti ditulis jalur utama

`searching_courier`, `courier_found`, `picking_up`, `item_ready`, `on_delivery`, `admin_accepted`, `merchant_accepted`, `process`, `rejected`, dan `unreachable` masih muncul pada filter/pemetaan customer/internal. Audit source tidak menemukan mutation utama yang menulis sebagian besar status tersebut. Customer UI mengenali `on_delivery`, sedangkan handler aktif kurir menulis `delivering`.

### 2.3 Transisi aktual

```text
pending
  ├─ admin/customer cancel -> cancelled
  └─ admin dispatch       -> processing

processing
  ├─ courier lapor kendala -> hold
  │    ├─ courier lanjut   -> processing
  │    └─ courier menyerah -> waiting_customer
  └─ courier kirim tagihan -> delivering

delivering
  └─ courier complete (bill_sent=true) -> completed
```

`bill_sent` adalah flag guard, bukan status. Admin membuat/copy/download struk, update `bill_sent = true`, lalu membuka WhatsApp customer.

## 3. Workflow Data per Aktor

### 3.1 Customer: checkout dan tracking

File utama:

- `aplikasi_customer/src/pages/Checkout.jsx` — checkout katalog/Belanja.
- `aplikasi_customer/src/pages/AntarJemputOrder.jsx` — jasa antar-jemput.
- `aplikasi_customer/src/pages/KirimBarangOrder.jsx` — jasa kirim barang.
- `aplikasi_customer/src/pages/Activity.jsx` — daftar order dan realtime.
- `aplikasi_customer/src/pages/OrderDetail.jsx` — detail, cancel, realtime satu order.
- `aplikasi_customer/src/pages/ChatRoom.jsx` — status order dalam chat.
- `aplikasi_customer/src/context/CartContext.jsx` — cart `cart_items`.

`Checkout.jsx` mengambil user/profile, membentuk `itemsWithNotes` dan `raw_order_text`, lalu:

```js
supabase.from('orders').insert([{
  customer_id, customer_name, customer_wa, customer_address,
  tipe_layanan: 'Belanja', merchant_id, items: itemsWithNotes,
  total_amount, status: 'pending', raw_order_text
}]).select().single()
```

Jika berasal dari draft, `draft_orders` dihapus. Favorite kemudian meng-update `orders.is_favorite`.

Dua halaman jasa memakai direct insert yang sama, dengan `merchant_id = null`, custom item pada `items`, `total_amount = 0`, status `pending`, serta detail alamat/barang di `raw_order_text`.

`Activity.jsx` query berdasarkan `customer_id`, mengecualikan `is_deleted`, lalu subscribe `postgres_changes` tabel `orders` dengan filter customer. `OrderDetail.jsx` subscribe update berdasarkan order ID. Customer hanya bisa cancel saat `pending`, melalui update status `cancelled` dan alasan.

### 3.2 UMKM: notifikasi order

File utama: `portal_umkm/src/pages/Orders.jsx` dan `portal_umkm/src/context/AuthContext.jsx`.

`Orders.jsx` mengambil:

```js
supabase.from('orders')
  .select('*')
  .eq('merchant_id', merchant.id)
  .neq('is_deleted', true)
  .order('id', { ascending: false })
```

Subscription realtime memakai filter `merchant_id=eq.<merchant.id>`:

- INSERT: tambah list + toast “Pesanan Baru Masuk”.
- UPDATE: ganti row + toast status baru.
- DELETE: hapus row.
- `is_deleted = true`: hapus dari list.

Halaman terkunci bila merchant belum `VERIFIED`. **Tidak terlihat mutation accept/reject/prepare order dari UMKM.** RPC UMKM seperti `register_merchant`, `submit_merchant_for_review`, dan `log_merchant_activity` hanya terkait merchant, bukan lifecycle order.

### 3.3 Admin: intake, dispatch, supervisi

File utama:

- `aplikasi_internal/src/App.jsx` — controller, fetch, realtime, mutation.
- `aplikasi_internal/src/pages/admin/AdminOperasionalTab.jsx` — UI operasional via callback props.
- `aplikasi_internal/src/pages/admin/AdminRiwayatTab.jsx` — histori.
- `aplikasi_internal/src/pages/admin/AdminPortalTab.jsx` — manajemen merchant, bukan lifecycle order utama.

`App.jsx` mengambil active orders dengan status `pending`, `processing`, `hold`, `waiting_customer`, `searching_courier`, `courier_found`, `on_delivery`, `picking_up`, `item_ready`, `delivering`, lalu subscribe realtime seluruh tabel `orders`.

`handleDispatch` direct update:

```js
supabase.from('orders').update({
  status: 'processing', assigned_courier_id: courierId,
  delivery_fee: parseFloat(fee), kendala_info: null,
  dispatched_at: new Date().toISOString()
}).eq('id', orderId)
```

Courier dipilih dari `employees` dengan `role = 'courier'`. Admin juga bisa cancel, edit `raw_order_text`, ubah ongkir, reassign, dan soft-delete `is_deleted = true`.

`submitManualOrder` dapat upload gambar ke storage `order-images`, membuat customer bila belum ada, lalu insert order. Jika courier+fee diisi, order langsung `processing` dengan `assigned_courier_id` dan `dispatched_at`; jika tidak, `pending`.

`handleKirimTagihanKeCustomer` membuat/copy/download struk, update `bill_sent = true`, dan membuka `wa.me` customer. Tidak ditemukan service backend WhatsApp pada flow ini.

### 3.4 Kurir: tugas, kendala, tagihan, selesai

File UI aktual:

- `aplikasi_internal/src/pages/courier/CourierTugasAktifTab.jsx` — dashboard tugas aktif.
- `aplikasi_internal/src/pages/courier/CourierRiwayatTab.jsx` — histori.
- `aplikasi_internal/src/pages/courier/CourierAnalitikTab.jsx` — analitik.
- `aplikasi_internal/src/pages/courier/CourierProfilTab.jsx` — profil.
- `aplikasi_internal/src/App.jsx` — semua state/realtime/handler bisnis.

Tidak ada `CourierDashboard.jsx`; nama file dashboard tugas aktual adalah `CourierTugasAktifTab.jsx`.

App memuat orders dan UI courier memfilter `assigned_courier_id === user.id`. Realtime menghasilkan alarm saat order ditugaskan (`processing`) atau dibatalkan.

#### Lapor kendala

Tombol UI memanggil callback `onOpenKendala`; mutation tetap di `App.jsx`:

```js
supabase.from('orders').update({
  status: 'hold', kendala_info: kendalaNote
}).eq('id', orderId)
```

#### Melepas order

`submitTidakBisaLanjut` menambah `{ id, name, reason, time }` ke `failed_couriers`, lalu update `status = 'waiting_customer'`.

#### Lanjut setelah kendala

`handleLanjutProsesKendala` mengubah kembali `status = 'processing'`.

#### Kirim rincian tagihan

`handleKirimTagihanKeAdmin` menghitung harga final berdasarkan `raw_order_text` dan input lapangan, lalu:

```js
supabase.from('orders').update({
  status: 'delivering', total_price: finalTotalPrice,
  delivery_fee: finalFee, bill_details: detailText
}).eq('id', order.id)
```

#### Selesai

`handleCompleteOrder` menolak aksi jika `bill_sent` false atau ongkir kosong. Jika valid, update `status = 'completed'`, total/ongkir final, dan `completed_at`.

## 4. RPC yang Ditemukan

Tidak ditemukan RPC sebagai mesin state transition order. RPC yang terlihat:

| RPC | File | Domain |
|---|---|---|
| `register_merchant` | `portal_umkm/src/pages/Register.jsx` | Registrasi UMKM |
| `submit_merchant_for_review` | `portal_umkm/src/context/AuthContext.jsx` | Pengajuan UMKM |
| `log_merchant_activity` | `portal_umkm/src/pages/DashboardHome.jsx` | Audit aktivitas UMKM |
| `admin_approve_merchant` | `aplikasi_internal/src/pages/admin/AdminPortalTab.jsx` | Approval UMKM |
| `admin_reject_merchant` | `aplikasi_internal/src/pages/admin/AdminPortalTab.jsx` | Reject UMKM |
| `admin_suspend_merchant` | `aplikasi_internal/src/pages/admin/AdminPortalTab.jsx` | Suspend UMKM |
| `rpc_soft_delete_message/chat/all_chats` | `aplikasi_internal/src/hooks/useLiveChat.js` | Soft-delete chat |

Lifecycle order memakai direct table access.

## 5. Matriks File Tanggung Jawab

| Tanggung jawab | File |
|---|---|
| Cart | `aplikasi_customer/src/context/CartContext.jsx` |
| Checkout Belanja | `aplikasi_customer/src/pages/Checkout.jsx` |
| Checkout Antar Jemput | `aplikasi_customer/src/pages/AntarJemputOrder.jsx` |
| Checkout Kirim Barang | `aplikasi_customer/src/pages/KirimBarangOrder.jsx` |
| Tracking customer | `aplikasi_customer/src/pages/Activity.jsx`, `OrderDetail.jsx` |
| Notifikasi UMKM | `portal_umkm/src/pages/Orders.jsx` |
| Controller internal | `aplikasi_internal/src/App.jsx` |
| Operasional admin | `aplikasi_internal/src/pages/admin/AdminOperasionalTab.jsx` |
| Histori admin | `aplikasi_internal/src/pages/admin/AdminRiwayatTab.jsx` |
| Tugas kurir | `aplikasi_internal/src/pages/courier/CourierTugasAktifTab.jsx` |
| Riwayat kurir | `aplikasi_internal/src/pages/courier/CourierRiwayatTab.jsx` |
| Analitik kurir | `aplikasi_internal/src/pages/courier/CourierAnalitikTab.jsx` |
| Blueprint schema | `database.types.ts` dan salinan per aplikasi |

## 6. Catatan Audit

1. UMKM bukan state-transition actor pada source aktif; perannya saat ini subscriber/notified party.
2. `order_items` belum dipakai checkout aktif; data item denormalisasi di JSON/text.
3. Ada istilah `on_delivery` di UI/filter dan `delivering` di handler aktif.
4. Status adalah `string`, bukan enum/union; konsistensi bergantung pada konvensi handler.
5. Sumber data bercampur: `total_amount` (awal) vs `total_price` (final), serta `items` JSON vs `raw_order_text`.
6. Realtime internal global di `App.jsx`; filtering role/assignment dilakukan client-side.
7. Tidak terlihat payment gateway; checkout menyatakan pembayaran tunai, sedangkan tagihan dikirim via struk/WhatsApp.