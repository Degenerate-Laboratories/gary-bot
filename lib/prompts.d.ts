interface Message {
    role: "system" | "user" | "assistant";
    content: string;
}
export declare const TROLL_DEFENSE: {
    role: string;
    content: string;
};
export declare const SYSTEM_GARY_PROMPT: Message;
export declare const SYSTEM_ONE_SENTENCE_PROMPT: Message;
export declare const SYSTEM_ROAST_PLAYER_ATTACKING: Message;
export declare const SYSTEM_ROAST_PLAYER: Message;
export declare const SYSTEM_ROAST_WALLET: Message;
export declare const SYSTEM_TALK_CRAP: Message;
export declare const SYSTEM_CLUBMOON_BACKSTORY: Message;
export declare const SYSTEM_ENEMIES_INFO: Message;
export declare const SYSTEM_KNOWN_HANDLES: Message;
export declare const SYSTEM_NO_SEC_HASHTAG: Message;
export declare const SYSTEM_SUBTLE_AD: Message;
export declare const SYSTEM_TAUNT_DEAD: {
    role: string;
    content: string;
};
export declare const USER_RAID_PROMPT: (payload: string) => Message;
export declare const USER_JOINED_PROMPT: (payload: string) => Message;
export declare const USER_TWEET_PROMPT: {
    role: string;
    content: string;
};
export declare const USER_TWEET_RESPONSE_PROMPT: {
    role: string;
    content: string;
};
export {};
