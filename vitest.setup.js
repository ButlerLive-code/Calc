// Node ≥ 25 подменяет jsdom-овский localStorage своим глобальным, который без
// --localstorage-file не работает. Для тестов ставим простое хранилище в памяти.
function createMemoryStorage() {
  let store = new Map();
  return {
    get length() {
      return store.size;
    },
    key: (index) => [...store.keys()][index] ?? null,
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => {
      store = new Map();
    },
  };
}

if (typeof window !== 'undefined') {
  let works = false;
  try {
    window.localStorage.setItem('__probe__', '1');
    window.localStorage.removeItem('__probe__');
    works = true;
  } catch {
    works = false;
  }
  if (!works) {
    const storage = createMemoryStorage();
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  }
}
