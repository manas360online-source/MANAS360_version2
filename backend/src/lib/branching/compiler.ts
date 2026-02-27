import { ConditionNode, CondNode } from './types';

function resolvePath(obj: any, path: string): any {
  if (path === '__always') return true;
  if (!path) return undefined;
  const parts = path.split('.');
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function deepEqual(a: any, b: any): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return a === b;
  }
}

export function compileCondition(node: ConditionNode): (answers: any) => boolean {
  if (node.type === 'COND') {
    const n = node as CondNode;
    return (answers: any) => {
      const left = resolvePath(answers, n.path);
      const right = n.value;
      switch (n.op) {
        case 'EQ':
          return deepEqual(left, right);
        case 'NE':
          return !deepEqual(left, right);
        case 'LT':
          return Number(left) < Number(right);
        case 'LE':
          return Number(left) <= Number(right);
        case 'GT':
          return Number(left) > Number(right);
        case 'GE':
          return Number(left) >= Number(right);
        case 'IN':
          return Array.isArray(right) && right.includes(left);
        case 'CONTAINS':
          if (Array.isArray(left)) return left.includes(right);
          if (typeof left === 'string' && typeof right === 'string') return left.includes(right);
          return false;
        case 'REGEX':
          try {
            const re = new RegExp(String(right));
            return typeof left === 'string' && re.test(left);
          } catch {
            return false;
          }
        case 'EXISTS':
          return left !== undefined && left !== null;
        default:
          return false;
      }
    };
  }

  if (node.type === 'AND') {
    const fns = node.children.map(compileCondition);
    return (answers: any) => {
      for (const fn of fns) if (!fn(answers)) return false;
      return true;
    };
  }

  // OR
  const fns = node.children.map(compileCondition);
  return (answers: any) => {
    for (const fn of fns) if (fn(answers)) return true;
    return false;
  };
}
