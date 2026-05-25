export type BitrixYesOrNoType = 'Y' | 'N';

export interface CrmMultifield {
  ID?: string;
  VALUE_TYPE: 'WORK' | 'HOME' | 'MOBILE' | 'OTHER';
  VALUE: string;
}

export interface BitrixRestResponse<T> {
  result?: T;
  error?: string;
  error_description?: string;
}

export type UpdateEntityResponse = BitrixRestResponse<boolean>;

export type BitrixListResponse<T> = {
  result: T[];
  total: number;
  next?: number;
  time: {
    /* ... */
  };
};
