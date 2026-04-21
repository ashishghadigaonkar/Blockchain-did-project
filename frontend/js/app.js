// ═══════════════════════════════════════════════════════════════
//  app.js — DIDChain Frontend Logic
//  MetaMask connection · Smart contract interaction · IPFS mock
// ═══════════════════════════════════════════════════════════════

"use strict";

// ── Web3 availability guard ────────────────────────────────────
if (typeof Web3 === "undefined") {
  alert("Web3.js failed to load from CDN. Please check your internet connection and refresh the page.");
  throw new Error("Web3 is not defined — aborting app.js");
}

// ── State ──────────────────────────────────────────────────────
let web3              = null;
let contract          = null;
let userAccount       = null;
let userHasIdentity   = false;  // tracks if there is an active identity
let userIsRevoked     = false;  // tracks if the user's identity was revoked
let isCorrectNetwork  = false;  // true only when MetaMask is on Sepolia

// ── DOM refs ───────────────────────────────────────────────────
const connectBtn     = document.getElementById("connectBtn");
const connectLabel   = document.getElementById("connectLabel");
const walletBanner   = document.getElementById("walletBanner");
const walletAddress  = document.getElementById("walletAddress");
const walletStatus   = document.getElementById("walletStatus");
const registerBtn    = document.getElementById("registerBtn");
const lookupBtn      = document.getElementById("lookupBtn");
const registerStatus = document.getElementById("registerStatus");
const lookupResult   = document.getElementById("lookupResult");

// Dashboard DOM refs
const navDashboard   = document.getElementById("navDashboard");
const dashSection    = document.getElementById("dashboard");
const dName          = document.getElementById("dashName");
const dEmail         = document.getElementById("dashEmail");
const dCollege       = document.getElementById("dashCollege");
const dId            = document.getElementById("dashId");
const dCreated       = document.getElementById("dashCreated");
const dUpdated       = document.getElementById("dashUpdated");
const dCid           = document.getElementById("dashCid");
const dStatusBadge   = document.getElementById("dashStatusBadge");
const viewBtn        = document.getElementById("viewBtn");
const revokeBtn      = document.getElementById("revokeBtn");
const eventFeed      = document.getElementById("eventFeed");

// ── Helpers ───────────────────────────────────────────────────
function showToast(msg, duration = 3500) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  t.classList.add("show");
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.classList.add("hidden"), 350); }, duration);
}

function setStatus(el, msg, type = "loading") {
  if (!el) return;
  el.className = `status-box ${type}`;
  el.innerHTML = msg;
  el.classList.remove("hidden");
}

function setBusy(btn) {
  btn.disabled = true;
  btn.classList.add("btn-loading");
}
function clearBusy(btn) {
  btn.classList.remove("btn-loading");
  // Don't auto-enable, let the caller decide based on network state
}

function toggleSkeletons(parentIds, isLoading) {
  parentIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (isLoading) {
      el.classList.add("loading-data");
      // For the badge specifically which uses visibility check
      const skel = el.querySelector(".skeleton-badge");
      if (skel) skel.style.visibility = "visible";
    } else {
      el.classList.remove("loading-data");
      const skel = el.querySelector(".skeleton-badge");
      if (skel) skel.style.visibility = "hidden";
    }
  });
}

function shortAddr(addr) {
  return addr.slice(0, 6) + "…" + addr.slice(-4);
}

function tsToDate(ts) {
  if (!ts || ts === "0") return "—";
  return new Date(Number(ts) * 1000).toLocaleString();
}

