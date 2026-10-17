import { MockIntraUser, format42ProjectDate } from "./mock-data";

export function extractIntraProfile(me: any): MockIntraUser {
  // 1. Extract 42cursus data (cursus_id === 21)
  const cursus42 =
    me.cursus_users?.find((c: any) => c.cursus_id === 21) ||
    me.cursus_users?.sort((a: any, b: any) => (b.level || 0) - (a.level || 0))[0];

  // 2. Primary campus
  const primaryCampus = me.campus_users?.find((c: any) => c.is_primary);
  const campusObj =
    me.campus?.find((c: any) => c.id === primaryCampus?.campus_id) ||
    me.campus?.[0] || { id: 43, name: "Beirut" };

  // 3. Extract validated 42 projects (cursus 21)
  const validatedProjects: MockIntraUser["validatedProjects"] = (me.projects_users || [])
    .filter((pu: any) => {
      const isValid = pu["validated?"] === true || (pu.status === "finished" && (pu.final_mark || 0) >= 75);
      const isCursus21 = !pu.cursus_ids || pu.cursus_ids.length === 0 || pu.cursus_ids.includes(21);
      return isValid && isCursus21;
    })
    .map((pu: any) => {
      const rawSlug = pu.project?.slug || pu.project?.name?.toLowerCase().replace(/[^a-z0-9]/g, "-") || "";
      const cleanSlug = rawSlug.replace(/^42cursus-/, "");
      const rawDate = pu.marked_at || pu.updated_at || new Date().toISOString();
      return {
        id: pu.project?.id || Math.floor(Math.random() * 10000),
        name: pu.project?.name || cleanSlug,
        slug: cleanSlug,
        finalMark: pu.final_mark || 100,
        validated: true,
        markedAt: rawDate,
        date: format42ProjectDate(rawDate),
      };
    });

  // Sort descending chronologically (newest projects first)
  validatedProjects.sort(
    (a, b) => new Date(b.markedAt).getTime() - new Date(a.markedAt).getTime()
  );

  return {
    id: me.id,
    login: me.login,
    email: me.email,
    displayname: me.usual_full_name || me.displayname || me.login,
    image: me.image?.link || me.image?.versions?.medium || "",
    campusName: campusObj.name || "Beirut",
    campusId: campusObj.id || 43,
    level: cursus42 ? parseFloat(cursus42.level.toFixed(2)) : 0.0,
    grade: cursus42?.grade || "Learner",
    poolMonth: me.pool_month || "",
    poolYear: me.pool_year ? parseInt(me.pool_year) : 2024,
    coalition: "42 Beirut",
    beginAt: cursus42?.begin_at || new Date().toISOString(),
    validatedProjects,
  };
}
