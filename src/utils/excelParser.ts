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
