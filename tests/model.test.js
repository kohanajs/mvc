import Model from '../classes/Model';

class TestModel extends Model {
}

describe('test Model', () => {
  test('test prototype pollution', async () => {
    try{
      Model.prototype.foo = () => 'bar';
      expect("this line shouldn't be executed").toBe(false);
    }catch(e){
      expect(e.message).toBe('Cannot add property foo, object is not extensible')
    }

    const ins = new Model();
    expect(ins.foo).toBe(undefined);
  });

  test('test child class', () => {
    TestModel.prototype.foo = () => 'bar';
    const ins = new TestModel();
    expect(ins.foo()).toBe('bar');
  });
});
