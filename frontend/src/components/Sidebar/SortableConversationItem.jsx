import React, { useState, useRef, useEffect } from "react";
import {
    GripVertical,
    Pin,
    PinOff,
    MoreHorizontal,
    Pencil,
    Folder,
    ChevronRight,
    Trash2,
    MessageSquare,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const SortableConversationItem = ({
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
}) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: conv._id });

    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isEditingThis = isEditing === conv._id;

    const handleMenuAction = (callback) => {
        setShowMenu(false);
        callback();
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-colors duration-150 relative group
        ${isActive ? "bg-indigo-500/10 border border-indigo-500/[0.18]" : "hover:bg-white/[0.05] border border-transparent"}`}
            onClick={() => !isEditingThis && onSelect(conv)}
        >
            <div {...listeners} className="text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing p-0.5">
                <GripVertical size={13} />
            </div>

            {isEditingThis ? (
                <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={() => saveEdit(conv._id)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(conv._id);
                        if (e.key === "Escape") cancelEdit();
                    }}
                    className="flex-1 bg-transparent border border-indigo-500/30 rounded px-2 py-0.5 text-sm text-slate-200 outline-none focus:border-indigo-400"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                />
            ) : (
                <>
                    <MessageSquare size={13} className="text-slate-500 shrink-0" />
                    <span className="text-[13px] font-medium truncate text-slate-300 flex-1" title={conv.title}>
                        {conv.title}
                    </span>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(conv._id, conv.pinned);
                        }}
                        className="text-slate-500 hover:text-yellow-400 transition-colors bg-transparent border-none p-1"
                        title={conv.pinned ? "Unpin" : "Pin"}
                    >
                        {conv.pinned ? <Pin size={13} className="text-yellow-400" /> : <PinOff size={13} />}
                    </button>

                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu((prev) => !prev);
                            }}
                            className="text-slate-500 hover:text-slate-200 bg-transparent border-none p-1 rounded hover:bg-white/[0.05] transition-colors"
                            title="More options"
                        >
                            <MoreHorizontal size={15} />
                        </button>

                        {showMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-[#1a1d24] border border-white/[0.08] rounded-lg shadow-lg py-1 min-w-[160px] z-10">
                                <button
                                    onClick={() => handleMenuAction(() => onRename(conv))}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.05] transition-colors border-none bg-transparent cursor-pointer"
                                >
                                    <Pencil size={13} />
                                    Rename
                                </button>

                                <div className="relative group">
                                    <button
                                        className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.05] transition-colors border-none bg-transparent cursor-pointer"
                                    >
                                        <Folder size={13} />
                                        Move to folder
                                        <ChevronRight size={12} className="ml-auto" />
                                    </button>
                                    <div className="absolute left-full top-0 ml-1 bg-[#1a1d24] border border-white/[0.08] rounded-lg shadow-lg py-1 min-w-[140px] hidden group-hover:block">
                                        <button
                                            onClick={() => handleMenuAction(() => onMove(conv._id, null))}
                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.05] transition-colors border-none bg-transparent cursor-pointer"
                                        >
                                            No folder
                                        </button>
                                        {folders.map((f) => {
                                            if (f._id === conv.folderId) return null;
                                            return (
                                                <button
                                                    key={f._id}
                                                    onClick={() => handleMenuAction(() => onMove(conv._id, f._id))}
                                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.05] transition-colors border-none bg-transparent cursor-pointer"
                                                >
                                                    {f.name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleMenuAction(() => onDelete(conv._id))}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-white/[0.05] transition-colors border-none bg-transparent cursor-pointer"
                                >
                                    <Trash2 size={13} />
                                    Delete
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};