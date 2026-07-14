import React, { useState, useEffect } from "react";

export const FolderNameModal = ({ isOpen, onClose, onConfirm, initialValue = "", title = "New Folder" }) => {
    const [name, setName] = useState(initialValue);

    useEffect(() => {
        if (isOpen) setName(initialValue);
    }, [isOpen, initialValue]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onConfirm(name.trim());
            setName("");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1d24] border border-white/[0.08] rounded-2xl p-6 w-[340px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-white font-semibold text-lg mb-1">{title}</h3>
                <p className="text-slate-400 text-sm mb-4">Enter a name</p>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name..."
                        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-xl px-4 py-2.5 text-slate-200 text-sm outline-none focus:border-indigo-500/50 transition-colors"
                        autoFocus
                    />
                    <div className="flex gap-2 mt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors border-none cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium hover:opacity-90 transition-opacity border-none cursor-pointer"
                        >
                            {title === "Rename Folder" ? "Save" : "Create"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};