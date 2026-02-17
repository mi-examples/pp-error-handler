import type { StackFrame } from '../types';
import styles from '../styles/overlay.module.scss';

interface StackTraceProps {
  frames: StackFrame[];
}

export function StackTrace({ frames }: StackTraceProps) {
  if (frames.length === 0) {
    return <p className={styles.emptyState}>No stack trace available</p>;
  }

  return (
    <ul className={styles.stackTrace}>
      {frames.map((frame, index) => (
        <li key={index} className={`${styles.stackFrame} ${frame.isAppCode ? styles.stackFrameApp : ''}`}>
          <span className={styles.stackFrameMarker}>{frame.isAppCode ? '→' : ' '}</span>
          <span className={styles.stackFrameFn}>{frame.fn}</span>
          <span className={styles.stackFrameLocation}>
            ({frame.file}
            {frame.line > 0 ? `:${frame.line}:${frame.col}` : ''})
          </span>
        </li>
      ))}
    </ul>
  );
}
