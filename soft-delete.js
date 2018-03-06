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

  var destroyAll = Model.destroyAll;

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

  Model.hardRemove = destroyAll;
  Model.hardDeleteAll = destroyAll;
  Model.hardDestroyAll = destroyAll;

  var hardDestroyById = Model.destroyById;

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

  Model.hardDestroyById = hardDestroyById;
  Model.hardRemoveById = Model.hardDestroyById;
  Model.deleteById = Model.hardDestroyById;

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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNvZnQtZGVsZXRlLmpzIl0sIm5hbWVzIjpbImNyeXB0byIsInJlcXVpcmUiLCJkZWJ1ZyIsIk1vZGVsIiwiZGVsZXRlZEF0Iiwic2NydWIiLCJpbmRleCIsImRlbGV0ZWRCeUlkIiwiZGVsZXRlT3AiLCJtb2RlbE5hbWUiLCJwcm9wZXJ0aWVzIiwiZGVmaW5pdGlvbiIsImlkTmFtZSIsImRhdGFTb3VyY2UiLCJzY3J1YmJlZCIsInByb3BlcnRpZXNUb1NjcnViIiwiQXJyYXkiLCJpc0FycmF5IiwiZmlsdGVyIiwicHJvcCIsInJlZHVjZSIsIm9iaiIsImRlZmluZVByb3BlcnR5IiwidHlwZSIsIkRhdGUiLCJyZXF1aXJlZCIsImRlZmF1bHQiLCJTdHJpbmciLCJOdW1iZXIiLCJkZXN0cm95QWxsIiwic29mdERlc3Ryb3lBbGwiLCJ3aGVyZSIsImNiIiwiZGVsZXRlUHJvbWlzZSIsInVwZGF0ZUFsbCIsImdlbktleSIsInRoZW4iLCJyZXN1bHQiLCJjYXRjaCIsImVycm9yIiwicmVqZWN0IiwicmVtb3ZlIiwiZGVsZXRlQWxsIiwiaGFyZFJlbW92ZSIsImhhcmREZWxldGVBbGwiLCJoYXJkRGVzdHJveUFsbCIsImhhcmREZXN0cm95QnlJZCIsImRlc3Ryb3lCeUlkIiwic29mdERlc3Ryb3lCeUlkIiwiaWQiLCJyZW1vdmVCeUlkIiwiZGVsZXRlQnlJZCIsImhhcmRSZW1vdmVCeUlkIiwicHJvdG90eXBlIiwiZGVzdHJveSIsInNvZnREZXN0cm95Iiwib3B0aW9ucyIsImNhbGxiYWNrIiwidW5kZWZpbmVkIiwiZGF0YSIsImRlbGV0ZSIsImRlbGV0ZUluZGV4IiwidXBkYXRlQXR0cmlidXRlcyIsInF1ZXJ5Tm9uRGVsZXRlZCIsIl9maW5kT3JDcmVhdGUiLCJmaW5kT3JDcmVhdGUiLCJmaW5kT3JDcmVhdGVEZWxldGVkIiwicXVlcnkiLCJkZWxldGVkIiwibGVuZ3RoIiwiYW5kIiwicmVzdCIsImNhbGwiLCJfZmluZCIsImZpbmQiLCJmaW5kRGVsZXRlZCIsIl9jb3VudCIsImNvdW50IiwiY291bnREZWxldGVkIiwid2hlcmVOb3REZWxldGVkIiwiX3VwZGF0ZSIsInVwZGF0ZSIsInVwZGF0ZURlbGV0ZWQiLCJzZXR0aW5ncyIsInJlbW90aW5nIiwic2hhcmVkTWV0aG9kcyIsImRpc2FibGVSZW1vdGVNZXRob2RCeU5hbWUiLCJyZW1vdGVNZXRob2QiLCJhY2Nlc3NUeXBlIiwiaXNTdGF0aWMiLCJhY2NlcHRzIiwiYXJnIiwiaHR0cCIsInJldHVybnMiLCJyb290IiwidmVyYiIsInBhdGgiLCJhY2Nlc3NUb2tlbiIsInVzZXJJZCIsImNyZWF0ZUhtYWMiLCJNYXRoIiwicmFuZG9tIiwidG9TdHJpbmciLCJzdWJzdHIiLCJkaWdlc3QiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFFQTs7Ozs7O0FBRkEsSUFBSUEsU0FBU0MsUUFBUSxRQUFSLENBQWI7O0FBR0EsSUFBTUMsUUFBUSxzQkFBZDs7a0JBRWUsVUFBQ0MsS0FBRCxRQUE2RztBQUFBLDRCQUFuR0MsU0FBbUc7QUFBQSxNQUFuR0EsU0FBbUcsa0NBQXZGLFdBQXVGO0FBQUEsd0JBQTFFQyxLQUEwRTtBQUFBLE1BQTFFQSxLQUEwRSw4QkFBbEUsS0FBa0U7QUFBQSx3QkFBM0RDLEtBQTJEO0FBQUEsTUFBM0RBLEtBQTJELDhCQUFuRCxLQUFtRDtBQUFBLDhCQUE1Q0MsV0FBNEM7QUFBQSxNQUE1Q0EsV0FBNEMsb0NBQTlCLEtBQThCO0FBQUEsMkJBQXZCQyxRQUF1QjtBQUFBLE1BQXZCQSxRQUF1QixpQ0FBWixLQUFZOztBQUMxSE4sUUFBTSwrQkFBTixFQUF1Q0MsTUFBTU0sU0FBN0M7O0FBRUFQLFFBQU0sU0FBTixFQUFpQixFQUFFRSxvQkFBRixFQUFhQyxZQUFiLEVBQW9CQyxZQUFwQixFQUFqQjs7QUFFQSxNQUFNSSxhQUFhUCxNQUFNUSxVQUFOLENBQWlCRCxVQUFwQztBQUNBLE1BQU1FLFNBQVNULE1BQU1VLFVBQU4sQ0FBaUJELE1BQWpCLENBQXdCVCxNQUFNTSxTQUE5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LFNBQVAsRUFBa0JwRSxNQUFNLFFBQXhCLEVBQWtDcUUsTUFBTSxvQkFBeEMsRUFETyxDQUhzQjtBQU0vQkMsZUFBUyxFQUFFRixLQUFLLE1BQVAsRUFBZXBFLE1BQU0sUUFBckIsRUFBK0J1RSxNQUFNLElBQXJDLEVBTnNCO0FBTy9CRixZQUFNLEVBQUVHLE1BQU0sUUFBUixFQUFrQkMsTUFBTSxHQUF4QjtBQVB5QixLQUFqQzs7QUFVQTdGLFVBQU1rRCxTQUFOLENBQWdCRixVQUFoQixHQUE2QixZQUF1QjtBQUFBLFVBQWRLLE9BQWMsdUVBQUosRUFBSTs7QUFDbEQsVUFBSWpELFdBQUosRUFBaUJpRCxRQUFRakQsV0FBUixHQUFzQmlELFFBQVF5QyxXQUFSLEdBQXNCekMsUUFBUXlDLFdBQVIsQ0FBb0JDLE1BQTFDLEdBQW1ELElBQXpFO0FBQ2pCLFVBQUkxRixZQUFZZ0QsUUFBUWpELFdBQXhCLEVBQXFDaUQsUUFBUWhELFFBQVIsR0FBbUIsTUFBbkI7QUFDckMsYUFBTyxLQUFLOEMsT0FBTCxDQUFhRSxPQUFiLEVBQXNCcEIsSUFBdEIsQ0FBMkIsWUFBVztBQUMzQyxlQUFPLEVBQUV5QyxPQUFPLENBQVQsRUFBUDtBQUNELE9BRk0sQ0FBUDtBQUdELEtBTkQ7QUFPRDtBQUNGLEM7O0FBRUQsSUFBSTFDLFNBQVMsU0FBVEEsTUFBUyxHQUFXO0FBQ3RCLFNBQU9uQyxPQUFPbUcsVUFBUCxDQUFrQixRQUFsQixFQUE0QkMsS0FBS0MsTUFBTCxHQUFjQyxRQUFkLENBQXVCLEVBQXZCLEVBQTJCQyxNQUEzQixDQUFrQyxDQUFsQyxDQUE1QixFQUFrRUMsTUFBbEUsQ0FBeUUsS0FBekUsRUFBZ0ZELE1BQWhGLENBQXVGLENBQXZGLEVBQTBGLENBQTFGLENBQVA7QUFDRCxDQUZEIiwiZmlsZSI6InNvZnQtZGVsZXRlLmpzIiwic291cmNlc0NvbnRlbnQiOlsidmFyIGNyeXB0byA9IHJlcXVpcmUoJ2NyeXB0bycpO1xuXG5pbXBvcnQgX2RlYnVnIGZyb20gJy4vZGVidWcnO1xuY29uc3QgZGVidWcgPSBfZGVidWcoKTtcblxuZXhwb3J0IGRlZmF1bHQgKE1vZGVsLCB7IGRlbGV0ZWRBdCA9ICdkZWxldGVkQXQnLCBzY3J1YiA9IGZhbHNlLCBpbmRleCA9IGZhbHNlLCBkZWxldGVkQnlJZCA9IGZhbHNlLCBkZWxldGVPcCA9IGZhbHNlIH0pID0+IHtcbiAgZGVidWcoJ1NvZnREZWxldGUgbWl4aW4gZm9yIE1vZGVsICVzJywgTW9kZWwubW9kZWxOYW1lKTtcblxuICBkZWJ1Zygnb3B0aW9ucycsIHsgZGVsZXRlZEF0LCBzY3J1YiwgaW5kZXggfSk7XG5cbiAgY29uc3QgcHJvcGVydGllcyA9IE1vZGVsLmRlZmluaXRpb24ucHJvcGVydGllcztcbiAgY29uc3QgaWROYW1lID0gTW9kZWwuZGF0YVNvdXJjZS5pZE5hbWUoTW9kZWwubW9kZWxOYW1lKTtcblxuICBsZXQgc2NydWJiZWQgPSB7fTtcbiAgaWYgKHNjcnViICE9PSBmYWxzZSkge1xuICAgIGxldCBwcm9wZXJ0aWVzVG9TY3J1YiA9IHNjcnViO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShwcm9wZXJ0aWVzVG9TY3J1YikpIHtcbiAgICAgIHByb3BlcnRpZXNUb1NjcnViID0gT2JqZWN0LmtleXMocHJvcGVydGllcylcbiAgICAgICAgLmZpbHRlcihwcm9wID0+ICFwcm9wZXJ0aWVzW3Byb3BdW2lkTmFtZV0gJiYgcHJvcCAhPT0gZGVsZXRlZEF0KTtcbiAgICB9XG4gICAgc2NydWJiZWQgPSBwcm9wZXJ0aWVzVG9TY3J1Yi5yZWR1Y2UoKG9iaiwgcHJvcCkgPT4gKHsgLi4ub2JqLCBbcHJvcF06IG51bGwgfSksIHt9KTtcbiAgfVxuXG4gIE1vZGVsLmRlZmluZVByb3BlcnR5KGRlbGV0ZWRBdCwgeyB0eXBlOiBEYXRlLCByZXF1aXJlZDogZmFsc2UsIGRlZmF1bHQ6IG51bGwgfSk7XG4gIGlmIChpbmRleCkgTW9kZWwuZGVmaW5lUHJvcGVydHkoJ2RlbGV0ZUluZGV4JywgeyB0eXBlOiBTdHJpbmcsIHJlcXVpcmVkOiB0cnVlLCBkZWZhdWx0OiAnbnVsbCcgfSk7XG4gIGlmIChkZWxldGVkQnlJZCkgTW9kZWwuZGVmaW5lUHJvcGVydHkoJ2RlbGV0ZWRCeUlkJywgeyB0eXBlOiBOdW1iZXIsIHJlcXVpcmVkOiBmYWxzZSwgZGVmYXVsdDogbnVsbCB9KTtcbiAgaWYgKGRlbGV0ZU9wKSBNb2RlbC5kZWZpbmVQcm9wZXJ0eSgnZGVsZXRlT3AnLCB7IHR5cGU6IFN0cmluZywgcmVxdWlyZWQ6IGZhbHNlLCBkZWZhdWx0OiBudWxsIH0pO1xuXG4gIHZhciBkZXN0cm95QWxsID0gTW9kZWwuZGVzdHJveUFsbDtcblxuICBNb2RlbC5kZXN0cm95QWxsID0gZnVuY3Rpb24gc29mdERlc3Ryb3lBbGwod2hlcmUsIGNiKSB7XG4gICAgdmFyIGRlbGV0ZVByb21pc2UgPSBpbmRleCA/IE1vZGVsLnVwZGF0ZUFsbCh3aGVyZSwgeyAuLi5zY3J1YmJlZCwgW2RlbGV0ZWRBdF06IG5ldyBEYXRlKCksIGRlbGV0ZUluZGV4OiBnZW5LZXkoKSB9KSA6XG4gICAgICBNb2RlbC51cGRhdGVBbGwod2hlcmUsIHsgLi4uc2NydWJiZWQsIFtkZWxldGVkQXRdOiBuZXcgRGF0ZSgpIH0pO1xuXG4gICAgcmV0dXJuIGRlbGV0ZVByb21pc2VcbiAgICAgIC50aGVuKHJlc3VsdCA9PiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSA/IGNiKG51bGwsIHJlc3VsdCkgOiByZXN1bHQpXG4gICAgICAuY2F0Y2goZXJyb3IgPT4gKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgPyBjYihlcnJvcikgOiBQcm9taXNlLnJlamVjdChlcnJvcikpO1xuICB9O1xuXG4gIE1vZGVsLnJlbW92ZSA9IE1vZGVsLmRlc3Ryb3lBbGw7XG4gIE1vZGVsLmRlbGV0ZUFsbCA9IE1vZGVsLmRlc3Ryb3lBbGw7XG5cbiAgTW9kZWwuaGFyZFJlbW92ZSA9IGRlc3Ryb3lBbGw7XG4gIE1vZGVsLmhhcmREZWxldGVBbGwgPSBkZXN0cm95QWxsO1xuICBNb2RlbC5oYXJkRGVzdHJveUFsbCA9IGRlc3Ryb3lBbGw7XG5cbiAgdmFyIGhhcmREZXN0cm95QnlJZCA9IE1vZGVsLmRlc3Ryb3lCeUlkO1xuXG4gIE1vZGVsLmRlc3Ryb3lCeUlkID0gZnVuY3Rpb24gc29mdERlc3Ryb3lCeUlkKGlkLCBjYikge1xuICAgIHZhciBkZWxldGVQcm9taXNlID0gaW5kZXggPyBNb2RlbC51cGRhdGVBbGwoeyBbaWROYW1lXTogaWQgfSwgeyAuLi5zY3J1YmJlZCwgW2RlbGV0ZWRBdF06IG5ldyBEYXRlKCksIGRlbGV0ZUluZGV4OiBnZW5LZXkoKSB9KSA6XG4gICAgICBNb2RlbC51cGRhdGVBbGwoeyBbaWROYW1lXTogaWQgfSwgeyAuLi5zY3J1YmJlZCwgW2RlbGV0ZWRBdF06IG5ldyBEYXRlKCkgfSk7XG5cbiAgICByZXR1cm4gZGVsZXRlUHJvbWlzZVxuICAgICAgLnRoZW4ocmVzdWx0ID0+ICh0eXBlb2YgY2IgPT09ICdmdW5jdGlvbicpID8gY2IobnVsbCwgcmVzdWx0KSA6IHJlc3VsdClcbiAgICAgIC5jYXRjaChlcnJvciA9PiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSA/IGNiKGVycm9yKSA6IFByb21pc2UucmVqZWN0KGVycm9yKSk7XG4gIH07XG5cbiAgTW9kZWwucmVtb3ZlQnlJZCA9IE1vZGVsLmRlc3Ryb3lCeUlkO1xuICBNb2RlbC5kZWxldGVCeUlkID0gTW9kZWwuZGVzdHJveUJ5SWQ7XG5cbiAgTW9kZWwuaGFyZERlc3Ryb3lCeUlkID0gaGFyZERlc3Ryb3lCeUlkO1xuICBNb2RlbC5oYXJkUmVtb3ZlQnlJZCA9IE1vZGVsLmhhcmREZXN0cm95QnlJZDtcbiAgTW9kZWwuZGVsZXRlQnlJZCA9IE1vZGVsLmhhcmREZXN0cm95QnlJZDtcblxuICBNb2RlbC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uIHNvZnREZXN0cm95KG9wdGlvbnMsIGNiKSB7XG4gICAgY29uc3QgY2FsbGJhY2sgPSAoY2IgPT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygb3B0aW9ucyA9PT0gJ2Z1bmN0aW9uJykgPyBvcHRpb25zIDogY2I7XG4gICAgbGV0IGRhdGEgPSB7XG4gICAgICAuLi5zY3J1YmJlZCxcbiAgICAgIFtkZWxldGVkQXRdOiBuZXcgRGF0ZSgpXG4gICAgfTtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fTtcbiAgICBvcHRpb25zLmRlbGV0ZSA9IHRydWU7XG4gICAgaWYgKGluZGV4KSBkYXRhLmRlbGV0ZUluZGV4ID0gZ2VuS2V5KCk7XG4gICAgaWYgKGRlbGV0ZWRCeUlkICYmIG9wdGlvbnMuZGVsZXRlZEJ5SWQpIGRhdGEuZGVsZXRlZEJ5SWQgPSBvcHRpb25zLmRlbGV0ZWRCeUlkO1xuICAgIGlmIChkZWxldGVPcCAmJiBvcHRpb25zLmRlbGV0ZU9wKSBkYXRhLmRlbGV0ZU9wID0gb3B0aW9ucy5kZWxldGVPcDtcblxuICAgIHJldHVybiB0aGlzLnVwZGF0ZUF0dHJpYnV0ZXMoZGF0YSwgb3B0aW9ucylcbiAgICAgIC50aGVuKHJlc3VsdCA9PiAodHlwZW9mIGNiID09PSAnZnVuY3Rpb24nKSA/IGNhbGxiYWNrKG51bGwsIHJlc3VsdCkgOiByZXN1bHQpXG4gICAgICAuY2F0Y2goZXJyb3IgPT4gKHR5cGVvZiBjYiA9PT0gJ2Z1bmN0aW9uJykgPyBjYWxsYmFjayhlcnJvcikgOiBQcm9taXNlLnJlamVjdChlcnJvcikpO1xuICB9O1xuXG4gIE1vZGVsLnByb3RvdHlwZS5yZW1vdmUgPSBNb2RlbC5wcm90b3R5cGUuZGVzdHJveTtcbiAgTW9kZWwucHJvdG90eXBlLmRlbGV0ZSA9IE1vZGVsLnByb3RvdHlwZS5kZXN0cm95O1xuXG4gIC8vIEVtdWxhdGUgZGVmYXVsdCBzY29wZSBidXQgd2l0aCBtb3JlIGZsZXhpYmlsaXR5LlxuICBjb25zdCBxdWVyeU5vbkRlbGV0ZWQgPSB7IFtkZWxldGVkQXRdOiBudWxsIH07XG5cbiAgY29uc3QgX2ZpbmRPckNyZWF0ZSA9IE1vZGVsLmZpbmRPckNyZWF0ZTtcbiAgTW9kZWwuZmluZE9yQ3JlYXRlID0gZnVuY3Rpb24gZmluZE9yQ3JlYXRlRGVsZXRlZChxdWVyeSA9IHt9LCAuLi5yZXN0KSB7XG4gICAgaWYgKCFxdWVyeS5kZWxldGVkKSB7XG4gICAgICBpZiAoIXF1ZXJ5LndoZXJlIHx8IE9iamVjdC5rZXlzKHF1ZXJ5LndoZXJlKS5sZW5ndGggPT09IDApIHtcbiAgICAgICAgcXVlcnkud2hlcmUgPSBxdWVyeU5vbkRlbGV0ZWQ7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxdWVyeS53aGVyZSA9IHsgYW5kOiBbcXVlcnkud2hlcmUsIHF1ZXJ5Tm9uRGVsZXRlZF0gfTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gX2ZpbmRPckNyZWF0ZS5jYWxsKE1vZGVsLCBxdWVyeSwgLi4ucmVzdCk7XG4gIH07XG5cbiAgY29uc3QgX2ZpbmQgPSBNb2RlbC5maW5kO1xuICBNb2RlbC5maW5kID0gZnVuY3Rpb24gZmluZERlbGV0ZWQocXVlcnkgPSB7fSwgLi4ucmVzdCkge1xuICAgIGlmICghcXVlcnkuZGVsZXRlZCkge1xuICAgICAgaWYgKCFxdWVyeS53aGVyZSB8fCBPYmplY3Qua2V5cyhxdWVyeS53aGVyZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHF1ZXJ5LndoZXJlID0gcXVlcnlOb25EZWxldGVkO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVlcnkud2hlcmUgPSB7IGFuZDogW3F1ZXJ5LndoZXJlLCBxdWVyeU5vbkRlbGV0ZWRdIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIF9maW5kLmNhbGwoTW9kZWwsIHF1ZXJ5LCAuLi5yZXN0KTtcbiAgfTtcblxuICBjb25zdCBfY291bnQgPSBNb2RlbC5jb3VudDtcbiAgTW9kZWwuY291bnQgPSBmdW5jdGlvbiBjb3VudERlbGV0ZWQod2hlcmUgPSB7fSwgLi4ucmVzdCkge1xuICAgIC8vIEJlY2F1c2UgY291bnQgb25seSByZWNlaXZlcyBhICd3aGVyZScsIHRoZXJlJ3Mgbm93aGVyZSB0byBhc2sgZm9yIHRoZSBkZWxldGVkIGVudGl0aWVzLlxuICAgIGxldCB3aGVyZU5vdERlbGV0ZWQ7XG4gICAgaWYgKCF3aGVyZSB8fCBPYmplY3Qua2V5cyh3aGVyZSkubGVuZ3RoID09PSAwKSB7XG4gICAgICB3aGVyZU5vdERlbGV0ZWQgPSBxdWVyeU5vbkRlbGV0ZWQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdoZXJlTm90RGVsZXRlZCA9IHsgYW5kOiBbd2hlcmUsIHF1ZXJ5Tm9uRGVsZXRlZF0gfTtcbiAgICB9XG4gICAgcmV0dXJuIF9jb3VudC5jYWxsKE1vZGVsLCB3aGVyZU5vdERlbGV0ZWQsIC4uLnJlc3QpO1xuICB9O1xuXG4gIGNvbnN0IF91cGRhdGUgPSBNb2RlbC51cGRhdGU7XG4gIE1vZGVsLnVwZGF0ZSA9IE1vZGVsLnVwZGF0ZUFsbCA9IGZ1bmN0aW9uIHVwZGF0ZURlbGV0ZWQod2hlcmUgPSB7fSwgLi4ucmVzdCkge1xuICAgIC8vIEJlY2F1c2UgdXBkYXRlL3VwZGF0ZUFsbCBvbmx5IHJlY2VpdmVzIGEgJ3doZXJlJywgdGhlcmUncyBub3doZXJlIHRvIGFzayBmb3IgdGhlIGRlbGV0ZWQgZW50aXRpZXMuXG4gICAgbGV0IHdoZXJlTm90RGVsZXRlZDtcbiAgICBpZiAoIXdoZXJlIHx8IE9iamVjdC5rZXlzKHdoZXJlKS5sZW5ndGggPT09IDApIHtcbiAgICAgIHdoZXJlTm90RGVsZXRlZCA9IHF1ZXJ5Tm9uRGVsZXRlZDtcbiAgICB9IGVsc2Uge1xuICAgICAgd2hlcmVOb3REZWxldGVkID0geyBhbmQ6IFt3aGVyZSwgcXVlcnlOb25EZWxldGVkXSB9O1xuICAgIH1cbiAgICByZXR1cm4gX3VwZGF0ZS5jYWxsKE1vZGVsLCB3aGVyZU5vdERlbGV0ZWQsIC4uLnJlc3QpO1xuICB9O1xuXG4gIGlmIChNb2RlbC5zZXR0aW5ncy5yZW1vdGluZyAmJiBNb2RlbC5zZXR0aW5ncy5yZW1vdGluZy5zaGFyZWRNZXRob2RzLmRlbGV0ZUJ5SWQgIT09IGZhbHNlICYmIChkZWxldGVkQnlJZCB8fCBkZWxldGVPcCkpIHtcbiAgICBNb2RlbC5kaXNhYmxlUmVtb3RlTWV0aG9kQnlOYW1lKCdkZWxldGVCeUlkJyk7XG5cbiAgICBNb2RlbC5yZW1vdGVNZXRob2QoJ2RlbGV0ZUJ5SWQnLCB7XG4gICAgICBhY2Nlc3NUeXBlOiAnV1JJVEUnLFxuICAgICAgaXNTdGF0aWM6IGZhbHNlLFxuICAgICAgYWNjZXB0czogW1xuICAgICAgICB7IGFyZzogJ29wdGlvbnMnLCB0eXBlOiAnb2JqZWN0JywgaHR0cDogJ29wdGlvbnNGcm9tUmVxdWVzdCcgfVxuICAgICAgXSxcbiAgICAgIHJldHVybnM6IHsgYXJnOiAnZGF0YScsIHR5cGU6ICdvYmplY3QnLCByb290OiB0cnVlIH0sXG4gICAgICBodHRwOiB7IHZlcmI6ICdkZWxldGUnLCBwYXRoOiAnLycgfSxcbiAgICB9KTtcblxuICAgIE1vZGVsLnByb3RvdHlwZS5kZWxldGVCeUlkID0gZnVuY3Rpb24ob3B0aW9ucyA9IHt9KSB7XG4gICAgICBpZiAoZGVsZXRlZEJ5SWQpIG9wdGlvbnMuZGVsZXRlZEJ5SWQgPSBvcHRpb25zLmFjY2Vzc1Rva2VuID8gb3B0aW9ucy5hY2Nlc3NUb2tlbi51c2VySWQgOiBudWxsO1xuICAgICAgaWYgKGRlbGV0ZU9wICYmIG9wdGlvbnMuZGVsZXRlZEJ5SWQpIG9wdGlvbnMuZGVsZXRlT3AgPSAndXNlcic7XG4gICAgICByZXR1cm4gdGhpcy5kZXN0cm95KG9wdGlvbnMpLnRoZW4oZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB7IGNvdW50OiAxIH07XG4gICAgICB9KTtcbiAgICB9O1xuICB9XG59O1xuXG52YXIgZ2VuS2V5ID0gZnVuY3Rpb24oKSB7XG4gIHJldHVybiBjcnlwdG8uY3JlYXRlSG1hYygnc2hhMjU2JywgTWF0aC5yYW5kb20oKS50b1N0cmluZygxMikuc3Vic3RyKDIpKS5kaWdlc3QoJ2hleCcpLnN1YnN0cigwLCA4KTtcbn07XG4iXX0=
