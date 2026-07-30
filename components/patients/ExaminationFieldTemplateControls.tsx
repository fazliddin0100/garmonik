'use client';

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import {
  deleteExaminationFieldTemplate,
  getExaminationFieldTemplates,
  saveExaminationFieldTemplate,
  updateExaminationFieldTemplate,
  type ExaminationFieldTemplate,
} from '@/lib/patients/examination-field-templates';
import type { PrimaryExamTextFieldKey } from '@/lib/patients/primary-examination';
import { BookmarkPlus, ChevronDown, Pencil, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

type ExaminationFieldTemplateControlsProps = {
  fieldKey: PrimaryExamTextFieldKey;
  fieldLabel: string;
  value: string;
  onApply: (nextValue: string) => void;
  disabled?: boolean;
};

export default function ExaminationFieldTemplateControls({
  fieldKey,
  fieldLabel,
  value,
  onApply,
  disabled = false,
}: ExaminationFieldTemplateControlsProps) {
  const [templates, setTemplates] = useState<ExaminationFieldTemplate[]>(() =>
    getExaminationFieldTemplates(fieldKey),
  );
  const [saveOpen, setSaveOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ExaminationFieldTemplate | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [bodyDraft, setBodyDraft] = useState('');
  const [popoverOpen, setPopoverOpen] = useState(false);

  const hasValue = value.trim().length > 0;
  const sortedTemplates = useMemo(
    () => [...templates].sort((a, b) => a.title.localeCompare(b.title, 'uz')),
    [templates],
  );

  function refreshTemplates() {
    setTemplates(getExaminationFieldTemplates(fieldKey));
  }

  function openSaveDialog() {
    if (!hasValue) {
      toast.error('Avval maydonni to\'ldiring');
      return;
    }
    setTitleDraft(value.trim().slice(0, 60));
    setBodyDraft(value.trim());
    setSaveOpen(true);
  }

  function openEditDialog(template: ExaminationFieldTemplate) {
    setEditTarget(template);
    setTitleDraft(template.title);
    setBodyDraft(template.body);
    setEditOpen(true);
    setPopoverOpen(false);
  }

  function handleSaveNew() {
    if (!bodyDraft.trim()) {
      toast.error('Shablon matni bo\'sh bo\'lmasligi kerak');
      return;
    }
    saveExaminationFieldTemplate({
      fieldKey,
      title: titleDraft,
      body: bodyDraft,
    });
    refreshTemplates();
    setSaveOpen(false);
    toast.success('Shablon saqlandi');
  }

  function handleUpdateTemplate() {
    if (!editTarget || !bodyDraft.trim()) return;
    updateExaminationFieldTemplate(editTarget.id, {
      title: titleDraft,
      body: bodyDraft,
    });
    refreshTemplates();
    setEditOpen(false);
    setEditTarget(null);
    toast.success('Shablon yangilandi');
  }

  function handleDeleteTemplate(id: string) {
    deleteExaminationFieldTemplate(id);
    refreshTemplates();
    toast.success('Shablon o\'chirildi');
  }

  function applyTemplate(template: ExaminationFieldTemplate, mode: 'replace' | 'append') {
    const next =
      mode === 'append' && value.trim() ?
        `${value.trim()}\n\n${template.body}`
      : template.body;
    onApply(next);
    setPopoverOpen(false);
    toast.success('Shablon qo\'llandi');
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 rounded-lg text-xs"
              disabled={disabled || sortedTemplates.length === 0}>
              Shablon
              <ChevronDown className="ml-1 size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="start">
            <p className="px-2 py-1 text-xs font-medium text-slate-500">{fieldLabel}</p>
            <ul className="max-h-56 space-y-1 overflow-y-auto">
              {sortedTemplates.map((template) => (
                <li
                  key={template.id}
                  className="rounded-lg border border-slate-100 bg-slate-50/80 p-2">
                  <p className="text-sm font-medium text-slate-900">{template.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-600">{template.body}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="h-7 rounded-md px-2 text-xs"
                      onClick={() => applyTemplate(template, 'replace')}>
                      Qo&apos;llash
                    </Button>
                    {value.trim() ?
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 rounded-md px-2 text-xs"
                        onClick={() => applyTemplate(template, 'append')}>
                        Qo&apos;shish
                      </Button>
                    : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md px-2 text-xs"
                      onClick={() => openEditDialog(template)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-md px-2 text-xs text-rose-600 hover:text-rose-700"
                      onClick={() => handleDeleteTemplate(template.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-lg text-xs"
          disabled={disabled || !hasValue}
          onClick={openSaveDialog}>
          <BookmarkPlus className="mr-1 size-3.5" />
          Shablon saqlash
        </Button>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Yangi shablon saqlash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`template-title-${fieldKey}`}>Shablon nomi</Label>
              <Input
                id={`template-title-${fieldKey}`}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`template-body-${fieldKey}`}>Matn</Label>
              <Textarea
                id={`template-body-${fieldKey}`}
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                rows={6}
                className="rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Bekor qilish
            </Button>
            <Button type="button" className="bg-violet-600 hover:bg-violet-700" onClick={handleSaveNew}>
              Saqlash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Shablonni tahrirlash</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor={`template-edit-title-${fieldKey}`}>Shablon nomi</Label>
              <Input
                id={`template-edit-title-${fieldKey}`}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`template-edit-body-${fieldKey}`}>Matn</Label>
              <Textarea
                id={`template-edit-body-${fieldKey}`}
                value={bodyDraft}
                onChange={(e) => setBodyDraft(e.target.value)}
                rows={6}
                className="rounded-xl text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
              Bekor qilish
            </Button>
            <Button
              type="button"
              className="bg-violet-600 hover:bg-violet-700"
              onClick={handleUpdateTemplate}>
              Yangilash
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