// ── Parse Solidity revert reasons from Web3 errors ───────────
function parseRevertReason(err) {
  // Web3 v1 embeds the revert reason in different places depending on the RPC
  const raw = err?.data?.message || err?.message || "";

  // Pattern 1: "execution reverted: DID: some reason"
  const match1 = raw.match(/execution reverted:\s*(.+?)(?:"|$)/i);
  if (match1) return match1[1].trim();

  // Pattern 2: reason inside JSON data field
  try {
    const inner = typeof err.data === "string" ? err.data : JSON.stringify(err.data);
    const match2 = inner.match(/revert\s+(.+?)(?:"|$)/i);
    if (match2) return match2[1].trim();
  } catch (_) {}

  // Friendly fallbacks for common codes
  if (err.code === 4001) return "Transaction rejected by user in MetaMask.";
  if (err.code === -32603) return "Internal JSON-RPC error — check MetaMask network.";

  return raw || "Unknown error";
}

// ── Backend Configuration ──────────────────────────────────────
const BACKEND_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && window.location.port !== '5000' ? "http://localhost:5000" : "";

// ── Upload JSON to IPFS via Backend Proxy ──────────────────────
async function uploadToIPFS(profileData) {
  try {
    const response = await fetch(`${BACKEND_URL}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData)
    });
    
    if (!response.ok) {
        throw new Error(`Backend upload error: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.cid;
  } catch (error) {
    console.error("Error uploading to backend:", error);
    throw error;
  }
}

// ── Fetch JSON from IPFS via Backend Proxy ──────────────────────
async function fetchFromIPFS(cid) {
  try {
    const response = await fetch(`${BACKEND_URL}/identity/${cid}`);
    if (!response.ok) throw new Error("Failed to fetch IPFS data");
    return await response.json();
  } catch (error) {
    console.error("Error fetching from backend:", error);
    return null;
  }
}


// ── Connect MetaMask ───────────────────────────────────────────
async function connectWallet() {
  if (!window.ethereum) {
    showToast("MetaMask not detected. Please install it from metamask.io");
    return;
  }

  try {
    // ① Network check FIRST — before any contract interaction
    const onSepolia = await checkNetwork();

    // ② Request accounts
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });

    // ③ Set up Web3 + contract instance
    await onAccountsChanged(accounts);

    // ④ Load on-chain stats only if network is correct
    if (onSepolia) await loadContractData();

  } catch (err) {
    showToast("Connection error: " + parseRevertReason(err));
  }
}

async function onAccountsChanged(accounts) {
  if (!accounts.length) {
    userAccount = null;
    userHasIdentity = false;
    disconnectUI();
    return;
  }
  userAccount = accounts[0];
  web3     = new Web3(window.ethereum);
  contract = new web3.eth.Contract(CONTRACT_ABI, CONTRACT_ADDRESS);
  
  // Initialize Token Contract
  if (TOKEN_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000") {
    const tokenContract = new web3.eth.Contract(TOKEN_ABI, TOKEN_CONTRACT_ADDRESS);
    window.tokenContract = tokenContract; // Attach to window for easy access
  }

  // UI
  connectBtn.classList.add("connected");
  connectLabel.textContent = shortAddr(userAccount);
  walletAddress.textContent = userAccount;
  walletBanner.classList.remove("hidden");

  // Enable action buttons ONLY on the right network
  registerBtn.disabled = !isCorrectNetwork;
  lookupBtn.disabled   = !isCorrectNetwork;

  // Show dashboard section
  navDashboard.classList.remove("hidden");
  dashSection.classList.remove("hidden");

  // Pre-fill lookup with own address
  document.getElementById("lookupAddress").value = userAccount;

  // Check on-chain identity only if we are on Sepolia
  if (isCorrectNetwork) {
    await checkExistingIdentity();
    setupEventListeners();
  }
  showToast("✓ Wallet connected: " + shortAddr(userAccount));
}


// Returns true if now on Sepolia, false otherwise.
// Always updates isCorrectNetwork state and the wallet status UI.
async function checkNetwork() {
  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  isCorrectNetwork = (chainId === SEPOLIA_CHAIN_ID);

  if (!isCorrectNetwork) {
    // Show persistent warning banner
    walletStatus.textContent = "⚠️ Wrong network — Please switch to Sepolia Testnet";
    walletStatus.style.color = "var(--yellow)";
    walletStatus.style.fontWeight = "600";

    // Disable action buttons to prevent wrong-network contract calls
    if (userAccount) {
      registerBtn.disabled = true;
      lookupBtn.disabled   = true;
    }

    // Try to switch automatically
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }]
      });
      // If switch succeeded MetaMask will fire chainChanged — let that handler update UI
      return false; // will become true after chainChanged fires
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        // Sepolia not in MetaMask at all — add it
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA_CHAIN_ID,
              chainName: "Sepolia Testnet",
              nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org", "https://sepolia.infura.io/v3/"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"]
            }]
          });
        } catch (addErr) {
          showToast("❌ Could not add Sepolia: " + parseRevertReason(addErr));
        }
      } else if (switchErr.code !== 4001) {
        // 4001 = user rejected switch prompt — not an error worth logging loudly
        console.warn("Network switch failed:", switchErr.message);
      }
    }
    return false;
  }

  // ✅ On Sepolia
  isCorrectNetwork = true;
  walletStatus.textContent  = "Sepolia Testnet ✓";
  walletStatus.style.color  = "var(--green)";
  walletStatus.style.fontWeight = "";
  document.getElementById("statNetwork").textContent = "Sepolia";

  // Re-enable buttons if wallet is connected
  if (userAccount) {
    registerBtn.disabled = false;
    lookupBtn.disabled   = false;
  }
  return true;
}

