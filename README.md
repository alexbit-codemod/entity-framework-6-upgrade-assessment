# bytestrone-ef-migration-assessment-bundle (v1.0.13)

> **Type**: Read-Only Mining Codemod & Codemod Insights Metrics Emitter  
> **Target**: .NET Framework 4.x / EF6 Solution Repositories  

## Overview

`bytestrone-ef-migration-assessment-bundle` is a read-only **Mining Codemod** that mines .NET repositories to assess Entity Framework 6 (EF6) to EF Core 8 migration readiness, architectural risk, and modernization effort.

It performs **zero code modifications** to your codebase and emits standard Codemod Insights metric events (`metrics.json`) and an interactive HTML assessment report (`EF_MIGRATION_ASSESSMENT_REPORT.html`).

---

## Single-Step Insights Architecture

To adhere to Codemod platform rules where dashboard widgets bind to one specific step, all mining metrics and cardinality tables are emitted from a single consolidated step:

* **Step ID**: `analyze-dbcontext-and-orm-patterns`
* **Parser Language**: `csharp` (`include: ["**/*.cs"]`)

---

## Emitted Insights Metrics

| Metric Identifier | Label | Category | Severity | Description |
| :--- | :--- | :--- | :--- | :--- |
| `ef65_readiness_score` | EF 6.5 Upgrade Readiness Index (%) | readiness | warning | Readiness index for EF 6.5 stabilization |
| `efcore8_readiness_score` | EF Core 8 Modernization Readiness Index (%) | readiness | critical | Readiness index for full EF Core 8 migration |
| `ef_risk_score` | EF Migration Risk Score (0-100) | risk | critical | Weighted risk score based on legacy API usage |
| `total_projects` | Total Solution Projects count | inventory | info | Count of .csproj files in solution |
| `legacy_csproj_count` | Legacy verbose .csproj count | inventory | warning | Non-SDK MSBuild project files |
| `ef_version` | Primary EF package version | inventory | info | Detected Entity Framework version |
| `ef_objectcontext_usages` | Legacy ObjectContext class usages | blockers | critical | Usages of legacy ObjectContext API |
| `idbset_count` | IDbSet<T> properties count | blockers | warning | Repository properties using IDbSet<T> |
| `virtual_nav_props` | Virtual navigation properties | inventory | warning | Virtual properties relying on lazy loading |
| `ef_entity_type_configuration_classes` | EntityTypeConfiguration<T> count | blockers | warning | Fluent API entity mapping configuration classes |
| `ef_execute_sql_command_calls` | ExecuteSqlCommand call sites | blockers | critical | Raw SQL execution call sites |
| `ef_database_set_initializer_calls` | SetInitializer call sites | blockers | critical | Database initializer call sites |
| `ef_migration_blockers` | Total migration blocker count | blockers | critical | Total blocker records |
| `estimated_story_points` | Modernization Story Points | effort | warning | Weighted Story Point calculation |
| `estimated_dev_hours` | Developer Engineering Hours | effort | warning | Estimated engineering effort in hours |

---

## Cardinality Tables

* `blockerTypes`: `{ blockerType, file, severity }`
* `mappedTypes`: `{ mappedType, configurationClass, file }`

---

## Execution

```bash
# Run locally
npx codemod workflow run --allow-fs -w workflow.yaml -t path/to/your/dotnet-repo

# Publish to Codemod Registry
npx codemod publish
```
