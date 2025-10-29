import { useEffect, useState } from "react";
import { ethers } from "ethers";
// @ts-ignore - allow importing CSS without type declarations
import "./App.css";

// ✅ Add the correct ABI for DigitalAssetRegistry
const CONTRACT_ABI = [
  "function assetCount() view returns (uint256)",
  "function registerAsset(string _name, string _hash)",
  "function transferOwnership(uint256 _assetId, address _newOwner)",
  "function verifyAsset(uint256 _assetId, string _hash) view returns (bool)",
  "function getAsset(uint256 _assetId) view returns (string name, string hash, address owner, uint256 timestamp)",
  "event AssetRegistered(uint256 indexed assetId, address indexed owner, string hash)",
  "event OwnershipTransferred(uint256 indexed assetId, address indexed from, address indexed to)"
];

// ✅ Replace with your deployed contract address
const CONTRACT_ADDRESS = "0xcbf9ffdca6e9a6b74cd43b971e817e55647d4e6e";

// ✅ Declare global Ethereum provider type
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface Asset {
  id: number;
  name: string;
  hash: string;
  owner: string;
  timestamp: number;
}

export default function App() {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [account, setAccount] = useState<string>("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const [assetName, setAssetName] = useState("");
  const [assetHash, setAssetHash] = useState("");
  const [verifyAssetId, setVerifyAssetId] = useState("");
  const [verifyHash, setVerifyHash] = useState("");
  const [transferAssetId, setTransferAssetId] = useState("");
  const [transferTo, setTransferTo] = useState("");

  // ✅ Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setMessage("⚠️ MetaMask not detected. Please install it.");
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setProvider(provider);
      setSigner(signer);
      setAccount(address);

      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        setAccount(accounts[0] || "");
      });

      setMessage("✅ Wallet connected successfully!");
    } catch (error: any) {
      setMessage("❌ Error connecting wallet: " + error.message);
    }
  };

  // ✅ Connect contract
  const connectContract = async () => {
    if (!signer) {
      setMessage("⚠️ Connect wallet first!");
      return;
    }

    try {
      const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(c);
      setMessage("✅ Connected to contract!");
      await loadAssets(c);
    } catch (error: any) {
      setMessage("❌ Error connecting contract: " + error.message);
    }
  };

  // ✅ Register Asset
  const registerAsset = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.registerAsset(assetName, assetHash);
      await tx.wait();
      setMessage("✅ Asset registered successfully!");
      setAssetName("");
      setAssetHash("");
      await loadAssets(contract);
    } catch (error: any) {
      setMessage("❌ Error registering asset: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Transfer Ownership
  const transferOwnership = async () => {
    if (!contract) return;

    try {
      setLoading(true);
      const tx = await contract.transferOwnership(Number(transferAssetId), transferTo);
      await tx.wait();
      setMessage("✅ Ownership transferred!");
      setTransferAssetId("");
      setTransferTo("");
      await loadAssets(contract);
    } catch (error: any) {
      setMessage("❌ Error transferring ownership: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Verify Asset
  const verifyAsset = async () => {
    if (!contract) return;

    try {
      const valid = await contract.verifyAsset(Number(verifyAssetId), verifyHash);
      setMessage(valid ? "✅ Asset hash is valid!" : "❌ Asset hash mismatch!");
    } catch (error: any) {
      setMessage("❌ Error verifying asset: " + error.message);
    }
  };

  // ✅ Load all assets
  const loadAssets = async (c?: ethers.Contract) => {
    const contractToUse = c || contract;
    if (!contractToUse) return;

    try {
      const count: bigint = await contractToUse.assetCount();
      const list: Asset[] = [];

      for (let i = 1; i <= Number(count); i++) {
        const asset = await contractToUse.getAsset(i);
        list.push({
          id: i,
          name: asset[0],
          hash: asset[1],
          owner: asset[2],
          timestamp: Number(asset[3]),
        });
      }

      setAssets(list);
    } catch (error: any) {
      setMessage("❌ Error loading assets: " + error.message);
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      connectWallet();
    }
  }, []);

  return (
    <div className="App">
      <main>
        <h1>🧾 Digital Asset Registry</h1>
        <p>Account: {account || "Not connected"}</p>

        <section>
          <button onClick={connectWallet}>Connect Wallet</button>
          <button onClick={connectContract} disabled={!signer}>
            Connect Contract
          </button>
        </section>

        {/* Register Asset */}
        <section>
          <h2>Register New Asset</h2>
          <input
            type="text"
            placeholder="Asset Name"
            value={assetName}
            onChange={(e) => setAssetName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Asset Hash"
            value={assetHash}
            onChange={(e) => setAssetHash(e.target.value)}
          />
          <button onClick={registerAsset} disabled={!contract || loading}>
            Register
          </button>
        </section>

        {/* Transfer Ownership */}
        <section>
          <h2>Transfer Ownership</h2>
          <input
            type="number"
            placeholder="Asset ID"
            value={transferAssetId}
            onChange={(e) => setTransferAssetId(e.target.value)}
          />
          <input
            type="text"
            placeholder="New Owner Address"
            value={transferTo}
            onChange={(e) => setTransferTo(e.target.value)}
          />
          <button onClick={transferOwnership} disabled={!contract || loading}>
            Transfer
          </button>
        </section>

        {/* Verify Asset */}
        <section>
          <h2>Verify Asset</h2>
          <input
            type="number"
            placeholder="Asset ID"
            value={verifyAssetId}
            onChange={(e) => setVerifyAssetId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Hash to Verify"
            value={verifyHash}
            onChange={(e) => setVerifyHash(e.target.value)}
          />
          <button onClick={verifyAsset} disabled={!contract}>
            Verify
          </button>
        </section>

        {/* Asset List */}
        <section>
          <h2>Registered Assets</h2>
          <button onClick={() => loadAssets()} disabled={!contract}>
            Refresh
          </button>
          <div className="assets-list">
            {assets.map((asset) => (
              <div key={asset.id} className="asset-card">
                <h3>{asset.name}</h3>
                <p><strong>ID:</strong> {asset.id}</p>
                <p><strong>Hash:</strong> {asset.hash}</p>
                <p><strong>Owner:</strong> {asset.owner}</p>
                <p><strong>Timestamp:</strong> {new Date(asset.timestamp * 1000).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Status Message */}
        {message && (
          <div className={`message ${message.includes("❌") ? "error" : "success"}`}>
            {message}
          </div>
        )}

        {loading && <div className="loading">Processing transaction...</div>}
      </main>
    </div>
  );
}
