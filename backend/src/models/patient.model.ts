import prisma from '../config/db';

// Minimal TypeScript interfaces for patient domain
export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface PatientProfile {
  id: string;
  userId: string;
  age: number;
  gender: string;
  medicalHistory?: string | null;
  emergencyContact: EmergencyContact;
  isDeleted?: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientAssessment {
  id: string;
  patientId: string;
  type: string;
  answers: number[];
  totalScore: number;
  severityLevel: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientMoodEntry {
  id: string;
  patientId: string;
  moodScore: number;
  note?: string | null;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to build a Prisma where clause from simple filters commonly used in the codebase
const buildWhere = (filter: Record<string, any> = {}) => {
  const where: any = {};
  if (filter.userId) where.userId = filter.userId;
  if (filter.patientId) where.patientId = filter.patientId;
  if (filter._id) where.id = typeof filter._id === 'string' ? filter._id : (filter._id as any).toString();
  if (filter.isDeleted !== undefined) where.isDeleted = filter.isDeleted;
  // date ranges
  if (filter.createdAt) where.createdAt = filter.createdAt;
  return where;
};

// Provide a small compatibility shim that implements the subset of Mongoose model methods used across the project.
const mapProfile = (r: any) => {
  if (!r) return null;
  return {
    _id: r.id,
    id: r.id,
    userId: r.userId,
    age: r.age,
    gender: r.gender,
    medicalHistory: r.medicalHistory,
    emergencyContact: r.emergencyContact,
    isDeleted: r.isDeleted,
    deletedAt: r.deletedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
};

const chainable = (promiseFactory: () => Promise<any[]>) => ({
  select: (_proj?: Record<string, number>) => ({
    sort: (_sort?: Record<string, number>) => ({
      skip: (_n: number) => ({
        limit: (_n2: number) => ({
          lean: async () => {
            const rows = await promiseFactory();
            return rows.map(mapProfile);
          },
        }),
      }),
    }),
  }),
});

export const PatientProfileModel = {
  findOne: (filter: Record<string, any> = {}) => ({
    select: (_proj?: Record<string, number>) => ({
      lean: async () => {
        const where = buildWhere(filter);
        const r = where.userId
          ? await prisma.patientProfile.findUnique({ where: { userId: where.userId } })
          : (await prisma.patientProfile.findMany({ where, take: 1 }))[0] ?? null;
        return mapProfile(r);
      },
    }),
  }),
  findById: (id: string) => ({
    select: (_proj?: Record<string, number>) => ({
      lean: async () => {
        const r = await prisma.patientProfile.findUnique({ where: { id } });
        return mapProfile(r);
      },
    }),
  }),
  create: async (data: Record<string, any>) => {
    const r = await prisma.patientProfile.create({ data });
    return mapProfile(r);
  },
  findOneAndUpdate: async (filter: Record<string, any>, update: Record<string, any>) => {
    const where = buildWhere(filter);
    if (!where.id && !where.userId) throw new Error('findOneAndUpdate requires id or userId');
    const key = where.id ? { id: where.id } : { userId: where.userId };
    const r = await prisma.patientProfile.update({ where: key as any, data: update });
    return mapProfile(r);
  },
  find: (filter: Record<string, any> = {}) => chainable(async () => {
    const where = buildWhere(filter);
    const rows = await prisma.patientProfile.findMany({ where });
    return rows;
  }),
  countDocuments: async (filter: Record<string, any> = {}) => prisma.patientProfile.count({ where: buildWhere(filter) }),
};

export const PatientAssessmentModel = {
  create: async (data: Record<string, any>) => prisma.patientAssessment.create({ data }),
  findById: async (id: string, _projection?: Record<string, number>) => prisma.patientAssessment.findUnique({ where: { id } }),
  findOne: async (filter: Record<string, any> = {}, _projection?: Record<string, number>) => {
    const where = buildWhere(filter);
    const items = await prisma.patientAssessment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 1 });
    return items[0] ?? null;
  },
  find: async (filter: Record<string, any> = {}, projection?: Record<string, number>) => {
    const where = buildWhere(filter);
    return prisma.patientAssessment.findMany({ where });
  },
  countDocuments: async (filter: Record<string, any> = {}) => prisma.patientAssessment.count({ where: buildWhere(filter) }),
};

export const PatientMoodEntryModel = {
  create: async (data: Record<string, any>) => prisma.patientMoodEntry.create({ data }),
  find: async (filter: Record<string, any> = {}, _projection?: Record<string, number>) => prisma.patientMoodEntry.findMany({ where: buildWhere(filter), orderBy: { date: 'desc' } }),
  aggregate: async (_pipeline: any[]) => {
    // Aggregate pipelines are not implemented here — use Prisma raw queries or the service helpers.
    throw new Error('aggregate is not implemented on PatientMoodEntryModel; use Prisma raw queries instead');
  },
};

export default PatientProfileModel;
