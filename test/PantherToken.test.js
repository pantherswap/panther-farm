const { expectRevert } = require("@openzeppelin/test-helpers");
const { assert } = require("chai");

const PlantsToken = artifacts.require('PlantsToken');

contract('PlantsToken', ([alice, bob, carol, operator, owner]) => {
    beforeEach(async () => {
        this.plants = await PlantsToken.new({ from: owner });
        this.burnAddress = '0x000000000000000000000000000000000000dEaD';
        this.zeroAddress = '0x0000000000000000000000000000000000000000';
    });

    it('only operator', async () => {
        assert.equal((await this.plants.owner()), owner);
        assert.equal((await this.plants.operator()), owner);

        await expectRevert(this.plants.updateTransferTaxRate(500, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.updateBurnRate(20, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.updateMaxTransferAmountRate(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.setExcludedFromAntiWhale(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.updatePlantsSwapRouter(operator, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        await expectRevert(this.plants.transferOperator(alice, { from: operator }), 'operator: caller is not the operator');
    });

    it('transfer operator', async () => {
        await expectRevert(this.plants.transferOperator(operator, { from: operator }), 'operator: caller is not the operator');
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        await expectRevert(this.plants.transferOperator(this.zeroAddress, { from: operator }), 'PANTHER::transferOperator: new operator is the zero address');
    });

    it('update transfer tax rate', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        assert.equal((await this.plants.transferTaxRate()).toString(), '500');
        assert.equal((await this.plants.burnRate()).toString(), '20');

        await this.plants.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.plants.transferTaxRate()).toString(), '0');
        await this.plants.updateTransferTaxRate(1000, { from: operator });
        assert.equal((await this.plants.transferTaxRate()).toString(), '1000');
        await expectRevert(this.plants.updateTransferTaxRate(1001, { from: operator }), 'PANTHER::updateTransferTaxRate: Transfer tax rate must not exceed the maximum rate.');

        await this.plants.updateBurnRate(0, { from: operator });
        assert.equal((await this.plants.burnRate()).toString(), '0');
        await this.plants.updateBurnRate(100, { from: operator });
        assert.equal((await this.plants.burnRate()).toString(), '100');
        await expectRevert(this.plants.updateBurnRate(101, { from: operator }), 'PANTHER::updateBurnRate: Burn rate must not exceed the maximum rate.');
    });

    it('transfer', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        await this.plants.mint(alice, 10000000, { from: owner }); // max transfer amount 25,000
        assert.equal((await this.plants.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');

        await this.plants.transfer(bob, 12345, { from: alice });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '9987655');
        assert.equal((await this.plants.balanceOf(bob)).toString(), '11728');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '123');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '494');

        await this.plants.approve(carol, 22345, { from: alice });
        await this.plants.transferFrom(alice, carol, 22345, { from: carol });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '9965310');
        assert.equal((await this.plants.balanceOf(carol)).toString(), '21228');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '346');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '1388');
    });

    it('transfer small amount', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        await this.plants.mint(alice, 10000000, { from: owner });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');

        await this.plants.transfer(bob, 19, { from: alice });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '9999981');
        assert.equal((await this.plants.balanceOf(bob)).toString(), '19');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');
    });

    it('transfer without transfer tax', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        assert.equal((await this.plants.transferTaxRate()).toString(), '500');
        assert.equal((await this.plants.burnRate()).toString(), '20');

        await this.plants.updateTransferTaxRate(0, { from: operator });
        assert.equal((await this.plants.transferTaxRate()).toString(), '0');

        await this.plants.mint(alice, 10000000, { from: owner });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');

        await this.plants.transfer(bob, 10000, { from: alice });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '9990000');
        assert.equal((await this.plants.balanceOf(bob)).toString(), '10000');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');
    });

    it('transfer without burn', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        assert.equal((await this.plants.transferTaxRate()).toString(), '500');
        assert.equal((await this.plants.burnRate()).toString(), '20');

        await this.plants.updateBurnRate(0, { from: operator });
        assert.equal((await this.plants.burnRate()).toString(), '0');

        await this.plants.mint(alice, 10000000, { from: owner });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');

        await this.plants.transfer(bob, 1234, { from: alice });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.plants.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '61');
    });

    it('transfer all burn', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        assert.equal((await this.plants.transferTaxRate()).toString(), '500');
        assert.equal((await this.plants.burnRate()).toString(), '20');

        await this.plants.updateBurnRate(100, { from: operator });
        assert.equal((await this.plants.burnRate()).toString(), '100');

        await this.plants.mint(alice, 10000000, { from: owner });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '10000000');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '0');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');

        await this.plants.transfer(bob, 1234, { from: alice });
        assert.equal((await this.plants.balanceOf(alice)).toString(), '9998766');
        assert.equal((await this.plants.balanceOf(bob)).toString(), '1173');
        assert.equal((await this.plants.balanceOf(this.burnAddress)).toString(), '61');
        assert.equal((await this.plants.balanceOf(this.plants.address)).toString(), '0');
    });

    it('max transfer amount', async () => {
        assert.equal((await this.plants.maxTransferAmountRate()).toString(), '50');
        assert.equal((await this.plants.maxTransferAmount()).toString(), '0');

        await this.plants.mint(alice, 1000000, { from: owner });
        assert.equal((await this.plants.maxTransferAmount()).toString(), '5000');

        await this.plants.mint(alice, 1000, { from: owner });
        assert.equal((await this.plants.maxTransferAmount()).toString(), '5005');

        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        await this.plants.updateMaxTransferAmountRate(100, { from: operator }); // 1%
        assert.equal((await this.plants.maxTransferAmount()).toString(), '10010');
    });

    it('anti whale', async () => {
        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        assert.equal((await this.plants.isExcludedFromAntiWhale(operator)), false);
        await this.plants.setExcludedFromAntiWhale(operator, true, { from: operator });
        assert.equal((await this.plants.isExcludedFromAntiWhale(operator)), true);

        await this.plants.mint(alice, 10000, { from: owner });
        await this.plants.mint(bob, 10000, { from: owner });
        await this.plants.mint(carol, 10000, { from: owner });
        await this.plants.mint(operator, 10000, { from: owner });
        await this.plants.mint(owner, 10000, { from: owner });

        // total supply: 50,000, max transfer amount: 250
        assert.equal((await this.plants.maxTransferAmount()).toString(), '250');
        await expectRevert(this.plants.transfer(bob, 251, { from: alice }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');
        await this.plants.approve(carol, 251, { from: alice });
        await expectRevert(this.plants.transferFrom(alice, carol, 251, { from: carol }), 'PANTHER::antiWhale: Transfer amount exceeds the maxTransferAmount');

        //
        await this.plants.transfer(bob, 250, { from: alice });
        await this.plants.transferFrom(alice, carol, 250, { from: carol });

        await this.plants.transfer(this.burnAddress, 251, { from: alice });
        await this.plants.transfer(operator, 251, { from: alice });
        await this.plants.transfer(owner, 251, { from: alice });
        await this.plants.transfer(this.plants.address, 251, { from: alice });

        await this.plants.transfer(alice, 251, { from: operator });
        await this.plants.transfer(alice, 251, { from: owner });
        await this.plants.transfer(owner, 251, { from: operator });
    });

    it('update SwapAndLiquifyEnabled', async () => {
        await expectRevert(this.plants.updateSwapAndLiquifyEnabled(true, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.plants.swapAndLiquifyEnabled()), false);

        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        await this.plants.updateSwapAndLiquifyEnabled(true, { from: operator });
        assert.equal((await this.plants.swapAndLiquifyEnabled()), true);
    });

    it('update min amount to liquify', async () => {
        await expectRevert(this.plants.updateMinAmountToLiquify(100, { from: operator }), 'operator: caller is not the operator');
        assert.equal((await this.plants.minAmountToLiquify()).toString(), '500000000000000000000');

        await this.plants.transferOperator(operator, { from: owner });
        assert.equal((await this.plants.operator()), operator);

        await this.plants.updateMinAmountToLiquify(100, { from: operator });
        assert.equal((await this.plants.minAmountToLiquify()).toString(), '100');
    });
});
