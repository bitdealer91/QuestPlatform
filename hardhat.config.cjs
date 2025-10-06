// Hardhat config in CJS to work in an ESM Next.js project
require('dotenv/config');
require('@nomicfoundation/hardhat-toolbox');

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || '';
const RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.infra.mainnet.somnia.network/';

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: {
    version: '0.8.24',
    settings: { optimizer: { enabled: true, runs: 200 } },
  },
  networks: {
    somnia: {
      url: RPC,
      chainId: 5031,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
};

module.exports = config;
