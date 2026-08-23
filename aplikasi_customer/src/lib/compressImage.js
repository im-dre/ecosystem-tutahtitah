/**
 * Kompres gambar sebelum diupload menggunakan canvas browser.
 * Nol dependency tambahan, pure JavaScript.
 * 
 * @param {File} file - File gambar asli
 * @param {Object} options
 * @param {number} options.maxWidth - Lebar maksimal (default 1280px)
 * @param {number} options.maxHeight - Tinggi maksimal (default 1280px)
 * @param {number} options.quality - Kualitas (0.0 - 1.0, default 0.75)
 * @param {string} options.mimeType - Output format (default 'image/webp')
 * @returns {Promise<File>} File terkompresi
 */
export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.75,
    mimeType = 'image/webp',
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = reject;

    img.onload = () => {
      let { width, height } = img;

      // Hitung ukuran baru dengan mempertahankan aspect ratio
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            // Fallback ke file asli jika browser tidak support webp
            resolve(file);
            return;
          }
          // Buat File baru dari blob yang sudah terkompresi
          const ext = mimeType === 'image/webp' ? 'webp' : 'jpg';
          const compressedFile = new File(
            [blob],
            file.name.replace(/\.[^.]+$/, `.${ext}`),
            { type: mimeType }
          );
          resolve(compressedFile);
        },
        mimeType,
        quality
      );
    };
    img.onerror = reject;

    reader.readAsDataURL(file);
  });
}
