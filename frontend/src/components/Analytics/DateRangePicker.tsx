import React from 'react';

type Props = {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
};

const DateRangePicker: React.FC<Props> = ({ from, to, onChange }) => {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">From</label>
      <input type="date" value={from.slice(0,10)} onChange={(e) => onChange(e.target.value, to)} className="border rounded px-2 py-1 text-sm" />
      <label className="text-sm text-gray-600">To</label>
      <input type="date" value={to.slice(0,10)} onChange={(e) => onChange(from, e.target.value)} className="border rounded px-2 py-1 text-sm" />
    </div>
  );
};

export default DateRangePicker;
