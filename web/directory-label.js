let renderDirectory = null;
// Installed once by the document shell; other consumers keep this stable adapter.
export function bindDirectoryLabel(render) { renderDirectory = render; return () => { if (renderDirectory === render) renderDirectory = null; }; }
export function directoryLabel(root) { return renderDirectory?.(root); }