// Guard helper — call at the top of any handler that touches the contract
function requireNetwork() {
  if (!isCorrectNetwork) {
    showToast("⚠️ Please switch to Sepolia Testnet first.", 4000);
    return false;
  }
  return true;
}

const DASHBOARD_METADATA_SKELETONS = ["dashStatusSkeleton", "dashScoreParent", "dashBalanceParent"];
const DASHBOARD_PROFILE_SKELETONS = ["dashNameParent", "dashEmailParent", "dashCollegeParent", "dashIdParent", "dashCreatedParent", "dashUpdatedParent", "dashCidParent"];

async function checkExistingIdentity() {
  if (!contract || !userAccount) return;
  if (!IS_DEPLOYED) {
    walletStatus.textContent += " · Demo mode (contract not deployed)";
    return;
  }
  
  toggleSkeletons(DASHBOARD_METADATA_SKELETONS, true);
  
  try {
    // 1. Get identity active status
    userHasIdentity = await contract.methods.hasIdentity(userAccount).call();
    
    // 2. Fetch Reputation Score & Token Balance
    const score = await fetchReputation(userAccount);
    const balance = await fetchTokenBalance(userAccount);

    // 3. Fetch full metadata (CID + timestamps) regardless of status
    const idData = await contract.methods.getIdentity(userAccount).call();

    if (userHasIdentity) {
      userIsRevoked = false;
      walletStatus.textContent += " · ✓ Active";
      registerBtn.textContent  = "⬡ Update Identity";
      updateDashboardStatus("active", idData.ipfsHash, idData.createdAt, idData.updatedAt, score, balance);
    } else {
      // Could be revoked or never registered.
      if (idData.ipfsHash && idData.ipfsHash !== "") {
        userIsRevoked = true;
        walletStatus.textContent += " · ✗ Revoked";
        registerBtn.textContent  = "⬡ Register New Identity";
        registerBtn.disabled = false;
        updateDashboardStatus("revoked", idData.ipfsHash, idData.createdAt, idData.updatedAt, score, balance);
      } else {
        userIsRevoked = false;
        walletStatus.textContent += " · Not Registered";
        registerBtn.textContent  = "⬡ Register on Blockchain";
        updateDashboardStatus("none", null, "0", "0", score, balance);
      }
    }
  } catch (err) {
    walletStatus.textContent += " · Could not check identity";
    console.error("checkExistingIdentity error:", parseRevertReason(err));
  } finally {
    toggleSkeletons(DASHBOARD_METADATA_SKELETONS, false);
  }
}

