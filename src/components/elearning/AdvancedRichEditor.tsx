import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { 
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, 
  Link, Image, Video, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Heading1, Heading2, Heading3, Type, Table, Undo, Redo,
  Palette, FileVideo, ImageIcon, Quote, Code, Minus
} from 'lucide-react';

// Google Fonts list
const GOOGLE_FONTS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Inter', value: 'Inter' },
  { name: 'Roboto', value: 'Roboto' },
  { name: 'Open Sans', value: 'Open Sans' },
  { name: 'Lato', value: 'Lato' },
  { name: 'Poppins', value: 'Poppins' },
  { name: 'Montserrat', value: 'Montserrat' },
  { name: 'Playfair Display', value: 'Playfair Display' },
  { name: 'Merriweather', value: 'Merriweather' },
  { name: 'Source Code Pro', value: 'Source Code Pro' },
  { name: 'Nunito', value: 'Nunito' },
  { name: 'Raleway', value: 'Raleway' },
];

const FONT_SIZES = [
  { label: '12px', value: '12px' },
  { label: '14px', value: '14px' },
  { label: '16px', value: '16px' },
  { label: '18px', value: '18px' },
  { label: '20px', value: '20px' },
  { label: '24px', value: '24px' },
  { label: '28px', value: '28px' },
  { label: '32px', value: '32px' },
];

const COLORS = [
  '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#FFFFFF',
  '#FF0000', '#FF6600', '#FFCC00', '#00FF00', '#00CCFF', '#0000FF',
  '#9900FF', '#FF00FF', '#FF3366', '#663300', '#006633', '#003366',
];

interface AdvancedRichEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function AdvancedRichEditor({ value, onChange, placeholder }: AdvancedRichEditorProps) {
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const [selectedFont, setSelectedFont] = useState('inherit');
  const [selectedFontSize, setSelectedFontSize] = useState('16px');

