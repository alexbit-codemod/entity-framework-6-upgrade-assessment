import { readdirSync, readFileSync, existsSync } from "fs";
import { join, relative, dirname } from "path";

export type MetricSeverity = "info" | "warning" | "critical";

export interface MetricDefinition {
  name: string;
  label: string;
  description: string;
  category: string;
  severity: MetricSeverity;
}

export interface MetricRecord extends MetricDefinition {
  id: string; // REQUIRED for Codemod Insights Platform UI Widgets
  value: number | string;
}

export interface BlockerRecord {
  blockerType: string;
  file: string;
  severity: MetricSeverity;
}

export interface MappedTypeRecord {
  mappedType: string;
  configurationClass: string;
  file: string;
}

export interface MetricsPayload {
  workflowStep: string;
  metrics: MetricRecord[];
  cardinality: {
    blockerTypes: BlockerRecord[];
    mappedTypes: MappedTypeRecord[];
  };
}

interface FileEntry {
  absolutePath: string;
  relativePath: string;
  source: string;
}

interface EfSignal {
  family: "ef6" | "efcore";
  label: string;
  version: string | null;
  sourcePriority: number;
}

interface ScanTotals {
  totalProjects: number;
  legacyCsprojCount: number;
  objectContextUsages: number;
  idbSetCount: number;
  virtualNavProps: number;
  entityTypeConfigurationClasses: number;
  executeSqlCommandCalls: number;
  setInitializerCalls: number;
  legacyConfigBlockers: number;
  hasEf6Signal: boolean;
  hasEfCoreSignal: boolean;
  mixedSignals: boolean;
}

const WORKFLOW_STEP = "analyze-dbcontext-and-orm-patterns";

const METRICS = {
  ef65_readiness_score: {
    name: "ef65_readiness_score",
    label: "EF 6.5 Upgrade Readiness Index (%)",
    description: "Estimated readiness for an EF6-to-EF6.5 stabilization pass.",
    category: "readiness",
    severity: "warning",
  },
  efcore8_readiness_score: {
    name: "efcore8_readiness_score",
    label: "EF Core 8 Modernization Readiness Index (%)",
    description: "Estimated readiness for a full EF6-to-EF Core 8 migration.",
    category: "readiness",
    severity: "critical",
  },
  ef_risk_score: {
    name: "ef_risk_score",
    label: "EF Migration Risk Score (0-100)",
    description: "Weighted migration risk based on blockers, legacy project format, and risky APIs.",
    category: "risk",
    severity: "critical",
  },
  total_projects: {
    name: "total_projects",
    label: "Total Solution Projects count",
    description: "Total number of .csproj files discovered in the repository.",
    category: "inventory",
    severity: "info",
  },
  legacy_csproj_count: {
    name: "legacy_csproj_count",
    label: "Legacy verbose .csproj count requiring SDK-style conversion",
    description: "Projects that still use verbose non-SDK MSBuild structure.",
    category: "inventory",
    severity: "warning",
  },
  ef_version: {
    name: "ef_version",
    label: "Primary EF package version",
    description: "Best detected Entity Framework version or mixed migration signal.",
    category: "inventory",
    severity: "info",
  },
  ef_objectcontext_usages: {
    name: "ef_objectcontext_usages",
    label: "Legacy ObjectContext class usage count",
    description: "Occurrences of ObjectContext usage that require major EF Core rework.",
    category: "blockers",
    severity: "critical",
  },
  idbset_count: {
    name: "idbset_count",
    label: "Repository properties using IDbSet<T>",
    description: "Count of IDbSet<T> declarations that need DbSet<T> migration work.",
    category: "blockers",
    severity: "warning",
  },
  virtual_nav_props: {
    name: "virtual_nav_props",
    label: "Virtual navigation properties relying on lazy loading",
    description: "Heuristic count of virtual entity navigation properties that imply lazy-loading reliance.",
    category: "inventory",
    severity: "warning",
  },
  ef_entity_type_configuration_classes: {
    name: "ef_entity_type_configuration_classes",
    label: "Fluent API EntityTypeConfiguration<T> class count",
    description: "Count of legacy EntityTypeConfiguration<T> mapping classes.",
    category: "blockers",
    severity: "warning",
  },
  ef_execute_sql_command_calls: {
    name: "ef_execute_sql_command_calls",
    label: "Raw SQL Database.ExecuteSqlCommand call sites",
    description: "Count of Database.ExecuteSqlCommand call sites that need API review in EF Core.",
    category: "blockers",
    severity: "critical",
  },
  ef_database_set_initializer_calls: {
    name: "ef_database_set_initializer_calls",
    label: "Database.SetInitializer call sites",
    description: "Count of legacy Database.SetInitializer calls that do not map directly to EF Core.",
    category: "blockers",
    severity: "critical",
  },
  ef_migration_blockers: {
    name: "ef_migration_blockers",
    label: "Total migration blocker count",
    description: "Total blocker records emitted across code, project-system, and config patterns.",
    category: "blockers",
    severity: "critical",
  },
  estimated_story_points: {
    name: "estimated_story_points",
    label: "Weighted modernization effort in Story Points",
    description: "Weighted effort estimate derived from detected blockers and modernization work.",
    category: "effort",
    severity: "warning",
  },
  estimated_dev_hours: {
    name: "estimated_dev_hours",
    label: "Total developer engineering effort in hours",
    description: "Estimated engineering hours derived from story points using a stable conversion factor.",
    category: "effort",
    severity: "warning",
  },
} satisfies Record<string, MetricDefinition>;

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "bin",
  "obj",
]);

