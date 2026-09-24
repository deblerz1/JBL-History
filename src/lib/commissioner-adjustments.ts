// Confirmed by commissioner testimony and ESPN screenshots supplied 2026-09-24.
// Team-level only: no player or position attribution was established.
export const confirmedAdjustments=[
 {year:2019,week:11,seasonTeamId:"acb7f3b6-82c6-4002-9102-47e3d70d6ae5",points:17.1},
 {year:2021,week:2,seasonTeamId:"41fb1534-a326-4641-b770-ebcece89ff2a",points:24.9},
 {year:2022,week:17,seasonTeamId:"278ecb29-5148-4fff-88c7-74be5f06c883",points:15},
 {year:2024,week:3,seasonTeamId:"16f0bd63-69ec-4ad7-9007-cbe3f789abcd",points:15.9},
] as const;
export function commissionerAdjustment(year:number,seasonTeamId:string|undefined,weeks:readonly number[]=[]):number {
 return confirmedAdjustments.filter(a=>a.year===year&&a.seasonTeamId===seasonTeamId&&weeks.includes(a.week)).reduce((sum,a)=>sum+a.points,0);
}
