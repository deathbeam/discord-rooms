const redis = require('redis');
const WebSocket = require('ws');

// Initialize WebSocket server
const wss = new WebSocket.Server({
    port: process.env.PORT || 1337
});

// Initialize connection to redis server
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisPassword = process.env.REDIS_PASSWORD;
const pub = redis.createClient(redisPort, redisHost);
pub.auth(redisPassword);

const sub = redis.createClient(redisPort, redisHost);
sub.auth(redisPassword);

// Initialize in-memory socket storage
const sockets = {};

// Handle incoming WSS connections
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(data) {
        console.log('received ' + data);
        const message = JSON.parse(data);

        if (!sockets[message.group]) {
            sockets[message.group] = {}
        }

        sockets[message.group][message.uuid] = ws
        pub.publish('group.' + message.group, data);
    });
});

wss.on('error', function (e) {
    console.error(e)
})

// Handle redis subscriptions
sub.on('pmessage', function (group, channel, message) {
    channel = channel.substr(channel.indexOf('.') + 1);
    console.log('sub ' + group + '>' + channel + ': ' + message);
    const clients = sockets[channel];

    if (clients) {
        for (let key in clients) {
            clients[key].send(message);
        }
    }
});

// Pretty logs etc
sub.on('psubscribe', function (channel, count) {
    console.log('got subscription ' + channel + ' ' + count)
});

sub.psubscribe('group.*');

