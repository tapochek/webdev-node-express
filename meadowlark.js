var express = require('express');
var fortune = require('./lib/fortune.js');
var formidable = require('formidable');
var mongoose = require('mongoose');
var Vacation = require('./models/vacation.js');
var VacationInSeasonListener = require('./models/VacationInSeasonListener.js');

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
        }
    }
});

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

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

Vacation.find(function (err, vacations) {
    if (err) return cosole.error(err);

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
});

app.use(express.static(__dirname + '/public'));
app.use(require('body-parser')());
app.use(function (req, res, next) {
    res.locals.showTests = app.get('env') !== 'production' && req.query.test === '1';
    next();
});
app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
}));

app.use(function (req, res, next) {
    res.locals.flash = req.session.flash;
    delete  req.session.flash;
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
    }
}

app.use(function (req, res, next) {
    if (!res.locals.partials) res.locals.partials = {};
    res.locals.partials.weatherContext = getWeatherData();
    next();
});

app.use(function (req, res, next) {
    var cluster = require('cluster');
    if (cluster.isWorker) console.log('Исполнитель %d получил запрос', cluster.worker.id);
    next();
});

app.use(function (err, req, res, next) {
    console.error(err.stack);
    app.status(500).render(500);
    next();
});

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

/*var server = app.listen(app.get('port'), function () {
 console.log('Слушаю на порту %d.', app.get('port'));
 });*/

app.get('/', function (req, res) {
    res.render('home');
    res.cookie('monster', 'nom nom');
    res.cookie('signed_monster', 'nom nom', {signed: true});
});

app.get('/about', function (req, res) {
    res.render('about', {
        fortune: fortune.getFortune(),
        pageTestScript: '/qa/tests-about.js'
    });
});

app.get('/tours/hood-river', function (req, res) {
    res.render('tours/hood-river');
});

app.get('/tours/oregon-coast', function (req, res) {
    res.render('tours/oregon-coast');
});

app.get('/tours/request-group-rate', function (req, res) {
    res.render('tours/request-group-rate');
});

app.get('/jquery-test', function (req, res) {
    res.render('jquery-test');
});

app.get('/nursery-rhyme', function (req, res) {
    res.render('nursery-rhyme');
});

app.get('/data/nursery-rhyme', function (req, res) {
    res.json({
        animal: 'бельчонок',
        bodyPart: 'хвост',
        adjective: 'пушистый',
        noun: 'черт',
    });
});

app.get('/thank-you', function (req, res) {
    res.render('thank-you');
});

app.get('/newsletter', function (req, res) {
    res.render('newsletter', {csrf: 'CSRF token goes here'});
});

app.post('/process', function (req, res) {
    if (req.xhr || req.accepts('json, html') === 'json') {
        res.send({success: true});
    } else {
        res.redirect(303, '/thank-you');
    }
});

app.get('/contest/vacation-photo', function (req, res) {
    var now = new Date();
    res.render('contest/vacation-photo', {
        year: now.getFullYear(),
        month: now.getMonth()
    })
});

app.post('/contest/vacation-photo/:year/:month', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (err) return res.redirect(303, '/error');
        console.log('received fields:');
        console.log(fields);
        console.log('received files:');
        console.log(files);
        res.redirect(303, '/thank-you');
    })
});

var cartValidation = require('./lib/cartValidation.js');

app.use(cartValidation.checkWaivers);
app.use(cartValidation.checkGuestCounts);

app.post('/cart/checkout', function (req, res) {
    var cart = req.session.cart;
    if (!cart) next(new Error('Корзина не существует.'));
    var name = req.body.name || '',
        email = req.body.email || '';
    if (!email.match(VALID_EMAIL_REGEX))
        return res.next(new Error('Некоооектный адрес электронной почты'));
    cart.number = Math.random().toString().replace(/^0\.0*/, '');
    cart.billing = {
        name: name,
        email: email
    };

    res.render('email/cart-thank-you', {layout: null, cart: cart}, function (err, html) {
        if (err) console.log('ошибка в шаблоне письма');
        mailTransport.sendMail({
            from: '"Meadowlark Travel": info@meadowlarktravel.com',
            to: cart.billing.email,
            subject: 'Спасибо за заказ поездки в Meadowlark',
            html: html,
            generateTextFromHtml: true
        }, function (err) {
            if (err) console.err('Не могу отправить подтверждение: ' + err.stack);
        });
    });
    res.render('cart-thank-you', {cart: cart});
});

app.get('/vacations', function (req, res) {
    Vacation.find({available: true}, function (err, vacations) {
        var context = {
            vacations: vacations.map(function (vacation) {
                return {
                    sku: vacation.sku,
                    name: vacation.name,
                    description: vacation.description,
                    price: vacation.getDisplayPrice(),
                    inSeason: vacation.inSeason
                }
            })
        };
        res.render('vacations', context);
    });
});

app.get('/notify-me-when-in-season', function (req, res) {
    res.render('notify-me-when-in-season', {sku: req.query.sku})
});

app.post('/notify-me-when-in-season', function (req, res) {
    VacationInSeasonListener.update(
        {email: req.body.email},
        {$push: {skus: req.body.sku}},
        {upsert: true},
        function (err) {
            if (err) {
                console.error(err.stack);
                req.session.flash = {
                    type: 'danger',
                    intro: 'Упс!',
                    message: 'При обработке вашего запроса произошла ошибка.'
                };
                return res.redirect(303, '/vacations');
            }
            req.session.flash = {
                type: success,
                intro: 'Спасибо',
                message: 'Вы будете оповещены, кошда наступит сезон для этого тура.'
            }
            return res.redirect(303, '/vacations');
        }
    );
});

function NewsletterSignup() {
}

NewsletterSignup.prototype.save = function (cb) {
    cb();
};

var VALID_EMAIL_REGEX = new RegExp('^[a-zA-Z0-9.!#$%&\'*+\/=?^_`{|}~-]+@' +
    '[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?' +
    '(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$');

app.post('/newsletter', function (req, res) {
    var name = req.body.name || '',
        email = req.body.email || '';

    if (!email.match(VALID_EMAIL_REGEX)) {
        if (req.xhr)
            return res.json({error: 'Некорректный адрес электронной почты.'});
        req.session.flash = {
            type: 'danger',
            intro: 'Ошибка проверки!',
            message: 'Введенный вами адресс электронной почты некорректен.'
        };
        return res.redirect(303, '/newsletter/archive');
    }

    new NewsletterSignup({name: name, email: email}).save(function (err) {
        if (err) {
            if (req.xhr) return res.json({error: 'Ошибка базы данных'});
            req.session.flash = {
                type: 'danger',
                intro: 'Ошибка базы данных!',
                message: 'Произошла ошибка базы данных. Пожалуйста, попробуйте позднее'
            };
            return res.redirect(303, '/newsletter/archive');
        }
        if (req.xhr) return res.json({success: true});
        req.session.flash = {
            type: 'success',
            intro: 'Спасибо!',
            message: 'Вы были подписаны на информационный бюллетень.'
        };
        return res.redirect(303, '/newsletter/archive');
    })
});

app.get('/newsletter/archive', function (req, res) {
    res.render('newsletter/archive');
});

app.get('/epic-fail', function (req, res) {
    process.nextTick(function () {
        throw new Error('Бабах!');
    })
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