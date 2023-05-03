require('dotenv').config();
const express = require('express');
const app = express();
const { Telegraf, Markup } = require('telegraf');
const axios = require('axios');
const { connectToDatabase, addWatchedAddress, removeWatchedAddress, loadWatchedAddresses } = require('./database');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Serveur fonctionnant sur le port ${PORT}`);
});

async function main () {
    await connectToDatabase();
    watchedAddresses = await loadWatchedAddresses();
}

const API_Key = {
  telegram: process.env.TELEGRAM_API,
  etherscan: process.env.API_ETHERSCAN,
  bscscan: process.env.API_BSCSCAN,
  polygonscan: process.env.API_POLYGONSCAN,
  avalanchescan: process.env.API_AVALANCHESCAN,
  fantomscan: process.env.API_FANTOMSCAN,
  arbitrum: process.env.API_ARBITRUM,
}

let watchedAddresses = {};
let lastCheckedTimestamp = Date.now() / 1000;
const chatStates = {};
const bot = new Telegraf(API_Key.telegram);
main()

function isValidEthereumAddress(address) {
    const regex = /^0x[a-fA-F0-9]{40}$/;
    return regex.test(address);
}

async function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function getPrices() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum%2Cbinancecoin%2Cmatic-network%2Cavalanche-2%2Cfantom&vs_currencies=usd');
    const ethPrice = response.data.ethereum?.usd;
    const bnbPrice = response.data.binancecoin?.usd;
    const maticPrice = response.data["matic-network"]?.usd;
    const avaxPrice = response.data["avalanche-2"]?.usd;
    const ftmPrice = response.data.fantom?.usd

    return {
      ethPrice: ethPrice ?? null,
      bnbPrice: bnbPrice ?? null,
      maticPrice: maticPrice ?? null,
      avaxPrice: avaxPrice ?? null,
      ftmPrice: ftmPrice ?? null
    };
  } catch (error) {
    console.error('Error fetching prices:', error);
    return {
      ethPrice: null,
      bnbPrice: null,
      maticPrice: null,
      avaxPrice: null,
      ftmPrice: null,
    };
  }
}


async function sendMessageWithRetry(userId, message, options = {}, maxRetries = 3) {
    const requestOptions = {
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...options,
    };
  
    for (let i = 0; i < maxRetries; i++) {
      try {
        await bot.telegram.sendMessage(userId, message, requestOptions);
        return;
      } catch (error) {
        if (error.code === 429) {
          const retryAfter = error.parameters.retry_after || 60;
          console.log(`Erreur 429, nouvelle tentative dans ${retryAfter} secondes...`);
          await sleep(retryAfter * 1000);
        } else {
          console.error("Erreur lors de l'envoi du message:", error);
          return;
        }
      }
    }
}
  
async function checkTransactions(addresses) {
    if (!watchedAddresses) {
      return [];
    }
  
    let transactions = [];
  
    for (const address of addresses) {

      const apiUrl = {
        eth: `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_Key.etherscan}`,
        bsc: `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_Key.bscscan}`,
        matic: `https://api.polygonscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_Key.polygonscan}`,
        avax: `https://api.snowtrace.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=${API_Key.avalanchescan}`,
        ftm: `https://api.ftmscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_Key.fantomscan}`,
        arb: `https://api.arbiscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=${API_Key.arbitrum}
        `,

      }

      try {
        const [responseEth, responseBsc, responseMatic, responseAvax, responseFtm, responseArb] = await Promise.all([
            axios.get(apiUrl.eth),
            axios.get(apiUrl.bsc),
            axios.get(apiUrl.matic),
            axios.get(apiUrl.avax),
            axios.get(apiUrl.ftm),
            axios.get(apiUrl.arb)
        ]);

        const transaction = {
            eth: Array.isArray(responseEth.data.result)
            ? responseEth.data.result.map(tx => ({ ...tx, chain: 'Ethereum' }))
            : [],
            bsc: Array.isArray(responseBsc.data.result)
            ? responseBsc.data.result.map(tx => ({ ...tx, chain: 'Binance Smart Chain' }))
            : [],
            matic: Array.isArray(responseMatic.data.result)
            ? responseMatic.data.result.map(tx => ({ ...tx, chain: 'Polygon' }))
            : [],
            avax: Array.isArray(responseAvax.data.result)
            ? responseAvax.data.result.map(tx => ({ ...tx, chain: 'Avalanche' }))
            : [],
            ftm: Array.isArray(responseFtm.data.result)
            ? responseFtm.data.result.map(tx => ({ ...tx, chain: 'Fantom' }))
            : [],
            arb: Array.isArray(responseArb.data.result)
            ? responseArb.data.result.map(tx => ({ ...tx, chain: 'Arbitrum' }))
            : [],
        }
        
        transactions = transactions.concat(transaction.eth, transaction.bsc, transaction.matic, transaction.avax, transaction.ftm, transaction.arb);
      } catch (error) {
        console.error('Error fetching transactions:', error);
      }
    }
  
    const newTransactions = transactions.filter(transaction => {
      const transactionTimestamp = parseInt(transaction.timeStamp);
  
      return transactionTimestamp > lastCheckedTimestamp;
    });
  
    if (newTransactions.length > 0) {
      lastCheckedTimestamp = newTransactions.reduce((max, transaction) => {
        return Math.max(max, parseInt(transaction.timeStamp));
      }, lastCheckedTimestamp);
    }

    return newTransactions;
}

