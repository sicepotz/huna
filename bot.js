const { ethers } = require("ethers");
require('dotenv').config(); // Memuat variabel lingkungan dari .env
const fs = require('fs');
const colors = require('colors'); // Memasukkan colors untuk output

// Membaca pengaturan dari file config.json
const config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

// Data koneksi dan transaksi
const provider = new ethers.JsonRpcProvider("https://base.llamarpc.com"); // Masukkan URL RPC Node sesuai kebutuhan
const privateKey = process.env.PRIVATE_KEY; // Mengambil private key dari file .env
const wallet = new ethers.Wallet(privateKey, provider);

// Menampilkan banner ASCII
function displayBanner() {
    console.log(colors.cyan(`
 █████╗ ██╗██████╗ ██████╗ ██████╗  ██████╗ ██████╗      █████╗ ███████╗ ██████╗
██╔══██╗██║██╔══██╗██╔══██╗██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔════╝██╔════╝
███████║██║██████╔╝██║  ██║██████╔╝██║   ██║██████╔╝    ███████║███████╗██║     
██╔══██║██║██╔══██╗██║  ██║██╔══██╗██║   ██║██╔═══╝     ██╔══██║╚════██║██║     
██║  ██║██║██║  ██║██████╔╝██║  ██║╚██████╔╝██║         ██║  ██║███████║╚██████╗
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝         ╚═╝  ╚═╝╚══════╝ ╚═════╝
                                                                                
====================================================
     BOT                : HanaFuda Auto TX 
     Telegram Channel   : @airdropasc
     Telegram Group     : @autosultan_group
====================================================
`));
}

// Fungsi untuk mengecek saldo
async function checkBalance() {
    // Mengecek saldo wallet
    const balance = await provider.getBalance(wallet.address);
    const formattedBalance = ethers.formatEther(balance);
    console.log(colors.blue(`[ASC] Saldo saat ini: ${formattedBalance} ETH`));
    return balance; // Kembalikan saldo yang belum diformat
}

async function depositETH(manualValue) {
    try {
        // Mengubah nilai value dari input ke satuan wei
        const valueInWei = ethers.parseEther(manualValue.toString());

        // Mengecek saldo wallet
        const balance = await checkBalance();

        // Cek apakah saldo mencukupi untuk deposit
        if (balance < valueInWei) {
            console.log(colors.red("[ASC] Saldo tidak mencukupi untuk melakukan deposit."));
            return false; // Menandakan deposit gagal
        }

        // Mendapatkan estimasi gas dan fee
        const gasEstimate = await provider.estimateGas({
            from: wallet.address,
            to: "0xC5bf05cD32a14BFfb705Fb37a9d218895187376c",
            value: valueInWei,
            data: "0xf6326fb3", // Method ID untuk depositETH
        });

        // Mendapatkan gas price terkini
        const feeData = await provider.getFeeData();

        const tx = {
            chainId: 8453,
            from: wallet.address,
            to: "0xC5bf05cD32a14BFfb705Fb37a9d218895187376c",
            value: valueInWei,
            data: "0xf6326fb3", // Method ID untuk depositETH
            gasLimit: gasEstimate, // Estimasi gas
            maxFeePerGas: feeData.maxFeePerGas, // Max fee per gas
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas, // Max priority fee per gas
            nonce: await provider.getTransactionCount(wallet.address, "latest"),
        };

        // Mengirim transaksi
        const transaction = await wallet.sendTransaction(tx);
        console.log(colors.green(`[ASC] Transaksi terkirim! Hash: ${transaction.hash}`));

        // Menunggu konfirmasi
        const receipt = await transaction.wait();
        console.log(colors.green(`[ASC] Transaksi berhasil dengan status: ${receipt.status}`));
        
        return receipt.status === 1; // Menandakan deposit berhasil
    } catch (error) {
        console.error(colors.red("[ASC] Gagal melakukan deposit:", error));
        return false; // Menandakan deposit gagal
    }
}

async function main() {
    displayBanner(); // Menampilkan banner
    const { depositAmount, delayBetweenTransactions } = config;

    // Variabel untuk menghitung status deposit
    let successfulDeposits = 0; // Menghitung deposit berhasil
    let failedDeposits = 0; // Menghitung deposit gagal

    // Meminta input jumlah transaksi
    const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // Tangkap sinyal CTRL + C untuk menghentikan program
    process.on('SIGINT', () => {
        console.log(colors.red("\n[ASC] Program dihentikan. Menghentikan transaksi..."));
        console.log(colors.green(`[SELESAI] Deposit Berhasil: ${successfulDeposits} | Deposit Gagal: ${failedDeposits}`));
        readline.close();
        process.exit(0); // Menghentikan program
    });

    readline.question(colors.yellow("[ASC] Masukkan jumlah transaksi deposit yang ingin dilakukan: "), async (transactionCount) => {
        for (let i = 0; i < transactionCount; i++) {
            const isSuccessful = await depositETH(depositAmount);

            // Menghitung jumlah deposit yang berhasil atau gagal
            if (isSuccessful) {
                successfulDeposits++;
            } else {
                failedDeposits++;
            }

            // Delay antara transaksi
            if (i < transactionCount - 1) {
                console.log(colors.yellow(`[ASC] Menunggu ${delayBetweenTransactions} detik sebelum transaksi berikutnya...`));
                await new Promise(resolve => setTimeout(resolve, delayBetweenTransactions * 1000));
            }
        }
        
        readline.close();
        console.log(colors.yellow(`[SELESAI] Deposit Berhasil: ${successfulDeposits} | Deposit Gagal: ${failedDeposits}`));
    });
}

// Memulai program
checkBalance().then(() => {
    main();
});
