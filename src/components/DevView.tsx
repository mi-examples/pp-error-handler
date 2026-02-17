import { useState } from 'react';
import type { CapturedError } from '../types';
import { StackTrace } from './StackTrace';
import { NetworkInfo } from './NetworkInfo';
import { EnvironmentInfo } from './EnvironmentInfo';
import styles from '../styles/overlay.module.scss';

interface DevViewProps {
  error: CapturedError;
  errorLog: CapturedError[];
  onSelectError?: (error: CapturedError) => void;
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

interface SectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Section({ title, defaultOpen = false, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHeader} onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
        <span>{title}</span>
        <ChevronIcon className={`${styles.sectionIcon} ${isOpen ? styles.sectionIconOpen : ''}`} />
      </button>
      {isOpen && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function DevView({ error, errorLog, onSelectError }: DevViewProps) {
  return (
    <div className={styles.devView}>
      <Section title="Stack Trace" defaultOpen={true}>
        <StackTrace frames={error.stack} />
      </Section>

      {error.componentStack && (
        <Section title="Component Stack">
          <pre className={styles.componentStack}>{error.componentStack}</pre>
        </Section>
      )}

      {error.networkDetails && (
        <Section title="Network Details" defaultOpen={true}>
          <NetworkInfo details={error.networkDetails} />
        </Section>
      )}

      <Section title="Environment">
        <EnvironmentInfo environment={error.environment} />
      </Section>

      {errorLog.length > 1 && (
        <Section title={`Error Log (${errorLog.length})`}>
          <div className={styles.errorLog}>
            {errorLog.map((logError) => (
              <div
                key={logError.id}
                className={`${styles.errorLogItem} ${logError.id === error.id ? styles.errorLogItemActive : ''}`}
                onClick={() => onSelectError?.(logError)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectError?.(logError);
                  }
                }}
              >
                <div className={styles.errorLogContent}>
                  <p className={styles.errorLogMessage}>{logError.message}</p>
                  <p className={styles.errorLogMeta}>
                    {logError.category} · {logError.id}
                  </p>
                </div>
                <span className={styles.errorLogTime}>{formatTime(logError.timestamp)}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {error.metadata && Object.keys(error.metadata).length > 0 && (
        <Section title="Custom Metadata">
          <div className={styles.envInfo}>
            {Object.entries(error.metadata).map(([key, value]) => (
              <div key={key} className={styles.envRow}>
                <span className={styles.envLabel}>{key}</span>
                <span className={styles.envValue}>
                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
