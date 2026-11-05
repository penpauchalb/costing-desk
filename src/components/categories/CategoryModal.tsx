import React, { useState } from 'react';
import { X, Tag, Plus, Edit2, Trash2, Check } from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCategory?: (categoryName: string) => void;
}

const PRESET_COLORS = [
  '#0284c7', // Sky Blue
  '#0d9488', // Teal
  '#10b981', // Emerald Green
  '#f59e0b', // Amber
  '#ea580c', // Orange
  '#ef4444', // Red
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#6366f1', // Indigo
  '#64748b', // Slate
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSelectCategory,
}) => {
  const store = useCostingStore();

  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(PRESET_COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const cat = costingActions.addCategory(newCatName.trim(), newCatColor);
    setNewCatName('');
    if (onSelectCategory) {
      onSelectCategory(cat.name);
    }
  };

  const handleStartEdit = (catId: string, currentName: string, currentColor?: string) => {
    setEditingId(catId);
    setEditName(currentName);
    setEditColor(currentColor || PRESET_COLORS[0]);
  };

  const handleSaveEdit = (catId: string) => {
    if (!editName.trim()) return;
    costingActions.updateCategory(catId, {
      name: editName.trim(),
      color: editColor,
    });
    setEditingId(null);
  };

  const handleDelete = (catId: string, catName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the category "${catName}"? Existing items with this category will retain their label.`
      )
    ) {
      costingActions.deleteCategory(catId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-sky-600" />
            <h3 className="font-bold text-slate-800 text-sm">Manage Product & Material Categories</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Add Category Form */}
          <form onSubmit={handleAdd} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
              Add New Category
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Category name (e.g. Skin Care, Frozen Food)"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 bg-white border border-slate-200 rounded px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="submit"
                disabled={!newCatName.trim()}
                className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            {/* Color picker pills */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500 font-medium mr-1">Color:</span>
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setNewCatColor(c)}
                  className={`w-4 h-4 rounded-full border transition-transform ${
                    newCatColor === c ? 'scale-125 border-slate-900 shadow-xs ring-1 ring-slate-900' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </form>

          {/* Categories List */}
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Current Categories ({store.categories.length})
            </div>
            {store.categories.map((cat) => {
              const isEditing = editingId === cat.id;

              if (isEditing) {
                return (
                  <div
                    key={cat.id}
                    className="flex flex-col gap-2 p-2.5 bg-sky-50 border border-sky-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(cat.id)}
                        className="px-2.5 py-1 bg-sky-600 text-white text-xs rounded font-medium flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500">Badge Color:</span>
                      {PRESET_COLORS.map((c) => (
                        <button
                          type="button"
                          key={c}
                          onClick={() => setEditColor(c)}
                          className={`w-3.5 h-3.5 rounded-full border transition-transform ${
                            editColor === c ? 'scale-125 border-slate-900 ring-1 ring-slate-900' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={cat.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cat.color || '#0284c7' }}
                    />
                    <span className="text-xs font-semibold text-slate-800">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {onSelectCategory && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCategory(cat.name);
                          onClose();
                        }}
                        className="px-2 py-0.5 text-[11px] text-sky-600 hover:bg-sky-50 rounded font-medium"
                      >
                        Select
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(cat.id, cat.name, cat.color)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded"
                      title="Rename / Edit Color"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded text-xs font-semibold transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
