# Uniswap

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Installing

Get the code

```
git clone https://github.com/dt6120/uni-helper.git uni-helper
```

Install dependencies

```
cd uni-helper
npm install
```

Configure your Infura ID and mnemonic by filling the ```.env``` file in the root directory

```
MNEMONIC=""
INFURA_ID=""
```

To use custom tokens for swapping, first create them by deploying the contract file and changing the name, symbol and total supply

```
npx hardhat deploy --network rinkeby
```

Copy the addresses of the two deployed tokens and fill their details in the ```scripts/index.js``` file. If using existing tokens, simply fill their details

```
const token0 = {
  address: "address-here",
  name: "name-here",
  symbol: "symbol-here"
};

const token1 = {
  address: "address-here",
  name: "name-here",
  symbol: "symbol-here"
};
```

To create a pool or add liquidity or swap tokens, inside the main function of ```scripts/index.js``` file, simply comment out the task that is not being used
```
const main = async () => {
    await createPair(token0, token1);
    await addLiquidity(token0, 4000, token1, 4);
    await swapToken(token0, token1, 100);
};
```

Run the ```scripts/index.js``` file to execute the desired task

```
npx hardhat run scripts/index.js --network rinkeby
```

## Built With

* [HardHat](https://hardhat.org/)