const m_data = require('./m_data');
const m_api = require('./m_api');
const m_exts = require('./m_exts');

const command = process.argv.slice(2);

switch(command[0]){
    case 'clear':
        m_data.clear_database();
        break;
    case 'search':
        m_api.search_bangumi(command[1], (success, res) => {console.log(res)});
        break;
    case 'download':
        m_api.download_file(command[1], command[2], () => {console.log('done.')});
        break;
    case 'a':
        console.log(m_data.get_recent_bgms());
        break;
    case 'b':
        console.log(m_exts.get_folder_name("/Volumes/SantiDisk/Video/番/双斩少女"));
        break;
    default:
        console.log('no command');
}