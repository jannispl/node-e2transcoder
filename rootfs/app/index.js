var http = require('http');
var Transcoder = require('stream-transcoder');

function hookTranscoder(t)
{
	var oldExec = t._exec;
	t._exec = function (a)
	{
		console.log('exec hook');
		var child = oldExec.call(this, a);
		this._child = child;
		return child;
	};

	t.kill = function ()
	{
		console.log('sigkill1');
		if (!this._child) return;

		console.log("sigkill2");
		this._child.kill('SIGKILL');
	};
}

var users = [
	{ username: 'mobile', size: [1280, 720], args: [ ['maxrate', '1200k'], ['bufsize', '1300k'] ] },
	{ username: 'hd', size: [1920, 1080], args: [ ['maxrate', '1400k'], ['bufsize', '1500k'] ] }
];

var user = function (username)
{
	for (var i in users)
	{
		if (users[i].username === username)
			return users[i];
	}
	return false;
}

var server = http.createServer(function (req, res)
{
	if (req.url.length < 2)
	{
		res.writeHead(400, {'Content-Type': 'text/plain'});
		res.end('400 Bad Request');
		return;
	}
	console.log('opening stream for ' + req.url);

	res.writeHead(200, {'Content-Type': 'video/MP2T'});

	var u = user('mobile');
	if (req.headers.host.match(/^hd\./))
		u = user('hd');

	// ffmpeg -i "http://192.168.1.5:8001/1:0:19:EF74:3F9:1:C00000:0:0:0::Sat 1 HD" -r 23.98 -preset veryfast -profile:v baseline -c:a aac -ac 2 -ar 44100 -strict experimental -bsf:a aac_adtstoasc -c:v libx264 -b:v 1500k -b:a 128k -g 60 -f mpegts  out.ts
	var t = new Transcoder('http://' + process.env.ENIGMA_HOST + ':' + process.env.ENIGMA_STREAM_PORT + req.url)
		.maxSize(u.size[0], u.size[1])
		.custom('preset', 'superfast')
		.custom('profile:v', 'baseline')
		.custom('r', '23.98')
		.custom('c:a', 'aac')
		.channels(2)
		.sampleRate(44100)
		.videoBitrate('1500k')
		.audioBitrate('128k')
		.custom('strict', 'experimental')
		.custom('bsf:a', 'aac_adtstoasc')
		.custom('c:v', 'libx264')
		//.custom('maxrate', '1200k')
		//.custom('bufsize', '1300k')
		.custom('g', 60)
		.custom('probesize', 128)
		.custom('analyzeduration', 10000)
		.format('mpegts')

	hookTranscoder(t);

	for (var i in u.args)
	{
		var arg = u.args[i];
		t.custom(arg[0], arg[1]);
	}

	t.on('finish', function ()
	{
		console.log('streaming finished');
	})

	var stream = t.stream();
	stream.pipe(res);

	res.on('close', function ()
	{
		console.log('killing stream');
		//stream().close();
		t.kill();
	});

	/*t.on('metadata', function (metadata)
	{
		console.log(metadata);
	});*/

	/*t.on('progress', function (progress)
	{
		console.log(progress.frame);
	});*/

	t.on('error', function (e)
	{
		console.log(e);
		res.end();
	})
});
server.listen(8001);
