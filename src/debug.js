var debug = require('debug');

module.exports = (name = 'soft-delete') => debug(`loopback:mixins:${name}`);
