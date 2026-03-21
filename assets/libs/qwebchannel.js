/****************************************************************************
**
** Copyright (C) 2016 The Qt Company Ltd.
** Copyright (C) 2016 Klarälvdalens Datakonsult AB, a KDAB Group company, info@kdab.com, author Milian Wolff <milian.wolff@kdab.com>
** Contact: https://www.qt.io/licensing/
**
** This file is part of the QtWebChannel module of the Qt Toolkit.
**
** $QT_BEGIN_LICENSE:LGPL$
** Commercial License Usage
** Licensees holding valid commercial Qt licenses may use this file in
** accordance with the commercial license agreement provided with the
** Software or, alternatively, in accordance with the terms contained in
** a written agreement between you and The Qt Company. For licensing terms
** and conditions see https://www.qt.io/terms-conditions. For further
** information use the contact form at https://www.qt.io/contact-us.
**
** GNU Lesser General Public License Usage
** Alternatively, this file may be used under the terms of the GNU Lesser
** General Public License version 3 as published by the Free Software
** Foundation and appearing in the file LICENSE.LGPL3 included in the
** packaging of this file. Please review the following information to
** ensure the GNU Lesser General Public License version 3 requirements
** will be met: https://www.gnu.org/licenses/lgpl-3.0.html.
**
** GNU General Public License Usage
** Alternatively, this file may be used under the terms of the GNU
** General Public License version 2.0 or (at your option) the GNU General
** Public license version 3 or any later version approved by the KDE Free
** Qt Foundation. The licenses are as published by the Free Software
** Foundation and appearing in the file LICENSE.GPL2 and LICENSE.GPL3
** included in the packaging of this file. Please review the following
** information to ensure the GNU General Public License requirements will
** be met: https://www.gnu.org/licenses/gpl-2.0.html and
** https://www.gnu.org/licenses/gpl-3.0.html.
**
** $QT_END_LICENSE$
**
****************************************************************************/

"use strict";

var QWebChannelMessageTypes = {
    signal: 1,
    propertyUpdate: 2,
    init: 3,
    idle: 4,
    debug: 5,
    invokeMethod: 6,
    connectToSignal: 7,
    disconnectFromSignal: 8,
    setProperty: 9,
    response: 10,
};

var QWebChannel = function(transport, initCallback, converters)
{
    if (typeof transport !== "object" || typeof transport.send !== "function") {
        console.error("The QWebChannel expects a transport object with a send function and onmessage callback property." +
                      " Given is: transport: " + typeof(transport) + ", transport.send: " + typeof(transport.send));
        return;
    }

    var channel = this;
    this.transport = transport;

    this.send = function(data)
    {
        if (typeof(data) !== "string") {
            data = JSON.stringify(data);
        }
        channel.transport.send(data);
    }

    this.execId = 0;
    this.execCallbacks = {};
    this.exec = function(data, callback)
    {
        if (!callback) {
            channel.send(data);
            return;
        }
        if (channel.execId === Number.MAX_VALUE) {
            channel.execId = 0;
        }
        if (data.id === undefined) {
            data.id = "exec_" + channel.execId++;
        }
        channel.execCallbacks[data.id] = callback;
        channel.send(data);
    };

    this.objects = {};

    this.handleSignal = function(message)
    {
        var object = channel.objects[message.object];
        if (object) {
            object.signalEmitted(message.signal, message.args);
        } else {
            console.warn("Unhandled signal: " + message.object + "::" + message.signal);
        }
    }

    this.handleProperty = function(message)
    {
        var object = channel.objects[message.object];
        if (object) {
            object.propertyUpdate(message.properties, message.deletedProperties);
        } else {
            console.warn("Unhandled property update: " + message.object);
        }
    }

    this.handleResponse = function(message)
    {
        var callback = channel.execCallbacks[message.id];
        if (callback) {
            delete channel.execCallbacks[message.id];
            callback(message.data);
        }
    }

    this.transport.onmessage = function(message)
    {
        var data = message.data;
        if (typeof data === "string") {
            data = JSON.parse(data);
        }
        switch (data.type) {
            case QWebChannelMessageTypes.signal:
                channel.handleSignal(data);
                break;
            case QWebChannelMessageTypes.propertyUpdate:
                channel.handleProperty(data);
                break;
            case QWebChannelMessageTypes.response:
                channel.handleResponse(data);
                break;
            default:
                console.error("invalid message received:", message.data);
                break;
        }
    }

    this.debug = function(message)
    {
        channel.send({type: QWebChannelMessageTypes.debug, data: message});
    };

    channel.exec({type: QWebChannelMessageTypes.init}, function(data) {
        for (const objectName of Object.keys(data)) {
            new QObject(objectName, data[objectName], channel, converters);
        }
        for (const objectName of Object.keys(channel.objects)) {
            channel.objects[objectName].unwrapProperties();
        }
        if (initCallback) {
            initCallback(channel);
        }
        channel.exec({type: QWebChannelMessageTypes.idle});
    });
};

