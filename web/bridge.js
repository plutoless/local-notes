let sequence = 0;
const pending = new Map();
window.nativeReply = (id, result) => {
  const request = pending.get(id);
  if (!request) return;
  pending.delete(id);
  result.error ? request.reject(Error(result.error)) : request.resolve(result);
};
export function native(cmd, args = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, {resolve, reject});
    const message = JSON.stringify({id, cmd, ...args});
    if (window.webkit?.messageHandlers?.notes) window.webkit.messageHandlers.notes.postMessage(message);
    else if (window.NotesNative) window.NotesNative.request(message);
    else { pending.delete(id); reject(Error('Please open the local app.')); }
  });
}
