let totalTests = 0;
let passed = 0;
let failed = 0;
let currentSuite = '';
const failures = [];

export function describe(name, fn) {
  currentSuite = name;
  console.log(`\n  ${name}`);
  fn();
}

export function it(name, fn) {
  totalTests++;
  try {
    fn();
    passed++;
    console.log(`    ✓ ${name}`);
  } catch (e) {
    failed++;
    const key = `${currentSuite} > ${name}`;
    failures.push({ key, error: e.message });
    console.log(`    ✗ ${name}`);
    console.log(`      ${e.message}`);
  }
}

export function expect(val) {
  return {
    toBe(expected) {
      if (val !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`);
    },
    toEqual(expected) {
      const a = JSON.stringify(val), b = JSON.stringify(expected);
      if (a !== b) throw new Error(`Expected ${b}, got ${a}`);
    },
    toBeTruthy() {
      if (!val) throw new Error(`Expected truthy, got ${JSON.stringify(val)}`);
    },
    toBeFalsy() {
      if (val) throw new Error(`Expected falsy, got ${JSON.stringify(val)}`);
    },
    toBeGreaterThan(n) {
      if (!(val > n)) throw new Error(`Expected ${val} > ${n}`);
    },
    toBeGreaterThanOrEqual(n) {
      if (!(val >= n)) throw new Error(`Expected ${val} >= ${n}`);
    },
    toBeLessThan(n) {
      if (!(val < n)) throw new Error(`Expected ${val} < ${n}`);
    },
    toBeLessThanOrEqual(n) {
      if (!(val <= n)) throw new Error(`Expected ${val} <= ${n}`);
    },
    toBeInstanceOf(cls) {
      if (!(val instanceof cls)) throw new Error(`Expected instance of ${cls.name}`);
    },
    toContain(item) {
      if (Array.isArray(val)) {
        if (!val.includes(item)) throw new Error(`Expected array to contain ${JSON.stringify(item)}`);
      } else if (typeof val === 'string') {
        if (!val.includes(item)) throw new Error(`Expected string to contain "${item}"`);
      }
    },
    toHaveLength(n) {
      if (val.length !== n) throw new Error(`Expected length ${n}, got ${val.length}`);
    },
    toBeNull() {
      if (val !== null) throw new Error(`Expected null, got ${JSON.stringify(val)}`);
    },
    toBeDefined() {
      if (val === undefined) throw new Error(`Expected defined, got undefined`);
    },
    toThrow() {
      if (typeof val !== 'function') throw new Error(`Expected a function`);
      try { val(); throw new Error('Expected function to throw'); } catch (e) {
        if (e.message === 'Expected function to throw') throw e;
      }
    },
    not: {
      toBe(expected) {
        if (val === expected) throw new Error(`Expected not ${JSON.stringify(expected)}`);
      },
      toBeNull() {
        if (val === null) throw new Error(`Expected not null`);
      },
      toBeTruthy() {
        if (val) throw new Error(`Expected falsy, got ${JSON.stringify(val)}`);
      }
    }
  };
}

export function summary() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`Total: ${totalTests} | Passed: ${passed} | Failed: ${failed}`);
  if (failures.length > 0) {
    console.log(`\nFailed tests:`);
    failures.forEach(f => console.log(`  - ${f.key}: ${f.error}`));
  }
  console.log('='.repeat(50));
  return failed === 0;
}
