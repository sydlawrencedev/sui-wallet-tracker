'use client';

interface DateRangePickerProps {
  dateRange: { start: Date; end: Date };
  setDateRange: (range: { start: Date; end: Date }) => void;
}

export function DateRangePicker({
  dateRange,
  setDateRange,
}: DateRangePickerProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      marginBottom: '1.5rem'
    }}>


      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backgroundColor: 'var(--card-bg)',
          padding: '0.5rem',
          borderRadius: '0.5rem',
          border: '1px solid var(--border-color)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="date"
              value={dateRange.start.toISOString().split('T')[0]}
              onChange={(e) => setDateRange({ ...dateRange, start: new Date(e.target.value) })}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)',
                fontSize: '0.875rem',
                lineHeight: '1.25rem'
              }}
              max={dateRange.end.toISOString().split('T')[0]}
            />
          </div>
          <span style={{ color: 'var(--text-light)', fontSize: '0.875rem' }}>to</span>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="date"
              value={dateRange.end.toISOString().split('T')[0]}
              onChange={(e) => setDateRange({ ...dateRange, end: new Date(e.target.value) })}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--card-bg)',
                color: 'var(--text-color)',
                fontSize: '0.875rem',
                lineHeight: '1.25rem'
              }}
              min={dateRange.start.toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
