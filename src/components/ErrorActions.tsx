import { useState } from 'react';
import type { CapturedError } from '../types';
import { copyReportToClipboard } from '../utils/reportBuilder';
import styles from '../styles/overlay.module.scss';

interface ErrorActionsProps {
  error: CapturedError;
  onDismiss: () => void;
  isDismissible: boolean;
  showDevActions?: boolean;
}

function RefreshIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function ErrorActions({ error, onDismiss, isDismissible, showDevActions = false }: ErrorActionsProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCopyReport = async () => {
    const success = await copyReportToClipboard(error, showDevActions ? 'text' : 'text');
    if (success) {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    }
  };

  return (
    <div className={styles.footer}>
      {showDevActions && (
        <button type="button" className={`${styles.button} ${styles.buttonGhost}`} onClick={handleCopyReport}>
          {copyStatus === 'copied' ? (
            <>
              <CheckIcon />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon />
              Copy Report
            </>
          )}
        </button>
      )}

      {isDismissible && (
        <button type="button" className={`${styles.button} ${styles.buttonSecondary}`} onClick={onDismiss}>
          Dismiss
        </button>
      )}

      <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={handleRefresh}>
        <RefreshIcon />
        Refresh Page
      </button>
    </div>
  );
}
