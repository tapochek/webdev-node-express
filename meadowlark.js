var express = require('express');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var mongoose = require('mongoose');
var fs = require('fs');

var app = express();

var credentials = require('./credentials.js');

var emailService = require('./lib/email.js')(credentials);

// Установка механизма представления handlebars
var handlebars = require('express3-handlebars').create({
    defaultLayout: 'main',
    helpers: {
        section: function (name, options) {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        static: function (name) {
            return require('./lib/static.js').map(name);
        }
    }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

app.use(function (req, res, next) {
    var domain = require('domain').create();
    domain.on('error', function (err) {
        console.error('ПЕРЕХВАЧЕНА ОШИБКА ДОМЕНА\n', err.stack);
        try {
            setTimeout(function () {
                console.error(' Отказобезопасный останов.');
                process.exit(1);
            }, 5000);

            var worker = require('cluster').worker;
            if (worker) worker.disconnect();

            server.close();

            try {
                next(err);
            } catch (err) {
                console.error('Сбой механизма обработки ошибок ' +
                    'Express .\n', err.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Ошибка сервера.');
            }
        } catch (err) {
            console.error('Не могу отправить ответ 500.\n', err.stack);
        }
    });

    domain.add(req);
    domain.add(res);
    domain.run(next);
});

switch (app.get('env')) {
    case 'development':
        app.use(require('morgan')('dev'));
        break;
    case 'production':
        app.use(require('express-logger')({
            path: __dirname + '/log/requests.log'
        }));
        break;
}

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({url: credentials.mongo[app.get('env')].connectionString});

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
    store: sessionStore
}));
app.use(express.static(__dirname + '/public'));
app.use(require('body-parser')());

var opts = {
    server: {
        socketOptions: {
            keepalive: 1
        }
    }
};

switch (app.get('env')) {
    case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, opts);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, opts);
        break;
    default:
        throw new Error('Неизвестная среда выполнения: ' + app.get('env'));
}
/*var Vacation = require('./models/vacation.js');
 var VacationInSeasonListener = require('./models/VacationInSeasonListener.js');
Vacation.find(function (err, vacations) {
    if (err) return console.error(err);

    if (vacations.length) return;

    new Vacation({
        name: 'Однодневный тур по реке Худ',
        slug: 'hood-river-day-trip',
        category: 'Однодневный тур',
        sku: 'HR199',
        description: 'Проведите день в плавании по реке Колумбия и насладитесь сваренным по традиционным рецептам пивом на реке Худ!',
        priceInCents: 9995,
        tags: ['однодневный тур', 'река худ', 'плавание', 'виндсерфинг', 'пивоварни'],
        inSeason: true,
        maximumGuests: 16,
        available: true,
        packagesSold: 0
    }).save();
    new Vacation({
        name: 'Отдых в Орегон Коуст',
        slug: 'oregon-coast-getaway',
        category: 'Отдых на выходных',
        sku: 'OC39',
        description: 'Насладитесь океанским воздухом и причудливыми прибрежными городками!',
        priceInCents: 269995,
        tags: ['отдых на выходных', 'орегон коуст', 'прогулки по пляжу'],
        inSeason: false,
        maximumGuests: 8,
        available: true,
        packagesSold: 0,
    }).save();
    new Vacation({
        name: 'Скалолазание в Бенде',
        slug: 'rock-climbing-in-bend',
        category: 'Приключение',
        sku: 'B99',
        description: 'Пощекочите себе нервы горным восхождением на пустынной возвышенности.',
        priceInCents: 289995,
        tags: ['отдых на выходных', 'бенд', 'пустынная возвышенность', 'скалолазание'],
        inSeason: true,
        requiresWaiver: true,
        maximumGuests: 4,
        available: false,
        packagesSold: 0,
        notes: 'Гид по данному туру в настоящий момент восстанавливается после лыжной травмы.',
    }).save();
 });*/

