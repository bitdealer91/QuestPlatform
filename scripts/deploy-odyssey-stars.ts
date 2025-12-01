import pkg from "hardhat";
const { ethers } = pkg as unknown as typeof import("hardhat");

async function main(){
  const name = process.env.STARS_NAME || "Odyssey Star";
  const baseURI = process.env.STARS_BASE_URI || ""; // e.g. https://odyssey.somnia.network/metadata/stars/
  const contractURI = process.env.STARS_CONTRACT_URI || ""; // e.g. https://odyssey.somnia.network/metadata/stars/collection.json
  const signer = process.env.STARS_SIGNER || (await (await ethers.getSigners())[0].getAddress());

  const C = await ethers.getContractFactory("OdysseyStars1155");
  const contract = await C.deploy(name, baseURI, contractURI, signer);
  await contract.waitForDeployment();
  const addr = await contract.getAddress();
  console.log("OdysseyStars1155 deployed:", addr);
  console.log("name:", await contract.name());
  console.log("signer:", await contract.signer());
  console.log("uri(1):", await contract.uri(1));
}

main().catch((e) => { console.error(e); process.exit(1); });



