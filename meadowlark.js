var express = require('express');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var mongoose = require('mongoose');
var fs = require('fs');
var https = require('https');
var Dealer = require('./models/dealer.js');
var Q = require('q');

var app = express();

var credentials = require('./credentials.js');

var twitter = require('./lib/twitter.js')({
    consumerKey: credentials.twitter.consumerKey,
    consumerSecret: credentials.twitter.consumerSecret
});

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
app.use(require('csurf')());
app.use(function (req, res, next) {
    res.locals._csrfToken = req.csrfToken();
    next();
});
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

Dealer.find({}, function (err, dealers) {
    if (dealers.length) return;

    new Dealer({
        name: 'Oregon Novelties',
        address1: '912 NW Davis St',
        city: 'Portland',
        state: 'OR',
        zip: '97209',
        country: 'US',
        phone: '503-555-1212',
        active: true
    }).save();

    new Dealer({
        name: 'Bruce\'s Bric-a-Brac',
        address1: '159 Beeswax Ln',
        city: 'Manzanita',
        state: 'OR',
        zip: '97209',
        country: 'US',
        phone: '503-555-1212',
        active: true
    }).save();

    new Dealer({
        name: 'Aunt Beru\'s Oregon Souveniers',
        address1: '544 NE Emerson Ave',
        city: 'Bend',
        state: 'OR',
        zip: '97701',
        country: 'US',
        phone: '503-555-1212',
        active: true
    }).save();

    new Dealer({
        name: 'Oregon Goodies',
        address1: '1353 NW Beca Ave',
        city: 'Corvallis',
        state: 'OR',
        zip: '97330',
        country: 'US',
        phone: '503-555-1212',
        active: true
    }).save();

    new Dealer({
        name: 'Oregon Grab-n-Fly',
        address1: '7000 NE Airport Way',
        city: 'Portland',
        state: 'OR',
        zip: '97219',
        country: 'US',
        phone: '503-555-1212',
        active: true
    }).save();
});

