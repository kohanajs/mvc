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

class TestMixin3 extends ControllerMixin{
  constructor(client) {
    super(client);

    this.exports = {
      foo: 'tar',
    }
  }
}

class TestMixin4 extends ControllerMixin{
  name = null;
  constructor(client) {
    super(client);

    this.exports = {
      name: () => this.name,
    }
  }

  async action_test2(){
  }
}

class TestMixinStopAtBefore extends ControllerMixin{
  async before() {
    this.client.exit(503)
  }
}

class TestMixinStopAtAction extends ControllerMixin{
  async action_test2() {
    this.client.exit(503)
  }
}

class TestMixinStopAtAfter extends ControllerMixin{
  async after() {
    this.client.exit(503)
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

  test('mixinAction', async ()=>{
    const ins = new Controller({});
    ins.action_test4 = async()=>{
      await ins.mixinsAction('action_test2')
    }

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin2(ins));
    await ins.execute('test4');

    expect($(ins.name)).toBe('hello 2');
  })

  test('allow unknown action', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin2(ins));
    await ins.execute('test2');

    expect($(ins.name)).toBe('hello 2');
  })

  test('stop other mixins - before', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixinStopAtBefore(ins));
    ins.addMixin(new TestMixin(ins));
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  })

  test('stop other mixins - action', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixinStopAtAction(ins));
    ins.addMixin(new TestMixin(ins));
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  })

  test('stop other mixins - after', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixinStopAtAfter(ins));
    ins.addMixin(new TestMixin(ins));
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  })

  test('override mixin export constant', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin3(ins));

    expect($(ins.foo)).toBe('tar');
  })

  test('mixin override export thrice', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixin(ins));
    ins.addMixin(new TestMixin2(ins));
    ins.addMixin(new TestMixin2(ins));
    await ins.execute('test2');

    expect($(ins.name)).toBe('hello 2');
  })

  test('mixin export multiple values', async()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;

    ins.addMixin(new TestMixin(ins));//null
    ins.addMixin(new TestMixin2(ins));//hello 2
    ins.addMixin(new TestMixin4(ins));//null
    ins.addMixin(new TestMixin2(ins));//hello 2
    await ins.execute('test2');

    expect(ins.name()).toBe('hello 2');
    expect(ins.name(true)).toStrictEqual(['hello 2', 'hello 2']);
  })

  test('header sent in constructor', async ()=>{
    const ins = new Controller({});
    ins.allowUnknownAction = true;
    ins.addMixin(new TestMixin(ins));//null
    ins.addMixin(new TestMixin2(ins));//hello 2
    ins.addMixin(new TestMixin4(ins));//null
    ins.addMixin(new TestMixin2(ins));//hello 2

    ins.forbidden('quit');
    await ins.execute('test2');

    expect(ins.status).toBe(403);
  })

  test('client IP', async ()=>{
    const c = new Controller({});
    await c.execute();
    expect(c.clientIP).toBe('0.0.0.0')

    const c1 = new Controller({headers: {"cf-connecting-ip" : "0.0.0.1"}});
    await c1.execute();
    expect(c1.clientIP).toBe('0.0.0.1');

    const c2 = new Controller({headers: {"x-real-ip" : "0.0.0.2"}});
    await c2.execute();
    expect(c2.clientIP).toBe('0.0.0.2');

    const c3 = new Controller({headers: {"x-forwarded-for" : "0.0.0.3"}});
    await c3.execute();
    expect(c3.clientIP).toBe('0.0.0.3');

    const c4 = new Controller({headers: {"remote_addr" : "0.0.0.4"}});
    await c4.execute();
    expect(c4.clientIP).toBe('0.0.0.4');

    const c5 = new Controller({headers: {}, "ip": '0.0.0.5'});
    await c5.execute();
    expect(c5.clientIP).toBe('0.0.0.5');
  })
});