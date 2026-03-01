# Admin Metrics - Aggregation Pipelines & Performance Guide

## Overview
This document details the PostgreSQL aggregation strategies used in the metrics endpoint and provides performance optimization guidelines.

---

## 🏗️ Architecture Overview

```
Request: GET /api/v1/admin/metrics
    ↓
Authentication Check (requireAuth)
    ↓
Authorization Check (requireAdminRole)
    ↓
getMetricsController
    ↓
getMetrics() Service Function
    ↓
6 Parallel PostgreSQL Operations
    ├─ CountDocuments: totalUsers
    ├─ CountDocuments: totalTherapists
    ├─ CountDocuments: verifiedTherapists
    ├─ CountDocuments: completedSessions
    ├─ Aggregation Pipeline: totalRevenue
    └─ CountDocuments: activeSubscriptions
    ↓
Response Assembly (< 200ms total)
    ↓
JSON Response: 200 OK
```

---

## 📊 Detailed Aggregation Pipelines

### Query 1: Total Active Users

**Type**: CountDocuments  
**Execution Time**: 10-50ms (with index)

```javascript
// PostgreSQL Native
db.users.countDocuments({ isDeleted: false })

// Prisma TypeScript
await UserModel.countDocuments({ isDeleted: false })
```

**Filter Logic**:
- Only count users with `isDeleted = false`
- Soft deletion pattern ensures user data preservation
- Index: `{ isDeleted: 1 }`

**Optimization**:
```javascript
// Index Creation
db.users.createIndex({ isDeleted: 1 })

// Explain Plan
db.users.find({ isDeleted: false }).explain("executionStats")
```

**Expected Results**:
- Small platform (< 100K users): ~10-20ms
- Medium platform (100K-1M): ~20-50ms
- Large platform (> 1M): ~50-100ms

---

### Query 2: Total Therapist Profiles

**Type**: CountDocuments  
**Execution Time**: 10-50ms

```javascript
db.therapistprofiles.countDocuments({ deletedAt: null })
```

**Filter Logic**:
- Count all non-deleted therapist profiles
- Soft deletion via `deletedAt` field (null = active)
- Includes both verified and unverified

**Optimization**:
```javascript
db.therapistprofiles.createIndex({ deletedAt: 1 })
```

**Query Plan**:
```
COLLSCAN or INDEX_SCAN (if index exists)
    ↓
FILTER: deletedAt = null
    ↓
COUNT
```

---

### Query 3: Verified Therapists Count

**Type**: CountDocuments with Multiple Conditions  
**Execution Time**: 10-50ms

```javascript
db.therapistprofiles.countDocuments({
  isVerified: true,
  deletedAt: null
})
```

**Filter Logic**:
- `isVerified = true`: Therapist credentials verified by admin
- `deletedAt = null`: Profile not soft-deleted
- Both conditions indexed

**Optimization Strategy**:
```javascript
// Single index covering both conditions
db.therapistprofiles.createIndex({ 
  isVerified: 1,
  deletedAt: 1
})

// Or separate indexes
db.therapistprofiles.createIndex({ isVerified: 1 })
db.therapistprofiles.createIndex({ deletedAt: 1 })
```

**Index Selection Analysis**:
```javascript
// Explain the query
db.therapistprofiles.find({
  isVerified: true,
  deletedAt: null
}).explain("executionStats")

// Expected output:
// "executionStages": {
//   "stage": "FETCH",
//   "inputStage": {
//     "stage": "IXSCAN",
//     "indexName": "isVerified_1_deletedAt_1",
//     "keysExamined": 156,
//     "docsExamined": 156
//   }
// }
```

---

### Query 4: Completed Sessions Count

**Type**: CountDocuments  
**Execution Time**: 10-50ms

```javascript
db.therapysessions.countDocuments({ status: "completed" })
```

**Status Enum Values**:
```typescript
status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
```

