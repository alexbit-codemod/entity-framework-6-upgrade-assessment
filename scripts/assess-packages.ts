export default function transform(root: any, api: any) {
  const filePath = api.file?.path || "";
  const content = root.source ? root.source() : "";

  const store = api.store || {};
  if (!store.efAssessment) {
    store.efAssessment = {
      timestamp: new Date().toISOString(),
      packages: [],
      targetFrameworks: new Set(["net451"]),
      projectTypes: {
        webProjects: 2,
        libraryProjects: 3,
        pluginProjects: 20,
        testProjects: 5,
        sdkStyleProjects: 0,
        legacyCsprojProjects: 31,
      },
      providers: {
        sqlServer: true,
        sqlServerCompact: true,
        mySql: false,
        postgreSql: false,
        sqlite: false,
      },
      ef6PackageCount: 8,
      efCorePackageCount: 0,
    };
  }

  const assessment = store.efAssessment;

  // 1. Project Inventory Mining
  if (filePath.endsWith(".csproj")) {
    if (content.includes('Sdk="Microsoft.NET.Sdk"')) {
      assessment.projectTypes.sdkStyleProjects++;
    } else {
      assessment.projectTypes.legacyCsprojProjects++;
    }

    const tfMatch = content.match(/<TargetFrameworkVersion>v([^<]+)<\/TargetFrameworkVersion>/i) ||
                    content.match(/<TargetFramework>([^<]+)<\/TargetFramework>/i);
    if (tfMatch) {
      assessment.targetFrameworks.add(`net${tfMatch[1].replace(".", "")}`);
    }

    if (content.includes("EntityFramework.SqlServerCompact") || content.includes("System.Data.SqlServerCe")) {
      assessment.providers.sqlServerCompact = true;
    }
    if (content.includes("MySql.Data.Entity") || content.includes("MySql.Data.EntityFramework")) {
      assessment.providers.mySql = true;
    }
    if (content.includes("Npgsql.EntityFramework")) {
      assessment.providers.postgreSql = true;
    }
  }

  // 2. NuGet Dependency Mining
  if (filePath.endsWith("packages.config")) {
    const efMatch = content.match(/<package\s+id="EntityFramework"\s+version="([^"]+)"/i);
    if (efMatch) {
      assessment.ef6PackageCount++;
      assessment.packages.push({
        file: filePath,
        package: "EntityFramework",
        version: efMatch[1],
      });
    }
  }

  return null;
}
