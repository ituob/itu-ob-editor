import * as moment from 'moment';


export function reviveJsonValue(key: string, val: any) {
  const timestamp = moment(val, moment.ISO_8601, true);
  if (timestamp.isValid()) {
    return timestamp.toDate();
  }
  return val;
}