**Optimization**:
```javascript
db.therapysessions.createIndex({ status: 1 })

// Alternative - Partial Index (BEST for terminal statuses)
db.therapysessions.createIndex(
  { status: 1 },
  { partialFilterExpression: { status: { $in: ['completed', 'cancelled'] } } }
)
```

**Query Performance**:
- With index: **O(log n)**
- Without index: **O(n)** - full collection scan

**Estimated Collection Size Impact**:
| System Size | Sessions | Execution Time |
|------------|----------|-----------------|
| Small      | 1-10K    | 5-10ms          |
| Medium     | 10K-1M   | 15-50ms         |
| Large      | 1M+      | 50-200ms        |

---

### Query 5: Total Revenue (Aggregation Pipeline)

**Type**: Aggregation Pipeline  
**Execution Time**: 20-100ms

```javascript
db.wallettransactions.aggregate([
  {
    $group: {
      _id: null,
      totalAmount: { $sum: "$amount" }
    }
  },
  {
    $project: {
      _id: 0,
      totalAmount: 1
    }
  }
])
```

**Stage Breakdown**:

#### Stage 1: `$group`
```javascript
{
  $group: {
    _id: null,              // Group all documents together
    totalAmount: { $sum: "$amount" }  // Sum all 'amount' fields
  }
}
```

**Behavior**:
- `_id: null`: Single group for entire result set
- `$sum: "$amount"`: Accumulator that sums all amounts
- Returns single document with total

**Performance**:
- Time complexity: **O(n)** where n = number of documents
- Memory usage: **O(1)** - only maintains running sum
- Can use index on `amount` field (minimal benefit)

#### Stage 2: `$project`
```javascript
{
  $project: {
    _id: 0,           // Exclude _id field
    totalAmount: 1    // Include totalAmount field
  }
}
```

**Purpose**: Remove the grouping key `_id` for cleaner output

**Output Format**:
```javascript
[
  {
    totalAmount: 125478.50
  }
]
```

---

### Full Revenue Pipeline Execution

```javascript
// Step 1: Filter (optional, if using date range)
[{
  $match: {
    status: "success",
    // createdAt: { $gte: new Date('2024-01-01') }  // Optional time filter
  }
}]

// Step 2: Group and Sum
[{
  $group: {
    _id: null,
    totalAmount: { $sum: "$amount" },
    transactionCount: { $sum: 1 }  // Also count transactions
  }
}]

// Step 3: Project and Round
[{
  $project: {
    _id: 0,
    totalAmount: {
      $round: ["$totalAmount", 2]  // Round to 2 decimal places
    },
    transactionCount: 1
  }
}]
```

---

### Query 6: Active Subscriptions

**Type**: CountDocuments with Multiple Conditions  
**Execution Time**: 10-50ms

```javascript
db.therapistprofiles.countDocuments({
  isVerified: true,
  deletedAt: null,
  currentActivePatients: { $gt: 0 }
})
```

**Definition**: Therapists actively treating patients

**Filter Conditions**:
1. `isVerified: true` - Credential verified
2. `deletedAt: null` - Profile active
3. `currentActivePatients: { $gt: 0 }` - Has ongoing patient load

**Optimization**:
```javascript
// Best: Compound index covering all conditions
db.therapistprofiles.createIndex({
  isVerified: 1,
  deletedAt: 1,
  currentActivePatients: 1
})

// Alternative: Separate indexes
db.therapistprofiles.createIndex({ isVerified: 1 })
db.therapistprofiles.createIndex({ deletedAt: 1 })
db.therapistprofiles.createIndex({ currentActivePatients: 1 })
```

**Query Execution Plan**:
```
Index Range Scan:
  isVerified = true
    → Check deletedAt = null
    → Check currentActivePatients > 0
    → Increment count
```

---

## 🔋 Parallel Execution Strategy

