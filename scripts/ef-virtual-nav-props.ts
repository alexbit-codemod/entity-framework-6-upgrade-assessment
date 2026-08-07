import type { Codemod } from "codemod:ast-grep";
import type CSharp from "codemod:ast-grep/langs/csharp";
import { useMetricAtom } from "codemod:metrics";

type AstNode = {
  kind(): string;
  text(): string;
  isNamed(): boolean;
  range(): { start: { line: number } };
  field(name: string): AstNode | null | undefined;
  children(): AstNode[];
};

function lineNumber(node: AstNode): string {
  return String(node.range().start.line + 1);
}

const metric = useMetricAtom("ef_virtual_nav_props");

const SCALAR_IDENTIFIERS = new Set([
  "Guid",
  "DateTime",
  "DateTimeOffset",
  "TimeSpan",
  "Boolean",
  "Byte",
  "SByte",
  "Int16",
  "UInt16",
  "Int32",
  "UInt32",
  "Int64",
  "UInt64",
  "Single",
  "Double",
  "Decimal",
  "Char",
  "String",
  "Uri",
  "TimeOnly",
  "DateOnly",
]);

function unwrapType(typeNode: AstNode | null | undefined): AstNode | null {
  if (!typeNode) return null;
  let current: AstNode = typeNode;
  while (
    current.kind() === "nullable_type" ||
    current.kind() === "array_type" ||
    current.kind() === "pointer_type" ||
    current.kind() === "ref_type" ||
    current.kind() === "scoped_type"
  ) {
    const inner =
      current.field("type") ??
      current.children().find((c) => c.isNamed());
    if (!inner) break;
    current = inner;
  }
  return current;
}

function isPrimitiveOrScalar(typeNode: AstNode | null | undefined): boolean {
  const unwrapped = unwrapType(typeNode);
  if (!unwrapped) return true;
  if (unwrapped.kind() === "predefined_type") return true;
  if (unwrapped.kind() === "identifier") {
    return SCALAR_IDENTIFIERS.has(unwrapped.text());
  }
  if (unwrapped.kind() === "qualified_name") {
    const name = unwrapped.field("name");
    if (name?.kind() === "identifier" && SCALAR_IDENTIFIERS.has(name.text())) {
      return true;
    }
  }
  return false;
}

function hasModifier(prop: AstNode, name: string): boolean {
  return prop.children().some((c) => c.kind() === "modifier" && c.text() === name);
}

const codemod: Codemod<CSharp> = async (root) => {
  const rootNode = root.root();
  const filepath = root.relativeFilename();

  const props = rootNode.findAll({
    rule: {
      kind: "property_declaration",
    },
  });

  for (const prop of props) {
    if (!hasModifier(prop, "public") || !hasModifier(prop, "virtual")) continue;

    const typeNode = prop.field("type");
    if (isPrimitiveOrScalar(typeNode)) continue;

    const propertyName = prop.field("name")?.text() ?? "";
    const typeName = typeNode?.text() ?? "";
    if (!propertyName || !typeName) continue;

    metric.increment({
      filepath,
      linenumber: lineNumber(prop),
      propertyName,
      typeName,
    });
  }

  return null;
};

export default codemod;
