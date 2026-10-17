const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const cp = require('child_process');

// 1. 语法高亮装饰器定义
const commentDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#6A9955',
	fontWeight: 'normal',
	fontStyle: 'normal'
});

const stringDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#CE9178'
});

const escapeDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#D7BA7D'
});

const controlFlowDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#C586C0'
});

const keywordDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#569CD6'
});

const varDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#9CDCFE'
});

const constDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#4FC1FF',
	fontWeight: 'bold'
});

const classDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#4EC9B0'
});

const funcDecorationType = vscode.window.createTextEditorDecorationType({
	color: '#DCDCAA'
});

const enumMemberDecorationType = vscode.window.createTextEditorDecorationType({
    color: '#B5CEA8'
});

const numberDecorationType = vscode.window.createTextEditorDecorationType({
    color: '#B5CEA8'
});

const CONTROL_FLOW_KEYWORDS = new Set([
	'new', 'null', 'if', 'else', 'for', 'foreach', 'while', 'do', 'return', 'break', 'continue',
	'using', 'try', 'catch', 'finally', 'raise', 'delete',
	'with', 'switch', 'case', 'default', 'in', 'is'
]);

const BASIC_KEYWORDS = new Set([
	'namespace', 'extern', 'class', 'struct', 'interface', 'enum',
	'template', 'typename',
	'static', 'public', 'private', 'protected', 'self', 'override', 'abstract',
	'modify', 'ref', 'const', 'true', 'false',
	'void', 'int', 'int8', 'int16', 'int32', 'int64', 'uint8', 'uint16', 'uint32', 'uint64',
	'float', 'double', 'string', 'bool', 'key', 'any', 'char', 'byte',
	'List', 'FinalList', 'Dict', 'FinalDict', 'var'
]);

const KEYWORDS = new Set([...CONTROL_FLOW_KEYWORDS, ...BASIC_KEYWORDS, 'super']);

const BUILTIN_EXCEPTIONS = [
	'NameException', 'IndexException', 'IndexOutException',
	'TypeException', 'SyntaxException', 'ZeroDivisionException',
	'ValueException', 'ArgumentException', 'FileNotFoundException',
	'PermissionException', 'IOException', 'MemoryException'
];
const BUILTIN_EXCEPTION_SET = new Set(BUILTIN_EXCEPTIONS);

const MAGIC_METHODS = [
	{ name: '_init_', snippet: '_init_($1) {\n\t$0\n}', detail: 'self _init_(...) - Constructor', doc: `### _init_\nConstructor method called when a new instance is created.` },
	{ name: '_del_', snippet: '_del_() {\n\t$0\n}', detail: 'void _del_() - Destructor', doc: `### _del_\nDestructor method called automatically when an object instance is deleted / garbage collected.` },
	{ name: '_with_', snippet: '_with_() {\n\t$0\n}', detail: 'void _with_() - Context Exit', doc: `### _with_\nContext manager exit method called immediately upon leaving a \`with\` statement block. Priority is higher than \`_del_\`.` },
	{ name: '_add_', snippet: '_add_(${1:other}) {\n\t$0\n}', detail: '_add_(other) - Addition operator (+)', doc: `### _add_\nOverloads the addition operator (\`+\`).` },
	{ name: '_sub_', snippet: '_sub_(${1:other}) {\n\t$0\n}', detail: '_sub_(other) - Subtraction operator (-)', doc: `### _sub_\nOverloads the subtraction operator (\`-\`).` },
	{ name: '_mul_', snippet: '_mul_(${1:other}) {\n\t$0\n}', detail: '_mul_(other) - Multiplication operator (*)', doc: `### _mul_\nOverloads the multiplication operator (\`*\`).` },
	{ name: '_div_', snippet: '_div_(${1:other}) {\n\t$0\n}', detail: '_div_(other) - Division operator (/)', doc: `### _div_\nOverloads the division operator (\`/\`).` },
	{ name: '_mod_', snippet: '_mod_(${1:other}) {\n\t$0\n}', detail: '_mod_(other) - Modulo operator (%)', doc: `### _mod_\nOverloads the modulo remainder operator (\`%\`).` },
	{ name: '_eq_', snippet: '_eq_(${1:other}) {\n\t$0\n}', detail: 'bool _eq_(other) - Equality operator (==)', doc: `### _eq_\nOverloads the equality operator (\`==\`). Returns \`bool\`.` },
	{ name: '_ne_', snippet: '_ne_(${1:other}) {\n\t$0\n}', detail: 'bool _ne_(other) - Inequality operator (!=)', doc: `### _ne_\nOverloads the inequality operator (\`!=\`). Returns \`bool\`.` },
	{ name: '_lt_', snippet: '_lt_(${1:other}) {\n\t$0\n}', detail: 'bool _lt_(other) - Less-than operator (<)', doc: `### _lt_\nOverloads the less-than operator (\`<\`). Returns \`bool\`.` },
	{ name: '_le_', snippet: '_le_(${1:other}) {\n\t$0\n}', detail: 'bool _le_(other) - Less-than or equal operator (<=)', doc: `### _le_\nOverloads the less-than-or-equal operator (\`<=\`). Returns \`bool\`.` },
	{ name: '_gt_', snippet: '_gt_(${1:other}) {\n\t$0\n}', detail: 'bool _gt_(other) - Greater-than operator (>)', doc: `### _gt_\nOverloads the greater-than operator (\`>\`). Returns \`bool\`.` },
	{ name: '_ge_', snippet: '_ge_(${1:other}) {\n\t$0\n}', detail: 'bool _ge_(other) - Greater-than or equal operator (>=)', doc: `### _ge_\nOverloads the greater-than-or-equal operator (\`>=\`). Returns \`bool\`.` },
	{ name: '_int_', snippet: '_int_() {\n\t$0\n}', detail: 'int _int_() - Convert to int', doc: `### _int_\nType cast / conversion method to \`int\`.` },
	{ name: '_string_', snippet: '_string_() {\n\t$0\n}', detail: 'string _string_() - Convert to string', doc: `### _string_\nType cast / conversion method to \`string\`.` },
	{ name: '_char_', snippet: '_char_() {\n\t$0\n}', detail: 'char _char_() - Convert to char', doc: `### _char_\nType cast / conversion method to \`char\`.` },
	{ name: '_bool_', snippet: '_bool_() {\n\t$0\n}', detail: 'bool _bool_() - Convert to bool', doc: `### _bool_\nType cast / truthiness conversion method to \`bool\`.` },
	{ name: '_float_', snippet: '_float_() {\n\t$0\n}', detail: 'float _float_() - Convert to float', doc: `### _float_\nType cast / conversion method to \`float\`.` },
	{ name: '_double_', snippet: '_double_() {\n\t$0\n}', detail: 'double _double_() - Convert to double', doc: `### _double_\nType cast / conversion method to \`double\`.` },
	{ name: '_begin_', snippet: '_begin_() {\n\t$0\n}', detail: 'IteratorType _begin_() - Return an iterator object', doc: `### _begin_\nIterator object method called once when entering foreach.` },
	{ name: '_done_', snippet: '_done_() {\n\t$0\n}', detail: 'bool _done_() - true indicates no more elements', doc: `### _done_\nChecks whether iteration has completed.` },
	{ name: '_next_', snippet: '_next_() {\n\t$0\n}', detail: 'void _next_() - Move to the next element', doc: `### _next_\nAdvances iterator to the next element.` },
	{ name: '_current_', snippet: '_current_() {\n\t$0\n}', detail: 'T _current_() - Return current element', doc: `### _current_\nReturns the current element under iterator.` },
	{ name: '_neg_', snippet: '_neg_() {\n\t$0\n}', detail: '_neg_() - Unary negation operator (-)', doc: `### _neg_\nOverloads the unary negation operator (\`-\`).` },
	{ name: '_not_', snippet: '_not_() {\n\t$0\n}', detail: 'bool _not_() - Logical NOT operator (!)', doc: `### _not_\nOverloads the logical NOT operator (\`!\`). Returns \`bool\`.` },
	{ name: '_index_', snippet: '_index_(${1:int index}) {\n\t$0\n}', detail: '_index_(int index) - Subscript index operator ([])', doc: `### _index_\nOverloads the subscript index access operator (\`[]\`).` },
	{ name: '_hash_', snippet: '_hash_() {\n\t$0\n}', detail: 'int _hash_() - Compute hash code', doc: `### _hash_\nCalculates and returns the hash code (\`int\`) for the object instance.` },
	{ name: '_call_', snippet: '_call_($1) {\n\t$0\n}', detail: '_call_(...) - Function call operator (())', doc: `### _call_\nAllows the instance to be called as a function (\`instance(...)\`).` }
];

const MAGIC_METHOD_MAP = new Map(MAGIC_METHODS.map(m => [m.name, m]));

// ===== String 内置方法 =====
const STRING_METHODS = [
    { name: 'toUpper', detail: 'string toUpper()', params: [], doc: '### toUpper\nConverts all characters to uppercase.' },
    { name: 'toLower', detail: 'string toLower()', params: [], doc: '### toLower\nConverts all characters to lowercase.' },
    { name: 'trim', detail: 'string trim()', params: [], doc: '### trim\nRemoves leading and trailing whitespace.' },
    { name: 'trimStart', detail: 'string trimStart()', params: [], doc: '### trimStart\nRemoves leading whitespace.' },
    { name: 'trimEnd', detail: 'string trimEnd()', params: [], doc: '### trimEnd\nRemoves trailing whitespace.' },
    { name: 'startsWith', detail: 'bool startsWith(string prefix)', params: ['string prefix'], doc: '### startsWith\nChecks if the string starts with the specified prefix.' },
    { name: 'endsWith', detail: 'bool endsWith(string suffix)', params: ['string suffix'], doc: '### endsWith\nChecks if the string ends with the specified suffix.' },
    { name: 'contains', detail: 'bool contains(string value)', params: ['string value'], doc: '### contains\nChecks if the string contains the specified substring.' },
    { name: 'indexOf', detail: 'int indexOf(string value)', params: ['string value'], doc: '### indexOf\nReturns the zero-based index of the first occurrence of a substring.' },
    { name: 'lastIndexOf', detail: 'int lastIndexOf(string value)', params: ['string value'], doc: '### lastIndexOf\nReturns the zero-based index of the last occurrence of a substring.' },
    { name: 'repeat', detail: 'string repeat(int count)', params: ['int count'], doc: '### repeat\nReturns a new string repeating the original `count` times.' },
    { name: 'reverse', detail: 'string reverse()', params: [], doc: '### reverse\nReverses the characters in the string (UTF-8 safe).' },
    { name: 'replace', detail: 'string replace(string oldValue, string newValue)', params: ['string oldValue', 'string newValue'], doc: '### replace\nReturns a new string with all occurrences of `oldValue` replaced by `newValue`.' },
    { name: 'split', detail: 'List<string> split(string separator)', params: ['string separator'], doc: '### split\nSplits the string into a list of substrings based on the separator.' },
    { name: 'charCount', detail: 'int charCount()', params: [], doc: '### charCount\nReturns the number of characters (Unicode safe) in the string.' },
    { name: 'charAt', detail: 'string charAt(int index)', params: ['int index'], doc: '### charAt\nReturns the character at the specified index.' },
    { name: 'size', detail: 'int size()', params: [], doc: '### size\nReturns the number of bytes in the string.' },
    { name: 'padLeft', detail: 'string padLeft(int totalWidth, char paddingChar)', params: ['int totalWidth', 'char paddingChar'], doc: '### padLeft\nPads the string on the left with `paddingChar` to reach `totalWidth`.' },
    { name: 'padRight', detail: 'string padRight(int totalWidth, char paddingChar)', params: ['int totalWidth', 'char paddingChar'], doc: '### padRight\nPads the string on the right with `paddingChar` to reach `totalWidth`.' },
    { name: 'empty', detail: 'bool empty()', params: [], doc: '### empty\nChecks whether the string is empty.' },
    { name: 'substr', detail: 'String substr(int start, int len)', params: ['int start', 'int len'], doc: '### substr\nReturns a substring starting from `start` with length `len`.' },
    { name: 'substr', detail: 'String substr(int start)', params: ['int start'], doc: '### substr\nReturns a substring from `start` to the end of the string.' },
    { name: 'find', detail: 'int find(string needle)', params: ['string needle'], doc: '### find\nReturns the position of the first occurrence of a substring, or -1 if not found.' },
    { name: 'find', detail: 'int find(char c)', params: ['char c'], doc: '### find\nReturns the position of the first occurrence of a character, or -1 if not found.' },
    { name: 'toDouble', detail: 'double toDouble()', params: [], doc: '### toDouble\nConverts the string to a double.' },
    { name: 'toInt64', detail: 'int64 toInt64()', params: [], doc: '### toInt64\nConverts the string to a 64-bit integer.' },
    { name: 'toInt', detail: 'int toInt()', params: [], doc: '### toInt\nConverts the string to a 32-bit integer.' },
    { name: 'hash', detail: 'int64 hash()', params: [], doc: '### hash\nComputes and returns the hash code of the string.' }
];

// 推断变量在指定行的类型（支持 any 类型的流分析）
function inferVariableType(varName, line, localVariables, currentDocVariables, lines) {
	const lv = localVariables.find(v => v.name === varName && line >= v.startLine && line <= v.endLine);
	const gv = currentDocVariables.find(v => v.name === varName);
	const v = lv || gv;
	if (!v) return null;
	let vType = getBaseTypeName(v.baseType || v.type);
	
	// 如果是 any 或 var，向上查找最近的赋值语句进行推断
	if (vType === 'any' || vType === 'var') {
		for (let li = line; li >= v.startLine; li--) {
			const l = lines[li].replace(/\/\/.*$/, '');
			// 匹配 `varName = expr;` （允许无分号结尾）
			const am = l.match(new RegExp('\\b' + varName + '\\s*=\\s*(.+?);?$'));
			if (am) {
				const inf = inferExprType(am[1]);
				if (inf) { vType = inf; break; }
			}
		}
	}
	return vType;
}

// ===== 诊断消息国际化 =====
const I18N = {
	en: {
		undefinedIdentifier: (n) => `Undefined identifier "${n}"`,
		outOfScope: (n) => `"${n}" is not in the current scope`,
		missingSemicolon: 'Missing semicolon',
		usingEmpty: 'Expected expression after "using"',
		noReturn: (n, tp) => `Function "${n}" declares return type ${tp} but has no return statement`,
		returnTypeMismatch: (tp, a) => `Return type mismatch: declared ${tp}, but returned ${a}`,
		voidHasReturn: (n) => `Function "${n}" has void return type but contains a return with a value`,
		lambdaNoReturn: (tp) => `Lambda declares return type ${tp} but has no return statement`,
		lambdaVoidHasReturn: 'Lambda has void return type but contains a return with a value',
		varTypeMismatch: (v, tp, a) => `Variable "${v}" declared as ${tp}, but assigned ${a}`,
		unclosedString: 'Unclosed string',
		mismatchedBrace: 'Mismatched bracket',
		unclosedBrace: 'Unclosed bracket',
	},
	'zh-CN': {
		undefinedIdentifier: (n) => `未定义的标识符 "${n}"`,
		outOfScope: (n) => `"${n}" 不在当前作用域内`,
		missingSemicolon: '缺少分号',
		usingEmpty: '"using" 后应为表达式',
		noReturn: (n, tp) => `函数 "${n}" 声明返回 ${tp}，但函数体没有任何 return 语句`,
		returnTypeMismatch: (tp, a) => `返回类型不匹配：声明返回 ${tp}，实际返回 ${a}`,
		voidHasReturn: (n) => `函数 "${n}" 返回类型为 void，但含有带值的 return 语句`,
		lambdaNoReturn: (tp) => `Lambda 声明返回 ${tp}，但函数体没有任何 return 语句`,
		lambdaVoidHasReturn: 'Lambda 返回类型为 void，但含有带值的 return 语句',
		varTypeMismatch: (v, tp, a) => `变量 "${v}" 声明为 ${tp}，但赋值为 ${a}`,
		unclosedString: '未闭合的字符串',
		mismatchedBrace: '括号不匹配',
		unclosedBrace: '括号未闭合',
	}
};

function t() {
	const lang = vscode.workspace.getConfiguration('vox').get('diagnosticLanguage') || 'en';
	return I18N[lang] || I18N.en;
}

// 从表达式字面量推断类型（不能推断时返回 null，表示"不报错"）
function inferExprType(expr) {
	const s = (expr || '').trim();
	if (!s) return null;
	if (/^["']/.test(s)) return 'string';
	if (/^(true|false)$/.test(s)) return 'bool';
	if (/^0[xX][0-9a-fA-F]+$/.test(s)) return 'int';
	if (/^-?\d+$/.test(s)) return 'int';
	if (/^-?\d+\.\d+([eE][-+]?\d+)?$/.test(s)) return 'float';
	const newMatch = s.match(/^new\s+([a-zA-Z_]\w*)/);
	if (newMatch) return newMatch[1];
	if (/=>/.test(s)) return 'lambda';
	return null;
}

// 判断声明类型和实际类型是否兼容
// 返回值：
//   true  → 兼容
//   false → 明确不兼容
//   null  → 无法判定（自定义类型、泛型等），不报错
function isTypeCompatible(declared, actual) {
	if (!declared || !actual) return null;
	const d = declared.trim();
	const a = actual.trim();
	if (d === a) return true;
	if (d === 'any' || d === 'var' || d === 'lambda') return true;
	if (a === 'lambda') return true;

	// 数字型内部互相兼容
	const numTypes = new Set(['int', 'float', 'double', 'int8', 'int16', 'int32', 'int64',
		'uint8', 'uint16', 'uint32', 'uint64']);
	if (numTypes.has(d)) {
		if (numTypes.has(a)) return true;
		if (a === 'int' || a === 'float') return true;
		// 数字类型遇 string/bool → 明确不兼容
		if (a === 'string' || a === 'bool') return false;
		return null;
	}
	if (numTypes.has(a)) {
		// 声明是非数字类型，赋值为数字 → 明确不兼容
		if (d === 'string' || d === 'bool' || d === 'char') return false;
		return null;
	}

	if (d === 'string') return a === 'string';
	if (d === 'bool') return a === 'bool';
	if (d === 'char') return a === 'string' || a === 'char';

	// 其它（自定义类等）→ 无法判定
	return null;
}

// 全局调试输出频道
let VOX_CHANNEL = null;
// 全局诊断集合
let VOX_DIAGNOSTICS = null;
// 扩展自身路径
let VOX_EXTENSION_PATH = null;
function voxLog(...args) {
    if (VOX_CHANNEL) VOX_CHANNEL.appendLine('[vox] ' + args.map(a =>
        typeof a === 'string' ? a : JSON.stringify(a)).join(' '));
    // 同时也走 console，方便在 DevTools 里看
    console.log('[vox]', ...args);
}

function getBaseTypeName(rawType) {
    if (!rawType) return 'var';
    let cleaned = rawType.trim();
    if (cleaned.includes('.')) cleaned = cleaned.split('.').pop();
    if (cleaned.includes('<')) cleaned = cleaned.replace(/<[^>]*>/g, '');
    if (cleaned.includes('[]')) cleaned = cleaned.replace(/\[\]/g, '');
    if (cleaned.includes('(')) cleaned = cleaned.substring(0, cleaned.indexOf('('));
    return cleaned.trim() || 'var';
}

function getSmartSortText(categoryRank, name) {
	const match = name.match(/^(_+)/);
	const underCount = match ? match[1].length : 0;
	if (underCount === 0) return `${categoryRank}_${name}`;
	const underPrefix = `9${Math.min(9, underCount)}`;
	return `${underPrefix}_${categoryRank}_${name}`;
}

const BUILTIN_FUNCTIONS = [
	{
		name: 'typeof',
		type: 'string',
		rawParams: 'any variable',
		params: ['any variable'],
		hasVarArgs: false,
		modifier: 'public',
		isStatic: false,
		detail: 'string typeof(any variable)',
		doc: `### typeof (built-in function)\n\nReturns the type string of \`variable\`\n\n### Args\n* \`variable\` : any : Any type, including inheritance`
	}
];

function isVoxDocument(document) {
	if (!document) return false;
	const fileName = document.fileName.toLowerCase();
	return document.languageId === 'vox' ||
	       fileName.endsWith('.v') ||
	       fileName.endsWith('.vox') ||
	       fileName.endsWith('.voxs');
}

// 逐字符剥离单行注释，保留字符串字面量内容
function stripCommentsInLine(line) {
	let result = '';
	let inQuote = false;
	let quoteChar = '';
	let isRaw = false;          // ← 新增
	const interpolationIdentifiers = [];
	let i = 0;
	while (i < line.length) {
		const ch = line[i];
		const prev = i > 0 ? line[i - 1] : '';
		if (inQuote) {
			result += ch;
			if (isRaw) {
				if (ch === quoteChar) inQuote = false;
			} else {
				if (ch === quoteChar && prev !== '\\') inQuote = false;
			}
			i++;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inQuote = true;
			quoteChar = ch;
			isRaw = (prev === '@'); // ← 新增
			result += ch;
			i++;
			continue;
		}
		if (ch === '/' && i + 1 < line.length) {
			if (line[i + 1] === '/') break;          // 行注释
			if (line[i + 1] === '*') {                // 块注释
				i += 2;
				while (i + 1 < line.length && !(line[i] === '*' && line[i + 1] === '/')) i++;
				i = Math.min(line.length, i + 2);
				continue;
			}
		}
		result += ch;
		i++;
	}
	return result;
}

function getPositionContext(text, targetOffset) {
	let state = 'NORMAL';
	let i = 0;
	const len = text.length;

	while (i < len) {
		if (i >= targetOffset) return state;

		const ch = text[i];
		const nextCh = i + 1 < len ? text[i + 1] : '';

		if (state === 'NORMAL') {
			if (ch === '/' && nextCh === '/') {
				state = 'LINE_COMMENT';
				i += 2;
				continue;
			} else if (ch === '/' && nextCh === '*') {
				state = 'BLOCK_COMMENT';
				i += 2;
				continue;
			} else if (ch === '/' && nextCh === '-') {
				state = 'DOC_COMMENT';
				i += 2;
				continue;
			} else if (ch === '"') {
				state = 'STRING_DOUBLE';
				i++;
				continue;
			} else if (ch === "'") {
				state = 'STRING_SINGLE';
				i++;
				continue;
			}
		} else if (state === 'LINE_COMMENT') {
			if (ch === '\n') state = 'NORMAL';
		} else if (state === 'BLOCK_COMMENT') {
			if (ch === '*' && nextCh === '/') {
				state = 'NORMAL';
				i += 2;
				continue;
			}
		} else if (state === 'DOC_COMMENT') {
			if (ch === '-' && nextCh === '/') {
				state = 'NORMAL';
				i += 2;
				continue;
			}
		} else if (state === 'STRING_DOUBLE') {
			if (ch === '\\') { i += 2; continue; }
			if (ch === '"' || ch === '\n') state = 'NORMAL';
		} else if (state === 'STRING_SINGLE') {
			if (ch === '\\') { i += 2; continue; }
			if (ch === "'" || ch === '\n') state = 'NORMAL';
		}
		i++;
	}
	return state;
}

function isInsideComment(document, position) {
	const text = document.getText();
	const offset = document.offsetAt(position);
	const ctx = getPositionContext(text, offset);
	return ctx === 'LINE_COMMENT' || ctx === 'BLOCK_COMMENT' || ctx === 'DOC_COMMENT';
}

// 从 "window" 或 "window.ui" 这样的点号前缀推导出最终模块信息
function resolveModulePrefixInfo(prefixChain, modules) {
	const parts = prefixChain.split('.').filter(Boolean);
	if (parts.length === 0) return null;
	if (!modules.has(parts[0])) return null;

	let curMod = modules.get(parts[0]);
	for (let i = 1; i < parts.length; i++) {
		const seg = parts[i];
		if (curMod.subModules && curMod.subModules.has(seg)) {
			const subPath = curMod.subModules.get(seg);
			let isDir = false;
			try { isDir = fs.existsSync(subPath) && fs.statSync(subPath).isDirectory(); } catch (e) { return null; }
			const isInitFile = !isDir && path.basename(subPath).toLowerCase().startsWith('_init_.');
			curMod = {
				path: subPath,
				isPackage: isDir || isInitFile,
				pkgDir: isDir ? subPath : path.dirname(subPath),
				subModules: isDir ? ModuleResolver.getSubModulesOfDir(subPath) : new Map(),
				doc: ''
			};
		} else {
			return null;
		}
	}
	return curMod;
}

// 读模块入口，判断 word 是模块的哪一类导出
function classifyModuleExport(modInfo, word) {
	if (!modInfo || !modInfo.path) return null;

	let fileToRead = null;
	try {
		if (fs.existsSync(modInfo.path) && fs.statSync(modInfo.path).isDirectory()) {
			for (const ext of ['.v', '.vox', '.voxs']) {
				const f = path.join(modInfo.path, '_init_' + ext);
				if (fs.existsSync(f) && fs.statSync(f).isFile()) { fileToRead = f; break; }
			}
		} else if (fs.existsSync(modInfo.path)) {
			fileToRead = modInfo.path;
		}
	} catch (e) { return null; }

	if (!fileToRead) return null;

	try {
		const content = fs.readFileSync(fileToRead, 'utf-8');
		const data = VoxParser.parseText(content, vscode.Uri.file(fileToRead));
		if (data.constants.some(c => c.name === word)) return 'constant';
		if (data.classes.some(c => c.name === word)) return 'class';
		if (data.enums.some(e => e.name === word)) return 'class';
		if (data.functions.some(f => f.name === word)) return 'function';
		if (data.variables.some(v => v.name === word)) return 'variable';
	} catch (e) {}
	return null;
}

// 读取模块入口文件（目录取 _init_.v，单文件取自身）
function getModuleEntryFile(modInfo) {
    if (!modInfo || !modInfo.path) return null;
    try {
        if (fs.existsSync(modInfo.path) && fs.statSync(modInfo.path).isDirectory()) {
            for (const ext of ['.v', '.vox', '.voxs']) {
                const f = path.join(modInfo.path, '_init_' + ext);
                if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
            }
            return null;
        }
        return modInfo.path;
    } catch (e) {
        return null;
    }
}

// 从模块里查找一个导出符号（函数 / 类 / 信号 / 常量 / 变量 / 枚举）
// 返回 { kind, item, filePath } 或 null
function findModuleExportInfo(modInfo, word) {
    if (!modInfo) return null;
    const tryFile = (filePath) => {
        if (!filePath || !fs.existsSync(filePath)) return null;
        try { if (fs.statSync(filePath).isDirectory()) return null; } catch (e) { return null; }
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const data = VoxParser.parseText(content, vscode.Uri.file(filePath));
            const f = data.functions.find(x => x.name === word);
            if (f) return { kind: 'function', item: f, filePath };
            const c = data.classes.find(x => x.name === word);
            if (c) return { kind: 'class', item: c, filePath };
            const s = (data.signals || []).find(x => x.name === word);
            if (s) return { kind: 'signal', item: s, filePath };
            const cn = data.constants.find(x => x.name === word);
            if (cn) return { kind: 'constant', item: cn, filePath };
            const v = data.variables.find(x => x.name === word);
            if (v) return { kind: 'variable', item: v, filePath };
            const e = data.enums.find(x => x.name === word);
            if (e) return { kind: 'enum', item: e, filePath };
        } catch (e) {}
        return null;
    };

    // 1) 入口文件
    const entryFile = getModuleEntryFile(modInfo);
    let res = tryFile(entryFile);
    if (res) return res;

    // 2) 子模块
    if (modInfo.subModules) {
        for (const [, subPath] of modInfo.subModules.entries()) {
            let subEntry = null;
            try {
                if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
                    for (const ext of ['.v', '.vox', '.voxs']) {
                        const f = path.join(subPath, '_init_' + ext);
                        if (fs.existsSync(f) && fs.statSync(f).isFile()) { subEntry = f; break; }
                    }
                    if (!subEntry) {
                        const entries = fs.readdirSync(subPath);
                        for (const name of entries) {
                            if (/\.(v|vox|voxs)$/i.test(name)) {
                                const f = path.join(subPath, name);
                                if (fs.statSync(f).isFile()) { subEntry = f; break; }
                            }
                        }
                    }
                } else if (fs.existsSync(subPath)) {
                    subEntry = subPath;
                }
            } catch (e) {}
            res = tryFile(subEntry);
            if (res) return res;
        }
    }
    return null;
}

