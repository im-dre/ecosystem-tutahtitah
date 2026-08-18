import { useState, useEffect } from 'react';
import { Home, Briefcase, Building2, MapPin, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddressForm({ onCancel, onSave, isSaving }) {
  const [addressLabel, setAddressLabel] = useState('Rumah');
  const [detailAddress, setDetailAddress] = useState('');

  const [provincesData, setProvincesData] = useState([]);
  const [regenciesData, setRegenciesData] = useState([]);
  const [districtsData, setDistrictsData] = useState([]);
  const [villagesData, setVillagesData] = useState([]);

  const [selectedProv, setSelectedProv] = useState({ id: '', name: '' });
  const [selectedReg, setSelectedReg] = useState({ id: '', name: '' });
  const [selectedDist, setSelectedDist] = useState({ id: '', name: '' });
  const [selectedVill, setSelectedVill] = useState({ id: '', name: '' });

  const [isLoadingProv, setIsLoadingProv] = useState(false);
  const [isLoadingReg, setIsLoadingReg] = useState(false);
  const [isLoadingDist, setIsLoadingDist] = useState(false);
  const [isLoadingVill, setIsLoadingVill] = useState(false);

  const API_BASE = 'https://www.emsifa.com/api-wilayah-indonesia/api';

  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    setIsLoadingProv(true);
    try {
      const res = await fetch(`${API_BASE}/provinces.json`);
      let data = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProvincesData(data);
      
      const jabar = data.find(p => p.name.includes('JAWA BARAT'));
      if (jabar) {
        setSelectedProv({ id: jabar.id, name: jabar.name });
        fetchRegencies(jabar.id);
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat data provinsi');
    } finally {
      setIsLoadingProv(false);
    }
  };

  const fetchRegencies = async (provId) => {
    if (!provId) return;
    setIsLoadingReg(true);
    try {
      const res = await fetch(`${API_BASE}/regencies/${provId}.json`);
      let data = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setRegenciesData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingReg(false);
    }
  };

  const fetchDistricts = async (regId) => {
    if (!regId) return;
    setIsLoadingDist(true);
    try {
      const res = await fetch(`${API_BASE}/districts/${regId}.json`);
      let data = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setDistrictsData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingDist(false);
    }
  };

  const fetchVillages = async (distId) => {
    if (!distId) return;
    setIsLoadingVill(true);
    try {
      const res = await fetch(`${API_BASE}/villages/${distId}.json`);
      let data = await res.json();
      data.sort((a, b) => a.name.localeCompare(b.name));
      setVillagesData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingVill(false);
    }
  };

  const handleProvChange = (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedProv({ id, name });
    
    // Reset lower levels
    setSelectedReg({ id: '', name: '' });
    setSelectedDist({ id: '', name: '' });
    setSelectedVill({ id: '', name: '' });
    setRegenciesData([]);
    setDistrictsData([]);
    setVillagesData([]);

    if (id) fetchRegencies(id);
  };

  const handleRegChange = (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedReg({ id, name });
    
    // Reset lower levels
    setSelectedDist({ id: '', name: '' });
    setSelectedVill({ id: '', name: '' });
    setDistrictsData([]);
    setVillagesData([]);

    if (id) fetchDistricts(id);
  };

  const handleDistChange = (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedDist({ id, name });
    
    // Reset lower levels
    setSelectedVill({ id: '', name: '' });
    setVillagesData([]);

    if (id) fetchVillages(id);
  };

  const handleVillChange = (e) => {
    const id = e.target.value;
    const name = e.target.options[e.target.selectedIndex].text;
    setSelectedVill({ id, name });
  };

  const labels = [
    { name: 'Rumah', icon: <Home size={16} /> },
    { name: 'Kantor', icon: <Briefcase size={16} /> },
    { name: 'Kosan', icon: <Building2 size={16} /> },
    { name: 'Lainnya', icon: <MapPin size={16} /> },
  ];

  const handleSubmit = () => {
    if (!selectedProv.name || !selectedReg.name || !selectedDist.name || !selectedVill.name || !detailAddress.trim()) {
      toast.error('Mohon lengkapi semua data alamat');
      return;
    }

    const formattedAddress = `[${addressLabel}]\n${detailAddress.trim()}\nDesa/Kel. ${selectedVill.name}, Kec. ${selectedDist.name}\n${selectedReg.name}, Provinsi ${selectedProv.name}`;
    
    onSave({ label: addressLabel, full_address: formattedAddress });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col space-y-4 mb-4">
        
        {/* Label Alamat */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-2 block">Nama Alamat</label>
          <div className="grid grid-cols-2 gap-2">
            {labels.map((item) => (
              <button
                key={item.name}
                onClick={() => setAddressLabel(item.name)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-sm font-semibold transition-all ${
                  addressLabel === item.name 
                    ? 'bg-blue-50 border-blue-500 text-blue-600' 
                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.icon}
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Provinsi */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">Provinsi</label>
          <div className="relative">
            <select
              value={selectedProv.id}
              onChange={handleProvChange}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none"
            >
              <option value="">Pilih Provinsi</option>
              {provincesData.map(prov => (
                <option key={prov.id} value={prov.id}>{prov.name}</option>
              ))}
            </select>
            {isLoadingProv && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Kabupaten */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">Kabupaten/Kota</label>
          <div className="relative">
            <select
              value={selectedReg.id}
              onChange={handleRegChange}
              disabled={!selectedProv.id || isLoadingReg}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none disabled:opacity-50"
            >
              <option value="">Pilih Kabupaten/Kota</option>
              {regenciesData.map(reg => (
                <option key={reg.id} value={reg.id}>{reg.name}</option>
              ))}
            </select>
            {isLoadingReg && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Kecamatan */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">Kecamatan</label>
          <div className="relative">
            <select
              value={selectedDist.id}
              onChange={handleDistChange}
              disabled={!selectedReg.id || isLoadingDist}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none disabled:opacity-50"
            >
              <option value="">Pilih Kecamatan</option>
              {districtsData.map(dist => (
                <option key={dist.id} value={dist.id}>{dist.name}</option>
              ))}
            </select>
            {isLoadingDist && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Desa/Kelurahan */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">Desa/Kelurahan</label>
          <div className="relative">
            <select
              value={selectedVill.id}
              onChange={handleVillChange}
              disabled={!selectedDist.id || isLoadingVill}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary appearance-none disabled:opacity-50"
            >
              <option value="">Pilih Desa/Kelurahan</option>
              {villagesData.map(vill => (
                <option key={vill.id} value={vill.id}>{vill.name}</option>
              ))}
            </select>
            {isLoadingVill && <Loader2 size={16} className="absolute right-3 top-3.5 animate-spin text-gray-400" />}
          </div>
        </div>

        {/* Detail Alamat */}
        <div>
          <label className="text-xs font-bold text-gray-700 mb-1 block">Detail Alamat</label>
          <textarea
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            placeholder="Tulis nama jalan, RT/RW, no. rumah, patokan bangunan..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[100px] resize-none"
          />
        </div>
      </div>
      
      {/* Bottom Action Bar */}
      <div className="p-4 bg-white border-t border-gray-100 flex gap-3 shrink-0 sticky bottom-0 z-10 mt-auto">
        <button 
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all"
        >
          Batal
        </button>
        <button 
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex-1 py-3.5 rounded-xl font-bold text-white bg-primary hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'Simpan Alamat'}
        </button>
      </div>
    </div>
  );
}
