# @metricinsights/pp-error-handler

React error handler for Metric Insights Portal Pages (Cutstom Apps) with smart error classification, network interception, and an overlay UI. Catches runtime errors, unhandled promises, network failures (fetch, XHR, Axios), and React render errors — all in one provider.

## Features

- **Automatic error capture** — React render errors, unhandled rejections, global errors
- **Network interception** — Patches `fetch()` and `XMLHttpRequest`; optional Axios instance support
- **Smart classification** — Categorizes errors as Runtime, Network, API, Chunk Load, Render, or Unhandled Promise
- **Two view modes** — Friendly client view for end-users, detailed developer view with stack traces
- **Network correlation** — Buffers network errors and only shows the overlay when they surface as unhandled rejections
- **Copy error reports** — One-click text or JSON report for support/debugging
- **Fully customizable** — Custom fallback components, ignore patterns, error callbacks
- **Zero runtime dependencies** — Only requires React 18+ as a peer dependency

## Installation

```bash
npm install @metricinsights/pp-error-handler
```

**Peer dependencies:** React 18+ and ReactDOM 18+ must be installed in your project.

## Quick Start

### 1. Import the styles

Import the CSS file in your app entry point:

```tsx
import '@metricinsights/pp-error-handler/styles.css';
```

### 2. Wrap your app with ErrorProvider

```tsx
import { ErrorProvider } from '@metricinsights/pp-error-handler';

function App() {
  return (
    <ErrorProvider>
      <YourApp />
    </ErrorProvider>
  );
}
```

That's it! The error handler will now automatically catch and display errors.

## Configuration

### ErrorProvider Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'client' \| 'dev' \| 'auto'` | `'auto'` | Initial view mode. `'auto'` uses `NODE_ENV` to decide. |
| `catchNetwork` | `boolean` | `true` | Intercept `fetch()` and `XMLHttpRequest` failures. |
| `axiosInstances` | `any[]` | `[]` | Axios instances to attach interceptors to. |
| `ignoreStatuses` | `number[]` | `[]` | HTTP status codes to ignore (e.g., `[401, 404]`). |
| `ignoreUrls` | `(string \| RegExp)[]` | `[]` | URL patterns to exclude from interception. |
| `onError` | `(error: CapturedError) => void` | — | Callback for every captured error (for Sentry, LogRocket, etc.). |
| `maxLogSize` | `number` | `50` | Maximum errors to keep in the error log. |
| `dismissible` | `boolean` | `true` in dev, `false` in prod | Whether the overlay can be dismissed. |
| `fallback` | `React.ComponentType<{ error: CapturedError; dismiss: () => void }>` | — | Custom component to replace the entire overlay. |

### Full Configuration Example

```tsx
import { ErrorProvider } from '@metricinsights/pp-error-handler';
import '@metricinsights/pp-error-handler/styles.css';
import { apiClient } from './api';

function App() {
  return (
    <ErrorProvider
      mode="auto"
      catchNetwork={true}
      axiosInstances={[apiClient]}
      ignoreStatuses={[401, 404]}
      ignoreUrls={['/health', /\/analytics\//]}
      onError={(error) => {
        // Send to your error tracking service
        console.error('[ErrorHandler]', error.category, error.message);
      }}
      dismissible={true}
      maxLogSize={100}
    >
      <YourApp />
    </ErrorProvider>
  );
}
```

## Hooks

### useErrorHandler

Access error handler context for programmatic error reporting.

```tsx
import { useErrorHandler } from '@metricinsights/pp-error-handler';

function MyComponent() {
  const { reportError, errorLog, clearLog, dismiss } = useErrorHandler();

  const handleAction = async () => {
    try {
      await riskyOperation();
    } catch (error) {
      reportError(error as Error, { context: 'MyComponent.handleAction' });
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

**API:**

| Method | Signature | Description |
|--------|-----------|-------------|
| `reportError` | `(error: Error \| string, metadata?: Record<string, unknown>) => void` | Manually report an error to show the overlay. |
| `errorLog` | `CapturedError[]` | List of all captured errors. |
| `clearLog` | `() => void` | Clear the error log. |
| `dismiss` | `() => void` | Dismiss the current overlay. |

### useNetworkStatus

Track the browser's network connectivity status.

```tsx
import { useNetworkStatus } from '@metricinsights/pp-error-handler';

