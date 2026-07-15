import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pin, PinOff, Edit, Trash2, FolderPlus, Check, X } from "lucide-react";

export function SortableConversationItem({
    conv,
    isActive,
    onSelect,
    onMove,
    onTogglePin,
    onRename,
    onDelete,
    folders,
    isEditing,
    editingTitle,
    setEditingTitle,
    saveEdit,
    cancelEdit,
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: conv._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
    };

    // Dropdown state
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);

    const openDropdown = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
            });
        }
        setDropdownOpen(true);
    };

    const closeDropdown = () => setDropdownOpen(false);

    // Close dropdown on outside click
    useEffect(() => {
        if (!dropdownOpen) return;
        const handleClickOutside = (e) => {
            if (triggerRef.current && !triggerRef.current.contains(e.target)) {
                closeDropdown();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownOpen]);

    const handleMove = (folderId) => {
        onMove(conv._id, folderId);
        closeDropdown();
    };

    const isRenaming = isEditing === conv._id;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`group flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all duration-150 cursor-pointer ${isActive
                    ? "bg-indigo-500/15 text-indigo-300"
                    : "hover:bg-white/[0.04] text-slate-400 hover:text-slate-200"
                } ${isDragging ? "shadow-lg" : ""}`}
            onClick={() => onSelect(conv)}
        >
            {/* Drag handle */}
            <div
                {...listeners}
                className="p-0.5 text-slate-600 hover:text-slate-300 transition-colors cursor-grab active:cursor-grabbing"
            >
                <GripVertical size={12} />
            </div>

            {/* Title / Edit input */}
            {isRenaming ? (
                <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(conv._id);
                        if (e.key === "Escape") cancelEdit();
                    }}
                    autoFocus
                    className="flex-1 bg-transparent border border-white/10 rounded px-1 py-0.5 text-sm text-slate-100 outline-none focus:border-indigo-400"
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <span className="flex-1 text-sm truncate">{conv.title}</span>
            )}

            {/* Action buttons (only visible on hover or if active) */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {isRenaming ? (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); saveEdit(conv._id); }}
                            className="p-1 rounded hover:bg-white/[0.06] text-green-400"
                        >
                            <Check size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
                            className="p-1 rounded hover:bg-white/[0.06] text-red-400"
                        >
                            <X size={12} />
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); onTogglePin(conv._id); }}
                            className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300"
                        >
                            {conv.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onRename(conv); }}
                            className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300"
                        >
                            <Edit size={12} />
                        </button>
                        {/* Move to folder dropdown trigger */}
                        <button
                            ref={triggerRef}
                            onClick={(e) => { e.stopPropagation(); openDropdown(); }}
                            className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300"
                        >
                            <FolderPlus size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(conv._id); }}
                            className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-red-400"
                        >
                            <Trash2 size={12} />
                        </button>
                    </>
                )}
            </div>

            {/* Dropdown portal */}
            {dropdownOpen &&
                createPortal(
                    <div
                        style={{
                            position: "absolute",
                            top: dropdownPosition.top,
                            left: dropdownPosition.left,
                            zIndex: 9999,
                            background: "#1e2430",
                            borderRadius: "8px",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            minWidth: "160px",
                            padding: "4px",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-xs font-medium text-slate-500 px-2 py-1">Move to folder</div>
                        <button
                            onClick={() => handleMove(null)}
                            className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] rounded transition-colors"
                        >
                            Uncategorized
                        </button>
                        {folders.map((f) => (
                            <button
                                key={f._id}
                                onClick={() => handleMove(f._id)}
                                className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-white/[0.06] rounded transition-colors"
                                disabled={f._id === conv.folderId}
                            >
                                {f.name}
                                {f._id === conv.folderId && " ✓"}
                            </button>
                        ))}
                    </div>,
                    document.body
                )}
        </div>
    );
}