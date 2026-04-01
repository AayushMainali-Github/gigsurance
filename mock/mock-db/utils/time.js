const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

function monthsAgoStart(months) {
  return dayjs.utc().subtract(months, "month").startOf("day");
}

function nowUtc() {
  return dayjs.utc();
}

function monthsAgoExact(months, from = nowUtc()) {
  return from.clone().subtract(months, "month");
}

function dateKey(value) {
  return dayjs.utc(value).format("YYYY-MM-DD");
}

module.exports = { dayjs, nowUtc, monthsAgoStart, monthsAgoExact, dateKey };