function dealersToGoogleMaps(dealers) {
    var js = 'function addMarkers(map){\n' +
        'var markers = [];\n' +
        'var Marker = google.maps.Marker;\n' +
        'var LatLng = google.maps.LatLng;\n';
    dealers.forEach(function (d) {
        var name = d.name.replace(/'/, '\\\'')
            .replace(/\\/, '\\\\');
        js += 'markers.push(new Marker({\n' +
            '\tposition: new LatLng(' +
            d.lat + ', ' + d.lng + '),\n' +
            '\tmap: map,\n' +
            '\ttitle: \'' + name.replace(/'/, '\\') + '\',\n' +
            '}));\n';
    });
    js += '}';
    return js;
}

var dealerCache = {
    lastRefreshed: 0,
    refreshInterval: 60 * 60 * 1000,
    jsonUrl: '/dealers.json',
    geocodeLimit: 2000,
    geocodeCount: 0,
    geocodeBegin: 0
};

dealerCache.jsonFile = __dirname +
    '/public' + dealerCache.jsonUrl;

function geocodeDealer(dealer) {
    var addr = dealer.getAddress(' ');
    if (addr === dealer.geocodedAddress) return;

    if (dealerCache.geocodeCount >= dealerCache.geocodeLimit) {
        if (Date.now() > dealerCache.geocodeCount + 24 * 60 * 60 + 1000) {
            dealerCache.geocodeBegin = Date.now();
            dealerCache.geocodeCount = 0;
        } else {
            return;
        }
    }
    var geocode = require('./lib/geocode.js');
    geocode(addr, function (err, coords) {
        if (err) return console.log('Geocoding failure for ' + addr);
        dealer.lat = coords.lat;
        dealer.lng = coords.lng;
        dealer.save();
    });
}

dealerCache.refresh = function (cb) {
    if (Date.now() > dealerCache.lastRefreshed + dealerCache.refreshInterval) {
        Dealer.find({active: true}, function (err, dealers) {
            if (err) return console.log('Error fetching dealers: ' + err);
            dealers.forEach(geocodeDealer);

            fs.writeFileSync(dealerCache.jsonFile, JSON.stringify(dealers));
            cb();
        });
    }
};

function refreshDealerCacheForever() {
    dealerCache.refresh(function () {
        setTimeout(refreshDealerCacheForever, dealerCache.refreshInterval);
    });
}

if (!fs.existsSync(dealerCache.jsonFile)) fs.writeFileSync(JSON.stringify([]));
refreshDealerCacheForever();

app.use(function (req, res, next) {
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});

var getWeatherData = (function () {
    // our weather cache
    var c = {
        refreshed: 0,
        refreshing: false,
        updateFrequency: 360000, // 1 hour
        locations: [
            {name: 'Portland'},
            {name: 'Bend'},
            {name: 'Manzanita'}
        ]
    };
    return function () {
        if (!c.refreshing && Date.now() > c.refreshed + c.updateFrequency) {
            c.refreshing = true;
            var promises = c.locations.map(function (loc) {
                return Q.Promise(function (resolve) {
                    var url = 'http://api.wunderground.com/api/' +
                        credentials.WeatherUnderground.ApiKey +
                        '/conditions/q/OR/' + loc.name + '.json';
                    http.get(url, function (res) {
                        var body = '';
                        res.on('data', function (chunk) {
                            body += chunk;
                        });
                        res.on('end', function () {
                            body = JSON.parse(body);
                            loc.forecastUrl = body.current_observation.forecast_url;
                            loc.iconUrl = body.current_observation.icon_url;
                            loc.weather = body.current_observation.weather;
                            loc.temp = body.current_observation.temperature_string;
                            resolve();
                        });
                    });
                });
            });
            Q.all(promises).then(function () {
                c.refreshing = false;
                c.refreshed = Date.now();
            });
        }
        return {locations: c.locations};
    };
})();

getWeatherData();


app.use(function (req, res, next) {
    if (!res.locals.partials) res.locals.partials = {};
    res.locals.partials.weatherContext = getWeatherData();
    next();
});

var topTweets = {
    count: 10,
    lastRefreshed: 0,
    refreshInterval: 15 * 60 * 1000,
    tweets: []
};

function getTopTweets(cb) {
    if (Date.now() < topTweets.lastRefreshed + topTweets.refreshInterval)
        return cb(topTweets.tweets);

    twitter.search('#meadolarkTravel', topTweets.count, function (result) {
        var formattedTweets = [];
        var promises = [];
        var embedOpts = {omit_script: 1};
        result.statuses.forEach(function (status) {
            var deferred = Q.defer();
            twitter.embed(status.id_str, embedOpts, function (embed) {
                formattedTweets.push(embed.html);
                deferred.resolve();
            });
            promises.push(deferred.promise);
        });
        Q.all(promises).then(function () {
            topTweets.lastRefreshed = Date.now();
            cb(topTweets.tweets = formattedTweets);
        });
    });
}

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

var auth = require('./lib/auth')(app, {
    baseUrl: process.env.BASE_URL,
    providers: credentials.authProviders,
    successRedirect: '/account',
    failureRedirect: '/unauthorized'
});

auth.init();

auth.registerRoutes();

function customerOnly(req, res, next) {
    if (req.user && req.user.role === 'customer') return next();
    res.redirect(303, '/unauthorized');
}

function employeeOnly(req, res, next) {
    if (req.user && req.user.role === 'employee') return next();
    next('route');
}

function allow(roles) {
    return function (req, res, next) {
        if (req.user && roles.split(',').indexOf(req.user.role)!==-1) return next();
        res.redirect(303, '/unauthorized');
    };
}

app.get('/unauthorized', function (req, res) {
    res.status(403).render('unauthorized');
});

app.get('/account', allow('customer,employee'), function (req, res) {
    res.render('account');
});

app.get('/account/order-history', customerOnly, function (req, res) {
    res.render('account/order-history');
});

app.get('/account/email-prefs', customerOnly, function (req, res) {
    res.render('account/email-prefs');
});

app.get('/sales', employeeOnly, function (req, res) {
    res.render('sales');
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
    var options = {
        key: fs.readFileSync(__dirname + '/ssl/meadowlark.pem'),
        cert: fs.readFileSync(__dirname + '/ssl/meadowlark.crt')
    };

    https.createServer(options, app).listen(app.get('port'), function () {
        console.log('Express started in ' + app.get('env') + ' mode on port ' + app.get('port') + ' using HTTPS.');
    });
}

if (require.main === module) {
    startServer();
} else {
    module.exports = startServer;
}