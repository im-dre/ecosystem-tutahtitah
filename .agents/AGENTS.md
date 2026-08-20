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
- **Current Progress**: Completed Tahap 2 Point 1 (Courier rating stats). Injected courier rating stats and collapsible reviews in `aplikasi_internal` (Order history cards, Analytics, HR/SDM list). Fixed a syntax error introduced during UI insertion. Handled edge cases for `soft_deleted` orders and `hard_deleted` orphaned ratings across `aplikasi_internal`, `aplikasi_customer`, and `portal_umkm` so that deleted orders don't count towards ratings or show up in lists (via frontend JS filters and `.neq('is_deleted', true)` in fetches). Pushed all changes to GitHub.
- **Next Agenda**: Wait for the user to return and say "Bro". The next step is Tahap 2 Point 2: Fitur Lapor untuk mitra penjual dan kurir di aplikasi internal. Wait for their cue to start.
