import { useState } from 'react';
import { useContactMessages, useMarkMessageRead, useDeleteMessage } from '@/hooks/useContactMessages';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Mail, MailOpen, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const MessagesManager = () => {
  const { data: messages, isLoading } = useContactMessages();
  const markRead = useMarkMessageRead();
  const deleteMsg = useDeleteMessage();
  const [viewMessage, setViewMessage] = useState<typeof messages extends (infer T)[] ? T : never | null>(null);

  const unreadCount = messages?.filter((m) => !m.is_read).length ?? 0;

  const handleView = (msg: NonNullable<typeof messages>[0]) => {
    setViewMessage(msg);
    if (!msg.is_read) {
      markRead.mutate({ id: msg.id, is_read: true });
    }
  };

  const handleDelete = (id: string) => {
    deleteMsg.mutate(id, {
      onSuccess: () => {
        toast.success('Message deleted');
        if (viewMessage?.id === id) setViewMessage(null);
      },
      onError: () => toast.error('Failed to delete message'),
    });
  };

  const handleToggleRead = (msg: NonNullable<typeof messages>[0]) => {
    markRead.mutate(
      { id: msg.id, is_read: !msg.is_read },
      {
        onSuccess: () => toast.success(msg.is_read ? 'Marked as unread' : 'Marked as read'),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold text-foreground">Messages</h2>
          <p className="text-sm text-muted-foreground">
            {messages?.length ?? 0} total &middot; {unreadCount} unread
          </p>
        </div>
      </div>

      {!messages?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Messages from the Contact Us page will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                msg.is_read ? 'bg-card border-border' : 'bg-primary/5 border-primary/20'
              }`}
              onClick={() => handleView(msg)}
            >
              {/* Read indicator */}
              <div className="flex-shrink-0">
                {msg.is_read ? (
                  <MailOpen className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <Mail className="w-5 h-5 text-primary" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-sm font-semibold truncate ${msg.is_read ? 'text-foreground' : 'text-primary'}`}>
                    {msg.name}
                  </span>
                  {!msg.is_read && (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0">New</Badge>
                  )}
                </div>
                <p className={`text-sm truncate ${msg.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                  {msg.subject}
                </p>
                <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
              </div>

              {/* Meta */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), 'MMM d, yyyy')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(msg.created_at), 'h:mm a')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleRead(msg)}
                  title={msg.is_read ? 'Mark unread' : 'Mark read'}
                >
                  {msg.is_read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent style={{ zIndex: 10001 }}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete message?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the message from {msg.name}. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(msg.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Message Dialog */}
      <Dialog open={!!viewMessage} onOpenChange={(open) => !open && setViewMessage(null)}>
        <DialogContent className="max-w-lg" style={{ zIndex: 10001 }}>
          <DialogHeader>
            <DialogTitle className="font-serif text-xl">{viewMessage?.subject}</DialogTitle>
          </DialogHeader>
          {viewMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">From</p>
                  <p className="font-medium text-foreground">{viewMessage.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Email</p>
                  <a href={`mailto:${viewMessage.email}`} className="font-medium text-primary hover:underline">
                    {viewMessage.email}
                  </a>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs">Date</p>
                  <p className="font-medium text-foreground">
                    {format(new Date(viewMessage.created_at), 'MMMM d, yyyy h:mm a')}
                  </p>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {viewMessage.message}
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <a href={`mailto:${viewMessage.email}?subject=Re: ${encodeURIComponent(viewMessage.subject)}`}>
                  <Button variant="outline" size="sm">Reply via Email</Button>
                </a>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent style={{ zIndex: 10002 }}>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete message?</AlertDialogTitle>
                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(viewMessage.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MessagesManager;
