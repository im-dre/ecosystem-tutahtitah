import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MerchantActivityTimeline({ merchantId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchActivities = async () => {
      if (!merchantId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('merchant_activities')
        .select('id, activity_type, title, description, created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (!error && active) setActivities(data || []);
      if (active) setLoading(false);
    };
    fetchActivities();
    return () => { active = false; };
  }, [merchantId]);

  return (
    <section className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 md:p-7">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl">↗</div>
        <div><h2 className="text-xl font-black text-gray-900">Riwayat Aktivitas</h2><p className="text-sm text-gray-500">Jejak perubahan dan aktivitas toko Anda.</p></div>
      </div>
      {loading ? <p className="text-sm text-gray-500 animate-pulse">Memuat timeline...</p> : activities.length === 0 ? <p className="text-sm text-gray-500">Belum ada aktivitas tercatat.</p> : (
        <div className="space-y-5">
          {activities.map((activity) => (
            <div key={activity.id} className="relative pl-8">
              <span className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-brand-500 ring-4 ring-brand-50" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-brand-600">{activity.activity_type.replaceAll('_', ' ')}</p>
              <h3 className="font-bold text-gray-900">{activity.title}</h3>
              {activity.description && <p className="text-sm text-gray-600 mt-1">{activity.description}</p>}
              <time className="text-xs text-gray-400 mt-1 block">{new Date(activity.created_at).toLocaleString('id-ID')}</time>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}