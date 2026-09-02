interface TimeDisplayProps {
  timestampSeconds: number | null;
  className?: string;
  fallback?: string;
}

const dateFormatter = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

const pluralize = (value: number, unit: string) =>
  `${value} ${unit}${value === 1 ? "" : "s"}`;

const formatDuration = (days: number) => {
  const years = Math.floor(days / 365);
  const daysAfterYears = days % 365;
  if (years > 0) {
    return `${pluralize(years, "year")}${daysAfterYears > 0 ? ` ${pluralize(daysAfterYears, "day")}` : ""}`;
  }

  const months = Math.floor(days / 30);
  const daysAfterMonths = days % 30;
  if (months > 0) {
    return `${pluralize(months, "month")}${daysAfterMonths > 0 ? ` ${pluralize(daysAfterMonths, "day")}` : ""}`;
  }

  return pluralize(days, "day");
};

export function RelativeExpiry({
  className,
  fallback = "No expiry indexed",
  timestampSeconds,
}: TimeDisplayProps) {
  if (timestampSeconds === null)
    return <span className={className}>{fallback}</span>;

  const date = new Date(timestampSeconds * 1000);
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);

  return (
    <time className={className} dateTime={date.toISOString()}>
      {days <= 0 ? "Expired" : `Expires in ${formatDuration(days)}`}
    </time>
  );
}

export function CalendarDate({
  className,
  fallback = "Not indexed",
  timestampSeconds,
}: TimeDisplayProps) {
  if (timestampSeconds === null)
    return <span className={className}>{fallback}</span>;

  const date = new Date(timestampSeconds * 1000);

  return (
    <time className={className} dateTime={date.toISOString()}>
      {dateFormatter.format(date)}
    </time>
  );
}
