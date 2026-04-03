/**
 * Generate an .ics calendar event and trigger a download.
 * On mobile, the OS will open the native calendar app automatically.
 */
export function downloadICS({ title, date, kickoff, duration = 120 }) {
  // Parse date and time (kickoff is in BST, UTC+1)
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = kickoff.split(':').map(Number);

  // Create start date in UTC (BST = UTC+1, so subtract 1 hour)
  const start = new Date(Date.UTC(year, month - 1, day, hours - 1, minutes));
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const fmt = (d) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const uid = `wc26-match-${date}-${kickoff.replace(':', '')}@mundial2026`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mundial 2026//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:FIFA World Cup 2026`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT30M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Match starting in 30 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
