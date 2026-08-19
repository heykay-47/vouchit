import { ApiError } from './http.js';

export interface CampaignInventoryCandidate {
  sourceRow: number;
  code: string;
  value?: string;
}

export interface CampaignInventoryRejection {
  sourceRow: number;
  code?: string;
  reason: string;
}

export interface CampaignInventoryPreview {
  accepted: CampaignInventoryCandidate[];
  rejected: CampaignInventoryRejection[];
  totalRows: number;
}

export interface CampaignInventoryInput {
  headers: string[];
  rows: CampaignInventoryCandidate[];
}

export const CAMPAIGN_INVENTORY_LIMIT = 500;

const hasSupportedHeaders = (headers: string[]) => (
  (headers.length === 1 && headers[0] === 'code')
  || (headers.length === 2 && headers[0] === 'code' && headers[1] === 'value')
);

const validateHeaders = (headers: string[]) => {
  if (!hasSupportedHeaders(headers)) {
    throw new ApiError(400, 'CSV headers must be exactly code or code,value', { headers });
  }
};

export const previewCampaignInventory = ({ headers, rows }: CampaignInventoryInput): CampaignInventoryPreview => {
  validateHeaders(headers);

  if (rows.length > CAMPAIGN_INVENTORY_LIMIT) {
    throw new ApiError(400, 'Campaign inventory cannot contain more than 500 rows', {
      maxRows: CAMPAIGN_INVENTORY_LIMIT,
      totalRows: rows.length,
    });
  }

  const accepted: CampaignInventoryCandidate[] = [];
  const rejected: CampaignInventoryRejection[] = [];
  const seenCodes = new Set<string>();

  for (const row of rows) {
    const code = row.code.trim();

    if (!code) {
      rejected.push({ sourceRow: row.sourceRow, reason: 'Code is required' });
      continue;
    }

    const value = row.value === undefined ? undefined : row.value.trim();

    if (code.length > 200) {
      rejected.push({ sourceRow: row.sourceRow, code, reason: 'Code must be 200 characters or fewer' });
      continue;
    }

    if (seenCodes.has(code)) {
      rejected.push({ sourceRow: row.sourceRow, code, reason: 'Duplicate code' });
      continue;
    }

    seenCodes.add(code);
    accepted.push({
      sourceRow: row.sourceRow,
      code,
      ...(value === undefined ? {} : { value }),
    });
  }

  return { accepted, rejected, totalRows: rows.length };
};

export const validateCampaignInventory = previewCampaignInventory;
