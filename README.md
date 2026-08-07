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