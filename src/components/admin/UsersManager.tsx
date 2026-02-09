import { useState } from 'react';
import { useUsers, useAddRole, useRemoveRole, useUpdateProfile, UserWithRole } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { User, Shield, ShieldCheck, ShieldAlert, Pencil, Plus, Trash2, Loader2, UserPlus, Lock } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const roleConfig: Record<AppRole, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  admin: { label: 'Admin', icon: <ShieldAlert className="w-3 h-3" />, variant: 'destructive' },
  staff: { label: 'Staff', icon: <ShieldCheck className="w-3 h-3" />, variant: 'default' },
  user: { label: 'User', icon: <Shield className="w-3 h-3" />, variant: 'secondary' },
};

const UsersManager = () => {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error, refetch } = useUsers();
  const addRole = useAddRole();
  const removeRole = useRemoveRole();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [addRoleDialogOpen, setAddRoleDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole | ''>('');
  
  // Create user dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newRole, setNewRole] = useState<AppRole>('user');
  const [newLocationId, setNewLocationId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [newPinCalgary, setNewPinCalgary] = useState('');
  const [newPinChestermere, setNewPinChestermere] = useState('');

  // Delete user state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserWithRole | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit user state
  const [isUpdating, setIsUpdating] = useState(false);
  const [editPinCalgary, setEditPinCalgary] = useState('');
  const [editPinChestermere, setEditPinChestermere] = useState('');

  const handleEditUser = (user: UserWithRole) => {
    setEditingUser(user);
    setEditName(user.full_name || '');
    setEditUsername(user.username || '');
    setEditPinCalgary(user.settings_pins?.calgary || '');
    setEditPinChestermere(user.settings_pins?.chestermere || '');
  };

  const handleSaveProfile = async () => {
    if (!editingUser) return;

    // Build per-location pins object
    const settingsPins: Record<string, string> = {};
    if (editPinCalgary) settingsPins.calgary = editPinCalgary;
    if (editPinChestermere) settingsPins.chestermere = editPinChestermere;

    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'update',
          targetUserId: editingUser.user_id,
          fullName: editName,
          username: editUsername,
          settingsPins: Object.keys(settingsPins).length > 0 ? settingsPins : null,
        },
      });

      if (response.error) {
        // Try to extract the actual error from the response body
        const ctx = response.error?.context;
        let msg = response.error.message;
        try {
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'Profile updated successfully' });
      setEditingUser(null);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error updating profile', description: err.message, variant: 'destructive' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddRole = async () => {
    if (!selectedUserId || !selectedRole) return;

    try {
      await addRole.mutateAsync({ userId: selectedUserId, role: selectedRole });
      toast({ title: 'Role added successfully' });
      setAddRoleDialogOpen(false);
      setSelectedUserId(null);
      setSelectedRole('');
    } catch (err: any) {
      toast({ title: 'Error adding role', description: err.message, variant: 'destructive' });
    }
  };

  const handleRemoveRole = async (userId: string, role: AppRole) => {
    // Prevent removing your own admin role to avoid lockout
    if (userId === currentUser?.id && role === 'admin') {
      toast({ title: 'Cannot remove your own admin role', description: 'You would be locked out. Ask another admin to do this.', variant: 'destructive' });
      return;
    }

    try {
      await removeRole.mutateAsync({ userId, role });
      toast({ title: 'Role removed successfully' });
    } catch (err: any) {
      toast({ title: 'Error removing role', description: err.message, variant: 'destructive' });
    }
  };

  const openAddRoleDialog = (userId: string) => {
    setSelectedUserId(userId);
    setAddRoleDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!newUsername || !newEmail || !newPassword) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }

    // Build per-location pins object
    const settingsPins: Record<string, string> = {};
    if (newPinCalgary) settingsPins.calgary = newPinCalgary;
    if (newPinChestermere) settingsPins.chestermere = newPinChestermere;

    setIsCreating(true);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'create',
          username: newUsername,
          email: newEmail,
          password: newPassword,
          fullName: newFullName,
          role: newRole,
          locationId: newLocationId || null,
          settingsPins: Object.keys(settingsPins).length > 0 ? settingsPins : null,
        },
      });

      if (response.error) {
        const ctx = response.error?.context;
        let msg = response.error.message;
        try {
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'User created successfully' });
      setCreateDialogOpen(false);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewFullName('');
      setNewRole('user');
      setNewLocationId('');
      setNewPinCalgary('');
      setNewPinChestermere('');
      refetch();
    } catch (err: any) {
      toast({ title: 'Error creating user', description: err.message, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('manage-users', {
        body: {
          action: 'delete',
          targetUserId: userToDelete.user_id,
        },
      });

      if (response.error) {
        const ctx = response.error?.context;
        let msg = response.error.message;
        try {
          if (ctx && typeof ctx.json === 'function') {
            const body = await ctx.json();
            if (body?.error) msg = body.error;
          }
        } catch {}
        throw new Error(msg);
      }
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: 'User deleted successfully' });
      setDeleteDialogOpen(false);
      setUserToDelete(null);
      refetch();
    } catch (err: any) {
      toast({ title: 'Error deleting user', description: err.message, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  const getAvailableRoles = (currentRoles: AppRole[]): AppRole[] => {
    const allRoles: AppRole[] = ['admin', 'staff', 'user'];
    return allRoles.filter((role) => !currentRoles.includes(role));
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Error loading users: {(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            User Management
          </CardTitle>
          <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          {users?.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No users found</p>
              <Button onClick={() => setCreateDialogOpen(true)} variant="outline">
                Add your first user
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.full_name || 'User'}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium">
                          {user.full_name || 'No name set'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.username || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.length === 0 ? (
                          <span className="text-muted-foreground text-sm">No roles</span>
                        ) : (
                          user.roles.map((role) => {
                            const isSelfAdmin = user.user_id === currentUser?.id && role === 'admin';
                            return (
                              <Badge
                                key={role}
                                variant={roleConfig[role].variant}
                                className={`gap-1 ${isSelfAdmin ? 'cursor-default' : 'cursor-pointer hover:opacity-80'}`}
                                onClick={() => !isSelfAdmin && handleRemoveRole(user.user_id, role)}
                              >
                                {roleConfig[role].icon}
                                {roleConfig[role].label}
                                {!isSelfAdmin && <Trash2 className="w-3 h-3 ml-1" />}
                              </Badge>
                            );
                          })
                        )}
                        {getAvailableRoles(user.roles).length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => openAddRoleDialog(user.user_id)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setUserToDelete(user);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newUsername">Username *</Label>
              <Input
                id="newUsername"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="johndoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newEmail">Email *</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Password *</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newFullName">Full Name</Label>
              <Input
                id="newFullName"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newRole">Role</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newLocation">Store Location (for POS)</Label>
              <Select value={newLocationId} onValueChange={setNewLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calgary">Calgary</SelectItem>
                  <SelectItem value="chestermere">Chestermere (Kinniburgh)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Assign a store for POS staff login
              </p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Settings PIN (per location)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="newPinCalgary" className="text-xs text-muted-foreground">Calgary</Label>
                  <Input
                    id="newPinCalgary"
                    type="password"
                    value={newPinCalgary}
                    onChange={(e) => setNewPinCalgary(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="PIN (optional)"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPinChestermere" className="text-xs text-muted-foreground">Chestermere</Label>
                  <Input
                    id="newPinChestermere"
                    type="password"
                    value={newPinChestermere}
                    onChange={(e) => setNewPinChestermere(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="PIN (optional)"
                    maxLength={8}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Each location can have its own PIN to protect POS Settings access
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={editingUser?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Enter username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Lock className="w-3 h-3" />
                Settings PIN (per location)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="editPinCalgary" className="text-xs text-muted-foreground">Calgary</Label>
                  <Input
                    id="editPinCalgary"
                    type="password"
                    value={editPinCalgary}
                    onChange={(e) => setEditPinCalgary(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="PIN (leave empty to remove)"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="editPinChestermere" className="text-xs text-muted-foreground">Chestermere</Label>
                  <Input
                    id="editPinChestermere"
                    type="password"
                    value={editPinChestermere}
                    onChange={(e) => setEditPinChestermere(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    placeholder="PIN (leave empty to remove)"
                    maxLength={8}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Each location has its own PIN. Leave empty to remove.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={isUpdating}>
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Role Dialog */}
      <Dialog open={addRoleDialogOpen} onOpenChange={setAddRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Select a role to add to this user
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {selectedUserId &&
                  users &&
                  getAvailableRoles(
                    users.find((u) => u.user_id === selectedUserId)?.roles || []
                  ).map((role) => (
                    <SelectItem key={role} value={role}>
                      <div className="flex items-center gap-2">
                        {roleConfig[role].icon}
                        {roleConfig[role].label}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRoleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRole} disabled={!selectedRole || addRole.isPending}>
              {addRole.isPending ? 'Adding...' : 'Add Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {userToDelete?.full_name || userToDelete?.email}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UsersManager;
