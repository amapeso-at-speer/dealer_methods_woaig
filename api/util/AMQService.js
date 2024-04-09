let amqp = require('amqplib/callback_api');

let ch = null;
amqp.connect(process.env.AMQ_CONN_URL, function (err, conn) {
	conn.createChannel(function (err, channel) {
		ch = channel;
	});
});


exports.publishToQueue = async (queueName, data) => {
	ch.sendToQueue(queueName, Buffer.from(data));
};


process.on('exit', (code) => {
	ch.close();
	console.log('Closing rabbitmq channel');
});
