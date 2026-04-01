const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");

dayjs.extend(utc);

function monthsAgoStart(months) {
  return dayjs.utc().subtract(months, "month").startOf("day");
}

function dateKey(value) {
  return dayjs.utc(value).format("YYYY-MM-DD");
}

module.exports = { dayjs, monthsAgoStart, dateKey };
