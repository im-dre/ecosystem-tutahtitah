import React, { useState, useMemo } from "react";

/**
 * CustomCourierSelect
 * Props:
 *   value       — id kurir yang dipilih
 *   onChange    — callback(val)
 *   placeholder — teks placeholder
 *   bgClass     — Tailwind class untuk bg input (default "bg-gray-50")
 *   couriersList         — array semua kurir
 *   activeCourierCounts  — object { courierId: jumlahOrderAktif }
 */
const CustomCourierSelect = ({
  value,
  onChange,
  placeholder,
  bgClass = "bg-gray-50",
  couriersList = [],
  activeCourierCounts = {},
  courierRatingStats = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = couriersList.find((c) => c.id === value);

  const activeCouriers = useMemo(
    () =>
      couriersList
        .filter((c) => !(c.pin && c.pin.startsWith("BANNED_")))
        .sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")),
    [couriersList]
  );

  return (
    <div className="relative w-full">
      <div
        className={`w-full px-3 py-2.5 ${bgClass} border border-gray-200 rounded-lg font-bold cursor-pointer flex justify-between items-center transition hover:border-[#004aad]`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span
          className={`truncate ${
            !selected
              ? "text-[10px] text-gray-500"
              : "text-xs sm:text-sm text-gray-700"
          }`}
        >
          {selected ? selected.full_name : placeholder}
        </span>
        <span className="text-gray-400 text-[10px]">▼</span>
      </div>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-50 bottom-full mb-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-56 overflow-y-auto py-1">
            <div
              className={`px-3 py-2 text-[10px] font-bold hover:bg-blue-50 cursor-pointer transition ${
                !value ? "text-[#004aad] bg-blue-50/50" : "text-gray-500"
              }`}
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
            >
              {placeholder}
            </div>
            {activeCouriers.map((c) => {
              const count = activeCourierCounts[c.id] || 0;
              return (
                <div
                  key={c.id}
                  className={`px-3 py-2.5 text-xs hover:bg-blue-50 cursor-pointer flex justify-between items-center transition border-t border-gray-50 ${
                    value === c.id ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() => {
                    onChange(c.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span
                      className={`font-bold ${
                        value === c.id ? "text-[#004aad]" : "text-gray-700"
                      }`}
                    >
                      {c.full_name}
                    </span>
                    {courierRatingStats[c.id] && courierRatingStats[c.id].count > 0 && (
                      <span className="text-[9px] text-gray-500 font-medium flex items-center gap-0.5 mt-0.5">
                        <span className="text-yellow-400">⭐</span> {courierRatingStats[c.id].average} ({courierRatingStats[c.id].count})
                      </span>
                    )}
                  </div>
                  {count > 0 && (
                    <span className="bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30 px-2 py-1 rounded-md text-[9px] font-bold whitespace-nowrap shadow-sm">
                      {count} In progress
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomCourierSelect;
