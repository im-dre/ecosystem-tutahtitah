import { useEffect, useState } from 'react';

export default function MerchantActivityModal({ supabase, merchant, onClose }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data } = await supabase.from('merchant_activities')
        .select('id, activity_type, title, description, created_at')
        .eq('merchant_id', merchant.id).order('created_at', { ascending: false }).limit(100);
      if (active) { setActivities(data || []); setLoading(false); }
    };
    load();
    return () => { active = false; };
  }, [merchant.id, supabase]);

  return <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="p-5 border-b flex justify-between items-center"><div><h2 className="font-black text-lg">Riwayat Aktivitas UMKM</h2><p className="text-sm text-gray-500">{merchant.nama_toko}</p></div><button onClick={onClose} className="text-gray-500 text-xl">×</button></div>
      <div className="p-5 overflow-y-auto max-h-[65vh]">{loading ? <p>Memuat timeline...</p> : activities.length === 0 ? <p className="text-gray-500">Belum ada aktivitas.</p> : <div className="space-y-5">{activities.map(a => <div key={a.id} className="border-l-2 border-blue-200 pl-4"><p className="text-[10px] text-blue-600 font-bold uppercase">{a.activity_type.replaceAll('_', ' ')}</p><p className="font-bold">{a.title}</p><p className="text-sm text-gray-600">{a.description}</p><p className="text-xs text-gray-400 mt-1">{new Date(a.created_at).toLocaleString('id-ID')}</p></div>)}</div>}</div>
    </div>
  </div>;
}