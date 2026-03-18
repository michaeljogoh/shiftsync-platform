"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/lib/api/client/client";
import type { ShiftSummary } from "@/lib/api/server/shifts";
import type { SkillSummary } from "@/lib/api/server/skills";
import { PermissionGate } from "@/components/shared/PermissionGate";
import { Trash2Icon, EyeOffIcon } from "lucide-react";

interface ShiftEditForm {
  title: string;
  startAt: string;
  endAt: string;
  headcountNeeded: number;
  requiredSkillId: string;
  editCutoffHours: number;
}

interface ShiftEditModalProps {
  shift: ShiftSummary | null;
  skills: SkillSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  afterMutation?: () => void;
}

function toLocalDateTimeInput(iso: string, tz: string): string {
  try {
    const date = new Date(iso);
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
  } catch {
    return iso.slice(0, 16);
  }
}

export function ShiftEditModal({
  shift,
  skills,
  open,
  onOpenChange,
  afterMutation,
}: ShiftEditModalProps) {
  const [actioning, setActioning] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [unpublishConfirm, setUnpublishConfirm] = useState(false);

  const { data: fetchedSkills = [] } = useQuery({
    queryKey: ["skills"],
    queryFn: async () => {
      const { data } = await apiClient.get<SkillSummary[]>("/skills");
      return data;
    },
    enabled: open && skills.length === 0,
  });
  const resolvedSkills = skills.length > 0 ? skills : fetchedSkills;

  const tz = shift?.location?.ianaTimezone ?? "UTC";

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ShiftEditForm>();

  useEffect(() => {
    if (shift && open) {
      reset({
        title: shift.title ?? "",
        startAt: toLocalDateTimeInput(shift.startAt, tz),
        endAt: toLocalDateTimeInput(shift.endAt, tz),
        headcountNeeded: shift.headcountNeeded,
        requiredSkillId: shift.requiredSkillId ?? "",
        editCutoffHours: shift.editCutoffHours ?? 48,
      });
    }
  }, [shift, open, reset, tz]);

  async function onSave(data: ShiftEditForm) {
    if (!shift) return;
    try {
      await apiClient.patch(`/shifts/${shift.id}`, {
        title: data.title || null,
        startAt: data.startAt,
        endAt: data.endAt,
        headcountNeeded: Number(data.headcountNeeded),
        requiredSkillId: data.requiredSkillId || null,
        editCutoffHours: Number(data.editCutoffHours),
      });
      toast.success("Shift updated");
      onOpenChange(false);
      afterMutation?.();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to update shift",
      );
    }
  }

  async function onDelete() {
    if (!shift) return;
    setActioning(true);
    try {
      await apiClient.delete(`/shifts/${shift.id}`);
      toast.success("Shift deleted");
      setDeleteConfirm(false);
      onOpenChange(false);
      afterMutation?.();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to delete shift",
      );
    } finally {
      setActioning(false);
    }
  }

  async function onUnpublish() {
    if (!shift) return;
    setActioning(true);
    try {
      await apiClient.patch(`/shifts/${shift.id}/unpublish`, {});
      toast.success("Shift moved back to draft");
      setUnpublishConfirm(false);
      onOpenChange(false);
      afterMutation?.();
    } catch (e: unknown) {
      toast.error(
        (e as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to unpublish shift",
      );
    } finally {
      setActioning(false);
    }
  }

  if (!shift) return null;

  return (
    <>
      <Dialog
        open={open && !deleteConfirm && !unpublishConfirm}
        onOpenChange={onOpenChange}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Edit shift
              <Badge
                variant={shift.status === "published" ? "default" : "secondary"}
              >
                {shift.status}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {shift.location?.name} · Times are interpreted in{" "}
              <strong>{tz}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input
                {...register("title")}
                placeholder="e.g. Morning service"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Start *</label>
                <Input
                  type="datetime-local"
                  {...register("startAt", { required: true })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">End *</label>
                <Input
                  type="datetime-local"
                  {...register("endAt", { required: true })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Headcount</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  {...register("headcountNeeded")}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Edit cutoff (hrs)</label>
                <Input
                  type="number"
                  min={0}
                  max={168}
                  {...register("editCutoffHours")}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Required skill</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm"
                {...register("requiredSkillId")}
              >
                <option value="">— No specific skill —</option>
                {resolvedSkills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                <PermissionGate require="shifts:delete">
                  {shift.status === "draft" && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirm(true)}
                      className="gap-1"
                    >
                      <Trash2Icon className="size-3.5" /> Delete
                    </Button>
                  )}
                </PermissionGate>
                <PermissionGate require="shifts:publish">
                  {shift.status === "published" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setUnpublishConfirm(true)}
                      className="gap-1"
                    >
                      <EyeOffIcon className="size-3.5" /> Unpublish
                    </Button>
                  )}
                </PermissionGate>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  Save changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete shift?</DialogTitle>
            <DialogDescription>
              Permanently delete <strong>{shift.title ?? "this shift"}</strong>.
              Only draft shifts can be deleted. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={actioning}
            >
              Delete shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unpublish confirm */}
      <Dialog open={unpublishConfirm} onOpenChange={setUnpublishConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unpublish shift?</DialogTitle>
            <DialogDescription>
              Move <strong>{shift.title ?? "this shift"}</strong> back to draft.
              Pending swap requests for assignments will be cancelled. Staff
              will be notified.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUnpublishConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={onUnpublish}
              disabled={actioning}
            >
              Unpublish
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
