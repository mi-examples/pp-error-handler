import type { CapturedError } from '../types';
import { getFriendlyError } from '../utils/friendlyMessages';
import styles from '../styles/overlay.module.scss';

interface ClientViewProps {
  error: CapturedError;
}

export function ClientView({ error }: ClientViewProps) {
  const friendly = getFriendlyError(error.category);

  return (
    <div className={styles.clientView}>
      <div className={styles.clientBody}>
        <p className={styles.clientDescription}>{friendly.description}</p>
      </div>

      <div className={styles.tips}>
        <h3 className={styles.tipsTitle}>Things you can try</h3>
        <ul className={styles.tipsList}>
          {friendly.tips.map((tip, index) => (
            <li key={index} className={styles.tipsItem}>
              <span className={styles.tipNumber}>{index + 1}</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
