const { expectRevert, time } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");
const PantherToken = artifacts.require('PantherToken');
const MasterChef = artifacts.require('MasterChef');
const MockBEP20 = artifacts.require('libs/MockBEP20');
const PantherReferral = artifacts.require('PantherReferral');

contract('MasterChef', ([alice, bob, carol, referrer, treasury, dev, fee, owner]) => {
    beforeEach(async () => {
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
        this.panther = await PantherToken.new({ from: owner });
        this.referral = await PantherReferral.new({ from: owner });
        this.chef = await MasterChef.new(this.panther.address, '100', '1000', { from: owner });

        await this.panther.transferOwnership(this.chef.address, { from: owner });
        await this.referral.updateOperator(this.chef.address, true, { from: owner });
        await this.chef.setPantherReferral(this.referral.address, { from: owner });

        this.lp1 = await MockBEP20.new('LPToken', 'LP1', '1000000', { from: owner });
        this.lp2 = await MockBEP20.new('LPToken', 'LP2', '1000000', { from: owner });
        this.lp3 = await MockBEP20.new('LPToken', 'LP3', '1000000', { from: owner });
        this.lp4 = await MockBEP20.new('LPToken', 'LP4', '1000000', { from: owner });

        await this.lp1.transfer(alice, '2000', { from: owner });
        await this.lp2.transfer(alice, '2000', { from: owner });
        await this.lp3.transfer(alice, '2000', { from: owner });
        await this.lp4.transfer(alice, '2000', { from: owner });

        await this.lp1.transfer(bob, '2000', { from: owner });
        await this.lp2.transfer(bob, '2000', { from: owner });
        await this.lp3.transfer(bob, '2000', { from: owner });
        await this.lp4.transfer(bob, '2000', { from: owner });

        await this.lp1.transfer(carol, '2000', { from: owner });
        await this.lp2.transfer(carol, '2000', { from: owner });
        await this.lp3.transfer(carol, '2000', { from: owner });
        await this.lp4.transfer(carol, '2000', { from: owner });
    });

    it('deposit fee', async () => {
        assert.equal((await this.chef.owner()), owner);
        assert.equal((await this.chef.feeAddress()), owner);

        await this.chef.setFeeAddress(fee, { from: owner });
        assert.equal((await this.chef.feeAddress()), fee);

        await this.chef.add('1000', this.lp1.address, '400', '3600', true, { from: owner });
        await this.chef.add('2000', this.lp2.address, '0', '3600', true, { from: owner });

        await this.lp1.approve(this.chef.address, '1000', { from: alice });
        await this.lp2.approve(this.chef.address, '1000', { from: alice });

        assert.equal((await this.lp1.balanceOf(fee)).toString(), '0');
        await this.chef.deposit(0, '100', referrer, { from: alice });
        assert.equal((await this.lp1.balanceOf(fee)).toString(), '4');

        assert.equal((await this.lp2.balanceOf(fee)).toString(), '0');
        await this.chef.deposit(1, '100', referrer, { from: alice });
        assert.equal((await this.lp2.balanceOf(fee)).toString(), '0');
    });

    it('only dev', async () => {
        assert.equal((await this.chef.owner()), owner);
        assert.equal((await this.chef.devAddress()), owner);

        await expectRevert(this.chef.setDevAddress(dev, { from: dev }), 'setDevAddress: FORBIDDEN');
        await this.chef.setDevAddress(dev, { from: owner });
        assert.equal((await this.chef.devAddress()), dev);

        await expectRevert(this.chef.setDevAddress(this.zeroAddress, { from: dev }), 'setDevAddress: ZERO');
    });

    it('only fee', async () => {
        assert.equal((await this.chef.owner()), owner);
        assert.equal((await this.chef.feeAddress()), owner);

        await expectRevert(this.chef.setFeeAddress(fee, { from: fee }), 'setFeeAddress: FORBIDDEN');
        await this.chef.setFeeAddress(fee, { from: owner });
        assert.equal((await this.chef.feeAddress()), fee);

        await expectRevert(this.chef.setFeeAddress(this.zeroAddress, { from: fee }), 'setFeeAddress: ZERO');
    });
});
