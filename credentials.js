module.exports = {
    cookieSecret: 'здесь находится ваш секрет cookie-файла ',
    gmail: {
        user: 'username',
        password: 'password'
    },
    twitter: {
        consumerKey: '',
        consumerSecret: ''
    },
    WeatherUnderground: {
        ApiKey: ''
    },
    mongo: {
        development: {
            connectionString: ''
        },
        production: {
            connectionString: ''
        }
    },
    authProviders: {
        facebook: {
            development: {
                appId: '',
                appSecret: ''
            }
        },
        google: {
            development: {
                clientID: '',
                clientSecret: ''
            }
        }
    }
};