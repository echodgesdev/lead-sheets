const SECOND_MS = 1000;
const MINUTE_S = 60;
const HOUR_S = 3600;

function pad(n) {
  return String(n).padStart(2, '0');
}

export function dateStamp(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function dateTimeStamp(date) {
  return `${dateStamp(date)} ${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

export function clockTime(ms) {
  const total = Math.max(0, Math.floor(ms / SECOND_MS));
  const hours = Math.floor(total / HOUR_S);
  const minutes = Math.floor((total % HOUR_S) / MINUTE_S);
  const seconds = pad(total % MINUTE_S);
  return hours ? `${hours}:${pad(minutes)}:${seconds}` : `${minutes}:${seconds}`;
}
