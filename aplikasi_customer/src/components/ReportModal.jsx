import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function ReportModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  customerId,
  targetName,
  orderId
}) {
  const [reportReason, setReportReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) {
    if (isSuccess) setIsSuccess(false);
    return null;
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    setIsSubmitting(true);
    const { error } = await supabase.from('reports').insert({
      customer_id: customerId,
      target_id: targetId,
      target_type: targetType,
      reason: reportReason.trim(),
      order_id: orderId || null
    });

    setIsSubmitting(false);
    if (!error) {
      setIsSuccess(true);
      setReportReason('');
    } else {
      toast.error('Gagal mengirim laporan');
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 flex flex-col ${isSuccess ? 'justify-center items-center backdrop-blur-sm' : 'justify-end'} animate-fadeIn`}>
      {isSuccess ? (
        <div className="w-full max-w-sm mx-auto px-5 flex flex-col animate-zoomIn relative items-center text-center">
          <div className="relative mb-6 mt-2">
            <div className="w-24 h-24 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(239,68,68,0.3)] animate-pulse">
              <Flag size={48} className="fill-current" />
            </div>
          </div>
          <h3 className="font-extrabold text-white text-3xl mb-3 drop-shadow-lg">Laporan Diterima</h3>
          <p className="text-xs text-gray-100 px-2 mb-8 drop-shadow-md font-medium leading-relaxed">
            Terima kasih atas laporannya. Kami akan segera menindaklanjutinya.
          </p>
          <button
            onClick={() => {
              setIsSuccess(false);
              onClose(true);
            }}
            className="w-full max-w-[200px] bg-red-500 text-white py-3.5 rounded-2xl font-bold flex items-center justify-center hover:bg-red-600 active:scale-95 transition-all shadow-xl shadow-red-500/20"
          >
            Selesai
          </button>
        </div>
      ) : (
        <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pt-5 pb-8 px-5 flex flex-col animate-slideUp shadow-2xl relative">
          <button onClick={() => onClose(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Flag size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg line-clamp-1">
                Laporkan {targetName || (targetType === 'merchant' ? 'Toko' : 'Mitra')}
              </h3>
              <p className="text-sm text-gray-500">
                {orderId ? `Terkait Order #${orderId.toString().substring(0, 8)}` : 'Beritahu kami masalah yang terjadi.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmitReport} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-gray-700">Alasan Laporan</label>
              <textarea
                value={reportReason}
                onChange={e => setReportReason(e.target.value)}
                placeholder="Ceritakan detail masalahnya di sini..."
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm min-h-[120px] focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all resize-none"
                required
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !reportReason.trim()}
              className="w-full bg-red-600 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-700 active:scale-95 transition-all shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
