import View from '../classes/View';

describe('test View', () => {

  test('factory', async () => {
    const tpl = View.factory('student', { name: 'Alice' });
    const output = await tpl.render();
    expect(JSON.parse(output).name).toBe('Alice');
  });

  test('direct assign variable to view', async () => {
    // pass data object will ignore direct assign variable (which is slower);
    const tpl = View.factory('student');
    tpl.data.club = 'art';

    const output = await tpl.render();
    expect(JSON.parse(output).club).toBe('art');
  });

  test('view', async () => {
    const tpl = new View('student', { name: 'Alice' });
    const output = await tpl.render();
    expect(JSON.parse(output).name).toBe('Alice');
  });

  test('cache', async () => {
    View.clearCache();
    expect(JSON.stringify(View.caches)).toBe('{}');
  });

  test('view base class cannot be freeze', async () => {

  });

  test('test prototype pollution', async () => {
    try{
      View.prototype.foo = () => 'bar';
      expect("this line shouldn't be executed").toBe(false);
    }catch(e){
      expect(e.message).toBe('Cannot add property foo, object is not extensible')
    }

    const ins = new View('student', {});
    expect(ins.foo).toBe(undefined);
  });
});
