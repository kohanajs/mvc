const Controller = require('../classes/Controller');
const ControllerMixin = require('../classes/ControllerMixin');

class MA extends ControllerMixin{
  static init(state){
    const client = state.get('client');
    if(client.ma === undefined) client.ma = 0
    if(client.mabefore === undefined) client.mabefore = 0
    if(client.mbefore === undefined) client.mbefore = 0
    if(client.acount === undefined) client.acount = 0
    client.ma++;
  }
  static async before(state){
    const client = state.get('client');
    client.mbefore++
    client.mabefore++;
  }
  static async action_a(state){
    const client = state.get('client');
    client.a = true;
    client.acount++
  }
}

class MB extends ControllerMixin{
  static init(state){
    const client = state.get('client');
    if(client.mb === undefined) client.mb = 0
    if(client.mbbefore === undefined) client.mbbefore = 0
    if(client.mbefore === undefined) client.mbefore = 0
    if(client.bcount === undefined) client.bcount = 0
    client.mb++;
  }
  static async before(state){
    const client = state.get('client');
    client.mbefore++
    client.mbbefore++;
  }
  static async action_b(state){
    const client = state.get('client');
    client.b = true;
    client.acount++
  }
}

class MC extends ControllerMixin{
  static init(state){
    const client = state.get('client');
    if(client.mc === undefined) client.mc = 0
    if(client.mcbefore === undefined) client.mcbefore = 0
    if(client.mbefore === undefined) client.mbefore = 0
    if(client.ccount === undefined) client.ccount = 0
    client.mc++;
  }
  static async before(state){
    const client = state.get('client');
    client.mbefore++
    client.mcbefore++;
  }
  static async action_c(state){
    const client = state.get('client');
    client.c = true;
    client.ccount++;
  }
}

class CA extends Controller{
  constructor(request) {
    super(request);
    this.mix([MA])
  }
}

class CB extends CA{
  async action_a(){}
}

describe('test Controller', () => {
  test('test simple controller', async ()=>{
    const c = new Controller({});
    c.action_a = async ()=>{}
    c.mix([MA]);
    expect(c.ma).toBe(1);
    expect(c.mbefore).toBe(0)
    expect(c.mabefore).toBe(0)
    expect(c.a).not.toBe(true);
    await c.execute();
    expect(c.ma).toBe(1);
    expect(c.mabefore).toBe(1);
    expect(c.mbefore).toBe(1)
    expect(c.a).not.toBe(true);
  });

  test('test simple controller, action match', async ()=>{
    const c = new Controller({});
    c.action_a = async ()=>{}
    c.mix([MA]);
    expect(c.ma).toBe(1);
    expect(c.mbefore).toBe(0)
    expect(c.mabefore).toBe(0)
    expect(c.a).not.toBe(true);
    await c.execute('a');
    expect(c.ma).toBe(1);
    expect(c.mabefore).toBe(1);
    expect(c.mbefore).toBe(1)
    expect(c.a).toBe(true);
  });

  test('multi mxin', async ()=>{
    const c = new Controller({});
    c.action_a = async ()=>{}
    c.action_b = async ()=>{}
    c.mix([MA, MB]);
    expect(c.ma).toBe(1);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(0)
    expect(c.mbbefore).toBe(0)
    expect(c.mbefore).toBe(0)
    expect(c.a).toBe(undefined);
    expect(c.b).toBe(undefined);

    await c.execute();
    expect(c.ma).toBe(1);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(1)
    expect(c.mbbefore).toBe(1)
    expect(c.mbefore).toBe(2)
    expect(c.a).toBe(undefined);
    expect(c.b).toBe(undefined);
  })

  test('multi mxin match a', async ()=>{
    const c = new Controller({});
    c.action_a = async ()=>{}
    c.action_b = async ()=>{}
    c.mix([MA, MB]);

    await c.execute('a');
    expect(c.ma).toBe(1);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(1)
    expect(c.mbbefore).toBe(1)
    expect(c.mbefore).toBe(2)
    expect(c.a).toBe(true);
    expect(c.b).toBe(undefined);
  })

  test('multi mxin match b', async ()=>{
    const c = new Controller({});
    c.action_a = async ()=>{}
    c.action_b = async ()=>{}
    c.mix([MA, MB]);

    await c.execute('b');
    expect(c.ma).toBe(1);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(1)
    expect(c.mbbefore).toBe(1)
    expect(c.mbefore).toBe(2)
    expect(c.a).toBe(undefined);
    expect(c.b).toBe(true);
  })

  test('inherit simple', async ()=>{
    const c = new CB({});

    expect(c.ma).toBe(1);
    expect(c.mabefore).toBe(0)
    expect(c.mbefore).toBe(0)
    expect(c.a).toBe(undefined);
    await c.execute();
    expect(c.ma).toBe(1);
    expect(c.mabefore).toBe(1);
    expect(c.mbefore).toBe(1)
    expect(c.a).toBe(undefined);
  })

  test('inherit simple match a', async ()=>{
    const c = new CB({});

    expect(c.ma).toBe(1);
    expect(c.mabefore).toBe(0)
    expect(c.mbefore).toBe(0)
    expect(c.a).toBe(undefined);
    await c.execute('a');
    expect(c.ma).toBe(1);
    expect(c.mabefore).toBe(1);
    expect(c.mbefore).toBe(1)
    expect(c.a).toBe(true);
  })

  test('inherit multi match b', async ()=>{
    class CA2 extends Controller{
      constructor(request) {
        super(request);
        this.mix([MA,MB]);
      }
    }

    class CB2 extends CA2{
      async action_a() {}
      async action_b() {}
    }

    const c = new CB2({});

    expect(c.ma).toBe(1);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(0)
    expect(c.mbbefore).toBe(0)
    expect(c.mbefore).toBe(0)
    expect(c.a).toBe(undefined);
    expect(c.b).toBe(undefined);
    await c.execute('b');
    expect(c.ma).toBe(1);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(1)
    expect(c.mbbefore).toBe(1)
    expect(c.mbefore).toBe(2)
    expect(c.a).toBe(undefined);
    expect(c.b).toBe(true);
  })

  test('inherit multi multi match a', async ()=>{
    class CA2 extends Controller{
      constructor(request) {
        super(request);
        CA2.mix(this, [MA,MB]);
      }
    }

    class CB2 extends CA2{
      constructor(request) {
        super(request);
        CB2.mix(this,[MA]);
      }
      async action_a() {}
      async action_b() {}
    }

    const c = new CB2({});

    expect(c.ma).toBe(2);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(0)
    expect(c.mbbefore).toBe(0)
    expect(c.mbefore).toBe(0)
    expect(c.a).toBe(undefined);
    expect(c.b).toBe(undefined);
    await c.execute('a');
    expect(c.ma).toBe(2);
    expect(c.mb).toBe(1);
    expect(c.mabefore).toBe(2)
    expect(c.mbbefore).toBe(1)
    expect(c.mbefore).toBe(3)
    expect(c.a).toBe(true);
    expect(c.b).toBe(undefined);
    expect(c.acount).toBe(2);

  })

});