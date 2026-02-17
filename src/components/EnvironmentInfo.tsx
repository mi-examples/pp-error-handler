import type { EnvironmentInfo as EnvironmentInfoType } from '../types';
import styles from '../styles/overlay.module.scss';

interface EnvironmentInfoProps {
  environment: EnvironmentInfoType;
}

function formatTimestamp(date: Date): string {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function EnvironmentInfo({ environment }: EnvironmentInfoProps) {
  return (
    <div className={styles.envInfo}>
      <div className={styles.envRow}>
        <span className={styles.envLabel}>URL</span>
        <span className={styles.envValue}>{environment.url}</span>
      </div>

      <div className={styles.envRow}>
        <span className={styles.envLabel}>Viewport</span>
        <span className={styles.envValue}>
          {environment.viewport.width} × {environment.viewport.height}
        </span>
      </div>

      <div className={styles.envRow}>
        <span className={styles.envLabel}>Timestamp</span>
        <span className={styles.envValue}>{formatTimestamp(environment.timestamp)}</span>
      </div>

      <div className={styles.envRow}>
        <span className={styles.envLabel}>Network</span>
        <span className={styles.envValue}>
          <span className={styles.onlineBadge}>
            <span
              className={`${styles.onlineIndicator} ${
                environment.online ? styles.onlineIndicatorOnline : styles.onlineIndicatorOffline
              }`}
            />
            {environment.online ? 'Online' : 'Offline'}
          </span>
        </span>
      </div>

      <div className={styles.envRow}>
        <span className={styles.envLabel}>User Agent</span>
        <span className={styles.envValue}>{environment.userAgent}</span>
      </div>
    </div>
  );
}
