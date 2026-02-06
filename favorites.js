// Favorites storage layer.
// TODO: Replace with Firebase + Firestore.

(() => {
  const FAVORITES_KEY = "cm_favorites";
  const listeners = new Set();

  function loadFavoritesMap() {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveFavoritesMap(map) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(map));
  }

  function notify(userId, favorites) {
    listeners.forEach((listener) => listener({ userId, favorites }));
    window.dispatchEvent(
      new CustomEvent("favorites:change", { detail: { userId, favorites } })
    );
  }

  function getFavorites(userId) {
    if (!userId) {
      return [];
    }
    const map = loadFavoritesMap();
    return Array.isArray(map[userId]) ? map[userId] : [];
  }

  function setFavorites(userId, favorites) {
    if (!userId) {
      return;
    }
    const map = loadFavoritesMap();
    map[userId] = favorites;
    saveFavoritesMap(map);
    notify(userId, favorites);
  }

  function isFavorite(userId, jobId) {
    return getFavorites(userId).includes(jobId);
  }

  function toggleFavorite(userId, jobId) {
    const favorites = new Set(getFavorites(userId));
    if (favorites.has(jobId)) {
      favorites.delete(jobId);
    } else {
      favorites.add(jobId);
    }
    const next = Array.from(favorites);
    setFavorites(userId, next);
    return next;
  }

  function clearAllFavorites() {
    localStorage.removeItem(FAVORITES_KEY);
    notify(null, []);
  }

  window.Favorites = {
    getFavorites,
    setFavorites,
    toggleFavorite,
    isFavorite,
    clearAllFavorites,
    onChange: (listener) => listeners.add(listener),
  };
})();
