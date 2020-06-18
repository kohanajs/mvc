describe('test View', () => {
  const View = require('../classes/View');

  test('factory', async()=>{
    const tpl = View.factory('student', {name:'Alice'});
    const output = await tpl.render();
    expect(JSON.parse(output).name).toBe('Alice');
  });

  test('global variable', async()=>{
    View.setGlobal('school', 'Jest High School');

    const tpl = new View('student', {name:'Alice'});
    const output = await tpl.render();
    expect(JSON.parse(output).name).toBe('Alice');
    expect(JSON.parse(output).school).toBe('Jest High School');

    const tpl2 = new View('student', {name:'Bob'});
    const output2 = await tpl2.render();
    expect(JSON.parse(output2).name).toBe('Bob');
    expect(JSON.parse(output2).school).toBe('Jest High School');
  });

  test('direct assign variable to view', async()=>{
    //pass data object will ignore direct assign variable (which is slower);
    const tpl = View.factory('student');
    tpl.club = 'art';

    const output = await tpl.render();
    expect(JSON.parse(output).club).toBe('art');
  });

  test('view', async() => {
    const tpl = new View('student', {name:'Alice'});
    const output = await tpl.render();
    expect(JSON.parse(output).name).toBe('Alice');
  });

  test('cache', async() => {

  });

  test('view base class cannot be freeze', async()=>{

  });

  test('test prototype pollution', async()=>{
    View.prototype.foo = () => {
      return 'bar';
    };
    const ins = new View('student', {});
    expect(ins.foo).toBe(undefined);
  });
});