function NetworkIndicator() {
  const { online, effectiveType, downlink, rtt } = useNetworkStatus();

  return (
    <span>{online ? 'Online' : 'Offline'} ({effectiveType})</span>
  );
}
```

## Axios Integration

Pass your Axios instances to `ErrorProvider` to intercept their errors. If no instances are provided, the Axios interceptor is not activated.

```tsx
import axios from 'axios';
import { ErrorProvider } from '@metricinsights/pp-error-handler';

const apiClient = axios.create({ baseURL: '/api' });

function App() {
  return (
    <ErrorProvider axiosInstances={[apiClient]}>
      <YourApp />
    </ErrorProvider>
  );
}
```

## Utilities

The package exports utility functions for advanced use cases:

```tsx
import {
  classifyError,
  getErrorMeta,
  isErrorCritical,
  getFriendlyError,
  parseStack,
  buildTextReport,
  buildJsonReport,
  generateErrorId,
} from '@metricinsights/pp-error-handler';

// Classify an error
const category = classifyError(new TypeError('Cannot read properties of undefined'));
// => 'RUNTIME'

// Get metadata for a category
const meta = getErrorMeta('NETWORK');
// => { label: 'Network Error', icon: '🌐', color: '#f97316', tips: [...] }

// Build a copyable report from a CapturedError
const report = buildTextReport(capturedError);
```

## Error Categories

| Category | Description |
|----------|-------------|
| `RUNTIME` | TypeError, ReferenceError, SyntaxError, RangeError |
| `NETWORK` | Network failures (no response, DNS, CORS) |
| `API` | HTTP errors (4xx, 5xx status codes) |
| `CHUNK` | Dynamic import / chunk loading failures |
| `RENDER` | React component render errors (caught by ErrorBoundary) |
| `UNHANDLED_PROMISE` | Unhandled promise rejections |
| `UNKNOWN` | Errors that don't match any other category |

## Custom Fallback Component

Replace the default overlay with your own UI:

```tsx
import { ErrorProvider } from '@metricinsights/pp-error-handler';
import type { CapturedError } from '@metricinsights/pp-error-handler';

function CustomErrorUI({ error, dismiss }: { error: CapturedError; dismiss: () => void }) {
  return (
    <div className="my-error-overlay">
      <h1>Oops! Something went wrong</h1>
      <p>{error.message}</p>
      <button onClick={dismiss}>Dismiss</button>
      <button onClick={() => window.location.reload()}>Refresh</button>
    </div>
  );
}

function App() {
  return (
    <ErrorProvider fallback={CustomErrorUI}>
      <YourApp />
    </ErrorProvider>
  );
}
```

## TypeScript

The package ships with full TypeScript declarations. Key types:

```tsx
import type {
  CapturedError,
  ErrorCategory,
  ErrorMeta,
  StackFrame,
  NetworkErrorDetails,
  EnvironmentInfo,
  ErrorProviderProps,
  ErrorContextValue,
  UseErrorHandler,
  ViewMode,
  ProviderMode,
} from '@metricinsights/pp-error-handler';
```

## Releases

Releases use the shared workflows from [mi-examples-workflows](https://github.com/mi-examples/mi-examples-workflows) ([release flow](https://github.com/mi-examples/mi-examples-workflows/blob/main/docs/workflows.md#release-workflows)). This repository has no `develop` branch, so there are no betas:

1. Run **Actions → Release → Run workflow**. It opens a release pull request `release/vX.Y.Z → main` with the version bump and the new `CHANGELOG.md` entry.
2. Review and edit the entry in the pull request, then merge it.
3. Merging publishes to npm under `latest` with provenance, and creates the tag and the GitHub release.

Versions come from [Conventional Commits](https://www.conventionalcommits.org/) (`feat` → minor; `fix`, `perf`, `revert` → patch; `!` or `BREAKING CHANGE:` → major). Publishing uses npm Trusted Publishing (OIDC) from `.github/workflows/release.yml`, so don't rename that file.
## License

MIT
