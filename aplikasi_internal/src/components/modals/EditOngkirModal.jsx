import React from "react";

const EditOngkirModal = ({ editOngkirModal, setEditOngkirModal, onSubmit }) => {
    if (!editOngkirModal?.isOpen) return null;

    const handleClose = () => setEditOngkirModal({ isOpen: false, order: null, newOngkir: '' });

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={handleClose}></div>
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-[#004aad] to-blue-600 px-5 py-4">
                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"></path></svg>
                        Edit Ongkir Kurir
                    </h3>
                </div>

                {/* Body */}
                <div className="p-5">
                    <div className="mb-5 bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 mb-0.5 uppercase font-bold tracking-wide">Ongkir Saat Ini</p>
                            <p className="text-lg font-black text-[#004aad]">
                                Rp {parseFloat(editOngkirModal.order?.delivery_fee || 0).toLocaleString('id-ID')}
                            </p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M245.54,115.65,224,94.12V48a8,8,0,0,0-8-8H200V24a8,8,0,0,0-8-8H160a8,8,0,0,0-8,8V40H64V24a8,8,0,0,0-8-8H40a8,8,0,0,0-8,8V40H16a8,8,0,0,0,0,16H32V94.12L10.46,115.65a8,8,0,0,0,0,11.31l12,12A8,8,0,0,0,33.56,134a40,40,0,0,1,60.88,0,8,8,0,0,0,11.12,4.94l22.44-9.35,22.44,9.35a8,8,0,0,0,11.12-4.94,40,40,0,0,1,60.88,0,8,8,0,0,0,11.12-4.94l12-12A8,8,0,0,0,245.54,115.65ZM48,56H208V81.37L181.65,107.7a8,8,0,0,0,0,11.32A55.69,55.69,0,0,0,212.78,136c-11.89,6-25,10.6-40.42,4.19l-38.25-15.94a8,8,0,0,0-6.14,0l-38.29,16C74,146.68,60.89,142,49,136a55.69,55.69,0,0,0,31.13-17A8,8,0,0,0,80.12,107.7L48,81.37ZM184,232H72a8,8,0,0,1,0-16H184a8,8,0,0,1,0,16Z"></path></svg>
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="block text-[11px] font-bold text-gray-600 mb-2 uppercase tracking-wide">Masukkan Ongkir Baru</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">Rp</span>
                            <input
                                type="number"
                                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-xl focus:ring-2 focus:ring-[#004aad] focus:border-[#004aad] block pl-10 pr-4 py-3.5 transition-all outline-none"
                                placeholder="Contoh: 15000"
                                value={editOngkirModal.newOngkir}
                                onChange={(e) => setEditOngkirModal(p => ({ ...p, newOngkir: e.target.value }))}
                                autoFocus
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 flex gap-3 border-t border-gray-100">
                    <button
                        onClick={handleClose}
                        className="flex-1 px-4 py-3 rounded-xl text-gray-600 font-bold text-[13px] bg-white border border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                        Batal
                    </button>
                    <button
                        onClick={onSubmit}
                        className="flex-1 px-4 py-3 rounded-xl text-white font-bold text-[13px] bg-[#004aad] hover:bg-blue-800 shadow-md hover:shadow-lg transition-all"
                    >
                        Simpan Ongkir
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EditOngkirModal;
