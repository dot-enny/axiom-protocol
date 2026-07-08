export function truncateMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
