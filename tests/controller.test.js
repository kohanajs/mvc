const $ = ref => (typeof ref === 'function')? ref() : ref;
const Controller = require('../classes/Controller');
const ControllerMixin = require('../classes/ControllerMixin');
class TestController extends Controller{
  async action_error(){}
}

class TestMixin extends ControllerMixin{
  name = null;
  constructor(client) {
    super(client);

    this.exports = {
      foo: 'bar',
      who: () => this,
      name: ()=> this.name,
    }
  }

  async action_error(){
    throw new Error('Expected Error');
  }

  getThis(){
    return this;
  }

  async action_test1(){
    this.name = 'hello 1';
  }

  async action_test3(){
    this.name = 'ouch 1';
  }
}

class TestMixin2 extends ControllerMixin{
  name = null;
  constructor(client) {
    super(client);

    this.exports = {
      name: () => this.name,
    }
  }

  async action_test2(){
    this.name = 'hello 2';
  }

  async action_test3(){
    this.name = 'ouch 2';
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
    Object.assign(ins, ins.addMixin(new TestMixin(ins)));
    expect(ins.foo).toBe('bar');
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

  test('mixin this', async() =>{
    const ins = new Controller({});
    ins.addMixin(new TestMixin(ins));
    expect($(ins.who).constructor.name).toBe('TestMixin');
  })

  test('branch mixin result', async()=>{
    const ins = new Controller({});
    ins.action_test1 = async()=>{}

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin2(ins));
    await ins.execute('test1');

    expect($(ins.name)).toBe('hello 1');
  })

  test('branch mixin result 2', async()=>{
    const ins = new Controller({});
    ins.action_test2 = async()=>{}

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin2(ins));
    await ins.execute('test2');

    expect($(ins.name)).toBe('hello 2');
  })

  test('branch mixin result 3', async()=>{
    const ins = new Controller({});
    ins.action_test3 = async()=>{}

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin2(ins));
    await ins.execute('test3');

    try{
      const name = $(ins.name);
    }catch (e){
      expect(e.message).toBe('conflict mixin export value found: (ouch 2) , (ouch 1)');
    }
  })
});