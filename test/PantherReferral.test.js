const { expectRevert } = require('@openzeppelin/test-helpers');
const { assert } = require("chai");

const PantherReferral = artifacts.require('PantherReferral');

contract('PantherReferral', ([alice, bob, carol, referrer, operator, owner]) => {
    beforeEach(async () => {
        this.pantherReferral = await PantherReferral.new({ from: owner });
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('should allow operator and only owner to update operator', async () => {
        assert.equal((await this.pantherReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.pantherReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');

        await expectRevert(this.pantherReferral.updateOperator(operator, true, { from: carol }), 'Ownable: caller is not the owner');
        await this.pantherReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.pantherReferral.operators(operator)).valueOf(), true);

        await this.pantherReferral.updateOperator(operator, false, { from: owner });
        assert.equal((await this.pantherReferral.operators(operator)).valueOf(), false);
        await expectRevert(this.pantherReferral.recordReferral(alice, referrer, { from: operator }), 'Operator: caller is not the operator');
    });

    it('record referral', async () => {
        assert.equal((await this.pantherReferral.operators(operator)).valueOf(), false);
        await this.pantherReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.pantherReferral.operators(operator)).valueOf(), true);

        await this.pantherReferral.recordReferral(this.zeroAddress, referrer, { from: operator });
        await this.pantherReferral.recordReferral(alice, this.zeroAddress, { from: operator });
        await this.pantherReferral.recordReferral(this.zeroAddress, this.zeroAddress, { from: operator });
        await this.pantherReferral.recordReferral(alice, alice, { from: operator });
        assert.equal((await this.pantherReferral.getReferrer(alice)).valueOf(), this.zeroAddress);
        assert.equal((await this.pantherReferral.referralsCount(referrer)).valueOf(), '0');

        await this.pantherReferral.recordReferral(alice, referrer, { from: operator });
        assert.equal((await this.pantherReferral.getReferrer(alice)).valueOf(), referrer);
        assert.equal((await this.pantherReferral.referralsCount(referrer)).valueOf(), '1');

        assert.equal((await this.pantherReferral.referralsCount(bob)).valueOf(), '0');
        await this.pantherReferral.recordReferral(alice, bob, { from: operator });
        assert.equal((await this.pantherReferral.referralsCount(bob)).valueOf(), '0');
        assert.equal((await this.pantherReferral.getReferrer(alice)).valueOf(), referrer);

        await this.pantherReferral.recordReferral(carol, referrer, { from: operator });
        assert.equal((await this.pantherReferral.getReferrer(carol)).valueOf(), referrer);
        assert.equal((await this.pantherReferral.referralsCount(referrer)).valueOf(), '2');
    });

    it('record referral commission', async () => {
        assert.equal((await this.pantherReferral.totalReferralCommissions(referrer)).valueOf(), '0');

        await expectRevert(this.pantherReferral.recordReferralCommission(referrer, 1, { from: operator }), 'Operator: caller is not the operator');
        await this.pantherReferral.updateOperator(operator, true, { from: owner });
        assert.equal((await this.pantherReferral.operators(operator)).valueOf(), true);

        await this.pantherReferral.recordReferralCommission(referrer, 1, { from: operator });
        assert.equal((await this.pantherReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.pantherReferral.recordReferralCommission(referrer, 0, { from: operator });
        assert.equal((await this.pantherReferral.totalReferralCommissions(referrer)).valueOf(), '1');

        await this.pantherReferral.recordReferralCommission(referrer, 111, { from: operator });
        assert.equal((await this.pantherReferral.totalReferralCommissions(referrer)).valueOf(), '112');

        await this.pantherReferral.recordReferralCommission(this.zeroAddress, 100, { from: operator });
        assert.equal((await this.pantherReferral.totalReferralCommissions(this.zeroAddress)).valueOf(), '0');
    });
});
