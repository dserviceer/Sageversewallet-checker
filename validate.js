// ============ WALLET VALIDATION ============
const supportedChains = {
    Ethereum: { regex: /^0x[a-fA-F0-9]{40}$/, length: 42, icon: "🟢" },
    BSC: { regex: /^0x[a-fA-F0-9]{40}$/, length: 42, icon: "🟡" },
    Polygon: { regex: /^0x[a-fA-F0-9]{40}$/, length: 42, icon: "🟣" },
    Arbitrum: { regex: /^0x[a-fA-F0-9]{40}$/, length: 42, icon: "🔵" },
    Optimism: { regex: /^0x[a-fA-F0-9]{40}$/, length: 42, icon: "🟠" },
    Solana: { regex: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/, icon: "⬛" }
};

function validateWallet(address, chain = null) {
    address = address.trim();
    if (!address) return { valid: false };

    if (!chain) {
        for (let name in supportedChains) {
            const c = supportedChains[name];
            if (c.regex.test(address) && (!c.length || address.length === c.length)) {
                return { valid: true, chain: name };
            }
        }
        return { valid: false };
    }

    const c = supportedChains[chain];
    if (!c) return { valid: false };
    if (c.regex.test(address) && (!c.length || address.length === c.length)) {
        return { valid: true, chain };
    }

    return { valid: false };
}

