# Changelog

## [0.1.1](https://github.com/mi-examples/pp-error-handler/compare/v0.1.0...v0.1.1) (2026-09-28)

### ⚠ Breaking changes

- The package now declares `engines.node` `>=22`, so installs on Node.js 18 or 20 may warn or fail (for example with `engine-strict`); upgrade to Node.js 22 or later.

### Bug fixes

- A component that throws during render now shows the error overlay instead of unmounting the whole app to a blank page, and dismissing the overlay renders the children again.
- Errors captured while the overlay is visible are now added to `errorLog` and passed to `onError`, while the overlay keeps showing the first error.
- The overlay now appears even when your `onError` callback throws, and the callback's exception is logged to the console instead of breaking error handling.
- `fetch` and XHR are now patched once instead of after every render, and changes to `ignoreStatuses` or `ignoreUrls` apply without re-patching. Unmounting no longer removes wrappers installed later by tools such as Sentry, Datadog or MSW, and code still holding the patched `fetch` keeps working.
- Axios interceptors from `axiosInstances` now stay installed under React StrictMode, are in place before children run their mount effects, and are not added again when you pass a new inline array with the same instances.
- A failed axios request is now reported once instead of twice, because the XHR and axios interceptors no longer both report the same failure.
- Requests cancelled on purpose, such as an aborted `fetch` or a cancelled axios request (`ERR_CANCELED`), are no longer reported as network errors.
- Harmless browser messages such as ResizeObserver loop notices and cross-origin `Script error.` no longer open the overlay when they carry no error object.
- Unhandled promise rejections now get a specific category when one applies, so a failed dynamic `import()` shows the `CHUNK` guidance; other rejections still fall back to `UNHANDLED_PROMISE`.
- In React development builds, a render error is now reported once as `RENDER` with its component stack, instead of also being reported as global errors.
