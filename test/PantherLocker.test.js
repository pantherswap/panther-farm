const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");
const PantherLocker = artifacts.require('PantherLocker');
const MockBEP20 = artifacts.require('libs/MockBEP20');


contract('PantherLocker', ([alice, bob, carol, owner]) => {
    beforeEach(async () => {
        this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: owner });
        this.pantherLocker = await PantherLocker.new({ from: owner });
    });

    it('only owner', async () => {
        assert.equal((await this.pantherLocker.owner()), owner);

        // lock
        await this.lp1.transfer(this.pantherLocker.address, '2000', { from: owner });
        assert.equal((await this.lp1.balanceOf(this.pantherLocker.address)).toString(), '2000');

        await expectRevert(this.pantherLocker.unlock(this.lp1.address, bob, { from: bob }), 'Ownable: caller is not the owner');
        await this.pantherLocker.unlock(this.lp1.address, carol, { from: owner });
        assert.equal((await this.lp1.balanceOf(carol)).toString(), '2000');
        assert.equal((await this.lp1.balanceOf(this.pantherLocker.address)).toString(), '0');
    });
})
