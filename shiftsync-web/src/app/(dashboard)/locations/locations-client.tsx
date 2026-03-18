'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { apiClient } from '@/lib/api/client/client';
import { RoleGate } from '@/components/shared/RoleGate';
import { FullPageError } from '@/components/shared/FullPageError';
import {
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
  UserPlusIcon,
  UserMinusIcon,
  GlobeIcon,
} from 'lucide-react';

const IANA_TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
];

const locationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  address: z.string().optional(),
  ianaTimezone: z.string().min(1, 'Timezone is required'),
});

type LocationForm = z.infer<typeof locationSchema>;

interface Location {
  id: string;
  name: string;
  address?: string;
  ianaTimezone: string;
  isActive: boolean;
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

interface Manager {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface AllUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export function LocationsClient() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [detailLocation, setDetailLocation] = useState<Location | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Location | null>(null);
  const [addManagerOpen, setAddManagerOpen] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [actioning, setActioning] = useState(false);

  const { data: locations = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const { data } = await apiClient.get<Location[]>('/locations');
      return data;
    },
  });

  const { data: locationStaff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['location-staff', detailLocation?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<StaffMember[]>(`/locations/${detailLocation!.id}/staff`);
      return data;
    },
    enabled: !!detailLocation,
  });

  const { data: locationManagers = [], isLoading: managersLoading } = useQuery({
    queryKey: ['location-managers', detailLocation?.id],
    queryFn: async () => {
      const { data } = await apiClient.get<Manager[]>(`/locations/${detailLocation!.id}/managers`);
      return data;
    },
    enabled: !!detailLocation,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: async () => {
      const { data } = await apiClient.get<AllUser[]>('/users');
      return data;
    },
    enabled: addManagerOpen,
  });

  const managerUsers = allUsers.filter((u) => u.role === 'manager' || u.role === 'admin');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '', ianaTimezone: 'America/New_York' },
  });

  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: editSubmitting },
  } = useForm<LocationForm>({ resolver: zodResolver(locationSchema) });

  function openEdit(loc: Location) {
    setEditLocation(loc);
    resetEdit({ name: loc.name, address: loc.address ?? '', ianaTimezone: loc.ianaTimezone });
  }

  async function onCreate(data: LocationForm) {
    try {
      await apiClient.post('/locations', data);
      toast.success('Location created');
      setCreateOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create');
    }
  }

  async function onEdit(data: LocationForm) {
    if (!editLocation) return;
    try {
      await apiClient.patch(`/locations/${editLocation.id}`, data);
      toast.success('Location updated');
      setEditLocation(null);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update');
    }
  }

  async function onDelete() {
    if (!deleteConfirm) return;
    setActioning(true);
    try {
      await apiClient.delete(`/locations/${deleteConfirm.id}`);
      toast.success('Location deleted');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete');
    } finally {
      setActioning(false);
    }
  }

  async function onAddManager() {
    if (!detailLocation || !selectedManagerId) return;
    setActioning(true);
    try {
      await apiClient.post(`/locations/${detailLocation.id}/managers`, { managerId: selectedManagerId });
      toast.success('Manager added');
      setAddManagerOpen(false);
      setSelectedManagerId('');
      queryClient.invalidateQueries({ queryKey: ['location-managers', detailLocation.id] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to add manager');
    } finally {
      setActioning(false);
    }
  }

  async function onRemoveManager(managerId: string) {
    if (!detailLocation) return;
    setActioning(true);
    try {
      await apiClient.delete(`/locations/${detailLocation.id}/managers/${managerId}`);
      toast.success('Manager removed');
      queryClient.invalidateQueries({ queryKey: ['location-managers', detailLocation.id] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to remove manager');
    } finally {
      setActioning(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Locations</h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError) {
    return <FullPageError message="Failed to load locations." onRetry={() => refetch()} />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground">Locations</h1>
        <RoleGate role={['admin']}>
          <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-1.5 size-4" /> Add location
          </Button>
        </RoleGate>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {locations.map((loc) => (
          <Card
            key={loc.id}
            className="border-border bg-card cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setDetailLocation(loc)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base text-foreground flex items-center gap-2">
                  <MapPinIcon className="size-4 text-muted-foreground shrink-0" />
                  {loc.name}
                </CardTitle>
                <div className="flex gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <RoleGate role={['admin']}>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(loc)}>
                      <PencilIcon className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(loc)}>
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </RoleGate>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loc.address && (
                <p className="text-xs text-muted-foreground truncate">{loc.address}</p>
              )}
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <GlobeIcon className="size-3" />
                {loc.ianaTimezone}
              </div>
              <Badge variant={loc.isActive ? 'default' : 'secondary'} className="text-xs">
                {loc.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Sheet */}
      <Sheet open={!!detailLocation} onOpenChange={(open) => !open && setDetailLocation(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailLocation && (
            <div className="space-y-5 p-5 pt-6">


              <div className='px-0'>
                <SheetTitle className="flex items-center gap-2">
             
                </SheetTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
            
                </div>
                {detailLocation.address && (
                  <p className="text-sm text-muted-foreground">{detailLocation.address}</p>
                )}
              </div>

              {/* Managers section */}
              <div className="space-y-2 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Managers</h3>
                  <RoleGate role={['admin']}>
                    <Button size="sm" variant="default" className="h-7 text-xs  cursor-pointer" onClick={() => setAddManagerOpen(true)}>
                      <UserPlusIcon className="mr-1 size-3" /> Add
                    </Button>
                  </RoleGate>
                </div>
                {managersLoading ? (
                  <div className="space-y-1">{[1, 2].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <ul className="space-y-1">
                    {locationManagers.map((m) => (
                        <li key={m.id} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">{m.firstName} {m.lastName}</p>
                            <p className="text-xs text-muted-foreground">{m.email}</p>
                          </div>
                          <RoleGate role={['admin']}>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => onRemoveManager(m.id)} disabled={actioning}>
                              <UserMinusIcon className="size-3.5" />
                            </Button>
                          </RoleGate>
                        </li>
                      ))}
                    {locationManagers.length === 0 && (
                      <li className="text-sm text-muted-foreground py-2">No managers assigned</li>
                    )}
                  </ul>
                )}
              </div>

              {/* Staff section */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  <h3 className="text-sm font-semibold text-foreground">Certified Staff</h3>
                </div>
                {staffLoading ? (
                  <div className="space-y-1">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <ul className="space-y-1">
                    {locationStaff
                      .filter((s) => s.role === 'staff')
                      .map((s) => (
                        <li key={s.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-1.5">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm text-foreground">{s.firstName} {s.lastName}</p>
                            <p className="text-xs text-muted-foreground">{s.email}</p>
                          </div>
                        </li>
                      ))}
                    {locationStaff.filter((s) => s.role === 'staff').length === 0 && (
                      <li className="text-sm text-muted-foreground py-2">No certified staff</li>
                    )}
                  </ul>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add location</DialogTitle>
            <DialogDescription>Create a new Coastal Eats location.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input {...register('name')} placeholder="Coastal Eats Downtown" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Address</label>
              <Input {...register('address')} placeholder="123 Main St, New York, NY" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Timezone *</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" {...register('ianaTimezone')}>
                {IANA_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
              {errors.ianaTimezone && <p className="text-xs text-destructive">{errors.ianaTimezone.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editLocation} onOpenChange={(open) => !open && setEditLocation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit location</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Name *</label>
              <Input {...registerEdit('name')} />
              {editErrors.name && <p className="text-xs text-destructive">{editErrors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Address</label>
              <Input {...registerEdit('address')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Timezone *</label>
              <select className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground" {...registerEdit('ianaTimezone')}>
                {IANA_TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditLocation(null)}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete location?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteConfirm?.name}</strong>. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={actioning}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manager Dialog */}
      <Dialog open={addManagerOpen} onOpenChange={setAddManagerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add manager to {detailLocation?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Select manager</label>
            <select
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
            >
              <option value="">— Choose —</option>
              {managerUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email})</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddManagerOpen(false)}>Cancel</Button>
            <Button onClick={onAddManager} disabled={!selectedManagerId || actioning}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
