const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'Demo@12345';

const randomItem = (list) => list[Math.floor(Math.random() * list.length)];

const plusDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
};

const createUsersByRole = ({ role, count, predefined = [] }) => {
  const generated = [...predefined];
  const needed = Math.max(0, count - predefined.length);

  for (let index = 1; index <= needed; index += 1) {
    const suffix = `${role.toLowerCase()}${index}`;
    generated.push({
      email: `${suffix}@demo.com`,
      firstName: role.slice(0, 1) + role.slice(1).toLowerCase(),
      lastName: `User${index}`,
      role,
    });
  }

  return generated.slice(0, count);
};

async function upsertUser(userInput, passwordHash) {
  const { email, firstName, lastName, role } = userInput;
  return prisma.user.upsert({
    where: { email },
    update: {
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      isDeleted: false,
      passwordHash,
      failedLoginAttempts: 0,
      lockUntil: null,
    },
    create: {
      email,
      firstName,
      lastName,
      name: `${firstName} ${lastName}`,
      role,
      provider: 'LOCAL',
      emailVerified: true,
      phoneVerified: false,
      passwordHash,
    },
  });
}

async function seed() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const patientsSeed = createUsersByRole({
    role: 'PATIENT',
    count: 20,
    predefined: [
      { email: 'patient@demo.com', firstName: 'Patient', lastName: 'Demo', role: 'PATIENT' },
      { email: 'free@demo.com', firstName: 'Free', lastName: 'Plan', role: 'PATIENT' },
      { email: 'basic@demo.com', firstName: 'Basic', lastName: 'Plan', role: 'PATIENT' },
      { email: 'premium@demo.com', firstName: 'Premium', lastName: 'Plan', role: 'PATIENT' },
    ],
  });

  const therapistsSeed = createUsersByRole({
    role: 'THERAPIST',
    count: 10,
    predefined: [{ email: 'therapist@demo.com', firstName: 'Therapist', lastName: 'Demo', role: 'THERAPIST' }],
  });

  const coachesSeed = createUsersByRole({
    role: 'COACH',
    count: 5,
    predefined: [{ email: 'coach@demo.com', firstName: 'Coach', lastName: 'Demo', role: 'COACH' }],
  });

  const psychiatristsSeed = createUsersByRole({
    role: 'PSYCHIATRIST',
    count: 3,
    predefined: [{ email: 'psychiatrist@demo.com', firstName: 'Psychiatrist', lastName: 'Demo', role: 'PSYCHIATRIST' }],
  });

  const adminsSeed = createUsersByRole({
    role: 'ADMIN',
    count: 2,
    predefined: [{ email: 'admin@demo.com', firstName: 'Admin', lastName: 'Demo', role: 'ADMIN' }],
  });

  const allUsers = [...patientsSeed, ...therapistsSeed, ...coachesSeed, ...psychiatristsSeed, ...adminsSeed];
  const persistedUsers = [];
  for (const userData of allUsers) {
    persistedUsers.push(await upsertUser(userData, passwordHash));
  }

  const usersByEmail = new Map(persistedUsers.map((user) => [String(user.email).toLowerCase(), user]));
  const patientUsers = patientsSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);
  const therapistUsers = therapistsSeed.map((row) => usersByEmail.get(row.email.toLowerCase())).filter(Boolean);

  const profileByUserId = new Map();
  for (const patient of patientUsers) {
    const profile = await prisma.patientProfile.upsert({
      where: { userId: patient.id },
      update: {
        isDeleted: false,
        deletedAt: null,
      },
      create: {
        userId: patient.id,
        age: 20 + Math.floor(Math.random() * 25),
        gender: randomItem(['female', 'male', 'non-binary']),
        medicalHistory: 'Seeded for staging QA',
        emergencyContact: {
          name: 'Emergency Contact',
          relationship: 'Family',
          phone: '+910000000000',
        },
      },
    });
    profileByUserId.set(patient.id, profile);
  }

  const planByEmail = {
    'free@demo.com': { planName: 'Free Plan', price: 0, billingCycle: 'monthly', status: 'active' },
    'basic@demo.com': { planName: 'Basic Plan', price: 999, billingCycle: 'monthly', status: 'active' },
    'premium@demo.com': { planName: 'Premium Plan', price: 2499, billingCycle: 'monthly', status: 'active' },
  };

  for (const patient of patientUsers) {
    const email = String(patient.email || '').toLowerCase();
    const plan = planByEmail[email] || { planName: randomItem(['Free Plan', 'Basic Plan', 'Premium Plan']), price: randomItem([0, 999, 2499]), billingCycle: 'monthly', status: 'active' };

    await prisma.patientSubscription.upsert({
      where: { userId: patient.id },
      update: {
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle,
        status: plan.status,
        autoRenew: plan.price > 0,
        renewalDate: plusDays(30),
      },
      create: {
        userId: patient.id,
        planName: plan.planName,
        price: plan.price,
        billingCycle: plan.billingCycle,
        status: plan.status,
        autoRenew: plan.price > 0,
        renewalDate: plusDays(30),
      },
    });
  }

  const patientIds = patientUsers.map((user) => user.id);
  const patientProfileIds = [...profileByUserId.values()].map((profile) => profile.id);
  const moodLogModel = prisma.moodLog;
  const patientMoodEntryModel = prisma.patientMoodEntry;
  const patientExerciseModel = prisma.patientExercise;
  const patientAssessmentModel = prisma.patientAssessment;
  const patientProgressModel = prisma.patientProgress;

  if (moodLogModel) {
    await moodLogModel.deleteMany({ where: { userId: { in: patientIds }, source: 'seed' } });
  }
  if (patientMoodEntryModel) {
    await patientMoodEntryModel.deleteMany({ where: { patientId: { in: patientProfileIds }, note: { startsWith: '[seed]' } } });
  }
  await prisma.notification.deleteMany({ where: { userId: { in: patientIds }, type: { startsWith: 'SEED_' } } });
  if (patientExerciseModel) {
    await patientExerciseModel.deleteMany({ where: { patientId: { in: patientProfileIds }, assignedBy: 'seed-system' } });
  }
  if (patientAssessmentModel) {
    await patientAssessmentModel.deleteMany({ where: { patientId: { in: patientProfileIds }, type: { startsWith: 'SEED_' } } });
  }

  for (const patient of patientUsers) {
    const profile = profileByUserId.get(patient.id);
    if (!profile) continue;

    for (let i = 0; i < 14; i += 1) {
      const mood = Math.max(1, Math.min(10, 5 + Math.round(Math.sin(i / 2) * 2) - Math.floor(i / 8)));
      const date = plusDays(-i);
      if (moodLogModel) {
        await moodLogModel.create({
          data: {
            userId: patient.id,
            moodValue: mood,
            note: '[seed] Mood check-in for staging QA',
            source: 'seed',
            loggedAt: date,
          },
        });
      }

      if (patientMoodEntryModel) {
        await patientMoodEntryModel.create({
          data: {
            patientId: profile.id,
            moodScore: Math.max(1, Math.min(5, Math.round(mood / 2))),
            note: '[seed] Legacy mood entry for dashboard QA',
            date,
          },
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: patient.id,
        type: 'SEED_WELCOME',
        title: 'Welcome to Staging',
        message: 'This account is seeded for QA testing.',
        payload: { seeded: true },
      },
    });

    const exercises = [
      { title: 'Breathing Reset', duration: 10, status: 'COMPLETED' },
      { title: 'Thought Journal', duration: 15, status: 'COMPLETED' },
      { title: 'Sleep Hygiene Check', duration: 12, status: 'IN_PROGRESS' },
      { title: 'Behavioral Activation', duration: 20, status: 'PENDING' },
    ];

    if (patientExerciseModel) {
      for (const exercise of exercises) {
        await patientExerciseModel.create({
          data: {
            patientId: profile.id,
            title: exercise.title,
            assignedBy: 'seed-system',
            duration: exercise.duration,
            status: exercise.status,
          },
        });
      }
    }

    const assessments = [
      { type: 'SEED_PHQ9', totalScore: 16, answers: [2, 2, 1, 2, 2, 2, 2, 2, 1], severityLevel: 'Moderate' },
      { type: 'SEED_PHQ9', totalScore: 13, answers: [1, 2, 1, 2, 2, 1, 2, 1, 1], severityLevel: 'Moderate' },
      { type: 'SEED_PHQ9', totalScore: 10, answers: [1, 1, 1, 2, 1, 1, 1, 1, 1], severityLevel: 'Mild' },
    ];

    if (patientAssessmentModel) {
      for (const assessment of assessments) {
        await patientAssessmentModel.create({
          data: {
            patientId: profile.id,
            type: assessment.type,
            answers: assessment.answers,
            totalScore: assessment.totalScore,
            severityLevel: assessment.severityLevel,
          },
        });
      }
    }
  }

  for (let patientIndex = 0; patientIndex < patientUsers.length; patientIndex += 1) {
    const patient = patientUsers[patientIndex];
    const profile = profileByUserId.get(patient.id);
    const therapist = therapistUsers[patientIndex % therapistUsers.length];
    if (!profile || !therapist) continue;

    const sessions = [
      { offset: -5, status: 'COMPLETED', paymentStatus: 'PAID' },
      { offset: -1, status: 'COMPLETED', paymentStatus: 'PAID' },
      { offset: 2, status: 'CONFIRMED', paymentStatus: 'PAID' },
    ];

    for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex += 1) {
      const session = sessions[sessionIndex];
      const bookingReferenceId = `SEED-${patientIndex + 1}-${sessionIndex + 1}`;
      await prisma.therapySession.upsert({
        where: { bookingReferenceId },
        update: {
          patientProfileId: profile.id,
          therapistProfileId: therapist.id,
          dateTime: plusDays(session.offset),
          durationMinutes: 50,
          sessionFeeMinor: BigInt(249900),
          paymentStatus: session.paymentStatus,
          status: session.status,
        },
        create: {
          bookingReferenceId,
          patientProfileId: profile.id,
          therapistProfileId: therapist.id,
          dateTime: plusDays(session.offset),
          durationMinutes: 50,
          sessionFeeMinor: BigInt(249900),
          paymentStatus: session.paymentStatus,
          status: session.status,
        },
      });
    }
  }

  for (const patient of patientUsers) {
    const profile = profileByUserId.get(patient.id);
    if (!profile) continue;

    const [allSessions, allExercises, firstAssessment, latestAssessment] = await Promise.all([
      prisma.therapySession.findMany({ where: { patientProfileId: profile.id }, select: { status: true } }),
      patientExerciseModel ? patientExerciseModel.findMany({ where: { patientId: profile.id }, select: { status: true } }) : Promise.resolve([]),
      patientAssessmentModel
        ? patientAssessmentModel.findFirst({ where: { patientId: profile.id }, orderBy: { createdAt: 'asc' }, select: { totalScore: true } })
        : Promise.resolve(null),
      patientAssessmentModel
        ? patientAssessmentModel.findFirst({ where: { patientId: profile.id }, orderBy: { createdAt: 'desc' }, select: { totalScore: true } })
        : Promise.resolve(null),
    ]);

    const totalSessions = allSessions.length;
    const sessionsCompleted = allSessions.filter((item) => String(item.status) === 'COMPLETED').length;
    const totalExercises = allExercises.length;
    const exercisesCompleted = allExercises.filter((item) => String(item.status).toUpperCase() === 'COMPLETED').length;

    if (patientProgressModel) {
      await patientProgressModel.upsert({
        where: { patientId: profile.id },
        update: {
          sessionsCompleted,
          totalSessions,
          exercisesCompleted,
          totalExercises,
          phqStart: firstAssessment?.totalScore ?? null,
          phqCurrent: latestAssessment?.totalScore ?? null,
        },
        create: {
          patientId: profile.id,
          sessionsCompleted,
          totalSessions,
          exercisesCompleted,
          totalExercises,
          phqStart: firstAssessment?.totalScore ?? null,
          phqCurrent: latestAssessment?.totalScore ?? null,
        },
      });
    }
  }

  console.log('Seed complete ✅');
  console.log(`Default password for seeded users: ${DEFAULT_PASSWORD}`);
}

seed()
  .catch((error) => {
    console.error('Seed failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
