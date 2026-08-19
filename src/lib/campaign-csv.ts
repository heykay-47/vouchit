import Papa from 'papaparse';
import type { CampaignInventoryCandidate } from './types';

export interface CampaignCsvResult {
  headers: string[];
  rows: CampaignInventoryCandidate[];
}

export class CampaignCsvParseError extends Error {
  sourceRow: number;

  constructor(sourceRow: number, message: string) {
    super(`Malformed CSV at source row ${sourceRow}: ${message}`);
    this.name = 'CampaignCsvParseError';
    this.sourceRow = sourceRow;
  }
}

const hasSupportedHeaders = (headers: string[]) => (
  (headers.length === 1 && headers[0] === 'code')
  || (headers.length === 2 && headers[0] === 'code' && headers[1] === 'value')
);

export const toCampaignCsvResult = (result: Papa.ParseResult<string[]>): CampaignCsvResult => {
  const parseError = result.errors[0];
  if (parseError) {
    throw new CampaignCsvParseError(parseError.row + 1, parseError.message);
  }

  const headers = result.data[0] ?? [];
  if (!hasSupportedHeaders(headers)) {
    throw new Error('CSV headers must be exactly code or code,value');
  }

  return {
    headers,
    rows: result.data.slice(1).map((row, index) => ({
      sourceRow: index + 2,
      code: row[0],
      ...(headers.length === 2 ? { value: row[1] } : {}),
    })),
  };
};

export const parseCampaignCsv = (file: File): Promise<CampaignCsvResult> => new Promise((resolve, reject) => {
  Papa.parse<string[]>(file, {
    delimiter: ',',
    dynamicTyping: false,
    skipEmptyLines: 'greedy',
    complete: (result) => {
      try {
        resolve(toCampaignCsvResult(result));
      } catch (error) {
        reject(error);
      }
    },
    error: (error) => reject(error),
  });
});
