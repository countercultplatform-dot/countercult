const TIME_ZONE = "Europe/Berlin";

type ZonedDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const berlinDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function getBerlinDateParts(date: Date): ZonedDateParts {
  const parts = berlinDateTimeFormatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => {
    const part = parts.find((entry) => entry.type === type)?.value;
    if (!part) throw new Error(`Missing ${type} while formatting the Berlin cutoff.`);
    return Number(part);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function getBerlinMidnight(year: number, monthIndex: number, day: number): Date {
  const targetAsUtc = Date.UTC(year, monthIndex, day);
  let timestamp = targetAsUtc;

  // Adjust the UTC guess until it represents midnight in Europe/Berlin.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const parts = getBerlinDateParts(new Date(timestamp));
    const representedAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const adjustment = targetAsUtc - representedAsUtc;
    if (adjustment === 0) break;
    timestamp += adjustment;
  }

  return new Date(timestamp);
}

export function getNextPatronPostCutoff(now: Date): Date {
  const localDate = getBerlinDateParts(now);
  const currentMonthCutoff = getBerlinMidnight(localDate.year, localDate.month - 1, 5);

  if (now.getTime() < currentMonthCutoff.getTime()) {
    return currentMonthCutoff;
  }

  return getBerlinMidnight(localDate.year, localDate.month, 5);
}

export function getPatronPostCutoffCountdown(now: Date) {
  const deadline = getNextPatronPostCutoff(now);
  const totalSeconds = Math.max(0, Math.floor((deadline.getTime() - now.getTime()) / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  return {
    deadline,
    deadlineLabel: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      day: "numeric",
      month: "short",
    }).format(deadline),
    mailingMonthLabel: new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      month: "long",
    }).format(deadline),
    days,
    hours,
    minutes,
  };
}
