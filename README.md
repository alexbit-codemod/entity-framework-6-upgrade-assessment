# entity-framework-6-upgrade-assessment (v1.1.0)

Read-only Entity Framework 6 upgrade assessment package. It mines common EF6 patterns in C# sources and emits **native JSSG metrics** (`codemod:metrics`) — no code edits and no ad-hoc output files.

## Architecture

Each workflow **node** owns exactly one metric. Every `increment()` includes `filepath` and `linenumber`. CODEOWNERS is supplied by the Codemod platform (not captured here).

| Workflow node | Metric | Extra cardinalities |
| --- | --- | --- |
| `ef-objectcontext-usages` | `ef_objectcontext_usages` | — |
| `ef-idbset-usages` | `ef_idbset_usages` | `typeArgument` |
| `ef-virtual-nav-props` | `ef_virtual_nav_props` | `propertyName`, `typeName` |
| `ef-entity-type-configuration` | `ef_entity_type_configuration` | `configurationClass`, `mappedType` |
| `ef-execute-sql-command` | `ef_execute_sql_command` | — |
| `ef-database-set-initializer` | `ef_database_set_initializer` | — |

## Run

```bash
npx codemod workflow run -w workflow.yaml -t path/to/your/dotnet-repo
```

Targets `**/*.cs` (excludes `node_modules`, `dist`, `build`, `bin`, `obj`).

## Development

```bash
npm install
npm test
npm run check-types
npx codemod workflow validate -w workflow.yaml
```

Each script has `positive`, `negative`, and `edge` fixtures under `tests/<script-name>/`. Transforms are read-only (`input.cs` === `expected.cs`). Positive/edge cases include `metrics.json`; negatives omit it when there are no findings.

## License

MIT
