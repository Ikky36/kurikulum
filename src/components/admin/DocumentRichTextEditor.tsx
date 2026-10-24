import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Table as TableIcon,
  Plus,
  Database,
  Code,
  Eye,
  Eraser,
  Undo,
  Redo,
  Sparkles,
  ChevronDown,
  Search,
  Rows,
  Trash2,
  PlusCircle,
  HelpCircle,
  Type,
  EyeOff,
  Grid,
} from 'lucide-react';

export interface DatabaseVariable {
  key: string;
  label: string;
  category?: string;
  exampleValue?: string;
}

export const DOCUMENT_FONTS = [
  { label: 'Times New Roman (Standar Surat & Skripsi)', value: 'Times New Roman' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Calibri', value: 'Calibri' },
  { label: 'Cambria', value: 'Cambria' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Garamond', value: 'Garamond' },
  { label: 'Tahoma', value: 'Tahoma' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Inter (Bawaan Sistem)', value: 'Inter' },
];

interface DocumentRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  availableVariables?: DatabaseVariable[];
  placeholder?: string;
  className?: string;
  fontFamily?: string;
}

export function DocumentRichTextEditor({
  value,
  onChange,
  availableVariables = [],
  placeholder = 'Ketik isi surat di sini...',
  className = '',
  fontFamily = 'Times New Roman',
}: DocumentRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isInternalChange = useRef(false);
  const savedRangeRef = useRef<Range | null>(null);

  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [searchTerm, setSearchTerm] = useState('');
  const [isTablePopoverOpen, setIsTablePopoverOpen] = useState(false);
  const [isVarPopoverOpen, setIsVarPopoverOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState<string>(fontFamily || 'Times New Roman');

  // Custom Table configuration state
  const [customRows, setCustomRows] = useState(3);
  const [customCols, setCustomCols] = useState(3);
  const [useBorder, setUseBorder] = useState(false); // default false: most letter tables (biodata) are borderless

  // Sync external fontFamily prop changes
  useEffect(() => {
    if (fontFamily) {
      setSelectedFont(fontFamily);
    }
  }, [fontFamily]);

  // Sync external value to visual editor without resetting cursor on user typing
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  // Save selection range to restore after clicking outside or inside popovers
  const saveSelection = useCallback(() => {
    if (mode === 'visual') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      }
    }
  }, [mode]);

  const restoreSelection = useCallback(() => {
    if (mode === 'visual') {
      editorRef.current?.focus();
      const sel = window.getSelection();
      if (savedRangeRef.current && sel) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
      }
    }
  }, [mode]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  }, [onChange]);

  // Execute standard rich text command
  const execCmd = useCallback(
    (command: string, arg?: string) => {
      if (mode !== 'visual') return;
      restoreSelection();
      document.execCommand(command, false, arg);
      editorRef.current?.focus();
      saveSelection();
      setTimeout(handleInput, 10);
    },
    [mode, restoreSelection, saveSelection, handleInput]
  );

  // Apply Font Family
  const handleFontChange = (fontName: string) => {
    setSelectedFont(fontName);
    if (mode === 'visual') {
      restoreSelection();
      document.execCommand('fontName', false, fontName);
      saveSelection();
      handleInput();
    }
    toast.success(`Font diubah ke ${fontName}`);
  };

  // Insert arbitrary HTML fragment at cursor position
  const insertHtmlAtCursor = useCallback(
    (html: string) => {
      if (mode === 'code') {
        const textarea = codeTextareaRef.current;
        if (!textarea) {
          onChange((value || '') + html);
          return;
        }
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const current = value || '';
        const updated = current.substring(0, start) + html + current.substring(end);
        onChange(updated);
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + html.length, start + html.length);
        }, 50);
        return;
      }

      restoreSelection();
      const sel = window.getSelection();

      if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();

        const temp = document.createElement('div');
        temp.innerHTML = html;
        const frag = document.createDocumentFragment();
        let node: Node | null;
        let lastNode: Node | null = null;

        while ((node = temp.firstChild)) {
          lastNode = node;
          frag.appendChild(node);
        }
        range.insertNode(frag);

        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          savedRangeRef.current = range.cloneRange();
        }
      } else {
        // Fallback: append inside editor
        if (editorRef.current) {
          editorRef.current.innerHTML = (editorRef.current.innerHTML || '') + html;
        }
      }
      handleInput();
    },
    [mode, value, onChange, restoreSelection, handleInput]
  );

  // Insert database variable tag {{variable_key}}
  const insertVariable = (varKey: string) => {
    const tag = `{{${varKey}}}`;
    insertHtmlAtCursor(` ${tag} `);
    toast.success(`Variabel ${tag} disisipkan`);
    setIsVarPopoverOpen(false);
  };

  // Table presets
  const insertBiodataTable = () => {
    const tableHtml = `<table class="borderless-table" data-borderless="true" style="width: 100%; border-collapse: collapse; margin: 8px 0; border: none; font-size: inherit;">
  <tbody>
    <tr>
      <td style="width: 26%; padding: 4px 6px; vertical-align: top; border: none;">Nama Mahasiswa</td>
      <td style="width: 3%; padding: 4px 2px; vertical-align: top; text-align: center; border: none;">:</td>
      <td style="padding: 4px 6px; vertical-align: top; border: none;"><strong>{{nama_mahasiswa}}</strong></td>
    </tr>
    <tr>
      <td style="padding: 4px 6px; vertical-align: top; border: none;">NIM</td>
      <td style="padding: 4px 2px; vertical-align: top; text-align: center; border: none;">:</td>
      <td style="padding: 4px 6px; vertical-align: top; border: none;">{{nim}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 6px; vertical-align: top; border: none;">Program Studi</td>
      <td style="padding: 4px 2px; vertical-align: top; text-align: center; border: none;">:</td>
      <td style="padding: 4px 6px; vertical-align: top; border: none;">{{program_studi}}</td>
    </tr>
    <tr>
      <td style="padding: 4px 6px; vertical-align: top; border: none;">Judul Tugas Akhir</td>
      <td style="padding: 4px 2px; vertical-align: top; text-align: center; border: none;">:</td>
      <td style="padding: 4px 6px; vertical-align: top; border: none;">"{{judul_tugas_akhir}}"</td>
    </tr>
  </tbody>
</table><p><br></p>`;
    insertHtmlAtCursor(tableHtml);
    setIsTablePopoverOpen(false);
    toast.success('Tabel format biodata mahasiswa (tanpa garis) berhasil disisipkan');
  };

  const insertFormalBorderedTable = () => {
    const tableHtml = `<table style="width: 100%; border-collapse: collapse; margin: 8px 0; border: 1px solid #64748b; font-size: inherit;">
  <thead>
    <tr style="background-color: #f1f5f9;">
      <th style="border: 1px solid #64748b; padding: 6px 8px; text-align: center; width: 8%;">No</th>
      <th style="border: 1px solid #64748b; padding: 6px 8px; text-align: left;">Keterangan / Uraian</th>
      <th style="border: 1px solid #64748b; padding: 6px 8px; text-align: left;">Data / Nilai</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="border: 1px solid #64748b; padding: 6px 8px; text-align: center;">1</td>
      <td style="border: 1px solid #64748b; padding: 6px 8px;">Nama Lengkap Mahasiswa</td>
      <td style="border: 1px solid #64748b; padding: 6px 8px;">{{nama_mahasiswa}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #64748b; padding: 6px 8px; text-align: center;">2</td>
      <td style="border: 1px solid #64748b; padding: 6px 8px;">Nomor Induk Mahasiswa (NIM)</td>
      <td style="border: 1px solid #64748b; padding: 6px 8px;">{{nim}}</td>
    </tr>
    <tr>
      <td style="border: 1px solid #64748b; padding: 6px 8px; text-align: center;">3</td>
      <td style="border: 1px solid #64748b; padding: 6px 8px;">Program Studi</td>
      <td style="border: 1px solid #64748b; padding: 6px 8px;">{{program_studi}}</td>
    </tr>
  </tbody>
</table><p><br></p>`;
    insertHtmlAtCursor(tableHtml);
    setIsTablePopoverOpen(false);
    toast.success('Tabel bergaris formal berhasil disisipkan');
  };

  const insertCustomTable = () => {
    const rows = Math.max(1, Math.min(15, customRows));
    const cols = Math.max(1, Math.min(8, customCols));
    const borderStyle = useBorder ? 'border: 1px solid #64748b;' : 'border: none;';
    const cellBorder = useBorder ? 'border: 1px solid #64748b;' : 'border: none;';
    const classAttr = useBorder ? '' : 'class="borderless-table" data-borderless="true"';

    let tableHtml = `<table ${classAttr} style="width: 100%; border-collapse: collapse; margin: 8px 0; ${borderStyle} font-size: inherit;">`;
    tableHtml += `<thead style="${useBorder ? '' : 'display: none;'}"><tr style="background-color: #f8fafc;">`;
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th style="${cellBorder} padding: 6px 8px; text-align: left;">Kolom ${c + 1}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td style="${cellBorder} padding: 6px 8px;">Isi data...</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table><p><br></p>';

    insertHtmlAtCursor(tableHtml);
    setIsTablePopoverOpen(false);
    toast.success(`Tabel kustom (${rows} baris x ${cols} kolom, ${useBorder ? 'bergaris' : 'tanpa garis'}) disisipkan`);
  };

  // Toggle Table Border on active table or all tables in editor
  const handleToggleTableBorder = (showBorder: boolean) => {
    if (!editorRef.current) return;
    restoreSelection();
    const sel = window.getSelection();
    let targetTable: HTMLTableElement | null =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('table')
        : (sel?.anchorNode?.parentElement?.closest('table') as HTMLTableElement | null);

    if (!targetTable) {
      targetTable = editorRef.current.querySelector('table');
    }

    if (!targetTable) {
      toast.info('Belum ada tabel di dalam editor untuk diatur bordernya');
      return;
    }

    if (showBorder) {
      targetTable.style.border = '1px solid #64748b';
      targetTable.classList.remove('borderless-table');
      targetTable.removeAttribute('data-borderless');
      targetTable.querySelectorAll('td, th').forEach((cell) => {
        (cell as HTMLElement).style.border = '1px solid #64748b';
      });
      toast.success('Garis tabel berhasil ditampilkan (bergaris)');
    } else {
      targetTable.style.border = 'none';
      targetTable.classList.add('borderless-table');
      targetTable.setAttribute('data-borderless', 'true');
      targetTable.querySelectorAll('td, th').forEach((cell) => {
        (cell as HTMLElement).style.border = 'none';
      });
      toast.success('Garis tabel berhasil disembunyikan (tanpa garis / borderless)');
    }

    handleInput();
  };

  // Helper actions on current active table cell
  const handleAddRow = () => {
    if (!editorRef.current) return;
    restoreSelection();
    const sel = window.getSelection();
    const cell =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('td, th')
        : sel?.anchorNode?.parentElement?.closest('td, th');
    const row = cell?.closest('tr');
    if (row) {
      const newRow = row.cloneNode(true) as HTMLTableRowElement;
      Array.from(newRow.cells).forEach((c) => {
        c.innerHTML = '&nbsp;';
      });
      row.after(newRow);
      handleInput();
      toast.success('Baris baru berhasil ditambahkan');
    } else {
      toast.info('Letakkan kursor di salah satu sel tabel terlebih dahulu');
    }
  };

  const handleDeleteRow = () => {
    if (!editorRef.current) return;
    restoreSelection();
    const sel = window.getSelection();
    const cell =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('td, th')
        : sel?.anchorNode?.parentElement?.closest('td, th');
    const row = cell?.closest('tr');
    const table = row?.closest('table');
    if (row && table) {
      if (table.rows.length <= 1) {
        table.remove();
        toast.info('Tabel dihapus karena seluruh baris dihapus');
      } else {
        row.remove();
        toast.success('Baris tabel berhasil dihapus');
      }
      handleInput();
    } else {
      toast.info('Letakkan kursor di dalam baris tabel yang ingin dihapus');
    }
  };

  const handleDeleteTable = () => {
    if (!editorRef.current) return;
    restoreSelection();
    const sel = window.getSelection();
    const cell =
      sel?.anchorNode instanceof Element
        ? sel.anchorNode.closest('td, th')
        : sel?.anchorNode?.parentElement?.closest('td, th');
    const table = cell?.closest('table');
    if (table) {
      table.remove();
      handleInput();
      toast.success('Tabel berhasil dihapus');
    } else {
      toast.info('Letakkan kursor di dalam tabel yang ingin dihapus');
    }
  };

  // Filter variables by search term
  const filteredVariables = availableVariables.filter(
    (v) =>
      v.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.category && v.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className={`border rounded-lg shadow-xs bg-card overflow-hidden flex flex-col ${className}`}>
      {/* 1. TOP TOOLBAR */}
      <div className="p-1.5 bg-slate-50 border-b flex flex-wrap items-center justify-between gap-1 text-slate-700">
        <div className="flex flex-wrap items-center gap-1">
          {/* UNDO / REDO */}
          <div className="flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('undo')}
              title="Undo (Ctrl+Z)"
              disabled={mode !== 'visual'}
            >
              <Undo className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('redo')}
              title="Redo (Ctrl+Y)"
              disabled={mode !== 'visual'}
            >
              <Redo className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* FONT FAMILY SELECTOR (Times New Roman, Arial, dll) */}
          <div className="flex items-center">
            <Select
              disabled={mode !== 'visual'}
              value={selectedFont}
              onValueChange={handleFontChange}
            >
              <SelectTrigger className="h-7 w-[130px] sm:w-[150px] text-xs px-2 bg-white gap-1" title="Pilih Jenis Huruf (Font)">
                <Type className="h-3.5 w-3.5 text-primary shrink-0" />
                <SelectValue placeholder="Font" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_FONTS.map((font) => (
                  <SelectItem
                    key={font.value}
                    value={font.value}
                    className="text-xs"
                    style={{ fontFamily: font.value }}
                  >
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* PARAGRAPH / HEADING SELECT */}
          <Select
            disabled={mode !== 'visual'}
            onValueChange={(val) => {
              if (val === 'p') execCmd('formatBlock', '<p>');
              else if (val === 'h1') execCmd('formatBlock', '<h1>');
              else if (val === 'h2') execCmd('formatBlock', '<h2>');
              else if (val === 'h3') execCmd('formatBlock', '<h3>');
            }}
          >
            <SelectTrigger className="h-7 w-[95px] text-xs px-2 bg-white">
              <SelectValue placeholder="Paragraf" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="p" className="text-xs">
                Paragraf
              </SelectItem>
              <SelectItem value="h1" className="text-sm font-bold">
                Judul 1
              </SelectItem>
              <SelectItem value="h2" className="text-xs font-bold">
                Judul 2
              </SelectItem>
              <SelectItem value="h3" className="text-xs font-semibold">
                Judul 3
              </SelectItem>
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* BASIC FORMATTING */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('bold')}
              title="Tebal (Ctrl+B)"
              disabled={mode !== 'visual'}
            >
              <Bold className="h-3.5 w-3.5 font-bold" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('italic')}
              title="Miring (Ctrl+I)"
              disabled={mode !== 'visual'}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('underline')}
              title="Garis Bawah (Ctrl+U)"
              disabled={mode !== 'visual'}
            >
              <Underline className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('strikeThrough')}
              title="Coret"
              disabled={mode !== 'visual'}
            >
              <Strikethrough className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('removeFormat')}
              title="Hapus Pemformatan"
              disabled={mode !== 'visual'}
            >
              <Eraser className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* TEXT ALIGNMENT: LEFT, CENTER, RIGHT, JUSTIFY */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded border border-slate-200">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white"
              onClick={() => execCmd('justifyLeft')}
              title="Rata Kiri"
              disabled={mode !== 'visual'}
            >
              <AlignLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white"
              onClick={() => execCmd('justifyCenter')}
              title="Rata Tengah"
              disabled={mode !== 'visual'}
            >
              <AlignCenter className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white"
              onClick={() => execCmd('justifyRight')}
              title="Rata Kanan"
              disabled={mode !== 'visual'}
            >
              <AlignRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-white"
              onClick={() => execCmd('justifyFull')}
              title="Rata Kiri & Kanan (Justify)"
              disabled={mode !== 'visual'}
            >
              <AlignJustify className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* LISTS: BULLET & NUMBERING */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('insertUnorderedList')}
              title="Daftar Poin (Bullet List)"
              disabled={mode !== 'visual'}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => execCmd('insertOrderedList')}
              title="Daftar Bernomor (Numbered List)"
              disabled={mode !== 'visual'}
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* INSERT & MANAGE TABLE POPOVER */}
          <Popover open={isTablePopoverOpen} onOpenChange={setIsTablePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs gap-1.5 bg-white border-slate-300 hover:border-primary text-slate-800"
                onClick={saveSelection}
                title="Sisipkan Tabel atau Biodata"
              >
                <TableIcon className="h-3.5 w-3.5 text-primary" />
                <span>Tabel</span>
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-84 p-3" align="start">
              <div className="space-y-3">
                <div className="border-b pb-1.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <TableIcon className="h-3.5 w-3.5 text-primary" />
                      Pengaturan & Sisip Tabel
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Pilih format tabel, atur garis (border), atau tambah baris.
                    </p>
                  </div>
                </div>

                {/* TOGGLE BORDER PADA TABEL YANG ADA */}
                <div className="p-2 border rounded-md bg-amber-50/60 border-amber-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-amber-900 flex items-center gap-1">
                      <Grid className="h-3.5 w-3.5 text-amber-700" />
                      Garis Tepi Tabel (Border):
                    </span>
                  </div>
                  <p className="text-[10px] text-amber-800 leading-tight">
                    Ubah tabel yang ada agar garis kotaknya tidak terlihat (polos/biodata) atau bergaris.
                  </p>
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10.5px] bg-white text-slate-800 hover:bg-slate-100 border-slate-300 gap-1 font-medium shadow-2xs"
                      onClick={() => handleToggleTableBorder(false)}
                      title="Jadikan tabel polos tanpa garis (cocok untuk format biodata surat)"
                    >
                      <EyeOff className="h-3 w-3 text-rose-500" />
                      Tanpa Garis (Polos)
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10.5px] bg-white text-slate-800 hover:bg-slate-100 border-slate-300 gap-1 font-medium shadow-2xs"
                      onClick={() => handleToggleTableBorder(true)}
                      title="Beri garis bingkai pada semua sel tabel"
                    >
                      <Grid className="h-3 w-3 text-blue-600" />
                      Tampilkan Garis
                    </Button>
                  </div>
                </div>

                {/* PRESET 1: BIODATA FORMAT (BORDERLESS) */}
                <div className="p-2 border rounded-md bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-800">Tabel Biodata Mahasiswa (Tanpa Garis)</p>
                    <Badge variant="secondary" className="text-[9px] py-0 bg-emerald-100 text-emerald-800">
                      Rekomendasi Surat
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-600">
                    Tabel 3 kolom tanpa border: Label, titik dua (:), dan variabel nama/nim/judul.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="w-full h-6 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={insertBiodataTable}
                  >
                    <Plus className="h-3 w-3" />
                    Sisipkan Format Biodata Polos
                  </Button>
                </div>

                {/* PRESET 2: FORMAL BORDERED TABLE */}
                <div className="p-2 border rounded-md bg-slate-50 space-y-1.5">
                  <p className="text-xs font-semibold text-slate-800">Tabel Bergaris Standar (Formal)</p>
                  <p className="text-[10px] text-slate-600">
                    Tabel evaluasi atau uraian bergaris dengan header No, Keterangan, dan Data.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full h-6 text-xs gap-1 bg-white"
                    onClick={insertFormalBorderedTable}
                  >
                    <Plus className="h-3 w-3" />
                    Sisipkan Tabel Bergaris
                  </Button>
                </div>

                {/* CUSTOM TABLE ROWS & COLS */}
                <div className="pt-2 border-t space-y-2">
                  <p className="text-xs font-semibold text-slate-800">Kustom Baris & Kolom</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px]">Baris Data</Label>
                      <Input
                        type="number"
                        min={1}
                        max={15}
                        value={customRows}
                        onChange={(e) => setCustomRows(parseInt(e.target.value) || 1)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px]">Kolom</Label>
                      <Input
                        type="number"
                        min={1}
                        max={8}
                        value={customCols}
                        onChange={(e) => setCustomCols(parseInt(e.target.value) || 1)}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-slate-700 font-medium">Garis Tabel (Border):</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name="customTableBorder"
                          checked={!useBorder}
                          onChange={() => setUseBorder(false)}
                          className="h-3.5 w-3.5 text-primary"
                        />
                        <span>Tanpa Garis</span>
                      </label>
                      <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                        <input
                          type="radio"
                          name="customTableBorder"
                          checked={useBorder}
                          onChange={() => setUseBorder(true)}
                          className="h-3.5 w-3.5 text-primary"
                        />
                        <span>Bergaris</span>
                      </label>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="w-full h-6 text-xs gap-1"
                    onClick={insertCustomTable}
                  >
                    <Rows className="h-3 w-3" />
                    Sisipkan Tabel Kustom ({customRows}x{customCols})
                  </Button>
                </div>

                {/* TABLE MANAGEMENT TOOLS */}
                <div className="pt-2 border-t space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Aksi Sel / Tabel yang Sedang Aktif:
                  </p>
                  <div className="grid grid-cols-3 gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1 hover:bg-slate-100 border text-slate-700"
                      onClick={handleAddRow}
                      title="Tambah baris baru tepat di bawah sel ini"
                    >
                      <PlusCircle className="h-3 w-3 mr-1 text-emerald-600" />
                      + Baris
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1 hover:bg-slate-100 border text-slate-700"
                      onClick={handleDeleteRow}
                      title="Hapus baris tempat kursor berada"
                    >
                      <Trash2 className="h-3 w-3 mr-1 text-amber-600" />
                      - Baris
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] px-1 hover:bg-rose-50 border border-rose-200 text-rose-600"
                      onClick={handleDeleteTable}
                      title="Hapus seluruh tabel ini"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Hapus Tabel
                    </Button>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-5 mx-0.5" />

          {/* INSERT DATABASE VARIABLE POPOVER */}
          <Popover open={isVarPopoverOpen} onOpenChange={setIsVarPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="default"
                size="sm"
                className="h-7 px-2.5 text-xs gap-1.5 shadow-xs font-semibold"
                onClick={saveSelection}
                title="Sisipkan variabel database ke posisi kursor atau sel tabel"
              >
                <Database className="h-3.5 w-3.5" />
                <span>+ Variabel Database</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-3" align="start">
              <div className="space-y-2.5">
                <div className="border-b pb-1.5">
                  <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    Pilih Variabel Database
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Klik item di bawah untuk menyisipkan otomatis di posisi kursor teks atau sel tabel.
                  </p>
                </div>

                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-2 top-2 text-muted-foreground" />
                  <Input
                    placeholder="Cari variabel (misal: nim, nama, judul)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {filteredVariables.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Tidak ada variabel yang cocok.
                    </div>
                  ) : (
                    filteredVariables.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="w-full text-left p-1.5 rounded hover:bg-primary/10 transition-colors flex items-center justify-between border border-transparent hover:border-primary/20 text-xs group"
                      >
                        <div className="truncate mr-2">
                          <p className="font-medium text-slate-900 group-hover:text-primary truncate">
                            {v.label}
                          </p>
                          <p className="text-[10px] text-muted-foreground font-mono">{`{{${v.key}}}`}</p>
                        </div>
                        {v.category && (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 font-normal uppercase shrink-0">
                            {v.category}
                          </Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* RIGHT: TOGGLE VISUAL / CODE MODE */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant={mode === 'visual' ? 'secondary' : 'ghost'}
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${mode === 'visual' ? 'bg-white shadow-xs font-semibold text-primary' : 'text-slate-600'}`}
            onClick={() => {
              if (mode === 'code') {
                setMode('visual');
              }
            }}
            title="Tampilan Visual (WYSIWYG seperti Word / Google Docs)"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Visual</span>
          </Button>

          <Button
            type="button"
            variant={mode === 'code' ? 'secondary' : 'ghost'}
            size="sm"
            className={`h-7 px-2 text-xs gap-1 ${mode === 'code' ? 'bg-slate-800 text-white shadow-xs font-semibold' : 'text-slate-600'}`}
            onClick={() => {
              if (mode === 'visual') {
                setMode('code');
              }
            }}
            title="Tampilan Kode Sumber HTML"
          >
            <Code className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">HTML</span>
          </Button>
        </div>
      </div>

      {/* 2. QUICK SHORTCUT CHIPS (BARIS CEPAT SISIPKAN VARIABEL & AKSI BORDER TABEL) */}
      <div className="px-2.5 py-1.5 bg-slate-100/70 border-b flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="text-muted-foreground font-medium flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-amber-500" />
          Aksi Cepat:
        </span>

        {/* Tombol Cepat Sembunyikan Garis Tabel */}
        <button
          type="button"
          onClick={() => handleToggleTableBorder(false)}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-300 transition-colors shadow-2xs flex items-center gap-1"
          title="Hilangkan garis tepi dari tabel agar polos (borderless)"
        >
          <EyeOff className="h-3 w-3 text-amber-600" />
          Sembunyikan Garis Tabel
        </button>

        {/* Tombol Cepat Sisip Tabel Biodata */}
        <button
          type="button"
          onClick={() => {
            saveSelection();
            insertBiodataTable();
          }}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 transition-colors shadow-2xs flex items-center gap-1"
          title="Sisipkan tabel biodata mahasiswa lengkap 3 kolom tanpa garis"
        >
          <Plus className="h-3 w-3 text-emerald-600" />
          + Biodata (Tanpa Garis)
        </button>

        <span className="text-slate-300">|</span>

        {availableVariables.slice(0, 5).map((v) => (
          <button
            key={v.key}
            type="button"
            onClick={() => {
              saveSelection();
              insertVariable(v.key);
            }}
            className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white hover:bg-primary/10 hover:text-primary border border-slate-200 transition-colors shadow-2xs"
            title={v.label}
          >
            + {v.label}
          </button>
        ))}
      </div>

      {/* 3. EDITOR CONTENT AREA */}
      <div className="relative flex-1 bg-white">
        {mode === 'visual' ? (
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            onKeyUp={saveSelection}
            onMouseUp={saveSelection}
            onSelect={saveSelection}
            onBlur={saveSelection}
            style={{
              fontFamily: selectedFont && selectedFont !== 'inherit'
                ? `"${selectedFont}", Times New Roman, Times, serif`
                : undefined,
            }}
            className="document-rich-content document-rich-editor-content min-h-[170px] max-h-[460px] overflow-y-auto p-3 text-xs leading-relaxed focus:outline-none"
            data-placeholder={placeholder}
          />
        ) : (
          <Textarea
            ref={codeTextareaRef}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
            className="w-full font-mono text-xs p-3 min-h-[170px] max-h-[460px] border-0 rounded-none focus-visible:ring-0 resize-y leading-relaxed bg-slate-900 text-slate-100"
            placeholder="Kode HTML dokumen..."
          />
        )}
      </div>

      {/* 4. BOTTOM STATUS & HELPER BAR */}
      <div className="px-3 py-1.5 bg-slate-50 border-t flex flex-wrap items-center justify-between text-[10px] text-muted-foreground gap-2">
        <span className="flex items-center gap-1.5">
          <HelpCircle className="h-3 w-3 text-primary/70 shrink-0" />
          <span>
            {mode === 'visual' ? (
              <>
                Font: <strong className="text-slate-800">{selectedFont}</strong>. Klik <em>"Sembunyikan Garis Tabel"</em> jika ingin tabel biodata tanpa border.
              </>
            ) : (
              <>Mode kode HTML aktif. Anda dapat mengedit tag HTML atau menyisipkan variabel langsung.</>
            )}
          </span>
        </span>
        <span className="font-mono text-[9px] bg-white border px-1.5 py-0.5 rounded text-slate-600">
          {mode === 'visual' ? 'Mode WYSIWYG Visual' : 'Mode HTML Source'}
        </span>
      </div>
    </div>
  );
}
