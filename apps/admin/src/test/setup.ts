// The admin code reads `window.wp` for translations; Node has no window.
(globalThis as unknown as { window: object }).window ??= {};
