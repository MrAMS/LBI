const ipcRenderer = require('electron').ipcRenderer;
var cnt_all=0,cnt_done=0;
var data_bgms = [];
var sender;
// UI

$('#cancel').click(function(){
    ipcRenderer.send('scapper-cancel', sender);
});
$('#go').click(function(){
    ipcRenderer.send('scapper-finished');
});

$.views.helpers({
    get_img_folder_path: function () {
        return __dirname + '/data/imgs/';
    }
})

// DATA

ipcRenderer.on('scapper-load', (event, bgms, sender_) => {
    sender = sender_;
    cnt_all = bgms.length;
    $('#cnt_all').text(String(cnt_all));
    $('#cnt_done').text(String(cnt_done));
    $('#name').text(bgms[0].name);
    $('#progress').css('width', String(cnt_done/cnt_all*100)+'%');
    bgms.forEach(item => {
        data_bgms.push({"name": item.name, "ori_bgm_info": item});
    });
    render_data();
});
ipcRenderer.on('scapper-updata', (event, success, res) => {
    cnt_done++;
    $('#cnt_done').text(String(cnt_done));
    $('#progress').css('width', String(cnt_done/cnt_all*100)+'%');
    if(success){
        var ind = find_index(res.name);
        data_bgms[ind].bgm = res;
    }
    else{
        var ind = find_index(res[0]);
        data_bgms[ind].info = res[1];
    }
    render_data(ind);
});
function reinstall_bgm(ind, subject_id){
    ipcRenderer.send('scapper-reinstall-bgm', data_bgms[ind].ori_bgm_info, subject_id);
    data_bgms[ind] = {"name": data_bgms[ind].name, "ori_bgm_info": data_bgms[ind].ori_bgm_info};
    render_data(ind);
}
function ui_reinstall_bgm(ind){
    mdui.snackbar({
        message: '正在重新获取，请稍等',
        timeout: 2000,
    });
    reinstall_bgm(ind, $('#input-' + String(ind)).val());
}

function find_index(name){
    for(let i=0;i<data_bgms.length;++i)
        if(data_bgms[i].name == name)
            return i;
    return -1;
}
function render_data(item_ind){
    var tmpl = $.templates("#tmpl");
    if(item_ind == undefined){
        $('#panel').html("");
        for(let i=0;i<data_bgms.length;++i){
            let helper = data_bgms[i];
            helper.ind = i;
            $('#panel').append("<div class='mdui-panel-item' id='bgm-item-" + String(i) + "'>" + tmpl.render(helper) + "</div>");
        }
    }else{
        var helper = data_bgms[item_ind];
        helper.ind = item_ind;
        $('#bgm-item-' + String(item_ind)).html(tmpl.render(helper));
    }
    mdui.mutation();
}