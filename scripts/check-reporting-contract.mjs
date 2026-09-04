import fs from "node:fs";
const required={
 "server/reporting-workflow.ts":["ReportView","executive","technical","disclosure","retest","privateByDefault: true","contentHash","sanitized"],
 "server/rest-v1-reporting.ts":["/api/v1/workspaces/:workspaceId/reports","/api/v1/reports/:id/status","/api/v1/reports/:id/export"],
 "docs/domain/11-reporting.md":["report generation","templates","exports","disclosure packages","retest reporting"]
};
const missing=[];
for(const [file,markers] of Object.entries(required)){if(!fs.existsSync(file)){missing.push(`${file}: missing`);continue;}const t=fs.readFileSync(file,"utf8");for(const m of markers)if(!t.includes(m))missing.push(`${file}: missing ${m}`);}
if(missing.length){console.error(missing.join("\n"));process.exit(1)}
console.log("Reporting contract PASS: generation, templates, exports, disclosure, retest and versioned reports.");
