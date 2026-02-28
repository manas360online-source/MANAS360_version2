import 'mongoose';

declare module 'mongoose' {
  // Augment Query to ensure .lean() is recognized in chain calls across the codebase.
  interface Query<ResultType, DocType, THelpers = {}> {
    lean(): Promise<ResultType | null>;
    lean<T>(): Promise<T>;
  }

  // Provide a loose AnyObject type for quick casts where precise models aren't yet migrated.
  type AnyObject = { [k: string]: any };
}

export {}
