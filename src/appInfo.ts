/**
 * Shared, static application metadata used by both the core report builder and
 * the React UI. No secrets, no private contact details.
 */
export const APP_NAME = 'YoLab Excel Auditor';
export const APP_NAME_ZH = 'YoLab Excel 資料品質健檢';
export const APP_VERSION = '1.0.0';

export const YOLAB_SITE = 'https://yakitori197.github.io/YoLab/';
export const REPO_URL = 'https://github.com/yakitori197/yolab-excel-auditor';
export const PUBLIC_URL = 'https://yakitori197.github.io/yolab-excel-auditor/';

/** Maximum accepted file size. Larger files get a friendly, non-crashing message. */
export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const SUPPORTED_EXTENSIONS = ['.xlsx', '.csv'] as const;
