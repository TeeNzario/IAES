const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_INPUT_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

interface TimeParts {
  hours: number;
  minutes: number;
  seconds: number;
}

export function parseDateInput(value: string): Date | null {
  const match = DATE_INPUT_PATTERN.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function parseTimeInput(value: string): TimeParts | null {
  const match = TIME_INPUT_PATTERN.exec(value);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] ? Number(match[3]) : 0;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;

  return { hours, minutes, seconds };
}

export function createLocalDateTime(
  dateInput: string,
  timeInput: string,
): Date | null {
  const date = parseDateInput(dateInput);
  const time = parseTimeInput(timeInput);
  if (!date || !time) return null;

  const dateTime = new Date(date);
  dateTime.setHours(time.hours, time.minutes, time.seconds, 0);
  return dateTime;
}

export function parseDateTimeLocalInput(value: string): {
  date: Date | null;
  invalidPart?: "date" | "time";
} {
  const [dateInput, timeInput, extra] = value.split("T");
  if (!dateInput || !timeInput || extra !== undefined) {
    return { date: null, invalidPart: "date" };
  }

  if (!parseDateInput(dateInput)) {
    return { date: null, invalidPart: "date" };
  }

  if (!parseTimeInput(timeInput)) {
    return { date: null, invalidPart: "time" };
  }

  return { date: createLocalDateTime(dateInput, timeInput) };
}

export function dateOnlyMs(date: Date): number {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
}
