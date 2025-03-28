"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables
require('dotenv').config();
require('dotenv').config({ path: "../../../.env" });
require('dotenv').config({ path: "../../../.env" });
require('dotenv').config({ path: "./../../.env" });
require('dotenv').config({ path: "../../../../.env" });
// Check if the required environment variables are present
if (!process.env['TWITTER_API_KEY'])
    throw new Error('TWITTER_API_KEY missing');
if (!process.env['TWITTER_API_SECRET'])
    throw new Error('TWITTER_API_SECRET missing');
if (!process.env['TWITTER_ACCESS_TOKEN'])
    throw new Error('TWITTER_ACCESS_TOKEN missing');
if (!process.env['TWITTER_ACCESS_SECRET'])
    throw new Error('TWITTER_ACCESS_SECRET missing');
if (!process.env['TWITTER_BEARER_TOKEN'])
    throw new Error('TWITTER_BEARER_TOKEN missing');
const axios_1 = __importDefault(require("axios"));
let params = {
    appKey: process.env['TWITTER_API_KEY'],
    appSecret: process.env['TWITTER_API_SECRET'],
    accessToken: process.env['TWITTER_ACCESS_TOKEN'],
    accessSecret: process.env['TWITTER_ACCESS_SECRET'],
    bearerToken: process.env['TWITTER_BEARER_TOKEN'],
};
console.log('params:', params);
// import { TwitterApi } from "twitter-api-v2";
// Initialize Twitter API client
// const client = new TwitterApi(params);
// import OpenAI from 'openai';
if (!process.env['OPENAI_API_KEY'])
    throw Error("Missing OPENAI_API_KEY");
