import { useEffect, useState } from 'react';
import { Joyride, STATUS } from 'react-joyride';

export default function FeatureTour({ run, setRun }) {
  const [steps] = useState([
    {
      target: 'body',
      content: 'Selamat datang di Aplikasi Tutah Titah! 👋 Biar makin gampang pakainya, yuk kita keliling sebentar lihat fitur-fitur utamanya.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '#tour-search',
      content: 'Mau jajan atau cari barang tertentu? Ketik aja di sini, nanti sistem akan cariin toko yang jual.',
      placement: 'bottom',
    },
    {
      target: '#tour-custom-order',
      content: 'Ga nemu barangnya? Tenang! Pakai fitur Bebas Pesan ini, kurir kita yang bakal bantu beliin di toko manapun.',
      placement: 'bottom',
    },
    {
      target: '#tour-services',
      content: 'Selain Jastip, kita juga sedia layanan Antar Jemput, Kirim Barang, dan Belanja Pasar. Lengkap kan?',
      placement: 'bottom',
    },
    {
      target: '#tour-nav-activity',
      content: 'Pantau status pesanan, history belanja, dan balas chat dari kurir/toko di menu Aktivitas ini.',
      placement: 'top',
    },
    {
      target: '#tour-nav-profile',
      content: 'Terakhir, atur alamat pengiriman dan akun kamu di sini. Selesai deh! Selamat berbelanja!',
      placement: 'top',
    },
  ]);

  const handleJoyrideCallback = (data) => {
    const { status } = data;
    const finishedStatuses = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setRun(false);
      localStorage.setItem('tutah_has_seen_tour', 'true');
    }
  };

  return (
    <Joyride
      callback={handleJoyrideCallback}
      continuous
      hideCloseButton
      run={run}
      scrollToFirstStep
      showProgress
      showSkipButton
      steps={steps}
      styles={{
        options: {
          arrowColor: '#fff',
          backgroundColor: '#fff',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          primaryColor: '#004aad',
          textColor: '#333',
          zIndex: 1000,
        },
        tooltipContainer: {
          textAlign: 'left',
          borderRadius: '16px',
        },
        tooltip: {
          borderRadius: '16px',
          padding: '20px',
        },
        buttonNext: {
          backgroundColor: '#004aad',
          borderRadius: '8px',
          padding: '8px 16px',
          fontWeight: '600',
        },
        buttonBack: {
          marginRight: 10,
          color: '#666',
          fontWeight: '500',
        },
        buttonSkip: {
          color: '#999',
          fontWeight: '500',
        },
      }}
      locale={{
        back: 'Kembali',
        close: 'Tutup',
        last: 'Selesai',
        next: 'Lanjut',
        skip: 'Lewati',
      }}
    />
  );
}
