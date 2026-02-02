import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Trash2, Upload, Image, Calendar, Clock } from 'lucide-react';
import { usePopupPosters, useCreatePopupPoster, useUpdatePopupPoster, useDeletePopupPoster, isPosterVisible, PopupPoster } from '@/hooks/usePopupPosters';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const PopupPostersManager = () => {
  const { data: posters, isLoading } = usePopupPosters();
  const createPoster = useCreatePopupPoster();
  const updatePoster = useUpdatePopupPoster();
  const deletePoster = useDeletePopupPoster();

  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Max 5MB.');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `poster-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('promotion-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('promotion-images')
        .getPublicUrl(fileName);

      // Create poster record
      await createPoster.mutateAsync({
        title: title || null,
        image_url: publicUrl,
        start_date: startDate ? new Date(startDate).toISOString() : null,
        end_date: endDate ? new Date(endDate).toISOString() : null,
        is_active: true,
        sort_order: (posters?.length || 0) + 1,
      });

      // Reset form
      setTitle('');
      setStartDate('');
      setEndDate('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      console.error('Upload error:', err);
      alert('Failed to upload poster');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this poster?')) {
      await deletePoster.mutateAsync(id);
    }
  };

  const toggleActive = async (poster: PopupPoster) => {
    await updatePoster.mutateAsync({
      id: poster.id,
      is_active: !poster.is_active,
    });
  };

  const getStatusBadge = (poster: PopupPoster) => {
    if (!poster.is_active) {
      return <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Inactive</span>;
    }
    if (isPosterVisible(poster)) {
      return <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">Live</span>;
    }
    if (poster.start_date && new Date(poster.start_date) > new Date()) {
      return <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">Scheduled</span>;
    }
    return <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">Expired</span>;
  };

  if (isLoading) {
    return <div className="p-4">Loading posters...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Popup Posters</h2>
        <p className="text-sm text-muted-foreground">Manage posters that appear when visitors open the website</p>
      </div>

      {/* Add New Poster */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add New Poster
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="title">Poster Title (Optional)</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter poster title..."
              />
            </div>
            <div className="flex items-end">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading}
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? 'Uploading...' : 'Upload Poster'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start Date & Time (Optional)
              </Label>
              <Input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Date & Time (Optional)
              </Label>
              <Input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <p className="col-span-full text-xs text-muted-foreground">
              Leave blank to show poster immediately and indefinitely. Set dates to schedule when the poster should appear.
            </p>
          </div>

          <p className="text-sm text-muted-foreground">
            Recommended: Use high-quality images. Max file size: 5MB
          </p>
        </CardContent>
      </Card>

      {/* Current Posters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Image className="h-5 w-5" />
            Current Posters ({posters?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!posters || posters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Image className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>No posters uploaded yet</p>
              <p className="text-sm">Upload your first poster above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {posters.map((poster) => (
                <div key={poster.id} className="border rounded-lg overflow-hidden bg-card">
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={poster.image_url}
                      alt={poster.title || 'Popup poster'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2">
                      {getStatusBadge(poster)}
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    {poster.title && (
                      <p className="font-medium text-sm truncate">{poster.title}</p>
                    )}
                    <div className="text-xs text-muted-foreground space-y-1">
                      {poster.start_date && (
                        <p>Starts: {format(new Date(poster.start_date), 'MMM d, yyyy h:mm a')}</p>
                      )}
                      {poster.end_date && (
                        <p>Ends: {format(new Date(poster.end_date), 'MMM d, yyyy h:mm a')}</p>
                      )}
                      {!poster.start_date && !poster.end_date && (
                        <p>Always visible</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={poster.is_active}
                          onCheckedChange={() => toggleActive(poster)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {poster.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(poster.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PopupPostersManager;
