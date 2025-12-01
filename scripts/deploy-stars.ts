import pkg from "hardhat";
const { ethers } = pkg as unknown as typeof import("hardhat");

async function main(){
  const baseURI = process.env.STARS_BASE_URI || ""; // e.g. https://quests.somnia.network/metadata/stars/
  const signer = process.env.STARS_SIGNER || (await (await ethers.getSigners())[0].getAddress());
  const Stars = await ethers.getContractFactory("Stars1155");
  const contract = await Stars.deploy(baseURI, signer);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("Stars1155 deployed:", addr);
}

main().catch((e) => { console.error(e); process.exit(1); });


