// Load environment variables
require('dotenv').config()
require('dotenv').config({path:"../../../.env"})
require('dotenv').config({path:"../../../.env"})
require('dotenv').config({path:"./../../.env"})
require('dotenv').config({path:"../../../../.env"})

// Check if the required environment variables are present
if (!process.env['TWITTER_API_KEY']) throw new Error('TWITTER_API_KEY missing');
if (!process.env['TWITTER_API_SECRET']) throw new Error('TWITTER_API_SECRET missing');
if (!process.env['TWITTER_ACCESS_TOKEN']) throw new Error('TWITTER_ACCESS_TOKEN missing');
if (!process.env['TWITTER_ACCESS_SECRET']) throw new Error('TWITTER_ACCESS_SECRET missing');
if (!process.env['TWITTER_BEARER_TOKEN']) throw new Error('TWITTER_BEARER_TOKEN missing');

let params = {
    appKey: process.env['TWITTER_API_KEY'],
    appSecret: process.env['TWITTER_API_SECRET'],
    accessToken: process.env['TWITTER_ACCESS_TOKEN'],
    accessSecret: process.env['TWITTER_ACCESS_SECRET'],
    bearerToken: process.env['TWITTER_BEARER_TOKEN'],
}
console.log('params:', params);

import { TwitterApi } from "twitter-api-v2";
// Initialize Twitter API client
const client = new TwitterApi(params);

import ai from "@pioneer-platform/pioneer-openai/lib";
import dotenv from "dotenv";
//@ts-ignore
import packageInfo from "../package.json";
//@ts-ignore
const log = require('@pioneer-platform/loggerdog')()
//@ts-ignore
import { subscriber, publisher } from "@pioneer-platform/default-redis";
//@ts-ignore
import queue from "@pioneer-platform/redis-queue";
//@ts-ignore
import connection from "@pioneer-platform/default-mongo";

// Import the prompts
import {
    SYSTEM_GARY_PROMPT,
    SYSTEM_ONE_SENTENCE_PROMPT,
    SYSTEM_CLUBMOON_BACKSTORY,
    SYSTEM_ENEMIES_INFO,
    SYSTEM_KNOWN_HANDLES,
    SYSTEM_NO_SEC_HASHTAG,
    SYSTEM_SUBTLE_AD,
    USER_JOINED_PROMPT,
    USER_TWEET_PROMPT,
    USER_TWEET_RESPONSE_PROMPT
} from './prompts';

const TAG = ` | ${packageInfo.name} | `;

// const SolanaLib = require('solana-wallet-1').default
// let seed = process.env['WALLET_SEED']
// let wallet = SolanaLib.init({ mnemonic: seed })

// Database setup
const usersDB = connection.get("users");
usersDB.createIndex({ id: 1 }, { unique: true });
usersDB.createIndex({ username: 1 }, { unique: true });

const conversations = connection.get("conversations");
conversations.createIndex({ messageId: 1 }, { unique: true });

// Utility function to publish a message
const pushMessage = async (message: string) => {
    try {
        publisher.publish("clubmoon-events", message);
    } catch (e) {
        log.error(TAG, "Error pushing message:", e);
    }
};

// Example wallet functions
const EXAMPLE_WALLET = {
    getClubMoonPrice: async (coin: any) => "100000",
    jailUser: async (userId: any) => "true",
};

let ALL_USERS:any = []

// Generic inference function
const performInference = async (messages: any[], functions: any[] = []) => {
    const tag = `${TAG} | performInference | `;
    try {
        log.info(tag, "Messages:", messages);

        //@ts-ignore
        const result = await ai.inference(messages, functions);
        const choice = result?.choices?.[0]?.message;

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
                messages.push({
                    role: "assistant",
                    content: `The response for ${name} is ${functionResponse} with arguments ${JSON.stringify(functionArgs)}`,
                });
                log.info(tag, "Messages after function call:", messages);

                // Final response after function handling
                //@ts-ignore
                const finalResponse = await ai.inference(messages);
                return {
                    content: finalResponse?.choices?.[0]?.message?.content || "Response not available.",
                    functionCall: null,
                };
            }
        }

        return { content: choice.content, functionCall };
    } catch (e) {
        log.error(tag, "Error during inference:", e);
        return { content: "Error during inference.", functionCall: null };
    }
};

