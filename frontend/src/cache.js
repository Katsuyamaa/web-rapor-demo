// In-memory cache: persists across SPA navigations, resets on page reload.
const _store = new Map()

export const cache = {
  get:  key       => _store.get(key),
  set:  (key, val) => _store.set(key, val),
  has:  key       => _store.has(key),
  del:  key       => _store.delete(key),
  clear: ()       => _store.clear(),
}
