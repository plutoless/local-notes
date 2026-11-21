const mime = {js:'text/javascript', css:'text/css', html:'text/html', woff:'font/woff', woff2:'font/woff2', png:'image/png', svg:'image/svg+xml'};
export function assetPath(path) {
  if (typeof path !== 'string' || !path.split('/').every(part => /^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(part) && part !== '..') || path.split('/').some(part => part.toLowerCase() === 'localnotesdata')) throw Error('Invalid packaged asset path');
  return path;
}
export function mimeFor(path) {
  const value = mime[assetPath(path).split('.').at(-1)];
  if (!value) throw Error('Unsupported packaged asset type');
  return value;
}
