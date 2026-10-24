import * as XLSX from 'xlsx';

export interface ParsedStudentRow {
  studentCode: string;
  fullName: string;
  gender: 'Nam' | 'Nữ';
  birthDate: string;
  classCode: string;
  email: string;
  phone: string;
  parentName: string;
  parentPhone: string;
  [key: string]: any;
}

// Normalize strings for flexible column matching
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

const FIELD_ALIASES: Record<keyof ParsedStudentRow, string[]> = {
  studentCode: ['studentcode', 'mahs', 'mahocsinh', 'mahocsinhsv', 'mssv', 'code', 'id', 'madinhdanh'],
  fullName: ['fullname', 'hovaten', 'hoten', 'tenhocsinh', 'ten', 'name'],
  gender: ['gender', 'gioitinh', 'phai', 'sex'],
  birthDate: ['birthdate', 'ngaysinh', 'dob', 'namsinh', 'ngaythangnamsinh'],
  classCode: ['classcode', 'lop', 'malop', 'tenlop', 'class'],
  email: ['email', 'mail', 'homthu', 'thudientu'],
  phone: ['phone', 'sdt', 'dienthoai', 'sodienthoai', 'mobile', 'tel'],
  parentName: ['parentname', 'phuhuynh', 'tenphuhuynh', 'hotenphuhuynh', 'bome', 'nguoigiamho'],
  parentPhone: ['parentphone', 'sdtphuhuynh', 'dienthoaiphuhuynh', 'sdtph', 'sdtbo', 'sdtme'],
};

export async function parseStudentExcelFile(file: File): Promise<ParsedStudentRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  if (!workbook.SheetNames.length) {
    throw new Error('Tệp Excel không chứa trang tính (sheet) nào.');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '', raw: false });

  if (!rawData || rawData.length === 0) {
    throw new Error('Trang tính trống, không tìm thấy dữ liệu học sinh.');
  }

  // Map each row to normalized fields
  return rawData.map((row) => {
    const mapped: any = {};
    const rowKeys = Object.keys(row);

    for (const [targetField, aliases] of Object.entries(FIELD_ALIASES)) {
      let matchedVal = '';
      for (const k of rowKeys) {
        const normK = normalizeKey(k);
        if (aliases.includes(normK)) {
          matchedVal = String(row[k] || '').trim();
          break;
        }
      }
      mapped[targetField] = matchedVal;
    }

    // Format gender
    const gNorm = normalizeKey(mapped.gender || '');
    mapped.gender = gNorm === 'nu' || gNorm === 'female' || gNorm === 'f' ? 'Nữ' : 'Nam';

    // Format birthDate to YYYY-MM-DD
    if (mapped.birthDate) {
      const d = new Date(mapped.birthDate);
      if (!isNaN(d.getTime())) {
        mapped.birthDate = d.toISOString().slice(0, 10);
      } else {
        // try DD/MM/YYYY or DD-MM-YYYY
        const parts = mapped.birthDate.split(/[\/\-.]/);
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            mapped.birthDate = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
          } else if (parts[2].length === 4) {
            mapped.birthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }
    }
    if (!mapped.birthDate) {
      mapped.birthDate = '2009-01-01';
    }

    // Default class if empty
    if (!mapped.classCode) {
      mapped.classCode = '10A1';
    }

    // Auto-generate email if missing
    if (!mapped.email && mapped.studentCode) {
      mapped.email = `${mapped.studentCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@smarttracker.edu.vn`;
    }

    return mapped as ParsedStudentRow;
  });
}

