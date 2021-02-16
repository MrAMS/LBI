const fs = require('fs');
const m_path = require('path');
const ipcRenderer = require('electron').ipcRenderer;

const m_api = require('./m_api');
const m_data = require('./m_data');

module.exports.check_data_path = function(path){
    try{
        fs.accessSync(path+'/data/imgs', fs.constants.F_OK);
    }catch{
        fs.mkdirSync(path+'/data/imgs', {recursive: true});
    }
}
module.exports.get_data_folder_path = function(){
    return __dirname + '/data';
}
/**
* 扫描番剧文件夹（资料库下一级所有文件夹）
* 参数
* path: 文件夹路径
* 返回值
* 返回{name: 文件夹名称（番剧名，相当于id）, path: 路径}数组
*/
module.exports.scan_folder = function(path, callback) {
    fs.readdir(path, (err, files) =>{
        var res = [];
        for(let i=0;i<files.length;++i){
            let d_path = path + '/' + files[i];
            if(fs.statSync(d_path).isDirectory())
                res.push({"name": files[i], "path": d_path});
        }
        callback(res);
    });
}

/**
* 扫描番剧文件夹Sync（资料库下一级所有文件夹）
* 参数
* path: 文件夹路径
* 返回值
* 返回{name: 文件夹名称（番剧名，相当于id）, path: 路径}数组
*/
module.exports.scan_folder_sync = function(path) {
    try{
        var files = fs.readdirSync(path);
    }catch(err){
        ipcRenderer.send('m-log', err);
    }
    var res = [];
    for(let i=0;i<files.length;++i){
        let d_path = path + '/' + files[i];
        if(fs.statSync(d_path).isDirectory())
            res.push({"name": files[i], "path": d_path});
    }
    return res;
}

/**
* 扫描番剧视频文件
* 参数
* path: 番剧所在文件夹路径
* 返回值
* {sorted_files, files} 返回所有视频文件；并且若匹配剧集成功，返回按剧集顺序排列的包含文件夹名称的数组（顺序按照视频文件名中 [01],[02],...排列 ），失败返回[]
*/
module.exports.scan_bgm_folder = function(path) {
    var res = [], t = [], files_list = [];
    try{
        var files = fs.readdirSync(path);
    }catch(err){
        ipcRenderer.send('m-log', err);
        return {"sorted_files": [], "files": []};
    }
    for(let i=0;i<files.length;++i){
        let d_path = path + '/' + files[i];
        if(!fs.statSync(d_path).isFile()) continue;
        // skip no video files
        if(!this.inarray(m_path.parse(d_path).ext, video_formats_list)) continue;
        // skip ._ file on mac OS
        if(files[i].startsWith('._')) continue;
        files_list.push(files[i]);
        // 提取[01]
        let match_list = files[i].match(/\[[0-9]*\]/g);
        if(match_list!=null)
            t.push({"name": files[i], "sort": match_list[0]});
        
    }
    t.sort((a,b) => {
        return a.sort > b.sort;
    });
    for(let i=0;i<t.length;++i)
        res.push(t[i].name);
    return {"sorted_files": res, "files": files_list};
}

/**
* 获取番剧相关信息
* 参数
* name: 番剧名（所在文件夹名称，相当于id） bgm_id: 可选，指定subject_id，否则自动搜索
* 返回值
* 是否成功 返回值（若成功则返回bgm_info对象，否则返回错误信息）
*/
module.exports.get_bgm_info = function(name, callback, bgm_id){
    // XXX
    if(bgm_id != undefined){
        m_api.get_bangumi_subject(bgm_id, (success, bgm_info) => {
            if(!success){
                callback(false, bgm_info);
                return;
            }
            var img_path = this.get_data_folder_path() + "/imgs/" + bgm_info.id + '.jpg';
            var img_name = bgm_info.id + '.jpg';
            m_api.download_file(bgm_info.images.large, img_path, () => {
                bgm_info.img = img_name;
                callback(true, bgm_info);
            });
        })
        return;
    }
    m_api.search_bangumi(name, (success, res) => {
        if(!success){
            callback(false, res);
            return;
        }
        m_api.get_bangumi_subject(res, (success, bgm_info) => {
            if(!success){
                callback(false, bgm_info);
                return;
            }
            var img_path = this.get_data_folder_path() + "/imgs/" + bgm_info.id + '.jpg';
            var img_name = bgm_info.id + '.jpg';
            m_api.download_file(bgm_info.images.large, img_path, () => {
                bgm_info.img = img_name;
                callback(true, bgm_info);
            });
        })
      })
}

/**
* 安装番剧
* 参数
* name: 番剧名（所在文件夹名称，相当于id） path: 文件夹所在路径 bgm_info: get_bgm_info获取
* 返回值
* bgm对象
*/
module.exports.install_bgm = function(name, path, bgm_info){
    var bgm_obj = {"name": name, "path": path, "info": bgm_info};
    m_data.set_bangumi(name, bgm_obj);
    return bgm_obj;
}
/**
* 删除番剧
* 参数
* name: 番剧名（所在文件夹名称，相当于id）
* 无返回值
*/
module.exports.uninstall_bgm = function(name){
    var bgm = m_data.get_bangumi(name);
    var img_path = this.get_data_folder_path() + "/imgs/" + bgm.info.id + '.jpg';
    fs.unlink(img_path, (err) => {});
    m_data.remove_bangumi(bgm.name);
}

// Helper

module.exports.inarray = function (value, array){
    if(!(array instanceof Array)) return false;
    for(let i=0;i<array.length;++i)
        if(array[i] == value) return true;
    return false;
}

module.exports.get_folder_name = function(path){
    return path.split('/').slice(-1)[0];
}

/**
* 不区分大小写
*/
module.exports.intext = function (value, text){
    return ((text.toLowerCase().indexOf(value.toLowerCase())==-1)?false:true);
}

//
const video_formats_list = ['.mkv','.mp4','.mov','.m4v','.flv','.avi','.rm','.rmvb','.dat','.vob','.wmv','.asf','.asx'];