// 构建模块的 hover 内容：模块名 + _init_.v 的导出清单 + 子模块
function buildModuleHoverMarkdown(modInfo, moduleName) {
    const md = new vscode.MarkdownString();
    md.supportHtml = true;
    md.isTrusted = true;

    let entryData = null;
    let modDoc = modInfo.doc || '';
    const entryFile = getModuleEntryFile(modInfo);
    if (entryFile && fs.existsSync(entryFile)) {
        try {
            if (fs.statSync(entryFile).isFile()) {
                const content = fs.readFileSync(entryFile, 'utf-8');
                entryData = VoxParser.parseText(content, vscode.Uri.file(entryFile));
                if (entryData.fileDoc) modDoc = entryData.fileDoc;
            }
        } catch (e) {}
    }

    // ★ 文档放在最前面
    md.appendCodeblock(`module ${moduleName}`, 'vox');
    if (modDoc) {
        md.appendMarkdown(`\n${modDoc}\n`);
    }

    const lines = [];

    if (entryData) {
        for (const c of entryData.classes) lines.push(`class ${c.name}`);
        for (const e of entryData.enums) lines.push(`enum ${e.name}`);
        for (const s of (entryData.signals || [])) {
            lines.push(`signal ${s.name}(${s.rawParams})`);
        }
        for (const f of entryData.functions) {
            if (f.modifier === 'private' || f.modifier === 'protected') continue;
            lines.push(`${f.type} ${f.name}(${f.rawParams})`);
        }
        for (const cn of entryData.constants) {
            lines.push(`const ${cn.name}`);
        }
        for (const v of entryData.variables) {
            if (v.modifier === 'private' || v.modifier === 'protected') continue;
            lines.push(`${v.name}: ${v.type || 'var'}`);
        }
    }

    if (lines.length > 0) {
        md.appendMarkdown(`\n---\n`);
        md.appendCodeblock(lines.join('\n'), 'vox');
    }

    if (modInfo.subModules && modInfo.subModules.size > 0) {
        const subs = Array.from(modInfo.subModules.keys()).join(', ');
        md.appendMarkdown(`\n**Submodules:** \`${subs}\``);
    }

    return md;
}

// F12 点号成员跳转：Debug.log、window.screen.Screen、log.DEBUG 都走这里
function resolveDotMemberDefinition(document, dotIndex, word, sym) {
    const fullText = document.getText();
    const { localVariables, currentDocVariables, classes, modules } = sym;
    const cursorLine = document.positionAt(dotIndex).line;

    // 提取左侧完整链条
    let chainStart = dotIndex - 1;
    while (chainStart >= 0 && /[a-zA-Z0-9_.]/.test(fullText[chainStart])) chainStart--;
    chainStart++;
    const prefixChain = fullText.slice(chainStart, dotIndex).trim();
    const parts = prefixChain.split('.').filter(Boolean);
    if (parts.length === 0) return null;

    // 从头解析链条：第一段决定是模块还是实例
    let objModule = null;
    let objType = null;
    const first = parts[0];

    if (modules.has(first)) {
        objModule = modules.get(first);
    } else {
        const localVar = localVariables.find(v => v.name === first && cursorLine >= v.startLine && cursorLine <= v.endLine);
        const globalVar = currentDocVariables.find(v => v.name === first);
        const v = localVar || globalVar;
        if (v) objType = getBaseTypeName(v.baseType || v.type);
        else objType = first; // 首段可能是类名（静态访问）
    }

    // 逐段推进
    for (let i = 1; i < parts.length; i++) {
        const seg = parts[i];

        if (objModule) {
            // 子模块？
            if (objModule.subModules && objModule.subModules.has(seg)) {
                const subPath = objModule.subModules.get(seg);
                let isDir = false;
                try { isDir = fs.existsSync(subPath) && fs.statSync(subPath).isDirectory(); } catch (e) {}
                objModule = {
                    path: subPath,
                    isPackage: isDir,
                    pkgDir: isDir ? subPath : path.dirname(subPath),
                    subModules: isDir ? ModuleResolver.getSubModulesOfDir(subPath) : new Map(),
                    doc: ''
                };
                continue;
            }
            // 导出项：读入口，看 seg 是不是类
            const entryFile = getModuleEntryFile(objModule);
            if (entryFile) {
                try {
                    const content = fs.readFileSync(entryFile, 'utf-8');
                    const data = VoxParser.parseText(content, vscode.Uri.file(entryFile));
                    if (data.classes.some(c => c.name === seg)) {
                        objType = seg;
                        objModule = null;
                        continue;
                    }
                } catch (e) {}
            }
            objModule = null;
            objType = seg;
        } else if (objType) {
            // 先查全局类
            let cls = classes.find(c => c.name === objType);

            // 全局找不到，去所有已注册模块的入口文件里找
            if (!cls) {
                for (const [, modInfo] of modules.entries()) {
                    const modEntry = getModuleEntryFile(modInfo);
                    if (!modEntry) continue;
                    try {
                        const content = fs.readFileSync(modEntry, 'utf-8');
                        const data = VoxParser.parseText(content, vscode.Uri.file(modEntry));
                        const found = data.classes.find(c => c.name === objType);
                        if (found) { cls = found; break; }
                    } catch (e) {}
                }
            }

            if (cls) {
                const f = cls.fields.find(f => f.name === seg);
                if (f) { objType = getBaseTypeName(f.baseType || f.type); continue; }
                const m = cls.methods.find(m => m.name === seg);
                if (m) { objType = getBaseTypeName(m.type); continue; }
            }
            objType = null;
        }
    }

    // 现在 objModule 或 objType 上找 word
    if (objModule) {
        // ★ 先检查 word 是不是 objModule 的子模块
        //   场景：Code.window 里 F12 window，或者 Code.window.screen 里 F12 screen
        //   这种情况下 word 是子模块名，应该跳到该子模块的入口文件
        if (objModule.subModules && objModule.subModules.has(word)) {
            const subPath = objModule.subModules.get(word);
            let subIsDir = false;
            try { subIsDir = fs.existsSync(subPath) && fs.statSync(subPath).isDirectory(); } catch (e) {}

            let subEntryFile = null;
            try {
                if (subIsDir) {
                    // 优先 _init_.v
                    for (const ext of ['.v', '.vox', '.voxs']) {
                        const f = path.join(subPath, '_init_' + ext);
                        if (fs.existsSync(f) && fs.statSync(f).isFile()) { subEntryFile = f; break; }
                    }
                    // 没有 _init_.v：取目录下第一个 .v
                    if (!subEntryFile) {
                        const entries = fs.readdirSync(subPath);
                        for (const name of entries) {
                            if (/\.(v|vox|voxs)$/i.test(name)) {
                                const f = path.join(subPath, name);
                                if (fs.statSync(f).isFile()) { subEntryFile = f; break; }
                            }
                        }
                    }
                } else {
                    // 单文件子模块
                    subEntryFile = subPath;
                }
            } catch (e) {}

            if (subEntryFile) {
                return new vscode.Location(vscode.Uri.file(subEntryFile), new vscode.Position(0, 0));
            }
        }

        // 原有逻辑：从模块入口找符号
        const entryFile = getModuleEntryFile(objModule);
        if (entryFile) {
            try {
                const content = fs.readFileSync(entryFile, 'utf-8');
                const data = VoxParser.parseText(content, vscode.Uri.file(entryFile));
                const target = data.constants.find(c => c.name === word)
                    || data.enums.find(e => e.name === word)
                    || data.classes.find(c => c.name === word)
                    || data.functions.find(f => f.name === word)
                    || data.variables.find(v => v.name === word);
                if (target && target.range) {
                    return new vscode.Location(vscode.Uri.file(entryFile), target.range);
                }
            } catch (e) {}
        }
        return null;
    }

        if (objType) {
        // 优先全局类
        let cls = classes.find(c => c.name === objType);
        let clsUri = cls && cls.uri;

        // 全局找不到：去模块入口找
        if (!cls) {
            for (const [, modInfo] of modules.entries()) {
                const modEntry = getModuleEntryFile(modInfo);
                if (!modEntry) continue;
                try {
                    const content = fs.readFileSync(modEntry, 'utf-8');
                    const uri = vscode.Uri.file(modEntry);
                    const data = VoxParser.parseText(content, uri);
                    const found = data.classes.find(c => c.name === objType);
                    if (found) { cls = found; clsUri = uri; break; }
                } catch (e) {}
            }
        }

    if (cls) {
            const m = cls.methods.find(x => x.name === word);
            const f = cls.fields.find(x => x.name === word);
            const sig = (cls.signals || []).find(x => x.name === word);
            const target = m || f || sig;
            const targetUri = target && (target.uri || clsUri || document.uri);
            const targetRange = target && target.range;
            if (target && targetUri && targetRange) {
                return new vscode.Location(targetUri, targetRange);
            }
        }
    }

    return null;
}

function findEnclosingClass(document, position, classes) {
	const cursorLine = position.line;
	const cls = classes.find(c => {
		const end = c.endLine === -1 ? 999999 : c.endLine;
		return cursorLine >= c.startLine && cursorLine <= end;
	});
	if (cls) return cls;

	for (let i = cursorLine; i >= 0; i--) {
		const line = document.lineAt(i).text;
		const m = line.match(/\b(class|struct|interface)\s+([a-zA-Z_]\w*)(?:\s*\(([^)]*)\))?/);
		if (m) {
			const className = m[2];
			const rawBases = m[3] || '';
			const bases = rawBases ? rawBases.split(',').map(b => b.trim()).filter(Boolean) : [];
			const found = classes.find(c => c.name === className);
			if (found) {
				if (!found.bases || found.bases.length === 0) found.bases = bases;
				return found;
			}
			return { name: className, kind: m[1], bases, methods: [], fields: [], startLine: i, endLine: -1 };
		}
	}
	return null;
}

