const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const srcDir = path.join(__dirname, '..', 'src');

function getAllFiles(dir, exts, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, exts, fileList);
    } else if (exts.includes(path.extname(fullPath))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const GLOBAL_REACT_IDENTIFIERS = new Set([
  'React',
  'Fragment',
  'Suspense',
  'StrictMode',
  'Profiler',
]);

function verifyFileWithAst(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );

  const imported = new Set();
  const declared = new Set();
  const jsxTags = new Set();

  function recordBinding(nameNode) {
    if (!nameNode) return;
    if (ts.isIdentifier(nameNode)) {
      declared.add(nameNode.text);
    } else if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
      nameNode.elements.forEach(elem => {
        if (ts.isBindingElement(elem)) {
          recordBinding(elem.name);
        }
      });
    }
  }

  function visit(node) {
    // 1. Imports
    if (ts.isImportDeclaration(node)) {
      if (node.importClause) {
        if (node.importClause.name) {
          imported.add(node.importClause.name.text);
        }
        if (node.importClause.namedBindings) {
          if (ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach((elem) => {
              imported.add(elem.name.text);
            });
          } else if (ts.isNamespaceImport(node.importClause.namedBindings)) {
            imported.add(node.importClause.namedBindings.name.text);
          }
        }
      }
    }

    // 2. Declarations (Variables, Functions, Classes, Types, Parameters)
    if (
      ts.isVariableDeclaration(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isInterfaceDeclaration(node) ||
      ts.isTypeAliasDeclaration(node) ||
      ts.isParameter(node)
    ) {
      recordBinding(node.name);
    }

    // 3. Actual JSX Elements (<TagName ...> or <TagName ... />)
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagNameNode = node.tagName;
      if (ts.isIdentifier(tagNameNode)) {
        const firstChar = tagNameNode.text[0];
        // Only check capitalized tags (React components, not native html div/span)
        if (firstChar >= 'A' && firstChar <= 'Z') {
          jsxTags.add(tagNameNode.text);
        }
      } else if (ts.isPropertyAccessExpression(tagNameNode)) {
        // e.g. <Tabs.Content>
        if (ts.isIdentifier(tagNameNode.expression)) {
          const firstChar = tagNameNode.expression.text[0];
          if (firstChar >= 'A' && firstChar <= 'Z') {
            jsxTags.add(tagNameNode.expression.text);
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  const missing = [];
  jsxTags.forEach((tag) => {
    if (
      !imported.has(tag) &&
      !declared.has(tag) &&
      !GLOBAL_REACT_IDENTIFIERS.has(tag)
    ) {
      missing.push(tag);
    }
  });

  return missing;
}

function runVerification() {
  console.log('🔍 AST Checking all JSX component imports across src/...');
  const files = getAllFiles(srcDir, ['.tsx', '.jsx']);
  let errorCount = 0;

  for (const file of files) {
    const missing = verifyFileWithAst(file);
    if (missing.length > 0) {
      const relPath = path.relative(path.join(__dirname, '..'), file);
      console.error(`\n❌ Missing JSX import in ${relPath}:`);
      missing.forEach((tag) =>
        console.error(`   - <${tag}> is used in JSX but is NOT imported or declared!`)
      );
      errorCount += missing.length;
    }
  }

  if (errorCount > 0) {
    console.error(`\n🚨 AST Verification FAILED: Found ${errorCount} unimported JSX component(s)!`);
    process.exit(1);
  } else {
    console.log(`\n✅ AST Verification PASSED: All JSX components across all ${files.length} files are safely defined!`);
  }
}

runVerification();
