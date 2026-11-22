import type {ComponentProps} from 'react';

// shadcn/ui new-york-v4, MIT. See docs/design/form-entry-points.md.
export function Field(props: ComponentProps<'div'>) {
  return <div role="group" data-slot="field" data-orientation="vertical"
    className="group/field flex w-full flex-col gap-2 data-[invalid=true]:text-destructive" {...props}/>;
}

export function FieldLabel(props: ComponentProps<'label'>) {
  return <label data-slot="field-label" className="flex w-fit gap-2 font-medium leading-snug" {...props}/>;
}

export function FieldDescription(props: ComponentProps<'p'>) {
  return <p data-slot="field-description" className="text-sm leading-normal font-normal text-muted-foreground" {...props}/>;
}

export function FieldError(props: ComponentProps<'div'>) {
  return <div role="alert" data-slot="field-error" className="text-sm font-normal text-destructive" {...props}/>;
}
