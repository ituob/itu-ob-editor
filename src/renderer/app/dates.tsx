import * as React from 'react';


interface DateStampProps { date: Date }

export function DateStamp(props: DateStampProps) {
  return (
    <React.Fragment>
      <span className={'day'}>{props.date.getDate()}</span
        ><span className={'separator'}>.</span
        ><span className={'month'}>{monthAsRoman(props.date.getMonth() + 1)}</span
        ><span className={'separator'}>.</span
        ><span className={'year'}>{props.date.getFullYear()}</span>
    </React.Fragment>
  );
}


// Takes number of the month (starting with 1 for January)
// and returns a corresponding Roman numeral.
function monthAsRoman(num: number): string {
  const romanMonths: { [num: number]: string } = {
    1: 'I',
    2: 'II',
    3: 'III',
    4: 'IV',
    5: 'V',
    6: 'VI',
    7: 'VII',
    8: 'VIII',
    9: 'IX',
    10: 'X',
    11: 'XI',
    12: 'XII',
  }
  return romanMonths[num];
}
