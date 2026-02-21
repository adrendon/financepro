export type ExportRow = Record<string, string | number | null | undefined>;

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToCSV(rows: ExportRow[], fileName: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = row[key] ?? "";
          const escaped = String(value).replaceAll('"', '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), fileName);
}

export async function exportToExcel(rows: ExportRow[], fileName: string) {
  if (!rows.length) return;
  const xlsx = await import("xlsx");
  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "Datos");
  xlsx.writeFile(workbook, fileName);
}

export async function exportToPDF(
  rows: ExportRow[],
  fileName: string,
  title: string
) {
  if (!rows.length) return;
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 14);

  const headers = Object.keys(rows[0]);
  autoTable(doc, {
    startY: 20,
    head: [headers],
    body: rows.map((row) => headers.map((header) => String(row[header] ?? ""))),
    styles: { fontSize: 8 },
  });

  doc.save(fileName);
}
