import 'mongoose';

declare module 'mongoose' {
  // Loosen some Model/Query return types during migration to Prisma
  interface Model<T> {
    find(...args: any[]): any;
    findOne(...args: any[]): any;
    findById(...args: any[]): any;
    findOneAndUpdate(...args: any[]): any;
    updateMany(...args: any[]): any;
  }

  interface Query<ResultType, DocType, THelpers = {}> {
    lean(...args: any[]): any;
  }
}

export {};
