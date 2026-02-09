import { useState } from 'react';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePOSStaff, type POSStaffMember } from '@/hooks/usePOSStaff';

interface POSStaffManagerProps {
  locationId: string;
}

const ROLES = [
  { value: 'cashier', label: 'Cashier' },
  { value: 'manager', label: 'Manager' },
];

export const POSStaffManager = ({ locationId }: POSStaffManagerProps) => {
  const { staff, loading, addStaff, updateStaff, deleteStaff } = usePOSStaff(locationId);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', pin: '', role: 'cashier' });
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({ name: '', pin: '', role: 'cashier' });
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (member: POSStaffMember) => {
    // Don't pre-fill PIN — it's masked and not available client-side
    setFormData({ name: member.name, pin: '', role: member.role });
    setEditingId(member.id);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    // PIN is required for new staff, optional for edits (leave blank to keep existing)
    if (!formData.name.trim()) return;
    if (!editingId && !formData.pin.trim()) return;

    let success: boolean;
    if (editingId) {
      const updateData: { name: string; role: string; pin?: string } = {
        name: formData.name,
        role: formData.role,
      };
      if (formData.pin.trim()) {
        updateData.pin = formData.pin;
      }
      success = await updateStaff(editingId, updateData);
    } else {
      success = await addStaff(formData);
    }

    if (success) resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteStaff(id);
    setConfirmDeleteId(null);
  };

  const handleToggleActive = async (member: POSStaffMember) => {
    await updateStaff(member.id, { is_active: !member.is_active });
  };

  if (loading) {
    return <p className="text-sm" style={{ color: '#666' }}>Loading staff...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#222' }}>Staff Members</h3>
          <p className="text-sm" style={{ color: '#666' }}>Manage cashiers and managers for this location</p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)} size="sm" className="gap-1">
            <Plus className="w-4 h-4" />
            Add Staff
          </Button>
        )}
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="border rounded-lg p-4 space-y-3" style={{ backgroundColor: '#f8fafc' }}>
          <h4 className="font-medium text-sm" style={{ color: '#222' }}>
            {editingId ? 'Edit Staff' : 'New Staff Member'}
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="John Doe"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">PIN Code</Label>
              <Input
                value={formData.pin}
                onChange={(e) => {
                  // Only allow numeric input
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setFormData(prev => ({ ...prev, pin: val }));
                }}
                placeholder={editingId ? 'Leave blank to keep' : '1234'}
                maxLength={6}
                className="h-9 text-sm font-mono"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={formData.role} onValueChange={(v) => setFormData(prev => ({ ...prev, role: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
            <Button size="sm" onClick={handleSubmit} disabled={!formData.name.trim() || (!editingId && !formData.pin.trim())}>
              {editingId ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      )}

      {/* Staff List */}
      {staff.length === 0 ? (
        <div className="text-center py-8 border rounded-lg" style={{ color: '#999' }}>
          <p className="text-sm">No staff members yet. Add your first cashier or manager.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#f1f5f9' }}>
                <th className="text-left px-4 py-2 font-medium" style={{ color: '#475569' }}>Name</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: '#475569' }}>PIN</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: '#475569' }}>Role</th>
                <th className="text-left px-4 py-2 font-medium" style={{ color: '#475569' }}>Status</th>
                <th className="text-right px-4 py-2 font-medium" style={{ color: '#475569' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-t" style={{ borderColor: '#e2e8f0' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: '#222' }}>{member.name}</td>
                  <td className="px-4 py-2.5 font-mono" style={{ color: '#666' }}>••••</td>
                  <td className="px-4 py-2.5">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                      style={{
                        backgroundColor: member.role === 'manager' ? '#dbeafe' : '#f0fdf4',
                        color: member.role === 'manager' ? '#1d4ed8' : '#16a34a',
                      }}
                    >
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleToggleActive(member)}
                      className="flex items-center gap-1 text-xs"
                      style={{ color: member.is_active ? '#16a34a' : '#dc2626' }}
                    >
                      {member.is_active ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {member.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(member)}>
                        <Pencil className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                      </Button>
                      {confirmDeleteId === member.id ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="destructive" className="h-7 text-xs px-2" onClick={() => handleDelete(member.id)}>
                            Confirm
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => setConfirmDeleteId(null)}>
                            No
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setConfirmDeleteId(member.id)}>
                          <Trash2 className="w-3.5 h-3.5" style={{ color: '#ef4444' }} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
