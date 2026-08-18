import React from "react";

/**
 * EditOrderModal
 * Props: isOpen, onClose, editingOrder, editLines, editNote,
 *        onLineChange, onAddLine, onRemoveLine, onNoteChange,
 *        onSubmitEdit, onSubmitCancel
 */
const EditOrderModal = ({
  isOpen,
  onClose,
  editingOrder,
  editLines,
  editNote,
  onLineChange,
  onAddLine,
  onRemoveLine,
  onNoteChange,
  onSubmitEdit,
  onSubmitCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="bg-[#004aad] p-4 flex justify-between items-center">
          <h3 className="font-bold text-white text-sm">📝 Revisi Pesanan</h3>
          <button onClick={onClose} className="text-white hover:text-blue-200 text-lg">
            &times;
          </button>
        </div>
        <div className="p-6">
          {editingOrder?.status === "hold" && (
            <div className="bg-orange-50 p-4 rounded-xl border border-orange-200 mb-5 shadow-sm">
              <p className="text-[10px] font-bold text-orange-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                💬 Kurir Lapor Kendala:
              </p>
              <p className="text-xs font-mono text-orange-900 font-bold whitespace-pre-wrap">
                {editingOrder.kendala_info}
              </p>
            </div>
          )}
          <div className="flex justify-between items-end mb-3">
            <p className="text-[10px] uppercase font-bold text-gray-500">
              Daftar Baris Pesanan / Alamat:
            </p>
          </div>

          <div className="space-y-2 max-h-[35vh] overflow-y-auto pr-2 custom-scroll">
            {editLines.map((line, idx) => (
              <div
                key={idx}
                className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl border border-gray-200 focus-within:border-[#004aad] transition group"
              >
                <span className="text-[10px] font-bold text-gray-400 w-4 text-center select-none">
                  {idx + 1}.
                </span>
                <input
                  type="text"
                  className="flex-1 bg-transparent text-xs font-mono text-gray-800 outline-none placeholder-gray-300"
                  placeholder="Ketik detail pesanan / format..."
                  value={line}
                  onChange={(e) => onLineChange(idx, e.target.value)}
                />
                <button
                  onClick={() => onRemoveLine(idx)}
                  className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition active:scale-95 shrink-0 ml-1 border border-red-200"
                  title="Hapus baris ini"
                >
                  🗑️ Hapus
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={onAddLine}
            className="w-full mt-3 border border-dashed border-[#004aad] text-[#004aad] bg-blue-50 hover:bg-blue-100 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
          >
            ➕ Tambah Baris Baru
          </button>

          <div className="mt-4 pt-3 border-t border-gray-100">
            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">
              📝 Catatan Khusus Pesanan (Note):
            </label>
            <textarea
              rows="2"
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-sans outline-none focus:border-[#004aad] shadow-sm placeholder-gray-400"
              placeholder="Contoh: Belinya di toko kelontong depan masjid ya..."
              value={editNote}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={onSubmitCancel}
              className="flex-1 bg-[#FF0000] hover:bg-red-500 text-white border border-gray-200 font-bold py-3 rounded-xl shadow-sm text-xs transition"
            >
              Cancel Orderan
            </button>
            <button
              onClick={onSubmitEdit}
              className="flex-[2] bg-[#004aad] text-white font-bold py-3 rounded-xl shadow-md text-xs transition hover:bg-[#003b8a]"
            >
              Update & Lanjutkan 🚀
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditOrderModal;
