const http = require('http');
const querystring = require('querystring');

const client_id = 'bgm17616023b2473bf0e'
const client_secret = '8f1043d318fba1b6fc4bdb71d4bca831';
const redirect_uri = 'http://localhost:6008/';

const m_api = require('./m_api')


module.exports.start_listen = function(callback){
    http.createServer(function(req, res){
        var code = req.url.split('=').splice(-1)[0];
        get_access_token(code, (res)=>{
            if(res!=undefined){
                callback(true, res);
            }else{
                callback(false);
            }
            /*res.writeHead(200, {'Content-Type': 'text/plain; charset=utf-8'});
            res.end('登录成功！请关闭此页面再点击登陆以授权');*/
        })
    }).listen(6008);
}

module.exports.get_user_info = function(access_token, callback){
    m_api.get_user_info(access_token.user_id, (success ,res) => {callback(success, res)});
}

module.exports.login_refresh = function(refresh_token, callback){
    func_refresh_token(refresh_token, (res) => {
        callback(res);
    })
}

function get_access_token(code, callback){
    var postData = querystring.stringify({
        'grant_type' : 'authorization_code',
        'client_id' : client_id,
        'client_secret' : client_secret,
        'code' : code,
        'redirect_uri': redirect_uri
    });
    const options = {
        hostname: 'bgm.tv',
        path: '/oauth/access_token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
          }
    }
    var res_data = "";
    const req = http.request(options, res => {
        res.on('data', chunk => {
            res_data += chunk;
        });
        res.on('end', () => {
            console.log(res_data);
            try{
                var obj = JSON.parse(res_data);
            }catch(err){
                console.log(err);
                console.log(res_data);
                callback(undefined);
                return;
            }
            callback(obj);
        });
    })
    req.on('error', error => {
        console.error(error)
    })
    req.write(postData);
    req.end()
}

function func_refresh_token(refresh_token, callback){
    var postData = querystring.stringify({
        'grant_type' : 'refresh_token',
        'client_id' : client_id,
        'client_secret' : client_secret,
        'refresh_token' : refresh_token,
        'redirect_uri': redirect_uri
    });
    const options = {
        hostname: 'bgm.tv',
        path: '/oauth/access_token',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
          }
    }
    var res_data = "";
    const req = http.request(options, res => {
        res.on('data', chunk => {
            res_data += chunk;
        });
        res.on('end', () => {
            console.log(res_data);
            try{
                var obj = JSON.parse(res_data);
            }catch(err){
                console.log(err);
                console.log(res_data);
                callback(undefined);
                return;
            }
            callback(obj);
        });
    })
    req.on('error', error => {
        console.error(error)
    })
    req.write(postData);
    req.end()
}