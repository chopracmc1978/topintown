import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useMenuItems } from '@/hooks/useMenuItems';
import {
  useSauceGroups,
  useCreateSauceGroup,
  useUpdateSauceGroup,
  useDeleteSauceGroup,
  useCreateSauceOption,
  useUpdateSauceOption,
  useDeleteSauceOption,
  SauceGroup,
  SauceOption,
} from '@/hooks/useSauces';

export const SauceManager = () => {
  const { data: menuItems = [] } = useMenuItems();
  const { data: sauceGroups = [], isLoading } = useSauceGroups();
  
  const createGroup = useCreateSauceGroup();
  const updateGroup = useUpdateSauceGroup();
  const deleteGroup = useDeleteSauceGroup();
  const createOption = useCreateSauceOption();
  const updateOption = useUpdateSauceOption();
  const deleteOption = useDeleteSauceOption();

  // Group dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<SauceGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupMenuItemId, setGroupMenuItemId] = useState('');
  const [groupMin, setGroupMin] = useState('0');
  const [groupMax, setGroupMax] = useState('1');

  // Option dialog state
  const [optionDialogOpen, setOptionDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<SauceOption | null>(null);
  const [optionGroupId, setOptionGroupId] = useState('');
  const [optionName, setOptionName] = useState('');
  const [optionPrice, setOptionPrice] = useState('0');
  const [optionIsFree, setOptionIsFree] = useState(false);
  const [optionHasSpicy, setOptionHasSpicy] = useState(false);
  const [optionIsAvailable, setOptionIsAvailable] = useState(true);

  const pizzaItems = menuItems.filter((item) => item.category === 'pizza');

  const handleOpenGroupDialog = (group?: SauceGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupName(group.name);
      setGroupMenuItemId(group.menu_item_id);
      setGroupMin(group.min_selection.toString());
      setGroupMax(group.max_selection.toString());
    } else {
      setEditingGroup(null);
      setGroupName('Sauce');
      setGroupMenuItemId('');
      setGroupMin('0');
      setGroupMax('1');
    }
    setGroupDialogOpen(true);
  };

  const handleSaveGroup = () => {
    const data = {
      name: groupName,
      menu_item_id: groupMenuItemId,
      min_selection: parseInt(groupMin) || 0,
      max_selection: parseInt(groupMax) || 1,
      sort_order: 0,
    };

    if (editingGroup) {
      updateGroup.mutate({ id: editingGroup.id, ...data });
    } else {
      createGroup.mutate(data);
    }
    setGroupDialogOpen(false);
  };

  const handleOpenOptionDialog = (groupId: string, option?: SauceOption) => {
    setOptionGroupId(groupId);
    if (option) {
      setEditingOption(option);
      setOptionName(option.name);
      setOptionPrice(option.price.toString());
      setOptionIsFree(option.is_free);
      setOptionHasSpicy(option.has_spicy_option);
      setOptionIsAvailable(option.is_available);
    } else {
      setEditingOption(null);
      setOptionName('');
      setOptionPrice('0');
      setOptionIsFree(false);
      setOptionHasSpicy(false);
      setOptionIsAvailable(true);
    }
    setOptionDialogOpen(true);
  };

  const handleSaveOption = () => {
    const data = {
      sauce_group_id: optionGroupId,
      name: optionName,
      price: parseFloat(optionPrice) || 0,
      is_free: optionIsFree,
      has_spicy_option: optionHasSpicy,
      is_available: optionIsAvailable,
      sort_order: 0,
    };

    if (editingOption) {
      updateOption.mutate({ id: editingOption.id, ...data });
    } else {
      createOption.mutate(data);
    }
    setOptionDialogOpen(false);
  };

  const getMenuItemName = (id: string) => {
    return menuItems.find((item) => item.id === id)?.name || 'Unknown';
  };

  if (isLoading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sauce Management</h2>
        <Button onClick={() => handleOpenGroupDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sauce Group
        </Button>
      </div>

      {sauceGroups.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No sauce groups configured. Add one to get started.
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-2">
          {sauceGroups.map((group) => (
            <AccordionItem key={group.id} value={group.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">{group.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({getMenuItemName(group.menu_item_id)})
                    </span>
                    <span className="text-xs bg-muted px-2 py-1 rounded">
                      Min: {group.min_selection} | Max: {group.max_selection}
                    </span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenGroupDialog(group)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGroup.mutate(group.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pt-4 space-y-4">
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenOptionDialog(group.id)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sauce Option
                    </Button>
                  </div>

                  {group.sauce_options && group.sauce_options.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Free</TableHead>
                          <TableHead>Spicy Option</TableHead>
                          <TableHead>Available</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.sauce_options.map((option) => (
                          <TableRow key={option.id}>
                            <TableCell className="font-medium">{option.name}</TableCell>
                            <TableCell>
                              {option.is_free ? (
                                <span className="text-green-600 font-medium">Free</span>
                              ) : (
                                `$${option.price.toFixed(2)}`
                              )}
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  option.is_free
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {option.is_free ? 'Yes' : 'No'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  option.has_spicy_option
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {option.has_spicy_option ? 'Yes' : 'No'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  option.is_available
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                }`}
                              >
                                {option.is_available ? 'Available' : 'Unavailable'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenOptionDialog(group.id, option)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteOption.mutate(option.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No sauce options. Add one to get started.
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Edit Sauce Group' : 'Add Sauce Group'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Sauce"
              />
            </div>

            <div>
              <Label htmlFor="menuItem">Menu Item</Label>
              <Select value={groupMenuItemId} onValueChange={setGroupMenuItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a pizza" />
                </SelectTrigger>
                <SelectContent className="bg-background">
                  {pizzaItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minSelection">Min Selection</Label>
                <Input
                  id="minSelection"
                  type="number"
                  min="0"
                  value={groupMin}
                  onChange={(e) => setGroupMin(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="maxSelection">Max Selection</Label>
                <Input
                  id="maxSelection"
                  type="number"
                  min="1"
                  value={groupMax}
                  onChange={(e) => setGroupMax(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveGroup} disabled={!groupMenuItemId}>
                {editingGroup ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Option Dialog */}
      <Dialog open={optionDialogOpen} onOpenChange={setOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? 'Edit Sauce Option' : 'Add Sauce Option'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="optionName">Sauce Name</Label>
              <Input
                id="optionName"
                value={optionName}
                onChange={(e) => setOptionName(e.target.value)}
                placeholder="e.g., Marinara Sauce"
              />
            </div>

            <div>
              <Label htmlFor="optionPrice">Price</Label>
              <Input
                id="optionPrice"
                type="number"
                step="0.01"
                min="0"
                value={optionPrice}
                onChange={(e) => setOptionPrice(e.target.value)}
                disabled={optionIsFree}
              />
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="optionFree"
                  checked={optionIsFree}
                  onCheckedChange={(checked) => {
                    setOptionIsFree(checked);
                    if (checked) setOptionPrice('0');
                  }}
                />
                <Label htmlFor="optionFree">Free (included)</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="optionSpicy"
                  checked={optionHasSpicy}
                  onCheckedChange={setOptionHasSpicy}
                />
                <Label htmlFor="optionSpicy">Has Spicy Level Option</Label>
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  id="optionAvailable"
                  checked={optionIsAvailable}
                  onCheckedChange={setOptionIsAvailable}
                />
                <Label htmlFor="optionAvailable">Available</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setOptionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveOption} disabled={!optionName}>
                {editingOption ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
