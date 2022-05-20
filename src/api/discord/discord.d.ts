import { ActivityType, Snowflake, UserFlagsString } from "discord.js"


interface Asset {
    largeImage: string,
    largeImageText: string,
    smallImage: string,
    smallImageText: string
}

interface Emoji {
    animated: boolean,
    name: string,
    url: string
}

interface RoleMemberPresence {
    type: ActivityType,
    id: Snowflake,
    emoji: null | Emoji,
    name: string,
    details: string,
    state: string,
    assets: null | Asset[]
}

interface Account {
    type: string,
    name: string,
    id: string,
    visible: boolean
}

interface RoleMember {
    name: string,
    displayName: string,
    discriminator: string,
    id: Snowflake,
    presence: RoleMemberPresence,
    avatar: string,
    banner: string,
    color: string,
    flags: UserFlagsString[],
    connectedAccounts: Account[],
    bio: string | null
}

interface RoleData {
    name: string,
    id: Snowflake,
    color: string,
    members: RoleMember[],
    count: number,
    timestamp: number
}

export declare const RoleData: RoleData