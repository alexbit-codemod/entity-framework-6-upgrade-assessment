# .NET Entity Framework Migration Assessment Bundle

## Overview
`bytestrone-ef-migration-assessment-bundle` is a multi-step AST assessment codemod bundle designed to scan any .NET repository and evaluate Entity Framework migration feasibility (e.g., **EF 6.1.3 → EF 6.5.0** or **EF6 → EF Core 8**).

Inspired by the [.NET Migration Assessment Bundle on Codemod Registry](https://app.codemod.com/registry/dotnet-migration-assessment-bundle), this package inspects package declarations, database provider configurations, `DbContext` inheritance, Fluent API mapping rules, raw SQL execution calls, and legacy initializers.

---

## What It Assesses
1. **Package & Provider Inventory**:
   - Entity Framework versions across `packages.config` and `.csproj` files.
   - SQL Server vs. SQL Server Compact (`EntityFramework.SqlServerCompact`) usage.
2. **Context & Repository Architecture**:
   - `DbContext` vs. legacy `ObjectContext` usage.
   - Count of `IDbSet<T>` vs. `DbSet<T>` properties.
3. **Fluent API & Entity Mappings**:
   - `EntityTypeConfiguration<T>` mapping definitions.
4. **Legacy & Deprecated API Surface**:
   - `Database.ExecuteSqlCommand` call sites.
   - `Database.SetInitializer` calls.
   - `DbGeography` / Spatial type usage.

---

## How to Run

Run dry-run assessment mode against any .NET repository:

```bash
npx codemod run bytestrone-ef-migration-assessment-bundle --dry-run
```

Or run directly from this directory:

```bash
npx codemod run ./c:/Antigravity/Codemod/bytestrone-ef-migration-assessment-bundle --dry-run
```

---

## Workflow Steps

```yaml
nodes:
  - id: assess-ef-packages
    name: "Scan & Inventory EF Dependencies"
  - id: assess-dbcontext-and-models
    name: "Analyze DbContext & Entity Mapping Patterns"
  - id: generate-assessment-report
    name: "Generate EF Migration Assessment Report"
```
