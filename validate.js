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

// ============ WALLET CONNECT ============
let web3;
let currentAccount;

async function connectWallet() {
    if (typeof window.ethereum === 'undefined') {
        alert("MetaMask not found. Please install it.");
        return;
    }

    try {
        const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
        currentAccount = accounts[0];
        document.getElementById('walletAddress').innerText = "Connected: " + currentAccount;

        web3 = new Web3(window.ethereum);
        const balance = await web3.eth.getBalance(currentAccount);
        const ethBalance = web3.utils.fromWei(balance, 'ether');
        document.getElementById('walletBalance').innerText = `💰 Balance: ${parseFloat(ethBalance).toFixed(4)} ETH`;

    } catch (error) {
        console.error("User denied account access", error);
        alert("You need to allow MetaMask access.");
    }
}

// Attach to global scope so HTML buttons can use it
window.connectWallet = connectWallet;
