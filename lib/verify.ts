export async function verifyExternal(address: string, taskId: string, txHash?: string, force?: boolean){
  const res = await fetch("/api/verify/external", {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ address, taskId, txHash, force })
  });
  const json = await res.json();
  return json as { wallet: string; score?: number; completed: boolean; raw?: any };
}









