/* this tool uses express and http-proxy-middleware proxy all netdata instances
 * via a centeralized interface
*/

const app_name = "netdata-proxy";
const express = require("express");
const path = require("path");
const morgan = require("morgan");
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();
app.engine('.html', require('ejs').__express);
app.set("views", path.join(__dirname, "views"));
app.use("/" + app_name + "/public", express.static(path.join(__dirname, "public")));
app.set('view engine', 'html');

const PORT = 80;
const NETDATA_PORT = 19999;
const HOST = '0.0.0.0';
const options =  {
    logLevel: "debug",
    changeOrigin: true,
    pathRewrite: function(path, req) {
        /* path is /$app_name/host/hostname/xxx
         * it should be rewrite to /xxx
         */
        var prefix = "^\\/" + app_name + "\\/host";
        regexp =  new RegExp(prefix + "\\/[^\\/]+/");
        return path.replace(regexp, "/");
    },

    router: function(req){
        const host = req.path.split("/")[3];
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
app.use('/' + app_name + '/host', createProxyMiddleware(options));
app.get('/' + app_name, (req, res, next) => {
    res.render("netdata-proxy", {
        title: app_name,
        visited: visited,
    });
}); 

app.get('/' + app_name + "/counts", (req, res, next) => {
    res.json(visited)

});
app.listen(PORT, HOST)