### Implementation
```typescript
const [result1, result2, result3, result4, result5, result6] = await Promise.all([
  UserModel.countDocuments({ isDeleted: false }),
  TherapistProfileModel.countDocuments({ deletedAt: null }),
  TherapistProfileModel.countDocuments({ isVerified: true, deletedAt: null }),
  TherapySessionModel.countDocuments({ status: 'completed' }),
  WalletTransactionModel.aggregate([...]),
  TherapistProfileModel.countDocuments({ isVerified: true, deletedAt: null, currentActivePatients: { $gt: 0 } }),
])
```

### Time Complexity Analysis

**Sequential Execution**:
```
Total Time = Q1 + Q2 + Q3 + Q4 + Q5 + Q6
           = 30 + 25 + 40 + 35 + 75 + 30 (ms)
           = 235 ms
```

**Parallel Execution** (with Promise.all):
```
Total Time = MAX(Q1, Q2, Q3, Q4, Q5, Q6)
           = MAX(30, 25, 40, 35, 75, 30)
           = 75 ms (slowest query)

Speedup Factor = 235ms / 75ms = 3.13x ✨
```

### Benefits
1. **Reduced Latency**: Total response time < 100ms
2. **Database Efficiency**: All indexes are scanned in parallel
3. **Connection Pool Optimization**: Better connection reuse
4. **Scalability**: Adding more metrics doesn't increase response time linearly

---

## 🏆 Performance Optimization Checklist

### ✅ Index Creation Commands

Run these in PostgreSQL:

```javascript
// Users Collection
db.users.createIndex({ isDeleted: 1 })
db.users.createIndex({ role: 1 })
db.users.createIndex({ email: 1 })

// TherapistProfile Collection
db.therapistprofiles.createIndex({ isVerified: 1 })
db.therapistprofiles.createIndex({ deletedAt: 1 })
db.therapistprofiles.createIndex({ currentActivePatients: 1 })
db.therapistprofiles.createIndex({
  isVerified: 1,
  deletedAt: 1,
  currentActivePatients: 1
})

// TherapySession Collection
db.therapysessions.createIndex({ status: 1 })
db.therapysessions.createIndex({ status: 1, dateTime: -1 })
db.therapysessions.createIndex({
  therapistId: 1,
  dateTime: 1
}, { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } })

// WalletTransaction Collection
db.wallettransactions.createIndex({ therapistId: 1, createdAt: -1 })
db.wallettransactions.createIndex({ status: 1 })
db.wallettransactions.createIndex({ amount: 1 })
```

### ✅ Performance Monitoring

```javascript
// Check index statistics
db.collection.getIndexes()

// Analyze query performance
db.collection.find({ ... }).explain("executionStats")

// Monitor actual execution
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find().sort({ ts: -1 }).limit(10)
```

### ✅ Response Time Benchmarks

| Scenario | Expected Time | Acceptable | Alert Level |
|----------|---------------|-----------|-------------|
| Small DB (< 1M docs) | 30-100ms | < 200ms | > 500ms |
| Medium DB (1M-10M docs) | 50-150ms | < 300ms | > 1000ms |
| Large DB (> 10M docs) | 100-300ms | < 500ms | > 2000ms |

---

## 📈 Scaling Considerations

### For Small Platforms (< 100K users)
- Simple countDocuments queries sufficient
- Single database instance adequate
- Response time: < 50ms

### For Medium Platforms (100K - 10M)
- Maintain index coverage
- Consider read replicas for metrics queries
- Response time: 50-200ms
- Implement 5-min cache if needed

### For Large Platforms (> 10M)
- Implement **metrics cache** (Redis)
- Use **read-only replica** for metrics
- Consider **time-series DB** for trendline data
- Response time: 100-500ms (or cached < 5ms)

### Cache Strategy
```typescript
interface CachedMetrics {
  data: Metrics;
  fetchedAt: Date;
  ttl: number; // 300s = 5 minutes
}

const metricsCache: Map<string, CachedMetrics> = new Map();

export const getMetricsWithCache = async (): Promise<Metrics> => {
  const cached = metricsCache.get('platform:metrics');
  
  if (cached && Date.now() - cached.fetchedAt.getTime() < cached.ttl * 1000) {
    return cached.data;
  }
  
  const metrics = await getMetrics();
  
  metricsCache.set('platform:metrics', {
    data: metrics,
    fetchedAt: new Date(),
    ttl: 300
  });
  
  return metrics;
};
```

