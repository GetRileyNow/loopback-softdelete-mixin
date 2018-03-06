'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _defineProperty2 = require('babel-runtime/helpers/defineProperty');

var _defineProperty3 = _interopRequireDefault(_defineProperty2);

var _extends8 = require('babel-runtime/helpers/extends');

var _extends9 = _interopRequireDefault(_extends8);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _debug2 = require('./debug');

var _debug3 = _interopRequireDefault(_debug2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var crypto = require('crypto');

var debug = (0, _debug3.default)();

exports.default = function (Model, _ref) {
  var _ref$deletedAt = _ref.deletedAt,
      deletedAt = _ref$deletedAt === undefined ? 'deletedAt' : _ref$deletedAt,
      _ref$scrub = _ref.scrub,
      scrub = _ref$scrub === undefined ? false : _ref$scrub,
      _ref$index = _ref.index,
      index = _ref$index === undefined ? false : _ref$index,
      _ref$deletedById = _ref.deletedById,
      deletedById = _ref$deletedById === undefined ? false : _ref$deletedById,
      _ref$deleteOp = _ref.deleteOp,
      deleteOp = _ref$deleteOp === undefined ? false : _ref$deleteOp;

  debug('SoftDelete mixin for Model %s', Model.modelName);

  debug('options', { deletedAt: deletedAt, scrub: scrub, index: index });

  var properties = Model.definition.properties;
  var idName = Model.dataSource.idName(Model.modelName);

  var scrubbed = {};
  if (scrub !== false) {
    var propertiesToScrub = scrub;
    if (!Array.isArray(propertiesToScrub)) {
      propertiesToScrub = (0, _keys2.default)(properties).filter(function (prop) {
        return !properties[prop][idName] && prop !== deletedAt;
      });
    }
    scrubbed = propertiesToScrub.reduce(function (obj, prop) {
      return (0, _extends9.default)({}, obj, (0, _defineProperty3.default)({}, prop, null));
    }, {});
  }

  Model.defineProperty(deletedAt, { type: Date, required: false, default: null });
  if (index) Model.defineProperty('deleteIndex', { type: String, required: true, default: 'null' });
  if (deletedById) Model.defineProperty('deletedById', { type: Number, required: false, default: null });
  if (deleteOp) Model.defineProperty('deleteOp', { type: String, required: false, default: null });

  var _destroyAll = Model.destroyAll;

  Model.destroyAll = function softDestroyAll(where, cb) {
    var _extends3;

    var deletePromise = index ? Model.updateAll(where, (0, _extends9.default)({}, scrubbed, (_extends3 = {}, (0, _defineProperty3.default)(_extends3, deletedAt, new Date()), (0, _defineProperty3.default)(_extends3, 'deleteIndex', genKey()), _extends3))) : Model.updateAll(where, (0, _extends9.default)({}, scrubbed, (0, _defineProperty3.default)({}, deletedAt, new Date())));

    return deletePromise.then(function (result) {
      return typeof cb === 'function' ? cb(null, result) : result;
    }).catch(function (error) {
      return typeof cb === 'function' ? cb(error) : _promise2.default.reject(error);
    });
  };

  Model.remove = Model.destroyAll;
  Model.deleteAll = Model.destroyAll;

  Model.hardDestroyAll = function hardDestroyAll(where, cb) {
    return _destroyAll.call(Model, where, cb);
  };

  Model.destroyById = function softDestroyById(id, cb) {
    var _extends5;

    var deletePromise = index ? Model.updateAll((0, _defineProperty3.default)({}, idName, id), (0, _extends9.default)({}, scrubbed, (_extends5 = {}, (0, _defineProperty3.default)(_extends5, deletedAt, new Date()), (0, _defineProperty3.default)(_extends5, 'deleteIndex', genKey()), _extends5))) : Model.updateAll((0, _defineProperty3.default)({}, idName, id), (0, _extends9.default)({}, scrubbed, (0, _defineProperty3.default)({}, deletedAt, new Date())));

    return deletePromise.then(function (result) {
      return typeof cb === 'function' ? cb(null, result) : result;
    }).catch(function (error) {
      return typeof cb === 'function' ? cb(error) : _promise2.default.reject(error);
    });
  };

  Model.removeById = Model.destroyById;
  Model.deleteById = Model.destroyById;

  Model.prototype.destroy = function softDestroy(options, cb) {
    var callback = cb === undefined && typeof options === 'function' ? options : cb;
    var data = (0, _extends9.default)({}, scrubbed, (0, _defineProperty3.default)({}, deletedAt, new Date()));
    options = options || {};
    options.delete = true;
    if (index) data.deleteIndex = genKey();
    if (deletedById && options.deletedById) data.deletedById = options.deletedById;
    if (deleteOp && options.deleteOp) data.deleteOp = options.deleteOp;

    return this.updateAttributes(data, options).then(function (result) {
      return typeof cb === 'function' ? callback(null, result) : result;
    }).catch(function (error) {
      return typeof cb === 'function' ? callback(error) : _promise2.default.reject(error);
    });
  };

  Model.prototype.remove = Model.prototype.destroy;
  Model.prototype.delete = Model.prototype.destroy;

  // Emulate default scope but with more flexibility.
  var queryNonDeleted = (0, _defineProperty3.default)({}, deletedAt, null);

  var _findOrCreate = Model.findOrCreate;
  Model.findOrCreate = function findOrCreateDeleted() {
    var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (!query.deleted) {
      if (!query.where || (0, _keys2.default)(query.where).length === 0) {
        query.where = queryNonDeleted;
      } else {
        query.where = { and: [query.where, queryNonDeleted] };
      }
    }

    for (var _len = arguments.length, rest = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      rest[_key - 1] = arguments[_key];
    }

    return _findOrCreate.call.apply(_findOrCreate, [Model, query].concat(rest));
  };

  var _find = Model.find;
  Model.find = function findDeleted() {
    var query = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    if (!query.deleted) {
      if (!query.where || (0, _keys2.default)(query.where).length === 0) {
        query.where = queryNonDeleted;
      } else {
        query.where = { and: [query.where, queryNonDeleted] };
      }
    }

    for (var _len2 = arguments.length, rest = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
      rest[_key2 - 1] = arguments[_key2];
    }

    return _find.call.apply(_find, [Model, query].concat(rest));
  };

  var _count = Model.count;
  Model.count = function countDeleted() {
    var where = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    // Because count only receives a 'where', there's nowhere to ask for the deleted entities.
    var whereNotDeleted = void 0;
    if (!where || (0, _keys2.default)(where).length === 0) {
      whereNotDeleted = queryNonDeleted;
    } else {
      whereNotDeleted = { and: [where, queryNonDeleted] };
    }

    for (var _len3 = arguments.length, rest = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
      rest[_key3 - 1] = arguments[_key3];
    }

    return _count.call.apply(_count, [Model, whereNotDeleted].concat(rest));
  };

  var _update = Model.update;
  Model.update = Model.updateAll = function updateDeleted() {
    var where = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    // Because update/updateAll only receives a 'where', there's nowhere to ask for the deleted entities.
    var whereNotDeleted = void 0;
    if (!where || (0, _keys2.default)(where).length === 0) {
      whereNotDeleted = queryNonDeleted;
    } else {
      whereNotDeleted = { and: [where, queryNonDeleted] };
    }

    for (var _len4 = arguments.length, rest = Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
      rest[_key4 - 1] = arguments[_key4];
    }

    return _update.call.apply(_update, [Model, whereNotDeleted].concat(rest));
  };

  if (Model.settings.remoting && Model.settings.remoting.sharedMethods.deleteById !== false && (deletedById || deleteOp)) {
    Model.disableRemoteMethodByName('deleteById');

    Model.remoteMethod('deleteById', {
      accessType: 'WRITE',
      isStatic: false,
      accepts: [{ arg: 'options', type: 'object', http: 'optionsFromRequest' }],
      returns: { arg: 'data', type: 'object', root: true },
      http: { verb: 'delete', path: '/' }
    });

    Model.prototype.deleteById = function () {
      var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

      if (deletedById) options.deletedById = options.accessToken ? options.accessToken.userId : null;
      if (deleteOp && options.deletedById) options.deleteOp = 'user';
      return this.destroy(options).then(function () {
        return { count: 1 };
      });
    };
  }
};

var genKey = function genKey() {
  return crypto.createHmac('sha256', Math.random().toString(12).substr(2)).digest('hex').substr(0, 8);
};
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNvZnQtZGVsZXRlLmpzIl0sIm5hbWVzIjpbImNyeXB0byIsInJlcXVpcmUiLCJkZWJ1ZyIsIk1vZGVsIiwiZGVsZXRlZEF0Iiwic2NydWIiLCJpbmRleCIsImRlbGV0ZWRCeUlkIiwiZGVsZXRlT3AiLCJtb2RlbE5hbWUiLCJwcm9wZXJ0aWVzIiwiZGVmaW5pdGlvbiIsImlkTmFtZSIsImRhdGFTb3VyY2UiLCJzY3J1YmJlZCIsInByb3BlcnRpZXNUb1NjcnViIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwicHJvcCIsInJlZHVjZSIsIm9iaiIsImRlZmluZVByb3BlcnR5IiwidHlwZSIsIkRhdGUiLCJyZXF1aXJlZCIsImRlZmF1bHQiLCJTdHJpbmciLCJOdW1iZXIiLCJfZGVzdHJveUFsbCIsImRlc3Ryb3lBbGwiLCJzb2Z0RGVzdHJveUFsbCIsIndoZXJlIiwiY2IiLCJkZWxldGVQcm9taXNlIiwidXBkYXRlQWxsIiwiZ2VuS2V5IiwidGhlbiIsInJlc3VsdCIsImNhdGNoIiwiZXJyb3IiLCJyZWplY3QiLCJyZW1vdmUiLCJkZWxldGVBbGwiLCJoYXJkRGVzdHJveUFsbCIsImNhbGwiLCJkZXN0cm95QnlJZCIsInNvZnREZXN0cm95QnlJZCIsImlkIiwicmVtb3ZlQnlJZCIsImRlbGV0ZUJ5SWQiLCJwcm90b3R5cGUiLCJkZXN0cm95Iiwic29mdERlc3Ryb3kiLCJvcHRpb25zIiwiY2FsbGJhY2siLCJ1bmRlZmluZWQiLCJkYXRhIiwiZGVsZXRlIiwiZGVsZXRlSW5kZXgiLCJ1cGRhdGVBdHRyaWJ1dGVzIiwicXVlcnlOb25EZWxldGVkIiwiX2ZpbmRPckNyZWF0ZSIsImZpbmRPckNyZWF0ZSIsImZpbmRPckNyZWF0ZURlbGV0ZWQiLCJxdWVyeSIsImRlbGV0ZWQiLCJsZW5ndGgiLCJhbmQiLCJyZXN0IiwiX2ZpbmQiLCJmaW5kIiwiZmluZERlbGV0ZWQiLCJfY291bnQiLCJjb3VudCIsImNvdW50RGVsZXRlZCIsIndoZXJlTm90RGVsZXRlZCIsIl91cGRhdGUiLCJ1cGRhdGUiLCJ1cGRhdGVEZWxldGVkIiwic2V0dGluZ3MiLCJyZW1vdGluZyIsInNoYXJlZE1ldGhvZHMiLCJkaXNhYmxlUmVtb3RlTWV0aG9kQnlOYW1lIiwicmVtb3RlTWV0aG9kIiwiYWNjZXNzVHlwZSIsImlzU3RhdGljIiwiYWNjZXB0cyIsImFyZyIsImh0dHAiLCJyZXR1cm5zIiwicm9vdCIsInZlcmIiLCJwYXRoIiwiYWNjZXNzVG9rZW4iLCJ1c2VySWQiLCJjcmVhdGVIbWFjIiwiTWF0aCIsInJhbmRvbSIsInRvU3RyaW5nIiwic3Vic3RyIiwiZGlnZXN0Il0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBRUE7Ozs7OztBQUZBLElBQUlBLFNBQVNDLFFBQVEsUUFBUixDQUFiOztBQUdBLElBQU1DLFFBQVEsc0JBQWQ7O2tCQUVlLFVBQUNDLEtBQUQsUUFBNkc7QUFBQSw0QkFBbkdDLFNBQW1HO0FBQUEsTUFBbkdBLFNBQW1HLGtDQUF2RixXQUF1RjtBQUFBLHdCQUExRUMsS0FBMEU7QUFBQSxNQUExRUEsS0FBMEUsOEJBQWxFLEtBQWtFO0FBQUEsd0JBQTNEQyxLQUEyRDtBQUFBLE1BQTNEQSxLQUEyRCw4QkFBbkQsS0FBbUQ7QUFBQSw4QkFBNUNDLFdBQTRDO0FBQUEsTUFBNUNBLFdBQTRDLG9DQUE5QixLQUE4QjtBQUFBLDJCQUF2QkMsUUFBdUI7QUFBQSxNQUF2QkEsUUFBdUIsaUNBQVosS0FBWTs7QUFDMUhOLFFBQU0sK0JBQU4sRUFBdUNDLE1BQU1NLFNBQTdDOztBQUVBUCxRQUFNLFNBQU4sRUFBaUIsRUFBRUUsb0JBQUYsRUFBYUMsWUFBYixFQUFvQkMsWUFBcEIsRUFBakI7O0FBRUEsTUFBTUksYUFBYVAsTUFBTVEsVUFBTixDQUFpQkQsVUFBcEM7QUFDQSxNQUFNRSxTQUFTVCxNQUFNVSxVQUFOLENBQWlCRCxNQUFqQixDQUF3QlQsTUFBTU0sU0FBOUIsQ0FBZjs7QUFFQSxNQUFJSyxXQUFXLEVBQWY7QUFDQSxNQUFJVCxVQUFVLEtBQWQs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LFFBQVIsRUFBa0JDLE1BQU0sR0FBeEI7QUFQeUIsS0FBakM7O0FBVUExRixVQUFNZ0QsU0FBTixDQUFnQkQsVUFBaEIsR0FBNkIsWUFBdUI7QUFBQSxVQUFkSSxPQUFjLHVFQUFKLEVBQUk7O0FBQ2xELFVBQUkvQyxXQUFKLEVBQWlCK0MsUUFBUS9DLFdBQVIsR0FBc0IrQyxRQUFRd0MsV0FBUixHQUFzQnhDLFFBQVF3QyxXQUFSLENBQW9CQyxNQUExQyxHQUFtRCxJQUF6RTtBQUNqQixVQUFJdkYsWUFBWThDLFFBQVEvQyxXQUF4QixFQUFxQytDLFFBQVE5QyxRQUFSLEdBQW1CLE1BQW5CO0FBQ3JDLGFBQU8sS0FBSzRDLE9BQUwsQ0FBYUUsT0FBYixFQUFzQmpCLElBQXRCLENBQTJCLFlBQVc7QUFDM0MsZUFBTyxFQUFFcUMsT0FBTyxDQUFULEVBQVA7QUFDRCxPQUZNLENBQVA7QUFHRCxLQU5EO0FBT0Q7QUFDRixDOztBQUVELElBQUl0QyxTQUFTLFNBQVRBLE1BQVMsR0FBVztBQUN0QixTQUFPcEMsT0FBT2dHLFVBQVAsQ0FBa0IsUUFBbEIsRUFBNEJDLEtBQUtDLE1BQUwsR0FBY0MsUUFBZCxDQUF1QixFQUF2QixFQUEyQkMsTUFBM0IsQ0FBa0MsQ0FBbEMsQ0FBNUIsRUFBa0VDLE1BQWxFLENBQXlFLEtBQXpFLEVBQWdGRCxNQUFoRixDQUF1RixDQUF2RixFQUEwRixDQUExRixDQUFQO0FBQ0QsQ0FGRCIsImZpbGUiOiJzb2Z0LWRlbGV0ZS5qcyIsInNvdXJjZXNDb250ZW50IjpbInZhciBjcnlwdG8gPSByZXF1aXJlKCdjcnlwdG8nKTtcblxuaW1wb3J0IF9kZWJ1ZyBmcm9tICcuL2RlYnVnJztcbmNvbnN0IGRlYnVnID0gX2RlYnVnKCk7XG5cbmV4cG9ydCBkZWZhdWx0IChNb2RlbCwgeyBkZWxldGVkQXQgPSAnZGVsZXRlZEF0Jywgc2NydWIgPSBmYWxzZSwgaW5kZXggPSBmYWxzZSwgZGVsZXRlZEJ5SWQgPSBmYWxzZSwgZGVsZXRlT3AgPSBmYWxzZSB9KSA9PiB7XG4gIGRlYnVnKCdTb2Z0RGVsZXRlIG1peGluIGZvciBNb2RlbCAlcycsIE1vZGVsLm1vZGVsTmFtZSk7XG5cbiAgZGVidWcoJ29wdGlvbnMnLCB7IGRlbGV0ZWRBdCwgc2NydWIsIGluZGV4IH0pO1xuXG4gIGNvbnN0IHByb3BlcnRpZXMgPSBNb2RlbC5kZWZpbml0aW9uLnByb3BlcnRpZXM7XG4gIGNvbnN0IGlkTmFtZSA9IE1vZGVsLmRhdGFTb3VyY2UuaWROYW1lKE1vZGVsLm1vZGVsTmFtZSk7XG5cbiAgbGV0IHNjcnViYmVkID0ge307XG4gIGlmIChzY3J1YiAhPT0gZmFsc2UpIHtcbiAgICBsZXQgcHJvcGVydGllc1RvU2NydWIgPSBzY3J1YjtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkocHJvcGVydGllc1RvU2NydWIpKSB7XG4gICAgICBwcm9wZXJ0aWVzVG9TY3J1YiA9IE9iamVjdC5rZXlzKHByb3BlcnRpZXMpXG4gICAgICAgIC5maWx0ZXIocHJvcCA9PiAhcHJvcGVydGllc1twcm9wXVtpZE5hbWVdICYmIHByb3AgIT09IGRlbGV0ZWRBdCk7XG4gICAgfVxuICAgIHNjcnViYmVkID0gcHJvcGVydGllc1RvU2NydWIucmVkdWNlKChvYmosIHByb3ApID0+ICh7IC4uLm9iaiwgW3Byb3BdOiBudWxsIH0pLCB7fSk7XG4gIH1cblxuICBNb2RlbC5kZWZpbmVQcm9wZXJ0eShkZWxldGVkQXQsIHsgdHlwZTogRGF0ZSwgcmVxdWlyZWQ6IGZhbHNlLCBkZWZhdWx0OiBudWxsIH0pO1xuICBpZiAoaW5kZXgpIE1vZGVsLmRlZmluZVByb3BlcnR5KCdkZWxldGVJbmRleCcsIHsgdHlwZTogU3RyaW5nLCByZXF1aXJlZDogdHJ1ZSwgZGVmYXVsdDogJ251bGwnIH0pO1xuICBpZiAoZGVsZXRlZEJ5SWQpIE1vZGVsLmRlZmluZVByb3BlcnR5KCdkZWxldGVkQnlJZCcsIHsgdHlwZTogTnVtYmVyLCByZXF1aXJlZDogZmFsc2UsIGRlZmF1bHQ6IG51bGwgfSk7XG4gIGlmIChkZWxldGVPcCkgTW9kZWwuZGVmaW5lUHJvcGVydHkoJ2RlbGV0ZU9wJywgeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiBmYWxzZSwgZGVmYXVsdDogbnVsbCB9KTtcblxuICB2YXIgX2Rlc3Ryb3lBbGwgPSBNb2RlbC5kZXN0cm95QWxsO1xuXG4gIE1vZGVsLmRlc3Ryb3lBbGwgPSBmdW5jdGlvbiBzb2Z0RGVzdHJveUFsbCh3aGVyZSwgY2IpIHtcbiAgICB2YXIgZGVsZXRlUHJvbWlzZSA9IGluZGV4ID8gTW9kZWwudXBkYXRlQWxsKHdoZXJlLCB7IC4uLnNjcnViYmVkLCBbZGVsZXRlZEF0XTogbmV3IERhdGUoKSwgZGVsZXRlSW5kZXg6IGdlbktleSgpIH0pIDpcbiAgICAgIE1vZGVsLnVwZGF0ZUFsbCh3aGVyZSwgeyAuLi5zY3J1YmJlZCwgW2RlbGV0ZWRBdF06IG5ldyBEYXRlKCkgfSk7XG5cbiAgICByZXR1cm4gZGVsZXRlUHJvbWlzZVxuICAgICAgLnRoZW4ocmVzdWx0ID0+ICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpID8gY2IobnVsbCwgcmVzdWx0KSA6IHJlc3VsdClcbiAgICAgIC5jYXRjaChlcnJvciA9PiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSA/IGNiKGVycm9yKSA6IFByb21pc2UucmVqZWN0KGVycm9yKSk7XG4gIH07XG5cbiAgTW9kZWwucmVtb3ZlID0gTW9kZWwuZGVzdHJveUFsbDtcbiAgTW9kZWwuZGVsZXRlQWxsID0gTW9kZWwuZGVzdHJveUFsbDtcblxuICBNb2RlbC5oYXJkRGVzdHJveUFsbCA9IGZ1bmN0aW9uIGhhcmREZXN0cm95QWxsKHdoZXJlLCBjYikge1xuICAgIHJldHVybiBfZGVzdHJveUFsbC5jYWxsKE1vZGVsLCB3aGVyZSwgY2IpO1xuICB9O1xuXG4gIE1vZGVsLmRlc3Ryb3lCeUlkID0gZnVuY3Rpb24gc29mdERlc3Ryb3lCeUlkKGlkLCBjYikge1xuICAgIHZhciBkZWxldGVQcm9taXNlID0gaW5kZXggPyBNb2RlbC51cGRhdGVBbGwoeyBbaWROYW1lXTogaWQgfSwgeyAuLi5zY3J1YmJlZCwgW2RlbGV0ZWRBdF06IG5ldyBEYXRlKCksIGRlbGV0ZUluZGV4OiBnZW5LZXkoKSB9KSA6XG4gICAgICBNb2RlbC51cGRhdGVBbGwoeyBbaWROYW1lXTogaWQgfSwgeyAuLi5zY3J1YmJlZCwgW2RlbGV0ZWRBdF06IG5ldyBEYXRlKCkgfSk7XG5cbiAgICByZXR1cm4gZGVsZXRlUHJvbWlzZVxuICAgICAgLnRoZW4ocmVzdWx0ID0+ICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpID8gY2IobnVsbCwgcmVzdWx0KSA6IHJlc3VsdClcbiAgICAgIC5jYXRjaChlcnJvciA9PiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSA/IGNiKGVycm9yKSA6IFByb21pc2UucmVqZWN0KGVycm9yKSk7XG4gIH07XG5cbiAgTW9kZWwucmVtb3ZlQnlJZCA9IE1vZGVsLmRlc3Ryb3lCeUlkO1xuICBNb2RlbC5kZWxldGVCeUlkID0gTW9kZWwuZGVzdHJveUJ5SWQ7XG5cbiAgTW9kZWwucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiBzb2Z0RGVzdHJveShvcHRpb25zLCBjYikge1xuICAgIGNvbnN0IGNhbGxiYWNrID0gKGNiID09PSB1bmRlZmluZWQgJiYgdHlwZW9mIG9wdGlvbnMgPT09ICdmdW5jdGlvbicpID8gb3B0aW9ucyA6IGNiO1xuICAgIGxldCBkYXRhID0ge1xuICAgICAgLi4uc2NydWJiZWQsXG4gICAgICBbZGVsZXRlZEF0XTogbmV3IERhdGUoKVxuICAgIH07XG4gICAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gICAgb3B0aW9ucy5kZWxldGUgPSB0cnVlO1xuICAgIGlmIChpbmRleCkgZGF0YS5kZWxldGVJbmRleCA9IGdlbktleSgpO1xuICAgIGlmIChkZWxldGVkQnlJZCAmJiBvcHRpb25zLmRlbGV0ZWRCeUlkKSBkYXRhLmRlbGV0ZWRCeUlkID0gb3B0aW9ucy5kZWxldGVkQnlJZDtcbiAgICBpZiAoZGVsZXRlT3AgJiYgb3B0aW9ucy5kZWxldGVPcCkgZGF0YS5kZWxldGVPcCA9IG9wdGlvbnMuZGVsZXRlT3A7XG5cbiAgICByZXR1cm4gdGhpcy51cGRhdGVBdHRyaWJ1dGVzKGRhdGEsIG9wdGlvbnMpXG4gICAgICAudGhlbihyZXN1bHQgPT4gKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgPyBjYWxsYmFjayhudWxsLCByZXN1bHQpIDogcmVzdWx0KVxuICAgICAgLmNhdGNoKGVycm9yID0+ICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpID8gY2FsbGJhY2soZXJyb3IpIDogUHJvbWlzZS5yZWplY3QoZXJyb3IpKTtcbiAgfTtcblxuICBNb2RlbC5wcm90b3R5cGUucmVtb3ZlID0gTW9kZWwucHJvdG90eXBlLmRlc3Ryb3k7XG4gIE1vZGVsLnByb3RvdHlwZS5kZWxldGUgPSBNb2RlbC5wcm90b3R5cGUuZGVzdHJveTtcblxuICAvLyBFbXVsYXRlIGRlZmF1bHQgc2NvcGUgYnV0IHdpdGggbW9yZSBmbGV4aWJpbGl0eS5cbiAgY29uc3QgcXVlcnlOb25EZWxldGVkID0geyBbZGVsZXRlZEF0XTogbnVsbCB9O1xuXG4gIGNvbnN0IF9maW5kT3JDcmVhdGUgPSBNb2RlbC5maW5kT3JDcmVhdGU7XG4gIE1vZGVsLmZpbmRPckNyZWF0ZSA9IGZ1bmN0aW9uIGZpbmRPckNyZWF0ZURlbGV0ZWQocXVlcnkgPSB7fSwgLi4ucmVzdCkge1xuICAgIGlmICghcXVlcnkuZGVsZXRlZCkge1xuICAgICAgaWYgKCFxdWVyeS53aGVyZSB8fCBPYmplY3Qua2V5cyhxdWVyeS53aGVyZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHF1ZXJ5LndoZXJlID0gcXVlcnlOb25EZWxldGVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlcnkud2hlcmUgPSB7IGFuZDogW3F1ZXJ5LndoZXJlLCBxdWVyeU5vbkRlbGV0ZWRdIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9maW5kT3JDcmVhdGUuY2FsbChNb2RlbCwgcXVlcnksIC4uLnJlc3QpO1xuICB9O1xuXG4gIGNvbnN0IF9maW5kID0gTW9kZWwuZmluZDtcbiAgTW9kZWwuZmluZCA9IGZ1bmN0aW9uIGZpbmREZWxldGVkKHF1ZXJ5ID0ge30sIC4uLnJlc3QpIHtcbiAgICBpZiAoIXF1ZXJ5LmRlbGV0ZWQpIHtcbiAgICAgIGlmICghcXVlcnkud2hlcmUgfHwgT2JqZWN0LmtleXMocXVlcnkud2hlcmUpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICBxdWVyeS53aGVyZSA9IHF1ZXJ5Tm9uRGVsZXRlZDtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXJ5LndoZXJlID0geyBhbmQ6IFtxdWVyeS53aGVyZSwgcXVlcnlOb25EZWxldGVkXSB9O1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBfZmluZC5jYWxsKE1vZGVsLCBxdWVyeSwgLi4ucmVzdCk7XG4gIH07XG5cbiAgY29uc3QgX2NvdW50ID0gTW9kZWwuY291bnQ7XG4gIE1vZGVsLmNvdW50ID0gZnVuY3Rpb24gY291bnREZWxldGVkKHdoZXJlID0ge30sIC4uLnJlc3QpIHtcbiAgICAvLyBCZWNhdXNlIGNvdW50IG9ubHkgcmVjZWl2ZXMgYSAnd2hlcmUnLCB0aGVyZSdzIG5vd2hlcmUgdG8gYXNrIGZvciB0aGUgZGVsZXRlZCBlbnRpdGllcy5cbiAgICBsZXQgd2hlcmVOb3REZWxldGVkO1xuICAgIGlmICghd2hlcmUgfHwgT2JqZWN0LmtleXMod2hlcmUpLmxlbmd0aCA9PT0gMCkge1xuICAgICAgd2hlcmVOb3REZWxldGVkID0gcXVlcnlOb25EZWxldGVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aGVyZU5vdERlbGV0ZWQgPSB7IGFuZDogW3doZXJlLCBxdWVyeU5vbkRlbGV0ZWRdIH07XG4gICAgfVxuICAgIHJldHVybiBfY291bnQuY2FsbChNb2RlbCwgd2hlcmVOb3REZWxldGVkLCAuLi5yZXN0KTtcbiAgfTtcblxuICBjb25zdCBfdXBkYXRlID0gTW9kZWwudXBkYXRlO1xuICBNb2RlbC51cGRhdGUgPSBNb2RlbC51cGRhdGVBbGwgPSBmdW5jdGlvbiB1cGRhdGVEZWxldGVkKHdoZXJlID0ge30sIC4uLnJlc3QpIHtcbiAgICAvLyBCZWNhdXNlIHVwZGF0ZS91cGRhdGVBbGwgb25seSByZWNlaXZlcyBhICd3aGVyZScsIHRoZXJlJ3Mgbm93aGVyZSB0byBhc2sgZm9yIHRoZSBkZWxldGVkIGVudGl0aWVzLlxuICAgIGxldCB3aGVyZU5vdERlbGV0ZWQ7XG4gICAgaWYgKCF3aGVyZSB8fCBPYmplY3Qua2V5cyh3aGVyZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICB3aGVyZU5vdERlbGV0ZWQgPSBxdWVyeU5vbkRlbGV0ZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoZXJlTm90RGVsZXRlZCA9IHsgYW5kOiBbd2hlcmUsIHF1ZXJ5Tm9uRGVsZXRlZF0gfTtcbiAgICB9XG4gICAgcmV0dXJuIF91cGRhdGUuY2FsbChNb2RlbCwgd2hlcmVOb3REZWxldGVkLCAuLi5yZXN0KTtcbiAgfTtcblxuICBpZiAoTW9kZWwuc2V0dGluZ3MucmVtb3RpbmcgJiYgTW9kZWwuc2V0dGluZ3MucmVtb3Rpbmcuc2hhcmVkTWV0aG9kcy5kZWxldGVCeUlkICE9PSBmYWxzZSAmJiAoZGVsZXRlZEJ5SWQgfHwgZGVsZXRlT3ApKSB7XG4gICAgTW9kZWwuZGlzYWJsZVJlbW90ZU1ldGhvZEJ5TmFtZSgnZGVsZXRlQnlJZCcpO1xuXG4gICAgTW9kZWwucmVtb3RlTWV0aG9kKCdkZWxldGVCeUlkJywge1xuICAgICAgYWNjZXNzVHlwZTogJ1dSSVRFJyxcbiAgICAgIGlzU3RhdGljOiBmYWxzZSxcbiAgICAgIGFjY2VwdHM6IFtcbiAgICAgICAgeyBhcmc6ICdvcHRpb25zJywgdHlwZTogJ29iamVjdCcsIGh0dHA6ICdvcHRpb25zRnJvbVJlcXVlc3QnIH1cbiAgICAgIF0sXG4gICAgICByZXR1cm5zOiB7IGFyZzogJ2RhdGEnLCB0eXBlOiAnb2JqZWN0Jywgcm9vdDogdHJ1ZSB9LFxuICAgICAgaHR0cDogeyB2ZXJiOiAnZGVsZXRlJywgcGF0aDogJy8nIH0sXG4gICAgfSk7XG5cbiAgICBNb2RlbC5wcm90b3R5cGUuZGVsZXRlQnlJZCA9IGZ1bmN0aW9uKG9wdGlvbnMgPSB7fSkge1xuICAgICAgaWYgKGRlbGV0ZWRCeUlkKSBvcHRpb25zLmRlbGV0ZWRCeUlkID0gb3B0aW9ucy5hY2Nlc3NUb2tlbiA/IG9wdGlvbnMuYWNjZXNzVG9rZW4udXNlcklkIDogbnVsbDtcbiAgICAgIGlmIChkZWxldGVPcCAmJiBvcHRpb25zLmRlbGV0ZWRCeUlkKSBvcHRpb25zLmRlbGV0ZU9wID0gJ3VzZXInO1xuICAgICAgcmV0dXJuIHRoaXMuZGVzdHJveShvcHRpb25zKS50aGVuKGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4geyBjb3VudDogMSB9O1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufTtcblxudmFyIGdlbktleSA9IGZ1bmN0aW9uKCkge1xuICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhtYWMoJ3NoYTI1NicsIE1hdGgucmFuZG9tKCkudG9TdHJpbmcoMTIpLnN1YnN0cigyKSkuZGlnZXN0KCdoZXgnKS5zdWJzdHIoMCwgOCk7XG59O1xuIl19
