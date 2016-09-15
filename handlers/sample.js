exports.jqueryTest = function (req, res) {
    res.render('jquery-test');
};

exports.nurseryRhyme = function (req, res) {
    res.render('nursery-rhyme');
};

exports.nurseryRhymeData = function (req, res) {
    res.json({
        animal: 'бельчонок',
        bodyPart: 'хвост',
        adjective: 'пушистый',
        noun: 'черт',
    });
};

exports.epicFail = function (req, res) {
    process.nextTick(function () {
        throw new Error('Бабах!');
    })
};