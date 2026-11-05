import React, { useState, useEffect } from 'react';
import { X, Folder } from 'lucide-react';
import { costingActions, useCostingStore } from '../../store/costingStore';

interface GroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  editGroupId?: string | null;
}

export const GroupModal: React.FC<GroupModalProps> = ({
  isOpen,
  onClose,
  editGroupId = null,
}) => {
  const store = useCostingStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const editingGroup = editGroupId
    ? store.groups.find((g) => g.id === editGroupId)
    : null;

  useEffect(() => {
    if (editingGroup) {
      setName(editingGroup.name);
      setDescription(editingGroup.description || '');
    } else {
      setName('');
      setDescription('');
    }
  }, [editingGroup, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a group name.');
      return;
    }

    if (editingGroup) {
      costingActions.updateGroup(editingGroup.id, name, description);
    } else {
      costingActions.addGroup(name, description);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-sm w-full overflow-hidden border border-slate-200">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-600" />
            <h3 className="font-bold text-slate-800 text-sm">
              {editingGroup ? 'Edit Product Group' : 'Create Product Group'}
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Group Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Product Line A or Private Label"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Brand line, target market, or production category notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded shadow-sm"
            >
              {editingGroup ? 'Save Changes' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
