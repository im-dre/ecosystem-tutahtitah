import React from "react";

/**
 * ReportAttachmentModal
 * Props: isOpen, onClose, order
 */
const ReportAttachmentModal = ({ isOpen, onClose, order }) => {
  if (!isOpen || !order) return null;

  const lines = order.text ? order.text.split("\n").filter((l) => l.trim() !== "") : [];
  
  // Pisahkan baris note jika ada
  let orderLines = [];
  let note = "";
  lines.forEach((l) => {
    if (l.toLowerCase().startsWith("note/") || l.toLowerCase().startsWith("patokan titik jemput:") || l.toLowerCase().startsWith("note:")) {
      note = l;
    } else {
      orderLines.push(l);
    }
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-zoomIn flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-[#004aad] p-5 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md text-xl">
              📄
            </div>
            <div>
              <h3 className="font-extrabold text-white text-lg leading-tight">Lampiran Order</h3>
              <p className="text-blue-100 text-xs font-medium">#{order.id?.toString().substring(0,8).toUpperCase()}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-black/20 text-white hover:bg-white/20 transition-all active:scale-90 z-10 text-sm">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 bg-gray-50 flex-1 overflow-y-auto max-h-[60vh] custom-scroll">
          {/* Kendala Alert (jika ada) */}
          {order.kendala_info && (
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 mb-5 shadow-sm">
              <p className="text-xs font-extrabold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                ⚠️ Laporan Kendala Kurir:
              </p>
              <p className="text-sm text-orange-900 font-medium whitespace-pre-wrap leading-relaxed">
                {order.kendala_info}
              </p>
            </div>
          )}

          {/* Rincian Pesanan */}
          <div className="mb-4 flex items-center gap-2">
            <span className="text-[#004aad] text-lg">📦</span>
            <h4 className="text-sm font-extrabold text-gray-800 uppercase tracking-wider">Rincian Order</h4>
          </div>

          <div className="space-y-3 mb-6">
            {orderLines.map((line, idx) => {
              const isLocation = line.toLowerCase().includes("alamat");
              return (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isLocation ? 'bg-blue-100 text-[#004aad]' : 'bg-gray-100 text-gray-500'}`}>
                    <span className="text-[10px] font-bold">{idx + 1}</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium leading-relaxed font-mono">
                    {line}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Catatan Khusus */}
          {note && (
            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
              <h4 className="text-[11px] font-extrabold text-yellow-800 uppercase tracking-wider mb-1">Catatan Tambahan</h4>
              <p className="text-sm text-yellow-900 font-medium italic">{note}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 bg-white border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-sm active:scale-[0.98]"
          >
            Tutup Lampiran
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportAttachmentModal;
