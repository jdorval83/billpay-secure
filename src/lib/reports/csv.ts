export function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return "";
  const headerSet = new Set<string>();
  rows.forEach((row) => Object.keys(row).forEach((k) => headerSet.add(k)));
  const headers = Array.from(headerSet);
  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const str = value instanceof Date ? value.toISOString() : typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.map((k) => escape((rows[0] as Record<string, unknown>)[k])).join(",")];
  rows.forEach((row) => lines.push(headers.map((key) => escape(row[key])).join(",")));
  return lines.join("\r\n");
}
