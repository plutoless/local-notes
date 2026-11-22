interface Inspection {
  running?: boolean;
  checkFailed?: boolean;
  checked: boolean;
  records: readonly unknown[];
  warnings: readonly string[];
}

export function syncInspectionStatus({running, checkFailed, checked, records, warnings}: Inspection) {
  if (running) return 'checking';
  if (checkFailed) return 'failed';
  if (!checked) return 'unchecked';
  if (records.length) return 'conflicts';
  return warnings.length ? 'partial' : 'clear';
}