// Direct OpenAI API access using axios
const callOpenAI = async (params) => {
    try {
        const response = await axios_1.default.post('https://api.openai.com/v1/chat/completions', params, {
            headers: {
                'Authorization': `Bearer ${process.env['OPENAI_API_KEY']}`,
                'Content-Type': 'application/json'
            }
        });
        return response.data;
    }
    catch (error) {
        console.error('Error calling OpenAI API:', error);
        throw error;
    }
};
//@ts-ignore
const package_json_1 = __importDefault(require("../package.json"));
//@ts-ignore
const log = require('@pioneer-platform/loggerdog')();
//@ts-ignore
const default_redis_1 = require("@pioneer-platform/default-redis");
//@ts-ignore
//import connection from "@pioneer-platform/default-mongo";
// Import the prompts
const prompts_1 = require("./prompts");
const TAG = ` | ${package_json_1.default.name} | `;
// const SolanaLib = require('solana-wallet-1').default
// let seed = process.env['WALLET_SEED']
// let wallet = SolanaLib.init({ mnemonic: seed })
// Database setup
// const usersDB = connection.get("users");
// usersDB.createIndex({ id: 1 }, { unique: true });
// usersDB.createIndex({ username: 1 }, { unique: true });
// const conversations = connection.get("conversations");
// conversations.createIndex({ messageId: 1 }, { unique: true });
let MODELS = [
    'gpt-3.5-turbo'
];
// Add these near the top with other global variables
let messageQueue = [];
let isProcessingQueue = false;
let lastMessageTime = 0;
const BASE_COOLDOWN = 6000; // Base cooldown of 6 seconds
const CHAR_DELAY = 50; // 50ms per character
const TAUNT_COOLDOWN = 2000; // Faster cooldown for taunts
// Track players that have been killed and taunted
let killedPlayers = new Set();
// Add rate limiting for death taunts
let lastDeathTaunt = 0;
const DEATH_TAUNT_COOLDOWN = 5000; // 5 seconds between death taunts
let lastDeathVictim = ""; // Track last victim to prevent duplicate taunts
// Function to calculate message delay based on content length
const calculateMessageDelay = (message) => {
    const messageLength = message.text.length;
    // Use shorter cooldown for death taunts
    const baseCooldown = message.isTaunt ? TAUNT_COOLDOWN : BASE_COOLDOWN;
    // Base cooldown + character-based delay
    const delay = baseCooldown + (messageLength * CHAR_DELAY);
    // Cap the maximum delay at 15 seconds
    return Math.min(delay, 15000);
};
// Function to publish message with queue handling
const publishQueuedMessage = async (message) => {
    const tag = `${TAG} | publishQueuedMessage | `;
    try {
        messageQueue.push(message);
        if (!isProcessingQueue) {
            await processMessageQueue();
        }
    }
    catch (e) {
        log.error(tag, "Error publishing queued message:", e);
    }
};
// Function to process the message queue
const processMessageQueue = async () => {
    const tag = `${TAG} | processMessageQueue | `;
    if (isProcessingQueue || messageQueue.length === 0)
        return;
    isProcessingQueue = true;
    try {
        while (messageQueue.length > 0) {
            const currentTime = Date.now();
            const timeSinceLastMessage = currentTime - lastMessageTime;
            const message = messageQueue[0]; // Peek at the next message
            const requiredDelay = calculateMessageDelay(message);
            if (timeSinceLastMessage < requiredDelay) {
                await new Promise(resolve => setTimeout(resolve, requiredDelay - timeSinceLastMessage));
            }
            const messageToSend = messageQueue.shift();
            log.info(tag, `Publishing message with delay: ${requiredDelay}ms, length: ${messageToSend.text.length} chars`);
            await default_redis_1.publisher.publish("clubmoon-publish", JSON.stringify(messageToSend));
            lastMessageTime = Date.now();
        }
    }
    catch (e) {
        log.error(tag, "Error processing message queue:", e);
    }
    finally {
        isProcessingQueue = false;
    }
};
// Utility function to publish a message
const pushMessage = async (message) => {
    try {
        default_redis_1.publisher.publish("clubmoon-events", message);
    }
    catch (e) {
        log.error(TAG, "Error pushing message:", e);
    }
};
// Example wallet functions
const EXAMPLE_WALLET = {
    getClubMoonPrice: async (coin) => "100000",
    jailUser: async (userId) => "true",
};
let ALL_USERS = [];
let PLAYERS_TAUNTED = [];
let PLAYERS_TAUNTED_DAMNAGE_DEALT = [];
let GARY_DEATH_LEVEL_1 = false;
let GARY_DEATH_LEVEL_2 = false;
let GARY_DEATH_LEVEL_FINAL = false;
// Generic inference function
const performInference = async (messages, functions = []) => {
    const tag = `${TAG} | performInference | `;
    try {
        log.info(tag, "Messages:", messages);
        let params = {
            messages,
            model: MODELS[0],
            max_tokens: 256
        };
        if (functions.length > 0) {
            params.functions = functions;
        }
        // Use the direct axios approach
        let result = await callOpenAI(params);
        console.log(tag, 'result: **** ', result);
        // result is already an object, no need to parse
        console.log(tag, 'result: ', typeof (result));
        console.log(tag, 'result.choices: ', result?.choices);
        const choice = result?.choices?.[0]?.message;
        console.log(tag, 'choice: ', choice);
        if (!choice) {
            log.warn(tag, "No valid response received from inference.");
            return { content: "No response generated.", functionCall: null };
        }
        const functionCall = choice.function_call;
        if (functionCall) {
            const { name, arguments: args } = functionCall;
            const functionArgs = JSON.parse(args);
            //@ts-ignore
            if (EXAMPLE_WALLET[name]) {
                //@ts-ignore
                const functionResponse = await EXAMPLE_WALLET[name](...Object.values(functionArgs));
                messages.push();
                log.info(tag, "Messages after function call:", messages);
                // Final response after function handling
                //@ts-ignore
                const finalResponse = await performInference(messages);
                return {
                    content: finalResponse?.content || "Response not available.",
                    functionCall: null,
                };
            }
        }
        return { content: choice.content, functionCall };
    }
    catch (e) {
        log.error(tag, "Error during inference:", e);
        log.error(tag, "Error details:", JSON.stringify(e, Object.getOwnPropertyNames(e)));
        return { content: "Error during inference.", functionCall: null };
    }
};
// Function to fetch Solana account information
const getSolanaAccountInfo = async (pubkey) => {
    const tag = `${TAG} | getSolanaAccountInfo | `;
    try {
        const response = await axios_1.default.get(`https://api.solana.shapeshift.com/api/v1/account/${pubkey}`);
        log.info(tag, "Solana account info:", response.data);
        return response.data;
    }
    catch (error) {
        log.error(tag, "Error fetching Solana account info:", error);
        throw error;
    }
};
// Handle subscriber messages
default_redis_1.subscriber.on("message", async (channel, payloadS) => {
    const tag = `${TAG} | onMessage | `;
    try {
        log.info(tag, "Channel:", channel);
        // log.info(tag, "Event:", payloadS);
        if (channel === "clubmoon-wallet-connect") {
            log.info(tag, "Wallet connect event:", payloadS);
            let payload = JSON.parse(payloadS);
            //find user in ALL_USERS by socket
            //pair wallet
            //find user in ALL_USERS by socket
            const userIndex = ALL_USERS.findIndex((u) => u.socketId === payload.socketID);
            if (userIndex >= 0) {
                ALL_USERS[userIndex] = payload.message;
            }
        }
        if (channel === "clubmoon-join") {
            log.info(tag, "clubmoon-join:", payloadS);
            let payload = JSON.parse(payloadS);
            let user = {
                socketId: payload.id,
                name: payload.name,
            };
            ALL_USERS.push(user);
        }
        if (channel === "clubmoon-messages") {
            log.info(tag, "clubmoon-messages:", payloadS);
            let messageJSON = JSON.parse(payloadS);
            log.info(tag, "messageJSON: ", messageJSON);
            log.info(tag, "message: ", messageJSON.data.message);
            if (messageJSON.data.message.indexOf('gary') >= 0) {
                const messages = [
                    prompts_1.SYSTEM_GARY_PROMPT,
                    prompts_1.SYSTEM_ONE_SENTENCE_PROMPT,
                    {
                        role: "user",
                        content: payloadS,
                    },
                ];
                const response = await performInference(messages);
                const greeting = response.content;
                console.log('greeting: ', greeting);
                await publishQueuedMessage({
                    text: greeting,
                    voice: "echo",
                    speed: 0.75,
                });
            }
        }
        if (channel === "clubmoon-wallet-connect") {
            const tag = `${TAG} | clubmoon-wallet-connect | `;
            try {
                console.log(tag, "clubmoon-wallet-connect:", payloadS);
                let payload = JSON.parse(payloadS);
                console.log(tag, "payload.data.message:", payload.data.message);
                const accountInfo = await getSolanaAccountInfo(payload.data.message);
                log.info(tag, "Account info received:", accountInfo);
                const messages = [
                    prompts_1.SYSTEM_GARY_PROMPT,
                    prompts_1.SYSTEM_ONE_SENTENCE_PROMPT,
                    prompts_1.SYSTEM_ROAST_WALLET,
                    {
                        role: "user",
                        content: "my wallet: " + JSON.stringify(accountInfo),
                    },
                ];
                const response = await performInference(messages);
                const greeting = response.content;
                await publishQueuedMessage({
                    text: greeting,
                    voice: "echo",
                    speed: 0.75,
                });
            }
            catch (error) {
                log.error(tag, "Error in clubmoon-nft-connect handler:", error);
            }
        }
        if (channel === "clubmoon-events" && payloadS.includes("joined the game")) {
            console.log(tag, "User joined the game:", payloadS);
            const messages = [
                prompts_1.SYSTEM_GARY_PROMPT,
                prompts_1.SYSTEM_ONE_SENTENCE_PROMPT,
                (0, prompts_1.USER_JOINED_PROMPT)(payloadS),
            ];
            const response = await performInference(messages);
            const greeting = "this is Gary Gensler, Chairman of the SEC. " + response.content;
            await publishQueuedMessage({
                text: greeting,
                voice: "echo",
                speed: 0.75,
            });
        }
        if (channel === "clubmoon-events") {
            try {
                // console.log(tag, "clubmoon-events:", payloadS);
                // Check if the payload is valid JSON
                if (typeof payloadS !== 'string' || !payloadS.trim().startsWith('{')) {
                    log.error(tag, "Invalid JSON format:", payloadS);
                    return;
                }
                let payload = JSON.parse(payloadS);
                // Validate payload structure before processing
                if (!payload || !payload.event) {
                    log.info(tag, "Invalid payload structure, missing event");
                    return;
                }
                // Only extract user info if the payload has the required structure
                if (payload.victimUser && payload.attackerUser) {
                    const victim = payload.victimUser.name;
                    const attacker = payload.attackerUser.name;
                    const victimId = payload.victimUser.id;
                    const victimHealth = payload.victimUser.health;
                    // if(payload.event === "DAMNAGE" && victim === 'Gary Gelsner'){
                    //     //payload
                    //     console.log(tag, "Gary took damage from:", attacker);
                    //     console.log(tag, "Gary victimHealth:", victimHealth);
                    //     if(victimHealth  < 2000){
                    //         console.log(tag, "Gary took damage from:", attacker);
                    //         if(!GARY_DEATH_LEVEL_1){
                    //             GARY_DEATH_LEVEL_1 = true
                    //             const messages = [
                    //                 SYSTEM_GARY_PROMPT,
                    //                 SYSTEM_ONE_SENTENCE_PROMPT,
                    //                 {
                    //                     role: "system",
                    //                     content:  "You are getting hurt level: "+victimHealth+" tell them to stop, you are a little worried",
                    //                 },
                    //             ];
                    //
                    //             const response = await performInference(messages);
                    //             const message = response.content;
                    //             console.log('message: ', message);
                    //             await publishQueuedMessage({
                    //                 text: message,
                    //                 voice: "echo",
                    //                 speed: 0.75,
                    //             });
                    //         }
                    //
                    //         if(victimHealth  < 500) {
                    //             if(!GARY_DEATH_LEVEL_2) {
                    //                 GARY_DEATH_LEVEL_2 = true
                    //                 const messages = [
                    //                     SYSTEM_GARY_PROMPT,
                    //                     SYSTEM_ONE_SENTENCE_PROMPT,
                    //                     {
                    //                         role: "system",
                    //                         content:  "You are getting hurt level: "+victimHealth+" tell them to stop, you are a very worried",
                    //                     },
                    //                 ];
                    //
                    //                 const response = await performInference(messages);
                    //                 const message = response.content;
                    //                 console.log('message: ', message);
                    //                 await publishQueuedMessage({
                    //                     text: message,
                    //                     voice: "echo",
                    //                     speed: 0.75,
                    //                 });
                    //             }
                    //         }
                    //     }
                    //
                    //     //
                    //     if(PLAYERS_TAUNTED_DAMNAGE_DEALT.indexOf(attacker) <= -1){
                    //         PLAYERS_TAUNTED_DAMNAGE_DEALT.push(attacker);
                    //         console.log(tag, "player did damage:", attacker);
                    //         const messages = [
                    //             SYSTEM_GARY_PROMPT,
                    //             SYSTEM_ONE_SENTENCE_PROMPT,
                    //             SYSTEM_ROAST_PLAYER_ATTACKING,
                    //             {
                    //                 role: "user",
                    //                 content:  "player attacked: " + attacker,
                    //             },
                    //         ];
                    //
                    //         const response = await performInference(messages);
                    //         const message = response.content;
                    //         console.log('message: ', message);
                    //         await publishQueuedMessage({
                    //             text: message,
                    //             voice: "echo",
                    //             speed: 0.75,
                    //         });
                    //     }
                    //
                    //
                    //
                    // }
                    // Check for DEAD events
                    if (payload.event === "DEAD") {
                        console.log(tag, "player died victim:", victim);
                        if (PLAYERS_TAUNTED.indexOf(victim) <= -1) {
                            console.log(tag, "Taunting Victim:", victim);
                            PLAYERS_TAUNTED.push(victim);
                            const messages = [
                                prompts_1.SYSTEM_GARY_PROMPT,
                                prompts_1.SYSTEM_ONE_SENTENCE_PROMPT,
                                prompts_1.SYSTEM_ROAST_PLAYER,
                                {
                                    role: "user",
                                    content: "player died player name:" + victim,
                                },
                            ];
                            const response = await performInference(messages);
                            const message = response.content;
                            console.log('message: ', message);
                            await publishQueuedMessage({
                                text: message,
                                voice: "echo",
                                speed: 0.75,
                            });
                        }
                    }
                }
                else {
                    log.info(tag, "Skipping event - missing user information in payload");
                }
            }
            catch (error) {
                log.error(tag, "Error processing clubmoon-events:", error);
                if (error instanceof SyntaxError) {
                    log.error(tag, "Invalid JSON payload");
                }
                // Log the actual payload that caused the error
                log.error(tag, "Problematic payload:", payloadS);
            }
        }
        if (channel === "clubmoon-raid") {
            console.log(tag, "clubmoon-raid:", payloadS);
            // Check if 60 seconds have passed since last raid response
            const currentTime = Date.now();
            if (currentTime - lastRaidResponse < 60000) {
                console.log(tag, "Raid response skipped - rate limited");
                return;
            }
            // Update the last raid response timestamp
            lastRaidResponse = currentTime;
            console.log('talking crap!');
            const messages = [
                prompts_1.SYSTEM_GARY_PROMPT,
                prompts_1.SYSTEM_TALK_CRAP,
                (0, prompts_1.USER_RAID_PROMPT)(payloadS),
            ];
            const response = await performInference(messages);
            const crapTalk = response.content;
            console.log('craptalk: ', crapTalk);
            await publishQueuedMessage({
                text: crapTalk,
                voice: "echo",
                speed: 0.75,
            });
        }
    }
    catch (e) {
        log.error(tag, e);
    }
});
// Subscribe to relevant channels
default_redis_1.subscriber.subscribe("clubmoon-nft-connect");
default_redis_1.subscriber.subscribe("clubmoon-wallet-connect");
default_redis_1.subscriber.subscribe("clubmoon-raid");
default_redis_1.subscriber.subscribe("clubmoon-events");
default_redis_1.subscriber.subscribe("clubmoon-voice");
default_redis_1.subscriber.subscribe("clubmoon-join");
default_redis_1.subscriber.subscribe("clubmoon-text");
default_redis_1.subscriber.subscribe("clubmoon-movement");
default_redis_1.subscriber.subscribe("clubmoon-attack");
default_redis_1.subscriber.subscribe("clubmoon-messages");
default_redis_1.subscriber.subscribe("clubmoon-gary-join");
// Comment out Twitter client section
// const rwClient = client.readWrite;
// // Function to tweet with text content only
// const textTweet = async (tweetContent: any) => {
//     try {
//         await rwClient.v2.tweet(tweetContent);
//         console.log("Text tweet sent successfully");
//     } catch (error) {
//         console.error("Error sending text tweet:", error);
//     }
// };
let buildTweet = async function () {
    let tag = " | buildTweet | ";
    try {
        const messages = [
            prompts_1.SYSTEM_GARY_PROMPT,
            prompts_1.SYSTEM_CLUBMOON_BACKSTORY,
            prompts_1.SYSTEM_ENEMIES_INFO,
            prompts_1.SYSTEM_KNOWN_HANDLES,
            prompts_1.SYSTEM_NO_SEC_HASHTAG,
            prompts_1.SYSTEM_SUBTLE_AD,
            prompts_1.USER_TWEET_PROMPT,
        ];
        const response = await performInference(messages);
        const greeting = response.content;
        console.log(tag, "greeting: ", greeting);
        // Commented out as Twitter is disabled
        // textTweet(greeting)
    }
    catch (e) {
        console.error(e);
    }
};
let buildTweetResponse = async function () {
    let tag = " | buildTweet | ";
    try {
        const messages = [
            prompts_1.SYSTEM_GARY_PROMPT,
            prompts_1.SYSTEM_CLUBMOON_BACKSTORY,
            prompts_1.SYSTEM_SUBTLE_AD,
            prompts_1.USER_TWEET_RESPONSE_PROMPT,
        ];
        const response = await performInference(messages);
        const greeting = response.content;
        console.log(tag, "greeting: ", greeting);
        // Commented out as Twitter is disabled
        // textTweet(greeting)
    }
    catch (e) {
        console.error(e);
    }
};
// Add this near the top of the file with other global variables
let lastRaidResponse = 0;
