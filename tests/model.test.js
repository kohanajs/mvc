const Model = require('../classes/Model');

class TestModel extends Model {
}

describe('test Model', () => {
  test('test prototype pollution', async () => {
    Model.prototype.foo = () => 'bar';
    const ins = new Model();
    expect(ins.foo).toBe(undefined);
  });

  test('test child class', () => {
    TestModel.prototype.foo = () => 'bar';
    const ins = new TestModel();
    expect(ins.foo()).toBe('bar');
  });
});
