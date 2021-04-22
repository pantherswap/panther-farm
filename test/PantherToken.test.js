const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const PantherToken = artifacts.require('PantherToken');

contract('PantherToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.panther = await PantherToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.panther.owner()), owner);
        assert.equal((await this.panther.operator()), owner);

        await expectRevert(this.panther.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.updatePantherSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.panther.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.panther.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        await expectRevert(this.panther.transferOperator(this.zeroAddress, { from: operator }), 'PANTHER::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        assert.equal((await this.panther.transferTaxRate()).toString(), '500');
        assert.equal((await this.panther.burnRate()).toString(), '20');

        await this.panther.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.panther.transferTaxRate()).toString(), '0');
        await this.panther.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.panther.transferTaxRate()).toString(), '1000');
        await expectRevert(this.panther.updateTransferTaxRate(1001, { from: operator }), 'PANTHER::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.panther.updateBurnRate(0, { from: operator });
        assert.equal((await this.panther.burnRate()).toString(), '0');
        await this.panther.updateBurnRate(100, { from: operator });
        assert.equal((await this.panther.burnRate()).toString(), '100');
        await expectRevert(this.panther.updateBurnRate(101, { from: operator }), 'PANTHER::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        await this.panther.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.panther.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');

        await this.panther.transfer(bob, 12345, { from: alice });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.panther.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '494');

        await this.panther.approve(carol, 22345, { from: alice });
        await this.panther.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.panther.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        await this.panther.mint(alice, 10000000, { from: owner });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');

        await this.panther.transfer(bob, 19, { from: alice });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.panther.balanceOf(bob)).toString(), '19');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        assert.equal((await this.panther.transferTaxRate()).toString(), '500');
        assert.equal((await this.panther.burnRate()).toString(), '20');

        await this.panther.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.panther.transferTaxRate()).toString(), '0');

        await this.panther.mint(alice, 10000000, { from: owner });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');

        await this.panther.transfer(bob, 10000, { from: alice });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.panther.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        assert.equal((await this.panther.transferTaxRate()).toString(), '500');
        assert.equal((await this.panther.burnRate()).toString(), '20');

        await this.panther.updateBurnRate(0, { from: operator });
        assert.equal((await this.panther.burnRate()).toString(), '0');

        await this.panther.mint(alice, 10000000, { from: owner });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');

        await this.panther.transfer(bob, 1234, { from: alice });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.panther.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        assert.equal((await this.panther.transferTaxRate()).toString(), '500');
        assert.equal((await this.panther.burnRate()).toString(), '20');

        await this.panther.updateBurnRate(100, { from: operator });
        assert.equal((await this.panther.burnRate()).toString(), '100');

        await this.panther.mint(alice, 10000000, { from: owner });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');

        await this.panther.transfer(bob, 1234, { from: alice });
        assert.equal((await this.panther.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.panther.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.panther.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.panther.balanceOf(this.panther.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.panther.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.panther.maxTransferAmount()).toString(), '0');

        await this.panther.mint(alice, 1000000, { from: owner });
        assert.equal((await this.panther.maxTransferAmount()).toString(), '5000');

        await this.panther.mint(alice, 1000, { from: owner });
        assert.equal((await this.panther.maxTransferAmount()).toString(), '5005');

        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        await this.panther.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.panther.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        assert.equal((await this.panther.isExcludedFromAntiWhale(operator)), false);
        await this.panther.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.panther.isExcludedFromAntiWhale(operator)), true);

        await this.panther.mint(alice, 10000, { from: owner });
        await this.panther.mint(bob, 10000, { from: owner });
        await this.panther.mint(carol, 10000, { from: owner });
        await this.panther.mint(operator, 10000, { from: owner });
        await this.panther.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.panther.maxTransferAmount()).toString(), '250');
        await expectRevert(this.panther.transfer(bob, 251, { from: alice }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.panther.approve(carol, 251, { from: alice });
        await expectRevert(this.panther.transferFrom(alice, carol, 251, { from: carol }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.panther.transfer(bob, 250, { from: alice });
        await this.panther.transferFrom(alice, carol, 250, { from: carol });

        await this.panther.transfer(this.burnAddress, 251, { from: alice });
        await this.panther.transfer(operator, 251, { from: alice });
        await this.panther.transfer(owner, 251, { from: alice });
        await this.panther.transfer(this.panther.address, 251, { from: alice });

        await this.panther.transfer(alice, 251, { from: operator });
        await this.panther.transfer(alice, 251, { from: owner });
        await this.panther.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.panther.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.panther.swapAndLiquifyEnabled()), false);

        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        await this.panther.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.panther.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.panther.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.panther.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.panther.transferOperator(operator, { from: owner });
        assert.equal((await this.panther.operator()), operator);

        await this.panther.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.panther.minAmountToLiquify()).toString(), '100');
    });
});
