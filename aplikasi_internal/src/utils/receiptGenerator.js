// ==========================================================================
// RECEIPTGENERATOR.JS — Generator gambar struk tagihan (HTML5 Canvas, HD Mode)
// Pure function: semua data (order, courier, jastipPrices) di-inject via argumen
// ==========================================================================

import {
  parseJastipItems,
  parseJastipItemsObjects,
  parseOjekDetails,
  parseKirimDetails,
} from "./helpers";

// Kalkulator total belanjaan (mirror dari calculateJastipTotal di App.jsx, versi pure)
const calcJastipSubtotal = (orderId, rawText, jastipPrices = {}) => {
  return parseJastipItemsObjects(rawText).reduce((sum, itemObj, idx) => {
    const userPrice = jastipPrices[`${orderId}_${idx}`];
    const finalPrice =
      userPrice !== undefined && userPrice !== ""
        ? parseFloat(userPrice)
        : itemObj.defaultPrice;
    return sum + (finalPrice || 0);
  }, 0);
};

// GENERATOR GAMBAR STRUK NATIVE HTML5 CANVAS DENGAN PIXEL SCALING (HD MODE)
// GENERATOR GAMBAR STRUK (ALL SERVICES SUPPORTED)
export const generateReceiptBlob = async (order, courier = {}, jastipPrices = {}) => {
  return new Promise((resolve, reject) => {
    let isBelanja = order.tipe_layanan === 'Belanja';
    let parsedItems = [];

    if (isBelanja) {
      if (order.bill_details) {
        const lines = order.bill_details.split('\n').filter(l => l.trim().length > 0);
        parsedItems = lines.map(line => {
          const match = line.match(/^- (.*):\s*Rp\s*(.*)$/);
          if (match) return { name: match[1].trim(), priceText: match[2].trim() };
          return { name: line.replace(/^- /, ''), priceText: '0' };
        });
      } else {
        const rawItems = parseJastipItems(order.raw_order_text);
        parsedItems = rawItems.map((item, idx) => {
          const p = parseFloat(jastipPrices[`${order.id}_${idx}`]) || 0;
          return { name: item, priceText: p.toLocaleString('id-ID') };
        });
      }
    } else {
      // Untuk Ojek & Kirim Barang
      if (order.bill_details) {
        parsedItems = order.bill_details.split('\n').filter(l => l.trim().length > 0).map(line => ({ name: line }));
      } else {
        if (order.tipe_layanan === 'Antar Jemput') {
          const ojekData = parseOjekDetails(order.raw_order_text);
          if (ojekData) parsedItems = [{ name: `Titik Jemput: ${ojekData.jemput}` }, { name: `Tujuan: ${ojekData.tujuan}` }];
        } else if (order.tipe_layanan === 'Kirim Barang') {
          const kirimData = parseKirimDetails(order.raw_order_text);
          if (kirimData) parsedItems = [{ name: `Barang: ${kirimData.barang}` }, { name: `Ambil: ${kirimData.ambil}` }, { name: `Tujuan: ${kirimData.tujuan}` }, { name: `Penerima: ${kirimData.penerima}` }, { name: `Note: ${kirimData.note}` }];
        }
        if (parsedItems.length === 0) parsedItems = [{ name: order.raw_order_text.substring(0, 50) + '...' }];
      }
    }

    const itemHeight = isBelanja ? 25 : 22; // Baris untuk ojek dirapatkan dikit biar rapi
    const scale = 2;
    const canvas = document.createElement('canvas');

    const baseWidth = 450;
    const baseHeight = 590 + (parsedItems.length * itemHeight);

    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(scale, scale);

    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, baseWidth, baseHeight);
    ctx.fillStyle = '#004aad'; ctx.fillRect(0, 0, baseWidth, 140);

    ctx.strokeStyle = '#ffde59'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(130, 25); ctx.lineTo(30, 25); ctx.arcTo(20, 25, 20, 35, 10); ctx.lineTo(20, 115); ctx.arcTo(20, 125, 30, 125, 10); ctx.lineTo(110, 125); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(320, 25); ctx.lineTo(420, 25); ctx.arcTo(430, 25, 430, 35, 10); ctx.lineTo(430, 115); ctx.arcTo(430, 125, 420, 125, 10); ctx.lineTo(340, 125); ctx.stroke();

    ctx.fillStyle = '#ffffff'; ctx.font = '800 16px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('LAYANAN HARIAN', 225, 31);
    ctx.fillStyle = '#ffde59'; ctx.font = '800 18px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('SEMUA KAMI KERJAKAN', 225, 131);

    ctx.font = 'italic 900 58px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffde59'; ctx.fillText('TUTAH', 223, 90);
    ctx.textAlign = 'left'; ctx.fillStyle = '#ffffff'; ctx.fillText('TITAH', 227, 90);

    let y = 170;
    ctx.fillStyle = '#111827'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center';

    const teksTagihan = 'STRUK TAGIHAN';
    ctx.fillText(teksTagihan, 225, y);
    const textWidth = ctx.measureText(teksTagihan).width;
    ctx.beginPath(); ctx.lineWidth = 1.5; ctx.strokeStyle = '#111827';
    ctx.moveTo(225 - (textWidth / 2), y + 4); ctx.lineTo(225 + (textWidth / 2), y + 4); ctx.stroke();

    y += 40;
    ctx.textAlign = 'left'; ctx.font = '600 13px sans-serif'; ctx.fillStyle = '#4b5563';
    ctx.fillText(`Pelanggan: ${order.customer_name || order.customer_wa.split('-')[0]}`, 20, y);
    ctx.fillText(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 250, y);
    y += 20;
    ctx.fillText(`Order ID: #${order.id}`, 20, y);
    ctx.fillText(`Kurir: ${courier.full_name || '-'}`, 250, y);
    y += 20;

    ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(430, y); ctx.stroke(); y += 25;

    ctx.fillStyle = '#111827'; ctx.font = '700 14px sans-serif';
    ctx.fillText(isBelanja ? 'Rincian Belanja:' : 'Rincian Layanan:', 20, y); y += 20;

    if (isBelanja) {
      ctx.font = '500 13px sans-serif';
      parsedItems.forEach((itemObj) => {
        ctx.fillText(itemObj.name.length > 35 ? itemObj.name.substring(0, 35) + '...' : itemObj.name, 20, y);
        ctx.textAlign = 'right'; ctx.fillText(`Rp ${itemObj.priceText}`, 430, y); ctx.textAlign = 'left';
        y += itemHeight;
      });
    } else {
      // LOGIKA BARU: CETAK TEBAL UNTUK LABEL OJEK/KIRIM BARANG
      parsedItems.forEach((itemObj) => {
        const line = itemObj.name;
        const colonIdx = line.indexOf(':');
        if (colonIdx > -1) {
          const label = line.substring(0, colonIdx + 1);
          const val = line.substring(colonIdx + 1).trim();

          ctx.font = '700 13px sans-serif';
          ctx.fillStyle = '#6b7280'; // abu-abu
          ctx.fillText(label, 20, y);

          const labelWidth = ctx.measureText(label).width;

          ctx.font = '600 13px sans-serif';
          ctx.fillStyle = '#111827'; // hitam pekat
          ctx.fillText(val.length > 45 ? val.substring(0, 45) + '...' : val, 20 + labelWidth + 5, y);
        } else {
          ctx.font = '500 13px sans-serif';
          ctx.fillStyle = '#111827';
          ctx.fillText(line.length > 60 ? line.substring(0, 60) + '...' : line, 20, y);
        }
        y += itemHeight;
      });
    }

    y += 10; ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(430, y); ctx.stroke(); y += 25;

    const subtotal = order.bill_details ? parseFloat(order.total_price || 0) : (isBelanja ? calcJastipSubtotal(order.id, order.raw_order_text, jastipPrices) : 0);
    const ongkir = parseFloat(order.delivery_fee || 0);
    const grandTotal = subtotal + ongkir;

    ctx.font = '600 13px sans-serif';
    ctx.fillStyle = '#111827';
    if (isBelanja) {
      ctx.fillText('Subtotal Belanja', 20, y); ctx.textAlign = 'right'; ctx.fillText(`Rp ${subtotal.toLocaleString('id-ID')}`, 430, y); ctx.textAlign = 'left'; y += 25;
    }
    ctx.fillText('Ongkos Jasa', 20, y); ctx.textAlign = 'right'; ctx.fillText(`Rp ${ongkir.toLocaleString('id-ID')}`, 430, y); ctx.textAlign = 'left'; y += 30;

    ctx.font = '900 18px sans-serif'; ctx.fillStyle = '#004aad';
    ctx.fillText('GRAND TOTAL', 20, y); ctx.textAlign = 'right'; ctx.fillText(`Rp ${grandTotal.toLocaleString('id-ID')}`, 430, y); ctx.textAlign = 'left';

    y += 40;
    ctx.fillStyle = '#f3f4f6'; ctx.fillRect(20, y, 410, 110);
    y += 25;
    ctx.fillStyle = '#111827'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('METODE PEMBAYARAN (CASH / TRANSFER)', 225, y); y += 20;
    ctx.font = '600 12px sans-serif'; ctx.fillStyle = '#004aad';

    const pay1 = (courier.bank_name && courier.account_number) ? `${courier.bank_name}: ${courier.account_number}` : `Hubungi admin untuk rekening kurir`;
    ctx.fillText(pay1, 225, y); y += 18;
    if (courier.bank_name_2 && courier.account_number_2) {
      const pay2 = `${courier.bank_name_2}: ${courier.account_number_2}`;
      ctx.fillText(pay2, 225, y); y += 18;
    }
    ctx.fillText(`a/n ${courier.full_name || 'Kurir Tutah Titah'}`, 225, y);

    y += 45;
    ctx.fillStyle = '#111827'; ctx.font = '700 13px sans-serif';
    ctx.fillText('Terima kasih telah menggunakan layanan TutahTitah. 🙏', 225, y);
    y += 20;
    ctx.font = '500 11px sans-serif'; ctx.fillStyle = '#4b5563';
    ctx.fillText('WA: 087842344481 | IG: tutahtitah  |  FB: Tutahtitah  |  TikTok: @tutahtitah_', 225, y);

    canvas.toBlob(blob => resolve(blob), 'image/png', 1.0);
  });
};
