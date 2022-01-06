/* this tool uses express and http-proxy-middleware proxy all netdata instances
 * via a centeralized interface
*/

const app_name = process.env.NP_APPNAME || "netdata-proxy";
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');
const promMid = require('express-prometheus-middleware');
const app = express();
app.engine('.html', require('ejs').__express);
app.set("views", path.join(__dirname, "views"));
app.use("/" + app_name + "/public", express.static(path.join(__dirname, "public")));
app.set('view engine', 'html');

const PORT = process.env.NP_PORT || 80;
const NETDATA_PORT = process.env.NETDATA_PORT || 19999;
const HOST = '0.0.0.0';
const options =  {
    logLevel: "debug",
    changeOrigin: true,
    pathRewrite: function(path, req) {
        /* path is /$app_name/host/hostname/xxx
         * it should be rewrite to /xxx
         */
        var prefix = "^\\/" + app_name + "\\/hosts";
        regexp =  new RegExp(prefix + "\\/[^\\/]+/");
        return path.replace(regexp, "/");
    },

    router: function(req){
        var host = req.params.hostname;
        if (!(host in visited)){
            visited[host] = 0;
        }else{
            visited[host]++;
        }
        return {
            protocol: "http:",
            host: host,
            port: NETDATA_PORT
        };
    },
}

var visited = {};
app.use(morgan('combined'));
app.use(promMid({
    metricsPath: "/" + app_name + "/metrics",
	collectDefaultMetrics: true,
  	requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  	requestLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
  	responseLengthBuckets: [512, 1024, 5120, 10240, 51200, 102400],
}));

// order matters?
app.delete('/' + app_name + "/hosts/:hostname", (req, res, next) => {
    delete visited[req.params.hostname];
    res.status(204).send()
});

app.use('/' + app_name + '/hosts/:hostname/', createProxyMiddleware(options));
app.get('/' + app_name, (req, res, next) => {
    res.render("netdata-proxy", {
        title: app_name,
        visited: visited,
    });
}); 

app.get('/' + app_name + "/hosts", (req, res, next) => {
    res.json(visited);
});


app.get('/', (req, res, next) => {
    res.redirect('/' + app_name );
});

app.get("/" + app_name + "/live", (req, res, next) => {
    res.json({"status": "healthy"})
});

app.get("/" + app_name + "/ready", (req, res, next) => {
    res.json({"status": "healthy"})
});

console.log("starting " + app_name + " at " + "http://" + HOST + ":" + PORT)
app.listen(PORT, HOST)
