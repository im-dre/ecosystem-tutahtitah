// ==========================================================================
// HELPERS.JS — Pure utility functions, tidak ada side effect atau state
// ==========================================================================

export const formatDateTime = (isoString) => {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "-";
    return `${date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    })} - ${date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`;
  } catch (e) {
    return "-";
  }
};

export const calculateDuration = (startIso, endIso) => {
  if (!startIso || !endIso) return "-";
  try {
    const diffMins = Math.round(
      (new Date(endIso) - new Date(startIso)) / 60000
    );
    if (diffMins < 0) return "-";
    if (diffMins < 60) return `${diffMins} Mnt`;
    return `${Math.floor(diffMins / 60)}j ${diffMins % 60}m`;
  } catch (e) {
    return "-";
  }
};

export const getDurationMins = (startIso, endIso) => {
  if (!startIso || !endIso) return null;
  try {
    const diffMs = new Date(endIso) - new Date(startIso);
    return diffMs > 0 ? diffMs / 60000 : null;
  } catch (e) {
    return null;
  }
};

export const formatDurLabel = (m) =>
  m > 0
    ? m < 60
      ? `${Math.round(m)} Mnt`
      : `${Math.floor(m / 60)}j ${Math.round(m % 60)}m`
    : "-";

export const isWithinPeriod = (dateString, period, customStart, customEnd) => {
  if (!dateString) return false;
  try {
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    if (period === "today") return d.getTime() === now.getTime();
    if (period === "week") {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === "month")
      return (
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    if (period === "year") return d.getFullYear() === now.getFullYear();
    if (period === "custom") {
      if (customStart && customEnd) {
        const s = new Date(customStart);
        s.setHours(0, 0, 0, 0);
        const e = new Date(customEnd);
        e.setHours(23, 59, 59, 999);
        return d >= s && d <= e;
      }
    }
    return true;
  } catch (e) {
    return false;
  }
};

export const getWaLink = (waString) => {
  if (!waString) return "#";
  let cleanNum = waString.replace(/[^0-9]/g, "");
  if (cleanNum.startsWith("08")) {
    cleanNum = "62" + cleanNum.substring(1);
  }
  return `https://wa.me/${cleanNum}`;
};

// --- PARSERS JASTIP ---
export const parseJastipItems = (rawText) => {
  if (!rawText) return [];
  let listPart = rawText.split(/note:/i)[0].split(/alamat tujuan:/i)[0];
  listPart = listPart.replace(/format belanja\/jastip:/gi, "");
  listPart = listPart.replace(/list belanjaan secara spesifik:/gi, "");
  return listPart
    .split("\n")
    .filter((line) => {
      const t = line.trim();
      if (t.length === 0) return false;
      if (/^\d+\.?$/.test(t)) return false;
      return true;
    })
    .map((line) => line.trim());
};

export const parseJastipNote = (rawText) => {
  if (!rawText) return "";
  const match = rawText.match(/note:\s*([\s\S]*)/i);
  return match ? match[1].trim() : "";
};

export const parseJastipItemsObjects = (rawText) => {
  return parseJastipItems(rawText).map((line) => {
    let name = line;
    let defaultPrice = 0;
    const splitIndex = line.lastIndexOf("= Rp ");
    if (splitIndex > -1) {
      name = line.substring(0, splitIndex).trim();
      defaultPrice =
        parseFloat(line.substring(splitIndex + 5).trim()) || 0;
    }
    return { name, defaultPrice, original: line };
  });
};

// --- PARSERS FORMAT LAYANAN ---
export const parseOjekDetails = (rawText) => {
  if (!rawText) return null;
  const jemputMatch = rawText.match(
    /Alamat Jemput:\s*([\s\S]*?)(?=Alamat Tujuan:|$)/i
  );
  const tujuanMatch = rawText.match(
    /Alamat Tujuan:\s*([\s\S]*?)(?=Note\/Patokan Titik Jemput:|$)/i
  );
  const noteMatch = rawText.match(/Note\/Patokan Titik Jemput:\s*([\s\S]*)/i);
  if (!jemputMatch && !tujuanMatch) return null;
  return {
    jemput:
      jemputMatch && jemputMatch[1].trim() ? jemputMatch[1].trim() : "-",
    tujuan:
      tujuanMatch && tujuanMatch[1].trim() ? tujuanMatch[1].trim() : "-",
    note: noteMatch && noteMatch[1].trim() ? noteMatch[1].trim() : "",
  };
};

export const parseKirimDetails = (rawText) => {
  if (!rawText) return null;
  const barangMatch = rawText.match(
    /Nama\/Jenis Barang:\s*([\s\S]*?)(?=Alamat Pengambilan:|$)/i
  );
  const ambilMatch = rawText.match(
    /Alamat Pengambilan:\s*([\s\S]*?)(?=Alamat Tujuan:|$)/i
  );
  const tujuanMatch = rawText.match(
    /Alamat Tujuan:\s*([\s\S]*?)(?=Nama Penerima:|$)/i
  );
  const penerimaMatch = rawText.match(/Nama Penerima:\s*([\s\S]*?)(?=Note:|$)/i);
  const noteMatch = rawText.match(/Note:\s*([\s\S]*)/i);
  if (!barangMatch && !ambilMatch && !tujuanMatch) return null;
  return {
    barang:
      barangMatch && barangMatch[1].trim() ? barangMatch[1].trim() : "-",
    ambil: ambilMatch && ambilMatch[1].trim() ? ambilMatch[1].trim() : "-",
    tujuan:
      tujuanMatch && tujuanMatch[1].trim() ? tujuanMatch[1].trim() : "-",
    penerima:
      penerimaMatch && penerimaMatch[1].trim()
        ? penerimaMatch[1].trim()
        : "-",
    note: noteMatch && noteMatch[1].trim() ? noteMatch[1].trim() : "",
  };
};
