import React from "react";

export const ConfirmModal = ({ isOpen, onClose, onConfirm, title = "Confirm", message = "Are you sure?", confirmText = "Delete" }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1d24] border border-white/[0.08] rounded-2xl p-6 w-[340px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
                <p className="text-slate-400 text-sm mb-4">{message}</p>
                <div className="flex gap-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors border-none cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors border-none cursor-pointer"
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};