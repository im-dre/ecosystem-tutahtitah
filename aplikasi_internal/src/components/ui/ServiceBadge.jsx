import React from "react";

const ServiceBadge = ({ type }) => {
  if (type === "Belanja")
    return (
      <span className="bg-blue-100 text-[#004aad] px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-blue-200">
        🛒 Belanja
      </span>
    );
  if (type === "Antar Jemput")
    return (
      <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-yellow-200">
        🛵 Antar Jemput
      </span>
    );
  if (type === "Kirim Barang")
    return (
      <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-emerald-200">
        📦 Kirim Barang
      </span>
    );
  return (
    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-[10px] sm:text-xs font-bold uppercase tracking-wider inline-block shadow-sm border border-gray-200">
      📋 Umum
    </span>
  );
};

export default ServiceBadge;
