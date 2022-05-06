# Testausapis
Testausapis provides API-endpoints for Testausserveri's general tasks, such as:
- GitHub organization self-service joining
- Statistics and dynamic data for our [homepage](https://github.com/Testausserveri/testausserveri.fi)

## Table of Contents
- [API Documentation](#api-documentation)
  * [Routes](#routes)
    + [Discord](#discord)
      - [GET `/v1/discord/guildInfo`](#get-v1discordguildinfo)
      - [GET `/v1/discord/roleInfo`](#get-v1discordroleinfo)
      - [GET `/v1/discord/memberInfo`](#get-v1discordmemberinfo)
      - [GET `/v1/discord/connections/authorize`](#get-v1discordconnectionsauthorize)
      - [GET `/v1/discord/connections/authorized`](#get-v1discordconnectionsauthorized)
    + [GitHub](#github)
      - [GET `/v1/github/authorize`](#get-v1githubauthorize)
      - [GET `/v1/github/authorized`](#get-v1githubauthorized)
  * [Models](#models)
    + [memberObject](#memberobject)
    + [cacheState](#cachestate)
## API Documentation

This is the API documentation for the current version 1. 

The base server url is `https://api.testausserveri.fi`. The API doesn't require authentication as it is currently purely for public open use.
### Routes
#### Discord
##### GET `/v1/discord/guildInfo`
Daily activity statistics of the Testausserveri.fi Discord server.

You can pass a GET param `v` with a comma-seperated list of object keys you want in response. Omitting `v` will respond all the existing keys.

Example response:

```http
HTTP/2 200 OK
Date: Fri, 18 Feb 2022 06:58:52 GMT
Content-Type: application/json; charset=utf-8
Content-Length: 39
X-Powered-By: Express
Access-Control-Allow-Origin: *

{"memberCount":1223,"membersOnline":1130,"messagesToday":32, "premium": { "subscriptions": 12, "tier": 2}}
```

*Values `N/A` when unavailable*

##### GET `/v1/discord/roleInfo`
Get general information about a specific role.
Role is specified with the query parameter `id` as the role id.
This API publishes only otherwise public information.

Example response:

```http
HTTP/2 200 OK
Content-Type: application/json; charset=utf-8
X-Powered-By: Express
Access-Control-Allow-Origin: *

{"name":"masterminds","id":"743950610080071801","color":"#206694","count":3,"timestamp":1645164551244,"cache":"expired"}
```

**Value definitions**
- "name", The role name
- "id", The role id
- "color", The role color as a hex color value
- "members", Array of memberObjects (see below)
- "count", The number of members that have the requested role
- "timestamp", Unix timestamp of the time of response generation
- "cache", A cacheState (see below)

##### GET `/v1/discord/memberInfo`
Get activity & general user information for a specific role.
The role is specified with the query parameter `id` as the role id.
This API publishes possibly private information and requires the users to opt-in for their data to be published.

The response format is identical with /v1/discord/roleInfo
##### GET `/v1/discord/connections/authorize`
Redirects the user to the Discord OAuth 2.0 authorization page to grant the API access to account information.

##### GET `/v1/discord/connections/authorized`
Handle the OAuth 2.0 callback from Discord and update cached account information.

#### GitHub
##### GET `/v1/github/authorize`
Redirects the user to Github OAuth 2.0 authorization page to grant the API access to account information.

##### GET `/v1/github/authorized`
Handle the OAuth 2.0 callback from Github and add the user to the Testausserveri ry organization.
### Models

#### memberObject
```json
{
    "name": Member account name,
    "displayName": Current user display name,
    "discriminator": Discord discriminator (#xxxx),
    "id": Member id,
    "presence": [
        {
            "type": Discord activity type (such as PLAYING),
            "id": Activity application id,
            "emoji": [
                {
                    "animated": Boolean,
                    "name": The emoji name,
                    "url": The asset url
                }, ...
            ],
            "name": Activity name,
            "details": Activity details,
            "state": Activity state,
            "assets": {
                "largeImage": Large asset url,
                "largeImageText": Large asset description,
                "smallImage": Small asset url,
                "smallImageText": Small asset description
            }
        }, ...
    ],
    "avatar": Member avatar url,
    "banner": Member banner url,
    "color": Member profile hex color,
    "flags": Member Discord flags,
    "connectedAccounts": [
        {
            "type": Account type,
            "name": Account name,
            "id": Account id,
            "visible": Boolean
        }
    ],
    "bio": Member bio
}
```

*Arrays presence, emoji & connectedAccounts can be empty.*

*Presence assets can be an empty object.*

*All values can be expected to be strings or numbers (if possible, excluding ids)*

#### cacheState
A string value that can be any of these values:
- "valid", The cache is up to date.
- "expired", The cache has expired and contains expired data.
- "expired-updating", The cache has expired, but will update shortly.
