/**
 * Robust CSV parser for EdTech gradebooks and student rosters.
 * Handles CRLF (\r\n), delimiters (,, ;, \t), quotes, and Vietnamese column headers.
 */

export interface ParsedCsvRow {
  studentCode: string;
  fullName: string;
  score: string;
  note: string;
  [key: string]: any;
}

export function parseGradeCsv(csvContent: string): {
  headers: string[];
  rows: ParsedCsvRow[];
  detectedDelimiter: string;
} {
  const cleanContent = csvContent.replace(/^\uFEFF/, '').trim(); // Remove UTF-8 BOM if present
  if (!cleanContent) {
    return { headers: [], rows: [], detectedDelimiter: ',' };
  }

  // Split lines on \r\n, \r, or \n
  const rawLines = cleanContent.split(/\r\n|\n|\r/).filter((l) => l.trim().length > 0);
  if (rawLines.length === 0) {
    return { headers: [], rows: [], detectedDelimiter: ',' };
  }

  // Detect delimiter from header line: check occurrences of ,, ;, \t
  const headerLine = rawLines[0];
  const commaCount = (headerLine.match(/,/g) || []).length;
  const semiCount = (headerLine.match(/;/g) || []).length;
  const tabCount = (headerLine.match(/\t/g) || []).length;

  let delimiter = ',';
  if (semiCount > commaCount && semiCount > tabCount) {
    delimiter = ';';
  } else if (tabCount > commaCount && tabCount > semiCount) {
    delimiter = '\t';
  }

  // Helper to split a line by delimiter respecting double quotes
  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const rawHeaders = splitLine(rawLines[0]).map((h) => h.replace(/^"|"$/g, '').trim());

  // Normalize header mapping
  const headerMap: { [canonicalKey: string]: number } = {};
  rawHeaders.forEach((h, idx) => {
    const norm = h.toLowerCase().replace(/[\s_\-.]+/g, '');
    if (['studentcode', 'mahs', 'mahocsinh', 'mãhọcsinh', 'mãhs'].includes(norm)) {
      headerMap['studentCode'] = idx;
    } else if (['fullname', 'hoten', 'họvàtên', 'họtên', 'hovaten', 'ten'].includes(norm)) {
      headerMap['fullName'] = idx;
    } else if (['score', 'diem', 'điểm', 'diemso', 'điểmsố', 'grade'].includes(norm)) {
      headerMap['score'] = idx;
    } else if (['note', 'ghichu', 'ghichú', 'nhanxet', 'nhậnxét'].includes(norm)) {
      headerMap['note'] = idx;
    }
  });

  const rows: ParsedCsvRow[] = [];
  for (let i = 1; i < rawLines.length; i++) {
    const cols = splitLine(rawLines[i]).map((c) => c.replace(/^"|"$/g, '').trim());
    if (cols.length === 0 || cols.every((c) => !c)) continue;

    const rowObj: any = {};
    rawHeaders.forEach((h, idx) => {
      rowObj[h] = cols[idx] !== undefined ? cols[idx] : '';
    });

    // Populate canonical keys if mapped
    const studentCode =
      headerMap['studentCode'] !== undefined
        ? cols[headerMap['studentCode']]
        : rowObj['studentCode'] || rowObj['Mã HS'] || cols[0] || '';

    const fullName =
      headerMap['fullName'] !== undefined
        ? cols[headerMap['fullName']]
        : rowObj['fullName'] || rowObj['Họ và tên'] || cols[1] || '';

    let score =
      headerMap['score'] !== undefined
        ? cols[headerMap['score']]
        : rowObj['score'] || rowObj['Điểm'] || cols[2] || '';

    // Handle decimal comma (e.g., 8,5 -> 8.5)
    if (score && typeof score === 'string' && score.includes(',')) {
      score = score.replace(',', '.');
    }

    const note =
      headerMap['note'] !== undefined
        ? cols[headerMap['note']]
        : rowObj['note'] || rowObj['Ghi chú'] || cols[3] || '';

    rows.push({
      ...rowObj,
      studentCode,
      fullName,
      score,
      note,
    });
  }

  return {
    headers: rawHeaders,
    rows,
    detectedDelimiter: delimiter,
  };
}

/**
 * Intelligent helper to deduce the intended assessment from a filename.
 * E.g., 'bang_diem_GK1_a1d5f93f.csv' matches 'Kiểm tra giữa học kỳ I (Toán 10)'.
 */
export function detectAssessmentMatch(
  fileName: string,
  assessments: { id: string; title: string; type: string }[]
): string | undefined {
  if (!fileName || assessments.length === 0) return undefined;
  const lower = fileName.toLowerCase();

  // Check for Midterm / GK1
  if (lower.includes('gk1') || lower.includes('gk_1') || lower.includes('giua_ky') || lower.includes('giữa kỳ') || lower.includes('midterm')) {
    const matched = assessments.find(
      (a) => a.type === 'MIDTERM' || a.title.toLowerCase().includes('giữa') || a.title.toLowerCase().includes('gk1')
    );
    if (matched) return matched.id;
  }

  // Check for Final / CK1
  if (lower.includes('ck1') || lower.includes('ck_1') || lower.includes('cuoi_ky') || lower.includes('cuối kỳ') || lower.includes('final')) {
    const matched = assessments.find(
      (a) => a.type === 'FINAL' || a.title.toLowerCase().includes('cuối')
    );
    if (matched) return matched.id;
  }

  // Check for 15 minutes
  if (lower.includes('15p') || lower.includes('15_phut') || lower.includes('15phut') || lower.includes('15_min')) {
    const matched = assessments.find(
      (a) => a.type === '15_MIN' || a.title.toLowerCase().includes('15')
    );
    if (matched) return matched.id;
  }

  // Check for 1 period (1 tiết)
  if (lower.includes('1_tiet') || lower.includes('1tiet') || lower.includes('one_period')) {
    const matched = assessments.find(
      (a) => a.type === 'ONE_PERIOD' || a.title.toLowerCase().includes('1 tiết')
    );
    if (matched) return matched.id;
  }

  return undefined;
}
