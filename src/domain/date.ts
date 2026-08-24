export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dayDifference(previousDateKey: string, nextDateKey: string): number {
  const previous = new Date(`${previousDateKey}T12:00:00`);
  const next = new Date(`${nextDateKey}T12:00:00`);
  return Math.round((next.getTime() - previous.getTime()) / 86_400_000);
}
