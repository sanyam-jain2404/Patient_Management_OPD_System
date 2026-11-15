export function getIndiaDateString(date = new Date()) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "Asia/Kolkata"
  });
}
