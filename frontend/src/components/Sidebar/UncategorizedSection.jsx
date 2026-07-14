import React from "react";
import { MessageSquare } from "lucide-react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export const UncategorizedSection = ({ conversations, renderConversationItem }) => {
    if (!conversations?.length) return null;

    return (
        <div className="mb-1">
            <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <MessageSquare size={13} />
                Chats
            </div>
            <div className="ml-1 space-y-0.5">
                <SortableContext items={conversations.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                    {conversations.map((conv) => renderConversationItem(conv))}
                </SortableContext>
            </div>
        </div>
    );
};