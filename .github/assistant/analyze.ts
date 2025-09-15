import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import fs from 'fs';

export interface NestedComponent {
  code: string;
  line: number;
  parentName: string;
  filePath: string;
}

/**
 * Analizes the objective code file to find React components
 * defined inside other components
 */
export function analyzeFile(filePath: string): NestedComponent[] {
  const code = fs.readFileSync(filePath, 'utf8');
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  });

  const findings: NestedComponent[] = [];

  traverse(ast, {
    FunctionDeclaration(path) {
      const parentFnName = (path.node.id && path.node.id.name) || 'AnonymousFunction';

      path.traverse({
        FunctionDeclaration(innerPath) {
          const innerNode = innerPath.node;

          if (looksLikeComponent(innerNode)) {
            findings.push({
              code: code.slice(innerNode.start!, innerNode.end!),
              line: innerNode.loc?.start.line || 0,
              parentName: parentFnName,
              filePath,
            });
          }
        },
        VariableDeclaration(innerPath) {
          innerPath.node.declarations.forEach((declaration) => {
            if (
              t.isVariableDeclarator(declaration) &&
              t.isIdentifier(declaration.id) &&
              t.isArrowFunctionExpression(declaration.init)
            ) {
              const name = declaration.id.name;
              const body = declaration.init.body;
              const isJSX =
                t.isJSXElement(body) ||
                (t.isBlockStatement(body) &&
                  body.body.some(
                    (stmt) =>
                      t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)
                  ));

              if (isJSX) {
                findings.push({
                  code: code.slice(declaration.start!, declaration.end!),
                  line: declaration.loc?.start.line || 0,
                  parentName: parentFnName,
                  filePath,
                });
              }
            }
          });
        },
      });
    },
  });

  return findings;
}

/**
 * Determina si una función se parece a un componente React.
 */
function looksLikeComponent(node: t.FunctionDeclaration): boolean {
  const name = node.id?.name || '';
  const hasJSX =
    t.isBlockStatement(node.body) &&
    node.body.body.some(
      (stmt) =>
        t.isReturnStatement(stmt) && stmt.argument && t.isJSXElement(stmt.argument)
    );

  return name[0] === name[0]?.toUpperCase() && hasJSX;
}