var async = require('async');
var Joi = require('joi');
var authPlugin = require('../auth');


exports.register = function (plugin, options, next) {

    plugin.route({
        method: 'GET',
        path: '/admins',
        config: {
            auth: 'simple',
            validate: {
                query: {
                    fields: Joi.string(),
                    sort: Joi.string(),
                    limit: Joi.number().default(20),
                    page: Joi.number().default(1)
                }
            },
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;
            var query = {};
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;

            Admin.pagedFind(query, fields, sort, limit, page, function (err, results) {

                if (err) {
                    return reply(err);
                }

                reply(results);
            });
        }
    });


    plugin.route({
        method: 'GET',
        path: '/admins/{id}',
        config: {
            auth: 'simple',
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;

            Admin.findById(request.params.id, function (err, admin) {

                if (err) {
                    return reply(err);
                }

                if (!admin) {
                    return reply({ message: 'Document not found.' }).code(404);
                }

                reply(admin);
            });
        }
    });


    plugin.route({
        method: 'POST',
        path: '/admins',
        config: {
            auth: 'simple',
            validate: {
                payload: {
                    name: Joi.string().required()
                }
            },
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;
            var name = request.payload.name;

            Admin.create(name, function (err, admin) {

                if (err) {
                    return reply(err);
                }

                reply(admin);
            });
        }
    });


    plugin.route({
        method: 'PUT',
        path: '/admins/{id}',
        config: {
            auth: 'simple',
            validate: {
                payload: {
                    name: Joi.object().keys({
                        first: Joi.string().required(),
                        middle: Joi.string().allow(''),
                        last: Joi.string().required()
                    }).required()
                }
            },
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;
            var id = request.params.id;
            var update = {
                $set: {
                    name: request.payload.name
                }
            };

            Admin.findByIdAndUpdate(id, update, function (err, admin) {

                if (err) {
                    return reply(err);
                }

                reply(admin);
            });
        }
    });


    plugin.route({
        method: 'PUT',
        path: '/admins/{id}/permissions',
        config: {
            auth: 'simple',
            validate: {
                payload: {
                    permissions: Joi.object().required()
                }
            },
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;
            var id = request.params.id;
            var update = {
                $set: {
                    permissions: request.payload.permissions
                }
            };

            Admin.findByIdAndUpdate(id, update, function (err, admin) {

                if (err) {
                    return reply(err);
                }

                reply(admin);
            });
        }
    });


    plugin.route({
        method: 'PUT',
        path: '/admins/{id}/groups',
        config: {
            auth: 'simple',
            validate: {
                payload: {
                    groups: Joi.object().required()
                }
            },
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;
            var id = request.params.id;
            var update = {
                $set: {
                    groups: request.payload.groups
                }
            };

            Admin.findByIdAndUpdate(id, update, function (err, admin) {

                if (err) {
                    return reply(err);
                }

                reply(admin);
            });
        }
    });


    plugin.route({
        method: 'PUT',
        path: '/admins/{id}/user',
        config: {
            auth: 'simple',
            validate: {
                payload: {
                    username: Joi.string().required()
                }
            },
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root'),
                {
                    assign: 'admin',
                    method: function (request, reply) {

                        var Admin = request.server.plugins.models.Admin;

                        Admin.findById(request.params.id, function (err, admin) {

                            if (err) {
                                return reply(err);
                            }

                            if (!admin) {
                                return reply({ message: 'Document not found.' }).takeover().code(404);
                            }

                            reply(admin);
                        });
                    }
                },{
                    assign: 'user',
                    method: function (request, reply) {

                        var User = request.server.plugins.models.User;

                        User.findByUsername(request.payload.username, function (err, user) {

                            if (err) {
                                return reply(err);
                            }

                            if (!user) {
                                return reply({ message: 'User document not found.' }).takeover().code(404);
                            }

                            if (user.roles &&
                                user.roles.admin &&
                                user.roles.admin.id !== request.params.id) {

                                var response = {
                                    message: 'User is already linked to another admin. Unlink first.'
                                };

                                return reply(response).takeover().code(409);
                            }

                            reply(user);
                        });
                    }
                },{
                    assign: 'userCheck',
                    method: function (request, reply) {

                        if (request.pre.admin.user &&
                            request.pre.admin.user.id !== request.pre.user._id.toString()) {

                            var response = {
                                message: 'Admin is already linked to another user. Unlink first.'
                            };

                            return reply(response).takeover().code(409);
                        }

                        reply(true);
                    }
                }
            ]
        },
        handler: function (request, reply) {

            async.auto({
                admin: function (done) {

                    var Admin = request.server.plugins.models.Admin;
                    var id = request.params.id;
                    var update = {
                        $set: {
                            user: {
                                id: request.pre.user._id.toString(),
                                name: request.pre.user.username
                            }
                        }
                    };

                    Admin.findByIdAndUpdate(id, update, done);
                },
                user: function (done) {

                    var User = request.server.plugins.models.User;
                    var id = request.pre.user._id;
                    var update = {
                        $set: {
                            'roles.admin': {
                                id: request.pre.admin._id.toString(),
                                name: request.pre.admin.name.first + ' ' + request.pre.admin.name.last
                            }
                        }
                    };

                    User.findByIdAndUpdate(id, update, done);
                }
            }, function (err, results) {

                if (err) {
                    return reply(err);
                }

                reply(results.admin[0]);
            });
        }
    });


    plugin.route({
        method: 'DELETE',
        path: '/admins/{id}/user',
        config: {
            auth: 'simple',
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root'),
                {
                    assign: 'admin',
                    method: function (request, reply) {

                        var Admin = request.server.plugins.models.Admin;

                        Admin.findById(request.params.id, function (err, admin) {

                            if (err) {
                                return reply(err);
                            }

                            if (!admin) {
                                return reply({ message: 'Document not found.' }).takeover().code(404);
                            }

                            if (!admin.user || !admin.user.id) {
                                return reply(admin).takeover();
                            }

                            reply(admin);
                        });
                    }
                },{
                    assign: 'user',
                    method: function (request, reply) {

                        var User = request.server.plugins.models.User;

                        User.findById(request.pre.admin.user.id, function (err, user) {

                            if (err) {
                                return reply(err);
                            }

                            if (!user) {
                                return reply({ message: 'User document not found.' }).takeover().code(404);
                            }

                            reply(user);
                        });
                    }
                }
            ]
        },
        handler: function (request, reply) {

            async.auto({
                admin: function (done) {

                    var Admin = request.server.plugins.models.Admin;
                    var id = request.params.id;
                    var update = {
                        $unset: {
                            user: undefined
                        }
                    };

                    Admin.findByIdAndUpdate(id, update, done);
                },
                user: function (done) {

                    var User = request.server.plugins.models.User;
                    var id = request.pre.user._id.toString();
                    var update = {
                        $unset: {
                            'roles.admin': undefined
                        }
                    };

                    User.findByIdAndUpdate(id, update, done);
                }
            }, function (err, results) {

                if (err) {
                    return reply(err);
                }

                reply(results.admin[0]);
            });
        }
    });


    plugin.route({
        method: 'DELETE',
        path: '/admins/{id}',
        config: {
            auth: 'simple',
            pre: [
                authPlugin.preware.ensureUserRole('admin'),
                authPlugin.preware.ensureAdminGroup('root')
            ]
        },
        handler: function (request, reply) {

            var Admin = request.server.plugins.models.Admin;

            Admin.findByIdAndRemove(request.params.id, function (err, count) {

                if (err) {
                    return reply(err);
                }

                if (count === 0) {
                    return reply({ message: 'Document not found.' }).code(404);
                }

                reply({ message: 'Success.' });
            });
        }
    });


    next();
};


exports.register.attributes = {
    name: 'admins'
};
