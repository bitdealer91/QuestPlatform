import pkg from "hardhat";
const { ethers } = pkg as unknown as typeof import("hardhat");

async function main(){
  const baseURI = process.env.KEYS_BASE_URI || ""; // e.g. https://quests.somnia.network/metadata/keys/
  const signer = process.env.KEYS_SIGNER || (await (await ethers.getSigners())[0].getAddress());
  const Keys = await ethers.getContractFactory("Keys1155");
  const contract = await Keys.deploy(baseURI, signer);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("Keys1155 deployed:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });


