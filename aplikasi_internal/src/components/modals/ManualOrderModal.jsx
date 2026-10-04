import { useState, useEffect } from "react";
import CustomCourierSelect from "../ui/CustomCourierSelect";
import toast from 'react-hot-toast';

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
  setLightboxData,
  customersList = [],
  couriersList = [],
  activeCourierCounts = {},
}) => {
  const [showCustSuggestions, setShowCustSuggestions] = useState(false);
  

  // Hybrid Mode
  const [hybridMode, setHybridMode] = useState("cepat"); // "cepat" | "bebas"

  // Cepat Form States
  const [belanjaItems, setBelanjaItems] = useState([""]);
  const [belanjaNote, setBelanjaNote] = useState("");
  const [bebasText, setBebasText] = useState("");

  const [ojekJemput, setOjekJemput] = useState("");
  const [ojekTujuan, setOjekTujuan] = useState("");
  const [ojekNote, setOjekNote] = useState("");
  const [ojekTitipan, setOjekTitipan] = useState("");
  const [showOjekTitipan, setShowOjekTitipan] = useState(false);

  const [kirimBarang, setKirimBarang] = useState("");
  const [kirimAmbil, setKirimAmbil] = useState("");
  const [kirimTujuan, setKirimTujuan] = useState("");
  const [kirimPenerima, setKirimPenerima] = useState("");
  const [kirimNote, setKirimNote] = useState("");
  const [kirimTitipan, setKirimTitipan] = useState("");
  const [showKirimTitipan, setShowKirimTitipan] = useState(false);

  // Initialize form state when opened
  useEffect(() => {
    if (isOpen) {
      setManualForm((prev) => ({ ...prev, type: "" })); // Force empty to require selection
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset local form state when the modal opens.
      setHybridMode("cepat");
      setBelanjaItems([""]); setBelanjaNote(""); setBebasText("");
      setOjekJemput(""); setOjekTujuan(""); setOjekNote(""); setOjekTitipan(""); setShowOjekTitipan(false);
      setKirimBarang(""); setKirimAmbil(""); setKirimTujuan(""); setKirimPenerima(""); setKirimNote(""); setKirimTitipan(""); setShowKirimTitipan(false);
    }
  }, [isOpen, setManualForm]);

  // Auto-compiler dihilangkan, kompilasi dipindah ke saat submit (UX Refinement)

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
    setManualImages([]);
  };


  const handleTypeChange = (t) => setManualForm({ ...manualForm, type: t });

  const handleLocalSubmit = () => {
    if (!manualForm.type) {
      toast.error("Pilih jenis layanan terlebih dahulu!");
      return;
    }

    let payloadText = "";
    if (hybridMode === "bebas") {
      payloadText = bebasText;
    } else {
      if (manualForm.type === "Belanja") {
        const joinedBelanja = belanjaItems.filter(item => item.trim() !== "").join('\n');
        payloadText = `Format Belanja/Jastip:\nList Belanjaan Secara Spesifik:\n${joinedBelanja}\nNote:\n${belanjaNote}`;
      } else if (manualForm.type === "Antar Jemput") {
        payloadText = `Alamat Jemput: ${ojekJemput}\nAlamat Tujuan: ${ojekTujuan}\nNote/Patokan Titik Jemput: ${ojekNote}`;
        if (showOjekTitipan && ojekTitipan.trim()) payloadText += `\nTitipan:\n${ojekTitipan}`;
      } else if (manualForm.type === "Kirim Barang") {
        payloadText = `Nama/Jenis Barang: ${kirimBarang}\nAlamat Pengambilan: ${kirimAmbil}\nAlamat Tujuan: ${kirimTujuan}\nNama Penerima: ${kirimPenerima}\nNote: ${kirimNote}`;
        if (showKirimTitipan && kirimTitipan.trim()) payloadText += `\nTitipan:\n${kirimTitipan}`;
      }
    }

    onSubmit(payloadText);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center sm:items-center sm:p-4 backdrop-blur-sm transition-opacity">
      <div className="bg-white w-full sm:max-w-md shadow-[0_-10px_40px_rgba(0,0,0,0.2)] overflow-hidden flex flex-col rounded-t-3xl sm:rounded-2xl transition-transform transform translate-y-0 max-h-[90vh]">

        <div className="bg-gray-900 p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white text-sm">➕ Input Order Manual</h3>
          <button onClick={handleClose} className="text-white font-bold text-xl">
            &times;
          </button>
        </div>
        
        <div className="py-5 px-3 sm:px-5 space-y-4 overflow-y-auto w-full">
          
          {/* JENIS LAYANAN (DIPINDAH KE ATAS) */}
          <div className="bg-yellow-50 border border-blue-200 p-3 rounded-xl flex gap-2 items-end shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#004aad] opacity-5 rounded-bl-full pointer-events-none" />
            <div className="flex-1 relative z-10">
              <label className="text-[10px] font-bold text-[#004aad] uppercase mb-1 flex items-center gap-1">
                📌 Tentukan Layanan Dulu!
              </label>
              <select
                className="w-full p-2.5 bg-white border border-blue-300 rounded-lg text-xs font-bold text-[#004aad] outline-none focus:border-[#004aad] focus:ring-1 focus:ring-[#004aad] shadow-inner"
                value={manualForm.type}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="" disabled>-- Pilih Layanan --</option>
                <option value="Belanja">🛒 Belanja/Jastip</option>
                <option value="Antar Jemput">🛵 Antar Jemput</option>
                <option value="Kirim Barang">📦 Kirim Barang</option>
              </select>
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
                        (c.name || "").toLowerCase().includes((manualForm.name || "").toLowerCase()) ||
                        (c.phone || "").includes(manualForm.name || "")
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

          {/* DYNAMIC ADDRESS */}
          {manualForm.type === "Belanja" || !manualForm.type ? (
            <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">
                Alamat Pengantaran
              </label>
              <input
                type="text"
                placeholder="Alamat lengkap..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={manualForm.address}
                onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
              />
            </div>
          ) : (
             <div>
              <label className="text-[10px] font-bold text-gray-600 uppercase mb-1 block">
                Alamat Customer (Opsional)
              </label>
              <input
                type="text"
                placeholder="Alamat profil lengkap..."
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#004aad]"
                value={manualForm.address}
                onChange={(e) => setManualForm({ ...manualForm, address: e.target.value })}
              />
            </div>
          )}

          {/* HYBRID FORM: DETAIL PESANAN */}
          <div className="bg-gray-50 border border-gray-200 p-3 rounded-lg mt-2">
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-bold text-gray-600 uppercase">
                Detail Pesanan
              </label>
              <div className="flex bg-white rounded-lg border border-gray-200 p-0.5 overflow-hidden">
                <button 
                  onClick={() => setHybridMode("cepat")}
                  className={`text-[9px] font-bold px-3 py-1 rounded-md transition ${hybridMode === 'cepat' ? 'bg-[#004aad] text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  ⚡ Form Cepat
                </button>
                <button 
                  onClick={() => setHybridMode("bebas")}
                  className={`text-[9px] font-bold px-3 py-1 rounded-md transition ${hybridMode === 'bebas' ? 'bg-[#004aad] text-white shadow' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  📝 Text Bebas
                </button>
              </div>
            </div>

            {hybridMode === "bebas" ? (
              <textarea
                rows="6"
                className="w-full p-3 bg-white border border-gray-200 rounded-lg text-xs font-mono outline-none focus:border-[#004aad]"
                value={bebasText}
                onChange={(e) => setBebasText(e.target.value)}
                placeholder="Ketik pesanan di sini secara bebas..."
              />
            ) : (
              <div className="space-y-2">
                {!manualForm.type && (
                   <p className="text-xs text-gray-500 text-center py-4 italic">Pilih jenis layanan di atas terlebih dahulu.</p>
                )}
                
                {manualForm.type === "Belanja" && (
                  <div className="space-y-2">
                    {belanjaItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input 
                           type="text" 
                           placeholder={`Barang ke-${idx + 1} (Misal: Nasi Goreng 1)`}
                           className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" 
                           value={item} 
                           onChange={(e) => {
                             const newItems = [...belanjaItems];
                             newItems[idx] = e.target.value;
                             setBelanjaItems(newItems);
                           }} 
                        />
                        {belanjaItems.length > 1 && (
                          <button onClick={() => setBelanjaItems(belanjaItems.filter((_, i) => i !== idx))} className="bg-red-50 text-red-500 hover:bg-red-100 px-3 rounded-md font-bold transition flex items-center justify-center shrink-0">
                            &times;
                          </button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setBelanjaItems([...belanjaItems, ""])} className="w-full mt-1 bg-blue-50 text-blue-600 hover:bg-blue-100 text-[10px] font-bold py-1.5 rounded-md border border-blue-200 transition">
                      + Tambah Barang
                    </button>
                    <input type="text" placeholder="Catatan (Opsional)" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad] mt-2" value={belanjaNote} onChange={(e) => setBelanjaNote(e.target.value)} />
                  </div>
                )}

                {manualForm.type === "Antar Jemput" && (
                  <>
                    <input type="text" placeholder="📍 Alamat Jemput" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={ojekJemput} onChange={(e) => setOjekJemput(e.target.value)} />
                    <input type="text" placeholder="🏁 Alamat Tujuan" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={ojekTujuan} onChange={(e) => setOjekTujuan(e.target.value)} />
                    <input type="text" placeholder="📝 Patokan / Catatan" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={ojekNote} onChange={(e) => setOjekNote(e.target.value)} />
                    
                    {!showOjekTitipan ? (
                      <button onClick={() => setShowOjekTitipan(true)} className="w-full mt-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold py-1.5 rounded border border-indigo-200 hover:bg-indigo-100 transition">
                        + Tambah Titipan Belanja / Barang
                      </button>
                    ) : (
                      <div className="mt-2 bg-indigo-50 p-2 rounded border border-indigo-200 relative">
                        <button onClick={() => {setShowOjekTitipan(false); setOjekTitipan("");}} className="absolute top-1 right-2 text-indigo-400 hover:text-indigo-700 font-bold">&times;</button>
                        <label className="text-[9px] font-bold text-indigo-800 mb-1 block">Barang Titipan (Pisahkan dg Enter)</label>
                        <textarea rows="2" className="w-full p-2 bg-white border border-indigo-100 rounded text-xs outline-none focus:border-indigo-400" value={ojekTitipan} onChange={(e) => setOjekTitipan(e.target.value)} placeholder="Misal: Nasi Padang 2 bungkus" />
                      </div>
                    )}
                  </>
                )}

                {manualForm.type === "Kirim Barang" && (
                  <>
                    <input type="text" placeholder="📦 Nama/Jenis Barang" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={kirimBarang} onChange={(e) => setKirimBarang(e.target.value)} />
                    <input type="text" placeholder="📍 Alamat Pengambilan" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={kirimAmbil} onChange={(e) => setKirimAmbil(e.target.value)} />
                    <input type="text" placeholder="🏁 Alamat Tujuan" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={kirimTujuan} onChange={(e) => setKirimTujuan(e.target.value)} />
                    <input type="text" placeholder="👤 Nama Penerima" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={kirimPenerima} onChange={(e) => setKirimPenerima(e.target.value)} />
                    <input type="text" placeholder="📝 Catatan Tambahan" className="w-full p-2 bg-white border border-gray-200 rounded-md text-xs outline-none focus:border-[#004aad]" value={kirimNote} onChange={(e) => setKirimNote(e.target.value)} />
                    
                    {!showKirimTitipan ? (
                      <button onClick={() => setShowKirimTitipan(true)} className="w-full mt-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold py-1.5 rounded border border-indigo-200 hover:bg-indigo-100 transition">
                        + Tambah Titipan Belanja / Barang
                      </button>
                    ) : (
                      <div className="mt-2 bg-indigo-50 p-2 rounded border border-indigo-200 relative">
                        <button onClick={() => {setShowKirimTitipan(false); setKirimTitipan("");}} className="absolute top-1 right-2 text-indigo-400 hover:text-indigo-700 font-bold">&times;</button>
                        <label className="text-[9px] font-bold text-indigo-800 mb-1 block">Barang Titipan (Pisahkan dg Enter)</label>
                        <textarea rows="2" className="w-full p-2 bg-white border border-indigo-100 rounded text-xs outline-none focus:border-indigo-400" value={kirimTitipan} onChange={(e) => setKirimTitipan(e.target.value)} placeholder="Misal: Beliin rokok sekalian" />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* UPLOAD FOTO */}
          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg mt-2">
            <label className="text-[10px] font-bold text-[#004aad] uppercase mb-2 flex items-center gap-1">
              📸 Lampirkan Foto (Opsional)
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
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
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
                Tugaskan Kurir (Langsung)
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
            onClick={handleLocalSubmit}
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
