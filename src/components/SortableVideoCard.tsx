import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Upload, Trash2, GripVertical, Video } from 'lucide-react';

interface VideoFile {
  id: string;
  uid: string;
  name: string;
  stream_url: string;
  thumbnail_url?: string;
  size: number;
  duration: number;
  status: string;
  created_at: string;
  display_order?: number;
}

interface SortableVideoCardProps {
  video: VideoFile;
  formatFileSize: (bytes: number) => string;
  onThumbnailUpload: (file: File) => void;
  onDelete: () => void;
}

export function SortableVideoCard({ video, formatFileSize, onThumbnailUpload, onDelete }: SortableVideoCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: video.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isProcessing = video.status === 'queued' || video.status === 'inprogress' || video.status === 'processing';

  return (
    <Card 
      ref={setNodeRef} 
      style={style}
      className="overflow-hidden border border-orange-200/50 hover:shadow-lg transition-shadow"
    >
      <div className="relative">
        <div 
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing bg-black/30 backdrop-blur-sm rounded p-1 hover:bg-black/50 transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-5 h-5 text-white" />
        </div>
        
        <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-amber-100">
          {isProcessing ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange-50 to-amber-50">
              <div className="relative">
                <Video className="w-16 h-16 text-orange-400 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </div>
              <div className="text-center px-4">
                <p className="text-sm font-medium text-orange-700">Processing video...</p>
                <p className="text-xs text-orange-600 mt-1">Thumbnail will appear soon</p>
              </div>
            </div>
          ) : video.thumbnail_url ? (
            <img 
              src={video.thumbnail_url} 
              alt={video.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                // If thumbnail fails to load, show placeholder
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.parentElement?.querySelector('.thumbnail-fallback');
                if (placeholder) {
                  (placeholder as HTMLElement).style.display = 'flex';
                }
              }}
            />
          ) : null}
          
          <div 
            className="thumbnail-fallback w-full h-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-orange-100 to-amber-100"
            style={{ display: (!video.thumbnail_url || isProcessing) ? 'none' : 'flex' }}
          >
            <Video className="w-12 h-12 text-orange-400" />
            <p className="text-xs text-orange-600 px-4 text-center truncate w-full">{video.name}</p>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4 space-y-2">
        <h3 className="font-medium text-orange-800 truncate" title={video.name}>
          {video.name}
        </h3>
        <div className="flex items-center justify-between text-sm text-orange-600/70">
          <span>{formatFileSize(video.size)}</span>
          <Badge 
            variant={isProcessing ? "default" : "secondary"}
            className={isProcessing ? "bg-orange-500 animate-pulse" : ""}
          >
            {video.status}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  onThumbnailUpload(file);
                }
              };
              input.click();
            }}
          >
            <Upload className="w-4 h-4 mr-2" />
            Thumbnail
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
