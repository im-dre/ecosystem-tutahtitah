import React from "react";

const ImageLightbox = ({ lightboxData, setLightboxData }) => {
    if (!lightboxData?.urls?.length) return null;

    return (
        <div onClick={() => setLightboxData({ urls: [], index: 0 })} className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm cursor-zoom-out select-none">
            <button className="absolute top-6 right-6 text-white text-4xl hover:text-red-500 z-50 transition transform hover:scale-110">&times;</button>

            {lightboxData.urls.length > 1 && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-1.5 rounded-full text-sm font-bold z-50 tracking-widest border border-white/20">
                    {lightboxData.index + 1} / {lightboxData.urls.length}
                </div>
            )}

            {lightboxData.urls.length > 1 && (
                <>
                    <button onClick={(e) => { e.stopPropagation(); setLightboxData(prev => ({ ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length })); }} className="absolute left-2 sm:left-6 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full text-2xl sm:text-4xl hover:bg-[#004aad] transition z-50 border border-white/20 hover:scale-110">
                        ◀
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setLightboxData(prev => ({ ...prev, index: (prev.index + 1) % prev.urls.length })); }} className="absolute right-2 sm:right-6 top-1/2 transform -translate-y-1/2 text-white bg-black/50 p-3 rounded-full text-2xl sm:text-4xl hover:bg-[#004aad] transition z-50 border border-white/20 hover:scale-110">
                        ▶
                    </button>
                </>
            )}

            <img src={lightboxData.urls[lightboxData.index]} className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl relative z-40" alt="Lampiran" onClick={(e) => e.stopPropagation()} />

            <p className="absolute bottom-6 text-white/50 text-xs">Sentuh area hitam di luar gambar untuk menutup</p>
        </div>
    );
};

export default ImageLightbox;
