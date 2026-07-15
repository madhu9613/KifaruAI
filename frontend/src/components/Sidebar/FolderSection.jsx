import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ChevronDown, ChevronRight, Folder, MoreVertical } from "lucide-react";

export function FolderSection({
    folder,
    isExpanded,
    onToggle,
    onRenameFolder,
    onDeleteFolder,
    folders,
    selectedConversation,
    editingConvId,
    editingTitle,
    setEditingTitle,
    saveEdit,
    cancelEdit,
    renderConversationItem,
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: `folder-${folder._id}`,
    });

    return (
        <div
            ref={setNodeRef}
            className={`mt-2 rounded-lg transition-colors duration-150 ${isOver ? "bg-white/5 ring-1 ring-indigo-500/30" : ""
                }`}
        >
            {/* Folder header */}
            <div
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] cursor-pointer select-none"
                onClick={() => onToggle(folder._id)}
            >
                <button className="p-0.5 text-slate-500 hover:text-slate-300 transition-colors">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                <Folder size={14} className="text-indigo-400 shrink-0" />
                <span className="flex-1 text-sm font-medium text-slate-200 truncate">{folder.name}</span>
                <div className="flex items-center gap-0.5">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRenameFolder(folder._id, folder.name);
                        }}
                        className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        <MoreVertical size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder._id);
                        }}
                        className="p-1 rounded hover:bg-white/[0.06] text-slate-500 hover:text-red-400 transition-colors"
                    >
                        <MoreVertical size={12} /> {/* replace with actual delete icon if desired */}
                    </button>
                </div>
            </div>

            {/* Conversations list */}
            {isExpanded && (
                <div className="ml-2 pl-1 border-l border-white/[0.04]">
                    <SortableContext
                        items={folder.conversations.map((c) => c._id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {folder.conversations.map((conv) => renderConversationItem(conv))}
                    </SortableContext>
                </div>
            )}
        </div>
    );
}