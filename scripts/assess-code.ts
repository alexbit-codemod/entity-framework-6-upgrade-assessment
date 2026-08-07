import { writeFileSync } from "fs";
import { analyzeTargetDirectory, WORKFLOW_STEP } from "./analyzer";

export default function transform(root: any, api: any) {
  const store = api.store || {};
  if (!store.hasAnalyzed) {
    store.hasAnalyzed = true;
    
    const targetDir = process.cwd();
    const metricsPayload = analyzeTargetDirectory(targetDir);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Entity Framework Migration Readiness & Insights Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #0b0f19;
      --bg-card: rgba(18, 26, 43, 0.85);
      --bg-card-hover: rgba(26, 38, 64, 0.95);
      --border-color: rgba(255, 255, 255, 0.08);
      --text-primary: #f8fafc;
      --text-secondary: #94a3b8;
      --accent-indigo: #6366f1;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', system-ui, sans-serif; background-color: var(--bg-dark); color: var(--text-primary); padding: 2.5rem; line-height: 1.6; }
    .container { max-width: 1380px; margin: 0 auto; }
    .top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; padding: 1rem 1.5rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); border-radius: 0.75rem; }
    .brand-logo { font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }
    .action-btn { background: linear-gradient(135deg, var(--accent-indigo), #4f46e5); color: white; border: none; padding: 0.5rem 1.25rem; border-radius: 0.5rem; font-weight: 600; cursor: pointer; }
    header { margin-bottom: 2.5rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--border-color); }
    h1 { font-size: 2.5rem; font-weight: 800; background: linear-gradient(135deg, #ffffff 0%, #818cf8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .insights-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2.5rem; }
    .insight-card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 1rem; padding: 1.5rem; }
    .card-label { font-size: 0.875rem; font-weight: 600; color: var(--text-secondary); }
    .card-value { font-size: 2.25rem; font-weight: 800; margin: 0.35rem 0; font-family: 'JetBrains Mono', monospace; }
    .data-table { width: 100%; border-collapse: collapse; margin-top: 1rem; text-align: left; }
    .data-table th, .data-table td { padding: 0.875rem 1rem; border-bottom: 1px solid rgba(255, 255, 255, 0.04); }
    .data-table th { background: rgba(255, 255, 255, 0.03); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase; }
    .code-symbol { font-family: 'JetBrains Mono', monospace; color: #818cf8; background: rgba(99, 102, 241, 0.1); padding: 0.2rem 0.5rem; border-radius: 0.375rem; }
  </style>
</head>
<body>
<div class="container">
  <div class="top-bar">
    <div class="brand-logo">Codemod Insights • Automated Analyzer</div>
    <button class="action-btn" onclick="window.print()">Print / Export PDF</button>
  </div>
  <header>
    <h1>Entity Framework Migration Assessment Report</h1>
    <p>Consolidated Single-Step Metrics Emitter (step: ${WORKFLOW_STEP})</p>
  </header>
  <div class="insights-grid">
    ${metricsPayload.metrics.slice(0, 4).map(m => `
      <div class="insight-card">
        <div class="card-label">${m.label}</div>
        <div class="card-value">${m.value}</div>
        <div style="font-size: 0.8125rem; color: #64748b;">${m.description}</div>
      </div>
    `).join("")}
  </div>
  <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 1rem; padding: 1.5rem;">
    <h2 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 1rem;">Consolidated Codemod Insights Named Metrics Breakdown</h2>
    <p style="font-size: 0.875rem; color: #94a3b8; margin-bottom: 1rem;">Emitted from single step ID: <span class="code-symbol">${WORKFLOW_STEP}</span></p>
    <table class="data-table">
      <thead>
        <tr>
          <th>Metric Identifier</th>
          <th>Metric Label</th>
          <th>Value</th>
          <th>Category</th>
        </tr>
      </thead>
      <tbody>
        ${metricsPayload.metrics.map(m => `
          <tr>
            <td><span class="code-symbol">${m.name}</span></td>
            <td>${m.label}</td>
            <td>${m.value}</td>
            <td>${m.category}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
</div>
</body>
</html>`;

    try {
      writeFileSync("metrics.json", JSON.stringify(metricsPayload, null, 2));
      writeFileSync("EF_MIGRATION_ASSESSMENT_REPORT.html", htmlContent);
    } catch (e) {
      // Fallback
    }

    console.log(JSON.stringify(metricsPayload, null, 2));
  }

  return null;
}