app.use(function (req, res, next) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

function getWeatherData() {
    return {
        locations: [
            {
                name: 'Портленд',
                forecastUrl: 'http://www.wunderground.com/US/OR/Portland.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/cloudy.gif',
                weather: 'Сплошная облачность ',
                temp: '54.1 F (12.3 C)'
            },
            {
                name: 'Бенд',
                forecastUrl: 'http://www.wunderground.com/US/OR/Bend.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/partlycloudy.gif',
                weather: 'Малооблачно',
                temp: '55.0 F (12.8 C)'
            },
            {
                name: 'Манзанита',
                forecastUrl: 'http://www.wunderground.com/US/OR/Manzanita.html',
                iconUrl: 'http://icons-ak.wxug.com/i/c/k/rain.gif',
                weather: 'Небольшой дождь',
                temp: '55.0 F (12.8 C)'
            }
        ]
    };
}

app.use(function (req, res, next) {
    if (!res.locals.partials) res.locals.partials = {};
    res.locals.partials.weatherContext = getWeatherData();
    next();
});

var static = require('./lib/static.js').map;

app.use(function (req, res, next) {
    var now = new Date();
    res.locals.logoImage = now.getMonth() == 11 && now.getDate() == 19 ?
        static('/img/logo_bud_clark.png') :
        static('/img/logo.png');
    next();
});

var admin = express.Router();
app.use(require('vhost')('admin.*', admin));

admin.get('/', function (req, res) {
    res.render('admin/home');
});
admin.get('/users', function (req, res) {
    res.render('admin/users');
});

require('./routes')(app);

// api

var Attraction = require('./models/attraction');

var rest = require('connect-rest');

rest.get('/attractions', function (req, res, cb) {
    Attraction.find({approved: true}, function (err, attractions) {
        if (err) return cb({error: 'Внутренняя ошибка'});
        cb(null, attractions.map(function (a) {
            return {
                name: a.name,
                id: a._id,
                description: a.description,
                location: a.location
            };
        }));
    });
});

rest.post('/attraction', function (req, res, cb) {
    var a = new Attraction({
        name: req.body.name,
        description: req.body.description,
        location: {
            lat: req.body.lat,
            lng: req.body.lng
        },
        history: {
            event: 'created',
            email: req.body.email,
            date: new Date()
        },
        approved: false
    });

    a.save(function (err, a) {
        if (err) return cb({error: 'Невозможно добавить достопримечательность'});
        cb(null, {id: a._id});
    });
});

rest.get('/attraction/:id', function (req, res, cb) {
    Attraction.findById(req.params.id, function (err, a) {
        if (err) return cb({error: 'Невозможно извлечь достопримечательность'});
        cb(null, {
            name: a.name,
            id: a._id,
            description: a.description,
            location: a.location
        });
    });
});

// API configuration
var apiOptions = {
    context: '/',
    domain: require('domain').create()
};

apiOptions.domain.on('error', function (err) {
    console.log('API domain error.\n', err.stack);
    setTimeout(function () {
        console.log('Остановка сервера после ошибки домен API.');
        process.exit(1);
    }, 5000);
    server.close();
    var worker = require('cluster').worker;
    if (worker) worker.disconnect();
});

app.use(require('vhost')('api.*', rest.rester(apiOptions)));

var autoViews = {};

app.use(function (req, res, next) {
    var path = req.path.toLowerCase();

    if (autoViews[path]) return res.render(autoViews[path]);

    if (fs.existsSync(__dirname + '/views' + path + '.handlebars')) {
        autoViews[path] = path.replace('/^\//', '');
        return res.render(autoViews[path]);
    }
    next();
});

// пользовательская страница 404
app.use(function (req, res) {
    res.status(404);
    res.render('404');
});

// пользовательская страница 500
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

var server;

function startServer() {
    app.listen(app.get('port'), function () {
        console.log('Express запущено в режиме ' + app.get('env') +
            ' на http://localhost:' + app.get('port') + '; нажмите Ctrl+C для завершения.');
    });
}

if (require.main === module) {
    startServer();
} else {
    module.exports = startServer;
}