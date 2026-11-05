import React, { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  Folder,
  FolderOpen,
  Boxes,
  Layers,
  History,
  Sliders,
  FileBarChart,
  Settings,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  ChevronLeft,
  Edit2,
  Trash2,
  PlusCircle,
} from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';

interface SidebarProps {
  onOpenNewProduct: (groupId?: string | null) => void;
  onOpenNewGroup: () => void;
  onEditGroup: (groupId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onOpenNewProduct,
  onOpenNewGroup,
  onEditGroup,
}) => {
  const store = useCostingStore();
  const [activeMenuGroupId, setActiveMenuGroupId] = useState<string | null>(null);

  const ungroupedProducts = store.products.filter((p) => p.groupId === null);

  const handleDeleteGroup = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    if (window.confirm('Delete this group? Any products inside will become Ungrouped.')) {
      costingActions.deleteGroup(groupId);
      setActiveMenuGroupId(null);
    }
  };

  const handleEditGroupClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation();
    setActiveMenuGroupId(null);
    onEditGroup(groupId);
  };

  return (
    <aside
      className={`h-screen bg-slate-50 border-r border-slate-200 flex flex-col transition-all duration-200 select-none ${
        store.sidebarCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* App Branding */}
      <div className="h-14 border-b border-slate-200 px-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-sm shadow-sm">
            CD
          </div>
          {!store.sidebarCollapsed && (
            <div className="truncate">
              <h1 className="font-bold text-xs tracking-wider text-slate-800 uppercase">
                COSTING DESK
              </h1>
              <p className="text-[10px] text-slate-400 truncate">HPP & Production Costing</p>
            </div>
          )}
        </div>

        {/* Sidebar Collapse Toggle */}
        <button
          onClick={() => costingActions.setSidebarCollapsed(!store.sidebarCollapsed)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors"
          title={store.sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {store.sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Quick Action Buttons */}
      {!store.sidebarCollapsed && (
        <div className="p-2 border-b border-slate-200 grid grid-cols-2 gap-1.5 bg-white/50">
          <button
            onClick={() => onOpenNewProduct(null)}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Product</span>
          </button>
          <button
            onClick={onOpenNewGroup}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Group</span>
          </button>
        </div>
      )}

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 text-xs">
        {/* Dashboard */}
        <button
          onClick={() => costingActions.setView('dashboard')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'dashboard'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Dashboard"
        >
          <LayoutDashboard className="w-4 h-4 text-slate-500" />
          {!store.sidebarCollapsed && <span>Dashboard</span>}
        </button>

        {/* All Products */}
        <button
          onClick={() => costingActions.setView('all-products')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'all-products'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="All Products"
        >
          <div className="flex items-center gap-2.5">
            <Package className="w-4 h-4 text-slate-500" />
            {!store.sidebarCollapsed && <span>All Products</span>}
          </div>
          {!store.sidebarCollapsed && (
            <span className="text-[11px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full font-mono">
              {store.products.length}
            </span>
          )}
        </button>

        {/* Divider & GROUPS Section Header */}
        {!store.sidebarCollapsed && (
          <div className="pt-3 pb-1 px-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <span>Product Groups</span>
            <button
              onClick={onOpenNewGroup}
              className="text-slate-400 hover:text-sky-600"
              title="Add Group"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Custom Groups Tree */}
        {store.groups.map((group) => {
          const isExpanded = !!store.expandedGroupIds[group.id];
          const isSelected =
            store.activeView === 'group-detail' && store.selectedGroupId === group.id;
          const groupProducts = store.products.filter((p) => p.groupId === group.id);

          return (
            <div key={group.id} className="relative">
              <div
                onClick={() => costingActions.openGroup(group.id)}
                className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-sky-100/70 text-sky-900 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                  {!store.sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        costingActions.toggleGroupExpand(group.id);
                      }}
                      className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                  {isExpanded ? (
                    <FolderOpen className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  )}
                  {!store.sidebarCollapsed && (
                    <span className="truncate text-xs">{group.name}</span>
                  )}
                </div>

                {!store.sidebarCollapsed && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 bg-slate-200/50 px-1.5 py-0.2 rounded font-mono">
                      {groupProducts.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuGroupId(
                          activeMenuGroupId === group.id ? null : group.id
                        );
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                      title="Group options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Group Context Menu */}
              {activeMenuGroupId === group.id && (
                <div
                  className="absolute right-2 top-8 z-30 bg-white border border-slate-200 rounded shadow-md py-1 w-36 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNewProduct(group.id);
                      setActiveMenuGroupId(null);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
                    <span>Add Product</span>
                  </button>
                  <button
                    onClick={(e) => handleEditGroupClick(e, group.id)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Rename Group</span>
                  </button>
                  <button
                    onClick={(e) => handleDeleteGroup(e, group.id)}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Group</span>
                  </button>
                </div>
              )}

              {/* Sub-items: Products inside this group */}
              {!store.sidebarCollapsed && isExpanded && (
                <div className="pl-6 pr-1 space-y-0.5 mt-0.5 border-l border-slate-200 ml-3">
                  {groupProducts.map((p) => {
                    const isProdActive =
                      store.activeView === 'product-workspace' &&
                      store.selectedProductId === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() => costingActions.openProduct(p.id)}
                        className={`w-full text-left px-2 py-1 rounded truncate text-xs transition-colors flex items-center gap-1.5 ${
                          isProdActive
                            ? 'bg-sky-50 text-sky-800 font-medium'
                            : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                        title={p.name}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    );
                  })}
                  {groupProducts.length === 0 && (
                    <div className="text-[10px] text-slate-400 italic px-2 py-1">
                      No products yet
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Ungrouped Products Section */}
        <button
          onClick={() => costingActions.setView('ungrouped')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'ungrouped'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Ungrouped Products"
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-slate-500" />
            {!store.sidebarCollapsed && <span>Ungrouped Products</span>}
          </div>
          {!store.sidebarCollapsed && (
            <span className="text-[11px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full font-mono">
              {ungroupedProducts.length}
            </span>
          )}
        </button>

        {/* Master Materials */}
        <button
          onClick={() => costingActions.setView('materials')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'materials'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Master Materials"
        >
          <div className="flex items-center gap-2.5">
            <Boxes className="w-4 h-4 text-slate-500" />
            {!store.sidebarCollapsed && <span>Master Materials</span>}
          </div>
          {!store.sidebarCollapsed && (
            <span className="text-[11px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full font-mono">
              {store.materials.length}
            </span>
          )}
        </button>

        {/* Production Batches */}
        <button
          onClick={() => costingActions.setView('batches')}
          className={`w-full flex items-center justify-between px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'batches'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Production Batches"
        >
          <div className="flex items-center gap-2.5">
            <History className="w-4 h-4 text-slate-500" />
            {!store.sidebarCollapsed && <span>Production Batches</span>}
          </div>
          {!store.sidebarCollapsed && (
            <span className="text-[11px] text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded-full font-mono">
              {store.batches.length}
            </span>
          )}
        </button>

        {/* Scenario Calculator */}
        <button
          onClick={() => costingActions.setView('scenarios')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'scenarios'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Scenario Calculator"
        >
          <Sliders className="w-4 h-4 text-slate-500" />
          {!store.sidebarCollapsed && <span>Scenario Calculator</span>}
        </button>

        {/* Reports & Exports */}
        <button
          onClick={() => costingActions.setView('reports')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded font-medium transition-colors ${
            store.activeView === 'reports'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Reports & Exports"
        >
          <FileBarChart className="w-4 h-4 text-slate-500" />
          {!store.sidebarCollapsed && <span>Reports & Exports</span>}
        </button>
      </div>

      {/* Footer Settings */}
      <div className="p-2 border-t border-slate-200 bg-white/40">
        <button
          onClick={() => costingActions.setView('settings')}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded text-xs font-medium transition-colors ${
            store.activeView === 'settings'
              ? 'bg-sky-100/70 text-sky-800'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
          title="Settings"
        >
          <Settings className="w-4 h-4 text-slate-500" />
          {!store.sidebarCollapsed && <span>Settings & Sync</span>}
        </button>
      </div>
    </aside>
  );
};
