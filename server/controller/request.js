var Base = require("./base"),
    util = require("util"),
    constant = require("../core/constant"),
    lcUtil = require("../core/util"),
    _ = require("lodash"),
    moment = require("moment"),
    queryString = require('query-string');
var Request = function (config, logger, data) {
    Base.call(this, config, logger, data);

    var incRequestCount = function (request) {
        if (request) {
            request.increment('count');
        }
    };

    /**
     * Check request
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.checkRequest = function (req, res, next) {
        data.request.findById(req.params.id).then(function (request) {
            if (request) {
                req.request = request;
                next()
            } else {
                res.render("shared/404", {title: "Not-Found"})
            }
        }, next);
    };

    /**
     * create request
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.create = function (req, res, next) {
        var reqId = lcUtil.shortId();
        var index = Math.floor(Math.random() * constant.color.length);
        data.request.create({
            id       : reqId,
            createdAt: lcUtil.getNow(),
            sid      : req.sid,
            color    : constant.color[index]
        }).then(function () {
            res.redirect("/" + reqId + "/inspect");
        });
    };

    /**
     * 接受响应
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.response = function (req, res, next) {
        var reqId = req.params.id;
        var inspect = {
            id         : lcUtil.guid(),
            requestId  : reqId,
            createdAt  : lcUtil.getNow(),
            ip         : req.ip,
            originalUrl: req.originalUrl,
            headers    : req.headers ? JSON.stringify(req.headers) : null,
            query      : req.query ? JSON.stringify(req.query) : null,
            body       : req.rawBody
        };
        inspect.contentType = req.get('Content-Type') || "";
        inspect.length = parseInt(req.get('Content-Length') || 0);
        if (req.is("application/x-www-form-urlencoded") && inspect.body) {
            var parsed = queryString.parse(inspect.body);
            inspect.params = JSON.stringify(parsed);
        }
        inspect.method = constant.methods[req.method.toUpperCase()];
        data.inspect.create(inspect).then(function () {
            incRequestCount(req.request);
            res.send("ok");
        }, function (err) {
            next(err);
        });
    };

    /**
     * GET /api/requests
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.getRequestList = function (req, res, next) {
        data.request.findAll({
            where: {
                sid: req.sid
            },
            order: [['createdAt', 'DESC']]
        }).then(function (requests) {
            var _requests = _.map(requests, function (request) {
                return {
                    id   : request.id,
                    color: request.color,
                    count: request.count
                };
            });
            res.send({code: 200, data: _requests})
        })
    };

    /**
     * /api/requests/:id/inspects
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.getInspectList = function (req, res, next) {
        var reqId = req.params.id;
        data.inspect.findAll({
            where: {
                requestId: reqId
            },
            order: [['createdAt', 'DESC']]
        }).then(function (inspects) {
            var _inspects = _.map(inspects, function (inspecte) {
                var result = {
                    id         : inspecte.id,
                    method     : inspecte.method,
                    ip         : inspecte.ip,
                    query      : inspecte.query ? lcUtil.objectToArray(JSON.parse(inspecte.query)) : null,
                    params     : inspecte.params ? lcUtil.objectToArray(JSON.parse(inspecte.params)) : null,
                    headers    : inspecte.headers ? lcUtil.objectToArray(JSON.parse(inspecte.headers)) : null,
                    body       : inspecte.body,
                    createdAt  : inspecte.createdAt,
                    originalUrl: inspecte.originalUrl,
                    contentType: inspecte.contentType,
                    length     : inspecte.length,
                    isJson     : (inspecte.contentType || "").toLowerCase().indexOf("application/json") >= 0 ? true : false
                };
                if (result.headers) {
                    _.remove(result.headers, {key: "cookie"});
                }
                if (result.isJson && inspecte.body) {
                    var objBody = JSON.parse(inspecte.body);
                    if (!_.isEmpty(objBody)) {
                        result.body = JSON.stringify(objBody, null, 2);
                    }
                }
                return result;
            });
            res.send({code: 200, data: {inspects: _inspects, request: {id: req.request.id, color: req.request.color}}})
        }, function (err) {
            next(err);
        })
    };

    /**
     * GET /:id/inspect
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.list = function (req, res, next) {
        var reqId = req.params.id;
        res.render("list.html", {title: "Request-" + reqId, reqId: reqId});

    };

    /**
     * GET / Home 首页
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.index = function (req, res, next) {
        res.render("index", {title: "Request"})
    };

    /**
     * Not Found Page
     * @param req
     * @param res
     * @param next
     */
    Request.prototype.notFound = function (req, res, next) {
        res.render("shared/404.html", {title: "首页"})
    }
};

util.inherits(Request, Base);
module.exports = exports = Request;