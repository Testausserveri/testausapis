/**
 * Default slash commands configuration
 */
export default [
    {
        name: "analytics",
        description: "Manage the collection of your \"Discord Data\" by Testausserveri ry.",
        type: 1,
        options: [
            {
                name: "consent",
                description: "Allow/Disallow data collection with your consent.",
                type: 2,
                options: [
                    {
                        name: "allow",
                        description: "I allow data collection (make my profile public).",
                        type: 1
                    }, {
                        name: "deny",
                        description: "I disallow data collection (make my profile private).",
                        type: 1
                    },
                    {
                        name: "state",
                        description: "Inspect your current data collection policy.",
                        type: 1
                    }
                ]
            }
        ]
    },
    {
        name: "manage",
        description: "Manage your API settings.",
        type: 1,
        options: [
            {
                name: "profile",
                description: "Manage your public profile.",
                type: 2,
                options: [
                    {
                        name: "bio",
                        description: "Edit your public profile's bio.",
                        type: 1,
                        options: [
                            {
                                name: "text",
                                description: "Your public user bio text.",
                                type: 3,
                                required: true
                            }
                        ]
                    },
                    {
                        name: "connections",
                        description: "Update your account public account connections.",
                        type: 1
                    }
                ]
            }
        ]
    },
    {
        name: "whois",
        description: "Hae käyttäjän jäsentunniste",
        options: [
            {
                type: 6,
                name: "user",
                description: "Käyttäjä",
                required: true
            }
        ]
    }
]
