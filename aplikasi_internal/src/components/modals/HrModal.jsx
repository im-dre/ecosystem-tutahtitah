import React from "react";

/**
 * HrModal — Modal tambah / edit karyawan
 * Props: isOpen, onClose, hrForm, setHrForm, onSubmit, isSubmitting
 */
const HrModal = ({ isOpen, onClose, hrForm, setHrForm, onSubmit, isSubmitting }) => {
  if (!isOpen) return null;

  const handleChange = (field, value) =>
    setHrForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-[#004aad] p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white text-sm">➕ Daftarkan Anggota Baru</h3>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-xl font-bold">
            &times;
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Role / Jabatan</label>
              <select
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={hrForm.role}
                onChange={(e) => handleChange("role", e.target.value)}
              >
                <option value="courier">Mitra Kurir</option>
                <option value="admin">Pusat Admin</option>
              </select>
            </div>
            <div className="flex-[2]">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Kang Asep..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={hrForm.full_name}
                onChange={(e) => handleChange("full_name", e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-[1.5]">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Alamat Email (Untuk Login)</label>
              <input
                type="email"
                placeholder="kurir1@tutahtitah.com"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={hrForm.email}
                onChange={(e) => handleChange("email", e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">PIN Login</label>
              <input
                type="password"
                placeholder="Min 6 Angka"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={hrForm.pin}
                onChange={(e) => handleChange("pin", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Nomor WhatsApp</label>
            <input
              type="text"
              placeholder="08..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
              value={hrForm.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
            />
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <label className="text-[10px] font-bold text-gray-800 uppercase mb-2 block border-b border-gray-200 pb-1">
              Informasi Rekening Bank / E-Wallet
            </label>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Nama Bank 1 (BCA)"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                  value={hrForm.bank_name}
                  onChange={(e) => handleChange("bank_name", e.target.value)}
                />
              </div>
              <div className="flex-[1.5]">
                <input
                  type="text"
                  placeholder="No Rekening 1"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                  value={hrForm.account_number}
                  onChange={(e) => handleChange("account_number", e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Nama Bank 2 (DANA)"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                  value={hrForm.bank_name_2}
                  onChange={(e) => handleChange("bank_name_2", e.target.value)}
                />
              </div>
              <div className="flex-[1.5]">
                <input
                  type="text"
                  placeholder="No Rekening 2"
                  className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                  value={hrForm.account_number_2}
                  onChange={(e) => handleChange("account_number_2", e.target.value)}
                />
              </div>
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full mt-2 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3 rounded-xl shadow-md text-xs transition disabled:opacity-50"
          >
            {isSubmitting ? "Mendaftarkan..." : "Simpan Karyawan"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HrModal;