function getFingerprint(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

let validWalletsGlobal = [];

function validateWalletUI() {
    const input = document.getElementById('walletInput').value.trim();
    const resultEl = document.getElementById('result');
    const statsEl = document.getElementById('stats');
    const selectedChain = document.getElementById('chainSelector').value;

    resultEl.innerHTML = "";
    statsEl.innerHTML = "";

    if (!input) {
        resultEl.innerText = "🤨 Bro... you forgot to paste a wallet.";
        return;
    }

    const addresses = input.split(/\n/).map(a => a.trim()).filter(Boolean);
    let output = "";
    validWalletsGlobal = [];

    let validCount = 0, invalidCount = 0;

    addresses.forEach(addr => {
        const validationResult = validateWallet(addr, selectedChain === "auto" ? null : selectedChain);

        if (validationResult.valid) {
            const chain = supportedChains[validationResult.chain];
            output += `<p>${chain.icon} ${validationResult.chain}: <strong>${getFingerprint(addr)}</strong></p>`;
            validWalletsGlobal.push(addr);
            validCount++;

            // Fetch data only for BSC
            if (validationResult.chain === "BSC") {
                fetchTokenBalances(addr);
                fetchTransactionHistory(addr);
                fetchNftBalance(addr);
            }

            createSparkles(window.innerWidth / 2, window.innerHeight / 2);
        } else {
            output += `<p>❌ Invalid: ${addr.slice(0, 10)}...</p>`;
            invalidCount++;
        }
    });

    statsEl.innerHTML = `
        🧮 Total: <strong>${addresses.length}</strong> |
        ✅ Valid: <strong>${validCount}</strong> |
        ❌ Invalid: <strong>${invalidCount}</strong>
    `;

    resultEl.innerHTML = output;
}

// Proxy helper to bypass CORS during dev
async function fetchWithProxy(url) {
    const proxyUrl = "https://corsproxy.io/?";
    try {
        const response = await fetch(proxyUrl + encodeURIComponent(url));
        return await response.json();
    } catch (e) {
        console.error("Proxy fetch failed", e);
        return null;
    }
}

// ============ TOKEN BALANCE FETCHER (BSC ONLY) ============
async function fetchTokenBalances(address) {
    const tokens = {
        BNB: { name: "BNB", symbol: "BNB", contract: null },
        USDT: { name: "Tether USD", symbol: "USDT", contract: "0x55d32aA5681d79cC3c38Fb4bD4fCCfde1Ad24Ec9" },
        USDC: { name: "USD Coin", symbol: "USDC", contract: "0x8AC76a51cc950d9822D68b93408d48e8d258c7c6" },
        BUSD: { name: "Binance USD", symbol: "BUSD", contract: "0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56" }
    };

    const resultEl = document.getElementById('result');
    resultEl.innerHTML += `<h3 style="margin-top:25px;">💰 Token Balances</h3><ul id="tokenBalanceList"></ul>`;
    const listEl = document.getElementById("tokenBalanceList");

    // Native balance
    const web3 = new Web3("https://bsc-dataseed.binance.org/");
    const balance = await web3.eth.getBalance(address);
    const bnbBalance = web3.utils.fromWei(balance, 'ether');
    listEl.innerHTML += `<li>🟡 BNB: <strong>${parseFloat(bnbBalance).toFixed(5)}</strong></li>`;

    // Token balances
    for (let token in tokens) {
        const t = tokens[token];
        if (!t.contract) continue;

        const url = `https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=${t.contract}&address=${address}`;

        try {
            const data = await fetchWithProxy(url);

            if (data && data.status === "1") {
                const balance = parseInt(data.result) / 1e18;
                listEl.innerHTML += `<li>🔶 ${t.symbol}: <strong>${parseFloat(balance).toFixed(4)}</strong></li>`;
            }
        } catch (e) {
            console.error(`Failed to load balance for ${t.symbol}`, e);
        }
    }
}

// ============ TRANSACTION HISTORY (BSC ONLY) ============
async function fetchTransactionHistory(address) {
    const resultEl = document.getElementById('result');
    resultEl.innerHTML += `<h3 style="margin-top:25px;">🧾 Recent Transactions</h3><ul id="txList"></ul>`;
    const listEl = document.getElementById("txList");

    const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc`;

    try {
        const data = await fetchWithProxy(url);

        if (data && data.status === "1" && data.result.length > 0) {
            data.result.slice(0, 5).forEach(tx => {
                const direction = tx.to.toLowerCase() === address.toLowerCase() ? "📥 Received" : "📤 Sent";
                const value = parseFloat(Web3.utils.fromWei(tx.value, 'ether')).toFixed(5);
                listEl.innerHTML += `<li>🔗 ${direction} <strong>${value} BNB</strong></li>`;
            });
        } else {
            listEl.innerHTML += `<li>No recent transactions found.</li>`;
        }
    } catch (e) {
        console.error("Failed to fetch transaction history", e);
    }
}

// ============ NFT OWNED (BSC ONLY) ============
async function fetchNftBalance(address) {
    const resultEl = document.getElementById('result');
    resultEl.innerHTML += `<h3 style="margin-top:25px;">🖼️ NFTs Owned</h3><ul id="nftList"></ul>`;
    const listEl = document.getElementById("nftList");

    const url = `https://api.bscscan.com/api?module=account&action=tokennfttx&address=${address}&startblock=0&endblock=99999999&sort=desc`;

    try {
        const data = await fetchWithProxy(url);

        if (data && data.status === "1" && data.result.length > 0) {
            const uniqueTokens = {};
            data.result.forEach(nft => {
                const key = `${nft.contractAddress}-${nft.tokenSymbol}`;
                if (!uniqueTokens[key]) {
                    uniqueTokens[key] = nft;
                }
            });

            Object.values(uniqueTokens).slice(0, 5).forEach(nft => {
                listEl.innerHTML += `<li>🖼️ ${nft.tokenSymbol}: <strong>${nft.contractAddress.slice(0, 6)}...${nft.contractAddress.slice(-4)}</strong></li>`;
            });
        } else {
            listEl.innerHTML += `<li>No NFTs found.</li>`;
        }
    } catch (e) {
        console.error("Failed to fetch NFT balance", e);
    }
}

// ============ COPY & EXPORT ============
function copyValidWallets() {
    const text = validWalletsGlobal.join("\n");
    navigator.clipboard.writeText(text).then(() => {
        alert("✅ Copied " + validWalletsGlobal.length + " valid wallet(s)!");
    });
}

function exportToTxt() {
    const blob = new Blob([validWalletsGlobal.join("\n")], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valid_wallets.txt";
    a.click();
    URL.revokeObjectURL(url);
}

function exportToJson() {
    const data = {
        wallets: validWalletsGlobal,
        count: validWalletsGlobal.length,
        timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valid_wallets.json";
    a.click();
    URL.revokeObjectURL(url);
}

function exportToCsv() {
    let csv = "Wallet Address\n" + validWalletsGlobal.map(addr => addr).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "valid_wallets.csv";
    a.click();
    URL.revokeObjectURL(url);
}

// ============ WALLET CONNECT ============
async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert("🚫 No wallet detected... where's your ETH? 😂");
        return;
    }

    try {
        const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
        document.getElementById('walletAddress').innerText = `Connected: ${account}`;
        const web3 = new Web3(window.ethereum);
        const balance = await web3.eth.getBalance(account);
        const ethBalance = web3.utils.fromWei(balance, 'ether');
        document.getElementById('walletBalance').innerText = `💰 Balance: ${parseFloat(ethBalance).toFixed(4)} ETH`;

        createSparkles(window.innerWidth / 2, window.innerHeight / 2);

    } catch (error) {
        console.error("Connection failed", error.message);

        if (error.code === 4001) {
            alert("You rejected the connection request 😒 Let's try again.");
        } else {
            alert("😵 Something went wrong. Try refreshing?");
        }
    }
}

window.connectWallet = connectWallet;

// ============ CONFETTI FUNCTION ============
function createSparkles(x, y) {
    for (let i = 0; i < 20; i++) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = x + 'px';
        sparkle.style.top = y + 'px';
        sparkle.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 70%)`;
        sparkle.style.transform = `scale(${Math.random()})`;
        document.body.appendChild(sparkle);

        const angle = Math.random() * 360;
        const distance = 100 + Math.random() * 100;

        setTimeout(() => {
            sparkle.style.opacity = 0;
            sparkle.style.transform = `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`;
        }, 50);

        setTimeout(() => sparkle.remove(), 1000);
    }
}
