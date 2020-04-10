var echo = require('../dist/index.js');

var options = require('../laravel-echo-server');

echo.run(options).then(echo => {
    echo.stop();
});