---

## 🐛 Troubleshooting

### Issue: Metrics endpoint returns `totalRevenue: 0`
**Causes**:
1. No WalletTransaction documents exist
2. `amount` field is missing on some documents
3. Database connection issue

**Debug**:
```javascript
// Check if transactions exist
db.wallettransactions.countDocuments()

// Check transaction structure
db.wallettransactions.findOne()

// Run aggregation manually
db.wallettransactions.aggregate([{$group: {_id: null, total: {$sum: "$amount"}}}])
```

### Issue: Metrics endpoint slow (> 500ms)
**Check**:
1. Missing indexes - run `EXPLAIN` on each query
2. Index fragmentation - rebuild if needed
3. Long-running operations - check profiler logs
4. Connection pool exhaustion - check pool settings

**Commands**:
```javascript
// Explain each query
db.users.find({ isDeleted: false }).explain("executionStats")
db.therapistprofiles.find({ isVerified: true, deletedAt: null }).explain("executionStats")

// Rebuild indexes if fragmented
db.therapistprofiles.reIndex()

// Check query profiler
db.setProfilingLevel(1, { slowms: 100 })
db.system.profile.find({ millis: { $gt: 100 } }).pretty()
```

### Issue: Incorrect therapist count
**Verify**:
1. Soft deletion logic - check `deletedAt` vs `isDeleted`
2. Verification logic - ensure `isVerified` field is properly set
3. Index corruption - rebuild affected indexes

**Validation Script**:
```javascript
// Verify counts manually
const total = db.therapistprofiles.countDocuments({})
const verified = db.therapistprofiles.countDocuments({ isVerified: true })
const active = db.therapistprofiles.countDocuments({ deletedAt: null })
const activeVerified = db.therapistprofiles.countDocuments({ 
  isVerified: true, 
  deletedAt: null 
})

console.log(`Total: ${total}, Active: ${active}, Verified: ${verified}, Active+Verified: ${activeVerified}`)
```

---

## 📊 Example Metrics Response Over Time

```
Date       | Total Users | Therapists | Verified | Sessions | Revenue
-----------|-------------|-----------|----------|----------|----------
2024-01-01 | 500         | 45        | 28       | 250      | ₹12,500
2024-02-01 | 1,200       | 120       | 87       | 1,100    | ₹45,200
2024-03-01 | 2,100       | 250       | 156      | 3,891    | ₹125,478
2024-04-01 | 3,500       | 420       | 287      | 8,200    | ₹385,500

Growth Rate (Q1 2024):
- Users: 7x
- Therapists: 9.3x
- Verified: 10.2x
- Sessions: 32.8x
- Revenue: 30.8x
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist
- [ ] All indexes created and verified
- [ ] Performance tested with production dataset
- [ ] Metrics validated against manual counts
- [ ] Cache strategy (if needed) implemented
- [ ] Monitoring/alerting configured
- [ ] API rate limiting set up
- [ ] Audit logging enabled
- [ ] Documentation complete
- [ ] Load testing completed (> expected load)
- [ ] Rollback plan documented

### Production Monitoring
```javascript
// Set up slow query logs
db.setProfilingLevel(1, { slowms: 200 })

// Monitor response times in application
app.get('/api/v1/admin/metrics', (req, res) => {
  const startTime = Date.now();
  
  // ... endpoint logic ...
  
  const duration = Date.now() - startTime;
  logger.info(`Metrics endpoint: ${duration}ms`);
  
  if (duration > 500) {
    alerts.warn(`Slow metrics query: ${duration}ms`);
  }
});
```

---

**Last Updated**: February 27, 2026  
**Performance Level**: Optimized for production 10M+ datasets
