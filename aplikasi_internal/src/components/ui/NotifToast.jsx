import React from "react";

const NotifToast = ({ notif, className = "" }) => {
    if (!notif?.message) return null;

    return (
        <div className={`${className} fixed top-8 left-1/2 z-[100] w-[90%] max-w-sm px-4 py-3 rounded-2xl shadow-xl border backdrop-blur-xl bg-white/95 toast-animate flex items-center gap-3 ${notif.type === "error" ? "border-red-500" : "border-emerald-500"}`}>
            <div className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full ${notif.type === "error" ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600"}`}>
                <span className="text-xl">{notif.type === "error" ? "⚠️" : "✅"}</span>
            </div>
            <div className="flex flex-col">
                <span className={`text-[10px] uppercase font-bold tracking-widest ${notif.type === "error" ? "text-red-600" : "text-emerald-600"}`}>
                    {notif.type === "error" ? "Pemberitahuan" : "Berhasil"}
                </span>
                <span className="text-sm font-semibold text-gray-800 leading-snug">
                    {notif.message}
                </span>
            </div>
        </div>
    );
};

export default NotifToast;
