const ipcRenderer = require('electron').ipcRenderer;
const shell = require('electron').shell;
const m_data = require('./m_data');
const m_exts = require('./m_exts');

var tmpl_recent = $.templates("#tmpl_recent_bgm");
var tmpl_bgm_card_sm = $.templates("#tmpl_bgm_card_sm");
var tmpl_bgm_info = $.templates("#tmpl_bgm_info");
var tmpl_search_item_tags = $.templates("#tmpl_search_item_tags");
var tmpl_search_item_tags_all = $.templates("#tmpl_search_item_tags_all");
var tmpl_status = $.templates("#tmpl_status");
var tmpl_folders = $.templates("#tmpl_folders");


var bgms_all;
// XXX
var page_info= {
    scrollTop: 0,
    last_page: 0
};
// UI

$.views.helpers({
    get_img_folder_path: function () {
        return __dirname + '/data/imgs/';
    }
})

var tab = new mdui.Tab('#tab');
function show_bgm_info(name, page_id){
    page_info.last_page = page_id;
    page_info.scrollTop = $('html').scrollTop();
    var bgm = m_data.get_bangumi(name);
    render_tmpl_bgm_info(bgm);
    $('html').scrollTop(0);
    $('#c-bgm-search').hide();
    $('#c-bgm-info').show();
    tab.show(1);
    mdui.mutation();
}
function switch_to_bgm_info(){
    $('#c-bgm-search').show();
    $('#c-bgm-info').hide();
    $('html').scrollTop(0);
    tab.show(1);
}
function switch_to_status(){
    var bgms_recent = m_data.get_recent_bgms();
    render_tmpl_status(bgms_recent);
    $('html').scrollTop(0);
    tab.show(2);
}
function info_back(){
    $('#c-bgm-search').show();
    $('#c-bgm-info').hide();
    tab.show(page_info.last_page);
    $('html').scrollTop(page_info.scrollTop);
}
function exec_open_file(path, ep_id, bgm_name){
    shell.openPath(path).then((err) => {
        if(err != "")
        mdui.snackbar({
            message: err,
            timeout: 2000,
        });
    });
    if(ep_id == undefined || (!$('#input-sync').is(":checked"))) return;
    m_data.update_bgm_status(bgm_name, ep_id);
    render_tmpl_bgm_info(m_data.get_bangumi(bgm_name));
}
function exec_show_file(path){
    shell.showItemInFolder(path);
}
function reinstall_bgm(name, path){
    var subject_id = $('#reinstall-input-id').val()
    if(subject_id == ""){
        mdui.snackbar({
            message: '请输入subject_id',
            timeout: 2000,
        });
        return;
    }
    mdui.snackbar({
        message: '正在重新获取，请稍等',
        timeout: 2000,
    });
    m_exts.get_bgm_info(name, (success, res) => {
        if(success){
            render_tmpl_bgm_info(m_exts.install_bgm(name, path, res));
            render_data();
        }else{
            mdui.snackbar({
                message: '失败 ' + res,
                timeout: 2000,
            });
        }
    }, subject_id);
}
function input_tag(name){
    $('#input-search-tag').val(name);
    var res = m_data.get_bgms_by_tag(name);
    console.log(res);
    $('#c-search-bgms-res').html(tmpl_bgm_card_sm.render({"bgms":res, "page_id":1}));   
}
function ui_updata_bgm_status(btn){
    var bgm_name = $(btn).parent().attr('data-status-belong'), ep_id = Number($(btn).attr('data-status-ep'));
    m_data.update_bgm_status(bgm_name, ep_id);
    $('[data-status-belong="' + bgm_name + '"]>.mdui-btn').removeClass('mdui-btn-active');
    $('[data-status-belong="' + bgm_name + '"]>[data-status-ep="' + ep_id + '"]').addClass('mdui-btn-active');
    render_recent(m_data.get_recent_bgms());
}
var romove_folder_path;
function ui_reinstall_folder(path){
    $('#c-remove-folder-name').text(m_exts.get_folder_name(path));
    $('#c-remove-folder-path').text(path);
    var dialog = new mdui.Dialog('#dialog-remove-folder');
    romove_folder_path = path
    dialog.open();
}
function remove_dialog_confirmed(){
    mdui.snackbar({
        message: '正在删除',
        timeout: 2000,
    });
    reinstall_folder(romove_folder_path);
    mdui.snackbar({
        message: '完成删除',
        timeout: 2000,
    });
    m_data.remove_folder(romove_folder_path);
    render_data()
}
function reinstall_folder(path){
    var bgms = m_exts.scan_folder_sync(path);
    for(let i=0;i<bgms.length;++i)
        m_exts.uninstall_bgm(bgms[i].name);
}
function ui_sync_folder(path){
    mdui.snackbar({
        message: '正在扫描新文件',
        timeout: 2000,
    });
    var file_list = m_exts.scan_folder_sync(path);
    var todo_list = [];
    for(let i=0;i<file_list.length;++i)
        if(!m_data.have_bangumi(file_list[i].name))
            todo_list.push(file_list[i]);
    if(todo_list.length!=0)
        ipcRenderer.send('start-scapper', todo_list, 'app');
    else
        mdui.snackbar({
            message: '资料库已是最新',
            timeout: 2000,
        });
}
function ui_updata_all_folders(){
    mdui.snackbar({
        message: '正在扫描新文件',
        timeout: 2000,
    });
    var folders = m_data.get('folders');
    var todo_list = [];
    for(let i=0;i<folders.length;++i){
        var path = folders[i];
        var file_list = m_exts.scan_folder_sync(path);
        for(let i=0;i<file_list.length;++i)
        if(!m_data.have_bangumi(file_list[i].name))
            todo_list.push(file_list[i]);
    }
    if(todo_list.length!=0)
        ipcRenderer.send('start-scapper', todo_list, 'app');
    else
        mdui.snackbar({
            message: '资料库已是最新',
            timeout: 2000,
        });
}
function ui_login_bgm(){
    ipcRenderer.send('login-bgm');
}
function ui_add_folder(){
    ipcRenderer.send('open-file-dialog');
}
function update_settings(){
    m_data.set('settings.api', $('#select-api').val());
    mdui.snackbar({
        message: '已更新',
        timeout: 2000,
    });
}

