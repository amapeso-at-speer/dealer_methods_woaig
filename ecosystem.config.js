module.exports = {
	apps : [{
		name   : 'main',
		script : './index.js',
		error_file : './logs/err.log',
		out_file : './logs/out.log',
		'log_date_format' : 'YYYY-MM-DD HH:mm Z'
	}, {
		name : 'contractWorker',
		script: './workers/contractEmailWorker.js',
		error_file : './logs/workerErr.log',
		out_file : './logs/workerOut.log',
		'log_date_format' : 'YYYY-MM-DD HH:mm Z'
	}, {
		name : 'cronWorker',
		script: './workers/cronWorker.js',
		error_file : './logs/cronWorkerErr.log',
		out_file : './logs/cronWorkerOut.log',
		'log_date_format' : 'YYYY-MM-DD HH:mm Z'
	}]
};
