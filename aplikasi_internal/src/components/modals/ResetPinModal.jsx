import React from "react";

/**
 * ResetPinModal — Modal set PIN baru dari link reset email Supabase
 * Props: isOpen, form, setForm, onSubmit, isSubmitting
 */
const ResetPinModal = ({ isOpen, form, setForm, onSubmit, isSubmitting }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[999] flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-gray-100">
        <div className="bg-[#004aad] p-5 text-center">
          <h3 className="font-bold text-white text-base tracking-tight">🔑 Buat PIN Baru</h3>
          <p className="text-blue-100 text-xs mt-1">Masukkan PIN rahasia baru untuk akun kamu</p>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">PIN Baru (Min. 6 Digit)</label>
            <input
              type="password"
              required
              placeholder="Masukkan PIN Baru"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-[#004aad] transition"
              value={form.new_pin}
              onChange={(e) => setForm({ ...form, new_pin: e.target.value })}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Konfirmasi PIN Baru</label>
            <input
              type="password"
              required
              placeholder="Ulangi PIN Baru"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-sans outline-none focus:border-[#004aad] transition"
              value={form.confirm_pin}
              onChange={(e) => setForm({ ...form, confirm_pin: e.target.value })}
            />
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3.5 rounded-xl shadow-lg text-xs tracking-wider uppercase transition active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? "Simpan PIN..." : "Simpan PIN Baru 🚀"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPinModal;