export function downloadStudentTemplateExcel() {
  const sampleData = [
    {
      'Mã học sinh': 'HS2025-1031',
      'Họ và tên': 'Vũ Minh Quân',
      'Giới tính': 'Nam',
      'Ngày sinh': '2009-05-18',
      'Lớp': '10A1',
      'Email': 'quan.vm@smarttracker.edu.vn',
      'Số điện thoại': '0912445501',
      'Họ tên phụ huynh': 'Vũ Minh Tuấn',
      'SĐT phụ huynh': '0987332211',
    },
    {
      'Mã học sinh': 'HS2025-1032',
      'Họ và tên': 'Nguyễn Diệu Linh',
      'Giới tính': 'Nữ',
      'Ngày sinh': '2009-09-24',
      'Lớp': '10A1',
      'Email': 'linh.nd@smarttracker.edu.vn',
      'Số điện thoại': '0912445502',
      'Họ tên phụ huynh': 'Nguyễn Trọng Đại',
      'SĐT phụ huynh': '0987332212',
    },
    {
      'Mã học sinh': 'HS2025-1033',
      'Họ và tên': 'Phạm Tuấn Hùng',
      'Giới tính': 'Nam',
      'Ngày sinh': '2009-12-08',
      'Lớp': '10A2',
      'Email': 'hung.pt@smarttracker.edu.vn',
      'Số điện thoại': '0912445503',
      'Họ tên phụ huynh': 'Phạm Văn Tiến',
      'SĐT phụ huynh': '0987332213',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Auto column width
  ws['!cols'] = [
    { wch: 16 },
    { wch: 22 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 28 },
    { wch: 16 },
    { wch: 22 },
    { wch: 16 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Hoc_Sinh');
  XLSX.writeFile(wb, 'Mau_Nhap_Hoc_Sinh_Smart_Tracker.xlsx');
}

export interface ParsedGradeRow {
  studentCode: string;
  fullName: string;
  score: string | number;
  note: string;
  [key: string]: any;
}

const GRADE_FIELD_ALIASES: Record<keyof ParsedGradeRow, string[]> = {
  studentCode: ['studentcode', 'mahs', 'mahocsinh', 'mssv', 'code', 'id', 'madinhdanh'],
  fullName: ['fullname', 'hovaten', 'hoten', 'tenhocsinh', 'ten', 'name'],
  score: ['score', 'diem', 'diemso', 'grade', 'diemkiemtra'],
  note: ['note', 'ghichu', 'nhanxet', 'danhgia'],
};

export async function parseGradeExcelOrCsvFile(file: File): Promise<{ rows: ParsedGradeRow[]; fileName: string }> {
  const buffer = await file.arrayBuffer();
  // xlsx can parse both .xlsx, .xls, and .csv with type: 'array'
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames.length) {
    throw new Error('Tệp không chứa bảng tính hoặc dữ liệu nào.');
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  if (!rawData || rawData.length === 0) {
    throw new Error('Trang tính không có dòng dữ liệu nào.');
  }

  const rows: ParsedGradeRow[] = rawData.map((row) => {
    const rowKeys = Object.keys(row);
    let studentCode = '';
    let fullName = '';
    let score: any = '';
    let note = '';

    for (const k of rowKeys) {
      const normK = normalizeKey(k);
      if (!studentCode && GRADE_FIELD_ALIASES.studentCode.some((a) => normalizeKey(a) === normK)) {
        studentCode = String(row[k] || '').trim();
      } else if (!fullName && GRADE_FIELD_ALIASES.fullName.some((a) => normalizeKey(a) === normK)) {
        fullName = String(row[k] || '').trim();
      } else if (score === '' && GRADE_FIELD_ALIASES.score.some((a) => normalizeKey(a) === normK)) {
        score = row[k];
      } else if (!note && GRADE_FIELD_ALIASES.note.some((a) => normalizeKey(a) === normK)) {
        note = String(row[k] || '').trim();
      }
    }

    // Fallbacks if columns didn't match canonical keys
    if (!studentCode && rowKeys.length > 0) studentCode = String(row[rowKeys[0]] || '').trim();
    if (!fullName && rowKeys.length > 1) fullName = String(row[rowKeys[1]] || '').trim();
    if (score === '' && rowKeys.length > 2) score = row[rowKeys[2]];
    if (!note && rowKeys.length > 3) note = String(row[rowKeys[3]] || '').trim();

    // Normalize score comma e.g. 8,5 -> 8.5
    let scoreStr = String(score ?? '').trim();
    if (scoreStr.includes(',')) {
      scoreStr = scoreStr.replace(',', '.');
    }

    return {
      studentCode,
      fullName,
      score: scoreStr,
      note,
      ...row,
    };
  }).filter((r) => r.studentCode || r.fullName || r.score !== '');

  return { rows, fileName: file.name };
}

export function downloadGradeTemplateExcel(
  assessmentTitle: string,
  students: Array<{ studentCode: string; fullName: string }> = []
) {
  const data =
    students.length > 0
      ? students.map((st) => ({
          'Mã học sinh': st.studentCode,
          'Họ và tên': st.fullName,
          'Điểm số (0-10)': '',
          'Ghi chú': '',
        }))
      : [
          {
            'Mã học sinh': 'HS2025-1001',
            'Họ và tên': 'Nguyễn Hoàng Nam',
            'Điểm số (0-10)': 8.5,
            'Ghi chú': 'Kiểm tra đợt 1',
          },
          {
            'Mã học sinh': 'HS2025-1002',
            'Họ và tên': 'Trần Bảo Châu',
            'Điểm số (0-10)': 9.0,
            'Ghi chú': 'Tốt',
          },
          {
            'Mã học sinh': 'HS2025-1003',
            'Họ và tên': 'Lê Tuấn Kiệt',
            'Điểm số (0-10)': 7.5,
            'Ghi chú': '',
          },
        ];

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 25 },
    { wch: 16 },
    { wch: 24 },
  ];

  const wb = XLSX.utils.book_new();
  const safeSheetName = assessmentTitle.slice(0, 30).replace(/[:\\\/\?\*\[\]]/g, '_') || 'Bang_Diem';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetName);
  const safeFileName = `Bang_Diem_${assessmentTitle.slice(0, 35).replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9]/g, '_')}.xlsx`;
  XLSX.writeFile(wb, safeFileName);
}

