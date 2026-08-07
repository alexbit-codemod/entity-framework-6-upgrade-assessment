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

const metric = useMetricAtom("ef_objectcontext_usages");

const codemod: Codemod<CSharp> = async (root) => {
  const rootNode = root.root();
  const filepath = root.relativeFilename();

  const nodes = rootNode.findAll({
    rule: {
      kind: "identifier",
      regex: "^ObjectContext$",
    },
  });

  for (const node of nodes) {
    metric.increment({
      filepath,
      linenumber: lineNumber(node),
    });
  }

  return null;
};

export default codemod;
