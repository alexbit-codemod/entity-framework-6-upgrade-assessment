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

const metric = useMetricAtom("ef_entity_type_configuration");

function genericNameIs(node: AstNode, expected: string): boolean {
  if (node.kind() !== "generic_name") return false;
  const id = node.children().find((c) => c.kind() === "identifier");
  return id?.text() === expected;
}

function findEntityTypeConfiguration(baseType: AstNode): AstNode | null {
  if (genericNameIs(baseType, "EntityTypeConfiguration")) return baseType;
  if (baseType.kind() === "qualified_name") {
    const name = baseType.field("name");
    if (name && genericNameIs(name, "EntityTypeConfiguration")) return name;
  }
  return null;
}

function typeArgumentText(genericName: AstNode): string {
  const typeArgs = genericName
    .children()
    .find((c) => c.kind() === "type_argument_list");
  if (!typeArgs) return "unknown";
  const types = typeArgs.children().filter((c) => c.isNamed());
  return types.map((t) => t.text()).join(",") || "unknown";
}

const codemod: Codemod<CSharp> = async (root) => {
  const rootNode = root.root();
  const filepath = root.relativeFilename();

  const classes = rootNode.findAll({
    rule: {
      kind: "class_declaration",
      has: {
        kind: "base_list",
      },
    },
  });

  for (const cls of classes) {
    const baseList = cls.children().find((c) => c.kind() === "base_list");
    if (!baseList) continue;

    const configurationClass = cls.field("name")?.text() ?? "";
    if (!configurationClass) continue;

    for (const child of baseList.children()) {
      if (!child.isNamed()) continue;
      const etc = findEntityTypeConfiguration(child);
      if (!etc) continue;

      metric.increment({
        filepath,
        linenumber: lineNumber(cls),
        configurationClass,
        mappedType: typeArgumentText(etc),
      });
    }
  }

  return null;
};

export default codemod;