function isDeclarationContext(linePrefix) {
	const trimmed = linePrefix.trim();
	if (!trimmed) return false;

	if (/\b(class|struct|interface|enum|namespace)\s+[a-zA-Z0-9_]*$/.test(linePrefix)) return true;
	if (/foreach\s*\([^;()]*$/.test(linePrefix) && !linePrefix.includes(' in ')) return true;
	if (/for\s*\(\s*(?:(?:int|int8|int16|int32|int64|uint8|uint16|uint32|uint64|float|double|string|bool|var|[a-zA-Z_]\w*)\s+)?[a-zA-Z0-9_]*$/.test(linePrefix)) return true;
	// 只在"catch (Type " 后确实有空格（即正在输入变量名）时才拦截
	// 若只是 "catch (Name"（正在输入类型），不拦截，让它走补全
	if (/catch\s*\(\s*[a-zA-Z0-9_.]+\s+[a-zA-Z0-9_]*$/.test(linePrefix)) return true;

	const typePrefixRegex = /\b(int|int8|int16|int32|int64|uint8|uint16|uint32|uint64|float|double|string|bool|key|any|char|byte|void|self|var|[A-Z]\w*(?:<[^>]+>)?(?:\[\])?(?:\([^)]*\))?)\s+([a-zA-Z0-9_]*)$/;
	const m = linePrefix.match(typePrefixRegex);
	if (m) {
		const varName = m[2];
		if (!varName.startsWith('_') && !linePrefix.includes('return ') && !linePrefix.includes('using ')) {
			return true;
		}
	}
	return false;
}

function processDocMarkdown(rawLines) {
	if (!rawLines || rawLines.length === 0) return '';
	let inCodeBlock = false;
	return rawLines.map(rawLine => {
		const trimmed = rawLine.trim();
		if (trimmed.startsWith('```')) {
			inCodeBlock = !inCodeBlock;
			return rawLine;
		}
		if (inCodeBlock || !trimmed) return rawLine;
		if (trimmed.startsWith('* ') || trimmed.startsWith('*\t') || /^\*\s+/.test(trimmed)) return trimmed;
		if (trimmed.startsWith('|') && trimmed.endsWith('|')) return trimmed;
		if (trimmed.startsWith('#')) return trimmed;
		return trimmed + '  ';
	}).join('\n');
}

function createPreservedMarkdownString(text) {
	if (!text) return undefined;
	const md = new vscode.MarkdownString(text);
	md.supportHtml = true;
	md.isTrusted = true;
	return md;
}

function extractFileTopDocComment(lines) {
	let rawDocLines = [];
	let insideDoc = false;
	for (let i = 0; i < lines.length; i++) {
		const rawLine = lines[i];
		const trimmed = rawLine.trim();
		if (!insideDoc) {
			if (!trimmed) continue;
			if (trimmed.startsWith('/-')) {
				insideDoc = true;
				const content = rawLine.substring(rawLine.indexOf('/-') + 2);
				if (content.includes('-/')) {
					rawDocLines.push(content.substring(0, content.indexOf('-/')));
					break;
				} else if (content.trim()) {
					rawDocLines.push(content);
				}
				continue;
			} else {
				break;
			}
		} else {
			if (trimmed.includes('-/')) {
				const content = rawLine.substring(0, rawLine.indexOf('-/'));
				if (content.trim()) rawDocLines.push(content);
				break;
			}
			rawDocLines.push(rawLine);
		}
	}
	return processDocMarkdown(rawDocLines);
}

function extractDocCommentDown(lines, startLine) {
	let rawDocLines = [];
	let insideDoc = false;
	for (let i = startLine; i < lines.length; i++) {
		const rawLine = lines[i];
		const trimmed = rawLine.trim();
		if (!insideDoc) {
			if (trimmed.includes('/-')) {
				insideDoc = true;
				const startIdx = rawLine.indexOf('/-') + 2;
				if (rawLine.includes('-/')) {
					const endIdx = rawLine.lastIndexOf('-/');
					rawDocLines.push(rawLine.substring(startIdx, endIdx));
					break;
				} else {
					const content = rawLine.substring(startIdx);
					if (content.trim()) rawDocLines.push(content);
				}
				continue;
			}
			if (i > startLine && trimmed && !trimmed.startsWith('{') && !trimmed.startsWith('//') && !trimmed.startsWith('/*')) {
				break;
			}
		} else {
			if (trimmed.includes('-/')) {
				const endIdx = rawLine.lastIndexOf('-/');
				const content = rawLine.substring(0, endIdx);
				if (content.trim()) rawDocLines.push(content);
				break;
			}
			rawDocLines.push(rawLine);
		}
	}
	return processDocMarkdown(rawDocLines);
}

function extractDocCommentUp(lines, lineIndex) {
	const currentLine = lines[lineIndex];
	if (currentLine.includes('/-') && currentLine.includes('-/')) {
		const doc = currentLine.substring(currentLine.indexOf('/-') + 2, currentLine.indexOf('-/'));
		return processDocMarkdown([doc]);
	}

	let rawDocLines = [];
	let foundEnd = false;
	for (let i = lineIndex - 1; i >= 0; i--) {
		const rawLine = lines[i];
		const trimmed = rawLine.trim();
		if (!foundEnd) {
			if (!trimmed) continue;
			if (trimmed.endsWith('-/')) {
				foundEnd = true;
				if (trimmed.includes('/-')) {
					const doc = trimmed.substring(trimmed.indexOf('/-') + 2, trimmed.lastIndexOf('-/'));
					return processDocMarkdown([doc]);
				} else {
					const content = rawLine.substring(0, rawLine.lastIndexOf('-/'));
					if (content.trim()) rawDocLines.unshift(content);
				}
			} else {
				break;
			}
		} else {
			if (trimmed.includes('/-')) {
				const content = rawLine.substring(rawLine.indexOf('/-') + 2);
				if (content.trim()) rawDocLines.unshift(content);
				break;
			}
			rawDocLines.unshift(rawLine);
		}
	}
	return processDocMarkdown(rawDocLines);
}

function buildHoverMarkdown(kind, title, params, doc) {
	const md = new vscode.MarkdownString();
	md.supportHtml = true;
	md.isTrusted = true;
	md.appendCodeblock(title, 'vox');

	if (params && params.length > 0) {
		const cleanParams = params.filter(p => p !== '*');
		if (cleanParams.length > 0) {
			md.appendMarkdown('\n**Parameters:**\n');
			for (const p of cleanParams) {
				md.appendMarkdown(`* \`${p}\`\n`);
			}
		}
	}

	if (doc) {
		md.appendMarkdown(`\n---\n${doc}`);
	}
	return md;
}

// 按顶层逗号拆分，尊重 ()[]{} 和字符串引号
function splitTopLevelCommas(s) {
	const parts = [];
	let current = '';
	let depth = 0;
	let inQuote = false;
	let quoteChar = '';
	for (let i = 0; i < s.length; i++) {
		const ch = s[i];
		const prev = i > 0 ? s[i - 1] : '';
		if (inQuote) {
			if (ch === quoteChar && prev !== '\\') inQuote = false;
			current += ch;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inQuote = true;
			quoteChar = ch;
			current += ch;
			continue;
		}
		if (ch === '(' || ch === '[' || ch === '{') depth++;
		else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
		if (ch === ',' && depth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += ch;
		}
	}
	parts.push(current);
	return parts;
}

function splitParameterList(paramString) {
	const params = [];
	let current = '';
	let bracketDepth = 0;
	let braceDepth = 0;
	let parenDepth = 0;
	let angleDepth = 0;
	let inQuote = false;
	let quoteChar = '';

	for (let i = 0; i < paramString.length; i++) {
		const ch = paramString[i];
		const prev = i > 0 ? paramString[i - 1] : '';

		if (inQuote) {
			if (ch === quoteChar && prev !== '\\') inQuote = false;
			current += ch;
			continue;
		}
		if (ch === '"' || ch === "'") {
			inQuote = true;
			quoteChar = ch;
			current += ch;
			continue;
		}

		if (ch === '[') bracketDepth++;
		else if (ch === ']') bracketDepth = Math.max(0, bracketDepth - 1);
		else if (ch === '{') braceDepth++;
		else if (ch === '}') braceDepth = Math.max(0, braceDepth - 1);
		else if (ch === '(') parenDepth++;
		else if (ch === ')') parenDepth = Math.max(0, parenDepth - 1);
		else if (ch === '<') angleDepth++;
		else if (ch === '>') angleDepth = Math.max(0, angleDepth - 1);

		if (ch === ',' && bracketDepth === 0 && braceDepth === 0 && parenDepth === 0 && angleDepth === 0) {
			if (current.trim()) params.push(current.trim());
			current = '';
		} else {
			current += ch;
		}
	}
	if (current.trim()) params.push(current.trim());
	return params;
}

function parseParamInfo(paramStr) {
	const clean = paramStr.trim();
	if (!clean || clean === '*') return null;

	// 类型部分：允许泛型（含嵌套）、数组、函数类型（含参数列表，支持嵌套括号）
	const TYPE_RE_SRC =
		'(?:[a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*' +
		'(?:<[^<>]*(?:<[^<>]*(?:<[^<>]*>)?[^<>]*>)?[^<>]*>)?' +
		'(?:\\[\\])?' +
		'(?:\\([^()]*(?:\\([^()]*\\)[^()]*)*\\))?' +
		')';

	// 尝试拆成：可选 vararg / 可选类型 / 名字 / 可选 -> 约束 / 可选默认值
	const match = clean.match(new RegExp(
		'^(\\*|\\.\\.\\.)?' +
		'(?:(' + TYPE_RE_SRC + ')\\s+)?' +
		'([a-zA-Z_]\\w*)' +
		'(?:\\s*->\\s*[\\s\\S]*?)?' +
		'(?:\\s*=\\s*([\\s\\S]*))?$'
	));

	if (match) {
		const star = match[1] || '';
		const typePrefix = match[2] || '';
		const name = match[3];
		const defaultValue = match[4] || null;
		const isVarArg = star === '*' || star === '...' ||
			typePrefix.startsWith('*') || typePrefix.startsWith('...');

		return {
			type: typePrefix || 'any',
			name: name,
			defaultValue: defaultValue,
			isVarArg: isVarArg
		};
	}
	return null;
}

// 2. 纯净 AST 解析器
class VoxParser {
	static parseText(text, uri = null) {
		const rawLines = text.split('\n');
		const fileDoc = extractFileTopDocComment(rawLines);

		const localVariables = [];
		const variables = [];
		const constants = [];
		const functions = [];
		const classes = [];
		const imports = [];
		const enums = [];

		let currentContainer = null;
		let currentFunction = null;
		let braceDepth = 0;
		let parenDepth = 0;
		let containerLevelDepth = -1;
		let funcLevelDepth = -1;
		let inBlockComment = false;
		let inDocComment = false;
		// 模板参数：只作用于紧跟的声明
		let pendingTemplateParams = [];
		let lastLineWasTemplate = false;

		for (let i = 0; i < rawLines.length; i++) {
			const rawLine = rawLines[i];
			const trimmed = rawLine.trim();

			if (inBlockComment) {
				if (trimmed.includes('*/')) inBlockComment = false;
				continue;
			}
			if (inDocComment) {
				if (trimmed.includes('-/')) inDocComment = false;
				continue;
			}
			if (trimmed.startsWith('/*')) {
				if (!trimmed.includes('*/')) inBlockComment = true;
				continue;
			}
			if (trimmed.startsWith('/-')) {
				if (!trimmed.includes('-/')) inDocComment = true;
				continue;
			}
			if (trimmed.startsWith('//') || trimmed.startsWith('*')) {
				continue;
			}

			// 剔除当前行的行内注释
			let cleanLine = rawLine;
			const commentIdx = cleanLine.indexOf('//');
			if (commentIdx !== -1) cleanLine = cleanLine.substring(0, commentIdx);
			const blockCommentIdx = cleanLine.indexOf('/*');
			if (blockCommentIdx !== -1) cleanLine = cleanLine.substring(0, blockCommentIdx);
			const docCommentIdx = cleanLine.indexOf('/-');
			if (docCommentIdx !== -1) cleanLine = cleanLine.substring(0, docCommentIdx);

			const line = cleanLine;

			// template <typename T, ...> 单独一行
			if (/^\s*template\s*</.test(trimmed)) {
				const tm = trimmed.match(/^\s*template\s*<\s*([^>]*)>/);
				if (tm) {
					for (const p of tm[1].split(',')) {
						const pm = p.trim().match(/^(?:typename|class)\s+([a-zA-Z_]\w*)/);
						if (pm) pendingTemplateParams.push(pm[1]);
					}
				}
				lastLineWasTemplate = true;
				continue;
			}

			// 上一行不是 template 且参数还没被消费 → 丢弃
			if (!lastLineWasTemplate && pendingTemplateParams.length > 0) {
				pendingTemplateParams = [];
			}

			// 模块导入
			const importMatch = line.match(/\busing\s+([a-zA-Z0-9_.*"'/-]+)\s*;/);
			if (importMatch) {
				imports.push(importMatch[1].replace(/["']/g, ''));
			}

			// 枚举声明（同时解析枚举类型名与所有成员名）
			const enumHeadMatch = line.match(/\benum\s+([a-zA-Z_]\w*)/);
			if (enumHeadMatch) {
				const enumName = enumHeadMatch[1];
				const enumCol = line.indexOf(enumName);
				enums.push({
					name: enumName,
					isEnumType: true,
					uri,
					range: new vscode.Range(i, enumCol, i, enumCol + enumName.length)
				});

				// 解析 enum 成员：可能跨行，从 { 开始收集到匹配的 }
				// 先收集从当前行到枚举体结束的所有文本
				let enumBodyText = '';
				let enumBodyStartLine = i;
				let enumBodyStartCol = -1;
				let braceBalance = 0;
				let startedBody = false;
				let endLine = i;

				for (let ei = i; ei < rawLines.length; ei++) {
					const eLine = rawLines[ei];
					for (let ec = 0; ec < eLine.length; ec++) {
						const ch = eLine[ec];
						if (!startedBody) {
							if (ch === '{') {
								startedBody = true;
								braceBalance = 1;
								enumBodyStartLine = ei;
								enumBodyStartCol = ec + 1;
							}
							continue;
						}
						if (ch === '{') braceBalance++;
						else if (ch === '}') {
							braceBalance--;
							if (braceBalance === 0) {
								// 收集最后一段
								if (ei === enumBodyStartLine) {
									enumBodyText += eLine.substring(enumBodyStartCol, ec);
								} else {
									enumBodyText += eLine.substring(0, ec);
								}
								endLine = ei;
								break;
							}
						}
					}
					if (startedBody && braceBalance === 0) break;
					if (startedBody) {
						if (ei === enumBodyStartLine) {
							enumBodyText += eLine.substring(enumBodyStartCol) + '\n';
						} else if (ei < rawLines.length - 1) {
							enumBodyText += eLine + '\n';
						}
					}
				}

				// 从枚举体文本里提取成员名（逗号分隔，忽略注释和赋值）
				if (enumBodyText) {
					const cleanEnumBody = enumBodyText
						.replace(/\/\/[^\n]*/g, '')
						.replace(/\/\*[\s\S]*?\*\//g, '')
						.replace(/\/-[\s\S]*?-\//g, '');

					// 记录每个成员在原始文本中的位置，用于精确高亮
					// 简化处理：在原始 rawLines 里逐个查找成员名
					const memberRegex = /([a-zA-Z_]\w*)\s*(?:=\s*[^,}]+)?/g;
					let mMatch;
					while ((mMatch = memberRegex.exec(cleanEnumBody)) !== null) {
						const memberName = mMatch[1];
						if (!memberName || KEYWORDS.has(memberName)) continue;

						// 在原始行范围内查找该成员名的精确位置
						let found = false;
						for (let fl = enumBodyStartLine; fl <= endLine; fl++) {
							const fLine = rawLines[fl];
							const fCol = fLine.indexOf(memberName);
							if (fCol !== -1) {
								enums.push({
									name: memberName,
									isEnumMember: true,
									enumName: enumName,
									uri,
									range: new vscode.Range(fl, fCol, fl, fCol + memberName.length)
								});
								found = true;
								break;
							}
						}
						if (!found) {
							// 退化：放在枚举类型名同一行
							enums.push({
								name: memberName,
								isEnumMember: true,
								enumName: enumName,
								uri,
								range: new vscode.Range(i, enumCol, i, enumCol + enumName.length)
							});
						}
					}
				}
			}

			// 类 / 结构体 / 接口声明
			const classOrStructMatch = line.match(/\b(class|struct|interface)\s+([a-zA-Z_]\w*)(?:\s*\(([^)]*)\))?/);
			if (classOrStructMatch) {
				const kind = classOrStructMatch[1];
				const name = classOrStructMatch[2];
				const rawBases = classOrStructMatch[3] || '';
				const bases = rawBases ? rawBases.split(',').map(b => b.trim()).filter(Boolean) : [];

				const col = line.indexOf(name);
				const doc = extractDocCommentDown(rawLines, i) || extractDocCommentUp(rawLines, i);
				currentContainer = {
					name,
					kind,
					bases,
					uri,
					range: new vscode.Range(i, col, i, col + name.length),
					startLine: i,
					endLine: -1,
					detail: rawBases ? `${kind} ${name}(${rawBases})` : `${kind} ${name}`,
					doc,
					methods: [],
					fields: []
				};
				if (lastLineWasTemplate && pendingTemplateParams.length > 0) {
					currentContainer.templateParams = pendingTemplateParams.slice();
					pendingTemplateParams = [];
				}
				classes.push(currentContainer);
				containerLevelDepth = braceDepth;

				// ★ 单行类：class X { m(int x) {} } —— 把 `{ ... }` 里的方法参数也解析出来
				const bodyStart = line.indexOf('{', classOrStructMatch.index + classOrStructMatch[0].length);
				if (bodyStart !== -1) {
					let depth = 0;
					let bodyEnd = -1;
					for (let q = bodyStart; q < line.length; q++) {
						if (line[q] === '{') depth++;
						else if (line[q] === '}') {
							depth--;
							if (depth === 0) { bodyEnd = q; break; }
						}
					}
					if (bodyEnd > bodyStart) {
						const bodyText = line.substring(bodyStart + 1, bodyEnd);
						// 扫描类体里的方法：name(params)
						const inlineMethodRe = /(?:(?:public|private|protected|static|override|abstract)\s+)*(?:([a-zA-Z0-9_.*]+(?:<[^>]+>)?)\s+)?([a-zA-Z_]\w*)\s*\(([^()]*)\)/g;
						let im;
						while ((im = inlineMethodRe.exec(bodyText)) !== null) {
							const methodName = im[2];
							if (KEYWORDS.has(methodName)) continue;
							const methodParams = im[3];
							if (!methodParams) continue;
							for (const cleanP of splitParameterList(methodParams)) {
								const parsed = parseParamInfo(cleanP);
								if (parsed && parsed.name && !KEYWORDS.has(parsed.name)) {
									// 在整行里定位参数名的列
									const nameOffsetInMatch = im[0].lastIndexOf(parsed.name);
									const colInLine = bodyStart + 1 + im.index + nameOffsetInMatch;
									localVariables.push({
										name: parsed.name,
										type: parsed.type || 'any',
										baseType: getBaseTypeName(parsed.type || 'any'),
										modifier: 'public',
										doc: '',
										isStatic: false,
										isConst: false,
										startLine: i,
										endLine: i,        // 仅本行有效（单行类）
										declaredAtDepth: 0,
										uri,
										range: new vscode.Range(i, colInLine, i, colInLine + parsed.name.length)
									});
								}
							}
						}
					}
				}
			}

			// 常量声明（完美支持带类型/无类型、单行多个逗号分隔声明：const int A = 1, B = 2;）
			if (/\bconst\b/.test(line)) {
				const constKwMatch = /\bconst\b/.exec(line);
				if (constKwMatch) {
					const afterConst = line.substring(constKwMatch.index + constKwMatch[0].length);
					// 跳过一个可选的类型（void(...) / Type / Type<T> / Type[]）
					const typeThenRest = afterConst.match(
						/^\s+(?:[a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*(?:<[^>]+>)?(?:\[\])?(?:\([^)]*\))?\s+)?([\s\S]+)$/
					);
					if (typeThenRest) {
						const body = typeThenRest[1];
						// body 在整个 line 内的起始偏移
						const bodyOffset = constKwMatch.index + constKwMatch[0].length +
							(afterConst.length - body.length);

						const constItemRegex = /([a-zA-Z_]\w*)\s*(?:=\s*([^,;]+))?/g;
						let cItem;
						while ((cItem = constItemRegex.exec(body)) !== null) {
							const cName = cItem[1];
							if (!cName || KEYWORDS.has(cName)) continue;
							const col = bodyOffset + cItem.index;
							if (col < 0 || col + cName.length > line.length) continue;
							constants.push({
								name: cName,
								isConst: true,
								doc: extractDocCommentUp(rawLines, i),
								uri,
								range: new vscode.Range(i, col, i, col + cName.length)
							});
						}
					}
				}
			}

			// foreach 迭代变量：(Type a, Type b; a in xs, b in ys)
			const foreachHead = line.match(/\bforeach\s*\(([^)]*)\)/);
			if (foreachHead) {
				const head = foreachHead[1];
				const semiIdx = head.indexOf(';');
				if (semiIdx !== -1) {
					const declPart = head.substring(0, semiIdx);
					const iterPart = head.substring(semiIdx + 1);

					// 解析声明部分：Type name, Type name, ...
					const declaredNames = [];
					for (const decl of splitParameterList(declPart)) {
						const pInfo = parseParamInfo(decl);
						if (pInfo && pInfo.name) {
							declaredNames.push({ type: pInfo.type || 'any', name: pInfo.name });
						}
					}

					// 解析迭代部分：name in expr, name in expr, ...
					const iterNames = [];
					for (const iter of splitParameterList(iterPart)) {
						const m = iter.match(/^([a-zA-Z_]\w*)\s+in\s+/);
						if (m) iterNames.push(m[1]);
					}

					// 按顺序配对：第 i 个声明对应第 i 个迭代名
					for (let k = 0; k < Math.min(declaredNames.length, iterNames.length); k++) {
						const d = declaredNames[k];
						const iterName = iterNames[k];
						const col = line.indexOf(iterName);
						// 用迭代名的实际位置（而不是声明名）作为高亮位置
						const realCol = col !== -1 ? col : line.indexOf(d.name);
						const varObj = {
							name: iterName,
							type: d.type,
							baseType: getBaseTypeName(d.type),
							modifier: 'public',
							doc: '',
							isStatic: false,
							isConst: false,
							isLoopVar: true,
							startLine: i,
							endLine: 999999,
							declaredAtDepth: braceDepth + 1,
							uri,
							range: new vscode.Range(i, realCol, i, realCol + iterName.length)
						};
						localVariables.push(varObj);
					}
				}
			}

			// for 循环初始化变量：for (int i = 0; i < n; i++)
			const forHeadMatch = line.match(/\bfor\s*\(\s*([^;]+);/);
			if (forHeadMatch) {
				const initPart = forHeadMatch[1].trim();
				if (initPart) {
					const TYPE_RE_SRC_FOR =
						'(?:[a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*' +
						'(?:<[^<>]*(?:<[^<>]*(?:<[^<>]*>)?[^<>]*>)?[^<>]*>)?' +
						'(?:\\[\\])?(?:\\([^)]*\\))?)';
					const forDeclMatch = initPart.match(new RegExp(
						'^(?:(?:public|private|protected|static)\\s+)?(?:(' + TYPE_RE_SRC_FOR + ')\\s+)([\\s\\S]+)$'
					));
					if (forDeclMatch) {
						const typeName = forDeclMatch[1];
						const rest = forDeclMatch[2];
						const pieces = splitTopLevelCommas(rest);
						const openParen = line.indexOf('(', line.indexOf('for'));
						for (const piece of pieces) {
							const vm = piece.match(/^\s*([a-zA-Z_]\w*)/);
							if (!vm) continue;
							const varName = vm[1];
							if (KEYWORDS.has(varName)) continue;
							const col = line.indexOf(varName, openParen + 1);
							if (col === -1) continue;
							localVariables.push({
								name: varName,
								type: typeName,
								baseType: getBaseTypeName(typeName),
								modifier: 'public',
								doc: '',
								isStatic: false,
								isConst: false,
								isLoopVar: true,
								startLine: i,
								endLine: 999999,
								declaredAtDepth: braceDepth + 1,
								uri,
								range: new vscode.Range(i, col, i, col + varName.length)
							});
						}
					}
				}
			}

			// lambda 参数：支持
			//   (Type a, Type b) => {...}
			//   Type a => {...}
			//   ReturnType(Type a, Type b) => {...}   ← 你用的这种
			const lambdaHeadMatch = line.match(/([a-zA-Z_]\w*(?:<[^>]+>)?)\s*\(([^()]*)\)\s*=>/) ||
			                        line.match(/\(([^()]*)\)\s*=>/) ||
			                        line.match(/([a-zA-Z_]\w*)\s*=>/);
			if (lambdaHeadMatch) {
				// 提取真正的参数列表：如果第 2 组存在，说明是 Type(...) 或 (...) 形式
				let rawParams = '';
				if (lambdaHeadMatch[2] !== undefined) {
					rawParams = lambdaHeadMatch[2];
				} else if (lambdaHeadMatch[1] !== undefined) {
					rawParams = lambdaHeadMatch[1];
				}

				if (rawParams) {
					for (const cleanP of splitParameterList(rawParams)) {
						const parsed = parseParamInfo(cleanP);
						if (parsed && parsed.name && !KEYWORDS.has(parsed.name)) {
							// 用 indexOf + lastIndexOf 找到参数在行内的实际列
							// （一个参数名在同一行可能多次出现，这里取第一次出现的即可）
							let pNameCol = line.indexOf(parsed.name + ' ');  // 更保险的定位
							if (pNameCol === -1) pNameCol = line.indexOf(parsed.name);
							localVariables.push({
								name: parsed.name,
								type: parsed.type || 'any',
								baseType: getBaseTypeName(parsed.type || 'any'),
								modifier: 'public',
								doc: '',
								isStatic: false,
								isConst: false,
								startLine: i,
								endLine: 999999,
								declaredAtDepth: braceDepth + 1,
								uri,
								range: new vscode.Range(i,
									pNameCol !== -1 ? pNameCol : 0,
									i,
									(pNameCol !== -1 ? pNameCol : 0) + parsed.name.length)
							});
						}
					}
				}
			}

			// catch 子句变量：catch (Type name) { ... }
			// 也支持 catch (Type.Sub name)、catch (name)（省略类型的简写）
			const catchMatch = line.match(/\bcatch\s*\(\s*([^)]*?)\s*\)/);
			if (catchMatch) {
				const inside = catchMatch[1].trim();
				if (inside) {
					// 常规形式 "Type name" 或 "Type.Sub name"
					const parsed = parseParamInfo(inside);
					if (parsed && parsed.name && !KEYWORDS.has(parsed.name)) {
						// 在整行里定位变量名的列
						// 需要跳过 catch (...) 里的类型部分，避免 indexOf 命中类型里同名的子串
						const openParenIdx = line.indexOf('(', line.indexOf('catch'));
						const searchFrom = openParenIdx + 1;
						const varCol = line.indexOf(parsed.name, searchFrom);
						localVariables.push({
							name: parsed.name,
							type: parsed.type || 'any',
							baseType: getBaseTypeName(parsed.type || 'any'),
							modifier: 'public',
							doc: '',
							isStatic: false,
							isConst: false,
							startLine: i,
							endLine: 999999,
							declaredAtDepth: braceDepth + 1,
							uri,
							range: new vscode.Range(i,
								varCol !== -1 ? varCol : searchFrom,
								i,
								(varCol !== -1 ? varCol : searchFrom) + parsed.name.length)
						});
					}
				}
			}

			const isDirectContainerLevel = currentContainer && (braceDepth === containerLevelDepth + 1 || (braceDepth === containerLevelDepth && line.includes('{')));
			const isTopLevel = !currentContainer && braceDepth === 0;

			// 函数 / 方法声明
			const funcHeadMatch = line.match(/^\s*(?:(public|private|protected|static|override|abstract)\s+)*(?:([a-zA-Z0-9_.*]+(?:<[^>]+>)?)\s+)?([a-zA-Z_]\w*)\s*\(/);
			// 排除类型声明行：class/struct/interface/enum 后接名字再跟 ( 的情况
			const isTypeDeclLine = /^\s*(?:(?:public|private|protected|static|abstract|final)\s+)*(?:class|struct|interface|enum)\s+[a-zA-Z_]\w*/.test(line);

			// 排除"调用表达式"：
			//   - 含 => 说明是带 lambda 实参的调用
			//   - 没有返回类型前缀 且 行尾是 ; 或 后面跟 . 或 , 或 ) 的是调用
			const hasRetType = !!funcHeadMatch && !!funcHeadMatch[2];
			const endsWithSemi = /;\s*$/.test(line.trim());
			const isCallLike = !hasRetType && (
				line.includes('=>') ||
				endsWithSemi ||
				/\)\s*[.,;)]/.test(line)
			);

			if (funcHeadMatch && !KEYWORDS.has(funcHeadMatch[3]) && !isTypeDeclLine && !isCallLike) {
				const name = funcHeadMatch[3];
				const col = line.indexOf(name);
				const retType = funcHeadMatch[2] || (name === '_init_' ? (currentContainer ? currentContainer.name : 'self') : 'void');
				const isStaticMethod = line.includes('static');

				let fullDecl = line.substring(line.indexOf('(') + 1);
				let lineCursor = i;
				let parenBalance = 1;

				for (let c = 0; c < fullDecl.length; c++) {
					if (fullDecl[c] === '(') parenBalance++;
					else if (fullDecl[c] === ')') {
						parenBalance--;
						if (parenBalance === 0) {
							fullDecl = fullDecl.substring(0, c);
							break;
						}
					}
				}

				while (parenBalance > 0 && lineCursor + 1 < rawLines.length) {
					lineCursor++;
					const nextL = rawLines[lineCursor];
					for (let c = 0; c < nextL.length; c++) {
						if (nextL[c] === '(') parenBalance++;
						else if (nextL[c] === ')') {
							parenBalance--;
							if (parenBalance === 0) {
								fullDecl += ' ' + nextL.substring(0, c);
								break;
							}
						}
					}
					if (parenBalance > 0) fullDecl += ' ' + nextL;
				}

				const rawParams = fullDecl.replace(/\s+/g, ' ').trim();
				const params = [];
				let hasVarArgs = false;

				if (rawParams) {
					const splitP = splitParameterList(rawParams);
					for (const cleanP of splitP) {
						if (cleanP) {
							params.push(cleanP);
							if (cleanP.startsWith('*') && cleanP !== '*') hasVarArgs = true;
							const parsed = parseParamInfo(cleanP);
							if (parsed && parsed.name && !KEYWORDS.has(parsed.name)) {
								if (parsed.isVarArg) hasVarArgs = true;
								const pNameCol = line.indexOf(parsed.name);
								localVariables.push({
									name: parsed.name,
									type: parsed.type || 'any',
									startLine: i,
									endLine: 999999,
									declaredAtDepth: braceDepth + 1,   // 参数属于函数体内部的一层
									uri,
									range: new vscode.Range(i, pNameCol !== -1 ? pNameCol : col, i, (pNameCol !== -1 ? pNameCol : col) + parsed.name.length)
								});
							}
						}
					}
				}

				let doc = '';
				if (MAGIC_METHOD_MAP.has(name)) {
					doc = MAGIC_METHOD_MAP.get(name).doc;
				} else {
					doc = extractDocCommentDown(rawLines, lineCursor) || extractDocCommentUp(rawLines, i);
				}

				const tParams = (lastLineWasTemplate && pendingTemplateParams.length > 0)
					? pendingTemplateParams.slice()
					: [];
				pendingTemplateParams = [];

				const funcObj = {
					name,
					type: retType,
					rawParams,
					params,
					hasVarArgs,
					modifier: funcHeadMatch[1] || 'public',
					doc,
					isStatic: isStaticMethod,
					templateParams: tParams,
					startLine: i,
					endLine: -1,
					uri,
					range: new vscode.Range(i, col, i, col + name.length),
					detail: `${isStaticMethod ? 'static ' : ''}${retType} ${name}(${rawParams})`
				};

				if (currentContainer && isDirectContainerLevel) {
					currentContainer.methods.push(funcObj);
					if (name === '_init_' && !currentContainer.doc && doc) {
						currentContainer.doc = doc;
					}
				} else if (isTopLevel) {
					functions.push(funcObj);
				}

				currentFunction = funcObj;
				funcLevelDepth = braceDepth;
			}

			// 显式变量声明（确保任何包含 const 的语句绝不进入变量/局部变量集合）
			// 函数签名必须以 `{`、`;` 或行尾结束；如果 `)` 后面还有标识符，是 lambda 类型变量声明
			const isMethodSignature = /^\s*(?:(public|private|protected|static|override|abstract)\s+)*(?:[a-zA-Z0-9_.*]+(?:<[^>]+>)?\s+)?([a-zA-Z_]\w*)\s*\([^)]*\)\s*(?:[{;]|\s*$)/.test(line);
			// 用"行首匹配"代替 includes：避免 lambda 体内的 return/using 等词把整行误判
			const startsWithReturn = /^\s*return\b/.test(line);
			const startsWithUsing = /^\s*using\b/.test(line);
			const containsTypeDecl = /^\s*(?:public\s+|private\s+|protected\s+|static\s+|abstract\s+|final\s+)*(?:class|struct|interface|enum)\s+[a-zA-Z_]\w*/.test(line);
			if (!isMethodSignature && !startsWithReturn && !startsWithUsing && !containsTypeDecl && !/\bconst\b/.test(line)) {
				const statements = line.split(';');
				for (const stmt of statements) {
					const trimmedStmt = stmt.trim();
					if (!trimmedStmt || /\bconst\b/.test(trimmedStmt)) continue;

					// 支持：普通类型、泛型、数组、函数类型 void(string, any)
					// 宽松匹配类型后跟 (.+)，然后用顶层逗号拆分，避免初始化表达式里
					// 的 () 内逗号破坏解析（如 vox_window_create(width, height)）
					// 允许最多 2 层泛型嵌套（FinalList<FinalList<string>> 这类）
					const TYPE_RE_SRC =
						'(?:[a-zA-Z_]\\w*(?:\\.[a-zA-Z_]\\w*)*' +
						'(?:<[^<>]*(?:<[^<>]*(?:<[^<>]*>)?[^<>]*>)?[^<>]*>)?' +
						'(?:\\[\\])?(?:\\([^)]*\\))?)';
					const declMatch = trimmedStmt.match(new RegExp(
						'^(?:(public|private|protected|static)\\s+)?(?:(' + TYPE_RE_SRC + ')\\s+)([\\s\\S]+)$'
					));
					if (declMatch && !CONTROL_FLOW_KEYWORDS.has(declMatch[2])) {
						const modifier = declMatch[1] || 'public';
						let typeName = declMatch[2];
						const restBody = declMatch[3];

						const pieces = splitTopLevelCommas(restBody);
						for (const piece of pieces) {
							const vItem = piece.match(/^\s*([a-zA-Z_]\w*)(?:\s*=\s*([\s\S]*?))?\s*$/);
							if (!vItem) continue;
							const varName = vItem[1];
							if (KEYWORDS.has(varName)) continue;

							let actualType = typeName;
							const initExpr = vItem[2] || '';
							if (actualType === 'var') {
								const newM = initExpr.match(/new\s+([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*(?:<[^>]+>)?)/);
								if (newM) actualType = newM[1];
								else {
									const staticM = initExpr.match(/([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\s*\(/);
									if (staticM) actualType = staticM[1];
								}
							}

							const col = line.indexOf(varName);
							const varDoc = extractDocCommentUp(rawLines, i);
							const varObj = {
								name: varName,
								type: actualType,
								baseType: getBaseTypeName(actualType),
								modifier,
								doc: varDoc,
								isStatic: line.includes('static'),
								isConst: false,
								initExpr: initExpr,
								isLambda: /=>/.test(initExpr),
								startLine: i,
								endLine: 999999,
								declaredAtDepth: isTopLevel ? 0 : braceDepth,
								uri,
								range: new vscode.Range(i, col, i, col + varName.length)
							};

							if (isDirectContainerLevel && currentContainer) {
								currentContainer.fields.push(varObj);
							} else if (isTopLevel) {
								variables.push(varObj);
							} else {
								localVariables.push(varObj);
							}
						}
					}
				}
			}

			lastLineWasTemplate = false;

			const openCount = (line.match(/{/g) || []).length;
			const closeCount = (line.match(/}/g) || []).length;
			braceDepth += openCount - closeCount;

			// 统计当前行的括号，用于判断是否仍停留在多行 for/foreach 的头部
			const openParens = (line.match(/\(/g) || []).length;
			const closeParens = (line.match(/\)/g) || []).length;
			parenDepth += openParens - closeParens;

			// 作用域闭包：本行结束后 braceDepth 已经反映新的嵌套层级
			// 任何 declaredAtDepth > 当前 braceDepth 的局部变量，说明它所在的作用域已经关闭
			for (let k = 0; k < localVariables.length; k++) {
				const lv = localVariables[k];
				if (lv.endLine === 999999 &&
					typeof lv.declaredAtDepth === 'number' &&
					lv.declaredAtDepth > 0 &&
					braceDepth < lv.declaredAtDepth) {
					
					// 如果是 for / foreach 的循环变量
					if (lv.isLoopVar) {
						// 还在括号内（多行循环头），暂不关闭
						if (parenDepth > 0) {
							continue;
						}
						// 括号已闭合：
						//   - openCount === 0 代表没有花括号（单行 for 循环）
						//   - closeCount > 0 代表闭合了花括号（循环结束）
						// 这两种情况需要正确关闭变量
						if (openCount === 0 || closeCount > 0) {
							lv.endLine = i;
						}
					} else {
						lv.endLine = i;
					}
				}
			}

			if (currentFunction && braceDepth <= funcLevelDepth && closeCount > 0) {
				currentFunction.endLine = i;
				currentFunction = null;
				funcLevelDepth = -1;
			}

			if (currentContainer && braceDepth <= containerLevelDepth && closeCount > 0) {
				currentContainer.endLine = i;
				currentContainer = null;
				containerLevelDepth = -1;
			}
		}

		return { localVariables, variables, constants, functions, classes, imports, enums, fileDoc };
	}
}

// 3. 模块解析与目录扫描
class ModuleResolver {
	static getSearchRoots(currentDocUri) {
		const roots = [];
		const seen = new Set();

		const addRoot = (p) => {
			if (!p) return;
			// 如果传入的是文件，取其目录
			let dir = p;
			try {
				if (fs.existsSync(p) && fs.statSync(p).isFile()) {
					dir = path.dirname(p);
				}
			} catch (e) { return; }

			// 确保包含 Code 目录（防止用户配置的是 Lib 或 Compiler 根目录）
			const possibleRoots = [
				dir,
				path.join(dir, 'Code'),
				path.join(dir, 'Lib')
			];

			for (const r of possibleRoots) {
				if (fs.existsSync(r) && fs.statSync(r).isDirectory() && !seen.has(r)) {
					// 只有目录下存在 Code 或者本身就是 Code 才加入根
					if (path.basename(r) === 'Code' || fs.existsSync(path.join(r, 'Code'))) {
						seen.add(r);
						roots.push(r);
					}
				}
			}
		};

		// 1. 当前文件目录
		if (currentDocUri && currentDocUri.fsPath) {
			addRoot(path.dirname(currentDocUri.fsPath));
		}

		// 2. 向上查找最近的 Code 目录
		if (currentDocUri && currentDocUri.fsPath) {
			let probe = path.dirname(currentDocUri.fsPath);
			for (let depth = 0; depth < 12; depth++) {
				const codeDir = path.join(probe, 'Code');
				if (fs.existsSync(codeDir) && fs.statSync(codeDir).isDirectory()) {
					if (!seen.has(probe)) { seen.add(probe); roots.push(probe); }
					break;
				}
				const parent = path.dirname(probe);
				if (parent === probe) break;
				probe = parent;
			}
		}

		// 3. 用户配置的自定义路径
		const config = vscode.workspace.getConfiguration('vox');
		const customParentDir = (config.get('codeParentDirectory') || '').trim();
		if (customParentDir) {
			if (path.isAbsolute(customParentDir) && fs.existsSync(customParentDir)) {
				addRoot(customParentDir);
			} else if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
				const combined = path.join(vscode.workspace.workspaceFolders[0].uri.fsPath, customParentDir);
				if (fs.existsSync(combined)) addRoot(combined);
			}
		}

		// 4. 工作区根目录
		if (vscode.workspace.workspaceFolders) {
			vscode.workspace.workspaceFolders.forEach(f => {
				addRoot(f.uri.fsPath);
			});
		}

		// ★ 5. 环境变量（VOX_HOME / VOX_COMPILER / VOX_SDK 等）
		const envVars = ['VOX_HOME', 'VOX_COMPILER', 'VOX_ROOT', 'VOX_SDK'];
		for (const ev of envVars) {
			const envVal = process.env[ev];
			if (envVal) {
				// 可能是 Vox Compiler 根目录，也可能是 Vox Compiler\Lib 目录
				// 尝试向上兼容 Code 目录
				addRoot(envVal);
				addRoot(path.join(envVal, 'Lib'));
				addRoot(path.join(envVal, 'lib'));
			}
		}

		// ★ 6. 扩展自带的 Code 文件夹
		if (VOX_EXTENSION_PATH) {
			addRoot(VOX_EXTENSION_PATH);
			const extCode = path.join(VOX_EXTENSION_PATH, 'Code');
			if (fs.existsSync(extCode) && fs.statSync(extCode).isDirectory()) {
				addRoot(VOX_EXTENSION_PATH);
			}
		}

		return roots;
	}

	static getDirectoryChildren(importPrefix, currentDocUri) {
		const roots = this.getSearchRoots(currentDocUri);
		const clean = (importPrefix || '').replace(/\./g, '/').replace(/^\/+|\/+$/g, '');
		const items = [];
		const seen = new Set();

		for (const root of roots) {
			const candidateDirs = [
				clean ? path.join(root, clean) : root,
				clean ? path.join(root, 'Code', clean) : path.join(root, 'Code')
			];

			for (const targetDir of candidateDirs) {
				if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
					try {
						const entries = fs.readdirSync(targetDir, { withFileTypes: true });
						for (const ent of entries) {
							if (ent.name.startsWith('.')) continue;

							if (ent.isDirectory()) {
								if (!seen.has(ent.name)) {
									seen.add(ent.name);
									items.push({
										name: ent.name,
										kind: vscode.CompletionItemKind.Folder,
										detail: `package ${ent.name}`
									});
								}
							} else if (ent.isFile()) {
								const lower = ent.name.toLowerCase();
								if (lower.startsWith('_init_.')) continue;

								let baseName = null;
								if (lower.endsWith('.v')) baseName = ent.name.slice(0, -2);
								else if (lower.endsWith('.vox')) baseName = ent.name.slice(0, -4);
								else if (lower.endsWith('.voxs')) baseName = ent.name.slice(0, -5);

								if (baseName && !seen.has(baseName)) {
									seen.add(baseName);
									items.push({
										name: baseName,
										kind: vscode.CompletionItemKind.File,
										detail: `module ${baseName}`
									});
								}
							}
						}
					} catch (e) {}
				}
			}
		}
		return items;
	}

	static resolveModuleEntry(importStr, currentDocUri) {
		const roots = this.getSearchRoots(currentDocUri);
		const clean = importStr.replace(/\.\*$/, '').replace(/\./g, '/');

		for (const root of roots) {
			const candidateDirs = [
				path.join(root, clean),
				path.join(root, 'Code', clean)
			];

			for (const dirPath of candidateDirs) {
				if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
					const initV = path.join(dirPath, '_init_.v');
					const initVox = path.join(dirPath, '_init_.vox');
					const initVoxs = path.join(dirPath, '_init_.voxs');
					if (fs.existsSync(initV) && fs.statSync(initV).isFile()) return initV;
					if (fs.existsSync(initVox) && fs.statSync(initVox).isFile()) return initVox;
					if (fs.existsSync(initVoxs) && fs.statSync(initVoxs).isFile()) return initVoxs;
					return dirPath;
				}
			}

			const fileCandidates = [
				path.join(root, clean + '.v'),
				path.join(root, clean + '.vox'),
				path.join(root, clean + '.voxs'),
				path.join(root, 'Code', clean + '.v'),
				path.join(root, 'Code', clean + '.vox'),
				path.join(root, 'Code', clean + '.voxs')
			];

			for (const f of fileCandidates) {
				if (fs.existsSync(f) && fs.statSync(f).isFile()) return f;
			}
		}
		return null;
	}

	static resolveFiles(importStr, currentDocUri) {
		const roots = this.getSearchRoots(currentDocUri);
		const results = [];
		const clean = importStr.replace(/\.\*$/, '').replace(/\./g, '/');

		for (const root of roots) {
			const candidateDirs = [
				path.join(root, clean),
				path.join(root, 'Code', clean)
			];

			for (const dirPath of candidateDirs) {
				if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
					const entries = fs.readdirSync(dirPath);
					for (const entry of entries) {
						if (entry.endsWith('.v') || entry.endsWith('.vox') || entry.endsWith('.voxs')) {
							results.push(path.join(dirPath, entry));
						}
					}
					continue;
				}
			}

			const fileCandidates = [
				path.join(root, clean + '.v'),
				path.join(root, clean + '.vox'),
				path.join(root, clean + '.voxs'),
				path.join(root, 'Code', clean + '.v'),
				path.join(root, 'Code', clean + '.vox'),
				path.join(root, 'Code', clean + '.voxs')
			];

			for (const f of fileCandidates) {
				if (fs.existsSync(f) && fs.statSync(f).isFile()) results.push(f);
			}
		}
		return Array.from(new Set(results));
	}

	static getSubModulesOfDir(dirPath) {
		const subModules = new Map();
		if (!dirPath || !fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return subModules;
		try {
			const entries = fs.readdirSync(dirPath, { withFileTypes: true });
			for (const ent of entries) {
				if (ent.name.startsWith('.')) continue;
				if (ent.isFile()) {
					const lower = ent.name.toLowerCase();
					if (lower.startsWith('_init_.')) continue;
					let modName = null;
					if (lower.endsWith('.v')) modName = ent.name.slice(0, -2);
					else if (lower.endsWith('.vox')) modName = ent.name.slice(0, -4);
					else if (lower.endsWith('.voxs')) modName = ent.name.slice(0, -5);
					if (modName) {
						subModules.set(modName, path.join(dirPath, ent.name));
					}
				} else if (ent.isDirectory()) {
					subModules.set(ent.name, path.join(dirPath, ent.name));
				}
			}
		} catch (e) {}
		return subModules;
	}

	static getAllSymbols(document) {
		const currentData = VoxParser.parseText(document.getText(), document.uri);
		const allVariables = [...currentData.variables];
		const allConstants = [...currentData.constants];
		const allFunctions = [...BUILTIN_FUNCTIONS, ...currentData.functions];
		const allClasses = [...currentData.classes];
		const allEnums = [...currentData.enums];

		const modules = new Map();
		const visitedFiles = new Set([document.uri.fsPath]);

		// ===== 隐式：Code 标准库 =====
		// 语义：
		//   1) 让 Code/_init_.v 的符号铺到当前作用域（等价 using Code.*;）
		//   2) 注册 Code 模块，让 Code.xxx 补全 / F12 都可用
		{
			const codeEntry = this.resolveModuleEntry('Code', document.uri);
			if (codeEntry && fs.existsSync(codeEntry)) {
				let codeIsDir = false;
				try { codeIsDir = fs.statSync(codeEntry).isDirectory(); } catch (e) {}
				const codePkgDir = codeIsDir ? codeEntry : path.dirname(codeEntry);

				// 计算 entryFile
				let codeEntryFile = null;
				try {
					if (codeIsDir) {
						for (const ext of ['.v', '.vox', '.voxs']) {
							const f = path.join(codeEntry, '_init_' + ext);
							if (fs.existsSync(f) && fs.statSync(f).isFile()) { codeEntryFile = f; break; }
						}
						if (!codeEntryFile) {
							const entries = fs.readdirSync(codeEntry);
							for (const name of entries) {
								if (/\.(v|vox|voxs)$/i.test(name)) {
									const f = path.join(codeEntry, name);
									if (fs.statSync(f).isFile()) { codeEntryFile = f; break; }
								}
							}
						}
					} else {
						codeEntryFile = codeEntry;
					}
				} catch (e) {}

				// 注册模块
				if (!modules.has('Code')) {
					modules.set('Code', {
						path: codeEntry,
						entryFile: codeEntryFile,
						isPackage: codeIsDir || (codeEntryFile && path.basename(codeEntryFile).toLowerCase().startsWith('_init_.')),
						pkgDir: codePkgDir,
						subModules: this.getSubModulesOfDir(codePkgDir),
						doc: ''
					});
				}

				// 铺 Code/_init_.v 的符号到当前作用域
				if (codeEntryFile && !visitedFiles.has(codeEntryFile)) {
					visitedFiles.add(codeEntryFile);
					try {
						const content = fs.readFileSync(codeEntryFile, 'utf-8');
						const fileUri = vscode.Uri.file(codeEntryFile);
						const importedData = VoxParser.parseText(content, fileUri);
						allVariables.push(...importedData.variables);
						allConstants.push(...importedData.constants);
						allFunctions.push(...importedData.functions);
						allClasses.push(...importedData.classes);
						allEnums.push(...importedData.enums);
					} catch (e) {}
				}
			}
		}
		// ===== 隐式 Code 导入结束 =====

		for (const imp of currentData.imports) {
			// ★ 关键：区分通配符与非通配符
			const isWildcard = /\.\*$/.test(imp);
			const baseImport = imp.replace(/\.\*$/, '');
			const cleanModName = baseImport.split('.').pop();

			const entryFileOrDir = this.resolveModuleEntry(imp, document.uri);

			let subModules = new Map();
			let isPackage = false;
			let pkgDir = '';

			if (entryFileOrDir) {
				let entryIsDir = false;
				try { entryIsDir = fs.statSync(entryFileOrDir).isDirectory(); } catch (e) {}

				if (entryIsDir) {
					isPackage = true;
					pkgDir = entryFileOrDir;
				} else {
					pkgDir = path.dirname(entryFileOrDir);
					if (path.basename(entryFileOrDir).toLowerCase().startsWith('_init_.')) {
						isPackage = true;
					}
				}
				if (isPackage) {
					subModules = this.getSubModulesOfDir(pkgDir);
				}

				// ★ 计算可跳转的 entryFile（一定是文件，永远不是目录）
				let entryFile = null;
				try {
					if (entryIsDir) {
						// 优先 _init_.v
						for (const ext of ['.v', '.vox', '.voxs']) {
							const f = path.join(entryFileOrDir, '_init_' + ext);
							if (fs.existsSync(f) && fs.statSync(f).isFile()) { entryFile = f; break; }
						}
						// 没有 _init_.v：取目录下第一个 .v 文件
						if (!entryFile) {
							const entries = fs.readdirSync(entryFileOrDir);
							for (const name of entries) {
								if (/\.(v|vox|voxs)$/i.test(name)) {
									const f = path.join(entryFileOrDir, name);
									if (fs.statSync(f).isFile()) { entryFile = f; break; }
								}
							}
						}
					} else {
						entryFile = entryFileOrDir;
					}
				} catch (e) {}

				let modDoc = '';
				if (entryFile) {
					try {
						const entryContent = fs.readFileSync(entryFile, 'utf-8');
						const parsedEntry = VoxParser.parseText(entryContent, vscode.Uri.file(entryFile));
						modDoc = parsedEntry.fileDoc;
					} catch (e) {}
				}

				modules.set(cleanModName, {
					path: entryFileOrDir,
					entryFile: entryFile,       // ★ 新增：明确的可跳转文件
					isPackage,
					pkgDir,
					subModules,
					doc: modDoc
				});
			}

			// ★ 非通配符导入：不铺平到当前作用域，但要把 _init_.v 和所有子模块的
			//   classes / enums / signals 加载到全局符号表，用于：
			//     - hover `window.Window` 显示类签名
			//     - 签名弹窗 `Window(...)` 找到重载
			//     - 装饰器识别 `window.Window` 里的 Window 为类色
			//   （变量/函数/常量不加载，保持"必须加前缀访问"的语义）
			if (!isWildcard) {
				const modInfo = modules.get(cleanModName);
				if (modInfo) {
					const loadFileClasses = (filePath, depth) => {
						if (!filePath || visitedFiles.has(filePath) || (depth || 0) > 6) return;
						visitedFiles.add(filePath);
						try {
							if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return;
							const content = fs.readFileSync(filePath, 'utf-8');
							const fileUri = vscode.Uri.file(filePath);
							const importedData = VoxParser.parseText(content, fileUri);
							allClasses.push(...importedData.classes);
							allEnums.push(...importedData.enums);
							allSignals.push(...importedData.signals);

							// ★ 递归追它 using 进来的模块
							for (const subImp of importedData.imports) {
								const subBase = subImp.replace(/\.\*$/, '');
								const subEntry = this.resolveModuleEntry(subBase, fileUri);
								if (!subEntry) continue;
								let handled = false;
								try {
									if (fs.existsSync(subEntry) && fs.statSync(subEntry).isDirectory()) {
										// 优先 _init_.v
										let hasInit = false;
										for (const ext of ['.v', '.vox', '.voxs']) {
											const f = path.join(subEntry, '_init_' + ext);
											if (fs.existsSync(f) && fs.statSync(f).isFile()) {
												loadFileClasses(f, (depth || 0) + 1);
												hasInit = true;
												break;
											}
										}
										// 没有 _init_.v：加载目录下**所有** .v
										if (!hasInit) {
											for (const nm of fs.readdirSync(subEntry)) {
												if (/\.(v|vox|voxs)$/i.test(nm)) {
													const f = path.join(subEntry, nm);
													if (fs.statSync(f).isFile()) {
														loadFileClasses(f, (depth || 0) + 1);
													}
												}
											}
										}
										handled = true;
									} else {
										loadFileClasses(subEntry, (depth || 0) + 1);
										handled = true;
									}
								} catch (e) {}
							}
						} catch (e) {}
					};

					if (modInfo.entryFile) loadFileClasses(modInfo.entryFile, 0);

					if (modInfo.subModules) {
						for (const [, subPath] of modInfo.subModules.entries()) {
							try {
								if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
									let hasInit = false;
									for (const ext of ['.v', '.vox', '.voxs']) {
										const f = path.join(subPath, '_init_' + ext);
										if (fs.existsSync(f) && fs.statSync(f).isFile()) {
											loadFileClasses(f, 0);
											hasInit = true;
											break;
										}
									}
									if (!hasInit) {
										for (const nm of fs.readdirSync(subPath)) {
											if (/\.(v|vox|voxs)$/i.test(nm)) {
												const f = path.join(subPath, nm);
												if (fs.statSync(f).isFile()) loadFileClasses(f, 0);
											}
										}
									}
								} else if (fs.existsSync(subPath)) {
									loadFileClasses(subPath, 0);
								}
							} catch (e) {}
						}
					}
				}
				continue;
			}

			// 通配符：只铺开 baseImport 对应目录的 _init_.v
			// 语义：using Code.window.*;  →  Code/window/_init_.v
			const wildcardEntry = this.resolveModuleEntry(baseImport, document.uri);
			if (!wildcardEntry) continue;

			const files = [];
			try {
				if (fs.statSync(wildcardEntry).isDirectory()) {
					// 目录但 resolveModuleEntry 没找到 _init_.v：视为空包，跳过
					continue;
				} else {
					files.push(wildcardEntry);
				}
			} catch (e) {
				continue;
			}

			for (const f of files) {
				if (visitedFiles.has(f)) continue;
				visitedFiles.add(f);
				try {
					const content = fs.readFileSync(f, 'utf-8');
					const fileUri = vscode.Uri.file(f);
					const importedData = VoxParser.parseText(content, fileUri);
					allVariables.push(...importedData.variables);
					allConstants.push(...importedData.constants);
					allFunctions.push(...importedData.functions);
					allClasses.push(...importedData.classes);
					allEnums.push(...importedData.enums);
				} catch (e) {}
			}
		}

		return {
			localVariables: currentData.localVariables,
			currentDocVariables: currentData.variables,
			currentDocConstants: currentData.constants,
			currentDocFunctions: currentData.functions,
			currentDocClasses: currentData.classes,
			currentDocFileDoc: currentData.fileDoc,
			variables: allVariables,
			constants: allConstants,
			functions: allFunctions,
			classes: allClasses,
			enums: allEnums,
			modules
		};
	}
}

// 4. 精确动态语法高亮扫描（基于上下文推导）
function updateDecorations(editor) {
	if (!editor || !editor.document || !isVoxDocument(editor.document)) return;
	try {
		updateDecorationsImpl(editor);
	} catch (err) {
		voxLog('updateDecorations FAILED:', err && err.stack || String(err));
	}
}

// 计算语义诊断：未定义/越作用域变量、缺少分号、函数缺 return、return 类型不匹配
function computeDiagnostics(document, sym) {
	const diags = [];
	if (!isVoxDocument(document)) return diags;

	const T = t();
	const { localVariables, variables, constants, functions, classes, enums, signals, modules } = sym;
	const text = document.getText();
	const lines = text.split('\n');
	const len = text.length;
	const currentUriStr = document.uri.toString();

	const inCurrentDoc = (item) => item && item.uri && item.uri.toString() === currentUriStr;

	// ===== 模板参数：按作用域记录（只作用于紧跟的类/函数） =====
	const templateVarScopes = [];
	for (const c of classes) {
		if (c.templateParams && c.templateParams.length > 0) {
			const sLine = c.startLine;
			const eLine = c.endLine === -1 ? lines.length - 1 : c.endLine;
			for (const tp of c.templateParams) {
				templateVarScopes.push({ name: tp, startLine: sLine, endLine: eLine });
			}
		}
	}
	for (const f of functions) {
		if (f.templateParams && f.templateParams.length > 0) {
			const sLine = f.startLine;
			const eLine = f.endLine === -1 ? lines.length - 1 : f.endLine;
			for (const tp of f.templateParams) {
				templateVarScopes.push({ name: tp, startLine: sLine, endLine: eLine });
			}
		}
	}
	const templateParams = new Set(templateVarScopes.map(s => s.name));

	// ===== (1) 未定义/越作用域：使用全部已加载的符号 =====
	const classSet = new Set(classes.map(c => c.name));
	enums.forEach(e => classSet.add(e.name));
	(signals || []).forEach(s => classSet.add(s.name));
	BUILTIN_EXCEPTIONS.forEach(e => classSet.add(e));
	templateParams.forEach(p => classSet.add(p));

	const globalVarSet = new Set(variables.map(v => v.name));
	const constSet = new Set(constants.map(c => c.name));
	const funcSet = new Set(functions.map(f => f.name));
	const fieldSet = new Set();
	for (const c of classes) {
		for (const m of c.methods) funcSet.add(m.name);
		for (const s of (c.signals || [])) funcSet.add(s.name);
		for (const f of (c.fields || [])) fieldSet.add(f.name);
	}
	const moduleSet = new Set(modules.keys());
	const allLocalNames = new Set(
		localVariables.filter(v => inCurrentDoc(v)).map(v => v.name)
	);

	// 预扫描：找出所有 `类型 名字` 里的"名字"位置，避免误报参数名/声明名
	// 用 token 扫描：相邻两个标识符之间只隔空白时，后一个视为"名字"
	const declNamePositions = new Set(); // key: "line:col"
	const NON_TYPE_KEYWORDS = new Set([
		'return', 'using', 'new', 'if', 'else', 'for', 'foreach', 'while', 'do',
		'switch', 'case', 'default', 'try', 'catch', 'finally', 'with', 'in', 'is',
		'const', 'raise', 'delete', 'break', 'continue'
	]);
	for (let li = 0; li < lines.length; li++) {
		const l = lines[li].replace(/\/\/.*$/, '');
		const tokens = [];
		let ti = 0;
		while (ti < l.length) {
			if (/[a-zA-Z_]/.test(l[ti])) {
				const s = ti;
				while (ti < l.length && /\w/.test(l[ti])) ti++;
				tokens.push({ text: l.slice(s, ti), col: s });
			} else {
				ti++;
			}
		}
		for (let k = 1; k < tokens.length; k++) {
			const prev = tokens[k - 1];
			const cur = tokens[k];
			const between = l.slice(prev.col + prev.text.length, cur.col);
			if (!/^\s+$/.test(between)) continue;
			if (NON_TYPE_KEYWORDS.has(prev.text)) continue;
			const after = l[cur.col + cur.text.length];
			if (after === '(' || after === '.') continue;
			declNamePositions.add(li + ':' + cur.col);
		}
	}

	let i = 0;
	while (i < len) {
		const ch = text[i];
		const nextCh = i + 1 < len ? text[i + 1] : '';

		if (ch === '/' && nextCh === '/') { i += 2; while (i < len && text[i] !== '\n') i++; continue; }
		if (ch === '/' && nextCh === '*') { i += 2; while (i < len) { if (text[i] === '*' && i + 1 < len && text[i + 1] === '/') { i += 2; break; } i++; } continue; }
		if (ch === '/' && nextCh === '-') { i += 2; while (i < len) { if (text[i] === '-' && i + 1 < len && text[i + 1] === '/') { i += 2; break; } i++; } continue; }

		if (ch === '"' || ch === "'") {
			const q = ch; i++;
			while (i < len) {
				if (text[i] === '\\') { i += 2; continue; }
				if (text[i] === q || text[i] === '\n') { if (text[i] === q) i++; break; }
				i++;
			}
			continue;
		}

		// 数字字面量整体跳过（覆盖 0xFF、1.5e3、1_000 等）
		if (/[0-9]/.test(ch)) {
			i++;
			while (i < len && /[0-9a-fA-FxXbBoOeE._]/.test(text[i])) i++;
			continue;
		}

		if (/[a-zA-Z_]/.test(ch)) {
			const start = i;
			while (i < len && /\w/.test(text[i])) i++;
			const word = text.slice(start, i);
			const startPos = document.positionAt(start);
			const endPos = document.positionAt(i);
			const line = startPos.line;
			const col = startPos.character;

			if (KEYWORDS.has(word)) continue;
			if (templateVarScopes.some(s =>
				s.name === word && line >= s.startLine && line <= s.endLine)) continue;

			// 当前行是 using 声明 → 整行不检查
			const lineText = lines[line] || '';
			if (/^\s*using\b/.test(lineText)) continue;

			// "类型 名字" 里的名字 → 跳过（参数名、字段名、变量名）
			if (declNamePositions.has(line + ':' + col)) continue;

			// 声明名：局部变量/lambda 变量
			const isDeclName = localVariables.some(v =>
				inCurrentDoc(v) &&
				v.range.start.line === line &&
				v.range.start.character === col);
			if (isDeclName) continue;

			// 点号成员跳过
			let prevIdx = start - 1;
			while (prevIdx >= 0 && (text[prevIdx] === ' ' || text[prevIdx] === '\t')) prevIdx--;
			if (prevIdx >= 0 && text[prevIdx] === '.') continue;

			// 后面跟 '(' → 调用
			let nextIdx = i;
			while (nextIdx < len && (text[nextIdx] === ' ' || text[nextIdx] === '\t')) nextIdx++;
			if (nextIdx < len && text[nextIdx] === '(') continue;

			const inLocalScope = localVariables.some(lv =>
				inCurrentDoc(lv) && lv.name === word &&
				line >= lv.startLine && line <= lv.endLine);
			if (inLocalScope) continue;
			if (globalVarSet.has(word)) continue;
			if (constSet.has(word)) continue;
			if (classSet.has(word)) continue;
			if (funcSet.has(word)) continue;
			if (fieldSet.has(word)) continue;
			if (moduleSet.has(word)) continue;
			if (word === 'self' || word === 'super') continue;

			if (allLocalNames.has(word)) {
				diags.push({
					range: new vscode.Range(startPos, endPos),
					message: T.outOfScope(word),
					severity: vscode.DiagnosticSeverity.Warning
				});
			} else {
				diags.push({
					range: new vscode.Range(startPos, endPos),
					message: T.undefinedIdentifier(word),
					severity: vscode.DiagnosticSeverity.Warning
				});
			}
			continue;
		}

		i++;
	}

	// ===== (2) using 后应为表达式 =====
	for (let li = 0; li < lines.length; li++) {
		const raw = lines[li];
		const m = raw.match(/^(\s*using\s*);/);
		if (m) {
			const semi = raw.indexOf(';');
			diags.push({
				range: new vscode.Range(li, semi, li, semi + 1),
				message: T.usingEmpty,
				severity: vscode.DiagnosticSeverity.Error
			});
		}
	}

	// ===== (3) 缺少分号 =====
	const EXCLUDE_LAST = new Set([';', '{', '}', ',', ':', '(', '\\']);
	const CONTROL_FLOW_LINE = /^(if|else|for|foreach|while|do|switch|case|default|try|catch|finally|using|class|struct|interface|enum|namespace|public|private|protected|static|extern|template|signal|override|abstract)\b/;
	let inDocBlock = false;
	let inBlockComment = false;
	for (let li = 0; li < lines.length; li++) {
		const lineText = lines[li];
		const t = lineText.trim();

		// 文档注释 /- ... -/ 跟踪
		if (inDocBlock) {
			if (t.includes('-/')) inDocBlock = false;
			continue;
		}
		if (t.startsWith('/-')) {
			if (!t.includes('-/')) inDocBlock = true;
			continue;
		}
		// 块注释 /* ... */ 跟踪
		if (inBlockComment) {
			if (t.includes('*/')) inBlockComment = false;
			continue;
		}
		if (t.startsWith('/*')) {
			if (!t.includes('*/')) inBlockComment = true;
			continue;
		}

		const raw = stripCommentsInLine(lineText);
		const trimmed = raw.trim();
		if (!trimmed) continue;
		if (trimmed.startsWith('*')) continue;

		const last = trimmed[trimmed.length - 1];
		if (last === '}') {
			const beforeBrace = trimmed.slice(0, -1).trim();
			if (/return\s+[^;{}]+$/.test(beforeBrace) || /[a-zA-Z_]\w*\s*=\s*[^;{}]+$/.test(beforeBrace)) {
				diags.push({
					range: new vscode.Range(li, trimmed.length - 2, li, trimmed.length - 1),
					message: T.missingSemicolon,
					severity: vscode.DiagnosticSeverity.Warning
				});
			}
			continue;
		}
		if (EXCLUDE_LAST.has(last)) continue;
		if (CONTROL_FLOW_LINE.test(trimmed)) continue;
		if (last === ')' || last === ']') {
			const nextLine = li + 1 < lines.length ? lines[li + 1].trim() : '';
			if (nextLine === '{' || nextLine.startsWith('{')) continue;
		}

		const rawTrimEnd = raw.replace(/\s+$/, '');
		if (rawTrimEnd.length === 0) continue;
		const lastCharCol = rawTrimEnd.length - 1;
		diags.push({
			range: new vscode.Range(li, lastCharCol, li, lastCharCol + 1),
			message: T.missingSemicolon,
			severity: vscode.DiagnosticSeverity.Warning
		});
	}

	// ===== (4) 变量类型不匹配 =====
	for (const v of [...localVariables, ...variables]) {
		if (!inCurrentDoc(v)) continue;
		if (!v.initExpr) continue;
		if (v.isLambda) continue;
		if (/[()]/.test(v.type || '')) continue; // 函数/lambda 类型
		if (v.type === 'var' || v.type === 'any') continue;
		const actual = inferExprType(v.initExpr);
		if (!actual) continue;
		if (isTypeCompatible(v.type, actual) === false) {
			diags.push({
				range: v.range,
				message: T.varTypeMismatch(v.name, v.type, actual),
				severity: vscode.DiagnosticSeverity.Warning
			});
		}
	}

	// ===== 用括号平衡找函数体范围（不依赖 fn.endLine） =====
	const findBodyRange = (startLine) => {
		let bodyStartLine = -1;
		let bodyStartCol = -1;
		for (let li = startLine; li < lines.length; li++) {
			const l = lines[li];
			const braceIdx = l.indexOf('{');
			const semiIdx = l.indexOf(';');
			if (braceIdx !== -1 && (semiIdx === -1 || braceIdx < semiIdx)) {
				bodyStartLine = li;
				bodyStartCol = braceIdx;
				break;
			}
			if (semiIdx !== -1 && (braceIdx === -1 || semiIdx < braceIdx)) break;
		}
		if (bodyStartCol === -1) return null;

		let depth = 0;
		for (let li = bodyStartLine; li < lines.length; li++) {
			const l = lines[li];
			const startC = (li === bodyStartLine) ? bodyStartCol : 0;
			for (let c = startC; c < l.length; c++) {
				if (l[c] === '{') depth++;
				else if (l[c] === '}') {
					depth--;
					if (depth === 0) return { startLine: bodyStartLine, endLine: li };
				}
			}
		}
		return null;
	};

	// ===== (5)(6)(7) 函数 return 检查（只查当前文档） =====
	const allFuncs = [];
	for (const f of functions) if (inCurrentDoc(f)) allFuncs.push(f);
	for (const c of classes) {
		if (!inCurrentDoc(c)) continue;
		for (const m of c.methods) if (inCurrentDoc(m)) allFuncs.push(m);
	}

	for (const fn of allFuncs) {
		if (!fn.range) continue;
		const retType = (fn.type || '').trim();
		const isVoidFn = retType === 'void' || fn.name === '_init_' || fn.name === '_del_';

		const body = findBodyRange(fn.startLine);
		if (!body) continue;

		let hasReturn = false;
		let hasValueReturn = false;
		const returnLines = [];
		for (let li = body.startLine; li <= body.endLine && li < lines.length; li++) {
			const l = stripCommentsInLine(lines[li]);
			if (/\breturn\b/.test(l)) {
				hasReturn = true;
				returnLines.push(li);
				if (/\breturn\s+[^;]+;/.test(l)) hasValueReturn = true;
			}
		}

		const lineText = lines[fn.startLine] || '';
		const nameStartChar = fn.range.start.character;
		const nameEndChar = nameStartChar + fn.name.length;
		let typeIdx = -1;
		if (retType) {
			const beforeName = lineText.substring(0, nameStartChar);
			typeIdx = beforeName.lastIndexOf(retType);
		}
		const rangeStart = typeIdx >= 0 ? typeIdx : 0;

		if (isVoidFn) {
			if (hasValueReturn) {
				for (const li of returnLines) {
					const l = lines[li].replace(/\/\/.*$/, '');
					const m = l.match(/\breturn\s+([^;]+);/);
					if (m && m[1].trim()) {
						const retIdx = l.indexOf('return');
						diags.push({
							range: new vscode.Range(li, retIdx, li, retIdx + m[0].length),
							message: T.voidHasReturn(fn.name),
							severity: vscode.DiagnosticSeverity.Warning
						});
					}
				}
			}
		} else {
			if (!hasReturn) {
				diags.push({
					range: new vscode.Range(fn.startLine, rangeStart, fn.startLine, nameEndChar),
					message: T.noReturn(fn.name, retType),
					severity: vscode.DiagnosticSeverity.Error
				});
			} else {
				for (const li of returnLines) {
					const l = lines[li].replace(/\/\/.*$/, '');
					const m = l.match(/\breturn\s+([^;]+);/);
					if (!m) continue;
					const expr = m[1].trim();
					if (!expr) continue;
					const actual = inferExprType(expr);
					if (!actual || actual === 'lambda') continue;
					if (isTypeCompatible(retType, actual) === false) {
						const retIdx = l.indexOf('return');
						diags.push({
							range: new vscode.Range(li, retIdx, li, retIdx + m[0].length),
							message: T.returnTypeMismatch(retType, actual),
							severity: vscode.DiagnosticSeverity.Error
						});
					}
				}
			}
		}
	}

	// ===== (8) Lambda return 检查（保持原样） =====
	for (let li = 0; li < lines.length; li++) {
		const line = lines[li];
		const noComment = stripCommentsInLine(line);
		const arrowIdx = noComment.indexOf('=>');
		if (arrowIdx === -1) continue;

		const before = noComment.substring(0, arrowIdx);
		let retType = 'void';
		let retTypeCol = 0;
		const parenMatch = before.match(/([a-zA-Z_]\w*(?:<[^>]+>)?)\s*\(([^()]*)\)\s*$/);
		if (parenMatch) {
			retType = parenMatch[1];
			retTypeCol = before.lastIndexOf(retType);
			if (retTypeCol < 0) retTypeCol = 0;
		} else {
			continue;
		}
		if (KEYWORDS.has(retType) && retType !== 'void') continue;
		if (retType === 'new') continue;

		const braceCol = noComment.indexOf('{', arrowIdx);
		let bodyStartLine = li;
		let bodyEndLine = li;
		if (braceCol === -1) {
			const exprPart = noComment.substring(arrowIdx + 2).trim();
			if (retType === 'void' && exprPart && !exprPart.startsWith('{')) {
				diags.push({
					range: new vscode.Range(li, arrowIdx, li, noComment.length),
					message: T.lambdaVoidHasReturn,
					severity: vscode.DiagnosticSeverity.Warning
				});
			}
			continue;
		}

		let depth = 0;
		let found = false;
		for (let ei = li; ei < lines.length; ei++) {
			const eLine = lines[ei];
			let ec = (ei === li ? braceCol : 0);
			for (; ec < eLine.length; ec++) {
				if (eLine[ec] === '{') depth++;
				else if (eLine[ec] === '}') {
					depth--;
					if (depth === 0) { bodyEndLine = ei; found = true; break; }
				}
			}
			if (found) break;
		}
		if (!found) continue;

		let hasReturn = false;
		let hasValueReturn = false;
		const returnLines = [];
		for (let ei = li; ei <= bodyEndLine && ei < lines.length; ei++) {
			const l = lines[ei].replace(/\/\/.*$/, '').replace(/\/\*[\s\S]*?\*\//g, '');
			if (/\breturn\b/.test(l)) {
				hasReturn = true;
				returnLines.push(ei);
				if (/\breturn\s+[^;]+;/.test(l)) hasValueReturn = true;
			}
		}

		if (retType === 'void') {
			if (hasValueReturn) {
				for (const ei of returnLines) {
					const l = lines[ei].replace(/\/\/.*$/, '');
					const m = l.match(/\breturn\s+([^;]+);/);
					if (m && m[1].trim()) {
						const retIdx = l.indexOf('return');
						diags.push({
							range: new vscode.Range(ei, retIdx, ei, retIdx + m[0].length),
							message: T.lambdaVoidHasReturn,
							severity: vscode.DiagnosticSeverity.Warning
						});
					}
				}
			}
		} else {
			if (!hasReturn) {
				diags.push({
					range: new vscode.Range(li, retTypeCol, li, retTypeCol + retType.length),
					message: T.lambdaNoReturn(retType),
					severity: vscode.DiagnosticSeverity.Warning
				});
			} else {
				for (const ei of returnLines) {
					const l = lines[ei].replace(/\/\/.*$/, '');
					const m = l.match(/\breturn\s+([^;]+);/);
					if (!m) continue;
					const expr = m[1].trim();
					const actual = inferExprType(expr);
					if (!actual || actual === 'lambda') continue;
					if (isTypeCompatible(retType, actual) === false) {
						const retIdx = l.indexOf('return');
						diags.push({
							range: new vscode.Range(ei, retIdx, ei, retIdx + m[0].length),
							message: T.returnTypeMismatch(retType, actual),
							severity: vscode.DiagnosticSeverity.Error
						});
					}
				}
			}
		}
	}

		// ===== (9) 未闭合字符串 =====
	let strIn = false;
	let strStartLine = -1;
	let strStartCol = -1;
	let strQuote = '';
	let strIsRaw = false;
	for (let li = 0; li < lines.length; li++) {
		const l = lines[li];
		let inComment = false;
		for (let ci = 0; ci < l.length; ci++) {
			if (inComment) break;
			// 只有在字符串外部才判断注释
			if (!strIn && l[ci] === '/' && ci + 1 < l.length) {
				if (l[ci + 1] === '/') { inComment = true; break; }
				if (l[ci + 1] === '*') {
					// 这里简单跳过块注释内的内容，因为字符串扫描主要是单行
					let endCi = l.indexOf('*/', ci + 2);
					if (endCi === -1) { inComment = true; break; }
					ci = endCi + 1;
					continue;
				}
			}
			if (!strIn) {
				if (l[ci] === '"' || l[ci] === "'") {
					strIn = true;
					strQuote = l[ci];
					strStartLine = li;
					strStartCol = ci;
					strIsRaw = (ci > 0 && l[ci - 1] === '@');
				}
			} else {
				if (!strIsRaw && l[ci] === '\\') { ci++; continue; }
				if (l[ci] === strQuote) {
					strIn = false;
				}
			}
		}

		if (strIn && !strIsRaw) {
			diags.push({
				range: new vscode.Range(strStartLine, strStartCol, li, l.length),
				message: T.unclosedString,
				severity: vscode.DiagnosticSeverity.Error
			});
			strIn = false;
		}
	}

	// ===== (10) 括号未匹配 =====
	const braceStack = [];
	for (let li = 0; li < lines.length; li++) {
		const l = stripCommentsInLine(lines[li]);
		let isStr = false;
		let q = '';
		let isRawStr = false;
		let ci = 0;
		while (ci < l.length) {
			const c = l[ci];
			if (isStr) {
				if (!isRawStr && c === '\\') { ci += 2; continue; }
				if (c === q) isStr = false;
			} else {
				if (c === '"' || c === "'") {
					isStr = true; q = c;
					isRawStr = (ci > 0 && l[ci - 1] === '@');
				} else if (c === '{' || c === '[' || c === '(') {
					braceStack.push({ ch: c, line: li, col: ci });
				} else if (c === '}' || c === ']' || c === ')') {
					const expected = c === '}' ? '{' : c === ']' ? '[' : '(';
					if (braceStack.length === 0 || braceStack[braceStack.length - 1].ch !== expected) {
						diags.push({
							range: new vscode.Range(li, ci, li, ci + 1),
							message: T.mismatchedBrace,
							severity: vscode.DiagnosticSeverity.Error
						});
					} else {
						braceStack.pop();
					}
				}
			}
			ci++;
		}
	}
	for (const b of braceStack) {
		diags.push({
			range: new vscode.Range(b.line, b.col, b.line, b.col + 1),
			message: T.unclosedBrace,
			severity: vscode.DiagnosticSeverity.Error
		});
	}

	return diags;
}

function updateDecorationsImpl(editor) {
	const doc = editor.document;
	const {
		localVariables,
		variables,
		constants,
		functions,
		classes,
		enums,
		signals,
		modules
	} = ModuleResolver.getAllSymbols(doc);

	const text = doc.getText();
	const len = text.length;
	const lines = text.split('\n');

	const classSet = new Set(classes.map(c => c.name));
	// 模板参数：按"类/函数作用域"记录，不全局着色
	const templateVarScopes = [];
	for (const c of classes) {
		if (c.templateParams && c.templateParams.length > 0) {
			const sLine = c.startLine;
			const eLine = c.endLine === -1 ? lines.length - 1 : c.endLine;
			for (const tp of c.templateParams) {
				templateVarScopes.push({ name: tp, startLine: sLine, endLine: eLine });
			}
		}
	}
	for (const f of functions) {
		if (f.templateParams && f.templateParams.length > 0) {
			const sLine = f.startLine;
			const eLine = f.endLine === -1 ? lines.length - 1 : f.endLine;
			for (const tp of f.templateParams) {
				templateVarScopes.push({ name: tp, startLine: sLine, endLine: eLine });
			}
		}
	}
	enums.forEach(e => classSet.add(e.name));   // 枚举类型名 + 枚举成员名都在这里
	BUILTIN_EXCEPTIONS.forEach(ex => classSet.add(ex));
	classSet.add('super');

	const constSet = new Set(constants.map(c => c.name));
	constants.forEach(c => {
		if (c.uri && c.uri.fsPath === doc.uri.fsPath) {
			constSet.add(c.name);
		}
	});

	const knownFuncSet = new Set();
	BUILTIN_FUNCTIONS.forEach(f => knownFuncSet.add(f.name));
	functions.forEach(f => knownFuncSet.add(f.name));
	classes.forEach(c => c.methods.forEach(m => knownFuncSet.add(m.name)));

	const definedVarSet = new Set(variables.map(v => v.name));
	// 类字段也要被识别为「已定义符号」，否则字段名不会高亮为变量色
	for (const c of classes) {
		for (const f of c.fields) {
			definedVarSet.add(f.name);
		}
	}

	const commentRanges = [];
	const stringRanges = [];
	const escapeRanges = [];
	const controlFlowRanges = [];
	const keywordRanges = [];
	const varRanges = [];
	const constRanges = [];
	const classRanges = [];
	const funcRanges = [];
	const enumMemberRanges = [];
	const numberRanges = [];

	const interpolationIdentifiers = [];
	let i = 0;
	while (i < len) {
		const ch = text[i];
		const nextCh = i + 1 < len ? text[i + 1] : '';

		// 行注释与块注释
		if (ch === '/' && nextCh === '/') {
			const start = i;
			i += 2;
			while (i < len && text[i] !== '\n') i++;
			commentRanges.push(new vscode.Range(doc.positionAt(start), doc.positionAt(i)));
			continue;
		}

		if (ch === '/' && nextCh === '*') {
			const start = i;
			i += 2;
			while (i < len) {
				if (text[i] === '*' && i + 1 < len && text[i + 1] === '/') {
					i += 2;
					break;
				}
				i++;
			}
			commentRanges.push(new vscode.Range(doc.positionAt(start), doc.positionAt(i)));
			continue;
		}

		if (ch === '/' && nextCh === '-') {
			const start = i;
			i += 2;
			while (i < len) {
				if (text[i] === '-' && i + 1 < len && text[i + 1] === '/') {
					i += 2;
					break;
				}
				i++;
			}
			commentRanges.push(new vscode.Range(doc.positionAt(start), doc.positionAt(i)));
			continue;
		}

		// 字符串与转义字符
		if (ch === '"' || ch === "'") {
			const quoteChar = ch;
			const start = i;
			const isRaw = (start >= 1 && text[start - 1] === '@');
			const isInterp = (start >= 1 && text[start - 1] === '$');
			let strSegStart = i;
			i++;
			while (i < len) {
				if (!isRaw && text[i] === '\\') {
					if (i > strSegStart) stringRanges.push(new vscode.Range(doc.positionAt(strSegStart), doc.positionAt(i)));
					const escStart = i;
					i++;
					if (i < len) {
						if (text[i] === 'u') i = Math.min(len, i + 5);
						else if (text[i] === 'x') i = Math.min(len, i + 3);
						else i++;
					}
					escapeRanges.push(new vscode.Range(doc.positionAt(escStart), doc.positionAt(i)));
					strSegStart = i;
					continue;
				}
				if (isInterp && text[i] === '{' && text[i + 1] !== '{') {
					if (i > strSegStart) stringRanges.push(new vscode.Range(doc.positionAt(strSegStart), doc.positionAt(i)));
					controlFlowRanges.push(new vscode.Range(doc.positionAt(i), doc.positionAt(i + 1)));
					let depth = 1;
					let j = i + 1;
					let exprStart = j;
					while (j < len && depth > 0) {
						if (text[j] === '"' || text[j] === "'") {
							let q = text[j]; j++;
							while (j < len && text[j] !== q && text[j] !== '\n') { if (text[j] === '\\') j += 2; else j++; }
							if (j < len && text[j] === q) j++;
						} else if (text[j] === '{') {
							depth++;
						} else if (text[j] === '}') {
							depth--;
						}
						j++;
					}
					if (j <= len) {
						controlFlowRanges.push(new vscode.Range(doc.positionAt(j - 1), doc.positionAt(j)));
						const exprText = text.slice(exprStart, j - 1);
						const idRegex = /[a-zA-Z_]\w*/g;
						let idMatch;
						while ((idMatch = idRegex.exec(exprText)) !== null) {
							interpolationIdentifiers.push({
								word: idMatch[0],
								pos: doc.positionAt(exprStart + idMatch.index)
							});
						}
						i = j;
						strSegStart = i;
						continue;
					}
				}
				if (text[i] === quoteChar || text[i] === '\n') {
					if (text[i] === quoteChar) i++;
					break;
				}
				i++;
			}
			if (i > strSegStart) stringRanges.push(new vscode.Range(doc.positionAt(strSegStart), doc.positionAt(i)));
			continue;
		}
		// 数字（支持十进制、浮点、0x/0b/0o 前缀）
		if (/[0-9]/.test(ch)) {
			const start = i;
			i++;
			// 允许字母 x/X/b/B/o/O/e/E 和点、下划线（覆盖 0x1F、1.5e3、1_000 等）
			while (i < len && /[0-9a-fA-FxXbBoOeE._]/.test(text[i])) i++;
			numberRanges.push(new vscode.Range(doc.positionAt(start), doc.positionAt(i)));
			continue;
		}

		// 标识符与语法词解析
		if (/[a-zA-Z_]/.test(ch)) {
			const start = i;
			while (i < len && /\w/.test(text[i])) i++;
			const word = text.slice(start, i);
			const startPos = doc.positionAt(start);
			const endPos = doc.positionAt(i);
			const range = new vscode.Range(startPos, endPos);
			const currentLineIdx = startPos.line;
			const currentLineText = doc.lineAt(currentLineIdx).text;

			const isInsideUsingLine = /^\s*using\b/.test(currentLineText);

			// 检查是否跟在 . 后面
			let isDotMember = false;
			let prevIdx = start - 1;
			while (prevIdx >= 0 && (text[prevIdx] === ' ' || text[prevIdx] === '\t')) prevIdx--;
			if (prevIdx >= 0 && text[prevIdx] === '.') {
				isDotMember = true;
			}

			// 检查是否跟随括号 (
			let isFollowedByParen = false;
			let nextIdx = i;
			while (nextIdx < len && (text[nextIdx] === ' ' || text[nextIdx] === '\t')) nextIdx++;
			if (nextIdx < len && text[nextIdx] === '(') {
				isFollowedByParen = true;
			}

			// 检查是否在 new 之后
			let isAfterNew = false;
			let preScan = isDotMember ? prevIdx - 1 : start - 1;
			while (preScan >= 0 && (text[preScan] === ' ' || text[preScan] === '\t' || /[a-zA-Z0-9_.]/.test(text[preScan]))) {
				if (preScan >= 3 && text.slice(preScan - 3, preScan) === 'new' && (preScan - 4 < 0 || /\s|[;(\[{=]/.test(text[preScan - 4]))) {
					isAfterNew = true;
					break;
				}
				preScan--;
			}

			const isLocalInScope = localVariables.some(lv =>
				lv.name === word && currentLineIdx >= lv.startLine && currentLineIdx <= lv.endLine
			);

			let isAfterTypeDecl = isAfterNew;
			let b = prevIdx;
			if (!isAfterTypeDecl) {
				if (b >= 4 && text.slice(b - 4, b + 1) === 'class') isAfterTypeDecl = true;
				else if (b >= 5 && text.slice(b - 5, b + 1) === 'struct') isAfterTypeDecl = true;
				else if (b >= 8 && text.slice(b - 8, b + 1) === 'interface') isAfterTypeDecl = true;
				else if (b >= 3 && text.slice(b - 3, b + 1) === 'enum') isAfterTypeDecl = true;
			}

			// 动态上下文推导：检查当前词是否处于模块链条（如 window.ui.Button）
			let isModuleOrSubModule = false;
			if (!isDotMember && modules.has(word)) {
				// 裸写模块名（window、screen 等），当作模块
				isModuleOrSubModule = true;
			} else if (isDotMember) {
				// 获取点号左侧的完整链条
				let chainStart = prevIdx - 1;
				while (chainStart >= 0 && /[a-zA-Z0-9_.]/.test(text[chainStart])) chainStart--;
				chainStart++;
				const prefixChain = text.slice(chainStart, prevIdx).trim();
				const chainParts = prefixChain.split('.');
				if (chainParts.length > 0 && modules.has(chainParts[0])) {
					let curMod = modules.get(chainParts[0]);
					for (let cp = 1; cp < chainParts.length; cp++) {
						if (curMod && curMod.subModules && curMod.subModules.has(chainParts[cp])) {
							const subP = curMod.subModules.get(chainParts[cp]);
							curMod = { subModules: ModuleResolver.getSubModulesOfDir(subP) };
						} else {
							curMod = null;
							break;
						}
					}
					if (curMod && curMod.subModules && curMod.subModules.has(word)) {
						isModuleOrSubModule = true;
					}
				}
			}

			// 模块导出符号：window.QUIT / window.ui.Input 等
			let moduleExportKind = null;
			if (!isModuleOrSubModule && isDotMember) {
				let chainStart = prevIdx - 1;
				while (chainStart >= 0 && /[a-zA-Z0-9_.]/.test(text[chainStart])) chainStart--;
				chainStart++;
				const prefixChain = text.slice(chainStart, prevIdx).trim();
				const modInfo = resolveModulePrefixInfo(prefixChain, modules);
				if (modInfo) {
					moduleExportKind = classifyModuleExport(modInfo, word);
				}
			}

			// ====================================================
			// 严格动态语法高亮
			// ====================================================
			// 保底：全大写 + 下划线 且长度 ≥ 2 的标识符也当常量处理
			// （防御 constSet 因环境/字符问题漏配）
			if (constSet.has(word)) {
				constRanges.push(range);
			} else if (word === 'super') {
				classRanges.push(range);
			} else if (CONTROL_FLOW_KEYWORDS.has(word)) {
				controlFlowRanges.push(range);
			} else if (BASIC_KEYWORDS.has(word)) {
				keywordRanges.push(range);
			} else if (isInsideUsingLine) {
				classRanges.push(range);
			} else if (templateVarScopes.some(s =>
				s.name === word &&
				currentLineIdx >= s.startLine &&
				currentLineIdx <= s.endLine
			)) {
				classRanges.push(range);
			} else if (classSet.has(word)) {
				// 判断是枚举成员还是普通类
				const isEnumMember = enums.some(e => e.isEnumMember && e.name === word);
				if (isEnumMember) {
					enumMemberRanges.push(range);
				} else {
					classRanges.push(range);
				}
			} else if (isModuleOrSubModule) {
				classRanges.push(range);
			} else if (moduleExportKind === 'constant') {
				constRanges.push(range);
			} else if (moduleExportKind === 'class') {
				classRanges.push(range);
			} else if (moduleExportKind === 'function') {
				funcRanges.push(range);
			} else if (moduleExportKind === 'variable') {
				varRanges.push(range);
			} else if (isAfterNew || isAfterTypeDecl) {
				classRanges.push(range);
			} else if (isDotMember) {
				if (isFollowedByParen) {
					funcRanges.push(range);
				} else {
					varRanges.push(range);
				}
			} else if (isFollowedByParen || (knownFuncSet.has(word) && !isLocalInScope && !definedVarSet.has(word))) {
				funcRanges.push(range);
			} else if (isLocalInScope || (!isDotMember && definedVarSet.has(word))) {
				varRanges.push(range);
			}
			continue;
		}

		i++;
	}

	for (const item of interpolationIdentifiers) {
		const lineIdx = item.pos.line;
		const wRange = new vscode.Range(item.pos, item.pos.translate(0, item.word.length));
		
		if (CONTROL_FLOW_KEYWORDS.has(item.word)) {
			controlFlowRanges.push(wRange);
		} else if (BASIC_KEYWORDS.has(item.word)) {
			keywordRanges.push(wRange);
		} else if (constSet.has(item.word)) {
			constRanges.push(wRange);
		} else if (item.word === 'super') {
			classRanges.push(wRange);
		} else if (localVariables.some(lv => lv.name === item.word && lineIdx >= lv.startLine && lineIdx <= lv.endLine)) {
			varRanges.push(wRange);
		} else if (definedVarSet.has(item.word)) {
			varRanges.push(wRange);
		} else if (knownFuncSet.has(item.word)) {
			funcRanges.push(wRange);
		} else if (classSet.has(item.word)) {
			classRanges.push(wRange);
		}
	}

	editor.setDecorations(controlFlowDecorationType, controlFlowRanges);
	editor.setDecorations(keywordDecorationType, keywordRanges);
	editor.setDecorations(stringDecorationType, stringRanges);
	editor.setDecorations(escapeDecorationType, escapeRanges);
	editor.setDecorations(varDecorationType, varRanges);
	editor.setDecorations(constDecorationType, constRanges);
	editor.setDecorations(classDecorationType, classRanges);
	editor.setDecorations(funcDecorationType, funcRanges);
	editor.setDecorations(commentDecorationType, commentRanges);
	editor.setDecorations(enumMemberDecorationType, enumMemberRanges);
	editor.setDecorations(numberDecorationType, numberRanges);

	// 诊断
	try {
		const diags = computeDiagnostics(doc, {
			localVariables, variables, constants, functions, classes, enums, signals, modules
		});
		if (VOX_DIAGNOSTICS) VOX_DIAGNOSTICS.set(doc.uri, diags);
	} catch (e) {
		voxLog('diagnostics failed:', e && e.stack || String(e));
	}
}

function checkVoxExecutable(exePath) {
	try {
		const res = cp.spawnSync(exePath, ['--version'], { encoding: 'utf-8', shell: true });
		return res.status === 0 || !res.error;
	} catch (e) {
		return false;
	}
}

async function getOrPromptVoxPath() {
	const config = vscode.workspace.getConfiguration('vox');
	let configuredPath = (config.get('compilerPath') || '').trim();

	if (configuredPath) {
		if (fs.existsSync(configuredPath) && fs.statSync(configuredPath).isDirectory()) {
			const candidateExe = path.join(configuredPath, process.platform === 'win32' ? 'vox.exe' : 'vox');
			if (fs.existsSync(candidateExe)) return candidateExe;
		}
		if (fs.existsSync(configuredPath) || checkVoxExecutable(configuredPath)) {
			return configuredPath;
		}
		vscode.window.showWarningMessage(`配置的 Vox 编译器路径无效: ${configuredPath}`);
	}

	if (checkVoxExecutable('vox')) return 'vox';

	const selection = await vscode.window.showErrorMessage(
		'未在系统环境变量中找到 vox 编译器，请指定 vox.exe 的完整路径。',
		'选择 Vox 编译器路径',
		'取消'
	);

	if (selection === '选择 Vox 编译器路径') {
		const uri = await vscode.window.showOpenDialog({
			canSelectFiles: true,
			canSelectFolders: false,
			canSelectMany: false,
			openLabel: '选择编译器 (vox.exe)',
			filters: { 'Executable': ['exe', 'bat', 'cmd', ''] }
		});

		if (uri && uri.length > 0) {
			const selectedPath = uri[0].fsPath;
			await config.update('compilerPath', selectedPath, vscode.ConfigurationTarget.Global);
			return selectedPath;
		}
	}

	return null;
}

async function runCurrentVoxFile() {
	const editor = vscode.window.activeTextEditor;
	if (!editor) return;

	const doc = editor.document;
	if (!isVoxDocument(doc)) return;
	if (doc.isDirty) await doc.save();

	const voxExe = await getOrPromptVoxPath();
	if (!voxExe) return;

	const filePath = doc.fileName;
	const fileDir = path.dirname(filePath);
	const fileName = path.basename(filePath);

	const fileContent = doc.getText();
	const hasWindowUsage = /\busing\s+(?:Code\.)?window\b/.test(fileContent) || /\bwindow\.init\s*\(/.test(fileContent);
	const hasLocalSdl3Dll = fs.existsSync(path.join(fileDir, 'SDL3.dll'));
	const needWindowFlag = hasWindowUsage && !hasLocalSdl3Dll;

	let terminal = vscode.window.terminals.find(t => t.name === 'Vox Run') || vscode.window.createTerminal('Vox Run');
	terminal.show();

	const cdCommand = `cd "${fileDir}"`;
	const windowArg = needWindowFlag ? ' --window' : '';
	const execCommand = voxExe === 'vox' ? `vox run "${fileName}"${windowArg}` : `& "${voxExe}" run "${fileName}"${windowArg}`;

	terminal.sendText(cdCommand);
	terminal.sendText(execCommand);
}

// 5. 扩展激活
function activate(context) {
	VOX_EXTENSION_PATH = context.extensionPath;

	VOX_CHANNEL = vscode.window.createOutputChannel('Vox Language');
	context.subscriptions.push(VOX_CHANNEL);

	VOX_DIAGNOSTICS = vscode.languages.createDiagnosticCollection('vox');
	context.subscriptions.push(VOX_DIAGNOSTICS);

	vscode.languages.setLanguageConfiguration('vox', {
		brackets: [['{', '}'], ['[', ']'], ['(', ')']],
		autoClosingPairs: [
			{ open: '{', close: '}' },
			{ open: '[', close: ']' },
			{ open: '(', close: ')' },
			{ open: '"', close: '"', notIn: ['string'] },
			{ open: "'", close: "'", notIn: ['string', 'comment'] },
			{ open: '/*', close: '*/', notIn: ['string'] },
			{ open: '/-', close: '-/', notIn: ['string'] }
		]
	});

	const VOX_SELECTOR = [
		{ language: 'vox' },
		{ scheme: 'file', pattern: '**/*.v' },
		{ scheme: 'file', pattern: '**/*.vox' },
		{ scheme: 'file', pattern: '**/*.voxs' },
		{ scheme: 'untitled', pattern: '**/*.v' }
	];

	const triggerParamHintsCmd = {
		command: 'editor.action.triggerParameterHints',
		title: 'Trigger Parameter Hints'
	};

	const runCommand = vscode.commands.registerCommand('vox.runFile', () => runCurrentVoxFile());

	// 定义跳转
	const definitionProvider = vscode.languages.registerDefinitionProvider(
		VOX_SELECTOR,
		{
			provideDefinition(document, position) {
				if (!isVoxDocument(document) || isInsideComment(document, position)) return null;

				const range = document.getWordRangeAtPosition(position);
				if (!range) return null;
				const word = document.getText(range);

				const sym = ModuleResolver.getAllSymbols(document);
				const { localVariables, currentDocVariables, constants, functions, classes, modules } = sym;
				const cursorLine = position.line;

				// 判断是否是点号成员（前一个非空白字符是 '.'）
				const fullText = document.getText();
				const startOffset = document.offsetAt(range.start);
				let probe = startOffset - 1;
				while (probe >= 0 && (fullText[probe] === ' ' || fullText[probe] === '\t')) probe--;
				const isDotMember = probe >= 0 && fullText[probe] === '.';

				if (isDotMember) {
					// 点号成员：走链条推导，从对象的类/模块里找 word
					return resolveDotMemberDefinition(document, probe, word, sym);
				}

				// 非点号：原有逻辑
				const targetLocal = localVariables.find(v => v.name === word && cursorLine >= v.startLine && cursorLine <= v.endLine);
				if (targetLocal && targetLocal.range) return new vscode.Location(targetLocal.uri || document.uri, targetLocal.range);

				if (modules.has(word)) {
					const targetMod = modules.get(word);
					// 优先用预计算好的 entryFile（一定是文件）
					if (targetMod.entryFile && fs.existsSync(targetMod.entryFile)) {
						return new vscode.Location(vscode.Uri.file(targetMod.entryFile), new vscode.Position(0, 0));
					}

					// 回退：path 本身是文件也能跳
					if (targetMod.path && fs.existsSync(targetMod.path)) {
						try {
							if (fs.statSync(targetMod.path).isFile()) {
								return new vscode.Location(vscode.Uri.file(targetMod.path), new vscode.Position(0, 0));
							}
						} catch (e) {}
					}

					return null;
				}

				const targetConst = constants.find(c => c.name === word);
				if (targetConst && targetConst.range) return new vscode.Location(targetConst.uri || document.uri, targetConst.range);

				const targetVar = currentDocVariables.find(v => v.name === word);
				if (targetVar && targetVar.range) return new vscode.Location(targetVar.uri || document.uri, targetVar.range);

				const targetFunc = functions.find(f => f.name === word);
				if (targetFunc && targetFunc.range) return new vscode.Location(targetFunc.uri || document.uri, targetFunc.range);

				for (const cls of classes) {
					if (cls.name === word && cls.range) return new vscode.Location(cls.uri || document.uri, cls.range);
					const method = cls.methods.find(m => m.name === word);
					if (method && method.range) return new vscode.Location(method.uri || cls.uri || document.uri, method.range);
					const field = cls.fields.find(f => f.name === word);
					if (field && field.range) return new vscode.Location(field.uri || cls.uri || document.uri, field.range);
				}
				return null;
			}
		}
	);

	// 自动补全 Provider
	const completionProvider = vscode.languages.registerCompletionItemProvider(
		VOX_SELECTOR,
		{
			provideCompletionItems(document, position) {
				if (!isVoxDocument(document) || isInsideComment(document, position)) return [];

				const lineText = document.lineAt(position).text;
				const linePrefix = lineText.substring(0, position.character);
				const { variables, localVariables, constants, functions, classes, modules } = ModuleResolver.getAllSymbols(document);
				const items = [];
				const seenKeys = new Set();

				// 场景 4.0: 字符串字面量直接跟点号，例如 "hello".
				const strDotMatch = linePrefix.match(/(["'])((?:(?!\1).)*)\1\.([a-zA-Z_]\w*)?$/);
				if (strDotMatch) {
					for (const m of STRING_METHODS) {
						const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
						item.detail = `(string method) ${m.detail}`;
						item.documentation = createPreservedMarkdownString(m.doc);
						item.insertText = new vscode.SnippetString(`${m.name}($1)`);
						item.command = triggerParamHintsCmd;
						item.sortText = getSmartSortText('03', m.name);
						items.push(item);
					}
					return new vscode.CompletionList(items, false);
				}

				// 场景 1: using 路径补全
				const usingMatch = linePrefix.match(/^\s*using\s+([a-zA-Z0-9_.]*)$/);
				if (usingMatch) {
					const typedPath = usingMatch[1];
					const children = ModuleResolver.getDirectoryChildren(typedPath, document.uri);
					for (const c of children) {
						const item = new vscode.CompletionItem(c.name, c.kind);
						item.detail = c.detail;
						item.sortText = getSmartSortText('01', c.name);
						items.push(item);
					}
					return new vscode.CompletionList(items, false);
				}

				// 场景 2: super. 补全
				const superMatch = linePrefix.match(/\bsuper\.([a-zA-Z_]\w*)?$/);
				if (superMatch) {
					const currentCls = findEnclosingClass(document, position, classes);
					const superItems = [];
					if (currentCls && currentCls.bases) {
						for (const baseName of currentCls.bases) {
							const cleanBaseName = baseName.includes('.') ? baseName.split('.').pop() : baseName;
							const baseCls = classes.find(c => c.name === cleanBaseName || c.name === baseName);
							if (baseCls) {
								for (const m of baseCls.methods) {
									if (m.isStatic || m.modifier === 'private') continue;
									const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
									item.detail = `(inherited method) ${baseCls.name}.${m.name}(${m.rawParams}): ${m.type}`;
									if (m.doc) item.documentation = createPreservedMarkdownString(m.doc);
									item.insertText = new vscode.SnippetString(`${m.name}($1)`);
									item.command = triggerParamHintsCmd;
									item.sortText = getSmartSortText('01', m.name);
									superItems.push(item);
								}
								for (const f of baseCls.fields) {
									if (f.isStatic || f.modifier === 'private') continue;
									const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Field);
									item.detail = `(inherited field) ${baseCls.name}.${f.name}: ${f.type}`;
									if (f.doc) item.documentation = createPreservedMarkdownString(f.doc);
									item.sortText = getSmartSortText('02', f.name);
									superItems.push(item);
								}
							}
						}
					}
					return new vscode.CompletionList(superItems, false);
				}

				// 场景 3: self. 补全
				const selfMatch = linePrefix.match(/\bself\.([a-zA-Z_]\w*)?$/);
				if (selfMatch) {
					const currentCls = findEnclosingClass(document, position, classes);
					const selfItems = [];
					if (currentCls) {
						for (const m of currentCls.methods) {
							if (m.name === '_init_' || m.isStatic) continue;
							const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
							item.detail = `(method) ${currentCls.name}.${m.name}(${m.rawParams}): ${m.type}`;
							if (m.doc) item.documentation = createPreservedMarkdownString(m.doc);
							item.insertText = new vscode.SnippetString(`${m.name}($1)`);
							item.command = triggerParamHintsCmd;
							item.sortText = getSmartSortText('01', m.name);
							selfItems.push(item);
						}
						for (const f of currentCls.fields) {
							if (f.isStatic) continue;
							const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Field);
							item.detail = `${currentCls.name}.${f.name}: ${f.type}`;
							if (f.doc) item.documentation = createPreservedMarkdownString(f.doc);
							item.sortText = getSmartSortText('02', f.name);
							selfItems.push(item);
						}
					}
					return new vscode.CompletionList(selfItems, false);
				}

				// 场景 4: 多级链式点访问（精准作用域状态机）
				const dotMatch = linePrefix.match(/(?:^|[^a-zA-Z0-9_.])([a-zA-Z_]\w*(?:\.[a-zA-Z_]\w*)*)\.([a-zA-Z_]\w*)?$/);
				const cursorLine = position.line;
				const lines = document.getText().split('\n');

				if (dotMatch) {
					const fullCaller = dotMatch[1];
					const parts = fullCaller.split('.');
					let currentScopeType = null; // 'module' | 'class' | 'instance'
					let currentTargetName = null;
					let currentModuleInfo = null;

					for (let i = 0; i < parts.length; i++) {
						const part = parts[i];
						if (i === 0) {
							if (modules.has(part)) {
								currentScopeType = 'module';
								currentTargetName = part;
								currentModuleInfo = modules.get(part);
							} else if (classes.some(c => c.name === part)) {
								currentScopeType = 'class';
								currentTargetName = part;
							} else {
								const matchedVar = localVariables.find(v => v.name === part && cursorLine >= v.startLine && cursorLine <= v.endLine) || variables.find(v => v.name === part);
								if (matchedVar) {
									currentScopeType = 'instance';
									currentTargetName = inferVariableType(part, cursorLine, localVariables, variables, lines) || getBaseTypeName(matchedVar.baseType || matchedVar.type);
								} else {
									currentScopeType = 'instance';
									currentTargetName = part;
								}
							}
						} else {
							// 状态转移
							if (currentScopeType === 'module' && currentModuleInfo) {
								if (currentModuleInfo.subModules && currentModuleInfo.subModules.has(part)) {
									const subPath = currentModuleInfo.subModules.get(part);
									let subDoc = '';
									let isSubPkg = false;
									let subPkgDir = '';
									let subSubMods = new Map();
									if (fs.existsSync(subPath) && fs.statSync(subPath).isDirectory()) {
										isSubPkg = true;
										subPkgDir = subPath;
										subSubMods = ModuleResolver.getSubModulesOfDir(subPkgDir);
									}
									currentModuleInfo = {
										path: subPath,
										isPackage: isSubPkg,
										pkgDir: subPkgDir,
										subModules: subSubMods,
										doc: subDoc
									};
									currentTargetName = part;
									continue;
								}

								// 从模块导出项中查找类 / 变量 / 函数
								const modFilePath = currentModuleInfo.path;
								let modData = null;
								if (modFilePath && fs.existsSync(modFilePath) && !fs.statSync(modFilePath).isDirectory()) {
									try {
										const content = fs.readFileSync(modFilePath, 'utf-8');
										modData = VoxParser.parseText(content, vscode.Uri.file(modFilePath));
									} catch (e) {}
								}

								if (modData) {
									const foundCls = modData.classes.find(c => c.name === part);
									if (foundCls) {
										currentScopeType = 'class';
										currentTargetName = foundCls.name;
										continue;
									}
									const foundVar = modData.variables.find(v => v.name === part);
									if (foundVar) {
										currentScopeType = 'instance';
										currentTargetName = getBaseTypeName(foundVar.baseType || foundVar.type);
										continue;
									}
								}
							} else if (currentScopeType === 'class' || currentScopeType === 'instance') {
								const targetClass = classes.find(c => c.name === currentTargetName);
								if (targetClass) {
									const field = targetClass.fields.find(f => f.name === part);
									if (field) {
										currentScopeType = 'instance';
										currentTargetName = getBaseTypeName(field.baseType || field.type);
										continue;
									}
									const method = targetClass.methods.find(m => m.name === part);
									if (method) {
										currentScopeType = 'instance';
										currentTargetName = getBaseTypeName(method.type);
										continue;
									}
								}
							}
							currentTargetName = part;
						}
					}

					// 场景 4.1：最终作用域为 Module
					if (currentScopeType === 'module' && currentModuleInfo) {
						// 只扫描「模块自身的导出」：
						//   - 包（有 _init_.v）：只扫 _init_.v，其它 .v 是子模块
						//   - 单文件模块（xxx.v）：只扫该文件本身
						const filesToScan = [];
						if (currentModuleInfo.isPackage && currentModuleInfo.pkgDir) {
							for (const ext of ['.v', '.vox', '.voxs']) {
								const initFile = path.join(currentModuleInfo.pkgDir, '_init_' + ext);
								if (fs.existsSync(initFile) && fs.statSync(initFile).isFile()) {
									filesToScan.push(initFile);
									break;
								}
							}
						} else if (currentModuleInfo.path && fs.existsSync(currentModuleInfo.path)) {
							if (!fs.statSync(currentModuleInfo.path).isDirectory()) {
								filesToScan.push(currentModuleInfo.path);
							}
						}

						for (const f of filesToScan) {
							try {
								const content = fs.readFileSync(f, 'utf-8');
								const modData = VoxParser.parseText(content, vscode.Uri.file(f));
								for (const cls of modData.classes) {
									if (!seenKeys.has(cls.name)) {
										seenKeys.add(cls.name);
										const item = new vscode.CompletionItem(cls.name, cls.kind === 'struct' ? vscode.CompletionItemKind.Struct : vscode.CompletionItemKind.Class);
										item.detail = `${cls.kind || 'class'} ${cls.name}`;
										if (cls.doc) item.documentation = createPreservedMarkdownString(cls.doc);
										item.sortText = getSmartSortText('04', cls.name);
										items.push(item);
									}
								}
								for (const fn of modData.functions) {
									if (fn.modifier === 'private' || fn.modifier === 'protected') continue;
									if (!seenKeys.has(fn.name)) {
										seenKeys.add(fn.name);
										const item = new vscode.CompletionItem(fn.name, vscode.CompletionItemKind.Function);
										item.detail = `(function) ${fn.detail}`;
										if (fn.doc) item.documentation = createPreservedMarkdownString(fn.doc);
										item.insertText = new vscode.SnippetString(`${fn.name}($1)`);
										item.command = triggerParamHintsCmd;
										item.sortText = getSmartSortText('03', fn.name);
										items.push(item);
									}
								}
								for (const v of modData.variables) {
									if (v.modifier === 'private' || v.modifier === 'protected') continue;
									if (!seenKeys.has(v.name)) {
										seenKeys.add(v.name);
										const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
										item.detail = `${v.name}: ${v.type || 'var'}`;
										if (v.doc) item.documentation = createPreservedMarkdownString(v.doc);
										item.sortText = getSmartSortText('02', v.name);
										items.push(item);
									}
								}
								for (const cn of modData.constants) {
									if (!seenKeys.has(cn.name)) {
										seenKeys.add(cn.name);
										const item = new vscode.CompletionItem(cn.name, vscode.CompletionItemKind.Constant);
										item.detail = `(constant) const ${cn.name}`;
										if (cn.doc) item.documentation = createPreservedMarkdownString(cn.doc);
										item.sortText = getSmartSortText('02', cn.name);
										items.push(item);
									}
								}
							} catch (e) {}
						}

						// 后加入子模块，但已存在于 seenKeys 的跳过（避免覆盖真正的类）
						if (currentModuleInfo.subModules) {
							for (const [subModName, subPath] of currentModuleInfo.subModules.entries()) {
								if (seenKeys.has(subModName)) continue;
								const isDir = fs.existsSync(subPath) && fs.statSync(subPath).isDirectory();
								const item = new vscode.CompletionItem(subModName, isDir ? vscode.CompletionItemKind.Folder : vscode.CompletionItemKind.Module);
								item.detail = `module ${currentTargetName}.${subModName}`;
								item.sortText = getSmartSortText('01', subModName);
								items.push(item);
							}
						}

						return new vscode.CompletionList(items, false);
					}

					// 场景 4.2：最终作用域为 Class
					if (currentScopeType === 'class') {
						const targetClass = classes.find(c => c.name === currentTargetName);
						if (targetClass) {
							const currentCls = findEnclosingClass(document, position, classes);
							const isSubclassOfTarget = !!(currentCls && currentCls.bases &&
								currentCls.bases.some(b => {
									const clean = b.includes('.') ? b.split('.').pop() : b;
									return clean === targetClass.name;
								}));
							const isSelfAccess = !!(currentCls && currentCls.name === targetClass.name);

							for (const method of targetClass.methods) {
								if (method.name === '_init_' || !method.isStatic) continue;
								if (method.modifier === 'private' && !isSelfAccess) continue;
								if (method.modifier === 'protected' && !isSelfAccess && !isSubclassOfTarget) continue;
								const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
								item.detail = `(static method) ${targetClass.name}.${method.name}(${method.rawParams}): ${method.type}`;
								if (method.doc) item.documentation = createPreservedMarkdownString(method.doc);
								item.insertText = new vscode.SnippetString(`${method.name}($1)`);
								item.command = triggerParamHintsCmd;
								item.sortText = getSmartSortText('03', method.name);
								items.push(item);
							}
							for (const field of targetClass.fields) {
								if (!field.isStatic) continue;
								if (field.modifier === 'private' && !isSelfAccess) continue;
								if (field.modifier === 'protected' && !isSelfAccess && !isSubclassOfTarget) continue;
								const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
								item.detail = `${targetClass.name}.${field.name}: ${field.type}`;
								if (field.doc) item.documentation = createPreservedMarkdownString(field.doc);
								item.sortText = getSmartSortText('02', field.name);
								items.push(item);
							}
							return new vscode.CompletionList(items, false);
						}
					}

					// 场景 4.3.1：如果是 string 类型
					if (currentTargetName === 'string') {
						const dotItems = [];
						for (const m of STRING_METHODS) {
							const item = new vscode.CompletionItem(m.name, vscode.CompletionItemKind.Method);
							item.detail = `(string method) ${m.detail}`;
							item.documentation = createPreservedMarkdownString(m.doc);
							item.insertText = new vscode.SnippetString(`${m.name}($1)`);
							item.command = triggerParamHintsCmd;
							item.sortText = getSmartSortText('03', m.name);
							dotItems.push(item);
						}
						return new vscode.CompletionList(dotItems, false);
					}

					// 场景 4.3：最终作用域为 Instance
					const candidateClasses = currentTargetName ? classes.filter(c => c.name === currentTargetName) : classes;
					const dotItems = [];
					const seenDotKeys = new Set();

					// 判断当前所在类，用于权限过滤
					const currentCls = findEnclosingClass(document, position, classes);

					for (const cls of (candidateClasses.length > 0 ? candidateClasses : classes)) {
						const isSelfAccess = !!(currentCls && currentCls.name === cls.name);
						const isSubclassOfCls = !!(currentCls && currentCls.bases &&
							currentCls.bases.some(b => {
								const clean = b.includes('.') ? b.split('.').pop() : b;
								return clean === cls.name;
							}));

						for (const method of cls.methods) {
							if (method.name === '_init_') continue;
							if (method.modifier === 'private' && !isSelfAccess) continue;
							if (method.modifier === 'protected' && !isSelfAccess && !isSubclassOfCls) continue;
							if (!seenDotKeys.has(method.name)) {
								seenDotKeys.add(method.name);
								const item = new vscode.CompletionItem(method.name, vscode.CompletionItemKind.Method);
								item.detail = `(method) ${cls.name}.${method.name}(${method.rawParams}): ${method.type}`;
								if (method.doc) item.documentation = createPreservedMarkdownString(method.doc);
								item.insertText = new vscode.SnippetString(`${method.name}($1)`);
								item.command = triggerParamHintsCmd;
								item.sortText = getSmartSortText('03', method.name);
								dotItems.push(item);
							}
						}
						for (const field of cls.fields) {
							if (field.modifier === 'private' && !isSelfAccess) continue;
							if (field.modifier === 'protected' && !isSelfAccess && !isSubclassOfCls) continue;
							if (!seenDotKeys.has(field.name)) {
								seenDotKeys.add(field.name);
								const item = new vscode.CompletionItem(field.name, vscode.CompletionItemKind.Field);
								item.detail = `${cls.name}.${field.name}: ${field.type}`;
								if (field.doc) item.documentation = createPreservedMarkdownString(field.doc);
								item.sortText = getSmartSortText('02', field.name);
								dotItems.push(item);
							}
						}
					}
					return new vscode.CompletionList(dotItems, false);
				}

				if (/\.\s*$/.test(linePrefix)) return [];
				if (isDeclarationContext(linePrefix)) return [];

				// 场景 5: 全局范围符号补全
				for (const lv of localVariables) {
					if (cursorLine >= lv.startLine && cursorLine <= lv.endLine && !seenKeys.has(lv.name)) {
						seenKeys.add(lv.name);
						const item = new vscode.CompletionItem(lv.name, vscode.CompletionItemKind.Variable);
						item.detail = `(local variable) ${lv.type || 'var'} ${lv.name}`.trim();
						item.sortText = getSmartSortText('01', lv.name);
						items.push(item);
					}
				}

				for (const v of variables) {
					if (!seenKeys.has(v.name)) {
						seenKeys.add(v.name);
						const item = new vscode.CompletionItem(v.name, vscode.CompletionItemKind.Variable);
						item.detail = `${v.name}: ${v.type || 'var'}`;
						if (v.doc) item.documentation = createPreservedMarkdownString(v.doc);
						item.sortText = getSmartSortText('02', v.name);
						items.push(item);
					}
				}

				// 类字段：在类体外也能补全（如构造函数外引用 self 字段）
				for (const c of classes) {
					for (const f of c.fields) {
						if (f.isStatic || f.modifier === 'private') continue;
						if (seenKeys.has(f.name)) continue;
						seenKeys.add(f.name);
						const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Field);
						item.detail = `${c.name}.${f.name}: ${f.type}`;
						if (f.doc) item.documentation = createPreservedMarkdownString(f.doc);
						item.sortText = getSmartSortText('02', f.name);
						items.push(item);
					}
				}

				for (const c of constants) {
					if (!seenKeys.has(c.name)) {
						seenKeys.add(c.name);
						const item = new vscode.CompletionItem(c.name, vscode.CompletionItemKind.Constant);
						item.detail = `(constant) const ${c.name}`;
						if (c.doc) item.documentation = createPreservedMarkdownString(c.doc);
						item.sortText = getSmartSortText('02', c.name);
						items.push(item);
					}
				}

				for (const f of functions) {
					if (!seenKeys.has(f.name)) {
						seenKeys.add(f.name);
						const item = new vscode.CompletionItem(f.name, vscode.CompletionItemKind.Function);
						item.detail = `(function) ${f.detail}`;
						if (f.doc) item.documentation = createPreservedMarkdownString(f.doc);
						item.insertText = new vscode.SnippetString(`${f.name}($1)`);
						item.command = triggerParamHintsCmd;
						item.sortText = getSmartSortText('03', f.name);
						items.push(item);
					}
				}

				// 内置异常类
				for (const ex of BUILTIN_EXCEPTIONS) {
					if (!seenKeys.has(ex)) {
						seenKeys.add(ex);
						const item = new vscode.CompletionItem(ex, vscode.CompletionItemKind.Class);
						item.detail = `class ${ex} extends Exception`;
						item.documentation = createPreservedMarkdownString(
							`### ${ex}\nBuilt-in exception class.`
						);
						item.sortText = getSmartSortText('04', ex);
						items.push(item);
					}
				}

				for (const cls of classes) {
					if (!seenKeys.has(cls.name)) {
						seenKeys.add(cls.name);
						const item = new vscode.CompletionItem(cls.name, cls.kind === 'struct' ? vscode.CompletionItemKind.Struct : vscode.CompletionItemKind.Class);
						item.detail = `${cls.kind || 'class'} ${cls.name}`;
						if (cls.doc) item.documentation = createPreservedMarkdownString(cls.doc);
						item.sortText = getSmartSortText('04', cls.name);
						items.push(item);
					}
				}

				for (const [modName, modInfo] of modules.entries()) {
					if (!seenKeys.has(modName)) {
						seenKeys.add(modName);
						const item = new vscode.CompletionItem(modName, vscode.CompletionItemKind.Module);
						item.detail = `module ${modName}`;
						if (modInfo.doc) item.documentation = createPreservedMarkdownString(modInfo.doc);
						item.sortText = getSmartSortText('06', modName);
						items.push(item);
					}
				}

				for (const mm of MAGIC_METHODS) {
					if (!seenKeys.has(mm.name)) {
						seenKeys.add(mm.name);
						const item = new vscode.CompletionItem(mm.name, vscode.CompletionItemKind.Method);
						item.detail = `(magic method) ${mm.detail}`;
						item.insertText = new vscode.SnippetString(mm.snippet);
						item.documentation = createPreservedMarkdownString(mm.doc);
						item.sortText = getSmartSortText('08', mm.name);
						items.push(item);
					}
				}

				for (const kw of KEYWORDS) {
					if (!seenKeys.has(kw)) {
						seenKeys.add(kw);
						const item = new vscode.CompletionItem(kw, kw === 'super' ? vscode.CompletionItemKind.Class : vscode.CompletionItemKind.Keyword);
						item.detail = kw === 'super' ? 'class super' : `keyword ${kw}`;
						item.sortText = getSmartSortText('10', kw);
						items.push(item);
					}
				}

				return new vscode.CompletionList(items, false);
			}
		},
		'.', '_', '"'
	);

	// 6. 多重载参数签名提示 (Signature Help)
	const signatureHelpProvider = vscode.languages.registerSignatureHelpProvider(
		VOX_SELECTOR,
		{
			provideSignatureHelp(document, position) {
				if (!isVoxDocument(document) || isInsideComment(document, position)) return null;

				const fullPrefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position));
				const { localVariables, variables, functions, classes, modules } = ModuleResolver.getAllSymbols(document);

				let depth = 0;
				let openParenIndex = -1;
				let commaCount = 0;
				let lastArgStart = -1;
				let inString = false;
				let stringQuote = '';

				for (let i = fullPrefix.length - 1; i >= 0; i--) {
					const ch = fullPrefix[i];
					const prev = i > 0 ? fullPrefix[i - 1] : '';

					if (inString) {
						if (ch === stringQuote && prev !== '\\') inString = false;
						continue;
					}
					if (ch === '"' || ch === "'") {
						inString = true;
						stringQuote = ch;
						continue;
					}

					if (ch === ')') depth++;
					else if (ch === '(') {
						if (depth > 0) depth--;
						else { openParenIndex = i; break; }
					} else if (ch === ',' && depth === 0) {
						commaCount++;
						if (lastArgStart === -1) lastArgStart = i + 1;
					}
				}

				if (openParenIndex === -1) return null;

				const beforeParen = fullPrefix.substring(0, openParenIndex).trimEnd();
				const callMatch = beforeParen.match(/(?:new\s+)?(?:([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\.)?([a-zA-Z_]\w*)$/);
				if (!callMatch) return null;

				let callerObj = null;
				let targetName = null;
				let isNewCall = false;
				let isStringLiteral = false;

				const strMatch = beforeParen.match(/(["'])((?:(?!\1).)*)\1\.([a-zA-Z_]\w*)$/);
				if (strMatch) {
					callerObj = strMatch[0]; 
					targetName = strMatch[3];
					isStringLiteral = true;
				} else {
					const callMatch = beforeParen.match(/(?:new\s+)?(?:([a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)*)\.)?([a-zA-Z_]\w*)$/);
					if (!callMatch) return null;
					callerObj = callMatch[1];
					targetName = callMatch[2];
					isNewCall = /new\s+([a-zA-Z0-9_.]+)$/.test(beforeParen);
				}

				if (KEYWORDS.has(targetName)) return null;
				if (callerObj && callerObj.includes('.')) callerObj = callerObj.split('.').pop();

				const candidateOverloads = [];

				// 先处理 String 类型
				if (isStringLiteral || callerObj) {
					let vType = null;
					if (isStringLiteral) {
						vType = 'string';
					} else {
						const lines = document.getText().split('\n');
						vType = inferVariableType(callerObj, position.line, localVariables, variables, lines);
					}
					
					if (vType === 'string') {
						const overloads = STRING_METHODS.filter(m => m.name === targetName);
						if (overloads.length > 0) {
							const sig = new vscode.SignatureHelp();
							sig.signatures = overloads.map(sm => {
								const sigInfo = new vscode.SignatureInformation(
									`(string method) ${sm.detail}`,
									createPreservedMarkdownString(sm.doc)
								);
								sigInfo.parameters = sm.params.map(p => new vscode.ParameterInformation(p));
								return sigInfo;
							});
							sig.activeSignature = 0;
							for (let i = 0; i < overloads.length; i++) {
								if (commaCount < overloads[i].params.length) {
									sig.activeSignature = i;
									break;
								}
							}
							sig.activeParameter = Math.min(commaCount, overloads[sig.activeSignature].params.length - 1);
							return sig;
						}
					}
				}

				if (callerObj) {
					let targetClass = classes.find(c => c.name === callerObj);
					if (!targetClass) {
						const cursorLine = position.line;
						const matchedVar = localVariables.find(v => v.name === callerObj && cursorLine >= v.startLine && cursorLine <= v.endLine) || variables.find(v => v.name === callerObj);
						if (matchedVar) {
							const clsName = getBaseTypeName(matchedVar.baseType || matchedVar.type);
							targetClass = classes.find(c => c.name === clsName);
						}
					}
					if (targetClass) {
						const matchingMethods = targetClass.methods.filter(m => m.name === targetName);
						for (const m of matchingMethods) {
							candidateOverloads.push({
								name: m.name,
								detail: `${targetClass.name}.${m.name}(${m.rawParams}): ${m.type}`,
								doc: m.doc,
								params: m.params,
								hasVarArgs: m.hasVarArgs
							});
						}
					}
				}

				// 模块上的函数 / signal
				if (candidateOverloads.length === 0 && modules.has(callerObj)) {
					const modInfo = modules.get(callerObj);
					const info = findModuleExportInfo(modInfo, targetName);
					if (info) {
						if (info.kind === 'function') {
							candidateOverloads.push({
								name: info.item.name,
								detail: `${info.item.type} ${info.item.name}(${info.item.rawParams})`,
								doc: info.item.doc,
								params: info.item.params,
								hasVarArgs: info.item.hasVarArgs
							});
						} else if (info.kind === 'signal') {
							candidateOverloads.push({
								name: info.item.name,
								detail: `signal ${info.item.name}(${info.item.rawParams})`,
								doc: info.item.doc,
								params: info.item.params,
								hasVarArgs: info.item.hasVarArgs
							});
						}
					}
				}

				if (candidateOverloads.length === 0) {
					const matchingFuncs = functions.filter(f => f.name === targetName);
					for (const f of matchingFuncs) {
						candidateOverloads.push({
							name: f.name,
							detail: `${f.type} ${f.name}(${f.rawParams})`,
							doc: f.doc,
							params: f.params,
							hasVarArgs: f.hasVarArgs
						});
					}
				}

				if (candidateOverloads.length === 0) {
					for (const c of classes) {
						const matched = c.methods.filter(m => m.name === targetName);
						for (const m of matched) {
							candidateOverloads.push({
								name: m.name,
								detail: `${c.name}.${m.name}(${m.rawParams}): ${m.type}`,
								doc: m.doc,
								params: m.params,
								hasVarArgs: m.hasVarArgs
							});
						}
					}
				}

				if (candidateOverloads.length === 0) return null;

				// 挑选最匹配的重载：
				//   1) 优先挑选 n 落在 [required, total] 范围内的
				//   2) 范围内选参数跨度最窄的
				//   3) 范围内没有，按距离惩罚
				let bestOverloadIdx = 0;
				let bestScore = -Infinity;
				const currentArgCount = commaCount + 1;

				for (let i = 0; i < candidateOverloads.length; i++) {
					const ov = candidateOverloads[i];
					const params = (ov.params || []).filter(p => p.trim() !== '*');
					let required = 0, total = 0, hasVar = false;
					for (const p of params) {
						const info = parseParamInfo(p);
						if (!info) continue;
						total++;
						if (info.isVarArg) hasVar = true;
						if (!info.defaultValue && !info.isVarArg) required++;
					}
					const t = hasVar ? 9999 : total;
					let score;
					if (currentArgCount >= required && currentArgCount <= t) {
						// 落在范围内：跨度越窄越优先
						score = 10000 - (t - required);
					} else {
						const dist = currentArgCount < required
							? required - currentArgCount
							: currentArgCount - t;
						score = -dist;
					}
					if (score > bestScore) {
						bestScore = score;
						bestOverloadIdx = i;
					}
				}

				const signatureHelp = new vscode.SignatureHelp();
				signatureHelp.signatures = candidateOverloads.map(overload => {
					const effectiveParams = (overload.params || []).filter(p => p.trim() !== '*');
					const displayDetail = overload.detail || `${overload.name}(${effectiveParams.join(', ')})`;

					const sigInfo = new vscode.SignatureInformation(
						displayDetail,
						overload.doc ? createPreservedMarkdownString(overload.doc) : undefined
					);
					sigInfo.parameters = effectiveParams.map(p => new vscode.ParameterInformation(p));
					return sigInfo;
				});

				const chosenOverload = candidateOverloads[bestOverloadIdx];
				const effectiveParams = (chosenOverload.params || []).filter(p => p.trim() !== '*');
				const currentArgText = fullPrefix.substring(lastArgStart !== -1 ? lastArgStart : openParenIndex + 1).trim();

				let activeParam = 0;
				const namedMatch = currentArgText.match(/^([a-zA-Z_]\w*)\s*=/);
				if (namedMatch) {
					const namedKey = namedMatch[1];
					const idx = effectiveParams.findIndex(p => {
						const pInfo = parseParamInfo(p);
						return pInfo && pInfo.name === namedKey;
					});
					activeParam = idx !== -1 ? idx : Math.min(commaCount, effectiveParams.length - 1);
				} else {
					let varArgIndex = -1;
					for (let i = 0; i < effectiveParams.length; i++) {
						const pInfo = parseParamInfo(effectiveParams[i]);
						if (pInfo && pInfo.isVarArg) {
							varArgIndex = i;
							break;
						}
					}
					if (varArgIndex !== -1 && commaCount >= varArgIndex) {
						activeParam = varArgIndex;
					} else {
						activeParam = Math.min(commaCount, Math.max(0, effectiveParams.length - 1));
					}
				}

				signatureHelp.activeSignature = bestOverloadIdx;
				signatureHelp.activeParameter = activeParam;
				return signatureHelp;
			}
		},
		'(', ',', ' ', '.'
	);

	// 7. 鼠标悬停提示 (Hover)
	const hoverProvider = vscode.languages.registerHoverProvider(
		VOX_SELECTOR,
		{
			provideHover(document, position) {
				if (!isVoxDocument(document) || isInsideComment(document, position)) return null;

				const range = document.getWordRangeAtPosition(position);
				if (!range) return null;
				const word = document.getText(range);

				// 判断当前词是否是点号成员（前一个非空白字符是 '.'）
				const fullText = document.getText();
				const startOffset = document.offsetAt(range.start);
				let probe = startOffset - 1;
				while (probe >= 0 && (fullText[probe] === ' ' || fullText[probe] === '\t')) probe--;
				const isDotMember = probe >= 0 && fullText[probe] === '.';

				if (MAGIC_METHOD_MAP.has(word)) {
					const mm = MAGIC_METHOD_MAP.get(word);
					return new vscode.Hover(
						buildHoverMarkdown('magic_method', `(magic method) ${mm.detail}`, [], mm.doc),
						range
					);
				}

				if (BUILTIN_EXCEPTION_SET.has(word)) {
					const md = new vscode.MarkdownString();
					md.supportHtml = true;
					md.isTrusted = true;
					md.appendCodeblock(`class ${word}\n${word}(string text): void`, 'vox');
					md.appendMarkdown(`\n---\nBuilt-in exception class.`);
					return new vscode.Hover(md, range);
				}

				const { localVariables, currentDocVariables, constants, functions, classes, modules } = ModuleResolver.getAllSymbols(document);

				if (!isDotMember && modules.has(word)) {
					const modInfo = modules.get(word);
					return new vscode.Hover(buildModuleHoverMarkdown(modInfo, word), range);
				}

				// 字符串内置方法悬停
				if (isDotMember) {
					let chainStart = startOffset - 1;
					while (chainStart >= 0 && /[a-zA-Z0-9_.]/.test(fullText[chainStart])) chainStart--;
					chainStart++;
					const prefixChain = fullText.slice(chainStart, startOffset - 1).trim();
					const lines = fullText.split('\n');
					let vType = null;

					if (prefixChain && !prefixChain.includes('.')) {
						vType = inferVariableType(prefixChain, position.line, localVariables, currentDocVariables, lines);
					} else if (prefixChain === '' && startOffset > 1) {
						// 前面是字面量
						const beforeDot = fullText.substring(0, startOffset - 1).trimEnd();
						if (beforeDot.endsWith('"') || beforeDot.endsWith("'")) {
							vType = 'string';
						}
					}

					if (vType === 'string') {
						const sm = STRING_METHODS.find(m => m.name === word);
						if (sm) {
							return new vscode.Hover(
								buildHoverMarkdown('method', `(method) string.${sm.name}(${sm.params.join(', ')})`, sm.params, sm.doc),
								range
							);
						}
					}
				}

				// 点号模块成员：window.RGB、window.screen 等
				if (isDotMember) {
					let chainStart = startOffset - 1;
					while (chainStart >= 0 && /[a-zA-Z0-9_.]/.test(fullText[chainStart])) chainStart--;
					chainStart++;
					const prefixChain = fullText.slice(chainStart, startOffset - 1).trim();
					if (prefixChain) {
						const modInfo = resolveModulePrefixInfo(prefixChain, modules);
						if (modInfo) {
							// 先看 word 是否是该模块的子模块 → 递归展示子模块内容
							if (modInfo.subModules && modInfo.subModules.has(word)) {
								const subPath = modInfo.subModules.get(word);
								let isDir = false;
								try { isDir = fs.existsSync(subPath) && fs.statSync(subPath).isDirectory(); } catch (e) {}

								let subEntryFile = null;
								try {
									if (isDir) {
										for (const ext of ['.v', '.vox', '.voxs']) {
											const f = path.join(subPath, '_init_' + ext);
											if (fs.existsSync(f) && fs.statSync(f).isFile()) { subEntryFile = f; break; }
										}
									} else {
										subEntryFile = subPath;
									}
								} catch (e) {}

								const subPkgDir = isDir ? subPath : path.dirname(subPath);
								const subModInfo = {
									path: subPath,
									entryFile: subEntryFile,
									isPackage: isDir,
									pkgDir: subPkgDir,
									subModules: isDir ? ModuleResolver.getSubModulesOfDir(subPkgDir) : new Map(),
									doc: ''
								};
								return new vscode.Hover(
									buildModuleHoverMarkdown(subModInfo, `${prefixChain}.${word}`),
									range
								);
							}

							const info = findModuleExportInfo(modInfo, word);
							if (info) {
								if (info.kind === 'function') {
									return new vscode.Hover(
										buildHoverMarkdown('function', `(function) ${info.item.detail}`, info.item.params, info.item.doc),
										range
									);
								}
								if (info.kind === 'signal') {
									const md = new vscode.MarkdownString();
									md.supportHtml = true;
									md.isTrusted = true;
									md.appendCodeblock(`(signal) ${info.item.detail}`, 'vox');
									if (info.item.doc) md.appendMarkdown(`\n---\n${info.item.doc}`);
									return new vscode.Hover(md, range);
								}
								if (info.kind === 'class') {
									const inits = info.item.methods.filter(m => m.name === '_init_');
									let text = `${info.item.kind || 'class'} ${info.item.name}`;
									if (inits.length > 0) {
										text += '\n' + inits.map(i => `public void _init_(${i.rawParams})`).join('\n');
									}
									const md = new vscode.MarkdownString();
									md.supportHtml = true;
									md.isTrusted = true;
									md.appendCodeblock(text, 'vox');
									if (info.item.doc) md.appendMarkdown(`\n---\n${info.item.doc}`);
									return new vscode.Hover(md, range);
								}
								if (info.kind === 'constant') {
									const md = new vscode.MarkdownString();
									md.supportHtml = true;
									md.isTrusted = true;
									md.appendCodeblock(`(constant) const ${info.item.name}`, 'vox');
									if (info.item.doc) md.appendMarkdown(`\n---\n${info.item.doc}`);
									return new vscode.Hover(md, range);
								}
								if (info.kind === 'variable') {
									const md = new vscode.MarkdownString();
									md.supportHtml = true;
									md.isTrusted = true;
									md.appendCodeblock(`(variable) ${info.item.name}: ${info.item.type || 'var'}`, 'vox');
									if (info.item.doc) md.appendMarkdown(`\n---\n${info.item.doc}`);
									return new vscode.Hover(md, range);
								}
							}
						}
					}
				}

				const func = functions.find(f => f.name === word);
				if (func) {
					return new vscode.Hover(
						buildHoverMarkdown('function', `(function) ${func.detail}`, func.params, func.doc),
						range
					);
				}

				for (const cls of classes) {
					if (cls.name === word) {
						const inits = cls.methods.filter(m => m.name === '_init_');
						let signatureText = `${cls.kind || 'class'} ${cls.name}`;
						if (inits.length > 0) {
							signatureText += `\n` + inits.map(i => `public void _init_(${i.rawParams})`).join('\n');
						}
						const md = new vscode.MarkdownString();
						md.supportHtml = true;
						md.isTrusted = true;
						md.appendCodeblock(signatureText, 'vox');
						if (cls.doc) md.appendMarkdown(`\n---\n${cls.doc}`);
						return new vscode.Hover(md, range);
					}
				}

				for (const cls of classes) {
					const m = cls.methods.find(m => m.name === word);
					if (m) {
						return new vscode.Hover(
							buildHoverMarkdown('method', `(method) ${cls.name}.${m.name}(${m.rawParams}): ${m.type}`, m.params, m.doc),
							range
						);
					}
					const f = cls.fields.find(f => f.name === word);
					if (f) {
						const md = new vscode.MarkdownString();
						md.supportHtml = true;
						md.isTrusted = true;
						md.appendCodeblock(`(field) ${cls.name}.${f.name}: ${f.type}`, 'vox');
						if (f.doc) md.appendMarkdown(`\n---\n${f.doc}`);
						return new vscode.Hover(md, range);
					}
				}

				const cursorLine = position.line;
				const localVar = localVariables.find(v => v.name === word && cursorLine >= v.startLine && cursorLine <= v.endLine);
				if (localVar) {
					const md = new vscode.MarkdownString();
					md.supportHtml = true;
					md.isTrusted = true;
					md.appendCodeblock(`(local variable) ${localVar.type || 'var'} ${localVar.name}`, 'vox');
					return new vscode.Hover(md, range);
				}

				const variable = currentDocVariables.find(v => v.name === word);
				if (variable) {
					const md = new vscode.MarkdownString();
					md.supportHtml = true;
					md.isTrusted = true;
					md.appendCodeblock(`(variable) ${variable.name}: ${variable.type || 'var'}`, 'vox');
					if (variable.doc) md.appendMarkdown(`\n---\n${variable.doc}`);
					return new vscode.Hover(md, range);
				}

				const constant = constants.find(c => c.name === word);
				if (constant) {
					const md = new vscode.MarkdownString();
					md.supportHtml = true;
					md.isTrusted = true;
					md.appendCodeblock(`(constant) const ${constant.name}`, 'vox');
					if (constant.doc) md.appendMarkdown(`\n---\n${constant.doc}`);
					return new vscode.Hover(md, range);
				}

				return null;
			}
		}
	);

	vscode.window.visibleTextEditors.forEach(editor => updateDecorations(editor));

	vscode.window.onDidChangeActiveTextEditor(editor => {
		if (editor) updateDecorations(editor);
	}, null, context.subscriptions);

	vscode.workspace.onDidChangeTextDocument(event => {
		vscode.window.visibleTextEditors.forEach(editor => {
			if (editor.document === event.document) {
				updateDecorations(editor);
			}
		});
	}, null, context.subscriptions);

	vscode.workspace.onDidCloseTextDocument(doc => {
		if (VOX_DIAGNOSTICS) VOX_DIAGNOSTICS.delete(doc.uri);
	}, null, context.subscriptions);

	context.subscriptions.push(
		runCommand,
		definitionProvider,
		completionProvider,
		signatureHelpProvider,
		hoverProvider
	);
}

function deactivate() {}

module.exports = { activate, deactivate };