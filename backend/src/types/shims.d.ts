declare module '@prisma/client';
declare module 'pdfkit';
declare module 'fast-csv';

// Provide a loose type for the AWS SDK s3 presigner imports used in services
declare module '@aws-sdk/s3-request-presigner';

// Catch-all for any other non-typed modules used temporarily
declare module '*';
