const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const PlantsReferral = artifacts.require('PlantsReferral');

contract('PlantsReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.plantsReferral = await PlantsReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.plantsReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.plantsReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.plantsReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.plantsReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.plantsReferral.operators(operator)).valueOf(), true);

        await this.plantsReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.plantsReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.plantsReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.plantsReferral.operators(operator)).valueOf(), false);
        await this.plantsReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.plantsReferral.operators(operator)).valueOf(), true);

        await this.plantsReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.plantsReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.plantsReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.plantsReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.plantsReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.plantsReferral.referralsCount(referrer)).valueOf(), '0');

        await this.plantsReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.plantsReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.plantsReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.plantsReferral.referralsCount(bob)).valueOf(), '0');
        await this.plantsReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.plantsReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.plantsReferral.getReferrer(alice)).valueOf(), referrer);

        await this.plantsReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.plantsReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.plantsReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.plantsReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.plantsReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.plantsReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.plantsReferral.operators(operator)).valueOf(), true);

        await this.plantsReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.plantsReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.plantsReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.plantsReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.plantsReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.plantsReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.plantsReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.plantsReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