async function fetchReputation(address) {
  try {
    // Try backend first
    const response = await fetch(`${BACKEND_URL}/score/${address}`);
    if (response.ok) {
        const data = await response.json();
        return data.score;
    }
    // Fallback to direct contract call
    return await contract.methods.getTrustScore(address).call();
  } catch (e) {
    console.error("Score fetch error:", e);
    return 0;
  }
}

async function fetchTokenBalance(address) {
  if (!window.tokenContract) return "0";
  try {
    const balance = await window.tokenContract.methods.balanceOf(address).call();
    const decimals = await window.tokenContract.methods.decimals().call();
    return (Number(balance) / (10 ** Number(decimals))).toFixed(2);
  } catch (e) {
    console.error("Balance fetch error:", e);
    return "0";
  }
}


async function loadContractData() {
  if (!IS_DEPLOYED) {
    document.getElementById("statIdentities").textContent = "Demo";
    return;
  }
  const statSkeletons = ["statIdParent", "statNetParent", "statBlockParent"];
  toggleSkeletons(statSkeletons, true);
  try {
    const total = await contract.methods.totalIdentities().call();
    document.getElementById("statIdentities").textContent = total.toString();
    const blockNum = await web3.eth.getBlockNumber();
    document.getElementById("statBlock").textContent = "#" + blockNum.toString();
  } catch (err) {
    console.error("loadContractData error:", err.message);
  } finally {
    toggleSkeletons(["statIdParent", "statNetParent", "statBlockParent"], false);
  }
}

function disconnectUI() {
  connectBtn.classList.remove("connected");
  connectLabel.textContent = "Connect Wallet";
  walletBanner.classList.add("hidden");
  navDashboard.classList.add("hidden");
  dashSection.classList.add("hidden");
  registerBtn.disabled = true;
  lookupBtn.disabled   = true;
}

// ── Dashboard Handlers ─────────────────────────────────────────

function updateDashboardStatus(status, cid = "", created = "0", updated = "0", score = 0, balance = "0") {
  dStatusBadge.className = "id-badge";
  if (status === "active") {
    dStatusBadge.classList.add("status-active");
    dStatusBadge.textContent = "Active";
    viewBtn.disabled = false;
    revokeBtn.classList.remove("hidden");
    revokeBtn.disabled = false;
  } else if (status === "revoked") {
    dStatusBadge.classList.add("status-revoked");
    dStatusBadge.textContent = "Revoked";
    viewBtn.disabled = true;
    revokeBtn.classList.add("hidden");
  } else {
    dStatusBadge.classList.add("status-none");
    dStatusBadge.textContent = "Not Registered";
    viewBtn.disabled = true;
    revokeBtn.classList.add("hidden");
  }
  
  if (cid) dCid.textContent = cid;
  if (created !== "0") dCreated.textContent = tsToDate(created);
  if (updated !== "0") dUpdated.textContent = tsToDate(updated);
  
  document.getElementById("dashScore").textContent = `${score}/100`;
  document.getElementById("dashBalance").textContent = `${balance} DID`;
}


/**
 * Fetches the specific IPFS profile and updates the dashboard name/email fields.
 * If cid is provided, it uses it; otherwise it fetches the latest from the contract.
 */
