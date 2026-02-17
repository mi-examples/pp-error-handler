import type { NetworkErrorDetails } from '../types';
import styles from '../styles/overlay.module.scss';

interface NetworkInfoProps {
  details: NetworkErrorDetails;
}

function getStatusBadgeClass(status: number | null): string {
  if (status === null) return styles.statusBadgeError;
  if (status >= 500) return styles.statusBadgeError;
  if (status >= 400) return styles.statusBadgeWarning;
  
  return '';
}

export function NetworkInfo({ details }: NetworkInfoProps) {
  return (
    <div className={styles.networkInfo}>
      <div className={styles.networkRow}>
        <span className={styles.networkLabel}>Method</span>
        <span className={styles.networkValue}>{details.method}</span>
      </div>

      <div className={styles.networkRow}>
        <span className={styles.networkLabel}>URL</span>
        <span className={styles.networkValue}>{details.url}</span>
      </div>

      <div className={styles.networkRow}>
        <span className={styles.networkLabel}>Status</span>
        <span className={styles.networkValue}>
          <span className={styles.networkStatus}>
            <span className={`${styles.statusBadge} ${getStatusBadgeClass(details.status)}`}>
              {details.status ?? 'N/A'}
            </span>
            {details.statusText}
          </span>
        </span>
      </div>

      <div className={styles.networkRow}>
        <span className={styles.networkLabel}>Duration</span>
        <span className={styles.networkValue}>{details.duration}ms</span>
      </div>

      {details.requestHeaders && Object.keys(details.requestHeaders).length > 0 && (
        <div className={styles.networkRow}>
          <span className={styles.networkLabel}>Headers</span>
          <span className={styles.networkValue}>
            {Object.entries(details.requestHeaders).map(([key, value]) => (
              <div key={key}>
                {key}: {value}
              </div>
            ))}
          </span>
        </div>
      )}

      {details.responseBodyPreview && (
        <div className={styles.networkRow}>
          <span className={styles.networkLabel}>Response</span>
          <div className={styles.responsePreview}>{details.responseBodyPreview}</div>
        </div>
      )}
    </div>
  );
}
