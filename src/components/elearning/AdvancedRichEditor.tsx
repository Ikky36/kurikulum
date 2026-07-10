import { useState, useRef, useCallback, useEffect } from 'react';
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
  Palette, FileVideo, ImageIcon, Quote, Code, Minus, Music,
  PilcrowLeft, PilcrowRight, Presentation
} from 'lucide-react';

// Google Fonts list
const GOOGLE_FONTS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Scheherazade New (Arabic)', value: 'Scheherazade New' },
  { name: 'Amiri (Arabic)', value: 'Amiri' },
  { name: 'Noto Naskh Arabic', value: 'Noto Naskh Arabic' },
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
  const isInternalChange = useRef(false);
  const savedSelection = useRef<Range | null>(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkText, setLinkText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [slideUrl, setSlideUrl] = useState('');
  const [tableRows, setTableRows] = useState('3');
  const [tableCols, setTableCols] = useState('3');
  const [selectedFont, setSelectedFont] = useState('inherit');
  const [selectedFontSize, setSelectedFontSize] = useState('16px');

  // Only update innerHTML when value changes externally (not from user input)
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      // Only update if content is different to avoid unnecessary DOM changes
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
    }
    isInternalChange.current = false;
  }, [value]);

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
    // Use setTimeout to ensure DOM is updated before reading innerHTML
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }, 0);
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const insertHtmlAtCursor = useCallback((html: string, savedRange?: Range | null) => {
    editorRef.current?.focus();
    const selection = window.getSelection();
    
    if (savedRange && selection) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const frag = document.createDocumentFragment();
      let node: Node | null;
      while ((node = temp.firstChild)) {
        frag.appendChild(node);
      }
      range.insertNode(frag);
      
      // Move cursor after inserted content
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Fallback: append to editor
      if (editorRef.current) {
        editorRef.current.innerHTML += html;
      }
    }
    
    // Trigger update
    setTimeout(() => {
      if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
      }
    }, 10);
  }, [onChange]);

  const insertLink = () => {
    if (!linkUrl) {
      toast({ title: 'Error', description: 'Masukkan URL link', variant: 'destructive' });
      return;
    }

    const display = linkText || linkUrl;
    const url = linkUrl.startsWith('http') || linkUrl.startsWith('mailto:') || linkUrl.startsWith('tel:') ? linkUrl : `https://${linkUrl}`;
    
    const html = `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${display}</a>`;
    
    insertHtmlAtCursor(html, savedSelection.current);
    
    setLinkUrl('');
    setLinkText('');
    savedSelection.current = null;
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
        embedHtml = `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 1rem 0; background: #f1f5f9; border-radius: 0.5rem; overflow: hidden;"><iframe src="https://www.youtube.com/embed/${videoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 0.5rem;" allowfullscreen></iframe></div><p><br></p>`;
      } else {
        toast({ title: 'Error', description: 'URL YouTube tidak valid', variant: 'destructive' });
        return;
      }
    } else if (videoUrl.includes('vimeo.com')) {
      const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      if (vimeoId) {
        embedHtml = `<div class="video-embed" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 1rem 0; background: #f1f5f9; border-radius: 0.5rem; overflow: hidden;"><iframe src="https://player.vimeo.com/video/${vimeoId}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 0.5rem;" allowfullscreen></iframe></div><p><br></p>`;
      } else {
        toast({ title: 'Error', description: 'URL Vimeo tidak valid', variant: 'destructive' });
        return;
      }
    } else {
      // Direct video file
      embedHtml = `<div class="media-container" style="margin: 1rem 0;"><video src="${videoUrl}" controls style="max-width: 100%; border-radius: 0.5rem; background: #000;"></video></div><p><br></p>`;
    }

    insertHtmlAtCursor(embedHtml);
    setVideoUrl('');
    toast({ title: 'Video ditambahkan', description: 'Video player berhasil dimasukkan' });
  };

  const insertAudio = () => {
    if (!audioUrl) {
      toast({ title: 'Error', description: 'Masukkan URL audio', variant: 'destructive' });
      return;
    }

    let embedHtml = '';
    if (audioUrl.includes('soundcloud.com')) {
      // SoundCloud embed
      embedHtml = `<div class="audio-embed" style="margin: 1rem 0; border-radius: 0.75rem; overflow: hidden;"><iframe width="100%" height="166" scrolling="no" style="border: none;" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(audioUrl)}&color=%23ff5500&auto_play=false&hide_related=false&show_comments=true&show_user=true&show_reposts=false&show_teaser=true"></iframe></div><p><br></p>`;
    } else if (audioUrl.includes('spotify.com')) {
      // Spotify embed
      const spotifyMatch = audioUrl.match(/spotify\.com\/(track|episode|playlist)\/([a-zA-Z0-9]+)/);
      if (spotifyMatch) {
        const [, type, id] = spotifyMatch;
        embedHtml = `<div class="audio-embed" style="margin: 1rem 0; border-radius: 0.75rem; overflow: hidden;"><iframe style="border-radius:12px; border: none;" src="https://open.spotify.com/embed/${type}/${id}" width="100%" height="152" allowfullscreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe></div><p><br></p>`;
      } else {
        toast({ title: 'Error', description: 'URL Spotify tidak valid', variant: 'destructive' });
        return;
      }
    } else {
      // Direct audio file
      embedHtml = `<div class="media-container" style="margin: 1rem 0;"><audio src="${audioUrl}" controls style="width: 100%; border-radius: 0.5rem;"></audio></div><p><br></p>`;
    }

    insertHtmlAtCursor(embedHtml);
    setAudioUrl('');
    toast({ title: 'Audio ditambahkan', description: 'Audio player berhasil dimasukkan' });
  };

  const insertSlide = () => {
    if (!slideUrl) {
      toast({ title: 'Error', description: 'Masukkan URL Google Slide', variant: 'destructive' });
      return;
    }

    const slideMatch = slideUrl.match(/(https:\/\/docs\.google\.com\/presentation\/d\/(?:e\/)?[a-zA-Z0-9-_]+)/);
    
    if (slideMatch) {
      const embedUrl = `${slideMatch[1]}/embed?start=false&loop=false&delayms=3000`;
      const embedHtml = `<div class="slide-embed" style="position: relative; padding-bottom: 56.25%; height: 0; margin: 1rem 0; background: #f1f5f9; border-radius: 0.5rem; overflow: hidden;"><iframe src="${embedUrl}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; border-radius: 0.5rem;" allowfullscreen="true" mozallowfullscreen="true" webkitallowfullscreen="true"></iframe></div><p><br></p>`;
      insertHtmlAtCursor(embedHtml);
      setSlideUrl('');
      toast({ title: 'Slide ditambahkan', description: 'Google Slide berhasil dimasukkan' });
    } else {
      toast({ title: 'Error', description: 'URL Google Slide tidak valid', variant: 'destructive' });
    }
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

  // Apply text direction (LTR/RTL) - only changes direction, not font
  const applyTextDirection = useCallback((direction: 'ltr' | 'rtl') => {
    if (!editorRef.current) return;
    
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      
      // Check if selection is within a block element
      let container = range.commonAncestorContainer as HTMLElement;
      if (container.nodeType === Node.TEXT_NODE) {
        container = container.parentElement as HTMLElement;
      }
      
      // Find the closest block-level parent
      const blockElements = ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE', 'PRE'];
      while (container && !blockElements.includes(container.tagName) && container !== editorRef.current) {
        container = container.parentElement as HTMLElement;
      }
      
      if (container && container !== editorRef.current) {
        container.setAttribute('dir', direction);
        container.style.direction = direction;
        container.style.textAlign = direction === 'rtl' ? 'right' : 'left';
        container.style.unicodeBidi = 'isolate';
      } else {
        // If no block element found, wrap in a div
        const div = document.createElement('div');
        div.setAttribute('dir', direction);
        div.style.direction = direction;
        div.style.textAlign = direction === 'rtl' ? 'right' : 'left';
        div.style.unicodeBidi = 'isolate';
        range.surroundContents(div);
      }
      
      handleInput();
    }
    
    // Focus and move cursor to appropriate side based on direction
    editorRef.current.focus();
    
    // Move cursor to the end (right side for RTL, left side for LTR)
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      if (direction === 'rtl') {
        // For RTL, move cursor to the end of the content (which appears on the right)
        range.selectNodeContents(editorRef.current);
        range.collapse(false); // false = collapse to end
      } else {
        // For LTR, move cursor to the start of the content (which appears on the left)
        range.selectNodeContents(editorRef.current);
        range.collapse(true); // true = collapse to start
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [handleInput]);

  // Click-to-delete for inserted media (image, video, audio, iframe embeds)
  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target || !editorRef.current) return;

    const mediaSelectors = 'img, video, audio, iframe';
    let mediaEl = target.closest(mediaSelectors) as HTMLElement | null;

    // Also allow clicking on wrapper containers
    if (!mediaEl) {
      const wrapper = target.closest('.video-embed, .audio-embed, .slide-embed, .media-container') as HTMLElement | null;
      if (wrapper) {
        mediaEl = wrapper.querySelector(mediaSelectors) as HTMLElement | null;
      }
    }

    if (!mediaEl) return;

    e.preventDefault();
    e.stopPropagation();

    const label =
      mediaEl.tagName === 'IMG' ? 'gambar' :
      mediaEl.tagName === 'VIDEO' ? 'video' :
      mediaEl.tagName === 'AUDIO' ? 'audio' : 'media ini';

    if (window.confirm(`Hapus ${label} ini?`)) {
      const wrapper = mediaEl.closest('.video-embed, .audio-embed, .slide-embed, .media-container') as HTMLElement | null;
      (wrapper ?? mediaEl).remove();
      isInternalChange.current = true;
      onChange(editorRef.current.innerHTML);
      toast({ title: 'Dihapus', description: `${label.charAt(0).toUpperCase() + label.slice(1)} berhasil dihapus` });
    }
  }, [onChange, toast]);

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

          {/* Text Direction */}
          <ToolbarButton icon={PilcrowLeft} onClick={() => applyTextDirection('ltr')} title="Teks dari Kiri (LTR)" />
          <ToolbarButton icon={PilcrowRight} onClick={() => applyTextDirection('rtl')} title="Teks dari Kanan (RTL/Arab)" />

          <Separator orientation="vertical" className="h-6" />

          <ToolbarButton icon={List} onClick={() => execCommand('insertUnorderedList')} title="Bullet List" />
          <ToolbarButton icon={ListOrdered} onClick={() => execCommand('insertOrderedList')} title="Numbered List" />
          <ToolbarButton icon={Quote} onClick={() => execCommand('formatBlock', 'blockquote')} title="Quote" />
          <ToolbarButton icon={Code} onClick={() => execCommand('formatBlock', 'pre')} title="Code Block" />
          <ToolbarButton icon={Minus} onClick={() => execCommand('insertHorizontalRule')} title="Horizontal Line" />

          <Separator orientation="vertical" className="h-6" />

          {/* Link */}
          <Popover onOpenChange={(open) => {
            if (open) {
              const sel = window.getSelection();
              if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
                savedSelection.current = sel.getRangeAt(0).cloneRange();
                setLinkText(sel.toString());
              } else {
                savedSelection.current = null;
                setLinkText('');
              }
            }
          }}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Link">
                <Link className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <div>
                  <Label>Teks Link (Opsional)</Label>
                  <Input
                    value={linkText}
                    onChange={(e) => setLinkText(e.target.value)}
                    placeholder="Teks yang ditampilkan"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>URL Link</Label>
                  <Input
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://example.com"
                    className="mt-1"
                  />
                </div>
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
                <Label>URL Video (YouTube/Vimeo/Direct)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                />
                <p className="text-xs text-muted-foreground">Mendukung YouTube, Vimeo, atau URL video langsung (.mp4, dll)</p>
                <Button size="sm" onClick={insertVideo} className="w-full">Insert Video</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Audio */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Audio">
                <Music className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label>URL Audio (SoundCloud/Spotify/Direct)</Label>
                <Input
                  value={audioUrl}
                  onChange={(e) => setAudioUrl(e.target.value)}
                  placeholder="https://soundcloud.com/... atau .mp3"
                />
                <p className="text-xs text-muted-foreground">Mendukung SoundCloud, Spotify, atau URL audio langsung (.mp3, dll)</p>
                <Button size="sm" onClick={insertAudio} className="w-full">Insert Audio</Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Google Slide */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Insert Google Slide">
                <Presentation className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-3">
                <Label>URL Google Slide</Label>
                <Input
                  value={slideUrl}
                  onChange={(e) => setSlideUrl(e.target.value)}
                  placeholder="https://docs.google.com/presentation/d/..."
                />
                <p className="text-xs text-muted-foreground">Pastikan link memiliki akses "Siapa saja yang memiliki link" (Anyone with the link)</p>
                <Button size="sm" onClick={insertSlide} className="w-full">Insert Slide</Button>
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
          suppressContentEditableWarning
          className="min-h-[300px] p-4 focus:outline-none prose prose-sm max-w-none editor-area"
          onInput={handleInput}
          onClick={handleEditorClick}
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
        .video-embed, .slide-embed {
          position: relative;
          padding-bottom: 56.25%;
          height: 0;
          margin: 1rem 0;
          background: hsl(var(--muted));
          border-radius: 0.5rem;
          overflow: hidden;
        }
        .video-embed iframe, .slide-embed iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 0.5rem;
        }
        .audio-embed {
          margin: 1rem 0;
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .audio-embed iframe {
          display: block;
        }
        .media-container {
          margin: 1rem 0;
        }
        .media-container video,
        .media-container audio {
          border-radius: 0.5rem;
          background: hsl(var(--muted));
        }
        [contenteditable] video {
          max-width: 100%;
          border-radius: 0.5rem;
        }
        [contenteditable] audio {
          width: 100%;
        }
        .editor-area iframe,
        .editor-area video,
        .editor-area audio {
          pointer-events: none;
        }
        .editor-area .video-embed,
        .editor-area .audio-embed,
        .editor-area .slide-embed,
        .editor-area .media-container,
        .editor-area img {
          cursor: pointer;
          transition: outline 0.15s ease, opacity 0.15s ease;
        }
        .editor-area img:hover,
        .editor-area video:hover,
        .editor-area audio:hover,
        .editor-area iframe:hover,
        .editor-area .video-embed:hover,
        .editor-area .audio-embed:hover,
        .editor-area .slide-embed:hover,
        .editor-area .media-container:hover {
          outline: 2px dashed hsl(var(--destructive));
          outline-offset: 2px;
          opacity: 0.92;
        }
      `}</style>
    </Card>
  );
}
