import React from "react";

/**
 * CourierSettingsModal — Modal pengaturan profil & PIN kurir
 * Props: isOpen, onClose, form, setForm, onSubmit, isSubmitting
 */
const CourierSettingsModal = ({ isOpen, onClose, form, setForm, onSubmit, isSubmitting }) => {
  if (!isOpen) return null;

  const update = (field, val) => setForm((prev) => ({ ...prev, [field]: val }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#004aad] p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white text-sm">⚙️ Pengaturan Profil & PIN</h3>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-xl font-bold">
            &times;
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nomor WhatsApp</label>
            <input
              type="text"
              required
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="text-[10px] font-bold text-gray-800 uppercase mb-2 block border-b border-gray-200 pb-1">
              Rekening Bank / E-Wallet Saya
            </label>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                type="text"
                placeholder="Bank 1 (misal BCA)"
                className="w-full sm:flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={form.bank_name}
                onChange={(e) => update("bank_name", e.target.value)}
              />
              <input
                type="text"
                placeholder="No Rekening 1"
                className="w-full sm:flex-[1.5] p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={form.account_number}
                onChange={(e) => update("account_number", e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Bank 2 (misal DANA)"
                className="w-full sm:flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={form.bank_name_2}
                onChange={(e) => update("bank_name_2", e.target.value)}
              />
              <input
                type="text"
                placeholder="No Rekening 2"
                className="w-full sm:flex-[1.5] p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={form.account_number_2}
                onChange={(e) => update("account_number_2", e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl mt-3">
            <label className="text-[10px] font-bold text-[#004aad] uppercase mb-1 block">
              🔐 Ubah PIN Rahasia (Opsional)
            </label>
            <p className="text-[9px] text-gray-500 mb-2">Kosongkan jika tidak ingin mengganti PIN saat ini.</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                placeholder="PIN Baru (min 6 digit)"
                className="w-full sm:flex-1 p-2.5 bg-white border border-blue-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={form.new_pin}
                onChange={(e) => update("new_pin", e.target.value)}
              />
              <input
                type="password"
                placeholder="Konfirmasi PIN"
                className="w-full sm:flex-1 p-2.5 bg-white border border-blue-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={form.confirm_pin}
                onChange={(e) => update("confirm_pin", e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3 rounded-xl shadow-md text-xs transition disabled:opacity-50"
          >
            {isSubmitting ? "Memperbarui..." : "Simpan Perubahan"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CourierSettingsModal;
