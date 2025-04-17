import { durableIdentityModule } from 'modules/durableIdentityModule.js';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Durable Identity Module', () => {
  let storageMock;

  beforeEach(() => {
    storageMock = sinon.stub(localStorage, 'getItem');
    storageMock.withArgs('pub_durable_id').returns(null);
  });

  afterEach(() => {
    storageMock.restore();
  });

  it('should generate a new durable ID if none exists', () => {
    const idObj = durableIdentityModule.getId({ params: {} }, null);
    expect(idObj.id).to.be.a('string');
  });

  it('should use an existing ID if stored', () => {
    storageMock.withArgs('pub_durable_id').returns('existing-id');
    const idObj = durableIdentityModule.getId({ params: {} }, 'existing-id');
    expect(idObj.id).to.equal('existing-id');
  });

  it('should extend the expiration of an existing ID', () => {
    const idObj = durableIdentityModule.extendId({ params: {} }, 'existing-id');
    expect(idObj.id).to.equal('existing-id');
  });
});
