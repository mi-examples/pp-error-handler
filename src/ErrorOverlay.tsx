import { useEffect, useRef, useCallback } from 'react';
import type { CapturedError, ViewMode } from './types';
import { getErrorMeta } from './utils/errorClassifier';
import { ClientView } from './components/ClientView';
import { DevView } from './components/DevView';
import { ErrorActions } from './components/ErrorActions';
import styles from './styles/overlay.module.scss';

interface ErrorOverlayProps {
  error: CapturedError;
  errorLog: CapturedError[];
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  onDismiss: () => void;
  onSelectError: (error: CapturedError) => void;
  isDismissible: boolean;
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function ErrorOverlay({
  error,
  errorLog,
  viewMode,
  onToggleViewMode,
  onDismiss,
  onSelectError,
  isDismissible,
}: ErrorOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const meta = getErrorMeta(error.category);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    overlayRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDismissible) {
        onDismiss();
      }

      if (e.key === 'Tab' && overlayRef.current) {
        const focusableElements = overlayRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      previousActiveElement.current?.focus();
    };
  }, [isDismissible, onDismiss]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={overlayRef}
      className={styles.overlay}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="error-title"
      aria-describedby="error-description"
      tabIndex={-1}
      onClick={handleBackdropClick}
    >
      <div className={styles.modal}>
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div className={styles.viewToggle}>
              <button
                type="button"
                className={`${styles.viewToggleButton} ${viewMode === 'client' ? styles.viewToggleButtonActive : ''}`}
                onClick={() => viewMode !== 'client' && onToggleViewMode()}
              >
                Client
              </button>
              <button
                type="button"
                className={`${styles.viewToggleButton} ${viewMode === 'dev' ? styles.viewToggleButtonActive : ''}`}
                onClick={() => viewMode !== 'dev' && onToggleViewMode()}
              >
                Developer
              </button>
            </div>
          </div>

          <div className={styles.topBarRight}>
            {isDismissible && (
              <button
                type="button"
                className={styles.topBarButton}
                onClick={onDismiss}
                aria-label="Close error overlay"
              >
                <CloseIcon />
              </button>
            )}
          </div>
        </div>

        <div className={styles.errorHeader}>
          <div className={styles.errorCategory} style={{ color: meta.color }}>
            {meta.icon} {meta.label}
          </div>
          <div className={styles.errorMessageBox}>
            <p className={styles.errorName}>{error.originalError.name}</p>
            <h1 id="error-title" className={styles.errorTitle}>
              {error.message}
            </h1>
          </div>
          <span className={styles.errorIdBadge}>{error.id}</span>
        </div>

        <div className={styles.divider} />

        <div id="error-description" className={styles.content}>
          {viewMode === 'client' ? (
            <ClientView error={error} />
          ) : (
            <DevView error={error} errorLog={errorLog} onSelectError={onSelectError} />
          )}
        </div>

        <ErrorActions
          error={error}
          onDismiss={onDismiss}
          isDismissible={isDismissible}
          showDevActions={viewMode === 'dev'}
        />
      </div>
    </div>
  );
}
