import {expect,it} from "vitest";
import {calculateMetric} from "./historian-metrics";
const totals={games:3,wins:1,losses:1,ties:1,points:300,opponentPoints:360};
it("computes reciprocal aggregate scoring ratios and half-win ties",()=>{
  expect(calculateMetric("points_against_to_points_for",totals)).toBe(1.2);
  expect(calculateMetric("points_for_to_points_against",totals)).toBeCloseTo(5/6);
  expect(calculateMetric("win_percentage",totals)).toBe(.5);
  expect(calculateMetric("average_margin",totals)).toBe(-20);
});
it("rejects zero denominators and non-finite inputs without rejecting valid zero numerators",()=>{
  expect(calculateMetric("points_against_to_points_for",{...totals,points:0})).toBeNull();
  expect(calculateMetric("points_against_to_points_for",{...totals,points:Infinity})).toBeNull();
  expect(calculateMetric("points_against_to_points_for",{...totals,opponentPoints:0})).toBe(0);
});
