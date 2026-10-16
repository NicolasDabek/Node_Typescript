import { asyncHandler } from '../../src/utils/asyncHandler.util';
import { ClassUtil } from '../../src/utils/class.util';
import { DateUtil } from '../../src/utils/date.util';
import { ObjectUtil } from '../../src/utils/object.util';
import { isEmpty } from '../../src/utils/others.util';
import { StringUtil } from '../../src/utils/string.util';
import HttpException from '../../src/exceptions/HttpException';

describe('asyncHandler', () => {
  it('appelle le handler et ne touche pas next en cas de succès', async () => {
    const next = jest.fn();
    const fn = jest.fn().mockResolvedValue('ok');
    asyncHandler(fn)({} as any, {} as any, next);
    await new Promise(setImmediate);
    expect(fn).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('transmet un rejet à next', async () => {
    const next = jest.fn();
    const error = new Error('boom');
    asyncHandler(async () => { throw error; })({} as any, {} as any, next);
    await new Promise(setImmediate);
    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('HttpException', () => {
  it('porte statut et message', () => {
    const e = new HttpException(418, 'teapot');
    expect(e).toBeInstanceOf(Error);
    expect(e.status).toBe(418);
    expect(e.message).toBe('teapot');
  });
});

describe('ClassUtil', () => {
  it('renvoie le nom de la classe', () => {
    class Foo {}
    expect(ClassUtil.getClassName(new Foo())).toBe('Foo');
  });
});

describe('DateUtil', () => {
  const date = new Date(2024, 0, 31, 13, 5, 9);
  it('formate selon les jetons présents', () => {
    expect(DateUtil.formatDate(date, 'DD/MM/YYYY')).toBe('31/01/2024');
    const full = DateUtil.formatDate(date, 'DD/MM/YYYY HH:mm:ss');
    expect(full).toContain('13');
    expect(full).toContain('05');
    expect(full).toContain('09');
  });
  it('ajoute et retire des jours sans muter la date', () => {
    expect(DateUtil.addDays(date, 1).getMonth()).toBe(1);
    expect(DateUtil.subtractDays(date, 31).getDate()).toBe(31);
    expect(date.getDate()).toBe(31);
  });
});

describe('ObjectUtil', () => {
  it('retire les clés demandées', () => {
    expect(ObjectUtil.filterKeys({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
  });
});

describe('isEmpty', () => {
  it.each([
    [null, true], ['', true], [undefined, true], ['undefined', true], [{}, true],
    [0, false], ['x', false], [{ a: 1 }, false], [[1], false],
  ])('isEmpty(%p) = %p', (value, expected) => {
    expect(isEmpty(value as any)).toBe(expected);
  });
});

describe('StringUtil', () => {
  it('capitalize', () => {
    expect(StringUtil.capitalize('hELLO')).toBe('Hello');
    expect(StringUtil.capitalize('')).toBe('');
  });
  it('reverse / palindrome', () => {
    expect(StringUtil.reverseString('abc')).toBe('cba');
    expect(StringUtil.isPalindrome('kayak')).toBe(true);
    expect(StringUtil.isPalindrome('abc')).toBe(false);
  });
  it('randomString', () => {
    expect(StringUtil.randomString(12)).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(StringUtil.randomString(0)).toBe('');
  });
  it('addCharacterToEachLine', () => {
    expect(StringUtil.addCharacterToEachLine('a\nb', '# ')).toBe('# a\n# b');
  });
});
