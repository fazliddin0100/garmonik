'use client';

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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import {
  type DepartmentGroup,
  type DepartmentSubItem,
} from '@/lib/clinic-departments/types';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

function newGroupId() {
  return `dep-grp-${crypto.randomUUID().slice(0, 8)}`;
}

function newItemId(groupId: string) {
  return `${groupId}-sub-${Date.now()}`;
}

export default function EndocrineDepartmentsPanel() {
  const [groups, setGroups] = useState<DepartmentGroup[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupEditingId, setGroupEditingId] = useState<string | null>(null);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [itemContextGroupId, setItemContextGroupId] = useState<string | null>(
    null,
  );
  const [itemEditingId, setItemEditingId] = useState<string | null>(null);
  const [itemTitle, setItemTitle] = useState('');
  const [itemNote, setItemNote] = useState('');

  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [deleteItemRef, setDeleteItemRef] = useState<{
    groupId: string;
    itemId: string;
  } | null>(null);
  const skipFirstPersist = useRef(true);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next =
            await fetchClinicResource<DepartmentGroup[]>('departments');
          startTransition(() => {
            if (cancelled) return;
            setGroups(Array.isArray(next) ? next : []);
            setHydrated(true);
          });
        } catch {
          startTransition(() => {
            if (cancelled) return;
            setGroups([]);
            setHydrated(true);
          });
        }
      })();
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipFirstPersist.current) {
      skipFirstPersist.current = false;
      return;
    }
    void (async () => {
      try {
        await saveClinicResource('departments', groups);
      } catch {
        toast.error('Bo‘limlarni saqlab bo‘lmadi');
      }
    })();
  }, [groups, hydrated]);

  const deleteGroupTarget = useMemo(
    () => groups.find((g) => g.id === deleteGroupId) ?? null,
    [groups, deleteGroupId],
  );

  const deleteItemTarget = useMemo(() => {
    if (!deleteItemRef) return null;
    const gr = groups.find((g) => g.id === deleteItemRef.groupId);
    const it = gr?.items.find((i) => i.id === deleteItemRef.itemId) ?? null;
    return it ? { group: gr!, item: it } : null;
  }, [groups, deleteItemRef]);

  function openNewGroup() {
    setGroupEditingId(null);
    setGroupTitle('');
    setGroupDescription('');
    setGroupDialogOpen(true);
  }

  function openEditGroup(gr: DepartmentGroup) {
    setGroupEditingId(gr.id);
    setGroupTitle(gr.title);
    setGroupDescription(gr.description);
    setGroupDialogOpen(true);
  }

  function saveGroup() {
    const title = groupTitle.trim();
    if (!title) return;
    const description = groupDescription.trim();
    if (groupEditingId) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupEditingId ? { ...g, title, description } : g,
        ),
      );
    } else {
      setGroups((prev) => [
        ...prev,
        {
          id: newGroupId(),
          title,
          description,
          items: [],
        },
      ]);
    }
    setGroupDialogOpen(false);
    setGroupEditingId(null);
  }

  function openNewItem(groupId: string) {
    setItemContextGroupId(groupId);
    setItemEditingId(null);
    setItemTitle('');
    setItemNote('');
    setItemDialogOpen(true);
  }

  function openEditItem(groupId: string, item: DepartmentSubItem) {
    setItemContextGroupId(groupId);
    setItemEditingId(item.id);
    setItemTitle(item.title);
    setItemNote(item.note);
    setItemDialogOpen(true);
  }

  function saveItem() {
    const title = itemTitle.trim();
    if (!itemContextGroupId || !title) return;
    const note = itemNote.trim();
    if (itemEditingId) {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== itemContextGroupId) return g;
          return {
            ...g,
            items: g.items.map((it) =>
              it.id === itemEditingId ? { ...it, title, note } : it,
            ),
          };
        }),
      );
    } else {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== itemContextGroupId) return g;
          return {
            ...g,
            items: [...g.items, { id: newItemId(g.id), title, note }],
          };
        }),
      );
    }
    setItemDialogOpen(false);
    setItemEditingId(null);
    setItemContextGroupId(null);
  }

  function confirmDeleteGroup() {
    if (!deleteGroupId) return;
    setGroups((prev) => prev.filter((g) => g.id !== deleteGroupId));
    setDeleteGroupId(null);
  }

  function confirmDeleteItem() {
    if (!deleteItemRef) return;
    const { groupId, itemId } = deleteItemRef;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        return { ...g, items: g.items.filter((i) => i.id !== itemId) };
      }),
    );
    setDeleteItemRef(null);
  }

  return (
    <div className="space-y-2 mt-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openNewGroup}>
          <Plus className="size-4" />
          Yangi bo‘lim
        </Button>
      </div>

      <div className="space-y-4">
        {groups.map((gr) => (
          <article
            key={gr.id}
            className="rounded-2xl border border-white/70 bg-white/80 p-5 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <Building2 className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">
                    {gr.title}
                  </h3>
                  {gr.description ?
                    <p className="mt-1 text-sm text-slate-500">
                      {gr.description}
                    </p>
                  : null}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => openNewItem(gr.id)}>
                  <Plus className="size-3.5" />
                  Band qo‘shish
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-slate-600"
                  onClick={() => openEditGroup(gr)}>
                  <Pencil className="size-3.5" />
                  Tahrirlash
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setDeleteGroupId(gr.id)}>
                  <Trash2 className="size-3.5" />
                  O‘chirish
                </Button>
              </div>
            </div>

            {gr.items.length === 0 ?
              <p className="mt-4 text-sm text-slate-400">
                Hozircha bandlar yo‘q — «Band qo‘shish» orqali kiriting.
              </p>
            : <ul className="mt-4 space-y-2">
                {gr.items.map((it) => (
                  <li
                    key={it.id}
                    className="flex flex-col gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">
                        {it.title}
                      </p>
                      {it.note ?
                        <p className="mt-1 text-xs text-slate-500">{it.note}</p>
                      : null}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-slate-600"
                        aria-label="Bandni tahrirlash"
                        onClick={() => openEditItem(gr.id, it)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="text-red-600 hover:bg-red-50"
                        aria-label="Bandni o‘chirish"
                        onClick={() =>
                          setDeleteItemRef({ groupId: gr.id, itemId: it.id })
                        }>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            }
          </article>
        ))}
      </div>

      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {groupEditingId ? 'Bo‘limni tahrirlash' : 'Yangi bo‘lim'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="dep-title">Bo‘lim nomi</Label>
              <Input
                id="dep-title"
                value={groupTitle}
                onChange={(e) => setGroupTitle(e.target.value)}
                placeholder="Masalan: Laboratoriya"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dep-desc">Qisqa izoh (ixtiyoriy)</Label>
              <Textarea
                id="dep-desc"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Bo‘lim haqida qisqa ma’lumot"
                rows={3}
                className="resize-y"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setGroupDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={!groupTitle.trim()}
              onClick={saveGroup}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {itemEditingId ? 'Bandni tahrirlash' : 'Yangi band'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="item-title">Nomi</Label>
              <Input
                id="item-title"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="item-note">Qo‘shimcha eslatma (ixtiyoriy)</Label>
              <Textarea
                id="item-note"
                value={itemNote}
                onChange={(e) => setItemNote(e.target.value)}
                rows={3}
                className="resize-y"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemDialogOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 text-white hover:bg-violet-700"
              disabled={!itemTitle.trim()}
              onClick={saveItem}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deleteGroupId}
        onOpenChange={(o) => !o && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bo‘limni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGroupTarget ?
                `“${deleteGroupTarget.title}” va uning ${deleteGroupTarget.items.length} ta bandi o‘chiriladi. Davom etilsinmi?`
              : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDeleteGroup}>
              O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteItemRef}
        onOpenChange={(o) => !o && setDeleteItemRef(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bandni o‘chirish</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItemTarget ?
                `“${deleteItemTarget.item.title}” o‘chirilsinmi?`
              : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={confirmDeleteItem}>
              O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
