import { emitMetric } from "codemod:metrics";

export default function transform(root: any, api: any) {
  const filePath = api.file?.path || root.filename?.() || "";

  const store = api.store || {};
  if (!store.metricsStore) {
    store.metricsStore = {
      ef_risk_score: 0,
      ef_objectcontext_usages: 0,
      ef_execute_sql_command_calls: 0,
      ef_database_set_initializer_calls: 0,
      ef_entity_type_configuration_classes: 0,
      ef_migration_blockers: 0,
      blockerTypes: [],
      mappedTypes: [],
    };
  }

  const metrics = store.metricsStore;
  if (!filePath.endsWith(".cs")) return null;

  try {
    const text = root.source ? root.source() : "";

    // 1. EntityTypeConfiguration classes & Mapped Types
    if (text.includes("EntityTypeConfiguration<")) {
      metrics.ef_entity_type_configuration_classes++;
      const match = text.match(/class\s+(\w+)\s*:\s*EntityTypeConfiguration<(\w+)>/);
      const entityName = match ? match[2] : "Entity";
      
      try {
        emitMetric("ef_entity_type_configuration_classes", 1, { mappedType: entityName });
      } catch (e) {
        // Runtime fallback
      }

      if (match) {
        metrics.mappedTypes.push({
          mappedType: match[2],
          configurationClass: match[1],
          file: filePath,
        });
      }
    }

    // 2. ObjectContext Usages (High Risk Blocker)
    if (text.includes(": ObjectContext") || text.includes("ObjectContext")) {
      metrics.ef_objectcontext_usages++;
      metrics.ef_migration_blockers++;
      metrics.ef_risk_score += 15;

      try {
        emitMetric("ef_objectcontext_usages", 1, { blockerType: "ObjectContext Usage" });
        emitMetric("ef_migration_blockers", 1, { blockerType: "ObjectContext Usage" });
        emitMetric("ef_risk_score", 15, { blockerType: "ObjectContext Usage" });
      } catch (e) {
        // Runtime fallback
      }

      metrics.blockerTypes.push({
        blockerType: "ObjectContext Usage",
        file: filePath,
        severity: "critical",
      });
    }

    // 3. Raw SQL Execution (ExecuteSqlCommand)
    if (text.includes("Database.ExecuteSqlCommand(")) {
      metrics.ef_execute_sql_command_calls++;
      metrics.ef_migration_blockers++;
      metrics.ef_risk_score += 3;

      try {
        emitMetric("ef_execute_sql_command_calls", 1, { blockerType: "ExecuteSqlCommand Call" });
        emitMetric("ef_migration_blockers", 1, { blockerType: "ExecuteSqlCommand Call" });
        emitMetric("ef_risk_score", 3, { blockerType: "ExecuteSqlCommand Call" });
      } catch (e) {
        // Runtime fallback
      }

      metrics.blockerTypes.push({
        blockerType: "ExecuteSqlCommand Call",
        file: filePath,
        severity: "warning",
      });
    }

    // 4. Database Initializers (SetInitializer)
    if (text.includes("Database.SetInitializer(")) {
      metrics.ef_database_set_initializer_calls++;
      metrics.ef_migration_blockers++;
      metrics.ef_risk_score += 3;

      try {
        emitMetric("ef_database_set_initializer_calls", 1, { blockerType: "Database.SetInitializer" });
        emitMetric("ef_migration_blockers", 1, { blockerType: "Database.SetInitializer" });
        emitMetric("ef_risk_score", 3, { blockerType: "Database.SetInitializer" });
      } catch (e) {
        // Runtime fallback
      }

      metrics.blockerTypes.push({
        blockerType: "Database.SetInitializer",
        file: filePath,
        severity: "warning",
      });
    }
  } catch (e) {
    // AST scanning fallback
  }

  return null;
}