function QObject(name, data, webChannel, converters)
{
    this.__id__ = name;
    webChannel.objects[name] = this;

    this.unwrapProperties = function()
    {
        for (const propertyName of Object.keys(this)) {
            if (propertyName.startsWith("__")) {
                continue;
            }
            var property = this[propertyName];
            if (property instanceof Array) {
                for (var i = 0; i < property.length; ++i) {
                    if (property[i] instanceof QObject) {
                        property[i].unwrapProperties();
                    }
                }
            } else if (property instanceof QObject) {
                property.unwrapProperties();
            }
        }
    };

    this.addProperty = function(name, value)
    {
        if (webChannel.objects[value]) {
            this[name] = webChannel.objects[value];
            this[name].unwrapProperties();
        } else if (Array.isArray(value)) {
            this[name] = [];
            for (const v of value) {
                if (webChannel.objects[v]) {
                    this[name].push(webChannel.objects[v]);
                    this[name][this[name].length - 1].unwrapProperties();
                } else {
                    this[name].push(v);
                }
            }
        } else if (typeof(value) === "string") {
            this[name] = value;
        } else {
            this[name] = value;
        }
    };

    for (const propertyName of Object.keys(data)) {
        this.addProperty(propertyName, data[propertyName]);
    }

    this.signalEmitted = function(signalName, signalArgs)
    {
        var connections = this.__propertyCache__[signalName];
        if (connections && connections.length > 0) {
            for (var i = 0; i < connections.length; ++i) {
                var callback = connections[i];
                callback.apply(callback, signalArgs);
            }
        }
    };

    this.propertyUpdate = function(properties, deletedProperties)
    {
        for (const propertyName of Object.keys(properties)) {
            var value = properties[propertyName];
            if (value === null) {
                console.warn("Property '" + propertyName + "' of object '" + this.__id__ + "' is null.");
                continue;
            }
            this.addProperty(propertyName, value);
        }
        for (const propertyName of deletedProperties) {
            delete this[propertyName];
        }
    };

    this.invoke = function(methodName, args, callback)
    {
        if (args === undefined) {
            args = [];
        } else if (!Array.isArray(args)) {
            args = [args];
        }
        webChannel.exec({
            "type": QWebChannelMessageTypes.invokeMethod,
            "object": this.__id__,
            "method": methodName,
            "args": args
        }, function(response) {
            if (callback) {
                (callback)(response);
            }
        });
    };

    this.disconnect = function()
    {
        webChannel.exec({
            "type": QWebChannelMessageTypes.disconnectFromSignal,
            "object": this.__id__
        });
    };

    this.connectToSignal = function(signalName, callback)
    {
        webChannel.exec({
            "type": QWebChannelMessageTypes.connectToSignal,
            "object": this.__id__,
            "signal": signalName
        });
        if (!this.__propertyCache__[signalName]) {
            this.__propertyCache__[signalName] = [];
        }
        this.__propertyCache__[signalName].push(callback);
    };

    this.__propertyCache__ = {};
    var object = this;

    this.__propertySetter__ = function(propertyName, value)
    {
        webChannel.exec({
            "type": QWebChannelMessageTypes.setProperty,
            "object": object.__id__,
            "property": propertyName,
            "value": value
        });
    };

    this.__propertyGetter__ = function(propertyName)
    {
        return object[propertyName];
    };

    function methodHandler(methodName)
    {
        return function() {
            var args = [];
            var callback = null;
            for (var i = 0; i < arguments.length; ++i) {
                if (typeof arguments[i] === "function") {
                    callback = arguments[i];
                } else {
                    args.push(arguments[i]);
                }
            }
            object.invoke(methodName, args, callback);
        };
    }

    for (const methodName of data.methods) {
        this[methodName] = methodHandler(methodName);
    }

    function signalHandler(signalName)
    {
        var signal = function(callback) {
            object.connectToSignal(signalName, callback);
        };
        return signal;
    }

    for (const signalName of data.signals) {
        this[signalName] = signalHandler(signalName);
    }

    for (const propertyName of Object.keys(data.properties)) {
        var propertyValue = data.properties[propertyName];
        this.__propertyCache__[propertyName] = propertyValue;
        Object.defineProperty(this, propertyName, {
            get: function() {
                return this.__propertyCache__[propertyName];
            },
            set: function(value) {
                this.__propertyCache__[propertyName] = value;
                this.__propertySetter__(propertyName, value);
            },
            configurable: true,
            enumerable: true
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        QWebChannel: QWebChannel
    };
}
