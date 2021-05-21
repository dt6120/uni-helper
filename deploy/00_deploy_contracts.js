module.exports = async ({ getNamedAccounts, deployments }) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts()

    const token0 = await deploy("Token", {
      from: deployer,
      gasLimit: 4000000,
      args: ["USDC", "USDC", 1000000],
    });

    const token1 = await deploy("Token", {
      from: deployer,
      gasLimit: 4000000,
      args: ["RIN", "Rapid", 1000],
    });

    console.log("Token0 deployed at", token0.address);
    console.log("Token1 deployed at", token1.address);
};
