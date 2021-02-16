const https = require('https');
const http = require('http');
const fs  = require('fs');
const request = require('request');
const querystring = require('querystring');

const m_data = require('./m_data');

function search_helper(name){
    name = name.replace("第一季", "");
    name = name.replace("第1季", "");
    name = name.replace(/\[[a-zA-Z0-9]*\]/g, "");
    return name;
}
/**
* 通过名称搜索番剧，获得subject_id
* 参数
* name: 番剧名
* 返回值
* 是否成功 返回值（若成功则返回subjec_id，否则返回错误信息）
*/
module.exports.search_bangumi = function(name, callback){
    const options = {
        hostname: m_data.get_api_path().split('://')[1],
        path: '/search/subject/' + encodeURI(search_helper(name)),
        method: 'GET',
        headers: {
            'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
            'Cookie': ['chii_searchDateLine=0']
        }
    };
    var res_data = "";
    const req = ((m_data.get_api_path().split('://')[0]=='https')?https:http).request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            res_data += chunk;
        });
        res.on('end', () => {
            try{
                var res_obj = JSON.parse(res_data);
            }catch(e){
                console.log(e);
                callback(false, name + ': Fail to parse api data');
                return;
            }
            if(res_obj.list == undefined){
                callback(false, name + ': Not Found');
                return;
            }
            // 2 = Anime
            var j=0;
            while(res_obj.list[j].type != 2){
                j++;
                if(j>=res_obj.list.length){
                    callback(false, name + ': Fail to match');
                    return;
                    break;
                }
            }
            callback(true, res_obj.list[j].id);
        })
    });
    req.on('error', (e) => {
        callback(false, res.statusCode + ": " + e.message);
    });
    req.end();
}

/**
* 通过subject_id搜索番剧，获得详细信息
* 参数
* subject_id
* 返回值
* 是否成功 返回值（若成功则返回对象，否则返回错误信息）
*/
module.exports.get_bangumi_subject = function(bgm_id, callback){
    const options = {
        hostname: m_data.get_api_path().split('://')[1],
        path: '/subject/' + bgm_id + '?responseGroup=large',
        method: 'GET',
        headers: {
            'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
            'Cookie': ['chii_searchDateLine=0']
        }
    };
    var res_data = "";
    const req = ((m_data.get_api_path().split('://')[0]=='https')?https:http).request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            res_data += chunk;
        });
        res.on('end', () => {
            try{
                var res_obj = JSON.parse(res_data);
            }catch(e){
                console.log(e);
                callback(false, 'subject/' + bgm_id + ': Fail to parse api data');
                return;
            }
            var bgm_info = {};
            bgm_info.id = res_obj.id;
            bgm_info.eps_count = res_obj.eps_count;
            bgm_info.air_date = res_obj.air_date;
            bgm_info.url = res_obj.url;
            bgm_info.name = res_obj.name;
            bgm_info.name_cn = ((res_obj.name_cn=="")?res_obj.name:res_obj.name_cn);
            bgm_info.images = res_obj.images;
            bgm_info.eps = [];
            for(let i=0;i<res_obj.eps.length;++i)
                if(res_obj.eps[i].type == 0) // no sp
                    bgm_info.eps.push(res_obj.eps[i].name_cn);
            bgm_info.actors = [];
            if(res_obj.crt != null)
                res_obj.crt.forEach(element => {
                    if(element.actors != null)
                        element.actors.forEach(item => {
                            bgm_info.actors.push(item.name);
                        });
                });
            bgm_info.staff = [];
            if(res_obj.staff != null)
                for(let i=0;i<res_obj.staff.length;++i)
                    bgm_info.staff.push((res_obj.staff[i].name_cn!='')?(res_obj.staff[i].name_cn):res_obj.staff[i].name);
            
            m_data.update_tags('year', [bgm_info.air_date.split('-')[0]]);
            m_data.update_tags('actor', bgm_info.actors);
            m_data.update_tags('staff', bgm_info.staff);

            callback(true, bgm_info);
        })
    });
    req.on('error', (e) => {
        callback(false, res.statusCode + ": " + e.message);
    });
    req.end();
}

module.exports.get_user_info = function(uid, callback){
    const options = {
        hostname: 'http://api.bgm.tv'.split('://')[1],
        path: '/user/' + uid,
        method: 'GET',
        headers: {
            'User-Agent': "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15",
            'Cookie': ['chii_searchDateLine=0']
        }
    };
    var res_data = "";
    const req = (('http://api.bgm.tv'.split('://')[0]=='https')?https:http).request(options, (res) => {
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
            res_data += chunk;
        });
        res.on('end', () => {
            try{
                var res_obj = JSON.parse(res_data);
            }catch(e){
                callback(false, e);
                return;
            }
            callback(true, res_obj);
        })
    });
    req.on('error', (e) => {
        callback(false, res.statusCode + ": " + e.message);
    });
    req.end();
}

module.exports.updata_watched_eps = function(access_token, subject_id, watched_eps, callback){
    var postData = querystring.stringify({
        'watched_eps' : String(watched_eps),
    });
    const options = {
        hostname: 'api.bgm.tv',
        path: '/subject/' + subject_id + '/update/watched_eps',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            'Authorization': 'Bearer ' + access_token,
        }
    }
    const req = http.request(options, res => {
        if(res.statusCode == 200)
            callback(true);
        else
            callback(false);
    })
    req.on('error', error => {
        console.error(error)
    })
    req.write(postData);
    req.end()
}

// 似乎在更新收视进度前先需要收藏该条目
module.exports.updata_collection = function(access_token, subject_id, callback){
    // TODO
    // 这里需要更正：
    // 问题：未收藏的动画被更新为想看而不是在看
    // 推测：此处参数有误
    var postData = querystring.stringify({
        'status' : {
            //'id': 2,
            'name': '在做',
            //'name': '看过',
        },
    });
    const options = {
        hostname: 'api.bgm.tv',
        path: '/collection/' + subject_id + '/update',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length,
            'Authorization': 'Bearer ' + access_token,
        }
    }
    const req = http.request(options, res => {
        if(res.statusCode == 200)
            callback(true);
        else
            callback(false);
    })
    req.on('error', error => {
        console.error(error)
    })
    req.write(postData);
    req.end()
}

module.exports.download_file = function(url, save_path, callback){
    fs.access(save_path, fs.constants.F_OK, (err) => {
        if(err){
            const saveStream = fs.createWriteStream(save_path);
            // XXX
            request(url).pipe(saveStream).on('close', callback);
        }else{
            callback();
        }
    });
}
