import Controller from '../classes/Controller';
import ControllerMixin from '../classes/ControllerMixin';

class TestController extends Controller {
  // eslint-disable-next-line class-methods-use-this
  async action_error() {}
}

class TestMixin extends ControllerMixin {
  static init(state) {
    state.set('foo', 'bar');
    state.set('who', this);
    state.set('name', this.name);
  }

  static async action_error() {
    throw new Error('Expected Error');
  }

  static async action_test1(state) {
    state.set('name', 'hello 1');
  }

  static async action_test3(state) {
    state.set('name', 'ouch 1');
  }
}

class TestMixin2 extends ControllerMixin {
  static async action_test2(state) {
    state.set('name', 'hello 2');
  }

  static async action_test3(state) {
    state.set('name', 'ouch 2');
  }
}

class TestMixin3 extends ControllerMixin {
  static async init(state) {
    state.set('foo', 'tar');
  }
}

class TestMixin4 extends ControllerMixin {
  static async action_test2() {
  }
}

class TestMixinStopAtBefore extends ControllerMixin {
  static async before(state) {
    state.get('client').exit(503);
  }
}

class TestMixinStopAtAction extends ControllerMixin {
  static async action_test2(state) {
    state.get('client').exit(503);
  }
}

class TestMixinStopAtAfter extends ControllerMixin {
  static async after(state) {
    state.get('client').exit(503);
  }
}

