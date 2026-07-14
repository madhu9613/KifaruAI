import React from "react";
import { ChevronDown, ChevronRight, Folder, FolderOpen, Pencil, Trash2 } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableConversationItem } from "./SortableConversationItem";

export const FolderSection = ({
    folder,
    isExpanded,
    onToggle,
    onRenameFolder,
    onDeleteFolder,
    onRenameConversation,
    onDeleteConversation,
    onMoveConversation,
    onTogglePin,
    folders,
    selectedConversation,
    editingConvId,
    editingTitle,
    setEditingTitle,
    saveEdit,
    cancelEdit,
    renderConversationItem, // we'll pass this down to avoid duplication
}) => {
    return (
        <div className="mb-1">
            <div
                className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors duration-150 cursor-pointer group"
                onClick={() => onToggle(folder._id)}
            >
                <button className="text-slate-500 hover:text-slate-300 bg-transparent border-none p-0">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
                {isExpanded ? <FolderOpen size={14} className="text-indigo-400" /> : <Folder size={14} className="text-indigo-400" />}
                <span className="text-[13px] font-medium text-slate-200 flex-1 truncate">{folder.name}</span>
                <span className="text-[10px] text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded-full">
                    {folder.conversations?.length || 0}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onRenameFolder(folder._id, folder.name);
                        }}
                        className="text-slate-500 hover:text-slate-200 bg-transparent border-none p-1 rounded hover:bg-white/[0.05]"
                        title="Rename"
                    >
                        <Pencil size={12} />
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder._id);
                        }}
                        className="text-slate-500 hover:text-red-400 bg-transparent border-none p-1 rounded hover:bg-white/[0.05]"
                        title="Delete"
                    >
                        <Trash2 size={12} />
                    </button>
                </div>
            </div>
            {isExpanded && folder.conversations?.length > 0 && (
                <div className="ml-6 space-y-0.5">
                    <SortableContext items={folder.conversations.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                        {folder.conversations.map((conv) => renderConversationItem(conv))}
                    </SortableContext>
                </div>
            )}
        </div>
    );
};