export type QuestionType = 'text' | 'multiple-choice' | 'scale' | 'date' | 'boolean';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface QuestionValidation {
  pattern?: string; // regex string
  min?: number;
  max?: number;
}

export interface Question {
  id: string | number;
  text: string;
  type: QuestionType;
  required?: boolean;
  weight?: number; // scoring weight
  options?: QuestionOption[]; // for multiple-choice
  branching?: any;
  validation?: QuestionValidation;
  metadata?: Record<string, any>;
}

export interface ResponseRecord {
  value: any;
  valid: boolean;
  errors?: string[];
}