// DATA

ipcRenderer.on('app-log', (event, info) => {
    mdui.snackbar({
        message: info,
        timeout: 4000,
    });
});

ipcRenderer.on('scan-folder', (event, path, result) => {
    m_data.add_folder(path);
    ipcRenderer.send('start-scapper', result, 'app');
});

ipcRenderer.on('user-info-updata', (event, user_info) => {
    $('#bgm-login-name').text(user_info.nickname);
});

function run(){
    render_data();
    $('#c-bgm-search').show();
    $('#c-bgm-info').hide();
    $('#input-search-text').bind('input propertychange',function(){
        var name = $('#input-search-text').val();
        if(name!=""){
            var res = m_data.search_bgm(name);
            $('#c-search-bgms-res').html(tmpl_bgm_card_sm.render({"bgms":res, "page_id":1}));
        }else{
            $('#c-search-bgms-res').html(tmpl_bgm_card_sm.render({"bgms":m_data.get('bgms'), "page_id":1}));
        }
    });
    $('#input-search-tag').bind('input propertychange',function(){
        var name = $('#input-search-tag').val();
        if(name!=""){
            $('#c-search-tags-res').html(tmpl_search_item_tags.render(m_data.search_tag(name)));
        }else{
            $('#c-search-tags-res').html(tmpl_search_item_tags_all.render());
            $('#c-search-bgms-res').html(tmpl_bgm_card_sm.render({"bgms":m_data.get('bgms'), "page_id":1}));
        }
    });
}

function render_data(){
    var bgms = m_data.get('bgms');
    var bgms_recent = m_data.get_recent_bgms();
    $('#c-all-bgms').html(tmpl_bgm_card_sm.render({"bgms":bgms, "page_id":0}));
    $('#c-search-tags-res').html(tmpl_search_item_tags_all.render());
    $('#c-search-bgms-res').html(tmpl_bgm_card_sm.render({"bgms":bgms, "page_id":1}));
    render_recent(bgms_recent);
    render_tmpl_status(bgms_recent);
    render_folders();
    mdui.mutation();
}
function render_tmpl_bgm_info(bgm){
    var files = m_exts.scan_bgm_folder(bgm.path);
    console.log(files);
    $('#c-bgm-info-body').html(tmpl_bgm_info.render({
        "bgm": bgm,
        "files": files,
        "status": m_data.get_bgm_status(bgm.name)
    }));
    mdui.mutation();
}
function render_tmpl_status(bgms){
    $('#c-status-body').html(tmpl_status.render({"bgms": bgms}));
    bgms.forEach(bgm => {
        $('[data-status-belong="' + bgm.name + '"]>.mdui-btn').removeClass('mdui-btn-active');
        $('[data-status-belong="' + bgm.name + '"]>[data-status-ep="' + bgm.status.ep_id + '"]').addClass('mdui-btn-active'); 
    });
}
function render_recent(bgms){
    bgms = bgms.slice(0, Math.min(4, bgms.length));
    $('#c-recent').html(tmpl_recent.render({"bgms": bgms}));
}
function render_folders(folders){
    $('#c-folders-body').html(tmpl_folders.render(m_data.get('folders')));
}
function find_index(name){
    for(let i=0;i<bgms_all.length;++i)
        if(bgms_all[i].name == name)
            return i;
    return -1;
}