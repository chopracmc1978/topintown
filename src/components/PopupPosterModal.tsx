import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useActivePopupPosters } from '@/hooks/usePopupPosters';

const PopupPosterModal = () => {
  const { data: posters, isLoading } = useActivePopupPosters();
  const [isOpen, setIsOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show popup when posters are available
  useEffect(() => {
    if (!isLoading && posters && posters.length > 0) {
      setIsOpen(true);
      setCurrentIndex(0);
    }
  }, [isLoading, posters]);

  const handleClose = () => {
    setIsOpen(false);
  };

  const goNext = () => {
    if (posters && currentIndex < posters.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!posters || posters.length === 0) {
    return null;
  }

  const currentPoster = posters[currentIndex];
  const hasMultiple = posters.length > 1;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-3xl w-full p-0 bg-transparent border-0 shadow-none overflow-hidden">
        <div className="relative">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full h-10 w-10"
          >
            <X className="h-5 w-5" />
          </Button>

          {/* Left Arrow */}
          {hasMultiple && currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Right Arrow */}
          {hasMultiple && currentIndex < posters.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white rounded-full h-12 w-12"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Poster Image */}
          <div className="relative rounded-lg overflow-hidden">
            <img
              src={currentPoster.image_url}
              alt={currentPoster.title || 'Promotional poster'}
              className="w-full h-auto max-h-[85vh] object-contain bg-black/80"
              onClick={handleClose}
            />
          </div>

          {/* Dots Indicator */}
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {posters.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentIndex
                      ? 'bg-white scale-110'
                      : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupPosterModal;
