import type { CapturedError, StackFrame } from '../types';

function formatStackFrame(frame: StackFrame): string {
  const location = frame.line > 0 ? `:${frame.line}:${frame.col}` : '';
  const marker = frame.isAppCode ? '→' : ' ';

  return `  ${marker} ${frame.fn} (${frame.file}${location})`;
}

function formatDate(date: Date): string {
  return date.toISOString();
}

export function buildTextReport(error: CapturedError): string {
  const lines: string[] = [];

  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('                      ERROR REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('');

  lines.push(`Error ID:    ${error.id}`);
  lines.push(`Category:    ${error.category}`);
  lines.push(`Timestamp:   ${formatDate(error.timestamp)}`);
  lines.push(`Message:     ${error.message}`);
  lines.push('');

  if (error.stack.length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('STACK TRACE');
    lines.push('───────────────────────────────────────────────────────────');
    error.stack.forEach((frame) => {
      lines.push(formatStackFrame(frame));
    });
    lines.push('');
  }

  if (error.componentStack) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('COMPONENT STACK');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(error.componentStack);
    lines.push('');
  }

  if (error.networkDetails) {
    const nd = error.networkDetails;
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('NETWORK DETAILS');
    lines.push('───────────────────────────────────────────────────────────');
    lines.push(`Method:      ${nd.method}`);
    lines.push(`URL:         ${nd.url}`);
    lines.push(`Status:      ${nd.status ?? 'N/A'} ${nd.statusText}`);
    lines.push(`Duration:    ${nd.duration}ms`);
    if (nd.requestHeaders && Object.keys(nd.requestHeaders).length > 0) {
      lines.push('Request Headers:');
      Object.entries(nd.requestHeaders).forEach(([key, value]) => {
        lines.push(`  ${key}: ${value}`);
      });
    }
    if (nd.responseBodyPreview) {
      lines.push('Response Body Preview:');
      lines.push(`  ${nd.responseBodyPreview}`);
    }
    lines.push('');
  }

  lines.push('───────────────────────────────────────────────────────────');
  lines.push('ENVIRONMENT');
  lines.push('───────────────────────────────────────────────────────────');
  lines.push(`URL:         ${error.environment.url}`);
  lines.push(`User Agent:  ${error.environment.userAgent}`);
  lines.push(`Viewport:    ${error.environment.viewport.width}x${error.environment.viewport.height}`);
  lines.push(`Online:      ${error.environment.online ? 'Yes' : 'No'}`);
  lines.push(`Timestamp:   ${formatDate(error.environment.timestamp)}`);
  lines.push('');

  if (error.metadata && Object.keys(error.metadata).length > 0) {
    lines.push('───────────────────────────────────────────────────────────');
    lines.push('CUSTOM METADATA');
    lines.push('───────────────────────────────────────────────────────────');
    Object.entries(error.metadata).forEach(([key, value]) => {
      lines.push(`${key}: ${JSON.stringify(value)}`);
    });
    lines.push('');
  }

  lines.push('═══════════════════════════════════════════════════════════');

  return lines.join('\n');
}

export function buildJsonReport(error: CapturedError): string {
  const report = {
    id: error.id,
    category: error.category,
    timestamp: error.timestamp.toISOString(),
    message: error.message,
    stack: error.stack,
    componentStack: error.componentStack,
    networkDetails: error.networkDetails,
    metadata: error.metadata,
    environment: {
      ...error.environment,
      timestamp: error.environment.timestamp.toISOString(),
    },
  };

  return JSON.stringify(report, null, 2);
}

export async function copyReportToClipboard(error: CapturedError, format: 'text' | 'json' = 'text'): Promise<boolean> {
  const report = format === 'json' ? buildJsonReport(error) : buildTextReport(error);

  try {
    await navigator.clipboard.writeText(report);

    return true;
  } catch {
    return false;
  }
}