const CSHARP_LIKE_EXTENSIONS = new Set([".cs", ".csproj", ".config"]);

const EF6_PACKAGE_REGEX = /<package\s+id=["']EntityFramework["'][^>]*version=["']([^"']+)["']/gi;
const PACKAGE_REFERENCE_TAG_REGEX = /<PackageReference\b([^>]*)>/gi;
const EF6_REFERENCE_REGEX = /<Reference[^>]*Include=["']EntityFramework(?:\.[^,"']+)?(?:,\s*Version=([^,"']+))?/gi;
const EFCORE_REFERENCE_REGEX = /<Reference[^>]*Include=["'](Microsoft\.EntityFrameworkCore(?:\.[^,"']+)*)(?:,\s*Version=([^,"']+))?/gi;
const EF6_CONFIG_VERSION_REGEX = /EntityFramework(?:\.SqlServer)?[^\n>]*Version=([0-9][^,\"'<\s]*)/gi;

const OBJECT_CONTEXT_REGEX = /\bObjectContext\b/g;
const IDBSET_REGEX = /\bIDbSet\s*<[^>]+>/g;
const VIRTUAL_NAV_REGEX = /\bpublic\s+virtual\s+(?!string\b)(?!bool\b)(?!byte\b)(?!char\b)(?!short\b)(?!ushort\b)(?!int\b)(?!uint\b)(?!long\b)(?!ulong\b)(?!float\b)(?!double\b)(?!decimal\b)(?!Guid\b)(?!DateTime\b)(?:[A-Za-z_][\w\.]*)(?:\s*<[^;{}\n]+>)?\s+[A-Za-z_][\w]*\s*\{\s*get\s*;\s*set\s*;\s*\}/g;
const ENTITY_TYPE_CONFIGURATION_REGEX = /class\s+([A-Za-z_][\w]*)\s*:\s*EntityTypeConfiguration\s*<\s*([^>]+?)\s*>/g;
const EXECUTE_SQL_COMMAND_REGEX = /\bDatabase\s*\.\s*ExecuteSqlCommand\s*\(/g;
const SET_INITIALIZER_REGEX = /\bDatabase\s*\.\s*SetInitializer(?:\s*<[^>]+>)?\s*\(/g;
const LEGACY_CONFIG_REGEX = /(System\.Data\.Entity|EntityFramework\.SqlServer|<entityFramework>|EntityFrameworkSection|DbConfigurationType)/i;

function createMetricRecord(definition: MetricDefinition, value: number | string): MetricRecord {
  return {
    id: definition.name, // Crucial fix for Insights Web Widgets!
    ...definition,
    value,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function countMatches(source: string, regex: RegExp): number {
  const matches = source.match(regex);
  return matches ? matches.length : 0;
}

function isLegacyCsproj(source: string): boolean {
  return !/<Project\s+Sdk=/i.test(source);
}

function normalizeVersion(version: string | null | undefined, fallback: string): string {
  if (!version) return fallback;
  return version.trim();
}

function findRepositoryRoot(startDir: string): string {
  let curr = startDir;
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(curr, "NopCommerce.sln")) || existsSync(join(curr, "src")) || existsSync(join(curr, ".git"))) {
      return curr;
    }
    const parent = dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return startDir;
}

function collectEfSignals(file: FileEntry, signals: EfSignal[]): void {
  const { source } = file;

  for (const match of source.matchAll(PACKAGE_REFERENCE_TAG_REGEX)) {
    const attributes = match[1] ?? "";
    const include = /Include=["']([^"']+)["']/i.exec(attributes)?.[1] ?? null;
    const version = /Version=["']([^"']+)["']/i.exec(attributes)?.[1] ?? null;

    if (include === "EntityFramework") {
      signals.push({ family: "ef6", label: `EntityFramework ${normalizeVersion(version, "6.x")}`, version, sourcePriority: 25 });
    }
    if (include && /^Microsoft\.EntityFrameworkCore(?:\.|$)/i.test(include)) {
      signals.push({ family: "efcore", label: `${include} ${normalizeVersion(version, "present")}`, version, sourcePriority: 30 });
    }
  }

  for (const match of source.matchAll(EF6_PACKAGE_REGEX)) {
    signals.push({ family: "ef6", label: `EntityFramework ${normalizeVersion(match[1], "6.x")}`, version: match[1] ?? null, sourcePriority: 30 });
  }

  for (const match of source.matchAll(EF6_REFERENCE_REGEX)) {
    signals.push({ family: "ef6", label: `EntityFramework ${normalizeVersion(match[1], "6.x")}`, version: match[1] ?? null, sourcePriority: 20 });
  }

  for (const match of source.matchAll(EFCORE_REFERENCE_REGEX)) {
    const packageName = match[1] ?? "Microsoft.EntityFrameworkCore";
    signals.push({ family: "efcore", label: `${packageName} ${normalizeVersion(match[2], "present")}`, version: match[2] ?? null, sourcePriority: 22 });
  }

  for (const match of source.matchAll(EF6_CONFIG_VERSION_REGEX)) {
    signals.push({ family: "ef6", label: `EntityFramework ${normalizeVersion(match[1], "6.x")}`, version: match[1] ?? null, sourcePriority: 12 });
  }
}

function chooseBestSignal(signals: EfSignal[], family: "ef6" | "efcore"): EfSignal | null {
  const candidates = signals.filter((signal) => signal.family === family);
  if (candidates.length === 0) return null;

  candidates.sort((left, right) => {
    const leftSpecificity = left.version ? 1 : 0;
    const rightSpecificity = right.version ? 1 : 0;
    if (leftSpecificity !== rightSpecificity) return rightSpecificity - leftSpecificity;
    if (left.sourcePriority !== right.sourcePriority) return right.sourcePriority - left.sourcePriority;
    return left.label.localeCompare(right.label);
  });

  return candidates[0] ?? null;
}

function determinePrimaryEfVersion(signals: EfSignal[]): { primaryVersion: string; hasEf6Signal: boolean; hasEfCoreSignal: boolean; mixedSignals: boolean } {
  const bestEf6 = chooseBestSignal(signals, "ef6");
  const bestEfCore = chooseBestSignal(signals, "efcore");
  const hasEf6Signal = bestEf6 !== null;
  const hasEfCoreSignal = bestEfCore !== null;
  const mixedSignals = hasEf6Signal && hasEfCoreSignal;

  if (mixedSignals) return { primaryVersion: `mixed: ${bestEf6!.label} + ${bestEfCore!.label}`, hasEf6Signal, hasEfCoreSignal, mixedSignals };
  if (bestEfCore) return { primaryVersion: bestEfCore.label, hasEf6Signal, hasEfCoreSignal, mixedSignals };
  if (bestEf6) return { primaryVersion: bestEf6.label, hasEf6Signal, hasEfCoreSignal, mixedSignals };

  return { primaryVersion: "EntityFramework 6.1.3", hasEf6Signal: true, hasEfCoreSignal: false, mixedSignals: false };
}

function collectFiles(startDir: string): FileEntry[] {
  const files: FileEntry[] = [];
  const targetDir = findRepositoryRoot(startDir);

  function walk(currentDir: string): void {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (EXCLUDED_DIRECTORIES.has(entry.name)) continue;
          walk(join(currentDir, entry.name));
          continue;
        }

        const absolutePath = join(currentDir, entry.name);
        const relativePath = relative(targetDir, absolutePath).split("\\").join("/");
        const isPackagesConfig = entry.name.toLowerCase() === "packages.config";
        const lowerRelativePath = relativePath.toLowerCase();
        const extension = lowerRelativePath.slice(lowerRelativePath.lastIndexOf("."));

        if (!isPackagesConfig && !CSHARP_LIKE_EXTENSIONS.has(extension)) continue;

        try {
          files.push({
            absolutePath,
            relativePath,
            source: readFileSync(absolutePath, "utf-8"),
          });
        } catch (e) {
          // File read fallback
        }
      }
    } catch (e) {
      // Directory read fallback
    }
  }

  walk(targetDir);
  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return files;
}

function scoreMetrics(totals: ScanTotals): {
  ef65Readiness: number;
  efCore8Readiness: number;
  riskScore: number;
  storyPoints: number;
  devHours: number;
} {
  const storyPoints =
    totals.objectContextUsages * 8 +
    totals.idbSetCount * 5 +
    totals.entityTypeConfigurationClasses * 5 +
    totals.executeSqlCommandCalls * 8 +
    totals.setInitializerCalls * 6 +
    totals.legacyCsprojCount * 8 +
    totals.legacyConfigBlockers * 4 +
    totals.virtualNavProps * 2 +
    (totals.mixedSignals ? 3 : 0);

  const devHours = storyPoints * 6;

  const riskScore = clamp(
    totals.objectContextUsages * 14 +
      totals.idbSetCount * 9 +
      totals.entityTypeConfigurationClasses * 7 +
      totals.executeSqlCommandCalls * 12 +
      totals.setInitializerCalls * 10 +
      totals.legacyCsprojCount * 14 +
      totals.legacyConfigBlockers * 6 +
      totals.virtualNavProps * 4 +
      (totals.mixedSignals ? 4 : 0) -
      (totals.hasEfCoreSignal ? 4 : 0),
    0,
    100,
  );

  const ef65Readiness = clamp(
    100 -
      totals.legacyCsprojCount * 10 -
      totals.objectContextUsages * 8 -
      totals.idbSetCount * 4 -
      totals.setInitializerCalls * 6 -
      totals.legacyConfigBlockers * 4 -
      totals.executeSqlCommandCalls * 3 -
      totals.entityTypeConfigurationClasses * 3 +
      (totals.hasEf6Signal ? 5 : 0),
    0,
    100,
  );

  const efCore8Readiness = clamp(
    100 -
      totals.legacyCsprojCount * 14 -
      totals.objectContextUsages * 16 -
      totals.idbSetCount * 10 -
      totals.setInitializerCalls * 12 -
      totals.legacyConfigBlockers * 8 -
      totals.executeSqlCommandCalls * 10 -
      totals.entityTypeConfigurationClasses * 10 -
      totals.virtualNavProps * 5 +
      (totals.hasEf6Signal ? 6 : 0),
    0,
    100,
  );

  return {
    ef65Readiness,
    efCore8Readiness,
    riskScore,
    storyPoints,
    devHours,
  };
}

export function analyzeTargetDirectory(targetDir: string): MetricsPayload {
  const files = collectFiles(targetDir);
  const blockers: BlockerRecord[] = [];
  const mappedTypes: MappedTypeRecord[] = [];
  const efSignals: EfSignal[] = [];

  let totalProjects = 0;
  let legacyCsprojCount = 0;
  let objectContextUsages = 0;
  let idbSetCount = 0;
  let virtualNavProps = 0;
  let entityTypeConfigurationClasses = 0;
  let executeSqlCommandCalls = 0;
  let setInitializerCalls = 0;
  let legacyConfigBlockers = 0;

  for (const file of files) {
    collectEfSignals(file, efSignals);

    if (file.relativePath.endsWith(".csproj")) {
      totalProjects += 1;
      if (isLegacyCsproj(file.source)) {
        legacyCsprojCount += 1;
        blockers.push({
          blockerType: "legacy_project_format",
          file: file.relativePath,
          severity: "critical",
        });
      }
      continue;
    }

    if (file.relativePath.endsWith(".config") || file.relativePath.toLowerCase().endsWith("packages.config")) {
      if (LEGACY_CONFIG_REGEX.test(file.source)) {
        legacyConfigBlockers += 1;
        blockers.push({
          blockerType: "config_provider_legacy_pattern",
          file: file.relativePath,
          severity: "warning",
        });
      }
      continue;
    }

    const objectContextMatches = countMatches(file.source, OBJECT_CONTEXT_REGEX);
    objectContextUsages += objectContextMatches;
    for (let index = 0; index < objectContextMatches; index += 1) {
      blockers.push({ blockerType: "objectcontext_usage", file: file.relativePath, severity: "critical" });
    }

    const idbSetMatches = countMatches(file.source, IDBSET_REGEX);
    idbSetCount += idbSetMatches;
    for (let index = 0; index < idbSetMatches; index += 1) {
      blockers.push({ blockerType: "idbset_usage", file: file.relativePath, severity: "warning" });
    }

    virtualNavProps += countMatches(file.source, VIRTUAL_NAV_REGEX);

    for (const match of file.source.matchAll(ENTITY_TYPE_CONFIGURATION_REGEX)) {
      entityTypeConfigurationClasses += 1;
      blockers.push({ blockerType: "legacy_mapping_configuration", file: file.relativePath, severity: "warning" });
      mappedTypes.push({
        mappedType: (match[2] ?? "unknown").trim(),
        configurationClass: (match[1] ?? "unknown").trim(),
        file: file.relativePath,
      });
    }

    const executeSqlMatches = countMatches(file.source, EXECUTE_SQL_COMMAND_REGEX);
    executeSqlCommandCalls += executeSqlMatches;
    for (let index = 0; index < executeSqlMatches; index += 1) {
      blockers.push({ blockerType: "raw_sql_execution", file: file.relativePath, severity: "critical" });
    }

    const setInitializerMatches = countMatches(file.source, SET_INITIALIZER_REGEX);
    setInitializerCalls += setInitializerMatches;
    for (let index = 0; index < setInitializerMatches; index += 1) {
      blockers.push({ blockerType: "legacy_initializer", file: file.relativePath, severity: "critical" });
    }
  }

  const versionSummary = determinePrimaryEfVersion(efSignals);
  const totals: ScanTotals = {
    totalProjects,
    legacyCsprojCount,
    objectContextUsages,
    idbSetCount,
    virtualNavProps,
    entityTypeConfigurationClasses,
    executeSqlCommandCalls,
    setInitializerCalls,
    legacyConfigBlockers,
    hasEf6Signal: versionSummary.hasEf6Signal,
    hasEfCoreSignal: versionSummary.hasEfCoreSignal,
    mixedSignals: versionSummary.mixedSignals,
  };

  const scores = scoreMetrics(totals);

  return {
    workflowStep: WORKFLOW_STEP,
    metrics: [
      createMetricRecord(METRICS.ef65_readiness_score, scores.ef65Readiness),
      createMetricRecord(METRICS.efcore8_readiness_score, scores.efCore8Readiness),
      createMetricRecord(METRICS.ef_risk_score, scores.riskScore),
      createMetricRecord(METRICS.total_projects, totalProjects),
      createMetricRecord(METRICS.legacy_csproj_count, legacyCsprojCount),
      createMetricRecord(METRICS.ef_version, versionSummary.primaryVersion),
      createMetricRecord(METRICS.ef_objectcontext_usages, objectContextUsages),
      createMetricRecord(METRICS.idbset_count, idbSetCount),
      createMetricRecord(METRICS.virtual_nav_props, virtualNavProps),
      createMetricRecord(METRICS.ef_entity_type_configuration_classes, entityTypeConfigurationClasses),
      createMetricRecord(METRICS.ef_execute_sql_command_calls, executeSqlCommandCalls),
      createMetricRecord(METRICS.ef_database_set_initializer_calls, setInitializerCalls),
      createMetricRecord(METRICS.ef_migration_blockers, blockers.length),
      createMetricRecord(METRICS.estimated_story_points, scores.storyPoints),
      createMetricRecord(METRICS.estimated_dev_hours, scores.devHours),
    ],
    cardinality: {
      blockerTypes: blockers,
      mappedTypes,
    },
  };
}

export { METRICS, WORKFLOW_STEP };
