import { useState } from 'react';
import { Plus, Pencil, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNoteShortcuts } from '@/hooks/useNoteShortcuts';

interface POSNoteShortcutsSettingsProps {
  locationId: string;
}

export const POSNoteShortcutsSettings = ({ locationId }: POSNoteShortcutsSettingsProps) => {
  const { shortcuts, isLoading, addShortcut, updateShortcut, deleteShortcut } = useNoteShortcuts(locationId);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editText, setEditText] = useState('');

  // New shortcut form
  const [newKey, setNewKey] = useState('');
  const [newText, setNewText] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const handleEdit = (shortcut: { id: string; shortcut_key: string; replacement_text: string }) => {
    setEditingId(shortcut.id);
    setEditKey(shortcut.shortcut_key);
    setEditText(shortcut.replacement_text);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editKey.trim() || !editText.trim()) return;
    updateShortcut.mutate({ id: editingId, shortcut_key: editKey.trim(), replacement_text: editText.trim() });
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newKey.trim() || !newText.trim()) return;
    addShortcut.mutate({ shortcut_key: newKey.trim(), replacement_text: newText.trim() });
    setNewKey('');
    setNewText('');
    setShowAdd(false);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this shortcut?')) {
      deleteShortcut.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-sm" style={{ color: '#666' }}>Loading shortcuts...</div>;
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-1" style={{ color: '#222' }}>Note Shortcuts</h3>
        <p className="text-sm mb-4" style={{ color: '#666' }}>
          When typing in the pizza Notes field, entering a shortcut key replaces it with the text automatically.
        </p>
      </div>

      {/* Existing shortcuts */}
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div key={shortcut.id} className="flex items-center gap-2 p-3 border rounded-lg" style={{ backgroundColor: '#f9fafb' }}>
            {editingId === shortcut.id ? (
              <>
                <Input
                  value={editKey}
                  onChange={(e) => setEditKey(e.target.value)}
                  className="w-16 h-9 text-center font-mono font-bold text-sm"
                  style={{ backgroundColor: '#fff', color: '#222', borderColor: '#d1d5db' }}
                  maxLength={5}
                />
                <span style={{ color: '#999' }}>=</span>
                <Input
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 h-9 text-sm"
                  style={{ backgroundColor: '#fff', color: '#222', borderColor: '#d1d5db' }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleSaveEdit}
                  disabled={updateShortcut.isPending}
                  className="h-9 w-9 text-green-600 hover:text-green-700 hover:bg-green-50"
                >
                  <Save className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                  className="h-9 w-9 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <span className="w-16 text-center font-mono font-bold text-lg" style={{ color: '#2563eb' }}>
                  {shortcut.shortcut_key}
                </span>
                <span style={{ color: '#999' }}>=</span>
                <span className="flex-1 text-sm font-medium" style={{ color: '#222' }}>
                  {shortcut.replacement_text}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleEdit(shortcut)}
                  className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(shortcut.id)}
                  disabled={deleteShortcut.isPending}
                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </>
            )}
          </div>
        ))}

        {shortcuts.length === 0 && (
          <p className="text-center py-4 text-sm" style={{ color: '#999' }}>
            No shortcuts configured yet.
          </p>
        )}
      </div>

      {/* Add new shortcut */}
      {showAdd ? (
        <div className="flex items-center gap-2 p-3 border-2 border-dashed border-blue-300 rounded-lg" style={{ backgroundColor: '#eff6ff' }}>
          <Input
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="Key"
            className="w-16 h-9 text-center font-mono font-bold text-sm"
            style={{ backgroundColor: '#fff', color: '#222', borderColor: '#d1d5db' }}
            maxLength={5}
            autoFocus
          />
          <span style={{ color: '#999' }}>=</span>
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Replacement text"
            className="flex-1 h-9 text-sm"
            style={{ backgroundColor: '#fff', color: '#222', borderColor: '#d1d5db' }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={!newKey.trim() || !newText.trim() || addShortcut.isPending}
            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => { setShowAdd(false); setNewKey(''); setNewText(''); }}
            className="h-9 w-9 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          onClick={() => setShowAdd(true)}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Shortcut
        </Button>
      )}
    </div>
  );
};
