'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api/client/client';
import { RoleGate } from '@/components/shared/RoleGate';
import { FullPageError } from '@/components/shared/FullPageError';
import { PaginationControls, usePagination } from '@/components/shared/PaginationControls';
import { PencilIcon, PlusIcon, Trash2Icon, WrenchIcon } from 'lucide-react';

interface Skill {
  id: string;
  name: string;
  description?: string;
}

interface SkillForm {
  name: string;
  description?: string;
}

export function SkillsClient() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Skill | null>(null);
  const [actioning, setActioning] = useState(false);
  const [skillsPage, setSkillsPage] = useState(1);

  const SKILLS_PAGE_SIZE = 12;

  const { data: skills = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => {
      const { data } = await apiClient.get<Skill[]>('/skills');
      return data;
    },
  });

  const { totalPages: skillsTotalPages, paginate: paginateSkills } = usePagination(skills, SKILLS_PAGE_SIZE);
  const pagedSkills = paginateSkills(skillsPage);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SkillForm>();
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { isSubmitting: editSubmitting } } = useForm<SkillForm>();

  function openEdit(skill: Skill) {
    setEditSkill(skill);
    resetEdit({ name: skill.name, description: skill.description ?? '' });
  }

  async function onCreate(data: SkillForm) {
    try {
      await apiClient.post('/skills', data);
      toast.success('Skill created');
      setCreateOpen(false);
      reset();
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to create');
    }
  }

  async function onEdit(data: SkillForm) {
    if (!editSkill) return;
    try {
      await apiClient.patch(`/skills/${editSkill.id}`, data);
      toast.success('Skill updated');
      setEditSkill(null);
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to update');
    }
  }

  async function onDelete() {
    if (!deleteConfirm) return;
    setActioning(true);
    try {
      await apiClient.delete(`/skills/${deleteConfirm.id}`);
      toast.success('Skill deleted');
      setDeleteConfirm(null);
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    } catch (e: unknown) {
      toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Failed to delete');
    } finally {
      setActioning(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Skills</h1>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (isError) return <FullPageError message="Failed to load skills." onRetry={() => refetch()} />;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <WrenchIcon className="size-5" /> Skills
        </h1>
        <RoleGate role={['admin']}>
          <Button size="sm" className="min-h-[44px] sm:min-h-0" onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-1.5 size-4" /> Add skill
          </Button>
        </RoleGate>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pagedSkills.map((skill) => (
          <div key={skill.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
            <div>
              <Badge variant="secondary" className="mb-1">{skill.name}</Badge>
              {skill.description && (
                <p className="text-xs text-muted-foreground">{skill.description}</p>
              )}
            </div>
            <RoleGate role={['admin']}>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEdit(skill)}>
                  <PencilIcon className="size-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteConfirm(skill)}>
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
            </RoleGate>
          </div>
        ))}
        {skills.length === 0 && (
          <div className="col-span-full py-12 text-center text-sm text-muted-foreground">No skills defined yet.</div>
        )}
      </div>
      <PaginationControls currentPage={skillsPage} totalPages={skillsTotalPages} onPageChange={setSkillsPage} />

      {/* Create */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add skill</DialogTitle>
            <DialogDescription>Create a new skill that can be assigned to staff.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Skill name *</label>
              <Input {...register('name', { required: true })} placeholder="e.g. bartender" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input {...register('description')} placeholder="Brief description" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editSkill} onOpenChange={(open) => !open && setEditSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit skill</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit(onEdit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Skill name *</label>
              <Input {...regEdit('name', { required: true })} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Input {...regEdit('description')} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSkill(null)}>Cancel</Button>
              <Button type="submit" disabled={editSubmitting}>Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete skill?</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteConfirm?.name}</strong>. Staff with this skill will lose it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="destructive" onClick={onDelete} disabled={actioning}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
