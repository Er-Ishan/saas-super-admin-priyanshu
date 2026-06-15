const cache = new Map();

export const getCache = (key) => {
    const item = cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
        cache.delete(key);
        return null;
    }

    return item.value;
};

export const setCache = (key, value, ttlSeconds = 300) => {
    cache.set(key, {
        value,
        expiry: Date.now() + ttlSeconds * 1000,
    });
};