// Handle subscriber messages
subscriber.on("message", async (channel: string, payloadS: string) => {
    const tag = `${TAG} | onMessage | `;
    try {
        log.info(tag, "Channel:", channel);
        log.info(tag, "Event:", payloadS);

        if (channel === "clubmoon-wallet-connect") {
            log.info(tag, "Wallet connect event:", payloadS);
            let payload = JSON.parse(payloadS);

            //find user in ALL_USERS by socket

            //pair wallet
            //find user in ALL_USERS by socket
            const userIndex = ALL_USERS.findIndex((u:any) => u.socketId === payload.socketID);
            if(userIndex >= 0){
                ALL_USERS[userIndex] = payload.message
            }
        }
        if (channel === "clubmoon-join") {
            log.info(tag, "clubmoon-join:", payloadS);
            let payload = JSON.parse(payloadS);
            let user = {
                socketId: payload.id,
                name: payload.name,
            }
            ALL_USERS.push(user)
        }
        if (channel === "clubmoon-messages") {
            log.info(tag, "clubmoon-messages:", payloadS);
            let messageJSON = JSON.parse(payloadS)
            log.info(tag, "messageJSON: ", messageJSON);
            log.info(tag, "message: ", messageJSON.data.message);
            if (messageJSON.data.message.indexOf('gary') >= 0) {
                const messages = [
                    SYSTEM_GARY_PROMPT,
                    SYSTEM_ONE_SENTENCE_PROMPT,
                    {
                        role: "user",
                        content: payloadS,
                    },
                ];

                const response = await performInference(messages);
                const greeting = response.content;
                console.log('greeting: ', greeting)
                const payload = {
                    text: greeting,
                    voice: "echo",
                    speed: 0.75,
                };
                publisher.publish("clubmoon-publish", JSON.stringify(payload));
            }
        }

        if (channel === "clubmoon-events" && payloadS.includes("joined the game")) {
            console.log(tag, "User joined the game:", payloadS);
            const messages = [
                SYSTEM_GARY_PROMPT,
                SYSTEM_ONE_SENTENCE_PROMPT,
                USER_JOINED_PROMPT(payloadS),
            ];

            const response = await performInference(messages);
            const greeting = "this is Gary Gensler, Chairman of the SEC. " + response.content;

            const payload = {
                text: greeting,
                voice: "echo",
                speed: 0.75,
            };
            publisher.publish("clubmoon-publish", JSON.stringify(payload));
        }

    } catch (e) {
        log.error(tag, e);
    }
});

// Subscribe to relevant channels
subscriber.subscribe("clubmoon-wallet-connect");
subscriber.subscribe("clubmoon-events");
subscriber.subscribe("clubmoon-voice");
subscriber.subscribe("clubmoon-join");
subscriber.subscribe("clubmoon-text");
subscriber.subscribe("clubmoon-movement");
subscriber.subscribe("clubmoon-attack");
subscriber.subscribe("clubmoon-messages");
subscriber.subscribe("clubmoon-gary-join");

const rwClient = client.readWrite;

// Function to tweet with text content only
const textTweet = async (tweetContent: any) => {
    try {
        await rwClient.v2.tweet(tweetContent);
        console.log("Text tweet sent successfully");
    } catch (error) {
        console.error("Error sending text tweet:", error);
    }
};

let buildTweet = async function () {
    let tag = " | buildTweet | "
    try {
        const messages = [
            SYSTEM_GARY_PROMPT,
            SYSTEM_CLUBMOON_BACKSTORY,
            SYSTEM_ENEMIES_INFO,
            SYSTEM_KNOWN_HANDLES,
            SYSTEM_NO_SEC_HASHTAG,
            SYSTEM_SUBTLE_AD,
            USER_TWEET_PROMPT,
        ];

        const response = await performInference(messages);
        const greeting = response.content;
        console.log(tag, "greeting: ", greeting)
        textTweet(greeting)

    } catch (e) {
        console.error(e)
    }
}

let buildTweetResponse = async function () {
    let tag = " | buildTweet | "
    try {
        const messages = [
            SYSTEM_GARY_PROMPT,
            SYSTEM_CLUBMOON_BACKSTORY,
            SYSTEM_SUBTLE_AD,
            USER_TWEET_RESPONSE_PROMPT,
        ];

        const response = await performInference(messages);
        const greeting = response.content;
        console.log(tag, "greeting: ", greeting)
        textTweet(greeting)

    } catch (e) {
        console.error(e)
    }
}

// Schedule tweets every 6 hours
setInterval(buildTweet, 3600000 * 6);
