import { useState, useEffect } from 'react';
import { X, Star, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'react-hot-toast';

export default function RatingModal({
  isOpen,
  onClose,
  targetId,
  targetType,
  targetName,
  customerId,
  orderId,
  initialRating = 0,
  initialReview = ''
}) {
  const [ratingValue, setRatingValue] = useState(initialRating);
  const [ratingReview, setRatingReview] = useState(initialReview);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setRatingValue(initialRating);
      setRatingReview(initialReview);
      setIsSuccess(false);
    }
  }, [isOpen, initialRating, initialReview]);

  if (!isOpen) return null;

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    if (ratingValue === 0) {
      toast.error('Silakan pilih bintang');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      customer_id: customerId,
      target_id: targetId,
      target_type: targetType,
      rating: ratingValue,
      review: ratingReview.trim()
    };

    if (orderId) {
      payload.order_id = orderId;
    }

    // Check if rating exists (especially useful if DB constraints don't include order_id yet)
    let query = supabase.from('ratings')
      .select('id')
      .eq('customer_id', customerId)
      .eq('target_id', targetId)
      .eq('target_type', targetType);

    if (orderId) {
      query = query.eq('order_id', orderId);
    } else {
      query = query.is('order_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    let error;
    if (existing) {
      const res = await supabase.from('ratings').update({ rating: ratingValue, review: ratingReview.trim() }).eq('id', existing.id);
      error = res.error;
    } else {
      const res = await supabase.from('ratings').insert(payload);
      error = res.error;
    }

    setIsSubmitting(false);
    if (!error) {
      setIsSuccess(true);
    } else {
      toast.error('Gagal menyimpan penilaian');
      console.error(error);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-black/60 flex flex-col ${isSuccess ? 'justify-center items-center backdrop-blur-sm' : 'justify-end'} animate-fadeIn`}>
      {isSuccess ? (
        <div className="w-full max-w-sm mx-auto px-5 flex flex-col animate-zoomIn relative items-center text-center">
          <div className="relative mb-8 mt-2">
            <img
              src="/images/thank_you_civet.webp"
              alt="Thank You Mascot"
              className="w-48 h-48 object-contain relative z-10 animate-bounce drop-shadow-2xl"
            />
          </div>
          <h3 className="font-extrabold text-white text-4xl mb-2 drop-shadow-lg">Terima Kasih!</h3>
          <p className="text-sm text-gray-200 px-4 mb-10 drop-shadow-md font-medium">Penilaian Anda sangat membantu kami untuk terus meningkatkan layanan.</p>
          <button
            onClick={() => {
              setIsSuccess(false);
              onClose(true);
            }}
            className="w-full max-w-[200px] bg-yellow-400 text-yellow-900 py-3.5 rounded-2xl font-bold flex items-center justify-center hover:bg-yellow-500 active:scale-95 transition-all shadow-xl shadow-yellow-500/20"
          >
            Selesai
          </button>
        </div>
      ) : (
        <div className="bg-white w-full max-w-md mx-auto rounded-t-3xl pt-5 pb-8 px-5 flex flex-col animate-slideUp shadow-2xl relative items-center text-center">
          <>
            <button onClick={() => onClose(false)} className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">
              <X size={18} />
            </button>

            <div className="w-16 h-16 rounded-full bg-yellow-100 text-yellow-500 flex items-center justify-center mb-4 mt-2">
              <Star size={32} className="fill-current" />
            </div>
            <h3 className="font-bold text-gray-900 text-xl mb-1">
              Beri Nilai {targetType === 'merchant' ? 'Toko' : targetType === 'product' ? 'Produk' : 'Kurir'}
            </h3>
            <p className="text-sm text-gray-500 mb-6 px-4">
              {targetType === 'product' 
                ? `Bagaimana kualitas dari ${targetName || 'produk'} ini?`
                : `Bagaimana pengalaman Anda berinteraksi dengan ${targetName || (targetType === 'merchant' ? 'toko' : 'kurir')} ini?`
              }
            </p>

            <form onSubmit={handleSubmitRating} className="w-full flex flex-col gap-5">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingValue(star)}
                    className="w-12 h-12 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                  >
                    <Star size={40} className={star <= ratingValue ? "fill-yellow-400 text-yellow-400" : "text-gray-300"} />
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-1.5 mt-2 text-left">
                <label className="text-sm font-bold text-gray-700">Ulasan (Opsional)</label>
                <textarea
                  value={ratingReview}
                  onChange={e => setRatingReview(e.target.value)}
                  placeholder="Tuliskan pengalaman Anda..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm h-[100px] focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || ratingValue === 0}
                className="w-full bg-yellow-500 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-yellow-600 active:scale-95 transition-all shadow-md disabled:opacity-50 mt-2"
              >
                {isSubmitting ? 'Menyimpan...' : 'Kirim Penilaian'}
              </button>
            </form>
          </>
        </div>
      )}
    </div>
  );
}