bot.command('start', async (ctx) => {
    ctx.reply(
      'Bienvenue ! Utilisez les boutons ci-dessous pour ajouter, supprimer ou afficher la liste des adresses à surveiller.',
      Markup.inlineKeyboard([
        Markup.button.callback('Add', 'ADD_ADDRESS'),
        Markup.button.callback('Remove', 'REMOVE_ADDRESS'),
        Markup.button.callback('List', 'LIST_ADDRESSES'),
      ]),
    );
});

bot.action('ADD_ADDRESS', (ctx) => {
  const userId = ctx.from.id;
  chatStates[userId] = 'ADDING_ADDRESS';
  ctx.answerCbQuery();
  ctx.reply("Veuillez entrer l'adresse à surveiller, suivie du pseudo souhaité, séparés par un espace. Par exemple : 0x123... Mon adresse");
});

bot.action('REMOVE_ADDRESS', (ctx) => {
  const userId = ctx.from.id;
  chatStates[userId] = 'REMOVING_ADDRESS_NICKNAME';
  ctx.answerCbQuery();
  ctx.reply("Veuillez entrer le pseudo de l'adresse à supprimer.");
});

bot.action('LIST_ADDRESSES', async (ctx) => {
  const userId = ctx.from.id;
  const userAddresses = watchedAddresses[userId] || [];

  if (userAddresses.length === 0) {
    ctx.reply("Vous ne surveillez actuellement aucune adresse.");
  } else {
    const addressList = userAddresses
      .map(({ address, nickname }) => `${nickname} (${address})`)
      .join('\n\n');
    ctx.reply("----------------------\n\nVoici la liste des adresses que vous surveillez :\n\n" + addressList);
  }
  ctx.answerCbQuery();
});

bot.hears(/.*/, async (ctx) => {
  const userId = ctx.message.from.id;
  const messageText = ctx.message.text;
  
  if (chatStates[userId] === 'ADDING_ADDRESS') {
    const [address, ...nicknameParts] = messageText.split(' ');
    const nickname = nicknameParts.join(' ');
    const isNicknameUsed = watchedAddresses[userId]?.some(({ nickname: existingNickname }) => existingNickname === nickname);
    const isAddressUsed = watchedAddresses[userId]?.some(({ address: existingAddress }) => existingAddress.toLowerCase() === address.toLowerCase());

    // Ajoutez une validation pour l'adresse Ethereum
    if (!isValidEthereumAddress(address)) {
      return ctx.reply('Adresse Ethereum invalide. Veuillez réessayer.');
    }
    
    if (isAddressUsed) {
      return ctx.reply("Cette adresse est déjà surveillée. Veuillez utiliser une autre adresse.");
    }

    if (!nickname || nickname.trim() === '') {
      return ctx.reply("Le pseudo ne peut pas être vide. Veuillez entrer un pseudo pour l'adresse.");
    }

    if (isNicknameUsed) {
      return ctx.reply('Ce pseudo est déjà utilisé pour une autre adresse. Veuillez utiliser un autre pseudo.');
    }
    
    if (!watchedAddresses[userId]) {
      watchedAddresses[userId] = [];
    }

    addWatchedAddress(userId, address, nickname)
    watchedAddresses[userId].push({ address, nickname });
    ctx.reply(`Les notifications ont été activées pour l'adresse ${address} avec le pseudo "${nickname}".`);
    chatStates[userId] = null;
    
  } else if (chatStates[userId] === 'REMOVING_ADDRESS_NICKNAME') {
    const nicknameToRemove = messageText;

    if (!watchedAddresses[userId]) {
      return ctx.reply("Vous ne surveillez actuellement aucune adresse.");
    }

    const addressToRemove = watchedAddresses[userId]
      .filter(({ nickname }) => nickname === nicknameToRemove)
      .map(({ address }) => address)[0];

    if (!addressToRemove) {
      ctx.reply("Le pseudo n'est associé à aucune adresse surveillée.");
    } else {
      removeWatchedAddress(userId, nicknameToRemove)
      watchedAddresses[userId] = watchedAddresses[userId].filter(({ nickname }) => nickname !== nicknameToRemove);
      ctx.reply(`L'adresse ${addressToRemove} a été supprimée de la liste des adresses surveillées.`);
      
    }
    chatStates[userId] = null;
  }
});