  // Load Google Fonts dynamically
  const loadGoogleFont = useCallback((fontName: string) => {
    if (fontName === 'inherit') return;
    const existingLink = document.querySelector(`link[href*="${fontName.replace(' ', '+')}"]`);
    if (!existingLink) {
      const link = document.createElement('link');
      link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@400;500;600;700&display=swap`;
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
  }, []);

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  }, []);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertLink = () => {
    if (!linkUrl) {
      toast({ title: 'Error', description: 'Masukkan URL link', variant: 'destructive' });
      return;
    }
    execCommand('createLink', linkUrl);
    setLinkUrl('');
  };

  const insertImage = () => {
    if (!imageUrl) {
      toast({ title: 'Error', description: 'Masukkan URL gambar', variant: 'destructive' });
      return;
    }
    execCommand('insertImage', imageUrl);
    setImageUrl('');
  };

  const insertVideo = () => {
    if (!videoUrl) {
      toast({ title: 'Error', description: 'Masukkan URL video', variant: 'destructive' });
      return;
    }

    let embedHtml = '';
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      const videoId = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/)?.[1];
      if (videoId) {
        embedHtml = `<div class="video-embed"><iframe src="https://www.youtube.com/embed/${videoId}" width="560" height="315" frameborder="0" allowfullscreen></iframe></div>`;
      }
    } else {
      embedHtml = `<video src="${videoUrl}" controls style="max-width: 100%;"></video>`;
    }

    execCommand('insertHTML', embedHtml);
    setVideoUrl('');
  };

  const insertTable = () => {
    const rows = parseInt(tableRows) || 3;
    const cols = parseInt(tableCols) || 3;
    
    let tableHtml = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">';
    for (let i = 0; i < rows; i++) {
      tableHtml += '<tr>';
      for (let j = 0; j < cols; j++) {
        const tag = i === 0 ? 'th' : 'td';
        tableHtml += `<${tag} style="border: 1px solid #ddd; padding: 8px; text-align: left;">${i === 0 ? `Header ${j + 1}` : ''}</${tag}>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table>';
    
    execCommand('insertHTML', tableHtml);
  };

  const applyFont = (fontName: string) => {
    setSelectedFont(fontName);
    loadGoogleFont(fontName);
    execCommand('fontName', fontName);
  };

  const applyFontSize = (size: string) => {
    setSelectedFontSize(size);
    // Use CSS approach for font size
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const span = document.createElement('span');
      span.style.fontSize = size;
      range.surroundContents(span);
      handleInput();
    }
  };

  const applyColor = (color: string) => {
    execCommand('foreColor', color);
  };

  const applyBackgroundColor = (color: string) => {
    execCommand('hiliteColor', color);
  };

  const ToolbarButton = ({ icon: Icon, onClick, title, active = false }: any) => (
    <Button
      type="button"
      variant={active ? 'secondary' : 'ghost'}
      size="icon"
      className="h-8 w-8"
      onClick={onClick}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      <div className="bg-muted/50 border-b p-2 space-y-2">
        {/* Row 1: Font, Size, Colors */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedFont} onValueChange={applyFont}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOOGLE_FONTS.map(font => (
                <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedFontSize} onValueChange={applyFontSize}>
            <SelectTrigger className="w-[80px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map(size => (
                <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Separator orientation="vertical" className="h-6" />

          {/* Text Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Warna Teks">
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-6 gap-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                    onClick={() => applyColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Background Color */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Warna Latar">
                <Palette className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <div className="grid grid-cols-6 gap-1">
                {COLORS.map(color => (
                  <button
                    key={color}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: color }}
                    onClick={() => applyBackgroundColor(color)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 2: Formatting */}
        <div className="flex flex-wrap items-center gap-1">
          <ToolbarButton icon={Bold} onClick={() => execCommand('bold')} title="Bold (Ctrl+B)" />
          <ToolbarButton icon={Italic} onClick={() => execCommand('italic')} title="Italic (Ctrl+I)" />
          <ToolbarButton icon={Underline} onClick={() => execCommand('underline')} title="Underline (Ctrl+U)" />
          <ToolbarButton icon={Strikethrough} onClick={() => execCommand('strikeThrough')} title="Strikethrough" />

          <Separator orientation="vertical" className="h-6" />

          <ToolbarButton icon={Heading1} onClick={() => execCommand('formatBlock', 'h1')} title="Heading 1" />
          <ToolbarButton icon={Heading2} onClick={() => execCommand('formatBlock', 'h2')} title="Heading 2" />
          <ToolbarButton icon={Heading3} onClick={() => execCommand('formatBlock', 'h3')} title="Heading 3" />

          <Separator orientation="vertical" className="h-6" />

          <ToolbarButton icon={AlignLeft} onClick={() => execCommand('justifyLeft')} title="Align Left" />
          <ToolbarButton icon={AlignCenter} onClick={() => execCommand('justifyCenter')} title="Align Center" />
          <ToolbarButton icon={AlignRight} onClick={() => execCommand('justifyRight')} title="Align Right" />
          <ToolbarButton icon={AlignJustify} onClick={() => execCommand('justifyFull')} title="Justify" />

          <Separator orientation="vertical" className="h-6" />

          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
          <ToolbarButton icon={Quote} onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote" />
          <ToolbarButton icon={Code} onClick={() => execCommand('formatBlock', 'pre')} title="Code Block" />
          <ToolbarButton icon={Minus} onClick={() => execCommand('insertHorizontalRule')} title="Horizontal Line" />

          <Separator orientation="vertical" className="h-6" />

          {/* Link */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Link">
                <Link className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label>URL Link</Label>
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                />
                <Button size="sm" onClick={insertLink} className="w-full">Insert Link</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Image */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Image">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label>URL Gambar</Label>
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                />
                <Button size="sm" onClick={insertImage} className="w-full">Insert Image</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Video */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Video">
                <FileVideo className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label>URL Video (YouTube/Direct)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <Button size="sm" onClick={insertVideo} className="w-full">Insert Video</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Table */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Table">
                <Table className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60">
              <div className="space-y-3">
                <Label>Ukuran Tabel</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Baris</Label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={tableRows}
                      onChange={(e) => setTableRows(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Kolom</Label>
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={tableCols}
                      onChange={(e) => setTableCols(e.target.value)}
                    />
                  </div>
                </div>
                <Button size="sm" onClick={insertTable} className="w-full">Insert Table</Button>
              </div>
            </PopoverContent>
          </Popover>

          <Separator orientation="vertical" className="h-6" />

          <ToolbarButton icon={Undo} onClick={() => execCommand('undo')} title="Undo (Ctrl+Z)" />
          <ToolbarButton icon={Redo} onClick={() => execCommand('redo')} title="Redo (Ctrl+Y)" />
        </div>
      </div>

      {/* Editor Area */}
      <CardContent className="p-0">
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[300px] p-4 focus:outline-none prose prose-sm max-w-none"
          onInput={handleInput}
          dangerouslySetInnerHTML={{ __html: value }}
          style={{ fontFamily: selectedFont !== 'inherit' ? selectedFont : undefined }}
          data-placeholder={placeholder || 'Mulai menulis konten...'}
        />
      </CardContent>

      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
        [contenteditable] table {
          width: 100%;
          border-collapse: collapse;
        }
        [contenteditable] th,
        [contenteditable] td {
          border: 1px solid hsl(var(--border));
          padding: 0.5rem;
        }
        [contenteditable] blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding-left: 1rem;
          margin-left: 0;
          font-style: italic;
        }
        [contenteditable] pre {
          background: hsl(var(--muted));
          padding: 1rem;
          border-radius: 0.5rem;
          overflow-x: auto;
        }
        .video-embed {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          margin: 1rem 0;
        }
        .video-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 0.5rem;
        }
      `}</style>
    </Card>
  );
}
