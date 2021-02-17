const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const moment = require('moment')

const adapter = new FileSync(__dirname+'/db.json');
const db = low(adapter);

const default_config = { folders: [], bgms: [], tags: {"year": [], "actor": [], "staff": [], "file": []}, settings: {"api": 'https://api.bgm.tv'}};
const m_exts = require('./m_exts');
const m_api = require('./m_api');
const { ipcRenderer } = require('electron')

module.exports.check_database = function(){
    db.defaults(default_config).write();
    var bgm_count = db.get('bgms').size().value();
    if(bgm_count == 0) return false;
    else return true;
}
module.exports.clear_database = function(){
    db.set("folders", []).write();
    db.set("bgms", []).write();
    db.set("tags", {"year": [], "actor": [], "staff": [], "file": []}).write();
    db.set("settings", {"api": 'https://api.bgm.tv'}).write();
}

module.exports.get = function(path){
    return db.get(path).cloneDeep().value();
}
module.exports.set = function(path, val){
    db.set(path, val).write();
}
/**
* 通过名称模糊查找番剧
* 参数
* name: 名称
* 返回值
* 包含bgm对象的数组
*/
module.exports.search_bgm = function(name){
    return db.get('bgms').filter((bgm) => (m_exts.intext(name, bgm.name) || m_exts.intext(name, bgm.info.name_cn) || m_exts.intext(name, bgm.info.name))).cloneDeep().value();
}
/**
* 通过名称模糊查找标签
* 参数
* name: 名称
* 返回值
* 包含标签的数组
*/
module.exports.search_tag = function(name){
    var res = [];
    res = res.concat(db.get('tags.year').filter(tag => m_exts.intext(name, tag)).cloneDeep().value());
    res = res.concat(db.get('tags.actor').filter(tag => m_exts.intext(name, tag)).cloneDeep().value());
    res = res.concat(db.get('tags.staff').filter(tag => m_exts.intext(name, tag)).cloneDeep().value());
    return res;
}
/**
* 通过标签查找bgm
* 参数
* tag_name: 标签名称
* 返回值
* 包含bgm对象的数组
*/
module.exports.get_bgms_by_tag = function(tag_name){
    console.log(tag_name);
    return db.get('bgms').filter((bgm) => (
        tag_name == bgm.info.air_date.split('-')[0] ||
        m_exts.inarray(tag_name, bgm.info.actors) ||
        m_exts.inarray(tag_name, bgm.info.staff)
    )).cloneDeep().value();
}
/**
* 更新番剧进度
* 参数
* name: 番剧名称（id） ep_id: 看到第几话（从1开始）
* 无返回值
*/
module.exports.update_bgm_status = function(name, ep_id){
    db.get("bgms").find({name: name}).set('status', {
        date: moment().format('YYYY-MM-DD HH:mm'),
        ep_id: ep_id
    }).write();
    // 与bgm同步
    /*var access_token = this.get_user_access_token();
    if(access_token != undefined){
        var bgm = this.get_bangumi(name);
        m_api.updata_collection(access_token.access_token, bgm.info.id, (success) => {
            if(success)
                m_api.updata_watched_eps(access_token.access_token, bgm.info.id, ep_id, (success) => {
                    if(!success) ipcRenderer.send('app-log', "同步进度失败，请重新登录");
                });
            else
                ipcRenderer.send('app-log', "同步进度失败，请重新登录");
        })
    }*/
}

/**
* 返回番剧进度
* 参数
* name: 番剧名称（id
* 返回值
* status对象
*/
module.exports.get_bgm_status = function(name){
    var obj = db.get("bgms").find({name: name}).cloneDeep().value();
    if(obj.status == undefined) return undefined;
    return obj.status;
}
/**
* 获取最近观看的番剧
* 参数
* 返回值
* 包含bgm的数组，按照时间顺序
*/
module.exports.get_recent_bgms = function(){
    return db.get('bgms').filter((bgm) => bgm.status!=undefined).sortBy('status.date').cloneDeep().value().reverse();
}

module.exports.set_bangumi = function(name, obj){
    if(db.get("bgms").find({name: name}).value() != undefined)
        db.read().get("bgms").remove({name: name}).write();
    db.read().get("bgms").push(obj).write();
}
module.exports.get_bangumi = function(name){
    return db.get('bgms').find({'name': name}).cloneDeep().value();
}
module.exports.remove_bangumi = function(name){
    db.get('bgms').remove({'name': name}).write();
}
module.exports.have_bangumi = function(name){
    return (db.get("bgms").find({name: name}).value() != undefined);
}

module.exports.update_tags = function(tag_name, tags){
    for(let i=0;i<tags.length;++i){
        let cur_tag = tags[i], ind = db.get('tags.' + tag_name).indexOf(cur_tag).value();
        if(ind == -1)
            db.get('tags.' + tag_name).push(cur_tag).write();;
    }
}

module.exports.add_folder = function(path){
    db.get('folders').push(path).write();
}
module.exports.remove_folder = function(path){
    db.get('folders').pull(path).write();
}

module.exports.set_user_access_token = function(access_token){
    db.read().set('access_token', access_token).write();
}
module.exports.get_user_access_token = function(){
    return db.get('access_token').cloneDeep().value();
}
module.exports.remove_user_access_token = function(){
    return db.unset('access_token').write();
}

module.exports.get_api_path = function(){
    return db.get('settings.api').cloneDeep().value();
}