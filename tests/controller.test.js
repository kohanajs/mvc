const Controller = require('../classes/Controller');
const ControllerMixin = require('../classes/ControllerMixin');
class TestController extends Controller{
  async action_error(){}
}

class TestMixin extends ControllerMixin{
  async before() {
    this.addBehaviour('foo', 'bar');
  }

  async action_error(){
    throw new Error('Expected Error');
  }
}

describe('test Controller', () => {
  test('test prototype pollution', async()=>{
    Controller.prototype.foo = () => {
      return 'bar';
    };
    const ins = new Controller({});
    expect(ins.foo).toBe(undefined);
  });

  test('add mixin', async() => {
    const ins = new Controller({});
    ins.addMixin(new TestMixin(ins));
    expect(ins.mixin.get('foo')).toBe(undefined);

    await ins.execute('index');
    expect(ins.mixin.get('foo')).toBe('bar');
  });

  test('get action', async()=>{
    const ins = new Controller({params:{action:'read'}});
    const action = ins.getAction();
    expect(action).toBe('read');
  });

  test('get default action', async()=>{
    const ins = new Controller({});
    const action = ins.getAction();
    expect(action).toBe('index');
  });

  test('get empty params', async()=>{
    const ins = new Controller({params:{}});
    const action = ins.getAction();
    expect(action).toBe('index');
  });

  test('unknown action', async ()=>{
    const ins = new Controller({params:{action:'read'}});
    await ins.execute();
    expect(ins.status).toBe(404);
  });

  test('server error', async ()=>{
    const ins = new TestController({});
    ins.addMixin(new TestMixin(ins));
    await ins.execute('error');
    expect(ins.status).toBe(500);
  });

  test('redirect', async() =>{
    const ins = new Controller({});
    ins.redirect('http://example.com');
    expect(ins.status).toBe(302);
  });

  test('forbidden', async() =>{
    const ins = new Controller({});
    ins.forbidden('No popo allowed');
    expect(ins.status).toBe(403);
  });

  test('check header already sent', async()=>{
    const ins = new Controller({});
    expect(ins.headerSent).toBe(false);
    ins.forbidden('No dogs allowed');
    expect(ins.headerSent).toBe(true);
    await ins.execute();
    expect(ins.headerSent).toBe(true);
  });

  test('not found default message', async()=>{
    const ins = new Controller({});
    ins.notFound();
    expect(ins.body).toBe('404 / ');
  });

  test('forbidden default message', async() =>{
    const ins = new Controller({});
    ins.forbidden();
    expect(ins.body).toBe('403 / ');
    expect(ins.status).toBe(403);
  });

  test('error on duplicate mixin behaviour', async() =>{
    const ins = new Controller({});
    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin(ins));

    await ins.execute('index');
    expect(ins.status).toBe(500);
  })
});