async function refreshProfileDisplay(forcedCid = null) {
  if (!userHasIdentity && !forcedCid) return;
  
  toggleSkeletons(DASHBOARD_PROFILE_SKELETONS, true);
  
  try {
    let cid = forcedCid;
    
    // Always fetch latest metadata from contract to keep timestamps accurate
    const idData = await contract.methods.getIdentity(userAccount).call();
    if (!cid) cid = idData.ipfsHash;
    
    const createdAt = idData.createdAt;
    const updatedAt = idData.updatedAt;
    const isActive  = idData.isActive;

    // Refresh Score & Balance
    const score = await fetchReputation(userAccount);
    const balance = await fetchTokenBalance(userAccount);
    
    // Update metadata
    updateDashboardStatus(isActive ? "active" : "revoked", cid, createdAt, updatedAt, score, balance);
    
    if (cid) {
      const profile = await fetchFromIPFS(cid);
      if (profile) {
        dName.textContent = profile.name || "—";
        dEmail.textContent = profile.email || "—";
        dCollege.textContent = profile.institution || "—";
        dId.textContent = profile.studentId || "—";
      } else {
        dName.innerHTML = `<span class="empty">Unable to load IPFS data</span>`;
        // Clear old fields if load fails
        dEmail.textContent = "—"; dCollege.textContent = "—"; dId.textContent = "—";
      }
    }
  } catch (err) {
    console.error("refreshProfileDisplay error:", err);
    throw err;
  } finally {
    toggleSkeletons(DASHBOARD_PROFILE_SKELETONS, false);
  }
}

viewBtn.addEventListener("click", async () => {
  if (!requireNetwork() || !userHasIdentity) return;
  setBusy(viewBtn);

  try {
    await refreshProfileDisplay();
  } catch (err) {
    showToast("Error viewing identity: " + parseRevertReason(err));
  }
  clearBusy(viewBtn);
  viewBtn.disabled = false;
});


revokeBtn.addEventListener("click", async () => {
  if (!requireNetwork() || !userHasIdentity || userIsRevoked) return;
  
  if (!confirm("Are you sure you want to REVOKE your identity? This cannot be undone.")) return;
  
  setBusy(revokeBtn);
  try {
    const tx = await contract.methods.revokeIdentity().send({ from: userAccount });
    showToast(`Identity revoked in tx ${shortAddr(tx.transactionHash)}`);
    await checkExistingIdentity();
    await loadContractData();
  } catch (err) {
    showToast("Revoke failed: " + parseRevertReason(err));
  }
  clearBusy(revokeBtn);
});

// ── Register Identity ──────────────────────────────────────────
registerBtn.addEventListener("click", async () => {
  if (!userAccount)       { showToast("Please connect your wallet first."); return; }
  if (!requireNetwork())  return;  // blocks if not on Sepolia

  const name    = document.getElementById("inputName").value.trim();
  const college = document.getElementById("inputCollege").value.trim();
  const idVal   = document.getElementById("inputId").value.trim();
  const email   = document.getElementById("inputEmail").value.trim();
  let   ipfs    = document.getElementById("inputIpfs").value.trim();

  if (!name || !college || !idVal) {
    setStatus(registerStatus, "⚠ Please fill in Name, College, and ID.", "error");
    return;
  }

  // Build profile object
  const profile = {
    "@context": "https://www.w3.org/ns/did/v1",
    "id": `did:ethr:sepolia:${userAccount}`,
    "name": name,
    "institution": college,
    "studentId": idVal,
    "email": email,
    "timestamp": Date.now()
  };

  setStatus(registerStatus, "⏳ Generating IPFS hash of your profile…", "loading");

  // Use custom CID or upload to IPFS via backend
  if (!ipfs) {
    try {
      ipfs = await uploadToIPFS(profile);
    } catch (e) {
      setStatus(registerStatus, "❌ IPFS Upload Failed: " + e.message, "error");
      return;
    }
  }


  setStatus(registerStatus,
    `📦 IPFS Hash: <code style="word-break:break-all;color:var(--accent)">${ipfs}</code><br/>⏳ Confirm the transaction in MetaMask…`,
    "loading"
  );

  try {
    if (!IS_DEPLOYED) {
      // Demo mode — simulate without real contract
      await new Promise(r => setTimeout(r, 1500));
      setStatus(registerStatus,
        `✅ <strong>DEMO MODE</strong> — Contract not deployed yet.<br/>
         Profile hash: <code>${ipfs}</code><br/>
         <small>Deploy DIDRegistry.sol on Sepolia via Remix, set <code>IS_DEPLOYED = true</code> in js/contract.js</small>`,
        "success"
      );
      return;
    }

    // Use cached state from connection, re-check only if stale
    const hasId = userHasIdentity;
    const method = hasId
      ? contract.methods.updateIdentity(ipfs)
      : contract.methods.registerIdentity(ipfs);

    const tx = await method.send({ from: userAccount });

    // Update cached state
    userHasIdentity = true;
    userIsRevoked = false;
    registerBtn.textContent = "⬡ Update Identity";

    setStatus(registerStatus,
      `✅ Identity ${hasId ? "updated" : "registered"} on-chain!<br/>
       Tx: <a href="https://sepolia.etherscan.io/tx/${tx.transactionHash}" target="_blank" style="color:var(--accent)">${shortAddr(tx.transactionHash)}</a><br/>
       IPFS Hash: <code>${ipfs}</code>`,
      "success"
    );
    showToast("✓ Identity successfully recorded on Sepolia!");
    
    // CRITICAL FIX: Instead of just checking on-chain state, 
    // automatically refresh the profile display with the NEW CID.
    await checkExistingIdentity(); 
    await refreshProfileDisplay(ipfs); // use the CID we just uploaded
    await loadContractData();

  } catch (err) {
    const reason = parseRevertReason(err);
    setStatus(registerStatus, `❌ ${reason}`, "error");
  }
});

