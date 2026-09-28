export function downloadText(filename: string, text: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadCSV(name: string, headers: string[], rows: string[][]) {
  const cell = (value: string) => '"' + (/^[=+\-@\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
  downloadText(`${name.replaceAll(" ", "-")}.csv`, [headers, ...rows].map(r => r.map(cell).join(",")).join("\r\n"), "text/csv;charset=utf-8");
}
