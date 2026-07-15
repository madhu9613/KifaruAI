import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    Plus,
    Menu,
    X,
    CoinsIcon,
    FolderPlus,
    User,
    LogOut,
    MessageSquare,
    PenSquare,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../../utils/axios";
import { setUserData } from "../../redux/user.slice";
import {
    getFoldersWithConversations,
    createFolder,
    renameFolder,
    deleteFolder,
    moveConversation,
    togglePinConversation,
    deleteConversation,
} from "../../features/conversation.api";
import {
    setFoldersWithConversations,
    moveConversationLocal,
    togglePinConversationLocal,
    setConvTitle,
    setSelectedConversation,
    deleteConversationLocal,
} from "../../redux/conversation.slice";
import { setArtifacts, setMessages } from "../../redux/message.slice";
import BillingDrawer from "./BillingDrawer";

// ── Components ──
import { PanelIcon } from "./PanelIcon";
import { FolderNameModal } from "./FolderNameModal";
import { ConfirmModal } from "./ConfirmModal";
import { FolderSection } from "./FolderSection";
import { UncategorizedSection } from "./UncategorizedSection";
import { SortableConversationItem } from "./SortableConversationItem";

// ── DnD Kit ──
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showBilling, setShowBilling] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState({});
    const [editingConvId, setEditingConvId] = useState(null);
    const [editingTitle, setEditingTitle] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal states
    const [folderModal, setFolderModal] = useState({ open: false, mode: "create", folderId: null, initialName: "" });
    const [confirmModal, setConfirmModal] = useState({ open: false, title: "", message: "", onConfirm: null });

    // Drag overlay state
    const [activeId, setActiveId] = useState(null);

    const { userData } = useSelector((state) => state.user);
    const { folders, selectedConversation } = useSelector((state) => state.conversation);
    const dispatch = useDispatch();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    // ── Data fetching ──
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const data = await getFoldersWithConversations();
                dispatch(setFoldersWithConversations(data));
            } catch (err) {
                console.error("Failed to load folders:", err);
                setError("Could not load conversations. Please refresh.");
            } finally {
                setLoading(false);
            }
        };
        if (userData) fetchData();
    }, [userData, dispatch]);

    // ── Auth ──
    const logout = async () => {
        try {
            await api.get("/api/auth/logout");
            dispatch(setUserData(null));
        } catch (error) {
            console.log(error);
        }
    };

    // ── Conversations ──
    const handleCreateConversation = () => {
        dispatch(setSelectedConversation(null));
        dispatch(setMessages([]));
        dispatch(setArtifacts([]));
        setMobileOpen(false);
    };

    const handleSelectConversation = useCallback(
        (conversation) => {
            setMobileOpen(false);
            dispatch(setSelectedConversation(conversation));
        },
        [dispatch]
    );

    // ── Folder operations ──
    const handleCreateFolder = (name) => {
        createFolder(name)
            .then(() => getFoldersWithConversations())
            .then((data) => dispatch(setFoldersWithConversations(data)))
            .catch(console.error);
    };

    const handleRenameFolder = (folderId, newName) => {
        renameFolder(folderId, newName)
            .then(() => getFoldersWithConversations())
            .then((data) => dispatch(setFoldersWithConversations(data)))
            .catch(console.error);
    };

    const handleDeleteFolder = (folderId) => {
        deleteFolder(folderId)
            .then(() => getFoldersWithConversations())
            .then((data) => dispatch(setFoldersWithConversations(data)))
            .catch(console.error);
    };

    // ── Conversation actions ──
    const handleMoveConversation = useCallback(
        async (conversationId, folderId) => {
            try {
                await moveConversation(conversationId, folderId);
                dispatch(moveConversationLocal({ conversationId, folderId }));
            } catch (error) {
                console.error(error);
            }
        },
        [dispatch]
    );

    const handleTogglePin = useCallback(
        async (conversationId) => {
            try {
                const updated = await togglePinConversation(conversationId);
                dispatch(togglePinConversationLocal({ conversationId, pinned: updated.pinned }));
            } catch (error) {
                console.error(error);
            }
        },
        [dispatch]
    );

    const handleDeleteConversation = useCallback(
        async (conversationId) => {
            try {
                await deleteConversation(conversationId);
                dispatch(deleteConversationLocal({ conversationId }));
            } catch (error) {
                console.error(error);
            }
        },
        [dispatch]
    );

    // ── Rename conversation ──
    const startEditing = (conv) => {
        setEditingConvId(conv._id);
        setEditingTitle(conv.title);
    };

    const saveEdit = async (convId) => {
        const newTitle = editingTitle.trim() || "New Chat";
        try {
            await api.post("/api/chat/update-conversation", {
                conversationId: convId,
                title: newTitle,
            });
            dispatch(setConvTitle({ conversationId: convId, title: newTitle }));
            setEditingConvId(null);
        } catch (error) {
            console.error(error);
        }
    };

    const cancelEdit = () => {
        setEditingConvId(null);
        setEditingTitle("");
    };

    // ── Folder expand toggle ──
    const toggleFolder = useCallback(
        (folderId) => {
            if (!folderId) return;
            setExpandedFolders((prev) => ({
                ...prev,
                [folderId]: !prev[folderId],
            }));
        },
        []
    );

    // ── Memoized data ──
    const realFolders = useMemo(() => folders.filter((f) => f._id !== null), [folders]);
    const uncategorizedConvs = useMemo(() => {
        const uncat = folders.find((f) => f._id === null);
        return uncat?.conversations || [];
    }, [folders]);

    // ── Drag end ──
    const handleDragEnd = useCallback(
        async (event) => {
            const { active, over } = event;
            if (!over) return;

            const conversationId = active.id;
            let targetFolderId = null;

            // If dropped on a folder container
            if (typeof over.id === "string" && over.id.startsWith("folder-")) {
                targetFolderId = over.id.replace("folder-", "");
            }
            // If dropped on "uncategorized" container
            else if (over.id === "uncategorized") {
                targetFolderId = null;
            }
            // If dropped on another conversation
            else {
                const allConvs = [...uncategorizedConvs, ...realFolders.flatMap((f) => f.conversations || [])];
                const targetConv = allConvs.find((c) => c._id === over.id);
                if (targetConv) {
                    targetFolderId = targetConv.folderId; // may be null
                }
            }

            // If we didn't find a valid target, do nothing
            if (targetFolderId === undefined) return;

            // Find the source conversation
            const allConvs = [...uncategorizedConvs, ...realFolders.flatMap((f) => f.conversations || [])];
            const sourceConv = allConvs.find((c) => c._id === conversationId);
            if (!sourceConv) return;

            // Only move if the folder actually changed
            if (sourceConv.folderId !== targetFolderId) {
                await handleMoveConversation(conversationId, targetFolderId);
            }
            setActiveId(null);
        },
        [handleMoveConversation, uncategorizedConvs, realFolders]
    );

    const handleDragStart = ({ active }) => {
        setActiveId(active.id);
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // ── Render helper for conversation items ──
    const renderConversationItem = useCallback(
        (conv) => {
            const isActive = selectedConversation?._id === conv._id;
            return (
                <SortableConversationItem
                    key={conv._id}
                    conv={conv}
                    isActive={isActive}
                    onSelect={handleSelectConversation}
                    onMove={handleMoveConversation}
                    onTogglePin={handleTogglePin}
                    onRename={startEditing}
                    onDelete={(id) => {
                        setConfirmModal({
                            open: true,
                            title: "Delete Conversation",
                            message: `Delete "${conv.title}"? This action cannot be undone.`,
                            onConfirm: () => handleDeleteConversation(id),
                        });
                    }}
                    folders={realFolders}
                    isEditing={editingConvId}
                    editingTitle={editingTitle}
                    setEditingTitle={setEditingTitle}
                    saveEdit={saveEdit}
                    cancelEdit={cancelEdit}
                />
            );
        },
        [
            selectedConversation,
            handleSelectConversation,
            handleMoveConversation,
            handleTogglePin,
            realFolders,
            editingConvId,
            editingTitle,
            setEditingTitle,
            saveEdit,
            cancelEdit,
            handleDeleteConversation,
        ]
    );

    // ── Collapsed rail ──
    if (collapsed) {
        return (
            <div className="hidden lg:flex flex-col items-center w-[56px] h-screen bg-[#0d0f14] border-r border-white/[0.06] py-4 gap-1 shrink-0">
                <button
                    onClick={() => setCollapsed(false)}
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer mb-1"
                >
                    <PanelIcon />
                </button>
                <button
                    onClick={handleCreateConversation}
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                >
                    <Plus size={17} />
                </button>
                <div className="flex-1 flex flex-col items-center gap-1 overflow-y-auto w-full px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden mt-1">
                    {[...uncategorizedConvs, ...realFolders.flatMap((f) => f.conversations || [])]
                        .sort((a, b) => (a.pinned ? -1 : 1) - (b.pinned ? -1 : 1))
                        .map((conv) => (
                            <button
                                key={conv._id}
                                onClick={() => handleSelectConversation(conv)}
                                title={conv.title}
                                className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150 border-none cursor-pointer
                  ${selectedConversation?._id === conv._id ? "bg-indigo-500/15 text-indigo-400" : "bg-transparent text-slate-500 hover:bg-white/[0.05] hover:text-slate-300"}`}
                            >
                                <MessageSquare size={15} />
                            </button>
                        ))}
                </div>
                <div className="mt-auto">
                    {userData && (
                        <div className="relative">
                            {userData.avatar ? (
                                <img src={userData.avatar} alt={userData.name} className="w-8 h-8 rounded-[8px] object-cover border-2 border-indigo-500/25" />
                            ) : (
                                <div className="w-8 h-8 rounded-[8px] bg-white/[0.06] flex items-center justify-center"><User size={14} className="text-slate-400" /></div>
                            )}
                            <span className="absolute -bottom-px -right-px w-2 h-2 bg-green-500 rounded-full border-[1.5px] border-[#0d0f14] block" />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ── Full sidebar ──
    return (
        <>
            {/* Mobile hamburger */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer"
            >
                <Menu size={16} />
            </button>

            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                />
            )}

            <div
                className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[270px] h-screen shrink-0
          bg-[#0d0f14] border-r border-white/[0.06]
          transition-transform duration-250
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
            >
                <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]">
                        <button
                            onClick={() => setCollapsed(true)}
                            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                        >
                            <PanelIcon />
                        </button>
                        <button
                            onClick={() => setMobileOpen(false)}
                            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                        <span className="text-[16px] font-semibold text-slate-100 tracking-tight flex-1">kifaruAI</span>
                        <span className="text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide">
                            {userData?.plan ?? "pro"}
                        </span>
                        <button
                            onClick={handleCreateConversation}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                            title="New Chat"
                        >
                            <PenSquare size={14} />
                        </button>
                    </div>

                    {/* New Chat + New Folder */}
                    <div className="px-4 pt-4 pb-1 flex gap-2">
                        <button
                            onClick={handleCreateConversation}
                            className="flex-1 flex items-center justify-center gap-2 text-sm font-medium text-white bg-gradient-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150"
                        >
                            <Plus size={15} />
                            New Chat
                        </button>
                        <button
                            onClick={() => setFolderModal({ open: true, mode: "create", folderId: null, initialName: "" })}
                            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.06] text-slate-400 hover:text-slate-200 hover:bg-white/[0.08] transition-colors duration-150 cursor-pointer"
                            title="New Folder"
                        >
                            <FolderPlus size={16} />
                        </button>
                    </div>

                    {/* Conversation list with DnD */}
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                            {loading && <div className="text-slate-500 text-sm px-4 py-2">Loading conversations…</div>}
                            {error && <div className="text-red-400 text-sm px-4 py-2">{error}</div>}
                            {!loading && !error && folders.length === 0 && (
                                <div className="text-slate-500 text-sm px-4 py-2">No conversations yet</div>
                            )}

                            {/* Folders */}
                            {realFolders.map((folder) => (
                                <FolderSection
                                    key={folder._id}
                                    folder={folder}
                                    isExpanded={expandedFolders[folder._id] ?? true}
                                    onToggle={toggleFolder}
                                    onRenameFolder={(id, name) =>
                                        setFolderModal({ open: true, mode: "rename", folderId: id, initialName: name })
                                    }
                                    onDeleteFolder={(id) =>
                                        setConfirmModal({
                                            open: true,
                                            title: "Delete Folder",
                                            message: `Delete "${folder.name}"? Conversations will be moved to uncategorized.`,
                                            onConfirm: () => handleDeleteFolder(id),
                                        })
                                    }
                                    folders={realFolders}
                                    selectedConversation={selectedConversation}
                                    editingConvId={editingConvId}
                                    editingTitle={editingTitle}
                                    setEditingTitle={setEditingTitle}
                                    saveEdit={saveEdit}
                                    cancelEdit={cancelEdit}
                                    renderConversationItem={renderConversationItem}
                                />
                            ))}

                            {/* Uncategorized */}
                            <UncategorizedSection
                                conversations={uncategorizedConvs}
                                renderConversationItem={renderConversationItem}
                            />
                        </div>

                        {/* Drag Overlay */}
                        <DragOverlay>
                            {activeId ? (
                                <div className="px-3 py-2 bg-[#1e2430] rounded-lg shadow-lg border border-white/10 text-sm text-slate-200">
                                    {(() => {
                                        const allConvs = [...uncategorizedConvs, ...realFolders.flatMap(f => f.conversations || [])];
                                        const conv = allConvs.find(c => c._id === activeId);
                                        return conv ? conv.title : activeId;
                                    })()}
                                </div>
                            ) : null}
                        </DragOverlay>
                    </DndContext>

                    {/* Divider */}
                    <div className="mx-2.5 h-px bg-white/[0.06]" />

                    {/* Footer */}
                    <div className="px-3.5 py-3.5">
                        {userData ? (
                            <div className="flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150">
                                <div className="relative shrink-0">
                                    {!userData?.avatar || imageError ? (
                                        <div className="w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center">
                                            <User size={15} className="text-slate-400" />
                                        </div>
                                    ) : (
                                        <img
                                            src={userData.avatar}
                                            alt={userData.name}
                                            className="w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25"
                                            onError={() => setImageError(true)}
                                        />
                                    )}
                                    <span className="absolute -bottom-px -right-px w-[9px] h-[9px] bg-green-500 rounded-full border-2 border-[#0d0f14] block" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13.5px] font-semibold text-slate-100 truncate">{userData.name}</p>
                                    <p className="text-[11px] text-slate-600 mt-px">{userData.plan || "Free Plan"}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => setShowBilling(true)}
                                        className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                                    >
                                        <CoinsIcon size={16} />
                                    </button>
                                    <button
                                        onClick={logout}
                                        className="flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150"
                                    >
                                        <LogOut size={14} />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-1">
                                <button className="w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors duration-150">
                                    Login
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <FolderNameModal
                isOpen={folderModal.open}
                onClose={() => setFolderModal({ open: false, mode: "create", folderId: null, initialName: "" })}
                onConfirm={(name) => {
                    if (folderModal.mode === "create") {
                        handleCreateFolder(name);
                    } else if (folderModal.mode === "rename") {
                        handleRenameFolder(folderModal.folderId, name);
                    }
                    setFolderModal({ open: false, mode: "create", folderId: null, initialName: "" });
                }}
                initialValue={folderModal.initialName}
                title={folderModal.mode === "create" ? "New Folder" : "Rename Folder"}
            />

            <ConfirmModal
                isOpen={confirmModal.open}
                onClose={() => setConfirmModal({ open: false, title: "", message: "", onConfirm: null })}
                onConfirm={confirmModal.onConfirm || (() => { })}
                title={confirmModal.title}
                message={confirmModal.message}
                confirmText="Delete"
            />

            <BillingDrawer open={showBilling} onClose={() => setShowBilling(false)} />
        </>
    );
}