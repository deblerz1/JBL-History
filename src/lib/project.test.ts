import { describe, expect, it } from "vitest";

import { project, targetSeasonCount } from "./project";

describe("JBL History project configuration", () => {
  it("targets only the JBL Supabase project", () => {
    expect(project.supabaseProjectRef).toBe("ksoecnzmisoiyyfdgyoa");
  });

  it("covers every season from 2017 through 2026", () => {
    expect(targetSeasonCount).toBe(10);
  });
});