async function monitorTransactions() {
    while (true) {
      // Récupérer les prix en dollars de l'ETH et du BNB
      const { ethPrice, bnbPrice, maticPrice, avaxPrice, ftmPrice } = await getPrices();
  
      for (const userId in watchedAddresses) {
        const userAddresses = watchedAddresses[userId];
  
        if (userAddresses.length > 0) {
          const addressStrings = userAddresses.map(({ address }) => address);
          const newTransactions = await checkTransactions(addressStrings);
  
          if (newTransactions.length > 0) {
            for (const transaction of newTransactions) {
              const from = transaction.from;
              const to = transaction.to;
              const chain = transaction.chain;
              const matchingAddress = userAddresses.find(
                ({ address }) => address.toLowerCase() === to.toLowerCase() || address.toLowerCase() === from.toLowerCase()
              );
              const nickname = matchingAddress ? matchingAddress.nickname : "Inconnu";
              const address = matchingAddress ? matchingAddress.address : "Inconnu";
              const explorerUrl =
                chain === "Ethereum"
                  ? `https://etherscan.io/address/${address}`
                  : chain === "Binance Smart Chain"
                    ? `https://bscscan.com/address/${address}`
                    : chain === "Polygon"
                      ? `https://polygonscan.com/address/${address}`
                      : chain === "Avalanche"
                        ? `https://snowtrace.io/address/${address}`
                        : chain === "Fantom"
                          ? `https://ftmscan.com/address/${address}`
                          : `https://arbiscan.io/address/${address}`
  
              const txExplorerUrl =
                chain === "Ethereum"
                  ? `https://etherscan.io/tx/${transaction.hash}`
                  : chain === "Binance Smart Chain"
                    ? `https://bscscan.com/tx/${transaction.hash}`
                    : chain === "Polygon"
                      ? `https://polygonscan.com/tx/${transaction.hash}`
                      : chain === "Avalanche"
                        ? `https://snowtrace.io/tx/${transaction.hash}`
                        : chain === "Fantom"
                        ? `https://ftmscan.com/tx/${transaction.hash}`
                        : `https://arbiscan.io/tx/${transaction.hash}`
  
  
              const valueInWei = BigInt(transaction.value);
              const valueInEther = Number(valueInWei) / 1e18;
              let valueInDollars;
  
              if (chain === 'Ethereum') {
                valueInDollars = ethPrice * valueInEther;
              } else if (chain === 'Binance Smart Chain') {
                valueInDollars = bnbPrice * valueInEther;
              } else if (chain === 'Polygon') {
                valueInDollars = maticPrice * valueInEther
              } else if (chain === 'Avalanche') {
                valueInDollars = avaxPrice * valueInEther
              } else if (chain === 'Fantom') {
                valueInDollars = ftmPrice * valueInEther
              } else if (chain === 'Arbitrum') {
                valueInDollars = ethPrice * valueInEther
              } else {
                valueInDollars = null;
              }

              const formattedValueInDollars = valueInDollars && valueInDollars.toFixed(2) > 0 ? `  Montant : $${valueInDollars.toFixed(2)}` : '';
              
              const message = `----------------------\n\n<a href="${explorerUrl}">${nickname}</a>\n\n<a href="${txExplorerUrl}">Tx Hash</a>${formattedValueInDollars}\nBlockchain: ${chain}`;
              await sendMessageWithRetry(userId, message, {
                parse_mode: "HTML",
              });
            }
          }
        }
      }
  
      await sleep(10000); // Attendre 10 secondes
    }
}

bot.launch();
monitorTransactions();
