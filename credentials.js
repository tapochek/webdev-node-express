module.exports = {
    cookieSecret: 'здесь находится ваш секрет cookie-файла ',
    gmail: {
        user: 'tappochek',
        password: 'password'
    },
    mongo: {
        development: {
            connectionString: 'mongodb://tapochek:k700ifqw@ds019986.mlab.com:19986/tapochek-webdev'
        },
        production: {
            connectionString: 'mongodb://tapochek:k700ifqw@ds019986.mlab.com:19986/tapochek-webdev'
        }
    },
    authProviders: {
        facebook: {
            development: {
                appId: '1698401237150442',
                appSecret: '53702bf7e0dd352d63a8694e86c8881b'
            }
        },
        google: {
            development: {
                clientID: '405530321496-rnp1686e95160vuge60c7pic9jkg17qo.apps.googleusercontent.com',
                clientSecret: 'WEHgm3ofdodYTvDBcMVmSdME'
            }
        }
    }
};