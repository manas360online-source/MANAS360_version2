import React from 'react';

const Card: React.FC<{ title: string; value: React.ReactNode; hint?: string }> = ({ title, value, hint }) => (
  <div className="bg-white p-3 rounded border">
    <div className="text-xs text-gray-500">{title}</div>
    <div className="text-2xl font-semibold mt-1">{value}</div>
    {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
  </div>
);

const AnalyticsSummary: React.FC = () => {
  return (
    <div className="grid grid-cols-1 gap-3">
      <Card title="Active Sessions" value={12} hint="Live now" />
      <Card title="Avg Response Time" value={'320ms'} hint="p90" />
      <Card title="Pending ACKs" value={3} hint="Needs attention" />
      <Card title="Messages / min" value={24} hint="Last 5m" />
    </div>
  );
};

export default AnalyticsSummary;
