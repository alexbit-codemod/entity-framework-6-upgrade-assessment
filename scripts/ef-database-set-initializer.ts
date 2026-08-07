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

const metric = useMetricAtom("ef_database_set_initializer");

function memberName(memberAccess: AstNode): string | null {
  const name = memberAccess.field("name");
  if (!name) return null;
  if (name.kind() === "identifier") return name.text();
  if (name.kind() === "generic_name") {
    return name.children().find((c) => c.kind() === "identifier")?.text() ?? null;
  }
  return null;
}

const codemod: Codemod<CSharp> = async (root) => {
  const rootNode = root.root();
  const filepath = root.relativeFilename();

  const invocations = rootNode.findAll({
    rule: {
      kind: "invocation_expression",
      has: {
        field: "function",
        kind: "member_access_expression",
      },
    },
  });

  for (const inv of invocations) {
    const fn = inv.field("function");
    if (!fn || fn.kind() !== "member_access_expression") continue;

    const expr = fn.field("expression");
    if (expr?.kind() !== "identifier" || expr.text() !== "Database") continue;
    if (memberName(fn) !== "SetInitializer") continue;

    metric.increment({
      filepath,
      linenumber: lineNumber(inv),
    });
  }

  return null;
};

export default codemod;
