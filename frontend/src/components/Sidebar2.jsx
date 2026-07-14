import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  Plus,
  MessageSquare,
  LogOut,
  User,
  PenSquare,
  Menu,
  X,
  CoinsIcon,
  FolderPlus,
  Trash2,
  Pencil,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Pin,
  PinOff,
  GripVertical,
  MoreHorizontal,
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import api from "../utils/axios";
import { setUserData } from "../redux/user.slice";
import {
  getFoldersWithConversations,
  createFolder,
  renameFolder,
  deleteFolder,
  moveConversation,
  togglePinConversation,
  deleteConversation,
} from "../features/conversation.api";
import {
  setFoldersWithConversations,
  moveConversationLocal,
  togglePinConversationLocal,
  setConvTitle,
  setSelectedConversation,
  deleteConversationLocal,
} from "../redux/conversation.slice";
import { setArtifacts, setMessages } from "../redux/message.slice";
import BillingDrawer from "./Sidebar/BillingDrawer";

// ── DnD Kit imports ──
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ── Modal: Folder Name (for create & rename) ──
const FolderNameModal = ({ isOpen, onClose, onConfirm, initialValue = "", title = "New Folder" }) => {
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

// ── Modal: Confirmation ──
const ConfirmModal = ({ isOpen, onClose, onConfirm, title = "Confirm", message = "Are you sure?", confirmText = "Delete" }) => {
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

// ── Sortable Conversation Item (updated) ──
const SortableConversationItem = ({
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

  // Close dropdown when clicking outside
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

  // Helper to close menu after action
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
      {/* Drag handle */}
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

          {/* Pin button */}
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

          {/* Three‑dot menu */}
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
                {/* Rename */}
                <button
                  onClick={() => handleMenuAction(() => onRename(conv))}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/[0.05] transition-colors border-none bg-transparent cursor-pointer"
                >
                  <Pencil size={13} />
                  Rename
                </button>

                {/* Move to folder – submenu */}
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

                {/* Delete */}
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

// ── Main Sidebar Component ──
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

  const { userData } = useSelector((state) => state.user);
  const { folders, selectedConversation } = useSelector((state) => state.conversation);
  const dispatch = useDispatch();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  // ── Fetch data ──
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

  // ── Logout ──
  const logout = async () => {
    try {
      await api.get("/api/auth/logout");
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

  // ── New Chat ──
  const handleCreateConversation = () => {
    dispatch(setSelectedConversation(null));
    dispatch(setMessages([]));
    dispatch(setArtifacts([]));
    setMobileOpen(false);
  };

  // ── Select conversation ──
  const handleSelectConversation = useCallback(
    (conversation) => {
      setMobileOpen(false);
      dispatch(setSelectedConversation(conversation));
    },
    [dispatch]
  );

  // ── Folder ops ──
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

  // ── Move conversation ──
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

  // ── Toggle Pin ──
  const handleTogglePin = useCallback(
    async (conversationId, currentPinned) => {
      try {
        const updated = await togglePinConversation(conversationId);
        dispatch(togglePinConversationLocal({ conversationId, pinned: updated.pinned }));
      } catch (error) {
        console.error(error);
      }
    },
    [dispatch]
  );

  // ── Delete conversation ──
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

  // ── Toggle folder expand ──
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

  // ── Separate real folders and uncategorized ──
  const realFolders = useMemo(() => folders.filter((f) => f._id !== null), [folders]);
  const uncategorizedConvs = useMemo(() => {
    const uncat = folders.find((f) => f._id === null);
    return uncat?.conversations || [];
  }, [folders]);

  // ── Drag end handler ──
  const handleDragEnd = useCallback(
    async (event) => {
      const { active, over } = event;
      if (!over) return;

      if (typeof over.id === "string" && over.id.startsWith("folder-")) {
        const folderId = over.id.replace("folder-", "");
        const allConvs = [...uncategorizedConvs, ...realFolders.flatMap((f) => f.conversations || [])];
        const conv = allConvs.find((c) => c._id === active.id);
        if (conv && conv.folderId !== folderId) {
          await handleMoveConversation(active.id, folderId);
        }
        return;
      }

      const allConvs = [...uncategorizedConvs, ...realFolders.flatMap((f) => f.conversations || [])];
      const targetConv = allConvs.find((c) => c._id === over.id);
      const sourceConv = allConvs.find((c) => c._id === active.id);
      if (targetConv && sourceConv && targetConv.folderId !== sourceConv.folderId) {
        await handleMoveConversation(active.id, targetConv.folderId);
      }
    },
    [handleMoveConversation, uncategorizedConvs, realFolders]
  );

  const allConversationIds = useMemo(() => {
    const ids = [];
    realFolders.forEach((f) => {
      f.conversations?.forEach((c) => ids.push(c._id));
    });
    uncategorizedConvs.forEach((c) => ids.push(c._id));
    return ids;
  }, [realFolders, uncategorizedConvs]);

  // ── Render conversation item ──
  const renderConversationItem = (conv) => {
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
  };

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
            <span className="text-[16px] font-semibold text-slate-100 tracking-tight flex-1">CortexAI</span>
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <div className="flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {loading && <div className="text-slate-500 text-sm px-4 py-2">Loading conversations…</div>}
              {error && <div className="text-red-400 text-sm px-4 py-2">{error}</div>}
              {!loading && !error && folders.length === 0 && (
                <div className="text-slate-500 text-sm px-4 py-2">No conversations yet</div>
              )}

              {/* Folders */}
              {realFolders.map((folder) => {
                const isExpanded = expandedFolders[folder._id] ?? true;
                return (
                  <div key={folder._id} className="mb-1">
                    <div
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors duration-150 cursor-pointer group"
                      onClick={() => toggleFolder(folder._id)}
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
                            setFolderModal({
                              open: true,
                              mode: "rename",
                              folderId: folder._id,
                              initialName: folder.name,
                            });
                          }}
                          className="text-slate-500 hover:text-slate-200 bg-transparent border-none p-1 rounded hover:bg-white/[0.05]"
                          title="Rename"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({
                              open: true,
                              title: "Delete Folder",
                              message: `Delete "${folder.name}"? Conversations will be moved to uncategorized.`,
                              onConfirm: () => handleDeleteFolder(folder._id),
                            });
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
              })}

              {/* Uncategorized */}
              {uncategorizedConvs.length > 0 && (
                <div className="mb-1">
                  <div className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    <MessageSquare size={13} />
                    Chats
                  </div>
                  <div className="ml-1 space-y-0.5">
                    <SortableContext items={uncategorizedConvs.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                      {uncategorizedConvs.map((conv) => renderConversationItem(conv))}
                    </SortableContext>
                  </div>
                </div>
              )}
            </div>
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

// ── Helper Icon ──
const PanelIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <line x1="9" y1="3" x2="9" y2="21" />
  </svg>
);