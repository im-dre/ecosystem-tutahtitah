### Aplikasi Customer - Development Flow
When working on the `aplikasi_customer` project, strictly follow this development workflow:
- **One Page at a Time**: Complete each tab or page entirely before moving on to the next one.
- **Definition of Done**: For every tab/page, ensure all of the following are fully finished:
  1. Core features and functionalities.
  2. Business logic and state management.
  3. Process flows and navigation.
  4. Final UI/UX (Design aesthetics, responsiveness, animations, etc).
- Do not leave a tab/page partially finished to switch context to another page. Ensure the current one is 100% complete first.

### Persona & Context Memory
- **Tone/Style**: Always use casual, friendly Indonesian slang ('Bro', 'Gue', 'Lu'). Be enthusiastic and proactive.
- **Current Progress**: Fixed responsive UI for custom date range picker in Admin Analytics Dashboard and bypassed Supabase 1000 row limit on analytics fetch by implementing pagination loop in frontend.
- **Next Agenda**: Wait for the user to return and say "Bro". The next step is migrating the analytics calculation logic (SLA, income totals, success rates, etc.) to a Supabase Postgres Function (RPC) to prevent long-term egress and performance issues. Wait for their cue to start.

### Keamanan & Arsitektur Database (SOP Egress)
- **Database Types**: Wajib gunakan tipe dari file `database.types.ts` yang ada di `src/types/` (contoh: `createClient<Database>`). Dilarang keras melakukan fetch skema manual.
- **Egress-Safe**: Haram hukumnya pakai `select('*')`. Selalu tulis nama kolom spesifik secara eksplisit. Wajib pakai limit/pagination untuk semua operasi list data.
- **Zero-Looping**: Dilarang meletakkan query Supabase di dalam `useEffect` tanpa dependency array yang ketat.
- **Scope Control**: Jangan merombak kodingan di luar fitur yang sedang dikerjakan. Wajib meminta approval gue per micro-task.

### Arsitektur Aplikasi Internal
- **App.jsx sebagai Controller Utama**: Dilarang keras menambahkan UI markup yang panjang ke dalam App.jsx.
- **UI Admin**: Semua penambahan UI fitur Admin wajib dibuat di folder `src/pages/admin/`.
- **UI Kurir**: Semua penambahan UI fitur Kurir wajib dibuat di folder `src/pages/courier/`.
- **Modal**: Semua Modal wajib diletakkan di `src/components/modals/`.
- **Lift-State-Stays**: Dilarang menempatkan logika Supabase Realtime di dalam komponen child. Komponen child hanya boleh menerima data dan mengirim action via props ke App.jsx.
