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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
import { Textarea } from '@/components/ui/textarea';
import {
  fetchClinicResource,
  saveClinicResource,
} from '@/lib/clinic-data/client';
import {
  DEPARTMENT_ROLE_SECTIONS,
  departmentRoleLabel,
  departmentRolesForSection,
  normalizeDepartmentGroups,
} from '@/lib/clinic-departments/roles';
import {
  type DepartmentGroup,
  type DepartmentSubItem,
} from '@/lib/clinic-departments/types';
import { cn } from '@/lib/utils';
import { Building2, ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  Fragment,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

const ACTION_BTN_BASE =
  'size-8 shrink-0 rounded-lg border shadow-sm transition-all duration-150';

const ACTION_ADD_CLASS = cn(
  ACTION_BTN_BASE,
  'border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800',
);

const ACTION_EDIT_CLASS = cn(
  ACTION_BTN_BASE,
  'border-violet-200/80 bg-violet-50 text-violet-700 hover:border-violet-300 hover:bg-violet-100 hover:text-violet-800',
);

const ACTION_DELETE_CLASS = cn(
  ACTION_BTN_BASE,
  'border-rose-200/80 bg-rose-50 text-rose-600 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-700',
);

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
  const [groupRoleKey, setGroupRoleKey] = useState('');

  const roleSections = useMemo(
    () =>
      DEPARTMENT_ROLE_SECTIONS.map((section) => ({
        ...section,
        roles: departmentRolesForSection(section.id),
      })).filter((s) => s.roles.length > 0),
    [],
  );

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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const skipFirstPersist = useRef(true);

  function toggleExpanded(groupId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        try {
          const next = await fetchClinicResource<unknown>('departments');
          startTransition(() => {
            if (cancelled) return;
            setGroups(normalizeDepartmentGroups(next));
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
    setGroupRoleKey('');
    setGroupDialogOpen(true);
  }

  function openEditGroup(gr: DepartmentGroup) {
    setGroupEditingId(gr.id);
    setGroupTitle(gr.title);
    setGroupDescription(gr.description);
    setGroupRoleKey(gr.roleKey || '');
    setGroupDialogOpen(true);
  }

  function saveGroup() {
    const title = groupTitle.trim();
    if (!title) return;
    if (!groupRoleKey.trim()) {
      toast.error('Bo‘lim uchun rol tanlang');
      return;
    }
    const description = groupDescription.trim();
    const roleKey = groupRoleKey.trim();
    if (groupEditingId) {
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupEditingId ?
            { ...g, title, description, roleKey }
          : g,
        ),
      );
    } else {
      setGroups((prev) => [
        ...prev,
        {
          id: newGroupId(),
          title,
          description,
          roleKey,
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
    <div className="mt-3 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Building2 className="size-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {hydrated ? `${groups.length} ta bo‘lim` : 'Yuklanmoqda…'}
            </p>
            <p className="text-xs text-slate-500">
              Bo‘limlar, rollar va ichki bandlar
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          className="shrink-0 gap-1.5 bg-violet-600 text-white hover:bg-violet-700"
          onClick={openNewGroup}>
          <Plus className="size-4" />
          Yangi bo‘lim
        </Button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-lg backdrop-blur">
        <div className="max-h-[calc(100dvh-16rem)] overflow-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-white/95 shadow-sm backdrop-blur-md supports-backdrop-filter:bg-white/90">
              <TableRow className="border-slate-200/80 hover:bg-transparent">
                <TableHead className="w-12 text-xs font-semibold text-slate-600">
                  #
                </TableHead>
                <TableHead className="min-w-[200px] text-xs font-semibold text-slate-600">
                  Bo‘lim
                </TableHead>
                <TableHead className="min-w-[160px] text-xs font-semibold text-slate-600">
                  Rol
                </TableHead>
                <TableHead className="min-w-[220px] text-xs font-semibold text-slate-600">
                  Izoh
                </TableHead>
                <TableHead className="w-28 text-xs font-semibold text-slate-600">
                  Bandlar
                </TableHead>
                <TableHead className="text-right text-xs font-semibold text-slate-600">
                  Amallar
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!hydrated ?
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-500">
                    Bo‘limlar yuklanmoqda…
                  </TableCell>
                </TableRow>
              : groups.length === 0 ?
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-12 text-center text-sm text-slate-500">
                    Hozircha bo‘lim yo‘q — «Yangi bo‘lim» orqali qo‘shing.
                  </TableCell>
                </TableRow>
              : groups.map((gr, index) => {
                  const expanded = expandedIds.has(gr.id);
                  return (
                    <Fragment key={gr.id}>
                      <TableRow
                        className="border-slate-100 text-sm text-slate-700 transition-colors hover:bg-violet-50/40">
                        <TableCell className="font-medium text-slate-400">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700">
                              <Building2 className="size-3.5" />
                            </span>
                            <span className="font-semibold text-slate-800">
                              {gr.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex max-w-[220px] truncate rounded-full px-2.5 py-1 text-xs font-medium',
                              gr.roleKey ?
                                'bg-violet-100 text-violet-800'
                              : 'bg-amber-100 text-amber-800',
                            )}>
                            {departmentRoleLabel(gr.roleKey || null)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px] whitespace-normal text-xs text-slate-500">
                          {gr.description || (
                            <span className="text-slate-300">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => toggleExpanded(gr.id)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:bg-violet-100 hover:text-violet-800"
                            aria-expanded={expanded}
                            aria-label={
                              expanded ?
                                'Bandlarni yopish'
                              : 'Bandlarni ochish'
                            }>
                            {gr.items.length}
                            <ChevronDown
                              className={cn(
                                'size-3.5 transition-transform duration-200',
                                expanded && 'rotate-180',
                              )}
                            />
                          </button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50/80 p-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={ACTION_ADD_CLASS}
                              onClick={() => openNewItem(gr.id)}
                              aria-label="Band qo‘shish"
                              title="Band qo‘shish">
                              <Plus className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={ACTION_EDIT_CLASS}
                              onClick={() => openEditGroup(gr)}
                              aria-label="Bo‘limni tahrirlash"
                              title="Tahrirlash">
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className={ACTION_DELETE_CLASS}
                              onClick={() => setDeleteGroupId(gr.id)}
                              aria-label="Bo‘limni o‘chirish"
                              title="O‘chirish">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      {expanded ?
                        <TableRow className="border-slate-100 bg-slate-50/70 hover:bg-slate-50/70">
                          <TableCell colSpan={6} className="p-0">
                            <div className="border-t border-violet-100/80 px-4 py-3 sm:px-6">
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Ichki bandlar
                                </p>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 gap-1 text-xs"
                                  onClick={() => openNewItem(gr.id)}>
                                  <Plus className="size-3" />
                                  Band qo‘shish
                                </Button>
                              </div>
                              {gr.items.length === 0 ?
                                <p className="rounded-xl border border-dashed border-slate-200 bg-white/80 px-4 py-6 text-center text-sm text-slate-400">
                                  Hozircha bandlar yo‘q — «Band qo‘shish»
                                  orqali kiriting.
                                </p>
                              : <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="border-b border-slate-100">
                                        <th className="h-9 w-10 px-2 text-left text-[11px] font-semibold text-slate-500">
                                          #
                                        </th>
                                        <th className="h-9 px-2 text-left text-[11px] font-semibold text-slate-500">
                                          Nomi
                                        </th>
                                        <th className="h-9 px-2 text-left text-[11px] font-semibold text-slate-500">
                                          Eslatma
                                        </th>
                                        <th className="h-9 px-2 text-right text-[11px] font-semibold text-slate-500">
                                          Amallar
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {gr.items.map((it, itemIndex) => (
                                        <tr
                                          key={it.id}
                                          className="border-b border-slate-100 last:border-0 hover:bg-violet-50/30">
                                          <td className="p-2 text-xs text-slate-400">
                                            {itemIndex + 1}
                                          </td>
                                          <td className="p-2 font-medium text-slate-800">
                                            {it.title}
                                          </td>
                                          <td className="max-w-[320px] whitespace-normal p-2 text-xs text-slate-500">
                                            {it.note || (
                                              <span className="text-slate-300">
                                                —
                                              </span>
                                            )}
                                          </td>
                                          <td className="p-2 text-right">
                                            <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/70 bg-slate-50/80 p-1">
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                className={ACTION_EDIT_CLASS}
                                                aria-label="Bandni tahrirlash"
                                                title="Tahrirlash"
                                                onClick={() =>
                                                  openEditItem(gr.id, it)
                                                }>
                                                <Pencil className="size-3.5" />
                                              </Button>
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                className={ACTION_DELETE_CLASS}
                                                aria-label="Bandni o‘chirish"
                                                title="O‘chirish"
                                                onClick={() =>
                                                  setDeleteItemRef({
                                                    groupId: gr.id,
                                                    itemId: it.id,
                                                  })
                                                }>
                                                <Trash2 className="size-3.5" />
                                              </Button>
                                            </div>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              }
                            </div>
                          </TableCell>
                        </TableRow>
                      : null}
                    </Fragment>
                  );
                })
              }
            </TableBody>
          </Table>
        </div>
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
              <Label>Bo‘lim roli</Label>
              <Select value={groupRoleKey} onValueChange={setGroupRoleKey}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Rol tanlang" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {roleSections.map((section) => (
                    <SelectGroup key={section.id}>
                      <SelectLabel>{section.label}</SelectLabel>
                      {section.roles.map((role) => (
                        <SelectItem key={role.key} value={role.key}>
                          {role.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Shu bo‘limdagi xodimlar faqat shu rol kabinetiga kira oladi.
              </p>
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
              disabled={!groupTitle.trim() || !groupRoleKey.trim()}
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
