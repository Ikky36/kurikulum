import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { 
  Bold, Italic, Underline, List, ListOrdered, Link, Image, 
  Video, AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, 
  Plus, Trash2, MoveUp, MoveDown, Type, FileVideo, ImageIcon 
} from 'lucide-react';

interface ContentBlock {
  id: string;
  type: 'text' | 'heading' | 'image' | 'video' | 'list';
  content: string;
  level?: number; // for headings (1, 2, 3)
  listType?: 'ordered' | 'unordered';
  alignment?: 'left' | 'center' | 'right';
}

interface RichContentEditorProps {
  value: string;
  onChange: (html: string) => void;
}

export function RichContentEditor({ value, onChange }: RichContentEditorProps) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    // Parse existing HTML into blocks
    if (!value) return [{ id: crypto.randomUUID(), type: 'text', content: '', alignment: 'left' }];
    
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(value, 'text/html');
      const elements = Array.from(doc.body.children);
      
      if (elements.length === 0) {
        return [{ id: crypto.randomUUID(), type: 'text', content: value, alignment: 'left' }];
      }

      return elements.map((el) => {
        const id = crypto.randomUUID();
        const tagName = el.tagName.toLowerCase();
        
        if (tagName === 'h1') return { id, type: 'heading' as const, content: el.textContent || '', level: 1 };
        if (tagName === 'h2') return { id, type: 'heading' as const, content: el.textContent || '', level: 2 };
        if (tagName === 'h3') return { id, type: 'heading' as const, content: el.textContent || '', level: 3 };
        if (tagName === 'img') return { id, type: 'image' as const, content: (el as HTMLImageElement).src };
        if (tagName === 'iframe' || tagName === 'video') {
          const src = (el as HTMLIFrameElement).src || el.querySelector('source')?.src || '';
          return { id, type: 'video' as const, content: src };
        }
        if (tagName === 'ul') return { id, type: 'list' as const, content: Array.from(el.querySelectorAll('li')).map(li => li.textContent).join('\n'), listType: 'unordered' as const };
        if (tagName === 'ol') return { id, type: 'list' as const, content: Array.from(el.querySelectorAll('li')).map(li => li.textContent).join('\n'), listType: 'ordered' as const };
        
        return { id, type: 'text' as const, content: el.innerHTML, alignment: 'left' as const };
      });
    } catch {
      return [{ id: crypto.randomUUID(), type: 'text', content: value, alignment: 'left' }];
    }
  });

  const updateBlock = (id: string, updates: Partial<ContentBlock>) => {
    const newBlocks = blocks.map(b => b.id === id ? { ...b, ...updates } : b);
    setBlocks(newBlocks);
    onChange(blocksToHtml(newBlocks));
  };

  const addBlock = (type: ContentBlock['type'], afterId?: string) => {
    const newBlock: ContentBlock = {
      id: crypto.randomUUID(),
      type,
      content: '',
      alignment: 'left',
      level: type === 'heading' ? 2 : undefined,
      listType: type === 'list' ? 'unordered' : undefined,
    };

    if (afterId) {
      const index = blocks.findIndex(b => b.id === afterId);
      const newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)];
      setBlocks(newBlocks);
      onChange(blocksToHtml(newBlocks));
    } else {
      const newBlocks = [...blocks, newBlock];
      setBlocks(newBlocks);
      onChange(blocksToHtml(newBlocks));
    }
  };

  const removeBlock = (id: string) => {
    if (blocks.length <= 1) {
      toast({ title: 'Info', description: 'Minimal harus ada 1 blok konten' });
      return;
    }
    const newBlocks = blocks.filter(b => b.id !== id);
    setBlocks(newBlocks);
    onChange(blocksToHtml(newBlocks));
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) {
      return;
    }
    
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
    onChange(blocksToHtml(newBlocks));
  };

  const blocksToHtml = (blocks: ContentBlock[]): string => {
    return blocks.map(block => {
      const style = block.alignment ? `text-align: ${block.alignment}` : '';
      
      switch (block.type) {
        case 'heading':
          const tag = `h${block.level || 2}`;
          return `<${tag} style="${style}">${block.content}</${tag}>`;
        case 'image':
          return block.content ? `<img src="${block.content}" alt="Image" style="max-width: 100%; ${style}" />` : '';
        case 'video':
          if (!block.content) return '';
          if (block.content.includes('youtube.com') || block.content.includes('youtu.be')) {
            const videoId = block.content.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/)?.[1];
            return videoId ? `<iframe src="https://www.youtube.com/embed/${videoId}" width="100%" height="400" frameborder="0" allowfullscreen></iframe>` : '';
          }
          return `<video src="${block.content}" controls style="max-width: 100%;"></video>`;
        case 'list':
          const listTag = block.listType === 'ordered' ? 'ol' : 'ul';
          const items = block.content.split('\n').filter(Boolean).map(item => `<li>${item}</li>`).join('');
          return `<${listTag} style="${style}">${items}</${listTag}>`;
        case 'text':
        default:
          return `<p style="${style}">${block.content}</p>`;
      }
    }).filter(Boolean).join('\n');
  };

  const getYoutubeEmbedUrl = (url: string): string | null => {
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <Card key={block.id} className="relative group">
          <CardContent className="py-3 pr-12">
            {/* Block Type Indicator */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                {block.type === 'text' && 'Teks'}
                {block.type === 'heading' && `Heading ${block.level}`}
                {block.type === 'image' && 'Gambar'}
                {block.type === 'video' && 'Video'}
                {block.type === 'list' && (block.listType === 'ordered' ? 'Numbered List' : 'Bullet List')}
              </span>
              
              {(block.type === 'text' || block.type === 'heading') && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant={block.alignment === 'left' ? 'secondary' : 'ghost'}
                    className="h-6 w-6"
                    onClick={() => updateBlock(block.id, { alignment: 'left' })}
                  >
                    <AlignLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant={block.alignment === 'center' ? 'secondary' : 'ghost'}
                    className="h-6 w-6"
                    onClick={() => updateBlock(block.id, { alignment: 'center' })}
                  >
                    <AlignCenter className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant={block.alignment === 'right' ? 'secondary' : 'ghost'}
                    className="h-6 w-6"
                    onClick={() => updateBlock(block.id, { alignment: 'right' })}
                  >
                    <AlignRight className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {block.type === 'heading' && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={block.level === 1 ? 'secondary' : 'ghost'}
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBlock(block.id, { level: 1 })}
                  >
                    H1
                  </Button>
                  <Button
                    size="sm"
                    variant={block.level === 2 ? 'secondary' : 'ghost'}
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBlock(block.id, { level: 2 })}
                  >
                    H2
                  </Button>
                  <Button
                    size="sm"
                    variant={block.level === 3 ? 'secondary' : 'ghost'}
                    className="h-6 px-2 text-xs"
                    onClick={() => updateBlock(block.id, { level: 3 })}
                  >
                    H3
                  </Button>
                </div>
              )}

              {block.type === 'list' && (
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant={block.listType === 'unordered' ? 'secondary' : 'ghost'}
                    className="h-6 w-6"
                    onClick={() => updateBlock(block.id, { listType: 'unordered' })}
                  >
                    <List className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant={block.listType === 'ordered' ? 'secondary' : 'ghost'}
                    className="h-6 w-6"
                    onClick={() => updateBlock(block.id, { listType: 'ordered' })}
                  >
                    <ListOrdered className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>

            {/* Block Content */}
            {(block.type === 'text') && (
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Ketik konten teks di sini... (bisa menggunakan HTML)"
                className="min-h-[100px]"
              />
            )}

            {block.type === 'heading' && (
              <Input
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Ketik judul heading..."
                className={`font-bold ${block.level === 1 ? 'text-2xl' : block.level === 2 ? 'text-xl' : 'text-lg'}`}
              />
            )}

            {block.type === 'image' && (
              <div className="space-y-2">
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder="Masukkan URL gambar..."
                />
                {block.content && (
                  <img src={block.content} alt="Preview" className="max-w-full max-h-48 rounded" />
                )}
              </div>
            )}

            {block.type === 'video' && (
              <div className="space-y-2">
                <Input
                  value={block.content}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  placeholder="Masukkan URL video (YouTube/Vimeo/direct link)..."
                />
                {block.content && getYoutubeEmbedUrl(block.content) && (
                  <div className="aspect-video max-w-md">
                    <iframe
                      src={getYoutubeEmbedUrl(block.content)!}
                      className="w-full h-full rounded"
                      allowFullScreen
                    />
                  </div>
                )}
              </div>
            )}

            {block.type === 'list' && (
              <Textarea
                value={block.content}
                onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                placeholder="Masukkan item list (satu item per baris)..."
                className="min-h-[80px]"
              />
            )}

            {/* Block Actions */}
            <div className="absolute right-2 top-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveBlock(block.id, 'up')} disabled={index === 0}>
                <MoveUp className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveBlock(block.id, 'down')} disabled={index === blocks.length - 1}>
                <MoveDown className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeBlock(block.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Add Block Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={() => addBlock('text')}>
          <Type className="h-4 w-4 mr-1" />
          Teks
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBlock('heading')}>
          <Heading2 className="h-4 w-4 mr-1" />
          Heading
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBlock('image')}>
          <ImageIcon className="h-4 w-4 mr-1" />
          Gambar
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBlock('video')}>
          <FileVideo className="h-4 w-4 mr-1" />
          Video
        </Button>
        <Button variant="outline" size="sm" onClick={() => addBlock('list')}>
          <List className="h-4 w-4 mr-1" />
          List
        </Button>
      </div>
    </div>
  );
}
