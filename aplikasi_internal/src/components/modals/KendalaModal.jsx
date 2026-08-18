import React from "react";

/**
 * KendalaModal — Modal lapor kendala dari kurir
 * Props: isOpen, onClose, kendalaForm, setKendalaForm, onSubmit
 */
const KendalaModal = ({ isOpen, onClose, kendalaForm, setKendalaForm, onSubmit }) => {
  if (!isOpen) return null;

  const updateItem = (idx, field, value) => {
    const newItems = [...kendalaForm.jastipItems];
    newItems[idx][field] = value;
    setKendalaForm({ ...kendalaForm, jastipItems: newItems });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-orange-500 p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-white text-sm">⚠️ Lapor Kendala</h3>
          <button onClick={onClose} className="text-white hover:text-orange-200 text-lg">
            &times;
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          {kendalaForm.type === "Belanja" ? (
            <div className="space-y-4 mb-4">
              <p className="text-xs text-gray-600 font-medium border-b border-gray-100 pb-2">
                Centang barang yang kosong/bermasalah, dan beri catatan:
              </p>
              {kendalaForm.jastipItems.map((item, idx) => (
                <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                  <div className="flex items-start gap-2 mb-2">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                      checked={item.isKendala}
                      onChange={(e) => updateItem(idx, "isKendala", e.target.checked)}
                    />
                    <span className="text-xs font-bold text-gray-800 line-clamp-2">{item.text}</span>
                  </div>
                  {item.isKendala && (
                    <input
                      type="text"
                      placeholder="Catatan (Misal: Habis, sisa rasa coklat)"
                      className="w-full text-[10px] p-2 rounded bg-white border border-orange-200 focus:outline-none focus:border-orange-500"
                      value={item.note}
                      onChange={(e) => updateItem(idx, "note", e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-600 font-medium mb-3">
                Tuliskan kendala yang dialami di lapangan:
              </p>
              <textarea
                rows="3"
                placeholder="Contoh: Customer tidak bisa dihubungi, ban bocor..."
                className="w-full p-3 bg-gray-50 border border-orange-200 rounded-xl text-xs font-mono focus:outline-none focus:border-orange-500 mb-4"
                value={kendalaForm.text}
                onChange={(e) => setKendalaForm({ ...kendalaForm, text: e.target.value })}
              />
            </>
          )}
          <button
            onClick={onSubmit}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-md text-xs shrink-0 transition"
          >
            Lapor ke Admin Pusat
          </button>
        </div>
      </div>
    </div>
  );
};

export default KendalaModal;
