const { getCreate2Address } = require("@ethersproject/address");
const { pack, keccak256 } = require("@ethersproject/solidity");
const {
    ChainId,
    Fetcher,
    WETH,
    Route,
    Trade,
    TokenAmount,
    TradeType,
    Percent,
    FACTORY_ADDRESS,
    INIT_CODE_HASH,
} = require("@uniswap/sdk");
const { FACTORY_ABI, TOKEN_ABI, ROUTER_ABI } = require("./abis");

const chainId = ChainId.RINKEBY;
// const tokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

// Update these token details after deplpoying your own tokens
const token0 = {
  address: "0xc1184d748488999BfAb64d90c896B85CFA1Dc7c2",
  name: "USDC",
  symbol: "USDC"
};
const token1 = {
  address: "0xb35721106628E7d4a286260490cf9EB8777f6067",
  name: "Rapid",
  symbol: "RIN"
};

// const pair_address = "0x2693730Dc6F11c6d6943F81e2e48f1aB6279Dbc5";

const main = async () => {
    await createPair(token0, token1);
    await addLiquidity(token0, 4000, token1, 4);
    await swapToken(token0, token1, 100);
};

const createPair = async (token0, token1) => {
    const [signer] = await ethers.getSigners();
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);

    console.log("\n----------Creating pair----------")

    try {
        const tx = await factory.connect(signer).createPair(token0.address, token1.address);
        const receipt = await tx.wait();
        console.log("Pair created at:", getPairAddress(token0, token1));
    } catch (error) {
        console.log("Existing pair found:", getPairAddress(token0, token1));
    }

    // const length = (await factory.allPairsLength()).toNumber();
    // const pair = (await factory.allPairs(length - 1)).toString();

    return getPairAddress(token0, token1);
}

const getPairAddress = (token0, token1) => {
    [token0, token1] = token0.address < token1.address ?  [token0, token1] : [token1, token0];

    return getCreate2Address(
        FACTORY_ADDRESS,
        keccak256(['bytes'], [pack(['address', 'address'], [token0.address, token1.address])]),
        INIT_CODE_HASH
    );
};

const addLiquidity = async (token0, amount0, token1, amount1) => {
    const [signer] = await ethers.getSigners();

    // const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, signer);
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);
    const tokenA = new ethers.Contract(token0.address, TOKEN_ABI, signer)
    const tokenB = new ethers.Contract(token1.address, TOKEN_ABI, signer)

    const midPrice = await getMidPrice(token1, token0);

    if (amount0 / amount1 > midPrice) {
        amount0 = amount1 * midPrice;
    } else {
        amount1 = amount0 / midPrice;
    }

    console.log("\n----------Approving router to spend tokens----------");
    await tokenA.approve(ROUTER_ADDRESS, ethers.utils.parseEther(amount0.toString()));
    console.log(`Approved router to spend ${amount0} ${token0.symbol} tokens`);
    await tokenB.approve(ROUTER_ADDRESS, ethers.utils.parseEther(amount1.toString()));
    console.log(`Approved router to spend ${amount1} ${token1.symbol} tokens`);

    console.log("\n----------Adding liquidity to pool----------");
    const tx = await router.addLiquidity(
        token0.address,
        token1.address,
        ethers.utils.parseEther(amount0.toString()),
        ethers.utils.parseEther(amount1.toString()),
        ethers.utils.parseEther((amount0 * 0.99).toString()),
        ethers.utils.parseEther((amount1 * 0.99).toString()),
        signer.address,
        Date.now() + 60 * 20,
        { gasLimit: 3000000 }
    );
    const receipt = await tx.wait();

    console.log(`Liquidity added to ${token0.symbol}-${token1.symbol} pool successfully`);
};

const getMidPrice = async (token0, token1) => {
    const Token0 = await Fetcher.fetchTokenData(
        chainId,
        token0.address,
        undefined,
        token0.symbol,
        token0.name,
    );

    const Token1 = await Fetcher.fetchTokenData(
        chainId,
        token1.address,
        undefined,
        token1.symbol,
        token1.name,
    );

    const pair = await Fetcher.fetchPairData(Token0, Token1);

    const route = new Route([pair], Token0); // Token0 -> Token1 trade

    // console.log("Mid price:", route.midPrice.toSignificant(6));

    // const trade = new Trade(
    //     route, 
    //     new TokenAmount(Token0, ethers.utils.parseEther(amount.toString())), 
    //     TradeType.EXACT_INPUT
    // );

    // console.log("Execution price:", trade.executionPrice.toSignificant(6));
    // console.log("Next mid price:", trade.nextMidPrice.toSignificant(6));

    return route.midPrice.toSignificant(6);
};

const swapToken = async (token0, token1, amount) => {
    const Token0 = await Fetcher.fetchTokenData(
        chainId,
        token0.address,
        undefined,
        token0.symbol,
        token0.name,
    );

    const Token1 = await Fetcher.fetchTokenData(
        chainId,
        token1.address,
        undefined,
        token1.symbol,
        token1.name,
    );

    const [signer] = await ethers.getSigners();
    const tokenA = new ethers.Contract(token0.address, TOKEN_ABI, signer)
    const router = new ethers.Contract(ROUTER_ADDRESS, ROUTER_ABI, signer);

    console.log(`\n----------Approving router to spend ${token0.symbol} tokens----------\n`);
    await tokenA.approve(ROUTER_ADDRESS, ethers.utils.parseEther(amount.toString()));
    console.log(`Approved router to spend ${amount} ${token0.symbol} tokens`);

    console.log(`\n----------Swapping ${token0.symbol} tokens for ${token1.symbol} tokens----------\n`);

    const pair = await Fetcher.fetchPairData(Token0, Token1);
    const route = new Route([pair], Token0); // Token0 -> Token1 trade
    const trade = new Trade(
        route, 
        new TokenAmount(Token0, ethers.utils.parseEther(amount.toString())), 
        TradeType.EXACT_INPUT
    );

    // const slippageTolerance = new Percent("50", "10000");

    const amountIn = ethers.utils.parseEther(amount.toString());
    const amountOutMin = ethers.utils.parseEther(Math.round(trade.executionPrice.toSignificant(6) * 0.99).toString());
    const path = [Token0.address, Token1.address];
    const to = signer.address;
    const deadline = Math.floor(Date.now() / 1000) + 60 * 20;

    const tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        path,
        to,
        deadline,
        { gasLimit: 3000000 }
    );
    const receipt = await tx.wait();

    console.log(`Traded ${amount} ${token0.symbol} tokens for ${trade.executionPrice.toSignificant(6)} ${token1.symbol} tokens successfully`);
};

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.log(error);
        process.exit(1);
    });
