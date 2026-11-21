import type {ComponentProps} from 'react';
// shadcn/ui new-york-v4, MIT; pinned source and deviations: docs/design/issue123/ADOPTION.md.
const variants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-white hover:bg-destructive/90',
  outline: 'border bg-background shadow-xs hover:bg-accent',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  ghost: 'hover:bg-accent',
  link: 'text-primary underline-offset-4 hover:underline',
};
export function OfficialButton({className='',variant='ghost',...props}:ComponentProps<'button'>&{variant?:keyof typeof variants}) {
  return <button data-slot="button" data-variant={variant} data-size="default" className={[
    'inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium outline-none disabled:pointer-events-none aria-invalid:border-destructive',
    variants[variant],className,
  ].join(' ')} {...props}/>;
}