// ── Lookup Identity ────────────────────────────────────────────
lookupBtn.addEventListener("click", async () => {
  if (!userAccount)      { showToast("Please connect your wallet first."); return; }
  if (!requireNetwork()) return;  // blocks if not on Sepolia

  const addr = document.getElementById("lookupAddress").value.trim();
  if (!addr || !web3.utils.isAddress(addr)) {
    showToast("Please enter a valid Ethereum address.");
    return;
  }

  try {
    if (!IS_DEPLOYED) {
      // Demo placeholder
      document.getElementById("rHash").textContent    = "QmDemo…NotDeployed";
      document.getElementById("rCreated").textContent = "Deploy contract first";
      document.getElementById("rUpdated").textContent = "—";
      document.getElementById("rVersion").textContent = "—";
      document.getElementById("rStatus").textContent  = "⚠ Demo";
      document.getElementById("rStatus").style.color  = "var(--yellow)";
      lookupResult.classList.remove("hidden");
      return;
    }

    // ── Guard: check registration before calling getIdentity ──
    // getIdentity returns empty values for unregistered addresses which
    // can cause "Returned values aren't valid" on some RPC nodes.
    setStatus(registerStatus, "", "loading"); // clear old status silently
    lookupResult.classList.add("hidden");     // hide stale results

    const lookupSkeletons = ["rHashParent", "rCreatedParent", "rUpdatedParent", "rVersionParent", "rStatusParent"];
    lookupResult.classList.remove("hidden");
    toggleSkeletons(lookupSkeletons, true);

    const isRegistered = await contract.methods.hasIdentity(addr).call();

    if (!isRegistered) {
      // Show a clean "not found" card without calling getIdentity at all
      document.getElementById("rHash").textContent    = "—";
      document.getElementById("rCreated").textContent = "—";
      document.getElementById("rUpdated").textContent = "—";
      document.getElementById("rVersion").textContent = "—";
      const statusEl = document.getElementById("rStatus");
      statusEl.innerHTML = '<span style="color:var(--text-dim)">⚠ No identity registered for this address</span>';
      lookupResult.classList.remove("hidden");
      return;
    }

    // Safe to call getIdentity — address has an active identity
    const result = await contract.methods.getIdentity(addr).call();
    const { ipfsHash, createdAt, updatedAt, isActive, version } = result;

    document.getElementById("rHash").textContent    = ipfsHash || "(none)";
    document.getElementById("rCreated").textContent = tsToDate(createdAt);
    document.getElementById("rUpdated").textContent = tsToDate(updatedAt);
    document.getElementById("rVersion").textContent = version?.toString() || "—";

    const statusEl = document.getElementById("rStatus");
    if (isActive) {
      statusEl.innerHTML = '<span style="color:var(--green)">✓ Active</span>';
    } else {
      statusEl.innerHTML = '<span style="color:var(--red)">✗ Revoked</span>';
    }

    lookupResult.classList.remove("hidden");

  } catch (err) {
    const reason = parseRevertReason(err);
    showToast("❌ Lookup failed: " + reason);
    console.error("Lookup error:", err);
  } finally {
    toggleSkeletons(["rHashParent", "rCreatedParent", "rUpdatedParent", "rVersionParent", "rStatusParent"], false);
  }
});

