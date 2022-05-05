// intellisense breaks if not using a .d.ts for the models
import { Model } from "mongoose"

interface MessageCountModel {
	count: number;
	id: string;
	date: string;
}

interface DataCollectionConfigurationModel {
	allowed: unknown[];
	id: string;
}

interface DiscordAccountConnection {
	id: string;
	name: string;
	type: string;
	revoked?: boolean;
	integrations?: unknown[];
	verified: boolean;
	friend_sync: boolean;
	show_activity: boolean;
	visibility: number;
}

interface UserInfoModel {
	id: string;
	bio: string;
	connectedAccounts: DiscordAccountConnection[];
}

export declare const MessageCountModel: Model<MessageCountModel>;
export declare const DataCollectionConfigurationModel: Model<DataCollectionConfigurationModel>;
export declare const UserInfoModel: Model<UserInfoModel>;
