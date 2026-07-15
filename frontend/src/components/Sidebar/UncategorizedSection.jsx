import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export function UncategorizedSection({ conversations, renderConversationItem }) {
    const { setNodeRef, isOver } = useDroppable({
        id: "uncategorized",
    });

    if (conversations.length === 0) return null;

    return (
        <div
            ref={setNodeRef}
            className={`mt-3 rounded-lg transition-colors duration-150 ${isOver ? "bg-white/5 ring-1 ring-indigo-500/30" : ""
                }`}
        >
            <div className="px-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider">
                Uncategorized
            </div>
            <div className="ml-2 pl-1 border-l border-white/[0.04]">
                <SortableContext
                    items={conversations.map((c) => c._id)}
                    strategy={verticalListSortingStrategy}
                >
                    {conversations.map((conv) => renderConversationItem(conv))}
                </SortableContext>
            </div>
        </div>
    );
}