// ── Event Feed ──────────────────────────────────────────────────
let eventsSubscribed = false;

function setupEventListeners() {
  if (!contract || !IS_DEPLOYED || eventsSubscribed) return;
  eventsSubscribed = true;

  // Clear feed initially
  eventFeed.innerHTML = "";

  const addEventToFeed = (type, txHash, data) => {
    const el = document.createElement("div");
    el.className = `event-item ${type === "Revoked" ? "revoked" : ""}`;
    
    let icon = "🪪";
    if (type === "Updated") icon = "🔄";
    if (type === "Revoked") icon = "⚠️";

    const time = tsToDate(data.timestamp);
    const owner = shortAddr(data.owner);
    const txLink = `<a href="https://sepolia.etherscan.io/tx/${txHash}" target="_blank">${shortAddr(txHash)}</a>`;
    
    let detail = "";
    if (type !== "Revoked") {
      const cid = data.ipfsHash || data.newIpfsHash || "";
      detail = `<br/>CID: <code>${shortAddr(cid)}</code>`;
    }

    el.innerHTML = `
      <div class="event-item-icon">${icon}</div>
      <div class="event-item-content">
        <span class="event-item-title">Identity ${type}</span>
        <span style="color:var(--text); font-size:0.75rem;">Owner: ${owner}${detail}</span>
        <div class="event-item-meta">
          <span>${time}</span>
          ${txLink}
        </div>
      </div>
    `;
    eventFeed.prepend(el);
    
    // Keep max 50 events
    if (eventFeed.children.length > 50) {
      eventFeed.removeChild(eventFeed.lastChild);
    }
  };

  contract.events.IdentityRegistered({ fromBlock: 'latest' })
    .on('data', e => addEventToFeed("Registered", e.transactionHash, e.returnValues));
    
  contract.events.IdentityUpdated({ fromBlock: 'latest' })
    .on('data', e => addEventToFeed("Updated", e.transactionHash, e.returnValues));
    
  contract.events.IdentityRevoked({ fromBlock: 'latest' })
    .on('data', e => addEventToFeed("Revoked", e.transactionHash, e.returnValues));
}

// ── MetaMask event listeners ───────────────────────────────────
if (window.ethereum) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    userHasIdentity = false;
    userIsRevoked = false;
    await onAccountsChanged(accounts);
    if (isCorrectNetwork && accounts.length) await loadContractData();
  });

  // On network switch: re-run network check, then refresh identity state
  // (avoid full page reload so the user doesn't lose form data)
  window.ethereum.on("chainChanged", async () => {
    const onSepolia = await checkNetwork();
    if (onSepolia && userAccount) {
      userHasIdentity = false;
      await checkExistingIdentity();
      await loadContractData();
    }
  });
}

connectBtn.addEventListener("click", connectWallet);

// ── Auto-connect if already authorised ────────────────────────
(async () => {
  if (!window.ethereum) return;
  try {
    // Network check before everything else
    await checkNetwork();
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts.length) {
      await onAccountsChanged(accounts);
      if (isCorrectNetwork) await loadContractData();
    }
  } catch (_) {}
})();

