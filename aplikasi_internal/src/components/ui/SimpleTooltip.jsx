import React from "react";

const SimpleTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 shadow-lg border border-gray-100 rounded-xl z-50">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-100 pb-1">
          {label || payload[0].payload.name}
        </p>
        {payload.map((p, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center gap-4 mb-1"
          >
            <span
              className="text-[10px] font-bold"
              style={{ color: p.stroke || p.fill }}
            >
              {p.name}:
            </span>
            <span className="text-sm font-bold text-gray-900">
              {p.value} Order
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default SimpleTooltip;
