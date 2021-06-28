const NicehashJS = require('./lib/api.js')
const Discord = require('discord.js');
const { default: axios } = require('axios');
const client = new Discord.Client();
const moment = require('moment-timezone');
const { get } = require('request');

const botToken = ''

const apiKey = ''
const apiSecret = ''
const organizationId = ''

const nhClient = new NicehashJS({
    apiKey,
    apiSecret,
    organizationId
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("message", async message => {
    var args = message.content.substring(1).split(" ");
    if (message.author.bot) return;

    if (message.content.startsWith("-stats")) {
        getRigs(message)
    }
    if (message.content.startsWith("-bal") || message.content.startsWith("-balance")) {
        getBalance(message)
    }
    if (message.content.startsWith("-rig")) {
        rigStats(args[1], message)
    }
    if (message.content.startsWith("-downalert")) {
        rigStats(args[1], message)
    }
})

async function getRigs(message) {
    const rawResponse = await nhClient.getMiningRigs()
    const data = rawResponse.data

    var stats = {
        totalRigs: data.totalRigs,
        unpaid: data.unpaidAmount,
        lastPayout: data.lastPayoutTimestamp,
        nextPayout: data.nextPayoutTimestamp,
        minerStatus: {
            offline: 0,
            mining: 0,
            stopped: 0
        },
        availableMiners: []
    }

    if (data.minerStatuses.hasOwnProperty('OFFLINE')) {
        stats.minerStatus.offline = data.minerStatuses.OFFLINE
    }
    if (data.minerStatuses.hasOwnProperty('MINING')) {
        stats.minerStatus.mining = data.minerStatuses.MINING
    }
    if (data.minerStatuses.hasOwnProperty('STOPPED')) {
        stats.minerStatus.stopped = data.minerStatuses.STOPPED
    }

    for (i in data.miningRigs) {
        stats.availableMiners.push({
            rigName: data.miningRigs[i].name
        })
    }

    await axios.get('https://api.coindesk.com/v1/bpi/currentprice/myr.json')
        .then(resp => {
            stats.unpaid = {
                "BTC": data.unpaidAmount,
                "USD": (data.unpaidAmount * resp.data.bpi.USD.rate_float),
                "MYR": (data.unpaidAmount * resp.data.bpi.MYR.rate_float)
            }
            stats.profitability = {
                "BTC": data.totalProfitability,
                "USD": (data.totalProfitability * resp.data.bpi.USD.rate_float),
                "MYR": (data.totalProfitability * resp.data.bpi.MYR.rate_float)
            }
        })

    var embed = {
        "title": `Mining Stats`,
        "url": `https://www.nicehash.com/my/mining/stats`,
        "color": 0,
        "footer": {
            "text": moment.tz('Asia/Kuala_Lumpur').format("HH:mm:ss") + " MYT"
        },
        "fields": [
            {
                "name": "Profitability (24hr)",
                "value": `BTC ${stats.profitability.BTC.toFixed(8)}\nUSD ${stats.profitability.USD.toFixed(2)}\nMYR ${stats.profitability.MYR.toFixed(2)}`,
                "inline": true
            },
            {
                "name": "Unpaid Amount",
                "value": `BTC ${parseFloat(stats.unpaid.BTC).toFixed(8)}\nUSD ${parseFloat(stats.unpaid.USD).toFixed(2)}\nMYR ${parseFloat(stats.unpaid.MYR).toFixed(2)}`,
                "inline": true
            },
            //formatting
            {
                "name": "\u200b",
                "value": `\u200b`,
                "inline": true
            },
            {
                "name": "Last Payout",
                "value": moment.tz(stats.lastPayout, 'Asia/Kuala_Lumpur').format("HH:mm:ss a"),
                "inline": true
            },
            {
                "name": "Next Payout",
                "value": moment.tz(stats.nextPayout, 'Asia/Kuala_Lumpur').format("HH:mm:ss a"),
                "inline": true
            },
            //formatting
            {
                "name": "\u200b",
                "value": `\u200b`,
                "inline": true
            },
            {
                "name": "Available Miners",
                "value": `${stats.availableMiners.map((a) => a.rigName).join('\n')}`,
                "inline": true
            },
            {
                "name": "Miner Status",
                "value": `Mining: ${stats.minerStatus.mining}\nStopped: ${stats.minerStatus.stopped}\nOffline: ${stats.minerStatus.offline}`,
                "inline": true
            }
        ]
    }

    message.channel.send({ embed })
}

async function getBalance(message) {
    const rawResponse = await nhClient.getWallet('BTC')
    const data = rawResponse.data

    var wallet = {}

    await axios.get('https://api.coindesk.com/v1/bpi/currentprice/myr.json')
        .then(resp => {
            wallet.balance = {
                "BTC": data.available,
                "USD": (data.available * resp.data.bpi.USD.rate_float),
                "MYR": (data.available * resp.data.bpi.MYR.rate_float)
            }
        })

    var embed = {
        "title": `BTC Wallet Balance`,
        "url": `https://www.nicehash.com/my/wallets/`,
        "color": 0,
        "thumbnail": {
            "url": "https://assets.coingecko.com/coins/images/1/large/bitcoin.png"
        },
        "footer": {
            "text": moment.tz('Asia/Kuala_Lumpur').format("HH:mm:ss") + " MYT"
        },
        "fields": [
            {
                "name": "Balance",
                "value": `BTC ${parseFloat(wallet.balance.BTC).toFixed(8)}\nUSD ${parseFloat(wallet.balance.USD).toFixed(2)}\nMYR ${parseFloat(wallet.balance.MYR).toFixed(2)}`
            }
        ]
    }

    message.channel.send({ embed })
}

async function rigStats(rigName, message) {
    const rawResponse = await nhClient.getMiningRigs()
    const data = rawResponse.data.miningRigs
    var stats

    for (i in data) {
        if (data[i].name == rigName) {
            rig = {
                id: data[i].rigId,
                rigName: data[i].name,
                status: data[i].minerStatus,
                unpaid: data[i].unpaidAmount,
                profitability: parseFloat(data[i].profitability).toFixed(8),
                stats: []
            }

            await axios.get('https://api.coindesk.com/v1/bpi/currentprice/myr.json')
                .then(resp => {
                    rig.profitability = {
                        "BTC": data[i].profitability,
                        "USD": parseFloat(data[i].profitability * resp.data.bpi.USD.rate_float).toFixed(2),
                        "MYR": parseFloat(data[i].profitability * resp.data.bpi.MYR.rate_float).toFixed(2)
                    }
                })

            if (rig.status !== 'OFFLINE') {
                for (x in data[i].devices) {
                    if (data[i].devices[x].status.enumName == 'DISABLED') {
                        rig.stats.push({
                            gpu: data[i].devices[x].name,
                            status: data[i].devices[x].status.enumName,
                            temp: '-',
                            load: '-',
                            power: '-',
                            hashrate: '-',
                            algo: '-'
                        })
                    }
                    else {
                        rig.stats.push({
                            gpu: data[i].devices[x].name,
                            status: data[i].devices[x].status.enumName,
                            temp: parseFloat(data[i].devices[x].temperature % 65536).toFixed(0) + '°C',
                            load: parseFloat(data[i].devices[x].load / 65536).toFixed(0) + '%',
                            power: `${data[i].devices[x].powerUsage}W`,
                            hashrate: parseFloat(data[i].devices[x].speeds[0].speed).toFixed(2) + data[i].devices[x].speeds[0].displaySuffix,
                            algo: data[i].devices[x].speeds[0].algorithm
                        })
                    }
                }
            }

            stats = rig
        }
    }

    console.log(stats)

    var embed = {
        "title": `Rig Stats`,
        "url": `https://www.nicehash.com/my/mining/rigs/${stats.id}`,
        "color": 0,
        "footer": {
            "text": moment.tz('Asia/Kuala_Lumpur').format("HH:mm:ss") + " MYT"
        },
        "fields": [
            {
                "name": "Rig Name",
                "value": `${stats.rigName}`,
                "inline": true
            },
            {
                "name": "Rig ID",
                "value": `${stats.id}`,
                "inline": true
            },
            {
                "name": "Status",
                "value": `${stats.status}`
            },
            {
                "name": "Profitability",
                "value": `BTC ${parseFloat(stats.profitability.BTC).toFixed(8)}\nUSD ${parseFloat(stats.profitability.USD).toFixed(2)}\nMYR ${parseFloat(stats.profitability.MYR).toFixed(2)}`
            }
        ]
    }

    for (i in stats.stats) {
        embed.fields.push({
            "name": `GPU: ${stats.stats[i].gpu}`,
            "value": `\`\`\`Status: ${stats.stats[i].status}\nTemperature: ${stats.stats[i].temp}\nLoad: ${stats.stats[i].load}\nPower: ${stats.stats[i].power}\nHashrate: ${stats.stats[i].hashrate}\nAlgorithm: ${stats.stats[i].algo}\`\`\``,
            "inline": true
        })
    }

    message.channel.send({ embed })
}

client.login(botToken)