describe('test Controller', () => {
  beforeEach(() => {

  });

  test('test prototype pollution', async () => {
    try{
      Controller.prototype.foo = () => 'bar';
      expect("this line shouldn't be executed").toBe(false);
    }catch (e){
      expect(e.message).toBe('Cannot add property foo, object is not extensible')
    }

    const ins = new Controller({});
    expect(ins.foo).toBe(undefined);
  });

  test('add mixin', async () => {
    class C extends Controller {
      static mixins = [...Controller.mixins, TestMixin];
    }

    const ins = new C({});
    expect(ins.state.get('foo')).toBe('bar');

    const ins2 = new Controller({});
    expect(ins2.state.get('foo')).toBe(undefined);
  });

  test('get default action', async () => {
    class C extends Controller {
      async action_index() {
        this.body = 'index';
      }
    }

    const ins = new Controller({});
    await ins.execute();
    expect(ins.body).toBe('');

    const ins2 = new C({});
    await ins2.execute();
    expect(ins2.body).toBe('index');
  });

  test('get empty params', async () => {
    class C extends Controller {
      async action_index() {
        this.body = 'index';
      }
    }

    const ins = new C({ params: {} });
    await ins.execute();
    expect(ins.body).toBe('index');
  });

  test('specific action', async () => {
    class C extends Controller {
      async action_hello() {
        this.body = 'hello';
      }
    }

    const ins = new C({ params: {} });
    await ins.execute('hello');
    expect(ins.body).toBe('hello');
  });

  test('call execture multiple time', async () => {
    class C extends Controller {
      count = 0;

      async action_hello() {
        this.count += 1;
        this.body = 'hello';
      }
    }

    const ins = new C({ params: {} });
    await ins.execute('hello');
    expect(ins.body).toBe('hello');
    expect(ins.count).toBe(1);

    await ins.execute('hello');
    expect(ins.body).toBe('hello');
    expect(ins.count).toBe(2);
  });

  test('unknown action', async () => {
    const ins = new Controller({ params: { action: 'read' } });
    await ins.execute();
    expect(ins.status).toBe(404);
  });

  test('server error', async () => {
    class C extends TestController {
      static mixins = [...TestController.mixins, TestMixin];
    }
    const ins = new C({});
    await ins.execute('error');
    expect(ins.status).toBe(500);
    expect(ins.body).toBe('Expected Error');
  });

  test('server error with body', async () => {
    class C extends TestController {
      static mixins = [...TestController.mixins, TestMixin];
    }

    const ins = new C({});
    ins.body = 'hello';
    await ins.execute('error');
    expect(ins.status).toBe(500);
    expect(ins.body).toBe('hello');
  });

  test('redirect', async () => {
    const ins = new Controller({});
    await ins.redirect('http://example.com');
    expect(ins.status).toBe(302);
  });

  test('forbidden', async () => {
    const ins = new Controller({});
    await ins.forbidden('No popo allowed');
    expect(ins.status).toBe(403);
  });

  test('not found default message', async () => {
    const ins = new Controller({});
    await ins.execute('not_exist');
    expect(ins.status).toBe(404);
    expect(ins.body).toBe('404 / Controller::action_not_exist not found');
  });

  test('forbidden default message', async () => {
    const ins = new Controller({});
    await ins.forbidden();
    expect(ins.body).toBe('403 / ');
    expect(ins.status).toBe(403);
  });

  test('mixin this', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin];
    }

    const ins = new C({});
    expect(ins.state.get('who').name).toBe('TestMixin');
  });

  test('branch mixin result', async () => {
    class C extends Controller {
      static mixins = [...Controller.mixins, TestMixin, TestMixin2];
    }

    const ins = new C({});
    ins.action_test1 = async () => {};

    await ins.execute('test1');

    expect(ins.state.get('name')).toBe('hello 1');
  });

  test('branch mixin result 2', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin2, TestMixin];
    }

    const ins = new C({});
    ins.action_test2 = async () => {};
    await ins.execute('test2');

    expect(ins.state.get('name')).toBe('hello 2');
  });

  test('branch mixin result 3', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin2, TestMixin3];
    }

    const ins = new C({});
    ins.action_test3 = async () => {};
    await ins.execute('test3');

    try {
      ins.state.get('name');
    } catch (e) {
      expect(e.message).toBe('conflict mixin export value found: (ouch 2) , (ouch 1)');
    }
  });

  test('mixinAction', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin, TestMixin2];
    }

    const ins = new C({});
    ins.action_test4 = async () => {
      await ins.mixinsAction('action_test2');
    };

    await ins.execute('test4');

    expect(ins.state.get('name')).toBe('hello 2');
  });

  test('allow unknown action', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin, TestMixin2];
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;

    await ins.execute('test2');

    expect(ins.state.get('name')).toBe('hello 2');
  });

  test('stop other mixins - before', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixinStopAtBefore, TestMixin];
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  });

  test('stop other mixins - action', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixinStopAtAction, TestMixin];
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;

    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  });

  test('stop other mixins - after', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixinStopAtAfter, TestMixin];
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;
    const result = await ins.execute('test2');

    expect(result.status).toBe(503);
  });

  test('override mixin export constant', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin, TestMixin3];
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;
    expect(ins.state.get('foo')).toBe('tar');
  });

  test('mixin override export thrice', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin2, TestMixin2]
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;
    await ins.execute('test2');

    expect(ins.state.get('name')).toBe('hello 2');
  });

  test('mixin export multiple values', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin, TestMixin2, TestMixin4, TestMixin2]
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;
    await ins.execute('test2');

    expect(ins.state.get('name')).toBe('hello 2');
  });

  test('header sent in constructor', async () => {
    class C extends Controller{
      static mixins = [...Controller.mixins, TestMixin, TestMixin2, TestMixin4, TestMixin2];
    }

    const ins = new C({});
    ins.suppressActionNotFound = true;
    await ins.forbidden('quit');
    await ins.execute('test2');

    expect(ins.status).toBe(403);
  });

  test('client IP', async () => {
    const c = new Controller({});
    await c.execute();
    expect(c.clientIP).toBe('0.0.0.0');

    const c1 = new Controller({ headers: { 'cf-connecting-ip': '0.0.0.1' } });
    await c1.execute();
    expect(c1.clientIP).toBe('0.0.0.1');

    const c2 = new Controller({ headers: { 'x-real-ip': '0.0.0.2' } });
    await c2.execute();
    expect(c2.clientIP).toBe('0.0.0.2');

    const c3 = new Controller({ headers: { 'x-forwarded-for': '0.0.0.3' } });
    await c3.execute();
    expect(c3.clientIP).toBe('0.0.0.3');

    const c4 = new Controller({ headers: { remote_addr: '0.0.0.4' } });
    await c4.execute();
    expect(c4.clientIP).toBe('0.0.0.4');

    const c5 = new Controller({ headers: {}, ip: '0.0.0.5' });
    await c5.execute();
    expect(c5.clientIP).toBe('0.0.0.5');
  });

  test('inheritage', async () => {
    class M1 extends ControllerMixin {
      static async setup(state) {
        const client = state.get('client');
        client.value += 1;
      }

      static action_foo(state) {
        const client = state.get('client');
        client.foo = true;
      }
    }
    class M2 extends ControllerMixin {
      static async setup(state) {
        const client = state.get('client');
        client.value += 1;
      }

      static action_bar(state) {
        const client = state.get('client');
        client.bar = true;
      }
    }

    class A extends Controller {
      static mixins = [M1];

      value = 0;

      constructor(request) {
        super(request);
        this.foo = false;
        this.bar = false;
      }

      async action_foo() {
        this.body = 'foo';
      }

      async action_bar() {
        this.body = 'bar';
      }
    }

    class B extends A {
      static mixins = [...A.mixins, M1]
    }

    class C extends B {
      static mixins = [...B.mixins, M1, M2]
    }

    const b0 = new B({});
    await b0.execute();
    expect(b0.value).toBe(2);

    const c0 = new C({});
    await c0.execute();
    expect(c0.value).toBe(4);

    const c1 = new C({});
    await c1.execute();
    expect(c1.value).toBe(4);

    const b1 = new B({});
    await b1.execute();
    expect(b1.value).toBe(2);

    await b0.execute('foo');
    expect(b0.foo).toBe(true);
    await b1.execute('bar');

    expect(b1.bar).toBe(false);

    await c0.execute('foo');
    expect(c0.foo).toBe(true);
    await c1.execute('bar');
    expect(c1.bar).toBe(true);
  });

  test('inheritage form B', async () => {
    class M1 extends ControllerMixin {
      static async setup(state) {
        const client = state.get('client');
        client.value += 1;
      }
    }

    class A extends Controller {
      static mixins = [M1];
      value = 0;
    }

    class B extends A{
      static mixins = [...A.mixins, M1]
    }

    class C extends B {
      static mixins = [...B.mixins, M1]
    }

    const c0 = new C({});
    await c0.execute();
    expect(c0.value).toBe(3);

    const c1 = new C({});
    await c1.execute();
    expect(c1.value).toBe(3);

    const b0 = new B({});
    await b0.execute();
    expect(b0.value).toBe(2);
  });

  test("redirect keep query string", async () => {
    class TestRedirectController extends Controller {
      // eslint-disable-next-line class-methods-use-this
      async action_index() {
        await c.redirect('https://example.com', true);
      }
    }

    const c = new TestRedirectController({query:{utm_source: "test"}});
    await c.execute();

    expect(c.headers.location).toBe('https://example.com?utm_source=test');
  })

  test("redirect add query string", async () => {
    class TestRedirectController extends Controller {
      // eslint-disable-next-line class-methods-use-this
      async action_index() {
        await c.redirect('https://example.com?target=1', true);
      }
    }

    const c = new TestRedirectController({query:{utm_source: "test"}});
    await c.execute();

    expect(c.headers.location).toBe('https://example.com?target=1&utm_source=test');
  })

  test("redirect without query string", async () => {
    class TestRedirectController extends Controller {
      // eslint-disable-next-line class-methods-use-this
      async action_index() {
        await c.redirect('https://example.com?target=1', true);
      }
    }

    const c = new TestRedirectController({query:{}});
    await c.execute();

    expect(c.headers.location).toBe('https://example.com?target=1');
  })

  test('check mixin are all defined', async () => {
    const FailMixin = null;
    let isError = false;

    class A extends Controller{
      static mixins = [TestMixin, FailMixin];
    }

    try{
      const a = new A({});
      await a.execute();
    }catch(e){
      isError = true;
      expect(e.message).toBe('one of the mixins is undefined');
    }
    expect(isError).toBe(true);
  })
});
