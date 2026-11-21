import type {ComponentProps} from 'react';
// shadcn/ui new-york-v4 content adaptation, MIT; presentation.js retains modal ownership.
export function AlertDialogHeader(props:ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-header" className="grid gap-1.5 text-left" {...props}/>;
}
export function AlertDialogTitle(props:ComponentProps<'h2'>) {
  return <h2 data-slot="alert-dialog-title" className="text-lg font-semibold" {...props}/>;
}
export function AlertDialogDescription(props:ComponentProps<'p'>) {
  return <p data-slot="alert-dialog-description" className="text-sm text-muted-foreground" {...props}/>;
}
export function AlertDialogFooter({className='',...props}:ComponentProps<'div'>) {
  return <div data-slot="alert-dialog-footer" className={`flex flex-wrap gap-2 sm:justify-end ${className}`} {...props}/>;
}
