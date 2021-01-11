const Controller = require('../classes/Controller');
const ControllerMixin = require('../classes/ControllerMixin');
class TestController extends Controller{
  async action_error(){}
}

class TestMixin extends ControllerMixin{
  static init(state){
    state.set('foo', 'bar');
    state.set('who', this);
    state.set('name', this.name);
  }

  static async action_error(){
    throw new Error('Expected Error');
  }

  static async action_test1(state){
    state.set('name', 'hello 1');
  }

  static async action_test3(state){
    state.set('name', 'ouch 1');
  }
}

class TestMixin2 extends ControllerMixin{
  static async action_test2(state){
    state.set('name', 'hello 2');
  }

  static async action_test3(state){
    state.set('name', 'ouch 2');
  }
}

class TestMixin3 extends ControllerMixin{
  static async init(state){
    state.set('foo', 'tar');
  }
}

class TestMixin4 extends ControllerMixin{
  static async action_test2(){
  }
}

class TestMixinStopAtBefore extends ControllerMixin{
  static async before(state) {
    state.get('client').exit(503);
  }
}

class TestMixinStopAtAction extends ControllerMixin{
  static async action_test2(state) {
    state.get('client').exit(503);
  }
}

class TestMixinStopAtAfter extends ControllerMixin{
  static async after(state) {
    state.get('client').exit(503);
  }
}

describe('test Controller', () => {
  beforeEach(()=>{

  })

  test('test prototype pollution', async()=>{
    Controller.prototype.foo = () => {
      return 'bar';
    };
    const ins = new Controller({});
    expect(ins.foo).toBe(undefined);
  });

  test('add mixin', async() => {
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin]);
      }
    }

    const ins = new C({});
    expect(ins.get('foo')).toBe('bar');

    const ins2 = new Controller({});
    expect(ins2.get('foo')).toBe(undefined);
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
    class C extends TestController{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin]);
      }
    }
    const ins = new C({});
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
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin]);
      }
    }
    const ins = new C({});
    expect(ins.state.get('who').name).toBe('TestMixin');
  })

  test('branch mixin result', async()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2]);
      }
    }
    const ins = new C({});
    ins.action_test1 = async()=>{}

    await ins.execute('test1');

    expect(ins.state.get('name')).toBe('hello 1');
  })

  test('branch mixin result 2', async()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2]);
      }
    }

    const ins = new C({});
    ins.action_test2 = async()=>{}
    await ins.execute('test2');

    expect(ins.state.get('name')).toBe('hello 2');
  })

  test('branch mixin result 3', async()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2]);
      }
    }

    const ins = new C({});
    ins.action_test3 = async()=>{}
    await ins.execute('test3');

    try{
      const name = ins.state.get('name');
    }catch (e){
      expect(e.message).toBe('conflict mixin export value found: (ouch 2) , (ouch 1)');
    }
  })

  test('mixinAction', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2]);
      }
    }

    const ins = new C({});
    ins.action_test4 = async()=>{
      await ins.mixinsAction('action_test2')
    }

    await ins.execute('test4');

    expect(ins.state.get('name')).toBe('hello 2');
  })

  test('allow unknown action', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2]);
      }
    }

    const ins = new C({});
    ins.allowUnknownAction = true;

    await ins.execute('test2');

    expect(ins.get('name')).toBe('hello 2');
  })

  test('stop other mixins - before', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixinStopAtBefore, TestMixin]);
      }
    }

    const ins = new C({});
    ins.allowUnknownAction = true;
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  })

  test('stop other mixins - action', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixinStopAtAction, TestMixin]);
      }
    }

    const ins = new C({});
    ins.allowUnknownAction = true;

    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  })

  test('stop other mixins - after', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixinStopAtAfter, TestMixin]);
      }
    }

    const ins = new C({});
    ins.allowUnknownAction = true;
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  })

  test('override mixin export constant', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin3]);
      }
    }
    const ins = new C({});
    ins.allowUnknownAction = true;
    expect(ins.get('foo')).toBe('tar');
  })

  test('mixin override export thrice', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2, TestMixin2]);
      }
    }

    const ins = new C({});
    ins.allowUnknownAction = true;
    await ins.execute('test2');

    expect(ins.get('name')).toBe('hello 2');
  })

  test('mixin export multiple values', async()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2, TestMixin4, TestMixin2]);
      }
    }

    const ins = new C({});
    ins.allowUnknownAction = true;
    await ins.execute('test2');

    expect(ins.get('name')).toBe('hello 2');
  })

  test('header sent in constructor', async ()=>{
    class C extends Controller{
      constructor(request) {
        super(request);
        C.mix(this, [TestMixin, TestMixin2, TestMixin4, TestMixin2]);
      }
    }
    const ins = new C({});
    ins.allowUnknownAction = true;
    await ins.forbidden('quit');
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
  });

  test('inheritage', async ()=>{
    class M1 extends ControllerMixin{
      static init(state){
        ++state.get('client').value
      }
      static action_foo(state){
        state.get('client').foo = true;
      }
    }
    class M2 extends ControllerMixin{
      static init(state){
        ++state.get('client').value
      }

      static action_bar(state){
        state.get('client').bar = true;
      }
    }

    class A extends Controller{
      constructor(request) {
        super(request);
        this.value = 0;
        this.foo = false;
        this.bar = false;
        A.mix(this, [M1]);
      }
      async action_foo() {}
      async action_bar() {}
    }

    class B extends A{
      constructor(request) {
        super(request);
        B.mix(this, [M1]);
      }
    }

    class C extends B{
      constructor(request) {
        super(request);
        C.mix(this,[M1, M2]);
      }
    }
    const b0 = new B({});
    expect(b0.value).toBe(2)
    const c0 = new C({});
    expect(c0.value).toBe(4)
    const c1 = new C({});
    expect(c1.value).toBe(4)
    const b1 = new B({});
    expect(b1.value).toBe(2)

    await b0.execute('foo');
    expect(b0.foo).toBe(true);
    await b1.execute('bar');

    expect(b1.bar).toBe(false);

    await c0.execute('foo');
    expect(c0.foo).toBe(true);
    await c1.execute('bar');
    expect(c1.bar).toBe(true);
  })

  test('inheritage form B', async ()=>{
    class M1 extends ControllerMixin{
      static init(state){
        ++state.get('client').value
      }
    }

    class A extends Controller{
      value = 0;
      constructor(request) {
        super(request);
        A.mix(this, [M1]);
      }
    }

    class B extends A{
      constructor(request) {
        super(request);
        B.mix(this, [M1]);
      }
    }

    class C extends B{
      constructor(request) {
        super(request);
        C.mix(this, [M1])
      }
    }

    const c0 = new C({});
    expect(c0.value).toBe(3)
    const c1 = new C({});
    expect(c1.value).toBe(3)
    const b0 = new B({});
    expect(b0.value).toBe(2)
  })
});