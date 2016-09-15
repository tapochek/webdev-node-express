module.exports = {
    cookieSecret: 'здесь находится ваш секрет cookie-файла ',
    gmail: {
        user: 'tappochek',
        password: 'password',
    },
    mongo: {
        development: {
            connectionString: 'mongodb://tapochek:k700ifqw@ds019986.mlab.com:19986/tapochek-webdev'
        },
        production: {
            connectionString: 'mongodb://tapochek:k700ifqw@ds019986.mlab.com:19986/tapochek-webdev'
        }
    }
};