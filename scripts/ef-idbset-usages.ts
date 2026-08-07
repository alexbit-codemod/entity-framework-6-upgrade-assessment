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

const metric = useMetricAtom("ef_idbset_usages");

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

  const nodes = rootNode.findAll({
    rule: {
      kind: "generic_name",
      has: {
        kind: "identifier",
        regex: "^IDbSet$",
      },
    },
  });

  for (const node of nodes) {
    const nameId = node.children().find((c) => c.kind() === "identifier");
    if (nameId?.text() !== "IDbSet") continue;

    metric.increment({
      filepath,
      linenumber: lineNumber(node),
      typeArgument: typeArgumentText(node),
    });
  }

  return null;
};

export default codemod;
