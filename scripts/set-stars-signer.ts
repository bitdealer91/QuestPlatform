import pkg from "hardhat";
import { Wallet } from "ethers";
const { ethers } = pkg as unknown as typeof import("hardhat");

async function main(){
  const contractAddr =
    process.env.STARS_ADDRESS ||
    process.env.NEXT_PUBLIC_STARS_1155_ADDRESS ||
    "";
  const pkForSig = process.env.SIGNER_PRIVATE_KEY || "";
  if (!/^0x[0-9a-fA-F]{64}$/.test(pkForSig)){
    throw new Error("SIGNER_PRIVATE_KEY is missing or invalid");
  }
  if (!/^0x[0-9a-fA-F]{40}$/.test(contractAddr)){
    throw new Error("STARS_ADDRESS/NEXT_PUBLIC_STARS_1155_ADDRESS is missing or invalid");
  }
  const newSigner = new Wallet(pkForSig).address;

  const Stars = await ethers.getContractAt("Stars1155", contractAddr);
  const owner = await Stars.owner();
  const [deployer] = await ethers.getSigners();
  if (owner.toLowerCase() !== (await deployer.getAddress()).toLowerCase()){
    throw new Error(`Current signer is not the owner. Owner: ${owner}, Current: ${await deployer.getAddress()}`);
  }

  console.log("Setting signer to:", newSigner);
  const tx = await Stars.setSigner(newSigner);
  console.log("Tx sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Tx confirmed in block:", receipt?.blockNumber);
  const current = await Stars.signer();
  console.log("Current signer:", current);
}

main().catch((e) => { console.error(e); process.exit(1); });


