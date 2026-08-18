import React, { useState } from "react";
import CustomCourierSelect from "../ui/CustomCourierSelect";

/**
 * ManualOrderModal
 * Props: isOpen, onClose, manualForm, setManualForm, manualImages, setManualImages,
 *        isUploading, onSubmit, onCopyFormat, setLightboxData,
 *        customersList, couriersList, activeCourierCounts
 */
const ManualOrderModal = ({
  isOpen,
  onClose,
  manualForm,
  setManualForm,
  manualImages,
  setManualImages,
  isUploading,
  onSubmit,
  onCopyFormat,
  setLightboxData,
  customersList = [],
  couriersList = [],
  activeCourierCounts = {},
}) => {
  const [showCustSuggestions, setShowCustSuggestions] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setManualImages([]);
  };

  const handleTypeChange = (t) => setManualForm({ ...manualForm, type: t });

  const handleCopyFormat = () => {
    let t = "jastip";
    if (manualForm.type === "Antar Jemput") t = "ojek";
    if (manualForm.type === "Kirim Barang") t = "kirim";
    onCopyFormat(t);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gray-900 p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white text-sm">➕ Input Order Manual</h3>
          <button onClick={handleClose} className="text-white font-bold text-xl">
            &times;
          </button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          {/* JENIS LAYANAN & COPY FORMAT */}
          <div className="bg-yellow-50 border border-blue-200 p-3 rounded-xl flex gap-2 items-end shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#004aad] opacity-5 rounded-bl-full pointer-events-none" />
            <div className="flex-[2] relative z-10">
              <label className="text-[10px] font-bold text-[#004aad] uppercase mb-1 flex items-center gap-1">
                📌 Tentukan Layanan Dulu!
              </label>
              <select
                className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-[#004aad] outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] shadow-inner"
                value={manualForm.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="Belanja">🛒 Belanja/Jastip</option>
                <option value="Antar Jemput">🛵 Antar Jemput</option>
                <option value="Kirim Barang">📦 Kirim Barang</option>
              </select>
            </div>
            <div className="flex-1 relative z-10">
              <button
                onClick={handleCopyFormat}
                className="w-full bg-white text-[#004aad] border border-blue-300 hover:bg-[#004aad] hover:text-white font-bold py-2.5 rounded-lg text-[10px] shadow-sm transition h-[38px] flex items-center justify-center gap-1"
              >
                📋 Copy Format
              </button>
            </div>
          </div>

          {/* NAMA & WA */}
          <div className="flex gap-2">
            <div className="relative flex-[1.2]">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 flex justify-between">
                <span>Nama Customer</span>
                <span className="text-blue-500 text-[9px] font-normal italic">*Pilih / Ketik</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Budi"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={manualForm.name}
                onChange={(e) => {
                  setManualForm({ ...manualForm, name: e.target.value });
                  setShowCustSuggestions(true);
                }}
                onFocus={() => setShowCustSuggestions(true)}
                onBlur={() => setTimeout(() => setShowCustSuggestions(false), 200)}
              />
              {showCustSuggestions && manualForm.name && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-40 overflow-y-auto mt-1">
                  {customersList
                    .filter(
                      (c) =>
                        c.name.toLowerCase().includes(manualForm.name.toLowerCase()) ||
                        c.phone.includes(manualForm.name)
                    )
                    .map((c) => (
                      <div
                        key={c.id}
                        className="p-3 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex flex-col"
                        onMouseDown={() => {
                          setManualForm({
                            ...manualForm,
                            name: c.name,
                            wa: c.phone,
                            address: c.address || "",
                          });
                          setShowCustSuggestions(false);
                        }}
                      >
                        <span className="font-bold text-gray-800">{c.name}</span>
                        <span className="text-blue-600 font-medium">{c.phone}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
            <div className="flex-[0.8]">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">No. WA</label>
              <input
                type="text"
                placeholder="08..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={manualForm.wa}
                onChange={(e) => setManualForm({ ...manualForm, wa: e.target.value })}
              />
            </div>
          </div>

          {/* ALAMAT */}
          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">
              {manualForm.type === "Belanja" ? "Alamat Tujuan / Pengantaran" : "Alamat Utama"}
            </label>
            <input
              type="text"
              placeholder="Alamat lengkap..."
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
              value={manualForm.address}
              onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
            />
          </div>

          {/* UPLOAD FOTO */}
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg">
            <label className="text-[10px] font-bold text-[#004aad] uppercase mb-2 flex items-center gap-1">
              📸 Lampirkan Foto (Bisa Pilih Lebih Dari 1)
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const newFiles = Array.from(e.target.files);
                  setManualImages((prev) => [...prev, ...newFiles]);
                  e.target.value = "";
                }
              }}
              className="w-full text-xs text-gray-600 file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-bold file:bg-[#004aad] file:text-white hover:file:bg-[#003b8a] transition cursor-pointer"
            />
            {manualImages.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {manualImages.map((file, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-blue-200 text-[#004aad] text-[10px] font-bold pl-2 pr-1 py-1 rounded shadow-sm flex items-center gap-2"
                  >
                    <span
                      className="cursor-pointer hover:text-blue-700 hover:underline flex items-center gap-1"
                      onClick={() =>
                        setLightboxData({ urls: [URL.createObjectURL(file)], index: 0 })
                      }
                      title="Klik untuk lihat foto"
                    >
                      🖼️ {file.name.substring(0, 12)}{file.name.length > 12 ? "..." : ""}
                    </span>
                    <button
                      onClick={() => {
                        const newImages = [...manualImages];
                        newImages.splice(idx, 1);
                        setManualImages(newImages);
                      }}
                      className="text-red-500 hover:text-white hover:bg-red-500 bg-red-50 rounded-full w-5 h-5 flex items-center justify-center transition focus:outline-none shrink-0"
                      title="Hapus foto ini"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* DETAIL PESANAN */}
          <div>
            <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">
              Detail Pesanan (Jika pakai foto, isi 'Sesuai Foto')
            </label>
            <textarea
              rows="3"
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-[#004aad]"
              value={manualForm.text}
              onChange={(e) => setManualForm({ ...manualForm, text: e.target.value })}
            />
          </div>

          {/* ONGKIR & KURIR */}
          <div className="flex gap-2 pt-2 border-t border-gray-100 mt-2">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">Ongkir (Opsional)</label>
              <input
                type="number"
                placeholder="Rp"
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={manualForm.fee}
                onChange={(e) => setManualForm({ ...manualForm, fee: e.target.value })}
              />
            </div>
            <div className="flex-[1.5]">
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">
                Tugaskan Kurir (Langsung Jalan)
              </label>
              <CustomCourierSelect
                value={manualForm.courier}
                onChange={(val) => setManualForm({ ...manualForm, courier: val })}
                placeholder="-- Masuk ke Order Pending --"
                couriersList={couriersList}
                activeCourierCounts={activeCourierCounts}
              />
            </div>
          </div>

          <button
            onClick={onSubmit}
            disabled={isUploading}
            className="w-full mt-4 bg-[#004aad] hover:bg-[#003b8a] text-white font-bold py-3 rounded-xl shadow-md text-xs transition disabled:opacity-50"
          >
            {isUploading ? "Mengupload & Menyimpan..." : "Simpan ke Sistem"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualOrderModal;
